// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeBase64 } from "https://deno.land/std@0.207.0/encoding/base64.ts";
import { findClosestValidRatio, getClosestAspectRatioFromDims } from './utils/aspectRatio.ts';
import { prepareSourceImage, extractBase64FromDataUrl, urlToBase64 } from './utils/imageProcessing.ts';
import { createKieTask } from './services/kie.ts';
import { saveKieResult } from '../_shared/saveKieResult.ts';
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
    // Stored after deduction so error handlers can refund on failure
    let refundData: { userId: string; originalCredits: number } | null = null;

    try {
        // Initialize Supabase clients
        supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Authenticate user — extract sub from JWT payload without signature verification.
        // verify_jwt=false is set in config.toml so expired tokens still reach us; we look
        // up the user via service-role to confirm they exist (avoids getUser() network call
        // failing on expired tokens in supabase-js v2.99+ which triggers sign-out).
        const authHeader = req.headers.get('Authorization') ?? '';
        const jwtToken = authHeader.replace(/^Bearer\s+/i, '');
        let userId: string | null = null;
        try {
            const parts = jwtToken.split('.');
            if (parts.length === 3) {
                const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
                userId = JSON.parse(payloadJson)?.sub ?? null;
            }
        } catch { /* malformed JWT */ }
        if (!userId) {
            throw new Error('User not found');
        }
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

        // (1) Resolve all reference paths to signed URLs for both Gemini and Kie.ai
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

        // Store API request for debugging
        const apiRequestPayload = {
            model: finalModelName,
            userPrompt: prompt,
            hasSourceImage: !!finalSourceBase64,
            hasMask,
            hasReferenceImages: hasRefs,
            referenceImagesCount: allRefs.length,
            references: allRefs,
            generationConfig,
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
            parentId: sourceImage?.id || null,
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

        // Prepare image URLs for Kie.ai (image_input requires URLs, not base64)
        const kieImageUrls: string[] = [];

        // Source image — use original URL if available, else upload base64 to temp storage
        const sourceHttpUrl = (payloadOriginalImage && payloadOriginalImage.startsWith('http'))
            ? payloadOriginalImage
            : (sourceImage?.src && sourceImage.src.startsWith('http')) ? sourceImage.src : null;

        // Source image: Always prefer a "clean" re-uploaded JPEG in temp storage.
        // Direct signed URLs often contain query parameters or have extensions (like .webp)
        // that Kie.ai may reject with "File type not supported".
        if (finalSourceBase64) {
            const tempUrl = await uploadTempForKie(supabaseAdmin, finalSourceBase64, newId, 0);
            if (tempUrl) kieImageUrls.push(tempUrl);
        } else if (sourceHttpUrl) {
            kieImageUrls.push(sourceHttpUrl);
        }

        // Annotation image (canvas base64) — upload to temp storage
        if (payloadAnnotationImage) {
            const annBase64 = payloadAnnotationImage.startsWith('data:')
                ? payloadAnnotationImage.split(',')[1]
                : payloadAnnotationImage;
            const annUrl = await uploadTempForKie(supabaseAdmin, annBase64, newId, kieImageUrls.length);
            if (annUrl) kieImageUrls.push(annUrl);
        }

        // References: Also re-upload to temp storage if they are not already "clean" URLs
        for (const ref of resolvedReferences) {
            if (kieImageUrls.length >= 8) break;

            if (ref.src.startsWith('data:')) {
                const b64 = extractBase64FromDataUrl(ref.src);
                const tempUrl = await uploadTempForKie(supabaseAdmin, b64, newId, kieImageUrls.length);
                if (tempUrl) kieImageUrls.push(tempUrl);
            } else if (ref.src.startsWith('http') && (ref.src.includes('?') || !ref.src.match(/\.(jpg|jpeg|png)$/i))) {
                // If it's a signed URL or has no clean extension, re-upload it as JPEG
                try {
                    const b64 = await urlToBase64(ref.src);
                    const tempUrl = await uploadTempForKie(supabaseAdmin, b64, newId, kieImageUrls.length);
                    if (tempUrl) kieImageUrls.push(tempUrl);
                } catch {
                    kieImageUrls.push(ref.src); // Fallback to original
                }
            } else {
                kieImageUrls.push(ref.src);
            }
        }

        const kieResolution = (qualityMode === 'pro-4k' || qualityMode === 'nb2-4k') ? '4K'
            : (qualityMode === 'pro-2k' || qualityMode === 'nb2-2k') ? '2K' : '1K';

        // ═══════════════════════════════════════════════════════════════════
        // Phase 1: Create Kie.ai task (synchronous — fast, <5s)
        // ═══════════════════════════════════════════════════════════════════
        logInfo('Kie API Call', `Model: ${finalModelName}, Quality: ${qualityMode}, AR: ${bestRatio}, Images: ${kieImageUrls.length}`);

        const kieApiKey = (Deno.env.get('KIE_API_KEY') || Deno.env.get('kie.ai'))!;
        const callBackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/kie-webhook`;
        const kieTaskId = await createKieTask(
            kieApiKey,
            finalModelName,
            payload,
            kieImageUrls,
            bestRatio,
            kieResolution,
            callBackUrl
        );

        logInfo('Kie Task Created', `taskId: ${kieTaskId}, callBackUrl: ${callBackUrl}`);

        await supabaseAdmin
            .from('generation_jobs')
            .update({ kie_task_id: kieTaskId, webhook_data: webhookData })
            .eq('id', newId);

        // ═══════════════════════════════════════════════════════════════════
        // Phase 2a: Webhook is primary — Kie.ai will POST to /kie-webhook when done.
        // Phase 2b: Background fallback — polls for up to 90s for fast jobs OR
        //           if webhook fails to fire (network issue, cold start, etc.)
        // ═══════════════════════════════════════════════════════════════════
        const backgroundFallback = async () => {
            try {
                // Wait 10s before first poll — give webhook a chance to fire for fast jobs
                await new Promise(r => setTimeout(r, 10000));

                const kieApiKeyFb = (Deno.env.get('KIE_API_KEY') || Deno.env.get('kie.ai'))!;
                // Poll Kie for up to 80s (16 attempts × 5s) — safe within Supabase's background task limit
                const MAX_FB_POLLS = 16;
                const POLL_MS = 5000;

                for (let i = 0; i < MAX_FB_POLLS; i++) {
                    // Check if already completed by webhook
                    const { data: jobCheck } = await supabaseAdmin
                        .from('generation_jobs')
                        .select('status')
                        .eq('id', newId)
                        .single();
                    if (jobCheck?.status === 'completed' || jobCheck?.status === 'failed') {
                        console.log(`[INFO] Background fallback: job ${newId} already ${jobCheck.status} (webhook handled it)`);
                        return;
                    }

                    const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${kieTaskId}`, {
                        headers: { 'Authorization': `Bearer ${kieApiKeyFb}` }
                    });
                    if (!pollRes.ok) { await new Promise(r => setTimeout(r, POLL_MS)); continue; }

                    const pollData = await pollRes.json();
                    const taskData = pollData?.data;
                    const state = taskData?.state || taskData?.status;
                    console.log(`[INFO] Background fallback poll ${i+1}/${MAX_FB_POLLS} | state: ${state}`);

                    if (state === 'success' || state === 'completed') {
                        // Extract image URL using same logic as kie.ts
                        let imageUrl: string | null = null;
                        if (taskData?.resultJson) { try { const p = JSON.parse(taskData.resultJson); imageUrl = p?.resultUrls?.[0] || p?.images?.[0] || null; } catch {} }
                        if (!imageUrl && Array.isArray(taskData?.resultUrls)) imageUrl = taskData.resultUrls[0] || null;
                        if (!imageUrl) imageUrl = taskData?.resultUrl || taskData?.imageUrl || taskData?.url || null;
                        if (imageUrl) {
                            await saveKieResult(supabaseAdmin, newId, imageUrl, webhookData, kieApiKeyFb, taskData?.costTime);
                        }
                        return;
                    }
                    if (state === 'fail' || state === 'failed' || state === 'error') {
                        // Refund and fail
                        if (!isPro && cost > 0) {
                            await supabaseAdmin.from('profiles').update({ credits: profile.credits }).eq('id', user.id);
                        }
                        await supabaseAdmin.from('generation_jobs').update({ status: 'failed', error: taskData?.failMsg || 'Kie task failed' }).eq('id', newId);
                        return;
                    }
                    await new Promise(r => setTimeout(r, POLL_MS));
                }
                // After 90s: if still processing, leave it — webhook may still fire (Kie jobs can take 2-5 min)
                console.log(`[INFO] Background fallback: 90s elapsed for job ${newId}, leaving for webhook`);
            } catch (err: any) {
                console.error(`[ERROR] Background fallback: ${err.message}`);
            }
        };

        EdgeRuntime.waitUntil(backgroundFallback());

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
        // This only catches Phase 1 errors (auth, credits, createTask)
        const errorMsg = error?.message || (typeof error === 'string' ? error : "Unknown error occurred");
        logError('Edge Function', errorMsg, { jobId: newId });

        // Refund credits on Phase 1 failure
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
