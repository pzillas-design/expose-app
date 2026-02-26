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
    showToast: (msg: string, type: "success" | "error", duration?: number) => void;
    t: (key: any) => string;
    confirm: (options: { title?: string; description?: string; confirmLabel?: string; cancelLabel?: string; variant?: 'danger' | 'primary' }) => Promise<boolean>;
}

const COSTS: Record<string, number> = {
    'pro-1k': 0.10,
    'pro-2k': 0.25,
    'pro-4k': 0.50
};

const ESTIMATED_DURATIONS: Record<string, number> = {
    'pro-1k': 23000,
    'pro-2k': 36000,
    'pro-4k': 60000
};

// Map quality modes to model names for historical lookup
const QUALITY_TO_MODEL: Record<string, string> = {
    'pro-1k': 'google/nano-banana-pro',
    'pro-2k': 'google/nano-banana-pro',
    'pro-4k': 'google/nano-banana-pro'
};

const resolveTargetModel = (quality: string): string | undefined => {
    return QUALITY_TO_MODEL[quality];
};

// HELPER: Map technical errors to user-friendly German
const translateError = (errorMsg: string): string => {
    if (!errorMsg) return "Unbekannter Fehler.";

    const msg = errorMsg.toLowerCase();

    if (msg.includes("cold start") || msg.includes("timeout")) {
        return "Timeout. Bitte erneut versuchen.";
    } else if (msg.includes("nsfw") || msg.includes("safety")) {
        return "Inhalt abgelehnt (Sicherheitsfilter).";
    } else if (msg.includes("credits") || msg.includes("payment required") || msg.includes("402")) {
        return "Guthaben nicht ausreichend.";
    } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) {
        return "Netzwerkfehler.";
    } else if (msg.includes("invalid") || msg.includes("bad request") || msg.includes("400")) {
        return "Fehler in der Anfrage.";
    }

    return errorMsg.length > 60 ? errorMsg.substring(0, 60) + "..." : errorMsg;
};

// Cache for smart estimates (simple in-memory cache)
let smartEstimatesCache: Record<string, {
    baseDurationMs: number;
    concurrencyFactor: number;
    sampleCount: number;
}> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes


