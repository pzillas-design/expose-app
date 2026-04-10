// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeBase64, encodeBase64 } from "https://deno.land/std@0.207.0/encoding/base64.ts";
import { findClosestValidRatio, getClosestAspectRatioFromDims } from './utils/aspectRatio.ts';
import { prepareSourceImage, extractBase64FromDataUrl, urlToBase64 } from './utils/imageProcessing.ts';
import { prepareParts, generateImage as geminiGenerateImage, extractGeneratedImage } from './services/gemini.ts';
import { COSTS } from './types/index.ts';
import { verifyJwtSignature } from '../_shared/auth.ts';

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

const claimSave = async (supabaseAdmin: any, jobId: string): Promise<boolean> => {
    const { data } = await supabaseAdmin
        .from('generation_jobs')
        .update({ status: 'saving' })
        .eq('id', jobId)
        .eq('status', 'processing')
        .select('id');

    return Array.isArray(data) && data.length > 0;
};

const saveGeminiResult = async (
    supabaseAdmin: any,
    jobId: string,
    imageAsset: { base64: string; mimeType: string },
    webhookData: any,
    usageMetadata?: any
) => {
    const claimed = await claimSave(supabaseAdmin, jobId);
    if (!claimed) {
        console.log(`[INFO] saveGeminiResult: job ${jobId} already claimed, skipping`);
        return;
    }

    const {
        requestType, qualityMode, finalModelName, prompt, targetTitle,
        userId, userEmail, parentId, sourceWidth, sourceHeight,
        sourceRealWidth, sourceRealHeight, sourceBaseName, sourceVersion, sourceId,
        annotations, apiRequestPayload, generationStartTime,
        activeTemplateId, variableValues
    } = webhookData;

    let dbBaseName = "";
    let dbTitle = "";
    let currentVersion = 1;

    if (requestType === 'create') {
        const promptSnippet = prompt.substring(0, 15).trim();
        dbBaseName = targetTitle || promptSnippet || 'Image';
        dbTitle = dbBaseName;
    } else {
        const rawBaseName = sourceBaseName || "Image";
        dbBaseName = rawBaseName.replace(/_v\d+$/, '');

        try {
            const { data: siblings, error: siblingsError } = await supabaseAdmin
                .from('images')
                .select('version, base_name, title')
                .eq('user_id', userId)
                .or(`base_name.eq.${dbBaseName},title.ilike.${dbBaseName}%`);

            if (siblingsError) {
                currentVersion = (sourceVersion || 0) + 1;
            } else if (siblings && siblings.length > 0) {
                const maxVersion = siblings.reduce((max: number, img: any) => {
                    const imgBaseName = (img.base_name || img.title || '').replace(/_v\d+$/, '');
                    if (imgBaseName === dbBaseName) return Math.max(max, img.version || 1);
                    return max;
                }, 0);
                currentVersion = maxVersion + 1;
            } else {
                currentVersion = (sourceVersion || 0) + 1;
            }
        } catch {
            currentVersion = (sourceVersion || 0) + 1;
        }

        dbTitle = targetTitle || `${dbBaseName}_v${currentVersion}`;
    }

    const rootFolder = sanitizeEmailForPath(userEmail) || userId;
    const uploadDateFolder = buildUploadDateFolder(new Date());
    const extension = imageAsset.mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const fileRole = currentVersion <= 1 ? 'original' : `variante${currentVersion}`;
    const filename = `${fileRole}_${jobId.substring(0, 8)}.${extension}`;
    const filePath = `${rootFolder}/user-content/${uploadDateFolder}/${filename}`;
    const binaryData = decodeBase64(imageAsset.base64);

    // Track storage upload timing
    let saveStage = 'storage_upload';
    const storageStart = Date.now();

    const { error: uploadError } = await supabaseAdmin.storage
        .from('user-content')
        .upload(filePath, binaryData, { contentType: imageAsset.mimeType, upsert: true });

    if (uploadError) throw uploadError;
    const storageLatencyMs = Date.now() - storageStart;

    saveStage = 'image_insert';
    const newImage: any = {
        id: jobId,
        user_id: userId,
        job_id: jobId,
        storage_path: filePath,
        width: Math.round(sourceWidth || 512),
        height: Math.round(sourceHeight || 512),
        real_width: Math.round(sourceRealWidth || sourceWidth || 1024),
        real_height: Math.round(sourceRealHeight || sourceHeight || 1024),
        model_version: finalModelName,
        title: dbTitle,
        base_name: dbBaseName,
        version: currentVersion,
        prompt: prompt,
        parent_id: (requestType === 'edit' || parentId) ? (parentId || sourceId || null) : null,
        annotations: annotations || '[]',
        generation_params: {
            quality: qualityMode,
            ...(activeTemplateId ? { activeTemplateId } : {}),
            ...(variableValues ? { variableValues } : {}),
        }
    };

    const { error: dbError } = await supabaseAdmin.from('images').insert(newImage);
    if (dbError && dbError.code !== '23505') throw dbError;

    saveStage = 'job_update';
    const durationMs = Date.now() - generationStartTime;

    // Enrich apiRequestPayload with save-stage telemetry
    if (apiRequestPayload && typeof apiRequestPayload === 'object') {
        apiRequestPayload.storageLatencyMs = storageLatencyMs;
        apiRequestPayload.saveStage = 'completed';
    }

    await supabaseAdmin
        .from('generation_jobs')
        .update({
            status: 'completed',
            model: finalModelName,
            api_cost: 0,
            tokens_prompt: usageMetadata?.promptTokenCount || 0,
            tokens_completion: usageMetadata?.candidatesTokenCount || 0,
            tokens_total: usageMetadata?.totalTokenCount || 0,
            duration_ms: durationMs,
            quality_mode: qualityMode,
            request_payload: apiRequestPayload
        })
        .eq('id', jobId);
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    let newId = null;
    let supabaseAdmin = null;
    // Stored after deduction so error handlers can refund on failure
    let refundData: { userId: string; originalCredits: number } | null = null;

    try {
        // Initialize Supabase clients
        supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Authenticate user — verify JWT signature (HMAC-SHA256) but skip expiration check.
        // verify_jwt=false is set in config.toml to allow expired tokens; we verify the
        // signature manually to prevent identity spoofing, then confirm user exists via admin API.
        const authHeader = req.headers.get('Authorization') ?? '';
        const jwtToken = authHeader.replace(/^Bearer\s+/i, '');
        const jwtPayload = await verifyJwtSignature(jwtToken);
        const userId = jwtPayload.sub;
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        const user = authUser?.user ?? null;
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
            activeTemplateId,

            // Legacy/Fallback fields
            sourceImage,
            groupParentId,
            attachments: legacyAttachments,
            sourceStoragePath,  // internal storage path — preferred over signed URL fetch
        } = payload;

        // Early content validation — prevents credit deduction for empty requests
        if (!prompt?.trim() && !sourceImage?.src && !payloadOriginalImage && !payloadReferences?.length) {
            throw new Error('A prompt or image is required.');
        }

        logInfo('Generation Start', `User: ${user.id}, Quality: ${qualityMode}, Job: ${newId}, Board: ${board_id}`);
        console.log(`[DEBUG] Request Type: ${requestType}`);
        console.log(`[DEBUG] Prompt: ${prompt?.substring(0, 30)}...`);
        console.log(`[DEBUG] Source Image present: ${!!sourceImage}, refs: ${payloadReferences?.length ?? 0}`);

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
                .insert({ id: user.id, email: user.email, full_name: 'User', credits: 5 })
                .select()
                .single();
            profile = newProfile;
        }

        const isPro = profile.role === 'pro' || profile.role === 'admin';
        const creditBalance = Math.round((profile.credits || 0) * 100) / 100;
        if (!isPro && creditBalance < cost) {
            throw new Error('Insufficient credits');
        }

        // Deduct credits and store original balance for refund on failure
        if (!isPro && cost > 0) {
            const newBalance = Math.round((creditBalance - cost) * 100) / 100;
            await supabaseAdmin
                .from('profiles')
                .update({ credits: newBalance })
                .eq('id', user.id);
            refundData = { userId: user.id, originalCredits: creditBalance };
        }

        // ── All heavy work (image uploads + Gemini API call) runs in background ──
        // Response is returned immediately below so the client is never left waiting.
        // EdgeRuntime.waitUntil keeps the function alive up to 5 minutes after response.
        EdgeRuntime.waitUntil((async () => {
            const taskStartMs = Date.now();
            let bgStage = 'init';
            let concurrentCount = 0;
            let apiRequestPayload: any = {}; // hoisted — updateStage can reference it from first call
            // Fire-and-forget stage tracker — writes current_stage + elapsed to request_payload.
            const updateStage = (stage: string, extra?: Record<string, any>) => {
                bgStage = stage;
                const elapsedMs = Date.now() - taskStartMs;
                logInfo('Stage', `→ ${stage} (elapsed: ${elapsedMs}ms, job: ${newId})`);
                const payload = { ...apiRequestPayload };
                payload.current_stage = stage;
                payload.stage_updated_at = new Date().toISOString();
                payload.stage_elapsed_ms = elapsedMs;
                if (extra) Object.assign(payload, extra);
                supabaseAdmin.from('generation_jobs')
                    .update({ request_payload: payload })
                    .eq('id', newId)
                    .then(() => {});
            };
            try {
                // Mark as init immediately so 'unknown' stage never appears in failed jobs
                updateStage('init');

                // Count concurrent jobs early for diagnostics
                const { count: _cc } = await supabaseAdmin
                    .from('generation_jobs')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'processing');
                concurrentCount = _cc || 0;
                logInfo('BG Task Start', `job=${newId} quality=${qualityMode} user=${user.id} concurrent=${concurrentCount}`);

                // Prepare source image (base64)
                updateStage('prepare_source');
                let finalSourceBase64 = null;
                if (sourceStoragePath) {
                    // Direct admin storage download with 20s timeout
                    const STORAGE_TIMEOUT_MS = 20_000;
                    const { data: storageBlob, error: storageErr } = await Promise.race([
                        supabaseAdmin.storage.from('user-content').download(sourceStoragePath),
                        new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error(`Storage download timed out after ${STORAGE_TIMEOUT_MS / 1000}s`)), STORAGE_TIMEOUT_MS)
                        )
                    ]);
                    if (storageErr) throw new Error(`Storage download failed: ${storageErr.message}`);
                    const arrayBuffer = await storageBlob.arrayBuffer();
                    finalSourceBase64 = encodeBase64(new Uint8Array(arrayBuffer));
                } else {
                    // Fallback: HTTP fetch for images without a storage path
                    const sourceToProcess = payloadOriginalImage || sourceImage?.src;
                    if (sourceToProcess) {
                        finalSourceBase64 = await prepareSourceImage(sourceToProcess);
                    }
                }

                const isNb2Mode = qualityMode.startsWith('nb2-');
                if (!isNb2Mode) {
                    throw new Error('Only NB2 quality modes are supported');
                }

                const finalModelName = 'gemini-3.1-flash-image-preview';

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

                // Resolution for Gemini image output
                const geminiImageSize = qualityMode === 'nb2-4k' ? '4K'
                    : qualityMode === 'nb2-2k' ? '2K'
                    : qualityMode === 'nb2-05k' ? '512' : '1K';

                // aspectRatio logic:
                // - Create mode (no source): always set, otherwise Gemini defaults to 1:1
                // - Edit with references: always set, otherwise Gemini adopts last reference's ratio
                // - Edit without references: omit — Gemini preserves original ratio automatically
                const hasRefImages = payloadReferences?.length > 0;
                const needsExplicitRatio = !finalSourceBase64 || hasRefImages;

                const generationConfig: any = {
                    imageConfig: {
                        ...(needsExplicitRatio ? { aspectRatio: bestRatio } : {}),
                        imageSize: geminiImageSize
                    }
                };

                // (1) Resolve all reference paths to signed URLs for Gemini
                const resolvedReferences: any[] = [];
                if (payloadReferences?.length) {
                    for (const ref of payloadReferences) {
                        if (resolvedReferences.length >= 8) break;
                        if (ref.src?.startsWith('http') || ref.src?.startsWith('data:')) {
                            resolvedReferences.push(ref);
                        } else if (ref.src) {
                            const { data: signedData } = await supabaseAdmin.storage
                                .from('user-content')
                                .createSignedUrl(ref.src, 3600);
                            if (signedData?.signedUrl) {
                                resolvedReferences.push({ ...ref, src: signedData.signedUrl });
                            }
                        }
                    }
                }

                // (2) Prepare parts array (Multimodal Interleaving for Gemini path)
                const { parts, hasMask, hasRefs, allRefs } = await prepareParts(
                    { ...payload, references: resolvedReferences },
                    finalSourceBase64
                );

                logInfo('Parts Prepared', `Total: ${parts.length} (source: ${!!finalSourceBase64}, mask: ${hasMask}, refs: ${allRefs.length})`);

                // Store API request for debugging (variable declared above for early updateStage calls)
                apiRequestPayload = {
                    model: finalModelName,
                    userPrompt: prompt,
                    hasSourceImage: !!finalSourceBase64,
                    hasMask,
                    hasReferenceImages: hasRefs,
                    referenceImagesCount: allRefs.length,
                    imageSize: geminiImageSize,
                    references: allRefs,
                    generationConfig,
                    variableValues: variables || null,
                    timestamp: new Date().toISOString()
                };

                // Count concurrent jobs
                const { count: concurrentJobCount } = await supabaseAdmin
                    .from('generation_jobs')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'processing');

                const generationStartTime = Date.now();

                const webhookData = {
                    requestType,
                    qualityMode,
                    finalModelName,
                    prompt,
                    targetTitle,
                    userId: user.id,
                    userEmail: user.email,
                    parentId: groupParentId || sourceImage?.id || null,
                    sourceWidth: sourceImage?.width,
                    sourceHeight: sourceImage?.height,
                    sourceRealWidth: sourceImage?.realWidth || sourceImage?.width,
                    sourceRealHeight: sourceImage?.realHeight || sourceImage?.height,
                    sourceBaseName: sourceImage?.baseName || sourceImage?.title,
                    sourceVersion: sourceImage?.version,
                    sourceId: sourceImage?.id || null,
                    annotations: (resolvedReferences.length > 0) ? JSON.stringify(resolvedReferences.map((r: any) => ({
                        id: crypto.randomUUID(),
                        type: 'reference_image',
                        referenceImage: r.src,
                        text: r.instruction || ''
                    }))) : '[]',
                    apiRequestPayload,
                    generationStartTime,
                    isPro,
                    cost,
                    activeTemplateId: activeTemplateId || null,
                    variableValues: variables || null,
                    refundCredits: profile.credits  // already-decremented credits to restore on failure
                };

                const geminiApiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_STUDIO_API_KEY');
                if (!geminiApiKey) {
                    throw new Error('Google API key missing');
                }

                // Write webhook_data + stage to DB BEFORE calling Gemini
                // so that even if the function dies mid-call we have full diagnostics
                updateStage('gemini_call');
                await supabaseAdmin
                    .from('generation_jobs')
                    .update({
                        webhook_data: webhookData,
                        request_payload: { ...apiRequestPayload, current_stage: 'gemini_call', gemini_start: Date.now() }
                    })
                    .eq('id', newId);

                logInfo('Google API Call', `Model: ${finalModelName}, Quality: ${qualityMode}, AR: ${bestRatio}, Parts: ${parts.length}`);
                const providerStartTime = Date.now();

                // 4K needs up to 200s; other modes use 130s. waitUntil budget is ~400s total.
                // 4K does NOT retry on timeout (200s × 2 = 400s would exceed the budget).
                const GEMINI_TIMEOUT_MS = qualityMode === 'nb2-4k' ? 200_000 : 130_000;
                const callGeminiWithTimeout = () => Promise.race([
                    geminiGenerateImage(
                        geminiApiKey,
                        finalModelName,
                        parts,
                        generationConfig,
                        !!finalSourceBase64,
                        hasMask,
                        hasRefs,
                        () => updateStage('gemini_retry_503')
                    ),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error(`Gemini timeout after ${GEMINI_TIMEOUT_MS / 1000}s`)), GEMINI_TIMEOUT_MS)
                    )
                ]);

                let geminiResponse: any;
                try {
                    geminiResponse = await callGeminiWithTimeout();
                } catch (firstErr: any) {
                    if (firstErr?.message?.includes('timeout') && qualityMode !== 'nb2-4k') {
                        logInfo('Gemini Retry', 'First attempt timed out — retrying once...');
                        updateStage('gemini_retry');
                        geminiResponse = await callGeminiWithTimeout();
                    } else {
                        throw firstErr;
                    }
                }
                const providerLatencyMs = Date.now() - providerStartTime;

                let generatedImage = extractGeneratedImage(geminiResponse);
                if (!generatedImage) {
                    // Auto-retry once on MALFORMED_FUNCTION_CALL — transient Gemini flakiness
                    const candidate0 = geminiResponse?.candidates?.[0];
                    if (candidate0?.finishReason === 'MALFORMED_FUNCTION_CALL') {
                        logInfo('Gemini Retry', 'MALFORMED_FUNCTION_CALL — retrying once...');
                        updateStage('gemini_retry');
                        geminiResponse = await callGeminiWithTimeout();
                        generatedImage = extractGeneratedImage(geminiResponse);
                    }
                }
                if (!generatedImage) {
                    // Extract rejection reason from response for better error messages
                    const candidate = geminiResponse?.candidates?.[0];
                    const blockReason = geminiResponse?.promptFeedback?.blockReason;
                    const finishReason = candidate?.finishReason;
                    const textPart = candidate?.content?.parts?.find((p: any) => p.text)?.text;
                    const detail = blockReason
                        ? `blocked: ${blockReason}`
                        : finishReason && finishReason !== 'STOP'
                            ? `finish: ${finishReason}`
                            : textPart
                                ? `response: ${textPart.slice(0, 120)}`
                                : 'no image in response';
                    console.warn('[DEBUG] No image generated -', detail);
                    throw new Error(`Google response did not contain an image (${detail})`);
                }

                // Extract provider metadata from Google response
                const candidate = geminiResponse?.candidates?.[0];
                const providerMetadata = {
                    // Provider response fields
                    responseId: geminiResponse?.responseId || null,
                    finishReason: candidate?.finishReason || null,
                    finishMessage: candidate?.finishMessage || null,
                    promptBlockReason: geminiResponse?.promptFeedback?.blockReason || null,
                    promptSafetyRatings: geminiResponse?.promptFeedback?.safetyRatings || null,
                    candidateSafetyRatings: candidate?.safetyRatings || null,
                    providerModelVersion: geminiResponse?.modelVersion || finalModelName,
                    // Request context (server-side, consistent)
                    responseModalities: ['TEXT', 'IMAGE'],
                    aspectRatioRequested: bestRatio || null,
                    hasSourceImage: !!finalSourceBase64,
                    hasMask,
                    referenceCount: allRefs.length,
                    // Timing
                    providerLatencyMs,
                };

                // Merge provider metadata into apiRequestPayload for storage
                Object.assign(apiRequestPayload, providerMetadata);

                updateStage('save_result');
                await saveGeminiResult(
                    supabaseAdmin,
                    newId,
                    generatedImage,
                    webhookData,
                    geminiResponse?.usageMetadata
                );

                logInfo('Google Generation Saved', `Job ${newId} completed via Google`);

            } catch (bgErr: any) {
                const errorMsg = bgErr?.message || (typeof bgErr === 'string' ? bgErr : 'Background task failed');
                const elapsedMs = Date.now() - taskStartMs;
                logError('Background Task', errorMsg, { jobId: newId, failureStage: bgStage, elapsedMs, qualityMode, concurrentCount });

                // Write structured error to error_logs for debugging
                supabaseAdmin.from('error_logs').insert({
                    user_id: user.id,
                    user_email: user.email,
                    message: `[${bgStage}] ${errorMsg}`,
                    context: JSON.stringify({ jobId: newId, stage: bgStage, elapsedMs, qualityMode, concurrentCount }),
                    source: 'edge-function',
                    url: newId,
                }).then(() => {});

                // Refund credits on background failure
                if (refundData) {
                    try {
                        await supabaseAdmin
                            .from('profiles')
                            .update({ credits: refundData.originalCredits })
                            .eq('id', refundData.userId);
                        logInfo('Credits Refunded (BG)', `Restored ${refundData.originalCredits} for user ${refundData.userId}`);
                    } catch (e) {
                        logError('Credit Refund Failed (BG)', e);
                    }
                }

                // Mark job as failed with failure_stage in error details + preserve request payload
                if (newId) {
                    try {
                        const failPayload = { ...apiRequestPayload };
                        failPayload.current_stage = bgStage;
                        failPayload.stage_updated_at = new Date().toISOString();
                        failPayload.failed = true;
                        const failDurationMs = typeof generationStartTime !== 'undefined' ? Date.now() - generationStartTime : null;
                        await supabaseAdmin
                            .from('generation_jobs')
                            .update({
                                status: 'failed',
                                error: `[${bgStage}] ${errorMsg}`,
                                request_payload: failPayload,
                                ...(failDurationMs !== null ? { duration_ms: failDurationMs } : {})
                            })
                            .eq('id', newId);
                    } catch (e) {
                        logError('Job Update Failed (BG)', e);
                    }
                }
            }
        })());

        // Respond immediately — client will poll generation_jobs for completion
        return new Response(JSON.stringify({
            success: true,
            jobId: newId,
            status: 'processing'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        // This only catches synchronous errors (auth, insufficient credits, payload parse)
        const errorMsg = error?.message || (typeof error === 'string' ? error : "Unknown error occurred");
        logError('Edge Function', errorMsg, { jobId: newId });

        // Refund credits on sync failure (e.g. credits deducted then payload parse fails)
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
