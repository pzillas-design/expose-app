import React from 'react';
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
    selectAndSnap: (id: string) => void;
    setIsSettingsOpen: (open: boolean) => void;
    showToast: (msg: string, type: "success" | "error", duration?: number) => void;
    currentBoardId: string | null;
    t: (key: any) => string;
}

const COSTS: Record<string, number> = {
    'fast': 0.00,
    'pro-1k': 0.50,
    'pro-2k': 1.00,
    'pro-4k': 2.00
};

const ESTIMATED_DURATIONS: Record<string, number> = {
    'fast': 12000,
    'pro-1k': 23000,
    'pro-2k': 36000,
    'pro-4k': 60000
};

export const useGeneration = ({
    rows, setRows, user, userProfile, credits, setCredits,
    qualityMode, isAuthDisabled, selectAndSnap, setIsSettingsOpen, showToast, currentBoardId, t
}: UseGenerationProps) => {

    const performGeneration = async (sourceImage: CanvasImage, prompt: string, batchSize: number = 1) => {
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

        const baseName = sourceImage.baseName || sourceImage.title;
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
        const baseDuration = ESTIMATED_DURATIONS[qualityMode] || 23000;
        const estimatedDuration = Math.round(baseDuration * (1 + (currentConcurrency - 1) * 0.3));

        const placeholder: CanvasImage = {
            ...sourceImage,
            id: newId,
            title: `${baseName}_v${newVersion}`,
            version: newVersion,
            isGenerating: true,
            generationStartTime: Date.now(),
            maskSrc: undefined,
            annotations: [],
            parentId: sourceImage.id,
            generationPrompt: prompt,
            userDraftPrompt: '',
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
                    type: maskDataUrl ? 'Inpaint' : 'Style',
                    model: qualityMode,
                    status: 'processing',
                    cost: cost,
                    prompt: prompt,
                    concurrent_jobs: currentConcurrency,
                    board_id: currentBoardId
                });
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
        setTimeout(() => {
            selectAndSnap(newId);
        }, 150);

        try {
            const finalImage = await imageService.processGeneration({
                sourceImage,
                prompt,
                qualityMode,
                maskDataUrl: maskDataUrl || undefined,
                newId,
                boardId: currentBoardId || undefined
                // modelName removed as server handles mapping
            });

            if (finalImage) {
                setRows(prev => {
                    const newRows = [...prev];
                    const rIdx = newRows.findIndex(r => r.items.some(i => i.id === newId));
                    if (rIdx !== -1) {
                        const r = newRows[rIdx];
                        const updatedItems = r.items.map(i => i.id === newId ? finalImage : i);
                        newRows[rIdx] = { ...r, items: updatedItems };
                    }
                    return newRows;
                });

                // NO NEED to persistImage here - Server already did it!
            } else {
                throw new Error("Generation returned no image");
            }
        } catch (error: any) {
            console.error("Generation failed:", error);
            showToast(`${t('generation_failed')}: ${error.message || error}`, "error");

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
    };

    const performNewGeneration = async (prompt: string, modelId: string, ratio: string) => {
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

        const placeholder: CanvasImage = {
            id: newId,
            src: '',
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
            annotations: [],
            boardId: currentBoardId || undefined
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
                    board_id: currentBoardId
                });
            }

            const finalImage = await imageService.processGeneration({
                sourceImage: placeholder,
                prompt,
                qualityMode: modelId,
                newId,
                boardId: currentBoardId || undefined
            });

            if (finalImage) {
                setRows(prev => {
                    const newRows = [...prev];
                    const rIdx = newRows.findIndex(r => r.items.some(i => i.id === newId));
                    if (rIdx !== -1) {
                        const r = newRows[rIdx];
                        const updatedItems = r.items.map(i => i.id === newId ? finalImage : i);
                        newRows[rIdx] = { ...r, items: updatedItems };
                    }
                    return newRows;
                });
            }
        } catch (error: any) {
            console.error("New Generation failed:", error);
            showToast(`${t('generation_failed')}: ${error.message}`, "error", 6000);

            setRows(prev => prev.filter(r => !r.items.some(i => i.id === newId)));

            if (!isPro) {
                setCredits(prev => prev + cost);
                // Optional: Refund DB update
            }
        }
    };

    return { performGeneration, performNewGeneration };
};
