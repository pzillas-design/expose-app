import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasImage } from '@/types';
import { storageService } from '@/services/storageService';

/**
 * Layer compositing engine for the Layer Composer.
 *
 * All variants of a stack show the same scene, so combining "the best parts"
 * is a pure pixel operation — no AI call, no credits. Every layer is normalized
 * to one reference resolution (the bottom layer's native size) so they line up
 * pixel-perfectly even when source dimensions differ slightly.
 *
 * Model (Photoshop-like):
 *   - Layers are an ORDERED list. order[0] = bottom, order[last] = top.
 *   - Each layer has a VISIBILITY flag (the checkmark) and a reveal MASK.
 *   - The lowest visible layer is the base: drawn fully.
 *   - Every visible layer above the base is drawn through its mask (white =
 *     shown). Masks start empty, so the default view is just the base.
 *   - The brush paints the ACTIVE layer (the top-most visible non-base layer):
 *     "+" reveals (adds), "−" erases (removes) → the layer below shows through.
 *   - Layers can be reordered to choose which one the brush targets / which
 *     wins where reveals overlap.
 */

export interface ComposerLayer {
    id: string;
    image: CanvasImage;
}

interface LoadedLayer {
    id: string;
    canvas: HTMLCanvasElement;       // source pixels normalized to ref dims
    mask: HTMLCanvasElement | null;  // reveal mask (white = show)
}

export type BrushMode = 'add' | 'remove';

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
    // Order: index 0 = bottom (base), last = top. Default = passed order reversed
    // so the user's current image (passed first) sits on top.
    const [order, setOrder] = useState<string[]>(() => layers.map(l => l.id).reverse());
    const [visible, setVisible] = useState<Set<string>>(() => new Set(layers.map(l => l.id)));
    const [mode, setMode] = useState<BrushMode>('add');
    const [brushSize, setBrushSize] = useState(120);
    const [refDims, setRefDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
    const [revision, setRevision] = useState(0);

    const loadedRef = useRef<Map<string, LoadedLayer>>(new Map());
    const refWRef = useRef(0);
    const refHRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const orderRef = useRef<string[]>(order);
    const visibleRef = useRef<Set<string>>(visible);
    useEffect(() => { orderRef.current = order; }, [order]);
    useEffect(() => { visibleRef.current = visible; }, [visible]);

    // The base = lowest visible layer; active paint target = top-most visible
    // layer that isn't the base.
    const baseId = order.find(id => visible.has(id)) ?? order[0] ?? '';
    const activeId = [...order].reverse().find(id => visible.has(id) && id !== baseId) ?? '';

    // --- Load + normalize all layers to the base's reference dimensions ---
    useEffect(() => {
        let cancelled = false;
        setReady(false);
        (async () => {
            const baseLayer = layers.find(l => l.id === baseId) ?? layers[0];
            if (!baseLayer) return;
            const refW = Math.round(baseLayer.image.realWidth || baseLayer.image.width || 1024);
            const refH = Math.round(baseLayer.image.realHeight || baseLayer.image.height || 1024);
            refWRef.current = refW;
            refHRef.current = refH;

            const existing = loadedRef.current;
            for (const layer of layers) {
                if (cancelled) return;
                let loaded = existing.get(layer.id);
                if (!loaded) {
                    const src = await resolveSrc(layer.image);
                    if (!src) continue;
                    try {
                        const el = await loadImageEl(src);
                        if (cancelled) return;
                        const c = document.createElement('canvas');
                        c.width = refW; c.height = refH;
                        c.getContext('2d')!.drawImage(el, 0, 0, refW, refH);
                        loaded = { id: layer.id, canvas: c, mask: null };
                        existing.set(layer.id, loaded);
                    } catch { continue; }
                } else if (loaded.canvas.width !== refW || loaded.canvas.height !== refH) {
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

        const ord = orderRef.current;
        const vis = visibleRef.current;
        const firstVisible = ord.find(id => vis.has(id));
        if (!firstVisible) return;

        // base
        const base = loadedRef.current.get(firstVisible);
        if (base) ctx.drawImage(base.canvas, 0, 0);

        // layers above base, in stack order, through their masks
        const tmp = document.createElement('canvas');
        tmp.width = refW; tmp.height = refH;
        const tctx = tmp.getContext('2d')!;
        let started = false;
        for (const id of ord) {
            if (id === firstVisible) { started = true; continue; }
            if (!started || !vis.has(id)) continue;
            const layer = loadedRef.current.get(id);
            if (!layer || !layer.mask) continue;
            tctx.clearRect(0, 0, refW, refH);
            tctx.globalCompositeOperation = 'source-over';
            tctx.drawImage(layer.canvas, 0, 0);
            tctx.globalCompositeOperation = 'destination-in';
            tctx.drawImage(layer.mask, 0, 0);
            ctx.drawImage(tmp, 0, 0);
        }
    }, [canvasRef]);

    const requestComposite = useCallback(() => {
        if (rafRef.current != null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            composite();
        });
    }, [composite]);

    useEffect(() => { if (ready) requestComposite(); }, [order, visible, ready, requestComposite]);

    // --- Painting (always targets the active layer) ---
    const paintDab = useCallback((x: number, y: number, prevX?: number, prevY?: number) => {
        if (!activeId) return;
        const mask = ensureMask(activeId);
        const mctx = mask.getContext('2d')!;
        mctx.globalCompositeOperation = mode === 'add' ? 'source-over' : 'destination-out';
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
    }, [activeId, mode, brushSize, ensureMask, requestComposite]);

    const toggleVisible = useCallback((id: string) => {
        setVisible(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const moveLayer = useCallback((id: string, dir: -1 | 1) => {
        setOrder(prev => {
            const idx = prev.indexOf(id);
            const target = idx + dir;
            if (idx < 0 || target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            [next[idx], next[target]] = [next[target], next[idx]];
            return next;
        });
    }, []);

    const exportComposite = useCallback((): { dataUrl: string; w: number; h: number } | null => {
        composite();
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return { dataUrl: canvas.toDataURL('image/jpeg', 0.95), w: refWRef.current, h: refHRef.current };
    }, [composite, canvasRef]);

    useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

    return {
        ready,
        order, baseId, activeId,
        visible, toggleVisible,
        moveLayer,
        mode, setMode,
        brushSize, setBrushSize,
        refDims,
        revision, setRevision,
        paintDab,
        exportComposite,
    };
};
