// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface WebhookData {
    requestType: 'create' | 'edit';
    qualityMode: string;
    finalModelName: string;
    prompt: string;
    targetTitle?: string;
    userId: string;
    userEmail: string;
    parentId?: string | null;
    sourceWidth?: number;
    sourceHeight?: number;
    sourceRealWidth?: number;
    sourceRealHeight?: number;
    sourceBaseName?: string;
    sourceVersion?: number;
    sourceId?: string | null;
    annotations: string;
    apiRequestPayload: any;
    generationStartTime: number;
    isPro: boolean;
    cost: number;
    refundCredits: number; // originalCredits to restore on failure
}

const sanitizeEmailForPath = (email?: string | null) => {
    if (!email) return null;
    return email.trim().toLowerCase().replace(/\//g, '_');
};

const buildUploadDateFolder = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = String(date.getFullYear());
    return `upload${dd}${mm}${yyyy}`;
};

/**
 * Atomically claim the save operation. Returns true if THIS caller should proceed.
 * Prevents duplicate saves when both background task and webhook fire.
 */
const claimSave = async (supabaseAdmin: any, jobId: string): Promise<boolean> => {
    // UPDATE ... WHERE status = 'processing' ... returns affected rows only if it was still processing
    const { data } = await supabaseAdmin
        .from('generation_jobs')
        .update({ status: 'saving' })
        .eq('id', jobId)
        .eq('status', 'processing')
        .select('id');
    return Array.isArray(data) && data.length > 0;
};

/**
 * Saves a completed Kie.ai image result to Supabase storage + images table.
 * Idempotent: uses claimSave() to prevent duplicate processing.
 */
export const saveKieResult = async (
    supabaseAdmin: any,
    jobId: string,
    kieImageUrl: string,
    webhookData: WebhookData,
    kieApiKey: string,
    costTimeMs?: number
): Promise<void> => {
    const {
        requestType, qualityMode, finalModelName, prompt, targetTitle,
        userId, userEmail, parentId, sourceWidth, sourceHeight,
        sourceRealWidth, sourceRealHeight, sourceBaseName, sourceVersion, sourceId,
        annotations, apiRequestPayload, generationStartTime, isPro, cost, refundCredits
    } = webhookData;

    const claimed = await claimSave(supabaseAdmin, jobId);
    if (!claimed) {
        console.log(`[INFO] saveKieResult: job ${jobId} already claimed by another process, skipping`);
        return;
    }

    try {
        // Compute version / title
        let dbBaseName = "";
        let dbTitle = "";
        let currentVersion = 1;

        if (requestType === 'create') {
            const promptSnippet = prompt.substring(0, 15).trim();
            dbBaseName = targetTitle || promptSnippet || 'Image';
            dbTitle = dbBaseName;
            currentVersion = 1;
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
        const isOriginal = currentVersion <= 1;
        const variantLabel = isOriginal ? 'original' : `variante${currentVersion}`;
        const filename = `${variantLabel}_${jobId.substring(0, 8)}.jpg`;
        const filePath = `${rootFolder}/user-content/${uploadDateFolder}/${filename}`;

        // Detect content type from Kie CDN headers BEFORE consuming body (no buffer needed)
        console.log(`[INFO] saveKieResult: streaming from Kie CDN: ${kieImageUrl.substring(0, 60)}...`);
        const imgDownload = await fetch(kieImageUrl);
        if (!imgDownload.ok) throw new Error(`Kie CDN download failed: ${imgDownload.status}`);

        // Always store as JPEG — we request output_format:'jpg' from Kie.ai so the result
        // should already be JPEG. Ignoring CDN content-type/URL suffix avoids storing
        // giant lossless PNGs when the CDN header is wrong.
        const contentType = 'image/jpeg';
        const filePathFinal = filePath; // already ends in .jpg

        console.log(`[INFO] saveKieResult: streaming as JPEG → ${filePathFinal}`);

        // Stream directly to Supabase storage — no intermediate buffer, handles large 4K PNGs efficiently
        const { error: uploadError } = await supabaseAdmin.storage
            .from('user-content')
            .upload(filePathFinal, imgDownload.body!, { contentType, upsert: true });

        if (uploadError) throw uploadError;

        // Create signed URL for immediate access
        const { data: signedUrlData } = await supabaseAdmin.storage
            .from('user-content')
            .createSignedUrl(filePathFinal, 3600);

        // Insert image record
        const newImage: any = {
            id: jobId,
            user_id: userId,
            job_id: jobId,
            storage_path: filePathFinal,
            width: Math.round(sourceWidth || 512),
            height: Math.round(sourceHeight || 512),
            real_width: Math.round(sourceRealWidth || sourceWidth || 1024),
            real_height: Math.round(sourceRealHeight || sourceHeight || 1024),
            model_version: finalModelName,
            title: dbTitle,
            base_name: dbBaseName,
            version: currentVersion,
            prompt: prompt,
            parent_id: (requestType === 'edit' || parentId) ? (sourceId || null) : null,
            annotations: annotations || '[]',
            generation_params: { quality: qualityMode }
        };

        const { error: dbError } = await supabaseAdmin.from('images').insert(newImage);
        if (dbError && dbError.code !== '23505') throw dbError; // ignore duplicate key

        // Mark job completed
        const wallClockMs = Date.now() - generationStartTime;
        const durationMs = (costTimeMs && costTimeMs > 5000) ? costTimeMs : wallClockMs;

        await supabaseAdmin
            .from('generation_jobs')
            .update({
                status: 'completed',
                model: finalModelName,
                api_cost: 0,
                tokens_prompt: 0,
                tokens_completion: 0,
                tokens_total: 0,
                duration_ms: durationMs,
                quality_mode: qualityMode,
                request_payload: apiRequestPayload
            })
            .eq('id', jobId);

        console.log(`[INFO] saveKieResult: SUCCESS job ${jobId}, duration ${durationMs}ms`);

        // Log remaining Kie.ai credits (non-critical)
        try {
            const r = await fetch('https://api.kie.ai/api/v1/chat/credit', {
                headers: { 'Authorization': `Bearer ${kieApiKey}` }
            });
            if (r.ok) {
                const j = await r.json();
                console.log(`[INFO] Kie.ai remaining credits: ${j?.data ?? 'unknown'}`);
            }
        } catch { /* non-critical */ }

    } catch (err: any) {
        console.error(`[ERROR] saveKieResult: job ${jobId}:`, err.message || err);

        // Refund credits on failure
        if (!isPro && cost > 0) {
            try {
                await supabaseAdmin
                    .from('profiles')
                    .update({ credits: refundCredits })
                    .eq('id', userId);
                console.log(`[INFO] saveKieResult: refunded credits for user ${userId}`);
            } catch (e) {
                console.error('[ERROR] Credit refund failed:', e);
            }
        }

        // Mark job failed
        await supabaseAdmin
            .from('generation_jobs')
            .update({ status: 'failed', error: err.message || 'Unknown error in saveKieResult' })
            .eq('id', jobId);
    }
};
