// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { slugify } from './utils/slugify.ts';
import { findClosestValidRatio } from './utils/aspectRatio.ts';
import { prepareSourceImage } from './utils/imageProcessing.ts';
import { prepareParts, generateImage } from './services/gemini.ts';
import { COSTS } from './types/index.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * Logs an error with context for easier debugging
 */
const logError = (context: string, error: any, metadata?: any) => {
    console.error(`[ERROR] ${context}:`, error.message || error);
    if (metadata) {
        console.error(`[ERROR] Metadata:`, JSON.stringify(metadata, null, 2));
    }
    if (error.stack) {
        console.error(`[ERROR] Stack:`, error.stack);
    }
};

/**
 * Logs info with context
 */
const logInfo = (context: string, message: string, data?: any) => {
    console.log(`[INFO] ${context}: ${message}`);
    if (data) {
        console.log(`[INFO] Data:`, JSON.stringify(data, null, 2));
    }
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    let newId = null;
    let supabaseAdmin = null;

    try {
        // Initialize Supabase clients
        supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // Authenticate user
        const { data: { user } } = await supabaseUser.auth.getUser();
        if (!user) {
            throw new Error('User not found');
        }

        // Parse payload
        const payload = await req.json();
        newId = payload.newId;
        const {
            sourceImage,
            prompt,
            qualityMode,
            maskDataUrl,
            modelName,
            board_id,
            attachments: payloadAttachments,
            aspectRatio: explicitRatio
        } = payload;

        logInfo('Generation Start', `User: ${user.id}, Quality: ${qualityMode}, Job: ${newId}, Board: ${board_id}`);

        // Check credits and profile
        const cost = COSTS[qualityMode] || 0;
        let { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('credits, role')
            .eq('id', user.id)
            .maybeSingle();

        if (!profile) {
            logInfo('Profile Creation', `Creating profile for user ${user.id}`);
            const { data: newProfile } = await supabaseAdmin
                .from('profiles')
                .insert({ id: user.id, email: user.email, full_name: 'User', credits: 10 })
                .select()
                .single();
            profile = newProfile;
        }

        const isPro = profile.role === 'pro';
        if (!isPro && (profile.credits || 0) < cost) {
            throw new Error('Insufficient credits');
        }

        // Deduct credits
        if (!isPro && cost > 0) {
            await supabaseAdmin
                .from('profiles')
                .update({ credits: profile.credits - cost })
                .eq('id', user.id);
        }

        // Prepare source image
        const finalSourceBase64 = await prepareSourceImage(sourceImage.src);

        // Determine model
        let finalModelName = 'gemini-3-pro-image-preview';
        if (qualityMode === 'fast' || modelName === 'fast') {
            finalModelName = 'gemini-2.5-flash-image';
        } else if (modelName && modelName.startsWith('gemini-')) {
            finalModelName = modelName;
        }

        // Determine aspect ratio
        let bestRatio = '1:1';
        let isEditMode = false;

        if (explicitRatio) {
            bestRatio = findClosestValidRatio(explicitRatio);
            logInfo('Aspect Ratio', `Explicit ratio '${explicitRatio}' mapped to '${bestRatio}'`);
        } else if (sourceImage && (sourceImage.realWidth || sourceImage.width)) {
            isEditMode = true;
            const sourceW = sourceImage.realWidth || sourceImage.width || 1024;
            const sourceH = sourceImage.realHeight || sourceImage.height || 1024;
            logInfo('Aspect Ratio', `Edit mode - preserving ${sourceW}x${sourceH}`);
        }

        // Prepare generation config
        const generationConfig: any = {
            imageConfig: {
                mimeType: 'image/jpeg',
                imageSize: qualityMode === 'pro-1k' ? '1K' : (qualityMode === 'pro-2k' ? '2K' : (qualityMode === 'pro-4k' ? '4K' : '1K')),
                ...(isEditMode ? {} : { aspectRatio: bestRatio })
            }
        };

        // Prepare parts array
        const { parts, hasMask, hasRefs, allRefs } = await prepareParts(
            finalSourceBase64,
            maskDataUrl,
            payloadAttachments,
            sourceImage.annotations,
            prompt
        );

        logInfo('Parts Prepared', `Total: ${parts.length} (source: ${!!finalSourceBase64}, mask: ${hasMask}, refs: ${allRefs.length})`);

        // Store API request for debugging
        const apiRequestPayload = {
            model: finalModelName,
            userPrompt: prompt,
            hasSourceImage: !!finalSourceBase64,
            hasMask,
            hasReferenceImages: hasRefs,
            referenceImagesCount: allRefs.length,
            generationConfig,
            timestamp: new Date().toISOString()
        };

        // Count concurrent jobs
        const { count: concurrentJobCount } = await supabaseAdmin
            .from('generation_jobs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'processing');

        const concurrentJobs = concurrentJobCount || 0;
        const generationStartTime = Date.now();

        // Call Gemini API
        logInfo('Gemini API Call', `Model: ${finalModelName}, Quality: ${qualityMode}`);
        const geminiResponse = await generateImage(
            Deno.env.get('GEMINI_API_KEY')!,
            finalModelName,
            parts,
            generationConfig
        );

        // Extract result
        const candidate = geminiResponse.candidates?.[0];
        const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);

        if (!imagePart) {
            const finishReason = candidate?.finishReason;
            const safetyRatings = candidate?.safetyRatings;
            logError('Gemini Response', `No image returned. Reason: ${finishReason}`, { safetyRatings });

            // Refund credits
            if (!isPro && cost > 0) {
                await supabaseAdmin
                    .from('profiles')
                    .update({ credits: profile.credits })
                    .eq('id', user.id);
            }
            throw new Error(`Gemini: No image returned. Reason: ${finishReason || 'Unknown'}`);
        }

        const generatedBase64 = imagePart.inlineData.data;

        // Prepare storage path
        let subfolder = board_id || 'unorganized';
        if (board_id) {
            try {
                const { data: board } = await supabaseAdmin
                    .from('boards')
                    .select('name')
                    .eq('id', board_id)
                    .maybeSingle();
                if (board) {
                    subfolder = `${slugify(board.name)}_${board_id}`;
                }
            } catch (e) {
                logError('Board Fetch', e);
            }
        }

        // Determine title and version
        let dbBaseName = sourceImage.baseName || sourceImage.title || "Image";
        let dbTitle = dbBaseName;
        const currentVersion = (sourceImage.version || 0) + 1;

        if (sourceImage.version && sourceImage.version > 0) {
            dbTitle = `${dbBaseName}_v${currentVersion}`;
        } else {
            if (dbBaseName === 'Generation' || dbBaseName === 'New Generation' || !dbBaseName) {
                const promptSnippet = prompt.substring(0, 25).trim().replace(/\s+/g, '_');
                dbBaseName = promptSnippet || 'Image';
                dbTitle = dbBaseName;
            } else {
                dbTitle = payload.targetTitle || dbBaseName;
                dbBaseName = dbTitle;
            }
        }

        const titleSlug = slugify(dbBaseName);
        const filename = `${titleSlug}_v${currentVersion}_${newId.substring(0, 8)}.jpg`;
        const filePath = `${user.id}/${subfolder}/${filename}`;

        // Upload to storage
        const binaryData = Uint8Array.from(atob(generatedBase64), c => c.charCodeAt(0));
        const { error: uploadError } = await supabaseAdmin.storage
            .from('user-content')
            .upload(filePath, binaryData, { contentType: 'image/jpeg', upsert: true });

        if (uploadError) {
            logError('Storage Upload', uploadError);
            throw uploadError;
        }

        // Get signed URL
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from('user-content')
            .createSignedUrl(filePath, 3600);

        if (signedUrlError) {
            logError('Signed URL', signedUrlError);
        }

        const finalUrl = signedUrlData?.signedUrl || `data:image/jpeg;base64,${generatedBase64}`;

        // Insert into database
        const newImage: any = {
            id: newId,
            user_id: user.id,
            board_id: board_id,
            job_id: newId,
            storage_path: filePath,
            width: Math.round(sourceImage.width || 512),
            height: Math.round(sourceImage.height || 512),
            real_width: Math.round(sourceImage.realWidth || 1024),
            real_height: Math.round(sourceImage.realHeight || 1024),
            model_version: finalModelName,
            title: dbTitle,
            base_name: dbBaseName,
            version: currentVersion,
            prompt: prompt,
            parent_id: sourceImage.id || null,
            annotations: '[]',
            generation_params: { quality: qualityMode }
        };

        const { error: dbError } = await supabaseAdmin
            .from('canvas_images')
            .insert(newImage);

        if (dbError) {
            logError('Database Insert', dbError);
            throw dbError;
        }

        // Update job status
        const usage = geminiResponse.usageMetadata || {};
        const tokensPrompt = usage.promptTokenCount || 0;
        const tokensCompletion = usage.candidatesTokenCount || 0;
        const tokensTotal = usage.totalTokenCount || 0;

        // Fetch pricing
        let pricing = null;
        try {
            const { data: pricingData } = await supabaseAdmin
                .from('api_pricing')
                .select('input_price_per_token, output_price_per_token')
                .eq('model_name', finalModelName)
                .single();

            if (pricingData) {
                pricing = {
                    input: parseFloat(pricingData.input_price_per_token),
                    output: parseFloat(pricingData.output_price_per_token)
                };
            }
        } catch (err) {
            logError('Pricing Fetch', err);
        }

        // Fallback pricing
        if (!pricing) {
            pricing = finalModelName === 'gemini-2.5-flash-image'
                ? { input: 0.0000001, output: 0.0000004 }
                : { input: 0.00000125, output: 0.000005 };
        }

        const estimatedApiCost = (tokensPrompt * pricing.input) + (tokensCompletion * pricing.output);
        const durationMs = Date.now() - generationStartTime;

        await supabaseAdmin
            .from('generation_jobs')
            .update({
                status: 'completed',
                model: finalModelName,
                api_cost: estimatedApiCost,
                tokens_prompt: tokensPrompt,
                tokens_completion: tokensCompletion,
                tokens_total: tokensTotal,
                duration_ms: durationMs,
                concurrent_jobs: concurrentJobs,
                quality_mode: qualityMode,
                request_payload: apiRequestPayload
            })
            .eq('id', newId);

        logInfo('Generation Success', `Job: ${newId}, Duration: ${durationMs}ms, Tokens: ${tokensTotal}, Cost: $${estimatedApiCost.toFixed(6)}`);

        return new Response(JSON.stringify({
            success: true,
            image: {
                ...newImage,
                src: finalUrl,
                isGenerating: false
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        logError('Edge Function', error, { jobId: newId });

        // Mark job as failed
        if (newId && supabaseAdmin) {
            await supabaseAdmin
                .from('generation_jobs')
                .update({ status: 'failed', error: error.message })
                .eq('id', newId);
        }

        return new Response(JSON.stringify({
            error: error.message,
            jobId: newId,
            timestamp: new Date().toISOString()
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
