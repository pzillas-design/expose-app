import React, { useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { suppressCreditToast } from '@/services/creditToastGuard';
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
    /** Always-current ref to the active (detail-view) image ID — null when in feed view */
    activeIdRef: React.RefObject<string | null>;
    setIsSettingsOpen: (open: boolean) => void;
    showToast: (msg: string, type: "success" | "error", duration?: number, onClick?: () => void) => void;
    t: (key: any) => string;
    confirm: (options: { title?: string; description?: string; confirmLabel?: string; cancelLabel?: string; variant?: 'danger' | 'primary' }) => Promise<boolean>;
    /** Called when a generation completes and the image is saved to DB — used to increment total image count */
    onImageSaved?: () => void;
    /** Called when a generation completes successfully — used to mark image as unseen in feed */
    onGenerationComplete?: (id: string) => void;
    /** Called when generation is attempted without a logged-in user — opens sign-in modal */
    onSignIn?: () => void;
}

const COSTS: Record<string, number> = {
    'nb2-05k': 0.05,
    'nb2-1k': 0.10,
    'nb2-2k': 0.20,
    'nb2-4k': 0.40,
};

const ESTIMATED_DURATIONS: Record<string, number> = {
    'nb2-05k': 10000,  // ~10s fastest option
    'nb2-1k': 18000,   // ~18s observed average
    'nb2-2k': 30000,   // ~30s observed average
    'nb2-4k': 55000,   // ~55s observed average
};

const resolveTargetModel = (_quality: string): string | undefined => {
    // Let the Edge Function choose the active provider/model for the selected quality mode.
    return undefined;
};

// HELPER: Map technical errors to user-friendly messages via the app's locale system
const translateError = (errorMsg: string, t: (key: any) => string): string => {
    if (!errorMsg) return t('error_unknown');

    const msg = errorMsg.toLowerCase();

    // Specific Mappings (Highest Priority)
    if (msg.includes("file type not supported") || msg.includes("format not supported")) return t('error_file_type');
    if (msg.includes("insufficient credits") || msg.includes("not enough credits") || msg.includes("402")) return t('error_insufficient_credits');
    if (msg.includes("jwt expired")) return t('error_session_expired');
    if (msg.includes("invalid jwt") || msg.includes("session expired") || msg.includes("no access token") || msg.includes("session refresh failed") || msg.includes("401") || msg.includes("unauthorized")) {
        return t('error_session_invalid');
    }

    // Auth / Not Logged In
    if (msg.includes("not authenticated") || msg.includes("user not found")) {
        return t('error_not_logged_in');
    }

    // Safety / Content Filter
    if (msg.includes("nsfw") || msg.includes("safety") || msg.includes("content policy") || msg.includes("blocked")) {
        return t('error_safety_blocked');
    }

    // Server / AI Availability
    if (msg.includes("503") || msg.includes("504") || msg.includes("busy") || msg.includes("overloaded") || msg.includes("capacity")) {
        return t('error_server_busy');
    }
    if (msg.includes("500") || msg.includes("502") || msg.includes("failed to send") || msg.includes("edge function")) {
        return t('error_server_error');
    }

    // Network / Timeouts
    if (msg.includes("timed out") || msg.includes("timeout")) {
        return t('error_generation_timeout');
    }
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection") || msg.includes("failed to fetch")) {
        return t('error_network_error');
    }

    // Specific AI Errors
    if (msg.includes("cold start")) {
        return t('error_cold_start');
    }

    // Bad Request
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
const LS_TIMING_KEY = 'expose_gen_timing_v2';
interface TimingBucket { sum: number; count: number; }

const getImageSizeFromQuality = (quality: string): string => {
    if (quality.includes('4k')) return '4K';
    if (quality.includes('2k')) return '2K';
    return '1K';
};

const buildEstimateKey = ({
    qualityMode,
    requestType,
    hasSourceImage,
    hasMask,
    referenceCount,
    imageSize,
}: {
    qualityMode: string;
    requestType: 'create' | 'edit';
    hasSourceImage: boolean;
    hasMask: boolean;
    referenceCount: number;
    imageSize?: string;
}) => {
    const resolvedSize = imageSize || getImageSizeFromQuality(qualityMode);
    const hasReferences = referenceCount > 0;
    return [qualityMode, requestType, String(hasSourceImage), String(hasMask), String(hasReferences), resolvedSize].join('|');
};

