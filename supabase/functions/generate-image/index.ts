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
        const { sourceImage, prompt, qualityMode, maskDataUrl, modelName, board_id, attachments: payloadAttachments } = payload
        const boardId = board_id; // Alias for consistency in the rest of the file

        console.log(`Starting generation for user ${user.id}, quality: ${qualityMode}, job: ${newId}, board: ${boardId}`);

        // ... (costs and credit deduction remains the same) ...
        const COSTS: Record<string, number> = {
            'fast': 0.00,
            'pro-1k': 0.10,
            'pro-2k': 0.25,
            'pro-4k': 0.50
        };
        const cost = COSTS[qualityMode] || 0;

        // 1. Check Credits & Profile
        let { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('credits, role')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile) {
            console.log(`Profile not found for user ${user.id}, creating entry...`);
            const { data: newProfile, error: createError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || 'New User',
                    credits: 10.0
                })
                .select('credits, role')
                .single()

            if (createError) {
                console.error('Error creating profile fallback:', createError);
                throw new Error('Profile not found and creation failed')
            }
            profile = newProfile
        }

        const isPro = profile.role === 'pro'
        if (!isPro && (profile.credits || 0) < cost) {
            throw new Error('Insufficient credits')
        }

        if (!isPro && cost > 0) {
            await supabaseAdmin.from('profiles').update({ credits: profile.credits - cost }).eq('id', user.id)
            console.log(`Deducted ${cost} credits. New balance: ${profile.credits - cost}`);
        }

        // 2. Prepare Gemini Call - Fetch image if URL
        let finalSourceBase64 = sourceImage.src;
        if (sourceImage.src && sourceImage.src.startsWith('http')) {
            console.log("Fetching source image from URL...");
            const response = await fetch(sourceImage.src);
            const blob = await response.arrayBuffer();
            const uint8 = new Uint8Array(blob);

            // Efficient chunked encoding to base64
            let binary = '';
            const chunkSize = 0x8000; // 32KB chunks
            for (let i = 0; i < uint8.length; i += chunkSize) {
                binary += String.fromCharCode.apply(null, uint8.subarray(i, i + chunkSize) as any);
            }
            finalSourceBase64 = btoa(binary);
        } else if (sourceImage.src) {
            finalSourceBase64 = sourceImage.src.split(',')[1] || sourceImage.src;
        }

        // --- MODEL MAPPING ---
        let finalModelName = 'gemini-2.5-flash-image'; // Default to stable GA model
        switch (qualityMode) {
            case 'fast':
                // Nano Banana: Optimiert auf Speed & Effizienz
                finalModelName = 'gemini-2.5-flash-image';
                break;
            case 'pro-1k':
            case 'pro-2k':
            case 'pro-4k':
                // Nano Banana Pro: Für professionelle Assets & High-Fidelity
                // Using Gemini 3 Pro for high resolution as requested
                finalModelName = 'gemini-3-pro-image-preview';
                break;
            default:
                finalModelName = 'gemini-2.5-flash-image';
                break;
        }

        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is not set in Supabase')
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

        const parts: any[] = []

        const annotations = sourceImage.annotations || [];
        const hasMask = !!maskDataUrl

        // --- REFERENCE IMAGES (Croppings & Attachments) ---
        // 1. Existing reference images from annotations
        const refAnns = annotations.filter((ann: any) => ann.referenceImage);

        // 2. New attachments from payload (ensure uniqueness by checking if they are already in refAnns)
        const freshAttachments = (payloadAttachments || [])
            .filter((att: string) => !refAnns.some((ann: any) => ann.referenceImage === att))
            .map((att: string) => ({
                referenceImage: att,
                type: 'reference_image'
            }));

        const allRefs = [...refAnns, ...freshAttachments];
        const hasRefs = allRefs.length > 0;

        let systemInstruction = "I am providing an ORIGINAL image (to be edited). "
        if (hasMask) {
            systemInstruction += "I am also providing an ANNOTATION image (the original image muted/dimmed, with bright markings and text indicating desired changes). "
            const labels = annotations.map((a: any) => a.text).filter(Boolean);
            if (labels.length > 0) {
                systemInstruction += `The following labels are marked in the Annotation Image: ${labels.map(l => `"${l.toUpperCase()}"`).join(", ")}. `
            }
        }
        if (hasRefs) {
            systemInstruction += "I am also providing REFERENCE images for guidance (style, context, or visual elements). "
        }

        systemInstruction += `Apply the edits to the ORIGINAL image based on the user prompt${hasMask ? ', following the visual cues in the ANNOTATION image' : ''}${hasRefs ? ' and using the REFERENCE images as a basis for style or objects' : ''}. `

        if (hasMask) {
            systemInstruction += "CRITICAL: The generated image must NEVER include any of the text, lines, or markings shown in the ANNOTATION image. Those elements are strictly for your instructions and should be removed/replaced with realistic image content."
        }

        parts.push({ text: systemInstruction })
        parts.push({ text: `User Prompt: ${prompt}` })

        // Source Image (only if present, for Text2Img it might be empty/placeholder)
        if (finalSourceBase64) {
            parts.push({
                inlineData: { data: finalSourceBase64, mimeType: 'image/jpeg' }
            })
            parts.push({ text: "Image 1: The Original Image" })
        }

        // Mask (if any)
        if (maskDataUrl) {
            const cleanMask = maskDataUrl.split(',')[1] || maskDataUrl
            parts.push({
                inlineData: { data: cleanMask, mimeType: 'image/png' }
            })
            parts.push({ text: "Image 2: The Annotation Image (Muted original + overlays showing where and what to change)." })
        }

        // Process ALL reference images
        await Promise.all(allRefs.map(async (ann: any, index: number) => {
            let base64 = ann.referenceImage;

            // If it's a storage path, we need to download it
            if (!base64.startsWith('data:') && !base64.startsWith('http')) {
                console.log(`Edge: Resolving reference image from storage: ${base64}`);
                const { data, error } = await supabaseAdmin.storage.from('user-content').download(base64);
                if (error) {
                    console.error(`Edge: Failed to download reference image ${base64}:`, error);
                    return;
                }
                const buffer = await data.arrayBuffer();
                base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            } else {
                // It's already base64 (or a URL)
                base64 = base64.split(',')[1] || base64;
            }

            const imgNum = index + 3;
            parts.push({ inlineData: { data: base64, mimeType: 'image/png' } });

            if (ann.text) {
                parts.push({ text: `Image ${imgNum}: Reference Image specifically for the object labeled "${ann.text.toUpperCase()}" in the Annotation Image.` });
            } else {
                parts.push({ text: `Image ${imgNum}: General Reference Image for visual guidance.` });
            }
        }));

        // 3. Call Gemini via SDK (same as main branch)
        const model = genAI.getGenerativeModel({ model: finalModelName })

        // Prepare config (nested imageConfig if needed)
        const generationConfig: any = {}
        if (qualityMode !== 'fast') {
            generationConfig.imageConfig = {
                imageSize: qualityMode === 'pro-1k' ? '1K' : (qualityMode === 'pro-2k' ? '2K' : '4K')
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
