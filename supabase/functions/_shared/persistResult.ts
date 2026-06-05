// @ts-nocheck
// -----------------------------------------------------------------------------
// persistResult — shared "store a finished fal image" logic.
// -----------------------------------------------------------------------------
// Used by the async webhook (fal-webhook). Mirrors the post-generation block of
// generate-image-fal's synchronous path (version calc → storage upload →
// images insert → job finalize) so both routes produce identical DB rows.
//
// The webhook only receives fal's output, so everything app-specific (user,
// folder, version base, dimensions, prompt, quality, template/variables) must
// be read from the `async` context the submit step persisted onto the
// generation_jobs row.
// -----------------------------------------------------------------------------

export interface AsyncContext {
    userId: string;
    userEmail?: string | null;
    requestType?: string;            // 'create' | 'edit'
    prompt: string;                  // already-resolved prompt (with variable labels)
    qualityMode: string;             // nb2-0.5k | nb2-1k | nb2-2k | nb2-4k
    provider: 'fal-nb2' | 'openai';
    cost: number;
    submitAt: number;                // Date.now() at submit, for duration_ms
    sourceImage?: {
        id?: string;
        baseName?: string;
        title?: string;
        version?: number;
        width?: number;
        height?: number;
        realWidth?: number;
        realHeight?: number;
    } | null;
    sourceFolderId?: string | null;
    targetTitle?: string | null;
    activeTemplateId?: string | null;
    variables?: Record<string, string[]> | null;
    falRequestId?: string | null;
}

