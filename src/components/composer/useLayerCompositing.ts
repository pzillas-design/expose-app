import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasImage } from '@/types';
import { storageService } from '@/services/storageService';

/**
 * Layer compositing engine for the Layer Composer.
 *
 * All variants of a stack show the same scene, so combining "the best parts"
 * is a pure pixel operation — no AI call, no credits. We load every layer,
 * normalize each to a single reference resolution (the base layer's native
 * size) so they line up pixel-perfectly even when source dimensions differ
 * slightly, and let the user reveal a source layer through the base by
 * painting into a per-layer mask.
 *
 * Compositing model:
 *   - One layer is the BASE (drawn fully, at the bottom).
 *   - Every other layer is a SOURCE with its own reveal mask (white = visible).
 *   - The brush paints white into the active source's mask (reveal) or clears
 *     it (erase → base shows through again).
 *   - Final composite = base, then each source stamped through its mask in a
 *     stable stack order.
 */

export interface ComposerLayer {
    id: string;
    image: CanvasImage;
    label: string; // e.g. "v3"
}

interface LoadedLayer {
    id: string;
    /** Source pixels normalized to reference dimensions. */
    canvas: HTMLCanvasElement;
    /** Reveal mask (white = show this layer). null for whatever is currently base. */
    mask: HTMLCanvasElement | null;
}

export type BrushMode = 'reveal' | 'erase';

const resolveSrc = async (img: CanvasImage): Promise<string> => {
    if (img.src && !img.src.startsWith('blob:')) return img.src;
    if (img.originalSrc && !img.originalSrc.startsWith('blob:')) return img.originalSrc;
    if (img.storage_path) {
        const signed = await storageService.getSignedUrl(img.storage_path);
        if (signed) return signed;
    }
    return img.src || img.originalSrc || '';
};

const loadImageEl = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = 'anonymous';
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = src;
    });

