// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

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

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('credits, role')
            .eq('id', user.id)
            .single()

        if (!profile) throw new Error('Profile not found')

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
        let finalModelName = 'gemini-3-pro-image-preview'; // Nano Banana Pro
        switch (qualityMode) {
            case 'fast':
                // Nano Banana: Optimiert auf Speed & Effizienz
                finalModelName = 'gemini-2.5-flash-image';
                break;
            case 'pro-1k':
            case 'pro-2k':
            case 'pro-4k':
            default:
                // Nano Banana Pro: Für professionelle Assets & High-Fidelity
                finalModelName = 'gemini-3-pro-image-preview';
                break;
        }

        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${finalModelName}:generateContent?key=${GEMINI_API_KEY}`

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

        let imageConfig: any = {}
        if (qualityMode === 'pro-1k') imageConfig = { imageSize: '1K' }
        else if (qualityMode === 'pro-2k') imageConfig = { imageSize: '2K' }
        else if (qualityMode === 'pro-4k') imageConfig = { imageSize: '4K' }

        // ASPECT RATIO LOGIC
        // Imagen 3 supports specific aspect ratios. We need to map our arbitrary W/H to the closest one.
        if (sourceImage.realWidth && sourceImage.realHeight) {
            const ratio = sourceImage.realWidth / sourceImage.realHeight;
            let closestRatio = '1:1';
            let minDiff = Infinity;

            const supportedRatios = {
                '1:1': 1.0,
                '3:4': 3 / 4,
                '4:3': 4 / 3,
                '9:16': 9 / 16,
                '16:9': 16 / 9
            };

            for (const [key, val] of Object.entries(supportedRatios)) {
                const diff = Math.abs(ratio - val);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestRatio = key;
                }
            }
            // Only add aspect ratio for text-to-image (new generation) or when explicitly creating new variations
            // For editing/masking, the aspect ratio is usually determined by the input image
            if (!finalSourceBase64 || qualityMode === 'fast') {
                imageConfig.aspectRatio = closestRatio;
            }
        }

        // 3. Call Gemini
        const geminiPayload = {
            contents: [{ parts: parts }],
            generationConfig: Object.keys(imageConfig).length > 0 ? imageConfig : undefined
        };

        // PARALLEL: Generate a title for the image
        const titlePromise = (async () => {
            try {
                const titleEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
                const titleResp = await fetch(titleEndpoint, {
                    method: 'POST',
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `Generate a very short, concise title (2-5 words) for an image based on this prompt: "${prompt}". Return ONLY the title text, no quotes.` }] }],
                        generationConfig: { maxOutputTokens: 20 }
                    })
                });
                if (titleResp.ok) {
                    const titleData = await titleResp.json();
                    return titleData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
                }
            } catch (e) {
                console.warn("Title generation failed:", e);
            }
            return null;
        })();

        const geminiResponsePromise = fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(geminiPayload)
        });

        const [geminiResponse, generatedTitle] = await Promise.all([geminiResponsePromise, titlePromise]);

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text()
            console.error("Gemini API Error:", errText)
            // Refund
            if (!isPro && cost > 0) {
                await supabaseAdmin.from('profiles').update({ credits: profile.credits }).eq('id', user.id)
            }
            throw new Error(`Gemini API failed: ${errText}`)
        }

        const resultData = await geminiResponse.json()
        const imagePart = resultData.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)
        if (!imagePart) {
            // Refund
            if (!isPro && cost > 0) {
                await supabaseAdmin.from('profiles').update({ credits: profile.credits }).eq('id', user.id)
            }
            throw new Error('No image returned from Gemini')
        }

        const generatedBase64 = imagePart.inlineData.data

        // 4. Save to Storage
        const filePath = `${user.id}/${newId}.jpg`
        const binaryData = Uint8Array.from(atob(generatedBase64), c => c.charCodeAt(0))

        const { error: uploadError } = await supabaseAdmin.storage
            .from('user-content')
            .upload(filePath, binaryData, { contentType: 'image/jpeg', upsert: true })

        if (uploadError) throw uploadError

        // NEW: Get a signed URL for the newly uploaded image instead of returning huge base64
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from('user-content')
            .createSignedUrl(filePath, 3600) // 1 hour expiry

        if (signedUrlError) {
            console.warn("Failed to create signed URL, falling back to base64 (risky for 4k):", signedUrlError);
        }

        const finalUrl = signedUrlData?.signedUrl || `data:image/jpeg;base64,${generatedBase64}`;

        // 5. Final Check: Did the user delete the job while we were generating?
        const { data: jobStillExists } = await supabaseAdmin
            .from('generation_jobs')
            .select('id')
            .eq('id', newId)
            .single()

        if (!jobStillExists) {
            console.log(`Job ${newId} was deleted during generation. Aborting DB insert.`);
            return new Response(JSON.stringify({
                success: false,
                error: 'Job was cancelled/deleted'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200, // Status 200 but success: false
            })
        }

        // Determine Final Title
        // If it's a "New Generation" (no source ID or just placeholders), use the AI title.
        // If it's a variation, keep the parent name + version, unless the user specifically asked for a rename (not implemented yet).
        // Actually, user request: "können wir dabei noch ein titel geneieren lassen? für dateinamen?" implies they want it for new stuff.
        let finalTitle = "";
        if (payload.targetTitle && !payload.targetTitle.includes('Generation')) {
            // If the frontend sent a specific target title (e.g. variation), respect it logic partially
            // But if we have a generatedTitle and the base was generic, maybe swap?
            // Let's stick to: New Gen = AI Title. Variation = Parent Title + vX.
            finalTitle = payload.targetTitle;
        } else {
            // It's likely a new generation or the frontend sent a generic title
            finalTitle = generatedTitle || (sourceImage.title || "Image");
            // Cleanup if it has quotes
            finalTitle = finalTitle.replace(/^"|"$/g, '');
        }

        // If it IS a version (payload.targetVersion > 1), we should probably append _vX to the AI title if we use it
        // Or just stick to the requested behavior of "generating a title".
        // Let's apply the AI title if available, otherwise fallback.

        let dbTitle = generatedTitle ? generatedTitle.replace(/^"|"$/g, '') : (sourceImage.title || "Image");
        let dbBaseName = dbTitle;

        // If this is a variation (proven by newId != sourceImage.id usually, or just logic), we might want to respect the series.
        // But for "New Generation", we definitely want the AI title.
        if (sourceImage.version && sourceImage.version > 0) {
            // It's a variation.
            // If we generated a title, do we overwrite the series name? 
            // Ideally: Series Name remains, but maybe update if it was generic?
            // Let's keep it safe: If it's a variation, stick to the series.
            // The user asked "can we generate a title", probably for the first one.
            if (sourceImage.title === 'Generation' || sourceImage.title === 'New Generation') {
                // The parent was generic, so we can adopt the new title for this child!
                dbTitle = dbTitle + `_v${(sourceImage.version || 0) + 1}`;
                dbBaseName = generatedTitle || dbBaseName; // Start a new series name?
            } else {
                // Parent had a name, keep it.
                dbTitle = (sourceImage.title || "Image") + "_v" + ((sourceImage.version || 0) + 1);
                dbBaseName = sourceImage.baseName || sourceImage.title || "Image";
            }
        } else {
            // It's a root generation (v1)
            dbTitle = generatedTitle ? generatedTitle.replace(/^"|"$/g, '') : (sourceImage.title || "Image");
            dbBaseName = dbTitle;
        }

        const newImage: any = {
            id: newId,
            user_id: user.id,
            board_id: boardId,
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
            annotations: sourceImage.annotations ? JSON.stringify(sourceImage.annotations) : null,
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
        const estimatedApiCost = (tokensPrompt * 0.0000001) + (tokensCompletion * 0.0000004);

        await supabaseAdmin.from('generation_jobs').update({
            status: 'completed',
            model: finalModelName,
            api_cost: estimatedApiCost,
            tokens_prompt: tokensPrompt,
            tokens_completion: tokensCompletion,
            tokens_total: tokensTotal
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
