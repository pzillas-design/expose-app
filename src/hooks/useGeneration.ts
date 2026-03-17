import React, { useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { imageService } from '@/services/imageService';
import { generateMaskFromAnnotations } from '@/utils/maskGenerator';
import { generateAnnotationImage } from '@/utils/annotationUtils';
import { generateId } from '@/utils/ids';
import { CanvasImage, ImageRow, GenerationQuality, StructuredGenerationRequest, StructuredReference } from '@/types';
import { sendGenerationCompleteNotification } from '@/utils/notifications';

interface UseGenerationProps {
    rows: ImageRow[];
    setRows: React.Dispatch<React.SetStateAction<ImageRow[]>>;
    user: any;
    userProfile: any;
    credits: number;
    setCredits: React.Dispatch<React.SetStateAction<number>>;
    qualityMode: GenerationQuality;
    isAuthDisabled: boolean;
    selectAndSnap: (id: string, instant?: boolean) => void;
    setIsSettingsOpen: (open: boolean) => void;
    showToast: (msg: string, type: "success" | "error", duration?: number, onClick?: () => void) => void;
    t: (key: any) => string;
    confirm: (options: { title?: string; description?: string; confirmLabel?: string; cancelLabel?: string; variant?: 'danger' | 'primary' }) => Promise<boolean>;
}

const COSTS: Record<string, number> = {
    'pro-1k': 0.10,
    'pro-2k': 0.25,
    'pro-4k': 0.50,
    'nb2-1k': 0.07,
    'nb2-2k': 0.17,
    'nb2-4k': 0.35,
};

const ESTIMATED_DURATIONS: Record<string, number> = {
    'pro-1k': 60000,  // interpolated (pro ≈ 2× nb2-1k)
    'pro-2k': 89000,  // measured avg
    'pro-4k': 140000, // interpolated (pro-2k × 1.6)
    'nb2-1k': 38000,  // measured avg
    'nb2-2k': 43000,  // measured avg
    'nb2-4k': 60000,  // interpolated (nb2-2k + ~17s)
};

// Map quality modes to model names for historical lookup
const QUALITY_TO_MODEL: Record<string, string> = {
    'pro-1k': 'google/nano-banana-pro',
    'pro-2k': 'google/nano-banana-pro',
    'pro-4k': 'google/nano-banana-pro'
};

const resolveTargetModel = (_quality: string): string | undefined => {
    // Return undefined — let the Edge Function use its own default model ('gemini-3-pro-image-preview')
    return undefined;
};

// HELPER: Map technical errors to user-friendly messages via the app's locale system
const translateError = (errorMsg: string, t: (key: any) => string): string => {
    if (!errorMsg) return t('error_unknown');

    const msg = errorMsg.toLowerCase();

    // Auth / session
    if (msg.includes("invalid jwt") || msg.includes("jwt expired") || msg.includes("session expired") || msg.includes("no access token") || msg.includes("session refresh failed")) {
        return t('error_session_expired');
    }
    if (msg.includes("not authenticated") || msg.includes("user not found")) {
        return t('error_not_logged_in');
    }

    // Credits / billing
    if (msg.includes("insufficient credits") || msg.includes("not enough credits") || msg.includes("credits") || msg.includes("payment required") || msg.includes("402")) {
        return t('error_insufficient_credits');
    }

    // Safety / content filter
    if (msg.includes("nsfw") || msg.includes("safety") || msg.includes("content policy") || msg.includes("blocked")) {
        return t('error_safety_blocked');
    }

    // Kie.ai API errors — keep detail for debugging
    if (
        msg.includes("kie task failed:") ||
        msg.includes("kie createtask") ||
        msg.includes("kie recordinfo") ||
        msg.includes("kie task complete") ||
        msg.includes("kie result download") ||
        msg.includes("image generation failed on kie") ||
        msg.startsWith("kie.ai error:")
    ) {
        const cleaned = errorMsg.replace(/^kie\.ai error:\s*/i, '').replace(/\s*\(Status:\s*\d+\)\s*$/, '').substring(0, 180);
        return `${t('error_generation_failed')}: ${cleaned}`;
    }

    // Task / background timeout
    if (msg.includes("timed out") || msg.includes("timeout") || msg.includes("background task timeout")) {
        return t('error_generation_timeout');
    }
    if (msg.includes("cold start")) {
        return t('error_cold_start');
    }

    // Server / network
    if (msg.includes("503") || msg.includes("502") || msg.includes("failed to send") || msg.includes("edge function")) {
        return t('error_server_error');
    }
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection") || msg.includes("failed to fetch")) {
        return t('error_network_error');
    }

    // Bad / invalid request
    if (msg.includes("bad request") || msg.includes("400") || msg.includes("invalid")) {
        return t('error_invalid_prompt');
    }

    // Fallback — include raw message for debuggability
    return `${t('error_generation_failed')}: ${errorMsg.substring(0, 120)}`;
};