export const useGeneration = ({
    rows, setRows, user, userProfile, credits, setCredits,
    qualityMode, isAuthDisabled, selectAndSnap, setIsSettingsOpen, showToast, t, confirm
}: UseGenerationProps) => {
    const attachedJobIds = React.useRef<Set<string>>(new Set());

    const pollForJob = useCallback(async (jobId: string) => {
        if (attachedJobIds.current.has(jobId)) return;
        attachedJobIds.current.add(jobId);

        let attempts = 0;
        const maxAttempts = 60; // 5 minutes at 5s interval

        const poll = async () => {
            attempts++;
            if (attempts > maxAttempts) {
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
                const finalImage = await imageService.resolveImageRecord(imgData);
                const cacheBuster = `?t=${Date.now()}`;

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
                const translated = translateError(jobError);
                showToast(translated, "error");
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
        let estimatedDuration: number;
        const nowMs = Date.now();
        if (smartEstimatesCache && (nowMs - cacheTimestamp) < CACHE_TTL && smartEstimatesCache[qualityMode]) {
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
            userDraftPrompt: '',
            activeTemplateId: undefined,
            variableValues: undefined,
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

        if (shouldSnap) {
            setTimeout(() => selectAndSnap(newId), 50);
        }

        // --- ASYNC PROCESSING STARTS HERE ---

        // Debit Credits Locally (for immediate UX)
        if (!isPro) {
            setCredits(prev => prev - cost);
        }

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
                        user_name: currentUser.email,
                        type: maskDataUrl ? 'Edit' : 'Create',
                        model: qualityMode,
                        status: 'processing',
                        cost: cost,
                        prompt: prompt,
                        concurrent_jobs: currentConcurrency,
                        parent_id: sourceImage.id
                    }).then(() => attachedJobIds.current.add(newId));
                }

                const timeoutMs = batchSize > 1 ? 600000 : 180000;
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Timeout (${timeoutMs / 60000}m)`)), timeoutMs);
                });

                const finalImage = await Promise.race([
                    imageService.processGeneration({
                        payload: structuredRequest,
                        sourceImage,
                        qualityMode,
                        modelName: resolveTargetModel(qualityMode),
                        newId,
                        targetVersion: newVersion,
                        targetTitle: placeholder.title
                    }),
                    timeoutPromise
                ]) as CanvasImage;

                if (finalImage) {
                    const cacheBuster = `?t=${Date.now()}`;
                    const refreshedImage = {
                        ...finalImage,
                        src: finalImage.src.includes('?') ? `${finalImage.src}&refreshed=true` : `${finalImage.src}${cacheBuster}`
                    };

                    setRows(prev => prev.map(row => ({
                        ...row,
                        items: row.items.map(i => i.id === newId ? refreshedImage : i)
                    })));
                }
            } catch (error: any) {
                console.error("Generation failed:", error);
                const translated = translateError(error.message || error);
                showToast(translated, "error");

                setRows(prev => prev.map(row => ({
                    ...row,
                    items: row.items.filter(i => i.id !== newId)
                })).filter(row => row.items.length > 0));

                if (currentUser && !isAuthDisabled) {
                    supabase.from('generation_jobs').delete().eq('id', newId).eq('user_id', currentUser.id);
                }

                if (!isPro && cost > 0) {
                    setCredits(prev => {
                        const newCredits = prev + cost;
                        if (currentUser) { // Only try to update if currentUser is defined
                            supabase.from('profiles').update({ credits: newCredits }).eq('id', currentUser.id);
                        }
                        return newCredits;
                    });

                    confirm({
                        title: t('generation_failed_title'),
                        description: `${translated}\n${t('generation_failed_desc').replace('{{amount}}', `${cost.toFixed(2)} €`)}`,
                        confirmLabel: t('retry'),
                        variant: 'primary'
                    }).then(shouldRetry => {
                        if (shouldRetry) performGeneration(sourceImage, prompt, batchSize, shouldSnap, draftPrompt, activeTemplateId, variableValues, customReferenceInstructions);
                    });
                }
            }
        };

        processGenerationAsync();
    }, [rows, setRows, user, userProfile, credits, setCredits, qualityMode, isAuthDisabled, selectAndSnap, setIsSettingsOpen, showToast, t, confirm]);


    const performNewGeneration = useCallback(async (prompt: string, modelId: string, ratio: string, attachments: string[] = []) => {
        const cost = COSTS[modelId] || 0;
        const isPro = userProfile?.role === 'pro';

        if (!isPro && credits < cost) { setIsSettingsOpen(true); return; }

        if (!isPro) {
            setCredits(prev => prev - cost);
        }

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

        setRows(prev => [...prev, { id: generateId(), title: baseName, items: [placeholder], createdAt: Date.now() }]);
        setTimeout(() => selectAndSnap(newId), 50);

        const processNewSync = async () => {
            try {
                if (user && !isAuthDisabled) {
                    supabase.from('generation_jobs').insert({
                        status: 'processing', cost, prompt
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
                    setRows(prev => prev.map(row => ({ ...row, items: row.items.map(i => i.id === newId ? finalImage : i) })));
                }
            } catch (error: any) {
                const translated = translateError(error.message || "");
                showToast(translated, "error");
                setRows(prev => prev.filter(r => !r.items.some(i => i.id === newId)));
                if (!isPro) {
                    setCredits(prev => prev + cost);
                    confirm({
                        title: t('generation_failed_title'),
                        description: `${translated}\n${t('generation_failed_desc').replace('{{amount}}', `${cost.toFixed(2)} €`)}`,
                        confirmLabel: t('retry'),
                        variant: 'primary'
                    }).then(shouldRetry => { if (shouldRetry) performNewGeneration(prompt, modelId, ratio, attachments); });
                }
            }
        };

        processNewSync();
    }, [user, userProfile, credits, setCredits, isAuthDisabled, setRows, selectAndSnap, showToast, t, confirm]);


    return { performGeneration, performNewGeneration };
};
