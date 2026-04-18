// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeBase64, encodeBase64 } from "https://deno.land/std@0.207.0/encoding/base64.ts";
import { findClosestValidRatio, getClosestAspectRatioFromDims } from './utils/aspectRatio.ts';
import { prepareSourceImage, extractBase64FromDataUrl, urlToBase64 } from './utils/imageProcessing.ts';
import { prepareParts, generateImage as geminiGenerateImage, extractGeneratedImage } from './services/gemini.ts';
import { createKieTask, pollKieTask } from './services/kie.ts';
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

/**
 * Uploads a base64 image to temp storage and returns a signed URL for Kie.ai.
 * Kie requires HTTP URLs, not base64.
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

/**
 * Returns true if the Google error is worth retrying via Kie.ai fallback.
 * Covers: timeouts, Google 503s, malformed responses, empty image responses.
 */
const isKieRetryable = (err: any): boolean => {
    const msg = String(err?.message || err || '');
    // Block content policy errors — Kie would also reject these
    const isContentBlock = (
        msg.includes('SAFETY') ||
        msg.includes('PROHIBITED_CONTENT') ||
        msg.includes('blocked:') ||
        msg.includes('finish: SAFETY') ||
        msg.includes('finish: PROHIBITED')
    );
    if (isContentBlock) return false;
    // Route everything else to Kie (quota, timeouts, server errors, empty responses, etc.)
    return true;
};

