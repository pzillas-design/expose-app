import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { ImageRow, CanvasImage } from '@/types';

/**
 * Auto-Save Hook
 * Automatically saves canvas state to Supabase every 30 seconds in the background.
 * Only saves when user is logged in and there are changes.
 */
export const useAutoSave = (
    rows: ImageRow[],
    user: any,
    isAuthDisabled: boolean
) => {
    const lastSavedRef = useRef<string>('');
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSavingRef = useRef(false);

    // Helper to extract saveable images
    const getImagesToSave = (currentRows: ImageRow[]): CanvasImage[] => {
        return currentRows.flatMap(r => r.items).filter(img => !img.isGenerating && img.src);
    };

    // Main Auto-Save Logic
    useEffect(() => {
        // For Beta (auth disabled): Use localStorage
        if (isAuthDisabled) {
            const currentState = JSON.stringify(rows);
            if (currentState === lastSavedRef.current) return;

            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

            saveTimeoutRef.current = setTimeout(() => {
                try {
                    console.log('[AutoSave] Saving to localStorage (Beta mode)...');
                    localStorage.setItem('beta_canvas_state', currentState);
                    lastSavedRef.current = currentState;
                    console.log('[AutoSave] Saved to localStorage successfully');
                } catch (err) {
                    console.error('[AutoSave] localStorage save failed:', err);
                }
            }, 5000);

            return () => {
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            };
        }

        // For Production (with auth): Use Supabase
        if (!user) return;

        // Skip if no changes
        const currentState = JSON.stringify(rows);
        if (currentState === lastSavedRef.current) return;

        // Skip if already saving
        if (isSavingRef.current) return;

        // Debounce: Only save every 30s
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                isSavingRef.current = true;
                const imagesToSave = getImagesToSave(rows);

                if (imagesToSave.length === 0) {
                    lastSavedRef.current = currentState; // Update ref even if empty to avoid loop
                    isSavingRef.current = false;
                    return;
                }

                console.log('[AutoSave] Starting save...');

                // Batch Upsert
                const payload = imagesToSave.map(img => {
                    const isBlob = img.src.startsWith('blob:');

                    // Skip blob images that haven't been persisted yet (no storage_path)
                    if (isBlob && !img.storage_path) {
                        return null;
                    }

                    return {
                        id: img.id,
                        user_id: user.id,
                        thumb_storage_path: (img.thumbSrc && !img.thumbSrc.startsWith('blob:') && !img.thumbSrc.startsWith('http')) ? img.thumbSrc : null,
                        storage_path: img.storage_path || '',
                        width: Math.round(img.width),
                        height: Math.round(img.height),
                        real_width: img.realWidth || img.width,
                        real_height: img.realHeight || img.height,
                        title: img.title,
                        base_name: img.baseName || img.title,
                        version: img.version || 1,
                        annotations: JSON.stringify(img.annotations || []),
                        prompt: img.generationPrompt || '',
                        user_draft_prompt: img.userDraftPrompt || '',
                        quality: img.quality || 'pro-1k',
                        parent_id: img.parentId || null,
                        created_at: new Date(img.createdAt).toISOString(),
                        updated_at: new Date().toISOString()
                    };
                }).filter((item): item is NonNullable<typeof item> => item !== null);

                if (payload.length > 0) {
                    const { error } = await supabase
                        .from('canvas_images')
                        .upsert(payload, { onConflict: 'id' });

                    if (error) {
                        console.error('[AutoSave] Error:', error);
                    } else {
                        console.log('[AutoSave] Saved', payload.length, 'images successfully');
                        lastSavedRef.current = currentState;
                    }
                } else {
                    // No valid payload (all blobs not yet persisted)
                    lastSavedRef.current = currentState;
                }
            } catch (err) {
                console.error('[AutoSave] Exception:', err);
            } finally {
                isSavingRef.current = false;
            }
        }, 30000); // 30 seconds

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [rows, user, isAuthDisabled]);

    // Force save on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

            // Trigger immediate save on unmount if we have unsaved work
            // Note: We can't easily check 'currentState vs lastSaved' here because of closure staleness,
            // but we can check if we have valuable data.
            // Ideally we blindly save on unmount to be safe.
            if (user && !isAuthDisabled && !isSavingRef.current) {
                const imagesToSave = rows.flatMap(r => r.items).filter(img => !img.isGenerating && img.src);

                if (imagesToSave.length > 0) {
                    const payload = imagesToSave.map(img => {
                        const isBlob = img.src.startsWith('blob:');
                        if (isBlob && !img.storage_path) return null;

                        return {
                            id: img.id,
                            user_id: user.id,
                            thumb_storage_path: (img.thumbSrc && !img.thumbSrc.startsWith('blob:') && !img.thumbSrc.startsWith('http')) ? img.thumbSrc : null,
                            storage_path: img.storage_path || '',
                            width: Math.round(img.width),
                            height: Math.round(img.height),
                            real_width: img.realWidth || img.width,
                            real_height: img.realHeight || img.height,
                            title: img.title,
                            base_name: img.baseName || img.title,
                            version: img.version || 1,
                            annotations: JSON.stringify(img.annotations || []),
                            prompt: img.generationPrompt || '',
                            user_draft_prompt: img.userDraftPrompt || '',
                            quality: img.quality || 'pro-1k',
                            parent_id: img.parentId || null,
                            created_at: new Date(img.createdAt).toISOString(),
                            updated_at: new Date().toISOString()
                        };
                    }).filter(Boolean);

                    if (payload.length > 0) {
                        console.log('[AutoSave] Force save on unmount');
                        (async () => {
                            try {
                                await supabase.from('canvas_images').upsert(payload, { onConflict: 'id' });
                                console.log('[AutoSave] Unmount save complete');
                            } catch (err) {
                                console.error('[AutoSave] Unmount save failed:', err);
                            }
                        })();
                    }
                }
            }
        };
    }, []); // Empty deps - only run on unmount
};
