// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeBase64 } from "https://deno.land/std@0.207.0/encoding/base64.ts";
import { slugify } from './utils/slugify.ts';
import { findClosestValidRatio, getClosestAspectRatioFromDims } from './utils/aspectRatio.ts';
import { prepareSourceImage } from './utils/imageProcessing.ts';
import { prepareParts, generateImage } from './services/gemini.ts';
import { generateImageReplicate } from './services/replicate.ts';
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

    // Global timeout to prevent resource exhaustion and ungraceful termination
    const TIMEOUT_MS = 55000;
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Generation Timeout: Job took too long (>55s)')), TIMEOUT_MS)
    );

    try {
        const generationPromise = (async () => {
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

            // New Structured Payload extraction
            const {
                type: requestType,
                prompt,
                variables,
                originalImage: payloadOriginalImage,
                annotationImage: payloadAnnotationImage,
                references: payloadReferences,

                // Core metadata
                qualityMode,
                modelName,
                board_id,
                aspectRatio: explicitRatio,
                targetTitle,

                // Legacy/Fallback fields
                sourceImage,
                attachments: legacyAttachments
            } = payload;

            logInfo('Generation Start', `User: ${user.id}, Quality: ${qualityMode}, Job: ${newId}, Board: ${board_id}`);
            console.log(`[DEBUG] Request Type: ${requestType}`);
            console.log(`[DEBUG] Prompt: ${prompt?.substring(0, 30)}...`);
            console.log(`[DEBUG] Source Image present: ${!!sourceImage}`);
            if (sourceImage) {
                console.log(`[DEBUG] Source Image ID: ${sourceImage.id}`);
                console.log(`[DEBUG] Source Image baseName: ${sourceImage.baseName}`);
                console.log(`[DEBUG] Source Image full:`, JSON.stringify(sourceImage, null, 2));
            }

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

            // Prepare source image (base64)
            let finalSourceBase64 = null;
            const sourceToProcess = payloadOriginalImage || sourceImage?.src;
            if (sourceToProcess) {
                finalSourceBase64 = await prepareSourceImage(sourceToProcess);
            }

            // Determine model
            let finalModelName = 'gemini-3-pro-image-preview';
            if (qualityMode === 'fast' || modelName === 'fast') {
                finalModelName = 'gemini-2.5-flash-image';
            } else if (modelName && (modelName.startsWith('gemini-') || modelName.startsWith('replicate/'))) {
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
                bestRatio = getClosestAspectRatioFromDims(sourceW, sourceH);
                logInfo('Aspect Ratio', `Edit mode (Legacy) - preserving ${sourceW}x${sourceH} (mapped to ${bestRatio})`);
            } else if (requestType === 'edit' || payloadOriginalImage) {
                isEditMode = true;
                logInfo('Aspect Ratio', `Edit mode (Structured) - preserving aspect ratio (1:1 fallback)`);
            }

            // Prepare generation config (Standard AI Studio format)
            const generationConfig: any = {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                imageConfig: {
                    ...(isEditMode ? {} : { aspectRatio: bestRatio }),
                    ...(finalModelName === 'gemini-3-pro-image-preview' ? {
                        imageSize: qualityMode === 'pro-4k' ? '4K' : (qualityMode === 'pro-2k' ? '2K' : '1K')
                    } : {})
                }
            };

            // Prepare parts array (Multimodal Interleaving)
            const { parts, hasMask, hasRefs, allRefs } = await prepareParts(
                payload,
                finalSourceBase64
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

            // Call AI API (Gemini or Replicate)
            let generatedBase64 = null;
            let finalOutputModel = finalModelName;
            let geminiResponse = null;

            const replicateApiToken = Deno.env.get('REPLICATE_API_TOKEN');
            const isReplicateModel = finalModelName.startsWith('replicate/');

            if (isReplicateModel && replicateApiToken) {
                logInfo('Replicate API Call', `Model: ${finalModelName}`);
                // Remove 'replicate/' prefix to get actual model ID (e.g. google/nano-banana-pro)
                const replicateModel = finalModelName.replace('replicate/', '');

                const replicateResult = await generateImageReplicate(
                    replicateApiToken,
                    replicateModel,
                    parts, // Pass prepared parts; service extracts text/images
                    {
                        resolution: qualityMode === 'pro-4k' ? '4K' : (qualityMode === 'pro-1k' ? '1K' : '2K'),
                        aspect_ratio: explicitRatio || (isEditMode ? 'match_input_image' : undefined)
                    }
                );
                generatedBase64 = replicateResult.data;

                // Log prediction ID for debugging
                logInfo('Replicate Success', `Prediction ID: ${replicateResult.predictionId}`);

            } else {
                // Call Gemini API
                logInfo('Gemini API Call', `Model: ${finalModelName}, Quality: ${qualityMode}`);
                geminiResponse = await generateImage(
                    Deno.env.get('GEMINI_API_KEY')!,
                    finalModelName,
                    parts,
                    generationConfig,
                    requestType
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
                generatedBase64 = imagePart.inlineData.data;
            }

            // Prepare storage path
            let subfolder = board_id || 'unorganized';
            if (board_id) {
                try {
                    const { data: boardData, error: boardError } = await supabaseAdmin
                        .from('boards')
                        .select('name')
                        .eq('id', board_id)
                        .limit(1); // Use .limit(1) instead of .maybeSingle() for safer error handling

                    if (boardError) {
                        logError('Board Fetch Error', boardError, { board_id });
                    } else if (boardData && boardData.length > 0) {
                        const board = boardData[0];
                        subfolder = `${slugify(board.name)}_${board_id}`;
                    } else {
                        logInfo('Board Not Found', `Board with ID ${board_id} not found, using 'unorganized' subfolder.`);
                    }
                } catch (e) {
                    logError('Board Fetch Exception', e, { board_id });
                }
            }

            let dbBaseName = "";
            let dbTitle = "";
            let currentVersion = 1;

            if (requestType === 'create') {
                // NEW GENERATION: Use first 15 chars of prompt as baseName
                const promptSnippet = prompt.substring(0, 15).trim();
                dbBaseName = targetTitle || promptSnippet || 'Image';
                dbTitle = dbBaseName;
                currentVersion = 1;
            } else {
                // EDIT/VERSION: Inherit baseName from source, but calculate version globally
                const rawBaseName = sourceImage?.baseName || sourceImage?.title || "Image";
                dbBaseName = rawBaseName.replace(/_v\d+$/, ''); // Clean any existing version suffix

                // Query database for all images with this baseName to find max version
                try {
                    const { data: siblings, error: siblingsError } = await supabaseAdmin
                        .from('canvas_images')
                        .select('version, base_name, title')
                        .eq('user_id', user.id)
                        .or(`base_name.eq.${dbBaseName},title.ilike.${dbBaseName}%`);

                    if (siblingsError) {
                        logError('Siblings Query', siblingsError);
                        currentVersion = (sourceImage?.version || 0) + 1;
                    } else if (siblings && siblings.length > 0) {
                        const maxVersion = siblings.reduce((max, img) => {
                            const imgBaseName = (img.base_name || img.title || '').replace(/_v\d+$/, '');
                            if (imgBaseName === dbBaseName) {
                                return Math.max(max, img.version || 1);
                            }
                            return max;
                        }, 0);
                        currentVersion = maxVersion + 1;
                    } else {
                        currentVersion = (sourceImage?.version || 0) + 1;
                    }
                } catch (err) {
                    logError('Version Calculation', err);
                    currentVersion = (sourceImage?.version || 0) + 1;
                }

                dbTitle = targetTitle || `${dbBaseName}_v${currentVersion}`;
            }

            const titleSlug = slugify(dbBaseName);
            const filename = `${titleSlug}_v${currentVersion}_${newId.substring(0, 8)}.jpg`;
            const filePath = `${user.id}/${subfolder}/${filename}`;

            // Upload to storage using efficient decoding
            const binaryData = decodeBase64(generatedBase64);
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
                board_id: board_id || null,
                job_id: newId,
                storage_path: filePath,
                width: Math.round(sourceImage?.width || 512),
                height: Math.round(sourceImage?.height || 512),
                real_width: Math.round(sourceImage?.realWidth || sourceImage?.width || 1024),
                real_height: Math.round(sourceImage?.realHeight || sourceImage?.height || 1024),
                model_version: finalModelName,
                title: dbTitle,
                base_name: dbBaseName,
                version: currentVersion,
                prompt: prompt,
                parent_id: (requestType === 'edit' || payloadOriginalImage) ? (sourceImage?.id || null) : null,
                // CRITICAL: Newly generated images should NOT inherit annotations from source
                // Only 'create' requests with references should have annotations
                annotations: (requestType === 'create' && payloadReferences) ? JSON.stringify(payloadReferences.map(r => ({
                    id: crypto.randomUUID(),
                    type: 'reference_image',
                    referenceImage: r.src,
                    text: r.instruction || ''
                }))) : '[]',
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
            const usage = (isReplicateModel ? {} : (geminiResponse as any).usageMetadata) || {};
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
        });

        // Race the generation against the timeout
        return await Promise.race([generationPromise(), timeoutPromise]) as Response;

    } catch (error: any) {
        const errorMsg = error?.message || (typeof error === 'string' ? error : "Unknown error occurred");
        logError('Edge Function', errorMsg, { jobId: newId });

        // Mark job as failed
        if (newId && supabaseAdmin) {
            try {
                await supabaseAdmin
                    .from('generation_jobs')
                    .update({ status: 'failed', error: errorMsg })
                    .eq('id', newId);
            } catch (e) {
                logError('Job Update Failed', e);
            }
        }

        return new Response(JSON.stringify({
            error: errorMsg,
            jobId: newId,
            timestamp: new Date().toISOString()
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 400,
        });
    }
});
