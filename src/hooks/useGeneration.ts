import React, { useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { suppressCreditToast } from '@/services/creditToastGuard';
import { imageService } from '@/services/imageService';
import { generateMaskFromAnnotations } from '@/utils/maskGenerator';
import { generateAnnotationImage } from '@/utils/annotationUtils';
import { compressImage } from '@/utils/imageUtils';
import { generateId } from '@/utils/ids';
import { CanvasImage, ImageRow, GenerationQuality, StructuredGenerationRequest, StructuredReference } from '@/types';
import { sendGenerationCompleteNotification } from '@/utils/notifications';
import { trackImageGenerated } from '@/utils/analytics';
import { logError } from '@/services/errorLogger';
import { loadGenerationSettings } from '@/utils/generationSettings';

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

// ETA matrix — drives the progress bar's fill speed. Calibrated against the last
// 7 days of completed jobs (p50). NB2 has no quality dimension; gpt-image-2 has
// 3 quality levels. Numbers are slightly above p50 so the bar doesn't routinely
// stall at 98% waiting for the API to actually return.
//
// Measurements (p50 / avg / p90) over the last 7 days:
//   gpt-image-2  1K medium:  ~43s / 45s / 51s
//   gpt-image-2  2K medium:  ~68s / 84s / 142s
//   gpt-image-2  4K medium:  ~78s (n=1, extrapolated)
//   nano-banana-2 1K:        ~32s / 38s / 75s
//   nano-banana-2 2K:        ~42s / 45s / 62s
//   nano-banana-2 4K:        ~69s / 69s / 86s
// gpt-image-2 high/low values are extrapolated from medium (~+40% high, ~−65% low).
type EtaProvider = 'fal-nb2' | 'openai';
type EtaQuality  = 'low' | 'medium' | 'high';

const ETA_MATRIX_MS: Record<EtaProvider, Partial<Record<string, Partial<Record<EtaQuality, number>> & { default?: number }>>> = {
    'fal-nb2': {
        // NB2 has no quality knob — same value applies regardless of `quality`.
        'nb2-05k': { default: 16000 },
        'nb2-1k':  { default: 35000 },
        'nb2-2k':  { default: 45000 },
        'nb2-4k':  { default: 75000 },
    },
    'openai': {
        // gpt-image-2 — quality scales latency strongly.
        'nb2-05k': { low: 8000,  medium: 16000, high: 22000, default: 16000 },
        'nb2-1k':  { low: 18000, medium: 45000, high: 60000, default: 45000 },
        'nb2-2k':  { low: 30000, medium: 70000, high: 95000, default: 70000 },
        'nb2-4k':  { low: 45000, medium: 80000, high: 130000, default: 110000 },
    },
};

const FALLBACK_ETA_MS = 45000;

const getEtaMs = (provider: EtaProvider | undefined, qualityMode: string, quality: EtaQuality | undefined): number => {
    const p = (provider as EtaProvider) || 'openai';
    const cell = ETA_MATRIX_MS[p]?.[qualityMode];
    if (!cell) return FALLBACK_ETA_MS;
    if (quality && cell[quality] !== undefined) return cell[quality]!;
    return cell.default ?? FALLBACK_ETA_MS;
};

// Legacy lookup for code paths that don't yet thread provider/quality through.
// Picks the openai-medium row since that's the current default.
const ESTIMATED_DURATIONS: Record<string, number> = {
    'nb2-05k': ETA_MATRIX_MS['openai']['nb2-05k']!.medium!,
    'nb2-1k':  ETA_MATRIX_MS['openai']['nb2-1k']!.medium!,
    'nb2-2k':  ETA_MATRIX_MS['openai']['nb2-2k']!.medium!,
    'nb2-4k':  ETA_MATRIX_MS['openai']['nb2-4k']!.medium!,
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



export const useGeneration = ({
    rows, setRows, user, userProfile, credits, setCredits,
    qualityMode, isAuthDisabled, selectAndSnap, activeIdRef, setIsSettingsOpen, showToast, t, confirm, onImageSaved, onGenerationComplete, onSignIn
}: UseGenerationProps) => {
    const attachedJobIds = React.useRef<Set<string>>(new Set());
    // Track startTime per jobId so we can record actual duration on completion
    const jobTimingRef = React.useRef<Record<string, { startTime: number }>>({});
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

    const pollForJob = useCallback(async (jobId: string, quality?: string) => {
        if (attachedJobIds.current.has(jobId)) return;
        attachedJobIds.current.add(jobId);

        // Server (edge function + pg_cron) owns all job state — client just polls.
        // pg_cron marks failed after 8 min; we poll for up to 10 min as a safety net.
        const maxAttempts = 120; // 120 × 5s = 600s (10 min)

        let attempts = 0;
        let googleOverloadWarningShown = false; // show yellow toast only once per job

        const poll = async () => {
            attempts++;
            if (attempts > maxAttempts) {
                // Same race-guard as the failed-status path: maybe the image landed
                // *just* as we were giving up — don't show a refund toast then.
                const { data: lateImg } = await supabase
                    .from('images')
                    .select('id')
                    .eq('id', jobId)
                    .maybeSingle();
                if (lateImg) {
                    setTimeout(poll, 200);
                    return;
                }
                // 10 min ceiling reached — stop polling, server/pg_cron will clean up
                setRows(prev => prev.map(row => ({ ...row, items: row.items.filter(i => i.id !== jobId) })).filter(r => r.items.length > 0));
                attachedJobIds.current.delete(jobId);
                showToast(translateError('timeout', t), 'error');
                return;
            }

            // 1. Check if image exists in DB
            const { data: imgData } = await supabase
                .from('images')
                .select('*')
                .eq('id', jobId)
                .maybeSingle();

            if (imgData) {
                // Write actual duration_ms to generation_jobs for analytics
                const timing = jobTimingRef.current[jobId];
                if (timing) {
                    const actualMs = Date.now() - timing.startTime;
                    supabase.from('generation_jobs')
                        .update({ duration_ms: Math.round(actualMs) })
                        .eq('id', jobId)
                        .then(({ error }) => {
                            if (error) {
                                logError(`generation_jobs duration UPDATE failed: ${error.message}`, {
                                    source: 'silent',
                                    context: `poll-complete:${jobId}`,
                                });
                            }
                        });
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

                // Increment total image count in settings
                onImageSaved?.();
                onGenerationComplete?.(jobId);
                trackImageGenerated();

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
                showToast(t('warning_google_overload'), 'error');
            }

            if (jobData?.status === 'failed') {
                // Race-condition guard: edge function may have *just* finished and inserted
                // into images while the watchdog (or another cleanup) had already flipped the
                // job row to failed. Do a final image-existence check before showing the
                // user a refund toast — if the image is there, it's a success, not a failure.
                const { data: lateImg } = await supabase
                    .from('images')
                    .select('id')
                    .eq('id', jobId)
                    .maybeSingle();
                if (lateImg) {
                    // Bail out of the failure path — the next poll iteration (or the next
                    // useEffect tick) will pick up the image and switch the placeholder to
                    // the real result. Just stop attaching to this job here.
                    setTimeout(poll, 200);
                    return;
                }

                const jobError = (jobData as any).error || "";
                setRows(prev => prev.map(row => ({ ...row, items: row.items.filter(i => i.id !== jobId) })).filter(r => r.items.length > 0));
                attachedJobIds.current.delete(jobId);
                showToast(translateError(jobError, t), "error");
                return;
            }

            // 3. Continue polling
            setTimeout(poll, 5000);
        };

        poll();
    }, [setRows, user, t, showToast]);

    React.useEffect(() => {
        const generatingIds = rows.flatMap(r => r.items)
            // Only true generation placeholders should be polled.
            // Upload skeletons also use isGenerating for shimmer UI, but they do not
            // have generationStartTime and must never trigger generation-complete flows.
            .filter(i => i.isGenerating && !!i.generationStartTime)
            .map(i => i.id);

        rows.flatMap(r => r.items)
            .filter(i => i.isGenerating && !!i.generationStartTime)
            .forEach(item => {
                if (!attachedJobIds.current.has(item.id)) {
                    navigateOnCompleteIds.current.add(item.id);
                    pollForJob(item.id, item.quality as string | undefined);
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
        isRepeat?: boolean
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

        const effectiveQuality = qualityMode;
        const cost = COSTS[effectiveQuality];
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

        // 2. CONCURRENCY & DURATION — simple hardcoded values per quality
        // ETA uses the user's current settings (provider × resolution × quality) so
        // the progress bar reflects the actual speed of *this* model+config, not
        // just a rough resolution-based guess.
        const settings = loadGenerationSettings();
        const estimatedDuration = getEtaMs(settings.provider, effectiveQuality, settings.quality);

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
            annotations: [], // Generated results start blank — reference images stay on the source image
            parentId: sourceImage.id,
            folderId: sourceImage.folderId ?? sourceImage.id, // Inherit stack root — never changes
            generationPrompt: prompt,
            // Store full request body on the child so "Mehr" can replay it exactly.
            // userDraftPrompt stores the user-facing prompt so SideSheet can display it when revisiting.
            userDraftPrompt: draftPrompt || '',
            activeTemplateId: activeTemplateId,
            variableValues: variableValues,
            quality: effectiveQuality as GenerationQuality,
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
        jobTimingRef.current[newId] = { startTime: Date.now() };

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

                // If the source image is already stored in our storage (has storage_path),
                // skip client-side compression entirely — the edge function downloads the
                // original bytes via admin storage, which avoids JPEG recompression quality
                // loss (especially important for cascaded "More" generations).
                // For fresh uploads / blob URLs, fall back to client-side compression.
                const useStoragePath = !!(sourceImage.storage_path && !sourceImage.src?.startsWith('blob:'));
                let originalImageForRequest: string | undefined;
                if (!useStoragePath && sourceImage.src) {
                    try {
                        const blob = await compressImage(sourceImage.src, 3840, 0.7);
                        originalImageForRequest = await new Promise<string>(resolve => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });
                    } catch (err) {
                        console.warn('[useGeneration] Client compress failed, using URL fallback:', err);
                        originalImageForRequest = sourceImage.src;
                    }
                }

                const structuredRequest: StructuredGenerationRequest = {
                    type: 'edit',
                    prompt: prompt,
                    variables: variableValues || {},
                    originalImage: originalImageForRequest,
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
                            batchSize,
                            isMultiEdit: batchSize > 1,
                            isRepeat: !!isRepeat,
                            variables: variableValues || {},
                        }
                    }).then(({ error }) => {
                        if (error) {
                            // CRITICAL: if this INSERT fails, the edge function's
                            // UPDATE will match 0 rows and the job will be invisible
                            // in the admin panel even if generation succeeds.
                            logError(`generation_jobs INSERT failed (edit): ${error.message} [code=${error.code ?? '?'}]`, {
                                source: 'silent',
                                context: `edit:${newId}:user=${currentUser.id}`,
                            });
                            showToast(`Job-Tracking fehlgeschlagen (${error.code ?? 'unknown'}) — generiere trotzdem, kontaktiere Admin`, 'error', 8000);
                        }
                    });
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
                    isRepeat: !!isRepeat,
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
                    trackImageGenerated();
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
                    supabase.from('generation_jobs').delete().eq('id', newId).eq('user_id', currentUser.id)
                        .then(({ error }) => {
                            if (error) {
                                logError(`generation_jobs cleanup DELETE failed: ${error.message}`, {
                                    source: 'silent',
                                    context: `edit-cleanup:${newId}`,
                                });
                            }
                        });
                }

                const translated = translateError(error.message || String(error), t);
                showToast(translated, "error");
                // Credits were NOT deducted locally (upfront) — server handles refund automatically.
            }
        };

        // No client-side retry or quality-downgrade: server (Edge Function) handles
        // Google → Kie fallback transparently. If both fail, we surface the error.
        processGenerationAsync();
    }, [rows, setRows, user, userProfile, credits, setCredits, qualityMode, isAuthDisabled, selectAndSnap, setIsSettingsOpen, showToast, t, confirm]);


    const performNewGeneration = useCallback(async (prompt: string, modelId: string, ratio: string, attachments: string[] = []) => {
        const effectiveModelId = modelId;
        const cost = COSTS[effectiveModelId] || 0;
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
            estimatedDuration: getEtaMs(loadGenerationSettings().provider, modelId, loadGenerationSettings().quality),
        };
        setRows(prev => [{ id: generateId(), title: baseName, items: [placeholder], createdAt: Date.now() }, ...prev]);
        // Track start time so we can record actual duration on completion
        jobTimingRef.current[newId] = { startTime: Date.now() };
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
                    }).then(({ error }) => {
                        if (error) {
                            logError(`generation_jobs INSERT failed (create): ${error.message} [code=${error.code ?? '?'}]`, {
                                source: 'silent',
                                context: `create:${newId}:user=${user.id}`,
                            });
                            showToast(`Job-Tracking fehlgeschlagen (${error.code ?? 'unknown'}) — generiere trotzdem, kontaktiere Admin`, 'error', 8000);
                        }
                    });
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
                    // Synchronous completion (legacy path) — write actual duration to DB
                    const t0 = jobTimingRef.current[newId];
                    if (t0) {
                        const actualMs = Date.now() - t0.startTime;
                        supabase.from('generation_jobs')
                            .update({ duration_ms: Math.round(actualMs) })
                            .eq('id', newId)
                            .then(({ error }) => {
                                if (error) {
                                    logError(`generation_jobs duration UPDATE failed (create): ${error.message}`, {
                                        source: 'silent',
                                        context: `create-complete:${newId}`,
                                    });
                                }
                            });
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
                    trackImageGenerated();
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
                    supabase.from('generation_jobs').delete().eq('id', newId).eq('user_id', user.id)
                        .then(({ error }) => {
                            if (error) {
                                logError(`generation_jobs cleanup DELETE failed (create): ${error.message}`, {
                                    source: 'silent',
                                    context: `create-cleanup:${newId}`,
                                });
                            }
                        });
                }

                const translated = translateError(error.message || "", t);
                showToast(translated, "error");
                // Credits were NOT deducted locally (upfront) — server handles refund automatically.
            }
        };

        // No client-side retry or quality-downgrade — server handles Google→Kie fallback.
        processNewSync();
    }, [user, userProfile, credits, setCredits, isAuthDisabled, setRows, selectAndSnap, showToast, t, confirm]);


    return { performGeneration, performNewGeneration };
};
