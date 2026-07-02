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
 *   - Ordered list: order[0] = bottom, order[last] = top. Top overlays below.
 *   - Each layer has a VISIBILITY flag (eye) and a reveal MASK (default fully
 *     opaque, so a layer covers everything beneath it until erased).
 *   - One layer is ACTIVE (user-selected, framed). The brush paints the ACTIVE
 *     layer's mask: "−" erases (reveals layers below), "+" paints back.
 *   - Layers can be toggled and reordered freely.
 */

export interface ComposerLayer {
    id: string;
    image: CanvasImage;
}

interface LoadedLayer {
    id: string;
    canvas: HTMLCanvasElement;
    mask: HTMLCanvasElement | null; // reveal mask (white = show). null = fully opaque.
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
    const [order, setOrder] = useState<string[]>(() => layers.map(l => l.id).reverse());
    const [visible, setVisible] = useState<Set<string>>(() => new Set(layers.map(l => l.id)));
    // Active paint layer — defaults to the top-most layer.
    const [activeId, setActiveId] = useState<string>(() => (layers[0]?.id ?? ''));
    const [mode, setMode] = useState<BrushMode>('remove');
    const [brushSize, setBrushSize] = useState(120);
    // Per-stroke edge softness (0 = hard, 100 = very soft). Baked into the mask
    // as the brush paints — so edges stay crisp at the image border and can vary
    // stroke to stroke. Replaces the old global blur, which eroded the mask at
    // the canvas edge and cost a full-canvas gaussian every frame.
    const [softness, setSoftness] = useState(30);
    const softnessRef = useRef(30);
    useEffect(() => { softnessRef.current = softness; }, [softness]);
    const [refDims, setRefDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
    const [revision, setRevision] = useState(0); // bumps when masks change → thumbs refresh

    const loadedRef = useRef<Map<string, LoadedLayer>>(new Map());
    const refWRef = useRef(0);
    const refHRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const compTmpRef = useRef<HTMLCanvasElement | null>(null);   // reused composite scratch
    const stampRef = useRef<{ canvas: HTMLCanvasElement; size: number; soft: number } | null>(null); // cached brush sprite
    const orderRef = useRef<string[]>(order);
    const visibleRef = useRef<Set<string>>(visible);
    useEffect(() => { orderRef.current = order; }, [order]);
    useEffect(() => { visibleRef.current = visible; }, [visible]);

    // Lowest visible layer = base (used for save metadata / ref dims).
    const baseId = order.find(id => visible.has(id)) ?? order[0] ?? '';

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
            setRevision(r => r + 1);
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
            const mctx = m.getContext('2d')!;
            mctx.fillStyle = '#fff';
            mctx.fillRect(0, 0, m.width, m.height); // default fully opaque
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

        // Reuse one offscreen temp canvas across frames — re-allocating a full-res
        // (e.g. 4K) canvas every composite caused heavy GC churn / paint jank.
        let tmp = compTmpRef.current;
        if (!tmp) { tmp = document.createElement('canvas'); compTmpRef.current = tmp; }
        if (tmp.width !== refW || tmp.height !== refH) { tmp.width = refW; tmp.height = refH; }
        const tctx = tmp.getContext('2d')!;

        for (const id of orderRef.current) {           // bottom → top
            if (!visibleRef.current.has(id)) continue;
            const layer = loadedRef.current.get(id);
            if (!layer) continue;
            if (!layer.mask) { ctx.drawImage(layer.canvas, 0, 0); continue; }
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
        rafRef.current = requestAnimationFrame(() => { rafRef.current = null; composite(); });
    }, [composite]);

    useEffect(() => { if (ready) requestComposite(); }, [order, visible, ready, requestComposite]);

    // Default the brush to ~50% of its range once dimensions are known.
    const brushInitedRef = useRef(false);
    useEffect(() => {
        if (ready && !brushInitedRef.current && refWRef.current) {
            brushInitedRef.current = true;
            const max = Math.max(200, Math.round(refWRef.current / 4));
            setBrushSize(Math.round(20 + 0.5 * (max - 20)));
        }
    }, [ready]);

