// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeBase64 } from "https://deno.land/std@0.207.0/encoding/base64.ts";
import { findClosestValidRatio, getClosestAspectRatioFromDims } from './utils/aspectRatio.ts';
import { prepareSourceImage } from './utils/imageProcessing.ts';
import { generateImageKie } from './services/kie.ts';
import { prepareParts } from './services/gemini.ts';
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

const sanitizeEmailForPath = (email?: string | null) => {
    if (!email) return null;
    return email
        .trim()
        .toLowerCase()
        .replace(/\//g, '_');
};

const buildUploadDateFolder = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = String(date.getFullYear());
    return `upload${dd}${mm}${yyyy}`;
};

/**
 * Uploads a base64 image to temp Supabase storage and returns a signed URL for Kie.ai
 */
const uploadTempForKie = async (supabaseAdmin: any, base64: string, jobId: string, idx: number): Promise<string | null> => {
    try {
        const binaryData = decodeBase64(base64);
        const tempPath = `_temp_kie/${jobId}_${idx}.jpg`;
        const { error } = await supabaseAdmin.storage
            .from('user-content')
            .upload(tempPath, binaryData, { contentType: 'image/jpeg', upsert: true });
        if (error) return null;
        const { data } = await supabaseAdmin.storage
            .from('user-content')
            .createSignedUrl(tempPath, 3600);
        return data?.signedUrl || null;
    } catch {
        return null;
    }
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    let newId = null;
    let supabaseAdmin = null;
    // Stored after deduction so the outer catch can always refund on any failure
    let refundData: { userId: string; originalCredits: number } | null = null;

    // Global timeout — Kie.ai can take up to 2min to generate, plus overhead (~15s).
    // Supabase hard limit is 150s; we use 145s to stay safely under.
    const TIMEOUT_MS = 145000;
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Generation Timeout: Job took too long (>145s)')), TIMEOUT_MS)
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

            // Deduct credits and store original balance for outer-catch refund
            if (!isPro && cost > 0) {
                await supabaseAdmin
                    .from('profiles')
                    .update({ credits: profile.credits - cost })
                    .eq('id', user.id);
                refundData = { userId: user.id, originalCredits: profile.credits };
            }

            // Prepare source image (base64)
            let finalSourceBase64 = null;
            const sourceToProcess = payloadOriginalImage || sourceImage?.src;
            if (sourceToProcess) {
                finalSourceBase64 = await prepareSourceImage(sourceToProcess);
            }

            // Model: nano-banana-2 for nb2-* quality modes, else nano-banana-pro
            const finalModelName = qualityMode.startsWith('nb2-') ? 'nano-banana-2' : 'nano-banana-pro';

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

            const generationStartTime = Date.now();

            // Prepare image URLs for Kie.ai (image_input requires URLs, not base64)
            const kieImageUrls: string[] = [];

            // Source image — use original URL if available, else upload base64 to temp storage
            const sourceHttpUrl = (payloadOriginalImage && payloadOriginalImage.startsWith('http'))
                ? payloadOriginalImage
                : (sourceImage?.src && sourceImage.src.startsWith('http')) ? sourceImage.src : null;

            if (sourceHttpUrl) {
                kieImageUrls.push(sourceHttpUrl);
            } else if (finalSourceBase64) {
                const tempUrl = await uploadTempForKie(supabaseAdmin, finalSourceBase64, newId, 0);
                if (tempUrl) kieImageUrls.push(tempUrl);
            }

            // Annotation image (canvas base64) — upload to temp storage
            if (payloadAnnotationImage) {
                const annBase64 = payloadAnnotationImage.startsWith('data:')
                    ? payloadAnnotationImage.split(',')[1]
                    : payloadAnnotationImage;
                const annUrl = await uploadTempForKie(supabaseAdmin, annBase64, newId, kieImageUrls.length);
                if (annUrl) kieImageUrls.push(annUrl);
            }

            // References that are already HTTP URLs
            if (payloadReferences?.length) {
                for (const ref of payloadReferences) {
                    if (ref.src?.startsWith('http') && kieImageUrls.length < 8) {
                        kieImageUrls.push(ref.src);
                    }
                }
            }

            const kieResolution = (qualityMode === 'pro-4k' || qualityMode === 'nb2-4k') ? '4K'
                : (qualityMode === 'pro-2k' || qualityMode === 'nb2-2k') ? '2K' : '1K';

            // Call Kie AI
            logInfo('Kie API Call', `Model: ${finalModelName}, Quality: ${qualityMode}, AR: ${bestRatio}, Images: ${kieImageUrls.length}`);

            const kieResponse = await generateImageKie(
                (Deno.env.get('KIE_API_KEY') || Deno.env.get('kie.ai'))!,
                finalModelName,
                payload,
                kieImageUrls,
                bestRatio,
                kieResolution
            );

            if (!kieResponse?.data?.[0]?.b64_json) {
                logError('Kie API Response', `No image returned.`, kieResponse);
                // Refund credits
                if (!isPro && cost > 0) {
                    await supabaseAdmin
                        .from('profiles')
                        .update({ credits: profile.credits })
                        .eq('id', user.id);
                }
                throw new Error('Image generation failed on Kie.ai');
            }

            const generatedBase64 = kieResponse.data[0].b64_json;

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
                        .from('images')
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

            const rootFolder = sanitizeEmailForPath(user.email) || user.id;
            const uploadDateFolder = buildUploadDateFolder(new Date());
            const isOriginal = currentVersion <= 1;
            const variantLabel = isOriginal ? 'original' : `variante${currentVersion}`;
            const filename = `${variantLabel}_${newId.substring(0, 8)}.jpg`;
            const filePath = `${rootFolder}/user-content/${uploadDateFolder}/${filename}`;

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
                .from('images')
                .insert(newImage);

            if (dbError) {
                logError('Database Insert', dbError);
                throw dbError;
            }

            // Update job status
            // Prefer Kie's costTime (actual model time) over wall-clock for accurate smart estimates
            const wallClockMs = Date.now() - generationStartTime;
            const durationMs = kieResponse.costTime || wallClockMs;
            logInfo('Duration', `Wall: ${wallClockMs}ms, Kie costTime: ${kieResponse.costTime ?? 'n/a'}ms → stored: ${durationMs}ms`);

            // Kie.ai does not expose token usage metrics
            const tokensPrompt = 0;
            const tokensCompletion = 0;
            const tokensTotal = 0;
            const concurrentJobs = concurrentJobCount || 0;

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
                    quality_mode: qualityMode,
                    request_payload: apiRequestPayload
                })
                .eq('id', newId);

            logInfo('Generation Success', `Job: ${newId}, Duration: ${durationMs}ms, Tokens: ${tokensTotal}, Cost: $${estimatedApiCost.toFixed(6)}`);

            // Fire-and-forget: log remaining Kie.ai credits for monitoring
            (async () => {
                try {
                    const kieApiKey = Deno.env.get('KIE_API_KEY') || Deno.env.get('kie.ai');
                    if (!kieApiKey) return;
                    const r = await fetch('https://api.kie.ai/api/v1/chat/credit', {
                        headers: { 'Authorization': `Bearer ${kieApiKey}` }
                    });
                    if (r.ok) {
                        const j = await r.json();
                        console.log(`[INFO] Kie.ai remaining credits: ${j?.data ?? 'unknown'}`);
                    }
                } catch { /* non-critical */ }
            })();

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

        // Always refund credits on any failure (timeout, Kie error, DB error, etc.)
        if (refundData && supabaseAdmin) {
            try {
                await supabaseAdmin
                    .from('profiles')
                    .update({ credits: refundData.originalCredits })
                    .eq('id', refundData.userId);
                logInfo('Credits Refunded', `Restored ${refundData.originalCredits} for user ${refundData.userId}`);
            } catch (e) {
                logError('Credit Refund Failed', e);
            }
        }

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