const claimSave = async (supabaseAdmin: any, jobId: string): Promise<boolean> => {
    // Try processing first (normal path)
    const { data: processing } = await supabaseAdmin
        .from('generation_jobs')
        .update({ status: 'saving' })
        .eq('id', jobId)
        .eq('status', 'processing')
        .select('id');

    if (Array.isArray(processing) && processing.length > 0) return true;

    // Also claim if marked failed for any reason — server result wins over client/cron timeouts.
    // saveGeminiResult is only called when we actually have an image, so this is safe.
    const { data: failed } = await supabaseAdmin
        .from('generation_jobs')
        .update({ status: 'saving' })
        .eq('id', jobId)
        .eq('status', 'failed')
        .select('id');

    return Array.isArray(failed) && failed.length > 0;
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
        sourceFolderId, annotations, apiRequestPayload, generationStartTime,
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
        folder_id: sourceFolderId ?? sourceId ?? jobId,
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
            prompt: rawPrompt,
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
            sourceFolderId,     // folder_id of source image — propagated to generated result
            attachments: legacyAttachments,
            sourceStoragePath,  // internal storage path — preferred over signed URL fetch
            isRepeat,           // true when user presses "More" / repeat generation
        } = payload;

        // For repeat/"More" generations: append a random variation ID so Gemini's implicit
        const prompt = rawPrompt;

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
                .insert({ id: user.id, email: user.email, full_name: 'User', credits: 3 })
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

                // Count concurrent jobs early for diagnostics + admission control
                const { count: _cc } = await supabaseAdmin
                    .from('generation_jobs')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'processing');
                concurrentCount = _cc || 0;
                logInfo('BG Task Start', `job=${newId} quality=${qualityMode} user=${user.id} concurrent=${concurrentCount}`);

                // No admission control — Google handles concurrency natively

                // Persist concurrent_jobs count on the job row for later correlation
                supabaseAdmin.from('generation_jobs')
                    .update({ concurrent_jobs: concurrentCount })
                    .eq('id', newId)
                    .then(() => {});

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

                if (explicitRatio) {
                    bestRatio = findClosestValidRatio(explicitRatio);
                    logInfo('Aspect Ratio', `Explicit ratio '${explicitRatio}' mapped to '${bestRatio}'`);
                } else if (sourceImage && (sourceImage.realWidth || sourceImage.width)) {
                    const sourceW = sourceImage.realWidth || sourceImage.width || 1024;
                    const sourceH = sourceImage.realHeight || sourceImage.height || 1024;
                    bestRatio = getClosestAspectRatioFromDims(sourceW, sourceH);
                    logInfo('Aspect Ratio', `Edit mode (Legacy) - preserving ${sourceW}x${sourceH} (mapped to ${bestRatio})`);
                } else if (requestType === 'edit' || payloadOriginalImage) {
                    logInfo('Aspect Ratio', `Edit mode (Structured) - preserving aspect ratio (1:1 fallback)`);
                }

                // ── PRIMARY_PROVIDER switch ──────────────────────────────────────────
                // 'kie'    → Kie.ai first, Google as fallback on error
                // 'google' → Google first, Kie.ai as fallback on error
                //
                // NOTE (2026-04-18): temporarily set to 'kie' because Google's streaming
                // path silently kills the EdgeRuntime.waitUntil task — none of the
                // in-task timeouts (FIRST_CHUNK 20s, CHUNK_IDLE 25s, outer 60s) fire,
                // so jobs hang until pg_cron reapers them 8 min later. Kie uses a
                // webhook pattern so the edge function returns quickly and doesn't
                // need a long-lived background task. Flip back to 'google' once the
                // root cause is understood (CPU budget? waitUntil budget?).
                const PRIMARY_PROVIDER = 'kie'; // change to 'google' to switch primary

                const kieApiKey = Deno.env.get('KIE_API_KEY') || Deno.env.get('kie.ai');
                const kieSupported = !!kieApiKey;

                // ── SHARED PREP (both pipelines use these) ───────────────────────────

                // Annotation image → normalized base64 (both paths send it as an image)
                const annotationBase64 = payloadAnnotationImage
                    ? (payloadAnnotationImage.startsWith('data:')
                        ? extractBase64FromDataUrl(payloadAnnotationImage)
                        : payloadAnnotationImage)
                    : null;

                // References → resolve storage paths to signed URLs once (reused by both paths)
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
                            if (signedData?.signedUrl) resolvedReferences.push({ ...ref, src: signedData.signedUrl });
                        }
                    }
                }

                const generationStartTime = Date.now();

                const webhookData: any = {
                    requestType,
                    qualityMode,
                    finalModelName,
                    prompt,
                    targetTitle,
                    userId: user.id,
                    userEmail: user.email,
                    parentId: sourceImage?.id || null,
                    sourceWidth: sourceImage?.width,
                    sourceHeight: sourceImage?.height,
                    sourceRealWidth: sourceImage?.realWidth || sourceImage?.width,
                    sourceRealHeight: sourceImage?.realHeight || sourceImage?.height,
                    sourceBaseName: sourceImage?.baseName || sourceImage?.title,
                    sourceVersion: sourceImage?.version,
                    sourceId: sourceImage?.id || null,
                    sourceFolderId: sourceFolderId ?? sourceImage?.folderId ?? sourceImage?.id ?? null,
                    annotations: resolvedReferences.length > 0
                        ? JSON.stringify(resolvedReferences.map((r: any) => ({
                            id: crypto.randomUUID(),
                            type: 'reference_image',
                            referenceImage: r.src,
                            text: r.instruction || ''
                          })))
                        : '[]',
                    apiRequestPayload,
                    generationStartTime,
                    isPro,
                    cost,
                    activeTemplateId: activeTemplateId || null,
                    variableValues: variables || null,
                    refundCredits: profile.credits
                };

                const kieResolution = qualityMode === 'nb2-4k' ? '4K' : qualityMode === 'nb2-2k' ? '2K' : '1K';

                if (PRIMARY_PROVIDER === 'kie' && kieSupported) {
                    // ════════════════════════════════════════════════════════════════
                    // KIE PIPELINE  (Google as fallback if Kie rejects or fails)
                    // ════════════════════════════════════════════════════════════════
                    webhookData.finalModelName = 'nano-banana-2';
                    updateStage('kie_primary');
                    await supabaseAdmin
                        .from('generation_jobs')
                        .update({ webhook_data: webhookData, request_payload: { ...apiRequestPayload, current_stage: 'kie_primary', provider: 'kie_primary' } })
                        .eq('id', newId);

                    // Build kieImageUrls: source → refs → annotation (all need HTTP URLs)
                    const kieImageUrls: string[] = [];
                    if (finalSourceBase64) {
                        const url = await uploadTempForKie(supabaseAdmin, finalSourceBase64, newId, 0);
                        if (url) kieImageUrls.push(url);
                    }
                    for (let i = 0; i < Math.min(resolvedReferences.length, 4); i++) {
                        const ref = resolvedReferences[i];
                        if (ref.src?.startsWith('http')) {
                            kieImageUrls.push(ref.src);
                        } else if (ref.src?.startsWith('data:')) {
                            const b64 = extractBase64FromDataUrl(ref.src);
                            if (b64) { const u = await uploadTempForKie(supabaseAdmin, b64, newId, i + 1); if (u) kieImageUrls.push(u); }
                        }
                    }
                    if (annotationBase64) {
                        const annUrl = await uploadTempForKie(supabaseAdmin, annotationBase64, newId, kieImageUrls.length);
                        if (annUrl) kieImageUrls.push(annUrl);
                    }

                    try {
                        logInfo('Kie Primary', `Model: nano-banana-2, Res: ${kieResolution}, AR: ${bestRatio}, Images: ${kieImageUrls.length}, hasAnnotation: ${!!annotationBase64}`);
                        const kieTaskId = await createKieTask(kieApiKey, 'nano-banana-2', { prompt, variables, annotationImage: annotationBase64 }, kieImageUrls, bestRatio, kieResolution);
                        await supabaseAdmin.from('generation_jobs').update({ request_payload: { ...apiRequestPayload, kie_task_id: kieTaskId, provider: 'kie_primary' } }).eq('id', newId);
                        const { imageUrl: kieImageUrl } = await pollKieTask(kieApiKey, kieTaskId);
                        const kieBase64 = await urlToBase64(kieImageUrl);
                        Object.assign(apiRequestPayload, { provider: 'kie_primary', kieTaskId });
                        updateStage('save_result');
                        await saveGeminiResult(supabaseAdmin, newId, { base64: kieBase64, mimeType: 'image/jpeg' }, webhookData);
                        logInfo('Kie Primary Saved', `Job ${newId} completed via Kie.ai (primary)`);
                    } catch (kieErr: any) {
                        // ── Google fallback (symmetric to Google→Kie fallback) ────────
                        const geminiApiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_STUDIO_API_KEY');
                        if (!geminiApiKey) throw kieErr; // no fallback available
                        logInfo('Google Fallback', `Kie failed (${kieErr.message}) — falling back to Google`);
                        updateStage('google_fallback');
                        webhookData.finalModelName = finalModelName;

                        const geminiImageSize = qualityMode === 'nb2-4k' ? '4K' : qualityMode === 'nb2-2k' ? '2K' : '1K';
                        const { parts, hasMask, hasRefs, allRefs } = await prepareParts({ ...payload, references: resolvedReferences }, finalSourceBase64);
                        const needsExplicitRatio = !finalSourceBase64 || payloadReferences?.length > 0;
                        const generationConfig: any = { imageConfig: { ...(needsExplicitRatio ? { aspectRatio: bestRatio } : {}), imageSize: geminiImageSize } };
                        // Fallback path: Kie already consumed some budget, give Google up to 90s
                        const GEMINI_TIMEOUT_MS = 90_000;
                        const geminiResponse = await Promise.race([
                            geminiGenerateImage(geminiApiKey, finalModelName, parts, generationConfig, !!finalSourceBase64, hasMask, hasRefs, () => updateStage('gemini_retry_503')),
                            new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Gemini timeout after ${GEMINI_TIMEOUT_MS / 1000}s`)), GEMINI_TIMEOUT_MS))
                        ]);
                        const generatedImage = extractGeneratedImage(geminiResponse);
                        if (!generatedImage) throw new Error('Google fallback: no image in response');
                        Object.assign(apiRequestPayload, { provider: 'google_fallback', referenceImagesCount: allRefs.length });
                        webhookData.apiRequestPayload = apiRequestPayload;
                        updateStage('save_result');
                        await saveGeminiResult(supabaseAdmin, newId, generatedImage, webhookData, geminiResponse?.usageMetadata);
                        logInfo('Google Fallback Saved', `Job ${newId} completed via Google (Kie fallback)`);
                    }

                } else { try {
                // ════════════════════════════════════════════════════════════════
                // GOOGLE PIPELINE
                // ════════════════════════════════════════════════════════════════

                const geminiApiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_STUDIO_API_KEY');
                if (!geminiApiKey) throw new Error('Google API key missing');

                const geminiImageSize = qualityMode === 'nb2-4k' ? '4K' : qualityMode === 'nb2-2k' ? '2K' : '1K';

                // Prepare parts array for Gemini (uses resolvedReferences from shared prep)
                const { parts, hasMask, hasRefs, allRefs } = await prepareParts(
                    { ...payload, references: resolvedReferences },
                    finalSourceBase64
                );
                logInfo('Parts Prepared', `Total: ${parts.length} (source: ${!!finalSourceBase64}, mask: ${hasMask}, refs: ${allRefs.length})`);

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
                webhookData.apiRequestPayload = apiRequestPayload;

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

                // Timeout budget: Supabase waitUntil is ~150s total.
                // Hang detection (no first stream chunk) is handled inside generateImage
                // via FIRST_CHUNK_TIMEOUT_MS=20s — so a stuck request aborts fast for Kie.
                // Outer ceiling is tighter when Kie is available: legitimate Google generations
                // complete in 15-40s, so 60s catches mid-stream hangs while leaving Kie
                // ~80s of the waitUntil budget to actually run + save.
                const GEMINI_TIMEOUT_MS = kieSupported ? 60_000 : 130_000;
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
                    // MALFORMED_FUNCTION_CALL is transient Gemini flakiness — worth one retry.
                    // Timeout errors are NOT retried: we need to preserve budget for Kie fallback.
                    const isMalformed = !firstErr?.message?.includes('timeout') &&
                        geminiResponse?.candidates?.[0]?.finishReason === 'MALFORMED_FUNCTION_CALL';
                    if (isMalformed) {
                        logInfo('Gemini Retry', 'MALFORMED_FUNCTION_CALL on first attempt — retrying once...');
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
                    provider: 'google_primary',
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
                    // Streaming telemetry (time-to-first-chunk = "did Google actually start?")
                    firstChunkLatencyMs: geminiResponse?.streamStats?.firstChunkLatencyMs ?? null,
                    totalStreamMs: geminiResponse?.streamStats?.totalStreamMs ?? null,
                    chunkCount: geminiResponse?.streamStats?.chunkCount ?? null,
                    thoughtChunkCount: geminiResponse?.streamStats?.thoughtChunkCount ?? null,
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

                } catch (googleErr: any) {
                    // ── Kie.ai fallback ───────────────────────────────────────────────
                    if (kieSupported && isKieRetryable(googleErr)) {
                        const googleFailureMs = Date.now() - providerStartTime;
                        const googleFailureReason =
                            googleErr?.name === 'GeminiNoStreamError' ? 'stream_hang' :
                            googleErr?.message?.includes('timeout') ? 'timeout' :
                            googleErr?.message?.includes('503') ? 'server_busy' :
                            googleErr?.message?.includes('500') ? 'server_error' :
                            googleErr?.message?.includes('MALFORMED') ? 'malformed_response' :
                            googleErr?.message?.includes('did not contain an image') ? 'empty_response' :
                            'other';
                        logInfo('Kie Fallback', `Google ${googleFailureReason} after ${googleFailureMs}ms (${googleErr.message}) — falling back to Kie.ai`);
                        // Persist why Google failed so we can see patterns in the admin panel.
                        Object.assign(apiRequestPayload, {
                            googleFailureReason,
                            googleFailureMs,
                            googleFailureMessage: String(googleErr?.message || '').slice(0, 300),
                        });
                        // Checkpoint: write the Google-failure state to DB NOW. If Supabase
                        // kills the task mid-Kie, we at least have a real record instead of
                        // relying on pg_cron's "Server timeout - credits refunded".
                        try {
                            await supabaseAdmin
                                .from('generation_jobs')
                                .update({ request_payload: { ...apiRequestPayload } })
                                .eq('id', newId);
                        } catch { /* best-effort */ }
                        updateStage('kie_fallback');

                        // Build image URL list for Kie (needs HTTP URLs, not base64)
                        const kieImageUrls: string[] = [];

                        // Source image — prefer original HTTP URL, else upload to temp storage
                        const sourceHttpUrl = (payloadOriginalImage?.startsWith('http'))
                            ? payloadOriginalImage
                            : (sourceImage?.src?.startsWith('http') ? sourceImage.src : null);

                        if (sourceHttpUrl) {
                            kieImageUrls.push(sourceHttpUrl);
                        } else if (finalSourceBase64) {
                            const tempUrl = await uploadTempForKie(supabaseAdmin, finalSourceBase64, newId, 0);
                            if (tempUrl) kieImageUrls.push(tempUrl);
                        }

                        // Annotation mask — upload to temp storage
                        if (payloadAnnotationImage) {
                            const annBase64 = payloadAnnotationImage.startsWith('data:')
                                ? payloadAnnotationImage.split(',')[1]
                                : payloadAnnotationImage;
                            const annUrl = await uploadTempForKie(supabaseAdmin, annBase64, newId, kieImageUrls.length);
                            if (annUrl) kieImageUrls.push(annUrl);
                        }

                        // References (HTTP URLs only)
                        if (resolvedReferences?.length) {
                            for (const ref of resolvedReferences) {
                                if (ref.src?.startsWith('http') && kieImageUrls.length < 8) {
                                    kieImageUrls.push(ref.src);
                                }
                            }
                        }

                        const kieResolution = qualityMode === 'nb2-4k' ? '4K'
                            : qualityMode === 'nb2-2k' ? '2K' : '1K';
                        const kieModelName = 'nano-banana-2';

                        logInfo('Kie API Call', `Model: ${kieModelName}, Res: ${kieResolution}, AR: ${bestRatio}, Images: ${kieImageUrls.length}`);

                        const kieTaskId = await createKieTask(
                            kieApiKey,
                            kieModelName,
                            { prompt, variables, annotationImage: payloadAnnotationImage },
                            kieImageUrls,
                            bestRatio,
                            kieResolution,
                        );

                        await supabaseAdmin
                            .from('generation_jobs')
                            .update({ request_payload: { ...apiRequestPayload, kie_task_id: kieTaskId, provider: 'kie_fallback' } })
                            .eq('id', newId);

                        const { imageUrl: kieImageUrl } = await pollKieTask(kieApiKey, kieTaskId);

                        // Download Kie result and save via existing save infrastructure
                        const kieBase64 = await urlToBase64(kieImageUrl);
                        Object.assign(apiRequestPayload, { provider: 'kie_fallback', kieTaskId });

                        updateStage('save_result');
                        await saveGeminiResult(
                            supabaseAdmin,
                            newId,
                            { base64: kieBase64, mimeType: 'image/jpeg' },
                            webhookData,
                        );

                        logInfo('Kie Fallback Saved', `Job ${newId} completed via Kie.ai`);

                    } else {
                        throw googleErr;
                    }
                }
                } // ── end else (Google + Kie fallback block) ──────────────────────────

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
                        // Always record duration — fallback to task start if generation hadn't begun yet.
                        const failDurationMs = Date.now() - taskStartMs;
                        await supabaseAdmin
                            .from('generation_jobs')
                            .update({
                                status: 'failed',
                                error: `[${bgStage}] ${errorMsg}`,
                                request_payload: failPayload,
                                duration_ms: failDurationMs,
                            })
                            .eq('id', newId);
                    } catch (e) {
                        logError('Job Update Failed (BG)', e);
                    }
                }
            }
        })());

        // Respond immediately — client will poll generation_jobs for completion
        // Include parent_id so the client can set up parentId on the placeholder image
        // without waiting for the DB record to be written.
        const responseParentId = payload?.sourceImage?.id || null;
        return new Response(JSON.stringify({
            success: true,
            jobId: newId,
            status: 'processing',
            parent_id: responseParentId
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