const sanitizeEmailForPath = (email?: string | null) =>
    !email ? null : email.trim().toLowerCase().replace(/\//g, '_');

const buildUploadDateFolder = (d: Date) =>
    `upload${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;

/** Refund a previously-deducted cost back onto the user's balance (best-effort). */
export async function refundCredits(supabaseAdmin: any, userId: string, cost: number) {
    if (!cost || cost <= 0) return;
    try {
        const { data: prof } = await supabaseAdmin
            .from('profiles').select('credits').eq('id', userId).maybeSingle();
        if (prof) {
            const restored = Math.round(((prof.credits || 0) + cost) * 100) / 100;
            await supabaseAdmin.from('profiles').update({ credits: restored }).eq('id', userId);
        }
    } catch (e) {
        console.error('[persistResult] refund failed:', (e as any)?.message || e);
    }
}

/**
 * Download the fal image, store it permanently, insert the images row, and
 * finalize the generation_jobs row. Idempotent: if an images row already exists
 * for this job id, it returns early without re-doing the work.
 */
export async function persistFalResult(
    supabaseAdmin: any,
    jobId: string,
    ctx: AsyncContext,
    fal: { imageUrl: string; width?: number; height?: number; contentType?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
    // ── Idempotency guard ──────────────────────────────────────────────────
    const { data: existing } = await supabaseAdmin
        .from('images').select('id').eq('id', jobId).maybeSingle();
    if (existing) return { ok: true };

    // ── Download fal image ─────────────────────────────────────────────────
    const imgResp = await fetch(fal.imageUrl, { signal: AbortSignal.timeout(60_000) });
    if (!imgResp.ok) return { ok: false, error: `fetch fal image: HTTP ${imgResp.status}` };
    const imgBuf = new Uint8Array(await imgResp.arrayBuffer());
    const contentType = imgResp.headers.get('content-type') || fal.contentType || 'image/jpeg';

    const src = ctx.sourceImage || {};

    // ── Title / version (mirrors generate-image-fal sync path) ──────────────
    let dbBaseName = '';
    let dbTitle = '';
    let currentVersion = 1;
    if (ctx.requestType === 'create' || !ctx.sourceImage) {
        const snippet = (ctx.prompt || '').substring(0, 15).trim();
        dbBaseName = ctx.targetTitle || snippet || 'Image';
        dbTitle = dbBaseName;
    } else {
        dbBaseName = (src.baseName || src.title || 'Image').replace(/_v\d+$/, '');
        try {
            const { data: siblings } = await supabaseAdmin
                .from('images')
                .select('version, base_name, title')
                .eq('user_id', ctx.userId)
                .or(`base_name.eq.${dbBaseName},title.ilike.${dbBaseName}%`);
            if (Array.isArray(siblings) && siblings.length > 0) {
                const maxVersion = siblings.reduce((max: number, img: any) => {
                    const b = (img.base_name || img.title || '').replace(/_v\d+$/, '');
                    return b === dbBaseName ? Math.max(max, img.version || 1) : max;
                }, 0);
                currentVersion = maxVersion + 1;
            } else {
                currentVersion = (src.version || 0) + 1;
            }
        } catch {
            currentVersion = (src.version || 0) + 1;
        }
        dbTitle = ctx.targetTitle || `${dbBaseName}_v${currentVersion}`;
    }

    // ── Storage upload ───────────────────────────────────────────────────────
    const rootFolder = sanitizeEmailForPath(ctx.userEmail) || ctx.userId;
    const dateFolder = buildUploadDateFolder(new Date());
    const ext = contentType === 'image/png' ? 'png' : 'jpg';
    const fileRole = currentVersion <= 1 ? 'original' : `variante${currentVersion}`;
    const filename = `${fileRole}_${jobId.substring(0, 8)}.${ext}`;
    const storagePath = `${rootFolder}/user-content/${dateFolder}/${filename}`;
    const { error: upErr } = await supabaseAdmin.storage
        .from('user-content')
        .upload(storagePath, imgBuf, { contentType, upsert: true });
    if (upErr) return { ok: false, error: `storage upload: ${upErr.message}` };

    // ── Insert images row ──────────────────────────────────────────────────
    const displayW = Math.round(src.width || fal.width || 1024);
    const displayH = Math.round(src.height || fal.height || 1024);
    const realW = Math.round(src.realWidth || fal.width || displayW);
    const realH = Math.round(src.realHeight || fal.height || displayH);
    const parentId = (ctx.requestType === 'edit' || src.id) ? (src.id || null) : null;

    const newImage = {
        id: jobId,
        user_id: ctx.userId,
        job_id: jobId,
        storage_path: storagePath,
        width: displayW,
        height: displayH,
        real_width: realW,
        real_height: realH,
        model_version: ctx.provider === 'openai' ? 'gpt-image-2' : 'nano-banana-2',
        title: dbTitle,
        base_name: dbBaseName,
        version: currentVersion,
        prompt: ctx.prompt,
        parent_id: parentId,
        folder_id: ctx.sourceFolderId ?? src.id ?? jobId,
        annotations: '[]',
        generation_params: {
            quality: ctx.qualityMode,
            ...(ctx.activeTemplateId ? { activeTemplateId: ctx.activeTemplateId } : {}),
            ...(ctx.variables ? { variableValues: ctx.variables } : {}),
            provider: ctx.provider,
        },
    };
    const { error: dbErr } = await supabaseAdmin.from('images').insert(newImage);
    // 23505 = duplicate key → another delivery already inserted; treat as success.
    if (dbErr && dbErr.code !== '23505') {
        return { ok: false, error: `images insert: ${dbErr.message}` };
    }

    // ── Finalize job row ───────────────────────────────────────────────────
    const durationMs = Date.now() - (ctx.submitAt || Date.now());
    const usedVariables = !!(ctx.variables && Object.keys(ctx.variables).length > 0);
    await supabaseAdmin.from('generation_jobs').update({
        status: 'completed',
        model: ctx.provider === 'openai' ? 'gpt-image-2' : 'nano-banana-2',
        duration_ms: durationMs,
        quality_mode: ctx.qualityMode,
        variables_used: usedVariables,
        prompt_preview: (ctx.prompt || '').slice(0, 2000),
    }).eq('id', jobId);

    return { ok: true };
}
