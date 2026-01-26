import React, { useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { imageService } from '@/services/imageService';
import { generateMaskFromAnnotations } from '@/utils/maskGenerator';
import { generateId } from '@/utils/ids';
import { CanvasImage, ImageRow, GenerationQuality } from '@/types';

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
    currentBoardId: string | null;
    t: (key: any) => string;
}

const COSTS: Record<string, number> = {
    'fast': 0.00,
    'pro-1k': 0.10,
    'pro-2k': 0.25,
    'pro-4k': 0.50
};

const ESTIMATED_DURATIONS: Record<string, number> = {
    'fast': 12000,
    'pro-1k': 23000,
    'pro-2k': 36000,
    'pro-4k': 60000
};

// Map quality modes to model names for historical lookup
const QUALITY_TO_MODEL: Record<string, string> = {
    'fast': 'gemini-2.5-flash-image',
    'pro-1k': 'gemini-3-pro-image-preview',
    'pro-2k': 'gemini-3-pro-image-preview',
    'pro-4k': 'gemini-3-pro-image-preview'
};

const resolveTargetModel = (quality: string): string | undefined => {
    return undefined; // Reverted to let backend handle everything (Gemini)
};

// HELPER: Map technical errors to user-friendly German
const translateError = (errorMsg: string): string => {
    if (!errorMsg) return "Ein unbekannter Fehler ist aufgetreten.";

    // Lowercase for easier matching
    const msg = errorMsg.toLowerCase();
    let header = "";

    if (msg.includes("cold start") || msg.includes("timeout")) {
        header = "Die Generierung hat zu lange gedauert (Modell-Kaltstart). Bitte versuch es gleich noch einmal.";
    } else if (msg.includes("nsfw") || msg.includes("safety")) {
        header = "Der Inhalt wurde von den Sicherheitsfiltern abgelehnt. Bitte passe deinen Prompt an.";
    } else if (msg.includes("credits") || msg.includes("payment required") || msg.includes("402")) {
        header = "Nicht genügend Guthaben vorhanden.";
    } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) {
        header = "Verbindung zum Server fehlgeschlagen. Bitte prüfe dein Internet.";
    } else if (msg.includes("invalid") || msg.includes("bad request") || msg.includes("400")) {
        header = "Fehler in der Anfrage.";
    } else {
        return `Fehler: ${errorMsg}`;
    }

    return `${header} (Original: ${errorMsg})`;
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
    qualityMode, isAuthDisabled, selectAndSnap, setIsSettingsOpen, showToast, currentBoardId, t
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
                .from('canvas_images')
                .select('*')
                .eq('id', jobId)
                .maybeSingle();

            if (imgData) {
                const finalImage = await imageService.resolveImageRecord(imgData);
                const cacheBuster = `?t=${Date.now()}`;
                const refreshedImage = {
                    ...finalImage,
                    src: finalImage.src.includes('?') ? `${finalImage.src}&refreshed=true` : `${finalImage.src}${cacheBuster}`
                };

                setRows(prev => prev.map(row => ({
                    ...row,
                    items: row.items.map(item => item.id === jobId ? refreshedImage : item)
                })));

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
        variableValues?: Record<string, string[]>
    ) => {
        const cost = COSTS[qualityMode];
        const isPro = userProfile?.role === 'pro';

        if (!isPro && credits < cost) { setIsSettingsOpen(true); return; }

        const rowIndex = rows.findIndex(row => row.items.some(item => item.id === sourceImage.id));
        if (rowIndex === -1) return;

        // Debit Credits Locally (for immediate UX)
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!isPro) {
            setCredits(prev => prev - cost);
        }

        const maskDataUrl = await generateMaskFromAnnotations(sourceImage);

        // CLEAN baseName: Remove any existing version suffix to group siblings correctly
        // e.g. "Puppy_v2" -> "Puppy". This ensures v2 finds "Puppy" (v1) and correctly increments to v3.
        const rawBaseName = sourceImage.baseName || sourceImage.title || 'Image';
        const baseName = rawBaseName.replace(/_v\d+$/, '');

        const newId = generateId();

        // Debug: Upload mask to storage so user can inspect it later
        if (maskDataUrl && currentUser && !isAuthDisabled) {
            const { storageService } = await import('@/services/storageService');
            storageService.uploadImage(maskDataUrl, currentUser.id, `${newId}_mask.png`)
                .catch(e => console.warn("Debug: Failed to save mask", e));
        }

        const row = rows[rowIndex];
        const siblings = row.items.filter(i => (i.baseName || i.title).startsWith(baseName));
        const maxVersion = siblings.reduce((max, item) => Math.max(max, item.version || 1), 0);
        const newVersion = maxVersion + 1;

        const activeCount = rows.flatMap(r => r.items).filter(i => i.isGenerating).length;
        const currentConcurrency = activeCount + batchSize;

        // Calculate smart duration estimate using cached data
        let estimatedDuration: number;

        // Check if we have smart estimates for this quality mode
        const now = Date.now();
        if (smartEstimatesCache && (now - cacheTimestamp) < CACHE_TTL && smartEstimatesCache[qualityMode]) {
            const estimate = smartEstimatesCache[qualityMode];
            let duration = estimate.baseDurationMs || ESTIMATED_DURATIONS[qualityMode] || 23000;

            // Apply concurrency factor (measured from real data)
            const concurrencyFactor = estimate.concurrencyFactor || 0.3;
            duration *= (1 + concurrencyFactor * currentConcurrency);

            estimatedDuration = Math.round(duration);
        } else {
            // Fallback to hardcoded estimate with simple linear concurrency
            const baseDuration = ESTIMATED_DURATIONS[qualityMode] || 23000;
            estimatedDuration = Math.round(baseDuration * (1 + 0.3 * currentConcurrency));
        }

        const placeholder: CanvasImage = {
            ...sourceImage,
            id: newId,
            title: `${baseName}_v${newVersion}`,
            version: newVersion,
            isGenerating: true,
            generationStartTime: Date.now(),
            maskSrc: undefined,
            thumbSrc: sourceImage.thumbSrc, // Explicitly preserve thumbnail for blurry preview
            src: sourceImage.src, // Explicitly preserve source for blurry preview
            annotations: sourceImage.annotations || [], // KEEP annotations for reference images
            parentId: sourceImage.id,
            generationPrompt: prompt, // Snapshot for Info tab
            userDraftPrompt: '', // Clean prompt field
            activeTemplateId: undefined, // No preset carried over
            variableValues: undefined, // No variables carried over
            quality: qualityMode,
            estimatedDuration,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        if (currentUser && !isAuthDisabled) {
            try {
                // Log the job as 'processing' - The Edge function will update this to 'completed'
                await supabase.from('generation_jobs').insert({
                    id: newId,
                    user_id: currentUser.id,
                    user_name: currentUser.email,
                    type: maskDataUrl ? 'Edit' : 'Create',
                    model: qualityMode,
                    status: 'processing',
                    cost: cost,
                    prompt: prompt,
                    concurrent_jobs: currentConcurrency,
                    board_id: currentBoardId || null
                });
                attachedJobIds.current.add(newId);
            } catch (dbErr) {
                console.warn("Failed to log generation job:", dbErr);
            }
        }

        setRows(prev => {
            const newRows = [...prev];
            const correctRowIndex = newRows.findIndex(r => r.items.some(i => i.id === sourceImage.id));
            if (correctRowIndex === -1) return prev;
            const currentRow = newRows[correctRowIndex];
            const newItems = [...currentRow.items, placeholder];
            newRows[correctRowIndex] = { ...currentRow, items: newItems };
            return newRows;
        });

        // Use a slightly longer timeout to ensure React has finished rendering the new image element
        if (shouldSnap) {
            setTimeout(() => {
                selectAndSnap(newId);
            }, 150);
        }

        // Wrap generation in a timeout to prevent hanging skeletons
        // Use 3min for single, 10min for batch generations
        const timeoutMs = batchSize > 1 ? 600000 : 180000;
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Generation timeout (${timeoutMs / 60000} minutes)`)), timeoutMs);
        });

        try {
            const finalImage = await Promise.race([
                imageService.processGeneration({
                    sourceImage,
                    prompt,
                    qualityMode,
                    // Inject model override for staging
                    modelName: resolveTargetModel(qualityMode),
                    maskDataUrl: maskDataUrl || undefined,
                    newId,
                    boardId: currentBoardId || undefined,
                    targetVersion: newVersion,
                    targetTitle: placeholder.title
                }),
                timeoutPromise
            ]) as CanvasImage;

            if (finalImage) {
                // Add cache busting to ensure the new image loads immediately
                const cacheBuster = `?t=${Date.now()}`;
                const refreshedImage = {
                    ...finalImage,
                    src: finalImage.src.includes('?') ? `${finalImage.src}&refreshed=true` : `${finalImage.src}${cacheBuster}`
                };

                setRows(prev => {
                    return prev.map(row => ({
                        ...row,
                        items: row.items.map(i => i.id === newId ? refreshedImage : i)
                    }));
                });

                // Success: record preserved
            } else {
                throw new Error("Generation returned no image");
            }
        } catch (error: any) {
            console.error("Generation failed:", error);
            const translated = translateError(error.message || error);
            showToast(translated, "error");

            // Cleanup: remove the failed placeholder from rows
            setRows(prev => {
                const newRows = prev.map(row => ({
                    ...row,
                    items: row.items.filter(i => i.id !== newId)
                })).filter(row => row.items.length > 0);
                return newRows;
            });

            // Deep Cleanup: Delete from DB if auth is enabled
            if (user && !isAuthDisabled) {
                supabase.from('generation_jobs')
                    .delete()
                    .eq('id', newId)
                    .eq('user_id', user.id)
                    .then(({ error }) => {
                        if (error) console.warn("Failed to clean up failed job row from DB:", error);
                    });
            }

            if (!isPro && cost > 0) {
                setCredits(prev => {
                    const newCredits = prev + cost;
                    // Try to sync with DB, but don't block if it fails (the 500 you saw)
                    supabase.from('profiles')
                        .update({ credits: newCredits })
                        .eq('id', user.id)
                        .then(({ error }) => {
                            if (error) console.warn("Refund DB update failed (likely RLS):", error);
                        });
                    return newCredits;
                });
            }
        }
    }, [rows, setRows, user, userProfile, credits, setCredits, qualityMode, isAuthDisabled, selectAndSnap, setIsSettingsOpen, showToast, currentBoardId, t]);


    const performNewGeneration = useCallback(async (prompt: string, modelId: string, ratio: string, attachments: string[] = []) => {
        const cost = COSTS[modelId] || 0;
        const isPro = userProfile?.role === 'pro';

        if (!isPro && credits < cost) { setIsSettingsOpen(true); return; }

        if (!isPro) {
            setCredits(prev => prev - cost);
        }

        const newId = generateId();
        const baseName = t('new_generation') || 'Generation';

        // Correctly calculate resolution based on Model & Ratio
        let baseSize = 1024;
        if (modelId === 'pro-2k') baseSize = 2048;
        if (modelId === 'pro-4k') baseSize = 4096;

        let wRatio = 1, hRatio = 1;
        const parts = ratio.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            wRatio = parts[0];
            hRatio = parts[1];
        }

        let realWidth = baseSize;
        let realHeight = baseSize;

        // Scale fitting the base size to the longest edge
        if (wRatio >= hRatio) {
            // Landscape or Square
            realWidth = baseSize;
            realHeight = Math.round(baseSize * (hRatio / wRatio));
        } else {
            // Portrait
            realHeight = baseSize;
            realWidth = Math.round(baseSize * (wRatio / hRatio));
        }

        // Display dimensions (normalized to 512px height for UI consistency)
        const displayHeight = 512;
        const displayWidth = (realWidth / realHeight) * displayHeight;

        // Map attachments to annotations format for the Edge function
        const creationAnns: any[] = attachments.map(src => ({
            id: generateId(),
            type: 'reference_image',
            referenceImage: src,
            points: [],
            strokeWidth: 0,
            color: '#000000',
            x: 0, y: 0, width: 0, height: 0 // Not used for global refs
        }));

        const placeholder: CanvasImage = {
            id: newId,
            src: '',
            storage_path: '',
            width: displayWidth,
            height: displayHeight,
            realWidth,
            realHeight,
            title: baseName,
            baseName: baseName,
            version: 1,
            isGenerating: true,
            generationStartTime: Date.now(),
            quality: modelId as any,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            generationPrompt: prompt,
            userDraftPrompt: '',
            annotations: creationAnns,
            boardId: currentBoardId || undefined,
            userId: user?.id
        };

        const newRow: ImageRow = {
            id: generateId(),
            title: baseName,
            items: [placeholder],
            createdAt: Date.now()
        };

        // Appending to end implies newest
        setRows(prev => [...prev, newRow]);

        setTimeout(() => {
            selectAndSnap(newId);
        }, 150);

        try {
            if (user && !isAuthDisabled) {
                await supabase.from('generation_jobs').insert({
                    id: newId,
                    user_id: user.id,
                    user_name: user.email,
                    type: 'Text2Img',
                    model: modelId,
                    status: 'processing',
                    cost: cost,
                    prompt: prompt,
                    board_id: currentBoardId || null
                });
            }

            // Wrap generation in a timeout to prevent hanging skeletons
            // Use 3min for single generation
            const timeoutMs = 180000;
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Generation timeout (${timeoutMs / 60000} minutes)`)), timeoutMs);
            });

            const finalImage = await Promise.race([
                imageService.processGeneration({
                    sourceImage: placeholder,
                    prompt,
                    qualityMode: modelId,
                    // Inject model override for staging
                    modelName: resolveTargetModel(modelId),
                    newId,
                    boardId: currentBoardId || undefined,
                    attachments,
                    aspectRatio: ratio // Explicitly pass the user-selected ratio string
                }),
                timeoutPromise
            ]) as CanvasImage;

            if (finalImage) {
                setRows(prev => {
                    return prev.map(row => ({
                        ...row,
                        items: row.items.map(i => i.id === newId ? finalImage : i)
                    }));
                });

                // Success: record preserved
            }
        } catch (error: any) {
            console.error("New Generation failed:", error);
            const translated = translateError(error.message || "");
            showToast(translated, "error", 6000);

            setRows(prev => prev.filter(r => !r.items.some(i => i.id === newId)));

            if (!isPro) {
                setCredits(prev => prev + cost);
            }
        }
    }, [user, userProfile, credits, setCredits, isAuthDisabled, setRows, selectAndSnap, showToast, currentBoardId, t]);


    return { performGeneration, performNewGeneration };
};