// Cache for smart estimates (simple in-memory cache)
let smartEstimatesCache: Record<string, {
    baseDurationMs: number;
    concurrencyFactor: number;
    sampleCount: number;
}> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Local timing learning ─────────────────────────────────────────────────────
// Persists rolling averages of actual generation durations in localStorage.
// After ≥2 samples the stored average is used instead of the hardcoded fallback.
const LS_TIMING_KEY = 'expose_gen_timing_v1';
interface TimingBucket { sum: number; count: number; }

const loadTimingStore = (): Record<string, TimingBucket> => {
    try { return JSON.parse(localStorage.getItem(LS_TIMING_KEY) || '{}'); } catch { return {}; }
};
const recordActualDuration = (quality: string, ms: number) => {
    // Ignore hard limits (< 3s or > 5 min)
    if (ms < 3000 || ms > 300000) return;
    try {
        const store = loadTimingStore();
        const prev = store[quality] || { sum: 0, count: 0 };
        // Outlier filter: if we have enough data and new value is >2.5x or <0.4x the current avg, skip it
        if (prev.count >= 3) {
            const currentAvg = prev.sum / prev.count;
            if (ms > currentAvg * 2.5 || ms < currentAvg * 0.4) return;
        }
        // Exponential moving average: keep at most 20 samples worth of weight
        const count = Math.min(prev.count + 1, 20);
        const sum = prev.count >= 20
            ? (prev.sum / prev.count) * 19 + ms  // slide out oldest
            : prev.sum + ms;
        store[quality] = { sum, count };
        localStorage.setItem(LS_TIMING_KEY, JSON.stringify(store));
    } catch { /* storage full or unavailable */ }
};
const getLearnedDuration = (quality: string): number | null => {
    try {
        const bucket = loadTimingStore()[quality];
        if (bucket && bucket.count >= 2) return Math.round(bucket.sum / bucket.count);
    } catch { /* */ }
    return null;
};

// Debug helper: call window.__etaDebug() in browser console to inspect learned timings
if (typeof window !== 'undefined') {
    (window as any).__etaDebug = () => {
        const store = loadTimingStore();
        const hardcoded = ESTIMATED_DURATIONS;
        console.group('📊 ETA Timing Store');
        Object.entries(hardcoded).forEach(([quality, hardMs]) => {
            const bucket = store[quality];
            const learnedMs = bucket && bucket.count >= 2 ? Math.round(bucket.sum / bucket.count) : null;
            const diff = learnedMs ? Math.round((learnedMs - hardMs) / 1000) : null;
            console.log(
                `${quality.padEnd(8)} | hardcoded: ${(hardMs/1000).toFixed(0)}s` +
                (learnedMs ? ` | learned: ${(learnedMs/1000).toFixed(0)}s (${diff! > 0 ? '+' : ''}${diff}s) [n=${bucket!.count}]` : ' | learned: — (not enough data)')
            );
        });
        console.groupEnd();
        return store;
    };
}


