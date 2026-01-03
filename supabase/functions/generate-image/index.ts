
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

    try {
        const supabaseAdmin = createClient(
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

        const { sourceImage, prompt, qualityMode, maskDataUrl, newId, modelName, boardId } = await req.json()

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
            let binary = '';
            for (let i = 0; i < uint8.byteLength; i++) {
                binary += String.fromCharCode(uint8[i]);
            }
            finalSourceBase64 = btoa(binary);
        } else if (sourceImage.src) {
            finalSourceBase64 = sourceImage.src.split(',')[1] || sourceImage.src;
        }

        // --- MODEL MAPPING ---
        let finalModelName = 'gemini-1.5-flash';
        switch (qualityMode) {
            case 'fast':
                finalModelName = 'gemini-1.5-flash';
                break;
            case 'pro-1k':
            case 'pro-2k':
            case 'pro-4k':
            default:
                finalModelName = 'gemini-1.5-flash'; // Fallback to stable for now
                break;
        }

        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${finalModelName}:generateContent?key=${GEMINI_API_KEY}`

        const parts: any[] = []

        const hasMask = !!maskDataUrl
        let systemInstruction = "I am providing an ORIGINAL image (to be edited)."
        if (hasMask) systemInstruction += " I am also providing a MASK image (indicating areas to edit)."
        systemInstruction += " Apply the edits to the ORIGINAL image based on the user prompt."

        parts.push({ text: systemInstruction })

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
            parts.push({ text: "Image 2: The Mask. White areas = edit region." })
        }

        parts.push({ text: `User Prompt: ${prompt}` })

        let imageConfig: any = {}
        if (qualityMode === 'pro-1k') imageConfig = { imageSize: '1K' }
        else if (qualityMode === 'pro-2k') imageConfig = { imageSize: '2K' }
        else if (qualityMode === 'pro-4k') imageConfig = { imageSize: '4K' }

        // 3. Call Gemini
        const geminiPayload = {
            contents: [{ parts: parts }],
            generationConfig: Object.keys(imageConfig).length > 0 ? { imageConfig: imageConfig } : undefined
        };

        const geminiResponse = await fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(geminiPayload)
        })

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

        const newImage = {
            id: newId,
            user_id: user.id,
            board_id: boardId,
            storage_path: filePath,
            width: Math.round(sourceImage.width || 1024),
            height: Math.round(sourceImage.height || 1024),
            real_width: sourceImage.realWidth || sourceImage.width || 1024,
            real_height: sourceImage.realHeight || sourceImage.height || 1024,
            model_version: resultData.modelVersion || modelName,
            title: (sourceImage.title || "Image") + "_v" + ((sourceImage.version || 0) + 1),
            base_name: sourceImage.baseName || sourceImage.title || "Image",
            version: (sourceImage.version || 0) + 1,
            prompt: prompt,
            parent_id: sourceImage.id || null,
            generation_params: { quality: qualityMode }
        }

        // 6. Insert Record
        const { error: dbError } = await supabaseAdmin.from('canvas_images').insert(newImage)
        if (dbError) throw dbError

        // 7. Update Job Status
        await supabaseAdmin.from('generation_jobs').update({ status: 'completed' }).eq('id', newId)

        console.log(`Generation successful for job ${newId}`);

        return new Response(JSON.stringify({
            success: true,
            image: { ...newImage, src: `data:image/jpeg;base64,${generatedBase64}`, isGenerating: false }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Edge Function Error:", error.message)

        // Mark job as failed to prevent ghost skeletons
        if (newId) {
            await supabaseAdmin.from('generation_jobs').update({ status: 'failed', error: error.message }).eq('id', newId)
        }

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