export const useLayerCompositing = (
    layers: ComposerLayer[],
    canvasRef: React.RefObject<HTMLCanvasElement>,
) => {
    const [ready, setReady] = useState(false);
    const [baseId, setBaseId] = useState<string>(layers[0]?.id ?? '');
    const [activeSourceId, setActiveSourceId] = useState<string>(layers[1]?.id ?? '');
    const [mode, setMode] = useState<BrushMode>('reveal');
    const [brushSize, setBrushSize] = useState(120); // in reference px
    const [refDims, setRefDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
    /** Bumps whenever a mask changes so consumers (e.g. the strip) can re-derive UI. */
    const [revision, setRevision] = useState(0);

    const loadedRef = useRef<Map<string, LoadedLayer>>(new Map());
    const refWRef = useRef(0);
    const refHRef = useRef(0);
    const rafRef = useRef<number | null>(null);

    // Stable stack order = the order layers were passed in (version desc).
    const orderRef = useRef<string[]>([]);
    useEffect(() => { orderRef.current = layers.map(l => l.id); }, [layers]);

    // --- Load + normalize all layers to the base's reference dimensions ---
    useEffect(() => {
        let cancelled = false;
        setReady(false);

        (async () => {
            const base = layers.find(l => l.id === baseId) ?? layers[0];
            if (!base) return;

            // Reference dims come from the base layer's true resolution.
            const refW = Math.round(base.image.realWidth || base.image.width || 1024);
            const refH = Math.round(base.image.realHeight || base.image.height || 1024);
            refWRef.current = refW;
            refHRef.current = refH;

            const existing = loadedRef.current;
            for (const layer of layers) {
                if (cancelled) return;
                let loaded = existing.get(layer.id);
                if (!loaded) {
                    // First load: fetch pixels and bake into a ref-sized canvas.
                    const src = await resolveSrc(layer.image);
                    if (!src) continue;
                    try {
                        const el = await loadImageEl(src);
                        if (cancelled) return;
                        const c = document.createElement('canvas');
                        c.width = refW; c.height = refH;
                        const cx = c.getContext('2d')!;
                        // Stretch onto the exact reference grid → all layers coincide.
                        cx.drawImage(el, 0, 0, refW, refH);
                        loaded = { id: layer.id, canvas: c, mask: null };
                        existing.set(layer.id, loaded);
                    } catch {
                        continue; // skip layers that fail to load
                    }
                } else if (loaded.canvas.width !== refW || loaded.canvas.height !== refH) {
                    // Base changed → re-normalize cached pixels to new ref dims by
                    // re-stretching from the existing baked canvas.
                    const c = document.createElement('canvas');
                    c.width = refW; c.height = refH;
                    c.getContext('2d')!.drawImage(loaded.canvas, 0, 0, refW, refH);
                    loaded.canvas = c;
                    if (loaded.mask) {
                        const m = document.createElement('canvas');
                        m.width = refW; m.height = refH;
                        m.getContext('2d')!.drawImage(loaded.mask, 0, 0, refW, refH);
                        loaded.mask = m;
                    }
                }
            }

            if (cancelled) return;
            setRefDims({ w: refW, h: refH });
            setReady(true);
            requestComposite();
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layers, baseId]);

    const ensureMask = useCallback((id: string): HTMLCanvasElement => {
        const loaded = loadedRef.current.get(id)!;
        if (!loaded.mask) {
            const m = document.createElement('canvas');
            m.width = refWRef.current;
            m.height = refHRef.current;
            loaded.mask = m;
        }
        return loaded.mask;
    }, []);

    // --- Composite render (rAF-throttled) ---
    const composite = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const refW = refWRef.current, refH = refHRef.current;
        if (!refW || !refH) return;
        if (canvas.width !== refW || canvas.height !== refH) {
            canvas.width = refW; canvas.height = refH;
        }
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, refW, refH);

        const base = loadedRef.current.get(baseId);
        if (base) ctx.drawImage(base.canvas, 0, 0);

        // Stamp each source through its mask, in stable stack order.
        const tmp = document.createElement('canvas');
        tmp.width = refW; tmp.height = refH;
        const tctx = tmp.getContext('2d')!;

        for (const id of orderRef.current) {
            if (id === baseId) continue;
            const layer = loadedRef.current.get(id);
            if (!layer || !layer.mask) continue;
            tctx.clearRect(0, 0, refW, refH);
            tctx.globalCompositeOperation = 'source-over';
            tctx.drawImage(layer.canvas, 0, 0);
            // Keep only the masked (white) region.
            tctx.globalCompositeOperation = 'destination-in';
            tctx.drawImage(layer.mask, 0, 0);
            ctx.drawImage(tmp, 0, 0);
        }
    }, [baseId, canvasRef]);

    const requestComposite = useCallback(() => {
        if (rafRef.current != null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            composite();
        });
    }, [composite]);

    // Re-composite when base changes.
    useEffect(() => { if (ready) requestComposite(); }, [baseId, ready, requestComposite]);

    // --- Painting ---
    const paintDab = useCallback((id: string, x: number, y: number, prevX?: number, prevY?: number) => {
        if (id === baseId) return; // can't reveal the base through itself
        const mask = ensureMask(id);
        const mctx = mask.getContext('2d')!;
        mctx.globalCompositeOperation = mode === 'reveal' ? 'source-over' : 'destination-out';
        mctx.strokeStyle = '#fff';
        mctx.fillStyle = '#fff';
        mctx.lineCap = 'round';
        mctx.lineJoin = 'round';
        mctx.lineWidth = brushSize;
        if (prevX != null && prevY != null) {
            mctx.beginPath();
            mctx.moveTo(prevX, prevY);
            mctx.lineTo(x, y);
            mctx.stroke();
        }
        mctx.beginPath();
        mctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        mctx.fill();
        requestComposite();
    }, [baseId, mode, brushSize, ensureMask, requestComposite]);

    const clearActive = useCallback(() => {
        const loaded = loadedRef.current.get(activeSourceId);
        if (loaded?.mask) {
            loaded.mask.getContext('2d')!.clearRect(0, 0, refWRef.current, refHRef.current);
            setRevision(r => r + 1);
            requestComposite();
        }
    }, [activeSourceId, requestComposite]);

    const resetAll = useCallback(() => {
        for (const l of loadedRef.current.values()) {
            if (l.mask) l.mask.getContext('2d')!.clearRect(0, 0, refWRef.current, refHRef.current);
        }
        setRevision(r => r + 1);
        requestComposite();
    }, [requestComposite]);

    /** True if a layer has any revealed pixels (for the strip's "in use" dot). */
    const layerHasReveal = useCallback((id: string): boolean => {
        const loaded = loadedRef.current.get(id);
        if (!loaded?.mask) return false;
        const { w, h } = { w: Math.min(64, refWRef.current), h: Math.min(64, refHRef.current) };
        if (!w || !h) return false;
        const probe = document.createElement('canvas');
        probe.width = w; probe.height = h;
        const pctx = probe.getContext('2d')!;
        pctx.drawImage(loaded.mask, 0, 0, w, h);
        const data = pctx.getImageData(0, 0, w, h).data;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 8) return true;
        return false;
        // revision in deps so callers re-evaluate after strokes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [revision]);

    const exportComposite = useCallback((): { dataUrl: string; w: number; h: number } | null => {
        composite(); // ensure latest
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return { dataUrl: canvas.toDataURL('image/jpeg', 0.95), w: refWRef.current, h: refHRef.current };
    }, [composite, canvasRef]);

    useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

    return {
        ready,
        baseId, setBaseId,
        activeSourceId, setActiveSourceId,
        mode, setMode,
        brushSize, setBrushSize,
        refDims,
        revision,
        paintDab,
        clearActive,
        resetAll,
        layerHasReveal,
        exportComposite,
    };
};