export const useGeneration = ({
    rows, setRows, user, userProfile, credits, setCredits,
    qualityMode, isAuthDisabled, selectAndSnap, setIsSettingsOpen, showToast, t, confirm
}: UseGenerationProps) => {
    const attachedJobIds = React.useRef<Set<string>>(new Set());
    // Track { startTime, quality } per jobId so we can record actual duration on completion
    const jobTimingRef = React.useRef<Record<string, { startTime: number; quality: string }>>({});
    // Always-current ref to selectAndSnap — prevents stale closure in completion callbacks
    const selectAndSnapRef = React.useRef(selectAndSnap);
    React.useEffect(() => { selectAndSnapRef.current = selectAndSnap; }, [selectAndSnap]);
    // Job IDs that should auto-navigate to the finished image when polling completes
    const navigateOnCompleteIds = React.useRef<Set<string>>(new Set());
    // Optional completion callbacks: when a job finishes, call the registered callback (e.g. navigate to it)
    const jobCompleteCallbacks = React.useRef<Record<string, () => void>>({});

    const pollForJob = useCallback(async (jobId: string) => {
        if (attachedJobIds.current.has(jobId)) return;
        attachedJobIds.current.add(jobId);

        let attempts = 0;
        const maxAttempts = 60; // 5 minutes at 5s interval

        const poll = async () => {
            attempts++;
            if (attempts > maxAttempts) {
                // Timeout: Edge Function likely died (status 546) — clean up stuck job
                showToast(translateError('timeout', t), 'error');
                setRows(prev => prev.map(row => ({
                    ...row,
                    items: row.items.filter(i => i.id !== jobId)
                })).filter(r => r.items.length > 0));
                attachedJobIds.current.delete(jobId);
                return;
            }

            // 1. Check if image exists in DB
            const { data: imgData } = await supabase
                .from('images')
                .select('*')
                .eq('id', jobId)
                .maybeSingle();

            if (imgData) {
                // Record actual duration — locally and write back to DB for global stats
                const timing = jobTimingRef.current[jobId];
                if (timing) {
                    const actualMs = Date.now() - timing.startTime;
                    recordActualDuration(timing.quality, actualMs);
                    // Write duration_ms to generation_jobs so get_smart_generation_estimates has real data
                    supabase.from('generation_jobs')
                        .update({ duration_ms: Math.round(actualMs) })
                        .eq('id', jobId)
                        .then(() => {});
                    delete jobTimingRef.current[jobId];
                }

                const finalImage = await imageService.resolveImageRecord(imgData);
                const cacheBuster = `?t=${Date.now()}`;

                // Auto-navigate to finished image (uses always-current ref — no stale closure)
                if (navigateOnCompleteIds.current.has(jobId)) {
                    navigateOnCompleteIds.current.delete(jobId);
                    setTimeout(() => selectAndSnapRef.current(jobId), 200);
                }
                // Legacy callback support
                const onComplete = jobCompleteCallbacks.current[jobId];
                if (onComplete) {
                    delete jobCompleteCallbacks.current[jobId];
                    setTimeout(onComplete, 200);
                }

                setRows(prev => prev.map(row => ({
                    ...row,
                    items: row.items.map(item => {
                        if (item.id === jobId) {
                            // MERGE: Preserve local state that might have been changed while polling
                            return {
                                ...finalImage,
                                src: finalImage.src.includes('?') ? `${finalImage.src}&refreshed=true` : `${finalImage.src}${cacheBuster}`,
                                // Preserve local edits (even empty strings)
                                userDraftPrompt: item.userDraftPrompt !== undefined ? item.userDraftPrompt : finalImage.userDraftPrompt,
                                activeTemplateId: item.activeTemplateId !== undefined ? item.activeTemplateId : finalImage.activeTemplateId,
                                variableValues: item.variableValues !== undefined ? item.variableValues : finalImage.variableValues,
                                // If the local item has annotations (e.g. user started brushing), prefer those
                                // UNLESS the final image has new annotations from the server (e.g. generation result)
                                annotations: (item.annotations && item.annotations.length > 0 && (!finalImage.annotations || finalImage.annotations.length === 0))
                                    ? item.annotations
                                    : (finalImage.annotations || [])
                            };
                        }
                        return item;
                    })
                })));

                // Send browser notification if enabled and tab is inactive
                sendGenerationCompleteNotification(
                    finalImage.title || finalImage.baseName,
                    finalImage.generationPrompt
                );

                // Persist job history for admin dashboard
                attachedJobIds.current.delete(jobId);
                return;
            }

            // 2. Check if job failed
            const { data: jobData } = await supabase
                .from('generation_jobs')
                .select('status, error')
                .eq('id', jobId)
                .maybeSingle();

            if (jobData?.status === 'failed') {
                const jobError = (jobData as any).error || "";
                const translated = translateError(jobError, t);
                showToast(translated, "error");
                setRows(prev => prev.map(row => ({
                    ...row,
                    items: row.items.filter(i => i.id !== jobId)
                })).filter(r => r.items.length > 0));
                attachedJobIds.current.delete(jobId);
                return;
            }

            // 2b. Detect stuck "processing" jobs (Edge Function killed by Supabase before catch ran)
            if (jobData?.status === 'processing' && attempts >= 55) { // ~4.5 minutes (background task has up to 5 min)
                // Mark failed in DB and refund credits — the background task was likely killed before its catch block ran
                try {
                    // Fetch job cost and current profile credits fresh (don't use stale closure)
                    const [{ data: job }, { data: profile }] = await Promise.all([
                        supabase.from('generation_jobs').select('cost').eq('id', jobId).maybeSingle(),
                        user ? supabase.from('profiles').select('credits').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null })
                    ]);
                    if (job?.cost && user && profile) {
                        const refundedCredits = (profile.credits ?? 0) + parseFloat(job.cost);
                        await supabase
                            .from('profiles')
                            .update({ credits: refundedCredits })
                            .eq('id', user.id);
                    }
                    await supabase
                        .from('generation_jobs')
                        .update({ status: 'failed', error: 'Background task timeout - credits refunded' })
                        .eq('id', jobId);
                } catch { /* non-critical — job cleanup, best-effort */ }

                showToast(translateError('timeout', t), 'error');
                setRows(prev => prev.map(row => ({
                    ...row,
                    items: row.items.filter(i => i.id !== jobId)
                })).filter(r => r.items.length > 0));
                attachedJobIds.current.delete(jobId);
                return;
            }

            // 3. Continue polling
            setTimeout(poll, 5000);
        };

        poll();
    }, [setRows, user, t, showToast]);

    // Re-attach to orphaned jobs on load/change
    // Pre-fetch smart estimates on mount
    React.useEffect(() => {
        const fetchEstimates = async () => {
            try {
                const { data } = await supabase.rpc('get_smart_generation_estimates');
                if (data && data.length > 0) {
                    const estimates: Record<string, any> = {};
                    data.forEach((row: any) => {
                        if (row.quality_mode) {
                            estimates[row.quality_mode] = {
                                baseDurationMs: Math.round(row.base_duration_ms || 0),
                                concurrencyFactor: row.concurrency_factor || 0.3,
                                sampleCount: row.sample_count || 0
                            };
                        }
                    });
                    smartEstimatesCache = estimates;
                    cacheTimestamp = Date.now();
                }
            } catch (err) {
                console.warn('Failed to fetch smart estimates:', err);
            }
        };
        fetchEstimates();
    }, []);

    React.useEffect(() => {
        const generatingIds = rows.flatMap(r => r.items)
            .filter(i => i.isGenerating)
            .map(i => i.id);

        generatingIds.forEach(id => {
            if (!attachedJobIds.current.has(id)) {
                pollForJob(id);
            }
        });
    }, [rows, pollForJob]);

    const performGeneration = useCallback(async (
        sourceImage: CanvasImage,
        prompt: string,
        batchSize: number = 1,
        shouldSnap: boolean = true,
        draftPrompt?: string,
        activeTemplateId?: string,
        variableValues?: Record<string, string[]>,
        customReferenceInstructions?: Record<string, string>
    ) => {
        if (!sourceImage) return;
        const cost = COSTS[qualityMode];
        const isPro = userProfile?.role === 'pro';

        if (!isPro && credits < cost) { setIsSettingsOpen(true); return; }

        const rowIndex = rows.findIndex(row => row.items.some(item => item.id === sourceImage.id));
        if (rowIndex === -1) return;

        const newId = generateId();
        const rawBaseName = sourceImage?.baseName || sourceImage?.title || 'Image';
        const baseName = rawBaseName.replace(/_v\d+$/, '');

        // 1. VERSION CALCULATION (Sync)
        const allImages = rows.flatMap(r => r.items);
        const siblings = allImages.filter(i => {
            if (!i) return false;
            const itemBaseName = (i.baseName || i.title || '').replace(/_v\d+$/, '');
            return itemBaseName === baseName;
        });
        const maxVersion = siblings.reduce((max, item) => Math.max(max, item.version || 1), 0);
        const newVersion = maxVersion + 1;

        // 2. CONCURRENCY & DURATION (Sync)
        const activeCount = allImages.filter(i => i.isGenerating).length;
        const currentConcurrency = activeCount + batchSize;
        // Prefer: (1) learned from localStorage, (2) smart DB estimate, (3) hardcoded fallback
        const learnedBase = getLearnedDuration(qualityMode);
        let estimatedDuration: number;
        const nowMs = Date.now();
        if (learnedBase) {
            estimatedDuration = Math.round(learnedBase * (1 + 0.25 * currentConcurrency));
        } else if (smartEstimatesCache && (nowMs - cacheTimestamp) < CACHE_TTL && smartEstimatesCache[qualityMode]) {
            const estimate = smartEstimatesCache[qualityMode];
            let duration = estimate.baseDurationMs || ESTIMATED_DURATIONS[qualityMode] || 23000;
            duration *= (1 + (estimate.concurrencyFactor || 0.3) * currentConcurrency);
            estimatedDuration = Math.round(duration);
        } else {
            estimatedDuration = Math.round((ESTIMATED_DURATIONS[qualityMode] || 23000) * (1 + 0.3 * currentConcurrency));
        }

        // 3. SHOW PLACEHOLDER IMMEDIATELY
        const placeholder: CanvasImage = {
            ...sourceImage,
            id: newId,
            title: `${baseName}_v${newVersion}`,
            version: newVersion,
            isGenerating: true,
            generationStartTime: Date.now(),
            maskSrc: undefined,
            thumbSrc: sourceImage.thumbSrc,
            src: sourceImage.src,
            annotations: (sourceImage.annotations || []).filter(a => a.type === 'reference_image'),
            parentId: sourceImage.id,
            generationPrompt: prompt,
            userDraftPrompt: draftPrompt || prompt,
            activeTemplateId: activeTemplateId,
            variableValues: variableValues,
            quality: qualityMode,
            estimatedDuration,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        setRows(prev => {
            const newRows = [...prev];
            const idx = newRows.findIndex(r => r.items.some(i => i.id === sourceImage.id));
            if (idx === -1) return prev;
            newRows[idx] = { ...newRows[idx], items: [...newRows[idx].items, placeholder] };
            return newRows;
        });

        // Track start time so pollForJob can record actual duration
        jobTimingRef.current[newId] = { startTime: Date.now(), quality: qualityMode };

        // Auto-navigate to finished result when the async job completes
        navigateOnCompleteIds.current.add(newId);

        // --- ASYNC PROCESSING STARTS HERE ---
        // Credits are deducted server-side; local UI update happens only on success.

        // Heavy Canvas/DB operations in the background
        const processGenerationAsync = async () => {
            let currentUser: any; // Declare currentUser here to be accessible in catch block
            try {
                const { data: { user: fetchedUser } } = await supabase.auth.getUser();
                currentUser = fetchedUser; // Assign fetched user to currentUser
                const maskDataUrl = await generateMaskFromAnnotations(sourceImage);
                const annotations = sourceImage.annotations || [];
                const hasMarkings = annotations.some(a => ['mask_path', 'stamp', 'shape'].includes(a.type));
                let annotationImageBase64: string | undefined;

                if (hasMarkings) {
                    try {
                        annotationImageBase64 = await generateAnnotationImage(
                            sourceImage.src,
                            annotations,
                            { width: sourceImage.realWidth || 1024, height: sourceImage.realHeight || 1024 },
                            { width: sourceImage.width || 1024, height: sourceImage.height || 1024 }
                        );
                    } catch (err) { console.warn("Failed to generate annotation image:", err); }
                }

                const refs = annotations.filter(a => a.type === 'reference_image');
                const structuredRefs: StructuredReference[] = refs.map(ann => ({
                    src: ann.referenceImage!,
                    instruction: customReferenceInstructions?.[ann.id] || ann.text || ''
                }));

                const structuredRequest: StructuredGenerationRequest = {
                    type: 'edit',
                    prompt: prompt,
                    variables: variableValues || {},
                    originalImage: sourceImage.src,
                    annotationImage: annotationImageBase64,
                    references: structuredRefs
                };

                if (currentUser && !isAuthDisabled) {
                    supabase.from('generation_jobs').insert({
                        id: newId,
                        user_id: currentUser.id,
                        user_email: currentUser.email,
                        type: maskDataUrl ? 'Edit' : 'Create',
                        model: qualityMode,
                        quality_mode: qualityMode,
                        status: 'processing',
                        cost: cost,
                        prompt_preview: prompt,
                        parent_id: sourceImage.id,
                        request_payload: {
                            hasSourceImage: !!sourceImage.src,
                            hasMask: !!maskDataUrl,
                            referenceImagesCount: refs.length,
                            variables: variableValues || {},
                        }
                    }).then(() => attachedJobIds.current.add(newId));
                }

                const finalImage = await imageService.processGeneration({
                    payload: structuredRequest,
                    sourceImage,
                    qualityMode,
                    modelName: resolveTargetModel(qualityMode),
                    newId,
                    targetVersion: newVersion,
                    targetTitle: placeholder.title
                });

                if (finalImage) {
                    // Synchronous completion (legacy path — Edge Function returned finished image)
                    const cacheBuster = `?t=${Date.now()}`;
                    const refreshedImage = {
                        ...finalImage,
                        src: finalImage.src.includes('?') ? `${finalImage.src}&refreshed=true` : `${finalImage.src}${cacheBuster}`
                    };

                    setRows(prev => prev.map(row => ({
                        ...row,
                        items: row.items.map(i => i.id === newId ? refreshedImage : i)
                    })));

                    // Clean up and navigate using always-current ref
                    navigateOnCompleteIds.current.delete(newId);
                    setTimeout(() => selectAndSnapRef.current(newId), 200);

                    if (!isPro && cost > 0) {
                        setCredits(prev => prev - cost);
                    }

                    showToast('Bild generiert', 'success', 6000);
                } else {
                    // Async pattern: Edge Function accepted job, background processing started.
                    // pollForJob (via useEffect) handles completion, credit deduction, and toast.
                    if (!isPro && cost > 0) {
                        setCredits(prev => prev - cost);
                    }
                }
            } catch (error: any) {
                console.error("Generation failed:", error);

                // Stop poller from showing a duplicate error toast
                attachedJobIds.current.delete(newId);

                // Remove placeholder tile
                setRows(prev => prev.map(row => ({
                    ...row,
                    items: row.items.filter(i => i.id !== newId)
                })).filter(row => row.items.length > 0));

                if (currentUser && !isAuthDisabled) {
                    supabase.from('generation_jobs').delete().eq('id', newId).eq('user_id', currentUser.id);
                }

                const translated = translateError(error.message || String(error), t);
                showToast(translated, "error");
                // Credits were NOT deducted locally (upfront) — server handles refund automatically.
            }
        };

        processGenerationAsync();
    }, [rows, setRows, user, userProfile, credits, setCredits, qualityMode, isAuthDisabled, selectAndSnap, setIsSettingsOpen, showToast, t, confirm]);


    const performNewGeneration = useCallback(async (prompt: string, modelId: string, ratio: string, attachments: string[] = []) => {
        const cost = COSTS[modelId] || 0;
        const isPro = userProfile?.role === 'pro';

        if (!isPro && credits < cost) { setIsSettingsOpen(true); return; }

        const newId = generateId();
        const baseName = t('new_generation') || 'Generation';

        // Ratio calc (Sync)
        let baseSize = 1024;
        if (modelId === 'pro-2k') baseSize = 2048;
        if (modelId === 'pro-4k') baseSize = 4096;
        let wRatio = 1, hRatio = 1;
        const parts = ratio.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) { wRatio = parts[0]; hRatio = parts[1]; }
        let realWidth = baseSize, realHeight = baseSize;
        if (wRatio >= hRatio) { realWidth = baseSize; realHeight = Math.round(baseSize * (hRatio / wRatio)); }
        else { realHeight = baseSize; realWidth = Math.round(baseSize * (wRatio / hRatio)); }
        const displayHeight = 512, displayWidth = (realWidth / realHeight) * displayHeight;

        const creationAnns: any[] = attachments.map(src => ({
            id: generateId(), type: 'reference_image', referenceImage: src, points: [], strokeWidth: 0, color: '#000000', x: 0, y: 0, width: 0, height: 0
        }));

        const placeholder: CanvasImage = {
            id: newId, src: '', storage_path: '', width: displayWidth, height: displayHeight, realWidth, realHeight,
            title: baseName, baseName: baseName, version: 1, isGenerating: true, generationStartTime: Date.now(),
            quality: modelId as any, createdAt: Date.now(), updatedAt: Date.now(), generationPrompt: prompt, userDraftPrompt: '',
            annotations: creationAnns, userId: user?.id
        };

        setRows(prev => [{ id: generateId(), title: baseName, items: [placeholder], createdAt: Date.now() }, ...prev]);
        // Track start time so we can record actual duration on completion
        jobTimingRef.current[newId] = { startTime: Date.now(), quality: modelId };
        // Navigate to the placeholder immediately (user sees blob animation on detail page).
        // Also register for post-completion navigation in case polling finishes before user arrives.
        navigateOnCompleteIds.current.add(newId);
        setTimeout(() => selectAndSnapRef.current(newId), 50);

        const processNewSync = async () => {
            try {
                if (user && !isAuthDisabled) {
                    supabase.from('generation_jobs').insert({
                        id: newId,
                        user_id: user.id,
                        user_email: user.email,
                        status: 'processing',
                        cost,
                        prompt_preview: prompt,
                        quality_mode: modelId,
                        model: modelId
                    }).then(() => attachedJobIds.current.add(newId));
                }

                const structuredRequest: StructuredGenerationRequest = {
                    type: 'create', prompt, variables: {},
                    references: creationAnns.map(ann => ({ src: ann.referenceImage!, instruction: ann.text || '' }))
                };

                const finalImage = await imageService.processGeneration({
                    payload: structuredRequest, sourceImage: placeholder, qualityMode: modelId,
                    modelName: resolveTargetModel(modelId), newId, attachments, aspectRatio: ratio
                });

                if (finalImage) {
                    // Synchronous completion (legacy path) — record actual duration
                    const t0 = jobTimingRef.current[newId];
                    if (t0) { recordActualDuration(t0.quality, Date.now() - t0.startTime); delete jobTimingRef.current[newId]; }
                    setRows(prev => prev.map(row => ({ ...row, items: row.items.map(i => i.id === newId ? finalImage : i) })));

                    navigateOnCompleteIds.current.delete(newId);
                    setTimeout(() => selectAndSnapRef.current(newId), 200);

                    if (!isPro && cost > 0) {
                        setCredits(prev => prev - cost);
                    }

                    showToast('Bild generiert', 'success', 6000);
                } else {
                    // Async pattern: background processing started, pollForJob handles completion
                    if (!isPro && cost > 0) {
                        setCredits(prev => prev - cost);
                    }
                }
            } catch (error: any) {
                // Stop poller from showing a duplicate error toast
                attachedJobIds.current.delete(newId);

                setRows(prev => prev.filter(r => !r.items.some(i => i.id === newId)));

                const translated = translateError(error.message || "", t);
                showToast(translated, "error");
                // Credits were NOT deducted locally (upfront) — server handles refund automatically.
            }
        };

        processNewSync();
    }, [user, userProfile, credits, setCredits, isAuthDisabled, setRows, selectAndSnap, showToast, t, confirm]);


    return { performGeneration, performNewGeneration };
};
