import React, { useCallback, useMemo, useRef, useState } from 'react';
import { X, Check, Brush, Eraser, RotateCcw, Loader2 } from 'lucide-react';
import { CanvasImage } from '@/types';
import { Theme } from '@/components/ui/DesignSystem';
import { Button, Tooltip } from '@/components/ui/DesignSystem';
import { useLayerCompositing, ComposerLayer } from './useLayerCompositing';

interface LayerComposerProps {
    /** All images in the current stack (same folderId). */
    stack: CanvasImage[];
    /** Image the user was viewing — becomes the initial base layer. */
    initialBaseId: string;
    onClose: () => void;
    onSave: (baseImage: CanvasImage, compositeDataUrl: string, refW: number, refH: number) => Promise<string | null> | void;
    t: (key: any) => string;
    isDe: boolean;
}

export const LayerComposer: React.FC<LayerComposerProps> = ({ stack, initialBaseId, onClose, onSave, t, isDe }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const [saving, setSaving] = useState(false);

    // Build composer layers from the stack (already in version-desc order).
    const layers: ComposerLayer[] = useMemo(() => {
        const ordered = [...stack];
        // Ensure the user's current image is first so it defaults to base.
        ordered.sort((a, b) => (a.id === initialBaseId ? -1 : b.id === initialBaseId ? 1 : 0));
        return ordered
            .filter(i => !i.isGenerating && (i.src || i.thumbSrc || i.storage_path))
            .map(i => ({ id: i.id, image: i, label: i.version ? `v${i.version}` : (i.title || '').slice(0, 6) || '—' }));
    }, [stack, initialBaseId]);

    const comp = useLayerCompositing(layers, canvasRef);

    // --- Pointer → reference-space coordinate mapping ---
    const drawingRef = useRef(false);
    const lastPtRef = useRef<{ x: number; y: number } | null>(null);

    const toRefCoords = useCallback((clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * comp.refDims.w;
        const y = ((clientY - rect.top) / rect.height) * comp.refDims.h;
        return { x, y };
    }, [comp.refDims.w, comp.refDims.h]);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (e.target !== canvasRef.current) return;
        const p = toRefCoords(e.clientX, e.clientY);
        if (!p) return;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        drawingRef.current = true;
        lastPtRef.current = p;
        comp.paintDab(comp.activeSourceId, p.x, p.y);
    }, [toRefCoords, comp]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!drawingRef.current) return;
        const p = toRefCoords(e.clientX, e.clientY);
        if (!p) return;
        const last = lastPtRef.current;
        comp.paintDab(comp.activeSourceId, p.x, p.y, last?.x, last?.y);
        lastPtRef.current = p;
    }, [toRefCoords, comp]);

    const onPointerUp = useCallback(() => {
        drawingRef.current = false;
        lastPtRef.current = null;
    }, []);

    const handleSave = useCallback(async () => {
        const out = comp.exportComposite();
        const base = stack.find(i => i.id === comp.baseId);
        if (!out || !base) return;
        setSaving(true);
        try {
            await onSave(base, out.dataUrl, out.w, out.h);
            onClose();
        } finally {
            setSaving(false);
        }
    }, [comp, stack, onSave, onClose]);

    // Cursor scaled to display size for an accurate brush ring.
    const displayBrush = useMemo(() => {
        const canvas = canvasRef.current;
        if (!canvas || !comp.refDims.w) return comp.brushSize;
        const rect = canvas.getBoundingClientRect();
        return comp.brushSize * (rect.width / comp.refDims.w);
    }, [comp.brushSize, comp.refDims.w, comp.ready]);

    const aspect = comp.refDims.w && comp.refDims.h ? `${comp.refDims.w} / ${comp.refDims.h}` : '1 / 1';

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-50 dark:bg-black animate-in fade-in duration-150">

            {/* Canvas area — fills available space */}
            <div ref={wrapRef} className="relative flex-1 min-h-0 flex items-center justify-center p-4 md:p-8">

                {/* Top-left: close */}
                <button
                    onClick={onClose}
                    className={`absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 h-9 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-black/5 dark:border-white/10 ${Theme.Effects.Shadow} text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors`}
                >
                    <X className="w-4 h-4" />
                    <span>{isDe ? 'Schließen' : 'Close'}</span>
                </button>

                {/* Top-right: save */}
                <div className="absolute top-4 right-4 z-20">
                    <Button variant="primary" size="m" onClick={handleSave} disabled={saving || !comp.ready} icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}>
                        {isDe ? 'Als neues Bild speichern' : 'Save as new image'}
                    </Button>
                </div>

                {/* The composite canvas */}
                {!comp.ready && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-7 h-7 animate-spin text-zinc-300" />
                    </div>
                )}
                <div
                    className="relative max-w-full max-h-full"
                    style={{ aspectRatio: aspect, width: 'auto', height: '100%' }}
                >
                    <canvas
                        ref={canvasRef}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerLeave={onPointerUp}
                        className="block w-full h-full rounded-lg shadow-sm touch-none"
                        style={{ cursor: 'none', objectFit: 'contain' }}
                    />
                    <BrushCursor wrapRef={wrapRef} canvasRef={canvasRef} size={displayBrush} mode={comp.mode} />
                </div>

                {/* Floating brush pill — bottom center */}
                {comp.ready && (
                    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/5 dark:border-white/10 ${Theme.Effects.Shadow} rounded-full px-4 py-2 pointer-events-auto`}>
                        <Tooltip text={isDe ? 'Bereich aus Quell-Ebene einblenden' : 'Reveal from source layer'} side="top">
                            <button
                                onClick={() => comp.setMode('reveal')}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${comp.mode === 'reveal' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                            >
                                <Brush className="w-4 h-4" />
                            </button>
                        </Tooltip>
                        <Tooltip text={isDe ? 'Zurück zur Basis radieren' : 'Erase back to base'} side="top">
                            <button
                                onClick={() => comp.setMode('erase')}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${comp.mode === 'erase' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                            >
                                <Eraser className="w-4 h-4" />
                            </button>
                        </Tooltip>

                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />

                        <span className="text-[11px] font-medium text-zinc-500 w-9 tabular-nums">{comp.brushSize}px</span>
                        <input
                            type="range" min={20} max={Math.max(200, Math.round((comp.refDims.w || 1024) / 4))}
                            value={comp.brushSize}
                            onChange={(e) => comp.setBrushSize(Number(e.target.value))}
                            className="w-32 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500"
                        />

                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />

                        <Tooltip text={isDe ? 'Aktive Ebene zurücksetzen' : 'Clear active layer'} side="top">
                            <button onClick={comp.clearActive} className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>

            {/* Bottom layer strip */}
            <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                    <span className="text-[11px] uppercase tracking-wide text-zinc-400 shrink-0 mr-1">{isDe ? 'Ebenen' : 'Layers'}</span>
                    {layers.map(l => {
                        const isBase = l.id === comp.baseId;
                        const isActive = l.id === comp.activeSourceId;
                        const hasReveal = comp.layerHasReveal(l.id);
                        return (
                            <div key={l.id} className="shrink-0 flex flex-col items-center gap-1">
                                <button
                                    onClick={() => { if (!isBase) comp.setActiveSourceId(l.id); }}
                                    onDoubleClick={() => comp.setBaseId(l.id)}
                                    className={`relative w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                                        isBase ? 'border-zinc-900 dark:border-white'
                                        : isActive ? 'border-orange-500 ring-2 ring-orange-500/30'
                                        : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
                                    }`}
                                >
                                    <img src={l.image.thumbSrc || l.image.src} alt={l.label} className="w-full h-full object-cover" />
                                    <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] px-1 rounded-tl">{l.label}</span>
                                    {isBase && <span className="absolute top-0 left-0 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[8px] px-1 rounded-br font-medium">{isDe ? 'Basis' : 'Base'}</span>}
                                    {!isBase && hasReveal && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500 shadow" />}
                                </button>
                            </div>
                        );
                    })}
                    <span className="text-[10px] text-zinc-400 shrink-0 ml-2 max-w-[160px] leading-tight">
                        {isDe ? 'Tippen = Quelle wählen · Doppelklick = Basis' : 'Tap = pick source · Double-click = base'}
                    </span>
                </div>
            </div>
        </div>
    );
};

/** Brush ring that follows the pointer over the canvas. */
const BrushCursor: React.FC<{
    wrapRef: React.RefObject<HTMLDivElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    size: number;
    mode: 'reveal' | 'erase';
}> = ({ canvasRef, size, mode }) => {
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const move = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
            setPos(inside ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
        };
        const leave = () => setPos(null);
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerleave', leave);
        return () => { canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave); };
    }, [canvasRef]);

    if (!pos) return null;
    return (
        <div
            className="pointer-events-none absolute rounded-full"
            style={{
                left: pos.x, top: pos.y,
                width: size, height: size,
                transform: 'translate(-50%, -50%)',
                border: `2px solid ${mode === 'erase' ? '#ef4444' : '#fff'}`,
                boxShadow: '0 0 0 1px rgba(0,0,0,.4)',
            }}
        />
    );
};