    // --- Painting (targets the active layer) ---
    // Stamps soft-edged radial dabs along the stroke. The softness (0..100) sets
    // how much of the radius fades out, so the feathering lives in the mask and
    // never erodes the image border the way a global blur did.
    const paintDab = useCallback((x: number, y: number, prevX?: number, prevY?: number) => {
        if (!activeId) return;
        const mask = ensureMask(activeId);
        const mctx = mask.getContext('2d')!;
        mctx.globalCompositeOperation = mode === 'add' ? 'source-over' : 'destination-out';

        const size = Math.max(2, Math.round(brushSize));
        const r = size / 2;
        const soft = Math.min(1, Math.max(0, softnessRef.current / 100));

        // Build the brush sprite once per (size, softness) and stamp it with
        // drawImage — far cheaper than creating a radial gradient on every dab.
        let s = stampRef.current;
        if (!s || s.size !== size || s.soft !== soft) {
            const cnv = s?.canvas ?? document.createElement('canvas');
            cnv.width = size; cnv.height = size;
            const sctx = cnv.getContext('2d')!;
            sctx.clearRect(0, 0, size, size);
            if (soft <= 0.01) {
                sctx.fillStyle = '#fff';
            } else {
                const g = sctx.createRadialGradient(r, r, r * (1 - soft), r, r, r);
                g.addColorStop(0, 'rgba(255,255,255,1)');
                g.addColorStop(1, 'rgba(255,255,255,0)');
                sctx.fillStyle = g;
            }
            sctx.beginPath(); sctx.arc(r, r, r, 0, Math.PI * 2); sctx.fill();
            s = { canvas: cnv, size, soft };
            stampRef.current = s;
        }
        const sprite = s.canvas;
        const place = (cx: number, cy: number) => mctx.drawImage(sprite, cx - r, cy - r, size, size);

        if (prevX != null && prevY != null) {
            const dx = x - prevX, dy = y - prevY;
            const dist = Math.hypot(dx, dy);
            const step = Math.max(1, r * 0.25);
            const n = Math.max(1, Math.ceil(dist / step));
            for (let i = 1; i <= n; i++) place(prevX + (dx * i) / n, prevY + (dy * i) / n);
        } else {
            place(x, y);
        }
        requestComposite();
    }, [activeId, mode, brushSize, ensureMask, requestComposite]);

    /** Bump after a stroke so layer thumbnails refresh. */
    const commitStroke = useCallback(() => setRevision(r => r + 1), []);

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

    /** Draw a layer's *current masked state* into a target canvas. Erased
     *  (removed) areas are left transparent so the panel background (black or
     *  white depending on theme) shows through. */
    const drawLayerThumb = useCallback((id: string, target: HTMLCanvasElement) => {
        const loaded = loadedRef.current.get(id);
        const ctx = target.getContext('2d');
        if (!ctx) return;
        const w = target.width, h = target.height;
        ctx.clearRect(0, 0, w, h); // transparent where the layer is erased
        if (!loaded) return;
        const tmp = document.createElement('canvas');
        tmp.width = w; tmp.height = h;
        const x = tmp.getContext('2d')!;
        x.drawImage(loaded.canvas, 0, 0, w, h);
        if (loaded.mask) {
            x.globalCompositeOperation = 'destination-in';
            x.drawImage(loaded.mask, 0, 0, w, h);
        }
        ctx.drawImage(tmp, 0, 0);
    }, []);

    const exportComposite = useCallback((): { dataUrl: string; w: number; h: number } | null => {
        composite();
        const canvas = canvasRef.current;
        if (!canvas) return null;
        // 0.95 produzierte ~4-5 MB pro Composite — 0.85 halbiert das ohne sichtbaren Verlust
        // (gleiches Niveau wie die übrigen JPEG-Exporte, siehe annotationUtils).
        return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), w: refWRef.current, h: refHRef.current };
    }, [composite, canvasRef]);

    useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

    return {
        ready,
        order, baseId,
        activeId, setActiveId,
        visible, toggleVisible,
        moveLayer,
        mode, setMode,
        brushSize, setBrushSize,
        softness, setSoftness,
        refDims,
        revision,
        paintDab,
        commitStroke,
        drawLayerThumb,
        exportComposite,
    };
};
