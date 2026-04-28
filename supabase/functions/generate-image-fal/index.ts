// @ts-nocheck
// -----------------------------------------------------------------------------
// generate-image-fal
// -----------------------------------------------------------------------------
// Clean, single-provider (fal.ai) edge function. Sync request/response lifecycle
// so EdgeRuntime.waitUntil is NOT used — no isolate-eviction risk, no pg_cron
// reaper dependency.
//
// Request shape is a superset-compatible subset of the old generate-image so
// the same client payload can be reused behind a feature flag.
// -----------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeBase64, encodeBase64 } from 'https://deno.land/std@0.207.0/encoding/base64.ts';
import { findClosestValidRatio, getClosestAspectRatioFromDims } from '../generate-image/utils/aspectRatio.ts';
import { extractBase64FromDataUrl } from '../generate-image/utils/imageProcessing.ts';
import { COSTS } from '../generate-image/types/index.ts';
import { verifyJwtSignature } from '../_shared/auth.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FAL_BASE = 'https://fal.run';
const FAL_ENDPOINT_CREATE = 'fal-ai/nano-banana-2';
const FAL_ENDPOINT_EDIT = 'fal-ai/nano-banana-2/edit';

// A/B provider parallel rollout. Default = NB2 (production). Staging passes
// `provider: 'openai'` to route to OpenAI's gpt-image-2 via fal.
const OPENAI_ENDPOINT_CREATE = 'fal-ai/gpt-image-2';
const OPENAI_ENDPOINT_EDIT = 'openai/gpt-image-2/edit';

type Provider = 'fal-nb2' | 'openai';

/**
 * Map our internal `nb2-*` quality mode to GPT-Image-2's `quality` parameter.
 *
 * We keep `image_size: 'auto'` for every tier on purpose — fal's docs explicitly
 * recommend `auto` for the /edit endpoint because gpt-image-2 then derives the
 * output dimensions from the input image. Custom {width, height} at high quality
 * + 2K/4K was tripping our 120s sync-fetch ceiling, so during the staging A/B we
 * trade fixed resolution for stable latency. (Refine later once we know typical
 * per-tier latency.)
 */
const qualityModeToOpenAIInput = (
    q: string,
): { quality: 'low' | 'medium' | 'high'; image_size: 'auto' } => {
    if (q === 'nb2-4k' || q === 'nb2-2k') return { quality: 'high', image_size: 'auto' };
    if (q === 'nb2-1k') return { quality: 'medium', image_size: 'auto' };
    return { quality: 'low', image_size: 'auto' };
};

const logInfo = (ctx: string, msg: string, data?: any) => {
    console.log(`[INFO] ${ctx}: ${msg}`);
    if (data) console.log(`[INFO] ${ctx} data:`, JSON.stringify(data));
};
const logError = (ctx: string, err: any, meta?: any) => {
    console.error(`[ERROR] ${ctx}:`, err?.message || err);
    if (meta) console.error(`[ERROR] ${ctx} meta:`, JSON.stringify(meta));
    if (err?.stack) console.error(`[ERROR] ${ctx} stack:`, err.stack);
};

/**
 * Persist a silent-swallow diagnostic into `error_logs` so admins can see why a
 * request returned 200 but produced no DB row (duplicate key, 0-row UPDATE, …).
 * Best-effort — never throws, never blocks the main response path.
 */
const logSilentSwallow = async (
    supabaseAdmin: any,
    opts: { jobId: string | null; userId?: string | null; userEmail?: string | null; message: string; context?: any },
) => {
    try {
        await supabaseAdmin.from('error_logs').insert({
            user_id: opts.userId ?? null,
            user_email: opts.userEmail ?? null,
            message: opts.message.slice(0, 1000),
            context: opts.context ? JSON.stringify(opts.context).slice(0, 2000) : null,
            source: 'edge-silent-skip',
            url: opts.jobId,
        });
    } catch (e) {
        console.error('[ERROR] logSilentSwallow failed:', (e as any)?.message || e);
    }
};

