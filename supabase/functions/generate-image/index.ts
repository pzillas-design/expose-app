// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

/**
 * Converts a string into a URL-friendly slug.
 */
const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w-]+/g, '')   // Remove all non-word chars
        .replace(/--+/g, '-')      // Replace multiple - with single -
        .replace(/^-+/, '')        // Trim - from start of text
        .replace(/-+$/, '');       // Trim - from end of text
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    let newId = null
    let supabaseAdmin = null

    try {
        supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user } } = await supabaseUser.auth.getUser()
        if (!user) throw new Error('User not found')

        const payload = await req.json()
        newId = payload.newId
        const { sourceImage, prompt, qualityMode, maskDataUrl, modelName, board_id, attachments: payloadAttachments, aspectRatio: explicitRatio } = payload
        const boardId = board_id; // Alias for consistency in the rest of the file

        console.log(`Starting generation for user ${user.id}, quality: ${qualityMode}, job: ${newId}, board: ${boardId}, requestedRatio: ${explicitRatio}`);

        // ... (costs and credit deduction remains the same) ...
        const COSTS: Record<string, number> = {
            'fast': 0.00,
            'pro-1k': 0.10,
            'pro-2k': 0.25,
            'pro-4k': 0.50
        };
        const cost = COSTS[qualityMode] || 0;

        // ... (profile checks omitted for brevity in diff, lines 66-102 remain unchanged)

        // 1. Check Credits & Profile (Keep existing logic)
        let { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('credits, role')
            .eq('id', user.id)
            .maybeSingle()
        // ... (Rest of credit check) ...

        if (!profile) {
            // ... omitted fallback creation logic ...
            const { data: newProfile } = await supabaseAdmin.from('profiles').insert({ id: user.id, email: user.email, full_name: 'User', credits: 10 }).select().single();
            profile = newProfile;
        }

        const isPro = profile.role === 'pro'
        if (!isPro && (profile.credits || 0) < cost) {
            throw new Error('Insufficient credits')
        }

        if (!isPro && cost > 0) {
            await supabaseAdmin.from('profiles').update({ credits: profile.credits - cost }).eq('id', user.id)
        }

        // ... (Image preparation logic, lines 103-120) ...
        let finalSourceBase64 = sourceImage.src;
        if (sourceImage.src && sourceImage.src.startsWith('http')) {
            // ... fetch logic ...
            const response = await fetch(sourceImage.src);
            const blob = await response.arrayBuffer();
            const uint8 = new Uint8Array(blob);
            let binary = '';
            for (let i = 0; i < uint8.length; i += 32768) binary += String.fromCharCode.apply(null, uint8.subarray(i, i + 32768) as any);
            finalSourceBase64 = btoa(binary);
        } else if (sourceImage.src) {
            finalSourceBase64 = sourceImage.src.split(',')[1] || sourceImage.src;
        }

        // Determines the Gemini Model to use
        let finalModelName = 'gemini-3-pro-image-preview'; // Default to Pro (Imagen 3)

        if (qualityMode === 'fast' || modelName === 'fast') {
            // Flash model for fast/free generations
            // Note: Update this to 'gemini-2.5-flash' or the correct image-capable flash model identifier
            finalModelName = 'gemini-2.5-flash-image';
        } else if (modelName && modelName.startsWith('gemini-')) {
            // Allow explicit model override
            finalModelName = modelName;
        }

        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!)

        const systemInstruction = "You are an expert AI image generator. You interpret prompts to generate high-quality, photorealistic images. You preserve artist intent for style and composition.";

        const model = genAI.getGenerativeModel({
            model: finalModelName,
            systemInstruction: systemInstruction
        });

        // Aspect Ratio Handling for Imagen 3
        // Supported: "1:1", "3:4", "4:3", "9:16", "16:9"
        const VALID_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"];

        // Helper to find closest supported aspect ratio
        const findClosestValidRatio = (targetRatioStr: string): string => {
            if (VALID_RATIOS.includes(targetRatioStr)) return targetRatioStr;

            const parseRatio = (s: string) => {
                const [w, h] = s.split(':').map(Number);
                return w / h;
            };

            const targetVal = parseRatio(targetRatioStr);
            if (isNaN(targetVal)) return '1:1';

            let bestMatch = '1:1';
            let minDiff = Number.MAX_VALUE;

            for (const r of VALID_RATIOS) {
                const val = parseRatio(r);
                const diff = Math.abs(val - targetVal);
                if (diff < minDiff) {
                    minDiff = diff;
                    bestMatch = r;
                }
            }
            return bestMatch;
        };

        const getClosestAspectRatioFromDims = (width: number, height: number): string => {
            const val = width / height;
            // Find closest valid ratio
            // ... construct string map
            const ratioMap = VALID_RATIOS.map(r => {
                const [w, h] = r.split(':').map(Number);
                return { str: r, val: w / h };
            });

            return ratioMap.reduce((prev, curr) =>
                Math.abs(curr.val - val) < Math.abs(prev.val - val) ? curr : prev
            ).str;
        };

        let bestRatio = '1:1';

        if (explicitRatio) {
            // Validate user preference - this should ALWAYS take priority
            bestRatio = findClosestValidRatio(explicitRatio);
            console.log(`[ASPECT RATIO] Explicit ratio '${explicitRatio}' mapped to valid '${bestRatio}'`);
        } else if (sourceImage && (sourceImage.realWidth || sourceImage.width)) {
            // Fallback to source image dimensions ONLY if no explicit ratio
            const sourceW = sourceImage.realWidth || sourceImage.width || 1024;
            const sourceH = sourceImage.realHeight || sourceImage.height || 1024;
            bestRatio = getClosestAspectRatioFromDims(sourceW, sourceH);
            console.log(`[ASPECT RATIO] Calculated from source dimensions ${sourceW}x${sourceH}: ${bestRatio}`);
        } else {
            console.log(`[ASPECT RATIO] No explicit ratio or source dimensions, defaulting to 1:1`);
        }

        // Prepare config (nested imageConfig if needed)
        const generationConfig: any = {
            imageConfig: {
                mimeType: 'image/jpeg',
                imageSize: qualityMode === 'pro-1k' ? '1K' : (qualityMode === 'pro-2k' ? '2K' : (qualityMode === 'pro-4k' ? '4K' : '1K')),
                aspectRatio: bestRatio
            }
        }

        console.log(`[DEBUG] Gemini Call for ${finalModelName} with quality ${qualityMode}`);

        // Store the complete API request for debugging
        const apiRequestPayload = {
            model: finalModelName,
            systemInstruction: systemInstruction || null,
            userPrompt: prompt,
            hasSourceImage: !!finalSourceBase64,
            hasMask: hasMask,
            hasReferenceImages: hasRefs,
            referenceImagesCount: allRefs.length,
            generationConfig: Object.keys(generationConfig).length > 0 ? generationConfig : null,
            timestamp: new Date().toISOString()
        };

        const geminiResult = await model.generateContent({
            contents: [{ parts: parts }],
            generationConfig: Object.keys(generationConfig).length > 0 ? generationConfig : undefined
        })
        const geminiResponse = geminiResult.response

        const candidate = geminiResponse.candidates?.[0]
        const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData)

        const resultData = {
            usageMetadata: geminiResponse.usageMetadata,
            modelVersion: finalModelName
        }

        if (!imagePart) {
            const finishReason = candidate?.finishReason;
            const safetyRatings = candidate?.safetyRatings;
            console.error("No image in response. FinishReason:", finishReason, "Safety:", safetyRatings);

            // Refund
            if (!isPro && cost > 0) {
                await supabaseAdmin.from('profiles').update({ credits: profile.credits }).eq('id', user.id)
            }
            throw new Error(`Gemini: No image returned. Reason: ${finishReason || 'Unknown'}`)
        }

        const generatedBase64 = imagePart.inlineData.data

        // 4. Save to Storage (Improved Path Organization)
        let subfolder = boardId || 'unorganized';
        if (boardId) {
            try {
                const { data: board } = await supabaseAdmin.from('boards').select('name').eq('id', boardId).maybeSingle();
                if (board) {
                    subfolder = `${slugify(board.name)}_${boardId}`;
                }
            } catch (e) {
                console.warn("Failed to fetch board name for path:", e);
            }
        }

        // 5. Determine Final Title & Naming
        // Logic:
        // - If it's a variation (sourceImage.version > 0), inherit the base name and increment version.
        // - If it's a new generation, use a snippet of the prompt as title.

        let dbBaseName = sourceImage.baseName || sourceImage.title || "Image";
        let dbTitle = dbBaseName;
        const currentVersion = (sourceImage.version || 0) + 1;

        if (sourceImage.version && sourceImage.version > 0) {
            // Variation: Keep base name, append version
            dbTitle = `${dbBaseName}_v${currentVersion}`;
        } else {
            // New Generation: Create title from prompt if simple, or use "Generation"
            if (dbBaseName === 'Generation' || dbBaseName === 'New Generation' || !dbBaseName) {
                const promptSnippet = prompt.substring(0, 25).trim().replace(/\s+/g, '_');
                dbBaseName = promptSnippet || 'Image';
                dbTitle = dbBaseName;
            } else {
                // Respect frontend targetTitle if it's already specific
                dbTitle = payload.targetTitle || dbBaseName;
                dbBaseName = dbTitle;
            }
        }

        const titleSlug = slugify(dbBaseName);
        const filename = `${titleSlug}_v${currentVersion}_${newId.substring(0, 8)}.jpg`;
        const filePath = `${user.id}/${subfolder}/${filename}`;

        const binaryData = Uint8Array.from(atob(generatedBase64), c => c.charCodeAt(0))

        const { error: uploadError } = await supabaseAdmin.storage
            .from('user-content')
            .upload(filePath, binaryData, { contentType: 'image/jpeg', upsert: true })

        if (uploadError) throw uploadError

        // NEW: Get a signed URL
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from('user-content')
            .createSignedUrl(filePath, 3600)

        if (signedUrlError) {
            console.warn("Failed to create signed URL:", signedUrlError);
        }

        const finalUrl = signedUrlData?.signedUrl || `data:image/jpeg;base64,${generatedBase64}`;

        // 5. Insert into DB (Canvas Images)
        // We do NOT check for job existence anymore to avoid race conditions.
        // If the frontend cleaned up the job row, we still want to save the result so it appears on reload.

        // (Namin logic moved above for filePath consistency)

        const newImage: any = {
            id: newId,
            user_id: user.id,
            board_id: boardId,
            job_id: newId,  // Link to generation job for admin tracking
            storage_path: filePath,
            width: Math.round(sourceImage.width || 512), // Display width (normalized)
            height: Math.round(sourceImage.height || 512), // Display height (normalized)
            real_width: Math.round(sourceImage.realWidth || 1024), // Actual requested resolution
            real_height: Math.round(sourceImage.realHeight || 1024), // Actual requested resolution
            model_version: resultData.modelVersion || modelName,
            title: dbTitle,
            base_name: dbBaseName,
            version: (sourceImage.version || 0) + 1,
            prompt: prompt,
            parent_id: sourceImage.id || null,
            annotations: '[]', // Generated images start with empty annotations
            generation_params: { quality: qualityMode }
        }

        // 6. Insert Record
        const { error: dbError } = await supabaseAdmin.from('canvas_images').insert(newImage)
        if (dbError) throw dbError

        // 7. Update Job Status & Usage Tracking
        const usage = resultData.usageMetadata || {};
        const tokensPrompt = usage.promptTokenCount || 0;
        const tokensCompletion = usage.candidatesTokenCount || 0;
        const tokensTotal = usage.totalTokenCount || 0;

        // Fetch dynamic pricing from database (synced via sync-pricing function)
        let pricing = null
        try {
            const { data: pricingData } = await supabaseAdmin
                .from('api_pricing')
                .select('input_price_per_token, output_price_per_token')
                .eq('model_name', finalModelName)
                .single()

            if (pricingData) {
                pricing = {
                    input: parseFloat(pricingData.input_price_per_token),
                    output: parseFloat(pricingData.output_price_per_token)
                }
                console.log(`Using DB pricing for ${finalModelName}:`, pricing)
            }
        } catch (err) {
            console.warn('Failed to fetch pricing from DB, using fallback:', err.message)
        }

        // Fallback to hardcoded pricing if DB fetch failed
        if (!pricing) {
            pricing = finalModelName === 'gemini-2.5-flash-image'
                ? { input: 0.0000001, output: 0.0000004 }   // Flash: $0.10/1M input, $0.40/1M output
                : { input: 0.00000125, output: 0.000005 };  // Pro: $1.25/1M input, $5.00/1M output
            console.log(`Using fallback pricing for ${finalModelName}:`, pricing)
        }

        const estimatedApiCost = (tokensPrompt * pricing.input) + (tokensCompletion * pricing.output);

        await supabaseAdmin.from('generation_jobs').update({
            status: 'completed',
            model: finalModelName,
            api_cost: estimatedApiCost,
            tokens_prompt: tokensPrompt,
            tokens_completion: tokensCompletion,
            tokens_total: tokensTotal,
            request_payload: apiRequestPayload  // Store complete API request for debugging
        }).eq('id', newId)

        console.log(`Generation successful for job ${newId}. Usage: ${tokensTotal} tokens, Cost: $${estimatedApiCost.toFixed(6)}`);

        return new Response(JSON.stringify({
            success: true,
            // Return 'src' as URL to keep payload small
            image: {
                ...newImage,
                src: finalUrl,
                isGenerating: false
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Edge Function Error:", error.message)

        // Mark job as failed to prevent ghost skeletons
        if (newId && supabaseAdmin) {
            await supabaseAdmin.from('generation_jobs').update({ status: 'failed', error: error.message }).eq('id', newId)
        }

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