const loadTimingStore = (): Record<string, TimingBucket> => {
    try { return JSON.parse(localStorage.getItem(LS_TIMING_KEY) || '{}'); } catch { return {}; }
};
const recordActualDuration = (keys: string[], ms: number) => {
    // Ignore hard limits (< 3s or > 5 min)
    if (ms < 3000 || ms > 300000) return;
    try {
        const store = loadTimingStore();
        for (const key of keys) {
            const prev = store[key] || { sum: 0, count: 0 };
            if (prev.count >= 3) {
                const currentAvg = prev.sum / prev.count;
                if (ms > currentAvg * 2.5 || ms < currentAvg * 0.4) continue;
            }
            const count = Math.min(prev.count + 1, 20);
            const sum = prev.count >= 20
                ? (prev.sum / prev.count) * 19 + ms
                : prev.sum + ms;
            store[key] = { sum, count };
        }
        localStorage.setItem(LS_TIMING_KEY, JSON.stringify(store));
    } catch { /* storage full or unavailable */ }
};
const getLearnedDuration = (keys: string[]): number | null => {
    try {
        const store = loadTimingStore();
        for (const key of keys) {
            const bucket = store[key];
            if (bucket && bucket.count >= 2) return Math.round(bucket.sum / bucket.count);
        }
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
    qualityMode, isAuthDisabled, selectAndSnap, activeIdRef, setIsSettingsOpen, showToast, t, confirm, onImageSaved, onGenerationComplete, onSignIn
}: UseGenerationProps) => {
    const attachedJobIds = React.useRef<Set<string>>(new Set());
    // Track { startTime, quality } per jobId so we can record actual duration on completion
    const jobTimingRef = React.useRef<Record<string, { startTime: number; quality: string; estimateKey: string }>>({});
    // Always-current ref to selectAndSnap — prevents stale closure in completion callbacks
    const selectAndSnapRef = React.useRef(selectAndSnap);
    React.useEffect(() => { selectAndSnapRef.current = selectAndSnap; }, [selectAndSnap]);
    // Job IDs that should auto-navigate to the finished image when polling completes
    const navigateOnCompleteIds = React.useRef<Set<string>>(new Set());
    // Optional completion callbacks: when a job finishes, call the registered callback (e.g. navigate to it)
    const jobCompleteCallbacks = React.useRef<Record<string, () => void>>({});
    // Source image ID that was active when each generation was started — used to guard auto-navigate
    const generationSourceIds = React.useRef<Record<string, string | null>>({});
    // One-shot retry functions per jobId — called automatically on timeout, then cleared
    const pendingRetryFns = React.useRef<Record<string, (() => void) | null>>({});

    /**
     * Returns true if we should auto-navigate to the finished image:
     * 1. User is still in detail view (activeIdRef.current !== null)
     * 2. User is still on the source image OR already on the placeholder/result
     */
    const shouldAutoNavigate = (newId: string): boolean => {
        const current = activeIdRef.current;
        if (current === null) return false; // user went to feed view
        const sourceId = generationSourceIds.current[newId] ?? null;
        return current === sourceId || current === newId;
    };

    const pollForJob = useCallback(async (jobId: string) => {
        if (attachedJobIds.current.has(jobId)) return;
        attachedJobIds.current.add(jobId);

        let attempts = 0;
        const maxAttempts = 10; // 50s absolute timeout at 5s interval
        let googleOverloadWarningShown = false; // show yellow toast only once per job

        const poll = async () => {
            attempts++;
            if (attempts > maxAttempts) {
                // Timeout: Edge Function likely died — try once automatically, then give up
                const retryFn = pendingRetryFns.current[jobId];
                delete pendingRetryFns.current[jobId];
                setRows(prev => prev.map(row => ({ ...row, items: row.items.filter(i => i.id !== jobId) })).filter(r => r.items.length > 0));
                attachedJobIds.current.delete(jobId);
                if (retryFn) {
                    showToast('Generation-Timeout — automatischer Neuversuch…', 'success');
                    retryFn();
                } else {
                    showToast(translateError('timeout', t), 'error');
                }
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
                    recordActualDuration([timing.estimateKey, `quality:${timing.quality}`], actualMs);
                    // Write duration_ms to generation_jobs so get_smart_generation_estimates has real data
                    supabase.from('generation_jobs')
                        .update({ duration_ms: Math.round(actualMs) })
                        .eq('id', jobId)
                        .then(() => {});
                    delete jobTimingRef.current[jobId];
                }

                const finalImage = await imageService.resolveImageRecord(imgData);
                const cacheBuster = `?t=${Date.now()}`;

                // Auto-navigate to finished image — only if still in detail view on source/placeholder
                if (navigateOnCompleteIds.current.has(jobId)) {
                    navigateOnCompleteIds.current.delete(jobId);
                    if (shouldAutoNavigate(jobId)) {
                        setTimeout(() => selectAndSnapRef.current(jobId, false, false), 200);
                    }
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

                        // Job succeeded — clear any pending retry fn
                delete pendingRetryFns.current[jobId];

                // Increment total image count in settings
                onImageSaved?.();
                onGenerationComplete?.(jobId);

                // Send browser notification if enabled and tab is inactive
                sendGenerationCompleteNotification(t('notification_generation_done'));

                // Persist job history for admin dashboard
                attachedJobIds.current.delete(jobId);
                return;
            }

            // 2. Check if job failed or retrying
            const { data: jobData } = await supabase
                .from('generation_jobs')
                .select('status, error, request_payload')
                .eq('id', jobId)
                .maybeSingle();

            // Show yellow warning toast once when Google AI is retrying due to overload
            if (!googleOverloadWarningShown && (jobData?.request_payload as any)?.current_stage === 'gemini_retry_503') {
                googleOverloadWarningShown = true;
                showToast(t('warning_google_overload'), 'info');
            }

            if (jobData?.status === 'failed') {
                const jobError = (jobData as any).error || "";
                const isTransient = jobError.toLowerCase().includes('timeout') || jobError.includes('520');
                const retryFn = isTransient ? pendingRetryFns.current[jobId] : null;
                delete pendingRetryFns.current[jobId];
                setRows(prev => prev.map(row => ({ ...row, items: row.items.filter(i => i.id !== jobId) })).filter(r => r.items.length > 0));
                attachedJobIds.current.delete(jobId);
                if (retryFn) {
                    showToast('Generation-Timeout — automatischer Neuversuch…', 'success');
                    retryFn();
                } else {
                    showToast(translateError(jobError, t), "error");
                }
                return;
            }

            // 2b. Detect stuck "processing" jobs — after 20s (4×5s)
            if (jobData?.status === 'processing' && attempts >= 4) {
                // Mark failed in DB — credit refund happens server-side via pg_cron
                try {
                    const { data: job } = await supabase
                        .from('generation_jobs').select('request_payload').eq('id', jobId).maybeSingle();
                    const lastStage = (job?.request_payload as any)?.current_stage || 'unknown';
                    await supabase
                        .from('generation_jobs')
                        .update({ status: 'failed', error: `Timeout at stage: ${lastStage} - credits refunded` })
                        .eq('id', jobId);
                } catch { /* non-critical */ }

                const retryFn = pendingRetryFns.current[jobId];
                delete pendingRetryFns.current[jobId];
                setRows(prev => prev.map(row => ({ ...row, items: row.items.filter(i => i.id !== jobId) })).filter(r => r.items.length > 0));
                attachedJobIds.current.delete(jobId);
                if (retryFn) {
                    showToast('Generation-Timeout — automatischer Neuversuch…', 'success');
                    retryFn();
                } else {
                    showToast(translateError('timeout', t), 'error');
                }
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
                        if (row.estimate_key) {
                            estimates[row.estimate_key] = {
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
            // Only true generation placeholders should be polled.
            // Upload skeletons also use isGenerating for shimmer UI, but they do not
            // have generationStartTime and must never trigger generation-complete flows.
            .filter(i => i.isGenerating && !!i.generationStartTime)
            .map(i => i.id);

        generatingIds.forEach(id => {
            if (!attachedJobIds.current.has(id)) {
                // Ensure auto-navigation works for jobs resumed after reload
                navigateOnCompleteIds.current.add(id);
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
        customReferenceInstructions?: Record<string, string>,
        groupParentId?: string,
        _autoRetryCount = 0
    ) => {
        if (!sourceImage) return;

        // Guard: must be logged in — open sign-in modal instead of showing error toast
        if (!user && !isAuthDisabled) {
            onSignIn?.();
            return;
        }

        // Guard: validate that there's enough input to produce a meaningful generation
        const hasPrompt = !!prompt?.trim();
        const hasImage = !!(sourceImage.src && !sourceImage.src.startsWith('blob:empty'));
        const annotations = sourceImage.annotations || [];
        const hasAnnotation = annotations.some(a => a.type !== 'reference_image');
        const hasReferenceImage = annotations.some(a => a.type === 'reference_image' && a.referenceImage);
        const hasVariables = variableValues && Object.keys(variableValues).length > 0;

        if (hasImage) {
            // Edit mode: need at least one instruction (prompt, annotation, variable, or reference image)
            if (!hasPrompt && !hasAnnotation && !hasVariables && !hasReferenceImage) {
                showToast(t('error_no_input'), 'error');
                return;
            }
            // Gemini needs text — reference image alone without prompt won't work
            if (!hasPrompt && hasReferenceImage && !hasAnnotation && !hasVariables) {
                showToast(t('error_no_input'), 'error');
                return;
            }
        } else {
            // Create mode (no source image): must have a prompt
            if (!hasPrompt) {
                showToast(t('error_no_input'), 'error');
                return;
            }
        }

        const cost = COSTS[qualityMode];
        const isPro = userProfile?.role === 'pro' || userProfile?.role === 'admin';

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
        const currentAnnotations = sourceImage.annotations || [];
        const currentRefs = currentAnnotations.filter(a => a.type === 'reference_image');
        const estimateKey = buildEstimateKey({
            qualityMode,
            requestType: 'edit',
            hasSourceImage: true,
            hasMask: currentAnnotations.some(a => ['mask_path', 'stamp', 'shape'].includes(a.type)),
            referenceCount: currentRefs.length,
        });

        // 2. CONCURRENCY & DURATION — simple hardcoded values per quality
        const estimatedDuration = ESTIMATED_DURATIONS[qualityMode] || 25000;

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
            parentId: groupParentId ?? sourceImage.id,
            generationPrompt: prompt,
            // Store full request body on the child so "Mehr" can replay it exactly.
            // userDraftPrompt is intentionally empty — SideSheet shows clean for children.
            // variableValues/activeTemplateId are kept for replay but not displayed (SideSheet init guards).
            userDraftPrompt: '',
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
            newRows[idx] = { ...newRows[idx], items: [placeholder, ...newRows[idx].items] };
            return newRows;
        });

        // Track start time so pollForJob can record actual duration
        jobTimingRef.current[newId] = { startTime: Date.now(), quality: qualityMode, estimateKey };

        // Record which image was active when generate was pressed — used to guard auto-navigate
        generationSourceIds.current[newId] = activeIdRef.current;
        // Auto-navigate to finished result when the async job completes
        navigateOnCompleteIds.current.add(newId);

        // Immediately snap to the loading skeleton so user sees progress
        if (shouldSnap) {
            setTimeout(() => selectAndSnapRef.current(newId, false, false), 100);
        }

        // --- ASYNC PROCESSING STARTS HERE ---
        // Credits are deducted server-side; local UI update happens only on success.

        // Heavy Canvas/DB operations in the background
        const processGenerationAsync = async () => {
            let currentUser: any; // Declare currentUser here to be accessible in catch block
            try {
                currentUser = user ?? null; // Use auth state from parent — getUser() triggers sign-out in supabase-js v2.99+ on any JWT error
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
                        parent_id: groupParentId ?? sourceImage.id,
                        request_payload: {
                            hasSourceImage: !!sourceImage.src,
                            hasMask: !!maskDataUrl,
                            referenceImagesCount: refs.length,
                            batchSize,
                            isMultiEdit: batchSize > 1,
                            isRepeat: !!groupParentId,
                            variables: variableValues || {},
                        }
                    }).then(() => {});
                }

                const finalImage = await imageService.processGeneration({
                    payload: structuredRequest,
                    sourceImage,
                    qualityMode,
                    modelName: resolveTargetModel(qualityMode),
                    newId,
                    targetVersion: newVersion,
                    targetTitle: placeholder.title,
                    activeTemplateId: activeTemplateId,
                    groupParentId,
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

                    // Clean up and navigate — only if still in detail view on source/placeholder
                    navigateOnCompleteIds.current.delete(newId);
                    if (shouldAutoNavigate(newId)) {
                        setTimeout(() => selectAndSnapRef.current(newId, false, false), 200);
                    }

                    if (!isPro && cost > 0) {
                        setCredits(prev => prev - cost);
                    }

                    onImageSaved?.();
                    onGenerationComplete?.(newId);
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

        // Register one-shot retry for transient failures (timeout / 520) — max 3 auto-retries
        if (_autoRetryCount < 3) {
            pendingRetryFns.current[newId] = () => {
                void performGeneration(sourceImage, prompt, batchSize, shouldSnap, draftPrompt, activeTemplateId, variableValues, customReferenceInstructions, groupParentId, _autoRetryCount + 1);
            };
        }

        processGenerationAsync();
    }, [rows, setRows, user, userProfile, credits, setCredits, qualityMode, isAuthDisabled, selectAndSnap, setIsSettingsOpen, showToast, t, confirm]);


    const performNewGeneration = useCallback(async (prompt: string, modelId: string, ratio: string, attachments: string[] = [], _autoRetryCount = 0) => {
        const cost = COSTS[modelId] || 0;
        const isPro = userProfile?.role === 'pro' || userProfile?.role === 'admin';

        if (!isPro && credits < cost) { setIsSettingsOpen(true); return; }

        if (!prompt?.trim() && !attachments.length) {
            showToast(t('error_prompt_required') || 'Bitte gib einen Prompt oder ein Bild an.', 'error');
            return;
        }

        const newId = generateId();
        const baseName = t('new_generation') || 'Generation';

        // Ratio calc (Sync)
        const resolution = modelId.split('-')[1];
        let baseSize = 1024;
        if (resolution === '05k') baseSize = 512;
        if (resolution === '2k') baseSize = 2048;
        if (resolution === '4k') baseSize = 4096;
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
            annotations: creationAnns, userId: user?.id,
            estimatedDuration: ESTIMATED_DURATIONS[modelId] || 25000,
        };
        const estimateKey = buildEstimateKey({
            qualityMode: modelId,
            requestType: 'create',
            hasSourceImage: false,
            hasMask: false,
            referenceCount: attachments.length,
        });

        setRows(prev => [{ id: generateId(), title: baseName, items: [placeholder], createdAt: Date.now() }, ...prev]);
        // Track start time so we can record actual duration on completion
        jobTimingRef.current[newId] = { startTime: Date.now(), quality: modelId, estimateKey };
        // Record source ID (null for create — no "source" image to stay on)
        generationSourceIds.current[newId] = activeIdRef.current;
        // Navigate to the placeholder immediately (user sees blob animation on detail page).
        // Also register for post-completion navigation in case polling finishes before user arrives.
        navigateOnCompleteIds.current.add(newId);
        setTimeout(() => selectAndSnapRef.current(newId, false, false), 50);

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
                    }).then(() => {});
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
                    if (t0) {
                        recordActualDuration([t0.estimateKey, `quality:${t0.quality}`], Date.now() - t0.startTime);
                        delete jobTimingRef.current[newId];
                    }
                    setRows(prev => prev.map(row => ({ ...row, items: row.items.map(i => i.id === newId ? finalImage : i) })));

                    navigateOnCompleteIds.current.delete(newId);
                    if (shouldAutoNavigate(newId)) {
                        setTimeout(() => selectAndSnapRef.current(newId, false, false), 200);
                    }

                    if (!isPro && cost > 0) {
                        setCredits(prev => prev - cost);
                    }

                    onImageSaved?.();
                    onGenerationComplete?.(newId);
                    sendGenerationCompleteNotification(t('notification_generation_done'));
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

                if (user && !isAuthDisabled) {
                    supabase.from('generation_jobs').delete().eq('id', newId).eq('user_id', user.id);
                }

                const translated = translateError(error.message || "", t);
                showToast(translated, "error");
                // Credits were NOT deducted locally (upfront) — server handles refund automatically.
            }
        };

        // Register one-shot retry for transient failures (timeout / 520) — max 3 auto-retries
        if (_autoRetryCount < 3) {
            pendingRetryFns.current[newId] = () => {
                void performNewGeneration(prompt, modelId, ratio, attachments, _autoRetryCount + 1);
            };
        }

        processNewSync();
    }, [user, userProfile, credits, setCredits, isAuthDisabled, setRows, selectAndSnap, showToast, t, confirm]);


    return { performGeneration, performNewGeneration };
};