const sanitizeEmailForPath = (email?: string | null) =>
    !email ? null : email.trim().toLowerCase().replace(/\//g, '_');

const buildUploadDateFolder = (d: Date) =>
    `upload${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;

const qualityToFalResolution = (q: string): '0.5K' | '1K' | '2K' | '4K' => {
    if (q === 'nb2-4k') return '4K';
    if (q === 'nb2-2k') return '2K';
    if (q === 'nb2-0.5k') return '0.5K';
    return '1K';
};

/** Upload a base64 image to a short-lived _temp_fal/ path and return a signed URL. */
const uploadTempToSignedUrl = async (
    supabaseAdmin: any,
    base64: string,
    jobId: string,
    idx: number,
): Promise<string | null> => {
    try {
        const binary = decodeBase64(base64);
        const path = `_temp_fal/${jobId}_${idx}.jpg`;
        const { error: upErr } = await supabaseAdmin.storage
            .from('user-content')
            .upload(path, binary, { contentType: 'image/jpeg', upsert: true });
        if (upErr) {
            logError('Temp upload', upErr, { path });
            return null;
        }
        const { data } = await supabaseAdmin.storage
            .from('user-content')
            .createSignedUrl(path, 3600);
        return data?.signedUrl || null;
    } catch (e) {
        logError('Temp upload exception', e);
        return null;
    }
};

/** Build the image_urls array fal expects (HTTPS only). */
const resolveImageUrls = async (
    supabaseAdmin: any,
    jobId: string,
    opts: {
        sourceStoragePath?: string;
        payloadOriginalImage?: string;
        legacySourceSrc?: string;
        annotationImage?: string;
        references?: any[];
    },
): Promise<string[]> => {
    const urls: string[] = [];
    let idx = 0;

    // 1) Source image
    if (opts.sourceStoragePath) {
        const { data } = await supabaseAdmin.storage
            .from('user-content')
            .createSignedUrl(opts.sourceStoragePath, 3600);
        if (data?.signedUrl) urls.push(data.signedUrl);
    } else if (opts.payloadOriginalImage?.startsWith('http')) {
        urls.push(opts.payloadOriginalImage);
    } else if (opts.payloadOriginalImage?.startsWith('data:')) {
        const b64 = extractBase64FromDataUrl(opts.payloadOriginalImage);
        const u = await uploadTempToSignedUrl(supabaseAdmin, b64, jobId, idx++);
        if (u) urls.push(u);
    } else if (opts.legacySourceSrc?.startsWith('http')) {
        urls.push(opts.legacySourceSrc);
    } else if (opts.legacySourceSrc?.startsWith('data:')) {
        const b64 = extractBase64FromDataUrl(opts.legacySourceSrc);
        const u = await uploadTempToSignedUrl(supabaseAdmin, b64, jobId, idx++);
        if (u) urls.push(u);
    }

    // 2) Annotation (mask overlay) — always comes as base64/data URL from client
    if (opts.annotationImage) {
        const b64 = opts.annotationImage.startsWith('data:')
            ? extractBase64FromDataUrl(opts.annotationImage)
            : opts.annotationImage;
        const u = await uploadTempToSignedUrl(supabaseAdmin, b64, jobId, idx++);
        if (u) urls.push(u);
    }

    // 3) References (max 8 total image_urls for fal)
    if (Array.isArray(opts.references)) {
        for (const ref of opts.references) {
            if (urls.length >= 8) break;
            if (!ref?.src) continue;
            if (ref.src.startsWith('http')) {
                urls.push(ref.src);
            } else if (ref.src.startsWith('data:')) {
                const b64 = extractBase64FromDataUrl(ref.src);
                const u = await uploadTempToSignedUrl(supabaseAdmin, b64, jobId, idx++);
                if (u) urls.push(u);
            } else {
                // storage path → signed URL
                const { data } = await supabaseAdmin.storage
                    .from('user-content')
                    .createSignedUrl(ref.src, 3600);
                if (data?.signedUrl) urls.push(data.signedUrl);
            }
        }
    }

    return urls;
};

/** Call fal.ai sync endpoint. Throws on non-200 or missing image in response. */
const callFal = async (
    apiKey: string,
    endpoint: string,
    input: Record<string, any>,
): Promise<{ imageUrl: string; width: number; height: number; contentType: string; requestId?: string }> => {
    const startedAt = Date.now();
    const res = await fetch(`${FAL_BASE}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        // Bumped to 200s for the staging A/B — gpt-image-2 high-quality edits can
        // run 90–180s. Supabase Pro plans permit up to 400s edge-function wall-clock,
        // so we still leave headroom for post-call download + storage upload (~5–10s).
        // If the function dies above this with a hard 504, raise this further.
        signal: AbortSignal.timeout(200_000),
    });

    const latencyMs = Date.now() - startedAt;

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`fal.ai ${endpoint} failed: HTTP ${res.status} — ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const first = data?.images?.[0];
    if (!first?.url) {
        throw new Error(`fal.ai ${endpoint} response missing image URL: ${JSON.stringify(data).slice(0, 300)}`);
    }

    logInfo('fal.ai', `${endpoint} ok in ${latencyMs}ms`);
    return {
        imageUrl: first.url,
        width: first.width ?? 0,
        height: first.height ?? 0,
        contentType: first.content_type || 'image/jpeg',
        requestId: data?.request_id,
    };
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const taskStart = Date.now();
    let newId: string | null = null;
    let supabaseAdmin: any = null;
    let refundData: { userId: string; originalCredits: number } | null = null;

    try {
        // ── Clients + Auth ─────────────────────────────────────────────────
        supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        const authHeader = req.headers.get('Authorization') ?? '';
        const jwt = authHeader.replace(/^Bearer\s+/i, '');
        const jwtPayload = await verifyJwtSignature(jwt);
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(jwtPayload.sub);
        const user = authUser?.user ?? null;
        if (!user) throw new Error('User not found');

        // ── Parse payload ──────────────────────────────────────────────────
        const payload = await req.json();
        newId = payload.newId;
        if (!newId) throw new Error('newId is required');

        const {
            type: requestType,
            prompt: rawPrompt,
            variables,
            originalImage: payloadOriginalImage,
            annotationImage: payloadAnnotationImage,
            references: payloadReferences,
            qualityMode,
            aspectRatio: explicitRatio,
            targetTitle,
            activeTemplateId,
            sourceImage,
            sourceFolderId,
            sourceStoragePath,
            provider: rawProvider,
        } = payload;
        const provider: Provider = rawProvider === 'openai' ? 'openai' : 'fal-nb2';
        const basePrompt = rawPrompt ?? '';

        // Append template variables to the prompt, using the template's human-readable
        // control labels ("Jahreszeit: Herbst") rather than the internal control IDs
        // ("c-season: Herbst") so fal.ai gets a natural-language instruction.
        let prompt = basePrompt;
        if (variables && typeof variables === 'object' && Object.keys(variables).length > 0) {
            // Build id → label map from the active template (best-effort; falls back to
            // the raw control id if the template isn't found).
            const idToLabel: Record<string, string> = {};
            if (activeTemplateId) {
                try {
                    const { data: tpl } = await supabaseAdmin
                        .from('global_presets')
                        .select('controls')
                        .eq('id', activeTemplateId)
                        .maybeSingle();
                    const controls = Array.isArray(tpl?.controls) ? tpl!.controls : [];
                    for (const c of controls) {
                        if (c?.id && typeof c.label === 'string' && c.label.trim()) {
                            idToLabel[c.id] = c.label.trim();
                        }
                    }
                } catch (e) {
                    logError('Template lookup', e, { activeTemplateId });
                }
            }

            const varString = Object.entries(variables)
                .filter(([, vals]) => Array.isArray(vals) && (vals as any[]).length > 0)
                .map(([key, vals]) => {
                    const label = idToLabel[key] || key;
                    return `${label}: ${(vals as string[]).join(', ')}`;
                })
                .join('; ');
            if (varString) {
                prompt = prompt.trim()
                    ? `${prompt.trim()}\n\n${varString}`
                    : varString;
            }
        }

        if (!prompt.trim() && !sourceImage?.src && !payloadOriginalImage && !payloadReferences?.length) {
            throw new Error('A prompt or image is required.');
        }

        // Image role preamble — fal receives image_urls in a fixed order:
        //   [0] source, [1] annotation (if present), [2..] references.
        // Without an explicit text hint the model can't tell source vs. annotation
        // vs. style-reference apart. Prepend role labels whenever extras are
        // attached (annotation or refs) so fal treats each image correctly. The
        // plain "single source + edit" case is left unchanged since fal-edit
        // already handles that natively.
        {
            const hasAnnotation = !!payloadAnnotationImage;
            const refCount = Array.isArray(payloadReferences) ? payloadReferences.length : 0;
            const hasSource = !!(sourceStoragePath || payloadOriginalImage || sourceImage?.src);

            if (hasSource && (hasAnnotation || refCount > 0)) {
                const parts: string[] = [];
                parts.push('Image 1 is the ORIGINAL photo to edit — preserve its layout, structure, and perspective.');
                let nextIdx = 2;
                if (hasAnnotation) {
                    parts.push(`Image ${nextIdx} is an annotation overlay of the first: red markers indicate exactly where changes should be made. Do not render the red marks in the final output.`);
                    nextIdx++;
                }
                if (refCount > 0) {
                    const firstRef = nextIdx;
                    const lastRef = nextIdx + refCount - 1;
                    const range = firstRef === lastRef ? `Image ${firstRef} is a` : `Images ${firstRef}–${lastRef} are`;
                    parts.push(`${range} REFERENCE IMAGE${refCount > 1 ? 'S' : ''} for style/content guidance only — do not use as base.`);
                }
                const preamble = parts.join(' ') + ' ';
                prompt = prompt.trim() ? `${preamble}${prompt.trim()}` : preamble.trim();
            }
        }

        // fal nano-banana-2/edit rejects empty prompts with HTTP 422 (string_too_short).
        // When the user triggers a generation with only an image (no base prompt, no
        // template variables), fall back to a generic edit instruction so fal accepts it.
        if (!prompt.trim()) {
            prompt = 'Subtly enhance this image while preserving its composition and content.';
        }
        if (!qualityMode?.startsWith('nb2-')) {
            throw new Error('Only NB2 quality modes are supported (nb2-0.5k | nb2-1k | nb2-2k | nb2-4k)');
        }

        logInfo('Start', `job=${newId} user=${user.id} quality=${qualityMode} type=${requestType} promptLen=${prompt.length}`);

        // ── Credits ────────────────────────────────────────────────────────
        const cost = COSTS[qualityMode] || 0;
        let { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('credits, role')
            .eq('id', user.id)
            .maybeSingle();
        if (!profile) {
            const { data: newProfile } = await supabaseAdmin
                .from('profiles')
                .insert({ id: user.id, email: user.email, full_name: 'User', credits: 3 })
                .select()
                .single();
            profile = newProfile;
        }
        const isPro = profile.role === 'pro' || profile.role === 'admin';
        const balance = Math.round((profile.credits || 0) * 100) / 100;
        if (!isPro && balance < cost) throw new Error('Insufficient credits');
        if (!isPro && cost > 0) {
            await supabaseAdmin.from('profiles').update({ credits: Math.round((balance - cost) * 100) / 100 }).eq('id', user.id);
            refundData = { userId: user.id, originalCredits: balance };
        }

        // ── Resolve aspect ratio ───────────────────────────────────────────
        let aspectRatio = '1:1';
        if (explicitRatio) {
            aspectRatio = findClosestValidRatio(explicitRatio);
        } else if (sourceImage && (sourceImage.realWidth || sourceImage.width)) {
            const w = sourceImage.realWidth || sourceImage.width || 1024;
            const h = sourceImage.realHeight || sourceImage.height || 1024;
            aspectRatio = getClosestAspectRatioFromDims(w, h);
        }
        const falResolution = qualityToFalResolution(qualityMode);

        // ── Resolve image_urls (source + annotation + references) ──────────
        const imageUrls = await resolveImageUrls(supabaseAdmin, newId, {
            sourceStoragePath,
            payloadOriginalImage,
            legacySourceSrc: sourceImage?.src,
            annotationImage: payloadAnnotationImage,
            references: payloadReferences,
        });

        const hasSource = imageUrls.length > 0;

        // Provider dispatch — same callFal() works for both since fal proxies OpenAI.
        let endpoint: string;
        let falInput: Record<string, any>;
        if (provider === 'openai') {
            endpoint = hasSource ? OPENAI_ENDPOINT_EDIT : OPENAI_ENDPOINT_CREATE;
            const oa = qualityModeToOpenAIInput(qualityMode);
            falInput = {
                prompt,
                quality: oa.quality,
                image_size: oa.image_size,
                output_format: 'jpeg',
                num_images: 1,
            };
            if (hasSource) falInput.image_urls = imageUrls;
        } else {
            endpoint = hasSource ? FAL_ENDPOINT_EDIT : FAL_ENDPOINT_CREATE;
            falInput = {
                prompt,
                resolution: falResolution,
                aspect_ratio: aspectRatio,
                output_format: 'jpeg',
                num_images: 1,
            };
            if (hasSource) falInput.image_urls = imageUrls;
        }

        logInfo('fal request', `provider=${provider} endpoint=${endpoint} res=${falResolution} ar=${aspectRatio} imgs=${imageUrls.length}`);

        // Persist pre-call diagnostics so failures are attributable.
        // `variables` + `activeTemplateId` are carried forward from the client payload
        // so the admin "Variablen" badge / template linkage keeps working after we
        // overwrite the row's request_payload on completion.
        const apiRequestPayload: any = {
            provider,
            endpoint,
            resolution: falResolution,
            aspectRatio,
            imageUrlCount: imageUrls.length,
            hasSource,
            hasAnnotation: !!payloadAnnotationImage,
            referenceCount: payloadReferences?.length ?? 0,
            current_stage: 'fal_call',
            fal_start: Date.now(),
            ...(variables && typeof variables === 'object' && Object.keys(variables).length > 0
                ? { variables }
                : {}),
            ...(activeTemplateId ? { activeTemplateId } : {}),
        };
        const preUpdateRes = await supabaseAdmin.from('generation_jobs')
            .update({ request_payload: apiRequestPayload })
            .eq('id', newId)
            .select('id');
        if (!preUpdateRes.error && Array.isArray(preUpdateRes.data) && preUpdateRes.data.length === 0) {
            // CRITICAL: client-side INSERT into generation_jobs never landed.
            // The job will not appear in the admin panel even though generation
            // may still succeed and images may still be inserted. Diagnose the
            // client-side INSERT (RLS? network? stale session?).
            await logSilentSwallow(supabaseAdmin, {
                jobId: newId,
                userId: user.id,
                userEmail: user.email,
                message: `generation_jobs UPDATE matched 0 rows — client INSERT is missing for job ${newId}`,
                context: { stage: 'pre_fal_update', qualityMode, requestType, hasSource },
            });
        } else if (preUpdateRes.error) {
            logError('pre-fal UPDATE error', preUpdateRes.error, { jobId: newId });
        }

        // ── Call fal ───────────────────────────────────────────────────────
        const falApiKey = Deno.env.get('FAL_API_KEY');
        if (!falApiKey) throw new Error('FAL_API_KEY missing in edge function environment');

        const providerStart = Date.now();
        const falResult = await callFal(falApiKey, endpoint, falInput);
        const providerLatencyMs = Date.now() - providerStart;

        Object.assign(apiRequestPayload, {
            providerLatencyMs,
            falRequestId: falResult.requestId,
            generatedWidth: falResult.width,
            generatedHeight: falResult.height,
            current_stage: 'download',
        });

        // ── Download fal image + upload to user's permanent storage ────────
        const imgResp = await fetch(falResult.imageUrl, { signal: AbortSignal.timeout(60_000) });
        if (!imgResp.ok) throw new Error(`Failed to fetch fal image: HTTP ${imgResp.status}`);
        const imgBuf = new Uint8Array(await imgResp.arrayBuffer());
        const contentType = imgResp.headers.get('content-type') || falResult.contentType || 'image/jpeg';

        // ── Decide title / version (mirrors old saveGeminiResult logic) ────
        const srcBaseName = sourceImage?.baseName || sourceImage?.title;
        const srcVersion = sourceImage?.version;
        let dbBaseName = '';
        let dbTitle = '';
        let currentVersion = 1;

        if (requestType === 'create' || !sourceImage) {
            const snippet = (prompt || '').substring(0, 15).trim();
            dbBaseName = targetTitle || snippet || 'Image';
            dbTitle = dbBaseName;
        } else {
            dbBaseName = (srcBaseName || 'Image').replace(/_v\d+$/, '');
            try {
                const { data: siblings } = await supabaseAdmin
                    .from('images')
                    .select('version, base_name, title')
                    .eq('user_id', user.id)
                    .or(`base_name.eq.${dbBaseName},title.ilike.${dbBaseName}%`);
                if (Array.isArray(siblings) && siblings.length > 0) {
                    const maxVersion = siblings.reduce((max: number, img: any) => {
                        const b = (img.base_name || img.title || '').replace(/_v\d+$/, '');
                        return b === dbBaseName ? Math.max(max, img.version || 1) : max;
                    }, 0);
                    currentVersion = maxVersion + 1;
                } else {
                    currentVersion = (srcVersion || 0) + 1;
                }
            } catch {
                currentVersion = (srcVersion || 0) + 1;
            }
            dbTitle = targetTitle || `${dbBaseName}_v${currentVersion}`;
        }

        // ── Storage upload ─────────────────────────────────────────────────
        const rootFolder = sanitizeEmailForPath(user.email) || user.id;
        const dateFolder = buildUploadDateFolder(new Date());
        const ext = contentType === 'image/png' ? 'png' : 'jpg';
        const fileRole = currentVersion <= 1 ? 'original' : `variante${currentVersion}`;
        const filename = `${fileRole}_${newId.substring(0, 8)}.${ext}`;
        const storagePath = `${rootFolder}/user-content/${dateFolder}/${filename}`;
        const storageStart = Date.now();
        const { error: upErr } = await supabaseAdmin.storage
            .from('user-content')
            .upload(storagePath, imgBuf, { contentType, upsert: true });
        if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);
        apiRequestPayload.storageLatencyMs = Date.now() - storageStart;

        // ── Insert images row ──────────────────────────────────────────────
        const displayW = Math.round(sourceImage?.width || falResult.width || 1024);
        const displayH = Math.round(sourceImage?.height || falResult.height || 1024);
        const realW = Math.round(sourceImage?.realWidth || falResult.width || displayW);
        const realH = Math.round(sourceImage?.realHeight || falResult.height || displayH);
        const parentId = (requestType === 'edit' || sourceImage?.id) ? (sourceImage?.id || null) : null;

        const newImage = {
            id: newId,
            user_id: user.id,
            job_id: newId,
            storage_path: storagePath,
            width: displayW,
            height: displayH,
            real_width: realW,
            real_height: realH,
            model_version: provider === 'openai' ? 'gpt-image-2' : 'nano-banana-2',
            title: dbTitle,
            base_name: dbBaseName,
            version: currentVersion,
            prompt,
            parent_id: parentId,
            folder_id: sourceFolderId ?? sourceImage?.id ?? newId,
            annotations: '[]',
            generation_params: {
                quality: qualityMode,
                ...(activeTemplateId ? { activeTemplateId } : {}),
                ...(variables ? { variableValues: variables } : {}),
                provider,
            },
        };
        const { error: dbErr } = await supabaseAdmin.from('images').insert(newImage);
        if (dbErr?.code === '23505') {
            // Duplicate key — another request already inserted this id.
            // We swallow this to stay idempotent, but surface it so we can see
            // if retries / double-submits are the reason a user's image is missing.
            await logSilentSwallow(supabaseAdmin, {
                jobId: newId,
                userId: user.id,
                userEmail: user.email,
                message: `images INSERT swallowed 23505 duplicate key — possible double-submit/retry for job ${newId}`,
                context: { stage: 'images_insert', dbErrMsg: dbErr.message, dbErrDetails: (dbErr as any).details },
            });
        } else if (dbErr) {
            throw dbErr;
        }

        // ── Finalize job row ───────────────────────────────────────────────
        apiRequestPayload.current_stage = 'completed';
        const durationMs = Date.now() - taskStart;
        const usedVariables = !!(variables && typeof variables === 'object' && Object.keys(variables).length > 0);
        const finalUpdateRes = await supabaseAdmin.from('generation_jobs').update({
            status: 'completed',
            model: provider === 'openai' ? 'gpt-image-2' : 'nano-banana-2',
            duration_ms: durationMs,
            quality_mode: qualityMode,
            request_payload: apiRequestPayload,
            variables_used: usedVariables,
            // Overwrite prompt_preview with the *resolved* prompt so admin sees the
            // exact text that went to fal, including appended variable labels like
            // "Jahreszeit: Frühling". Client originally wrote the raw prompt.
            prompt_preview: (prompt || '').slice(0, 2000),
        }).eq('id', newId).select('id');
        if (!finalUpdateRes.error && Array.isArray(finalUpdateRes.data) && finalUpdateRes.data.length === 0) {
            await logSilentSwallow(supabaseAdmin, {
                jobId: newId,
                userId: user.id,
                userEmail: user.email,
                message: `generation_jobs final UPDATE matched 0 rows — job row missing at completion (id=${newId})`,
                context: { stage: 'final_update', durationMs, providerLatencyMs },
            });
        } else if (finalUpdateRes.error) {
            logError('final UPDATE error', finalUpdateRes.error, { jobId: newId });
        }

        logInfo('Done', `job=${newId} total=${durationMs}ms provider=${providerLatencyMs}ms`);

        // ── Build response ─────────────────────────────────────────────────
        const { data: pub } = supabaseAdmin.storage.from('user-content').getPublicUrl(storagePath);
        return new Response(JSON.stringify({
            success: true,
            jobId: newId,
            status: 'completed',
            image: {
                ...newImage,
                src: pub?.publicUrl || null,
            },
            meta: {
                durationMs,
                providerLatencyMs,
                requestId: falResult.requestId,
            },
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        const errorMsg = error?.message || String(error) || 'Unknown error';
        const elapsedMs = Date.now() - taskStart;
        logError('generate-image-fal', errorMsg, { jobId: newId, elapsedMs });

        // Refund
        if (refundData && supabaseAdmin) {
            try {
                await supabaseAdmin.from('profiles')
                    .update({ credits: refundData.originalCredits })
                    .eq('id', refundData.userId);
                logInfo('Refund', `Restored ${refundData.originalCredits} for ${refundData.userId}`);
            } catch (e) {
                logError('Refund', e);
            }
        }

        // Mark job failed
        if (newId && supabaseAdmin) {
            try {
                await supabaseAdmin.from('generation_jobs').update({
                    status: 'failed',
                    error: errorMsg,
                    duration_ms: elapsedMs,
                    request_payload: { provider: 'fal', current_stage: 'failed', failed: true },
                }).eq('id', newId);
            } catch (e) {
                logError('Mark failed', e);
            }
        }

        // Error logs
        if (supabaseAdmin) {
            try {
                supabaseAdmin.from('error_logs').insert({
                    user_id: null,
                    message: `[fal] ${errorMsg}`,
                    context: JSON.stringify({ jobId: newId, elapsedMs }),
                    source: 'generate-image-fal',
                    url: newId,
                }).then(() => {});
            } catch { /* best-effort */ }
        }

        return new Response(JSON.stringify({
            error: errorMsg,
            jobId: newId,
            timestamp: new Date().toISOString(),
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
