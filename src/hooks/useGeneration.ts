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
    showToast: (msg: string, type: "success" | "error") => void;
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
    qualityMode, isAuthDisabled, selectAndSnap, setIsSettingsOpen, showToast
}: UseGenerationProps) => {

    const performGeneration = async (sourceImage: CanvasImage, prompt: string, batchSize: number = 1) => {
        const cost = COSTS[qualityMode];
        const isPro = userProfile?.role === 'pro';

        if (!isPro && credits < cost) { setIsSettingsOpen(true); return; }

        const rowIndex = rows.findIndex(row => row.items.some(item => item.id === sourceImage.id));
        if (rowIndex === -1) return;

        // Debit Credits
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && !isPro) {
            await supabase.from('profiles').update({ credits: credits - cost }).eq('id', currentUser.id);
        }
        if (!isPro) {
            setCredits(prev => prev - cost);
        }

        const maskDataUrl = await generateMaskFromAnnotations(sourceImage);
        const baseName = sourceImage.baseName || sourceImage.title;

        const row = rows[rowIndex];
        const siblings = row.items.filter(i => (i.baseName || i.title).startsWith(baseName));
        const maxVersion = siblings.reduce((max, item) => Math.max(max, item.version || 1), 0);
        const newVersion = maxVersion + 1;
        const newId = generateId();

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
                await supabase.from('generation_jobs').insert({
                    id: newId,
                    user_id: currentUser.id,
                    user_name: currentUser.email,
                    type: maskDataUrl ? 'Inpaint' : 'Style',
                    model: qualityMode,
                    status: 'processing',
                    cost: cost,
                    prompt: prompt,
                    concurrent_jobs: currentConcurrency
                }).select().single();
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

        setTimeout(() => selectAndSnap(newId), 50);

        try {
            const finalImage = await imageService.processGeneration({
                sourceImage,
                prompt,
                qualityMode,
                maskDataUrl: maskDataUrl || undefined,
                newId,
                modelName: qualityMode
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

                if (currentUser && !isAuthDisabled) {
                    await imageService.persistImage(finalImage, currentUser.id);
                }
            } else {
                throw new Error("Generation returned no image");
            }
        } catch (error: any) {
            console.error("Generation failed:", error);
            showToast(`Generation failed: ${error.message}`, "error");

            setRows(prev => {
                const newRows = prev.map(r => ({
                    ...r,
                    items: r.items.filter(i => i.id !== newId)
                })).filter(r => r.items.length > 0);
                return newRows;
            });

            if (!isPro) {
                setCredits(prev => prev + cost);
                try {
                    const { data: { user: refundUser } } = await supabase.auth.getUser();
                    if (refundUser) {
                        await supabase.from('profiles').update({ credits: credits }).eq('id', refundUser.id);
                    }
                } catch (e) { console.error("Refund failed", e); }
            }
        }
    };

    return { performGeneration };
};
