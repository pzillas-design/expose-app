import { useEffect, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { ImageRow } from '@/types';

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

    useEffect(() => {
        // For Beta (auth disabled): Use localStorage
        if (isAuthDisabled) {
            const currentState = JSON.stringify(rows);
            if (currentState === lastSavedRef.current) {
                return;
            }

            // Debounce: Save every 5s to localStorage
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(() => {
                try {
                    console.log('[AutoSave] Saving to localStorage (Beta mode)...');
                    localStorage.setItem('beta_canvas_state', currentState);
                    lastSavedRef.current = currentState;
                    console.log('[AutoSave] Saved to localStorage successfully');
                } catch (err) {
                    console.error('[AutoSave] localStorage save failed:', err);
                }
            }, 5000); // 5 seconds for Beta

            return () => {
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                }
            };
        }

        // For Production (with auth): Use Supabase
        if (!user) {
            console.log('[AutoSave] Skipped - no user');
            return;
        }

        // Skip if no changes
        const currentState = JSON.stringify(rows);
        if (currentState === lastSavedRef.current) {
            return;
        }

        // Skip if already saving
        if (isSavingRef.current) {
            return;
        }

        // Debounce: Only save every 30s
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                isSavingRef.current = true;
                console.log('[AutoSave] Starting save...');

                // Extract all images
                const allImages = rows.flatMap(r => r.items);

                // Filter out images that are still generating
                const imagesToSave = allImages.filter(img => !img.isGenerating && img.src);

                if (imagesToSave.length === 0) {
                    console.log('[AutoSave] No images to save');
                    isSavingRef.current = false;
                    return;
                }

                // Batch Upsert (faster than individual inserts)
                const payload = imagesToSave.map(img => {
                    const isBlob = img.src.startsWith('blob:');

                    // Create base object
                    const dbRecord: any = {
                        id: img.id,
                        user_id: user.id,
                        thumb_src: (img.thumbSrc && !img.thumbSrc.startsWith('blob:')) ? img.thumbSrc : (isBlob ? null : img.src),
                        storage_path: img.storage_path || '',
                        width: img.width,
                        height: img.height,
                        real_width: img.realWidth || img.width,
                        real_height: img.realHeight || img.height,
                        title: img.title,
                        base_name: img.baseName || img.title,
                        version: img.version || 1,
                        annotations: img.annotations || [],
                        generation_prompt: img.generationPrompt || '',
                        user_draft_prompt: img.userDraftPrompt || '',
                        quality: img.quality || 'pro-1k',
                        parent_id: img.parentId || null,
                        board_id: img.boardId || null,
                        created_at: new Date(img.createdAt).toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    if (isBlob && !img.storage_path) {
                        return null; // Skip blob images that haven't been peristed yet
                    }

                    return dbRecord;
                }).filter(Boolean); // Remove nulls

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
                }
            } catch (err) {
                console.error('[AutoSave] Error:', error);
            } else {
                console.log('[AutoSave] Saved', imagesToSave.length, 'images successfully');
                lastSavedRef.current = currentState;
            }
        } catch (err) {
            console.error('[AutoSave] Exception:', err);
        } finally {
            isSavingRef.current = false;
        }
    }, 30000); // 30 seconds

    return () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
    };
}, [rows, user, isAuthDisabled]);
};

return () => {
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
};
    }, [rows, user, isAuthDisabled]);

// Force save on unmount (when user closes tab)
useEffect(() => {
    return () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Trigger immediate save on unmount
        if (user && !isAuthDisabled && !isSavingRef.current) {
            const allImages = rows.flatMap(r => r.items).filter(img => !img.isGenerating && img.src);
            if (allImages.length > 0) {
                console.log('[AutoSave] Force save on unmount');
                supabase.from('canvas_images').upsert(
                    allImages.map(img => ({
                        id: img.id,
                        user_id: user.id,
                        src: img.src,
                        thumb_src: img.thumbSrc || img.src,
                        storage_path: img.storage_path || '',
                        width: img.width,
                        height: img.height,
                        real_width: img.realWidth || img.width,
                        real_height: img.realHeight || img.height,
                        title: img.title,
                        base_name: img.baseName || img.title,
                        version: img.version || 1,
                        annotations: img.annotations || [],
                        generation_prompt: img.generationPrompt || '',
                        user_draft_prompt: img.userDraftPrompt || '',
                        quality: img.quality || 'pro-1k',
                        parent_id: img.parentId || null,
                        board_id: img.boardId || null,
                        created_at: new Date(img.createdAt).toISOString(),
                        updated_at: new Date().toISOString()
                    })),
                    { onConflict: 'id' }
                ).then(() => {
                    console.log('[AutoSave] Unmount save complete');
                }).catch(err => {
                    console.error('[AutoSave] Unmount save failed:', err);
                });
            }
        }
    };
}, []); // Empty deps - only run on unmount
};
