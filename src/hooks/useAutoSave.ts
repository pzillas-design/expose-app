import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { ImageRow, CanvasImage } from '@/types';

/**
 * Auto-Save Hook
 * Saves only changed images (dirty tracking) to avoid upserting all 50 images on every tick.
 * Batches upserts in chunks of 10 to stay under statement timeout.
 */

const AUTOSAVE_DELAY_MS = 30_000;
const UPSERT_BATCH_SIZE = 10;

function imageToPayload(img: CanvasImage, userId: string) {
    return {
        id: img.id,
        user_id: userId,
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
        generation_params: {
            quality: img.quality || 'nb2-2k',
            activeTemplateId: img.activeTemplateId,
            variableValues: img.variableValues
        },
        ...(img.parentId !== undefined ? { parent_id: img.parentId } : {}),
        created_at: new Date(img.createdAt || Date.now()).toISOString(),
        updated_at: new Date().toISOString()
    };
}

async function upsertInBatches(payload: ReturnType<typeof imageToPayload>[]) {
    for (let i = 0; i < payload.length; i += UPSERT_BATCH_SIZE) {
        const batch = payload.slice(i, i + UPSERT_BATCH_SIZE);
        const { error } = await supabase.from('images').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
    }
}

export const useAutoSave = (
    rows: ImageRow[],
    user: any,
    isAuthDisabled: boolean
) => {
    // Dirty tracking: map of imageId -> last-saved fingerprint
    const savedFingerprintsRef = useRef<Map<string, string>>(new Map());
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSavingRef = useRef(false);
    const rowsRef = useRef(rows);

    useEffect(() => { rowsRef.current = rows; }, [rows]);

    const fingerprint = (img: CanvasImage) =>
        `${img.version}|${img.userDraftPrompt}|${img.generationPrompt}|${img.activeTemplateId}|${JSON.stringify(img.variableValues)}|${img.annotations?.length ?? 0}|${img.parentId ?? ''}`;

    const getDirtyImages = useCallback((currentRows: ImageRow[]): CanvasImage[] => {
        return currentRows
            .flatMap(r => r.items)
            .filter(img => {
                if (img.isGenerating || !img.src) return false;
                if (img.src.startsWith('blob:') && !img.storage_path) return false;
                const fp = fingerprint(img);
                return savedFingerprintsRef.current.get(img.id) !== fp;
            });
    }, []);

    const markSaved = useCallback((images: CanvasImage[]) => {
        images.forEach(img => savedFingerprintsRef.current.set(img.id, fingerprint(img)));
    }, []);

    // ── localStorage (Beta / auth-disabled) ──────────────────────────────────
    useEffect(() => {
        if (!isAuthDisabled) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            try {
                localStorage.setItem('beta_canvas_state', JSON.stringify(rows));
            } catch (err) {
                console.error('[AutoSave] localStorage save failed:', err);
            }
        }, 5000);

        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, [rows, isAuthDisabled]);

    // ── Supabase (production) ─────────────────────────────────────────────────
    useEffect(() => {
        if (isAuthDisabled || !user) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            if (isSavingRef.current) return;
            const dirty = getDirtyImages(rows);
            if (dirty.length === 0) return;

            isSavingRef.current = true;
            console.log(`[AutoSave] Starting save (${dirty.length} dirty images)...`);
            try {
                const payload = dirty.map(img => imageToPayload(img, user.id));
                await upsertInBatches(payload);
                markSaved(dirty);
                console.log(`[AutoSave] Saved ${dirty.length} images successfully`);
            } catch (err: any) {
                console.error('[AutoSave] Error:', err);
            } finally {
                isSavingRef.current = false;
            }
        }, AUTOSAVE_DELAY_MS);

        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, [rows, user, isAuthDisabled, getDirtyImages, markSaved]);

    // ── Force-save on unmount ─────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            if (!user || isAuthDisabled || isSavingRef.current) return;

            const dirty = getDirtyImages(rowsRef.current);
            if (dirty.length === 0) return;

            const payload = dirty.map(img => imageToPayload(img, user.id));
            console.log(`[AutoSave] Force save on unmount (${dirty.length} images)`);
            (async () => {
                try {
                    await upsertInBatches(payload);
                    console.log('[AutoSave] Unmount save complete');
                } catch (err) {
                    console.error('[AutoSave] Unmount save failed:', err);
                }
            })();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
};
