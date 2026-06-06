import React, { useCallback, useMemo, useRef, useState } from 'react';
import { X, Check, Plus, Minus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { CanvasImage } from '@/types';
import { Theme, Button, Tooltip } from '@/components/ui/DesignSystem';
import { useLayerCompositing, ComposerLayer } from './useLayerCompositing';

interface LayerComposerProps {
    stack: CanvasImage[];
    initialBaseId: string;
    onClose: () => void;
    onSave: (baseImage: CanvasImage, compositeDataUrl: string, refW: number, refH: number) => Promise<string | null> | void;
    t: (key: any) => string;
    isDe: boolean;
}

export const LayerComposer: React.FC<LayerComposerProps> = ({ stack, initialBaseId, onClose, onSave, isDe }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [saving, setSaving] = useState(false);

    const layers: ComposerLayer[] = useMemo(() => {
        const ordered = [...stack];
        // The image the user opened sits first → it ends up on top (engine reverses).
        ordered.sort((a, b) => (a.id === initialBaseId ? -1 : b.id === initialBaseId ? 1 : 0));
        return ordered
            .filter(i => !i.isGenerating && (i.src || i.thumbSrc || i.storage_path))
            .map(i => ({ id: i.id, image: i }));
    }, [stack, initialBaseId]);

    const comp = useLayerCompositing(layers, canvasRef);
    const imageById = useMemo(() => new Map(stack.map(i => [i.id, i])), [stack]);

    // --- Pointer → reference-space coords ---
    const drawingRef = useRef(false);
    const lastPtRef = useRef<{ x: number; y: number } | null>(null);
    const toRefCoords = useCallback((clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((clientX - rect.left) / rect.width) * comp.refDims.w,
            y: ((clientY - rect.top) / rect.height) * comp.refDims.h,
        };
    }, [comp.refDims.w, comp.refDims.h]);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (e.target !== canvasRef.current || !comp.activeId) return;
        const p = toRefCoords(e.clientX, e.clientY);
        if (!p) return;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        drawingRef.current = true;
        lastPtRef.current = p;
        comp.paintDab(p.x, p.y);
    }, [toRefCoords, comp]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!drawingRef.current) return;
        const p = toRefCoords(e.clientX, e.clientY);
        if (!p) return;
        const last = lastPtRef.current;
        comp.paintDab(p.x, p.y, last?.x, last?.y);
        lastPtRef.current = p;
    }, [toRefCoords, comp]);

    const onPointerUp = useCallback(() => { drawingRef.current = false; lastPtRef.current = null; }, []);

    const handleSave = useCallback(async () => {
        const out = comp.exportComposite();
        const base = stack.find(i => i.id === comp.baseId) || stack[0];
        if (!out || !base) return;
        setSaving(true);
        try { await onSave(base, out.dataUrl, out.w, out.h); onClose(); }
        finally { setSaving(false); }
    }, [comp, stack, onSave, onClose]);

    const displayBrush = useMemo(() => {
        const canvas = canvasRef.current;
        if (!canvas || !comp.refDims.w) return comp.brushSize;
        const rect = canvas.getBoundingClientRect();
        return comp.brushSize * (rect.width / comp.refDims.w);
    }, [comp.brushSize, comp.refDims.w, comp.ready]);

    const aspect = comp.refDims.w && comp.refDims.h ? `${comp.refDims.w} / ${comp.refDims.h}` : '1 / 1';

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-50 dark:bg-black animate-in fade-in duration-150">

            {/* Top bar */}
            <div className="flex items-center justify-between px-4 h-14 shrink-0">
                <button
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-3 h-9 rounded-full text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                    <X className="w-4 h-4" />
                    <span>{isDe ? 'Schließen' : 'Close'}</span>
                </button>
                <Button variant="primary" size="m" onClick={handleSave} disabled={saving || !comp.ready} icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}>
                    {isDe ? 'Speichern' : 'Save'}
                </Button>
            </div>

            {/* Canvas */}
            <div className="relative flex-1 min-h-0 flex items-center justify-center px-4 pb-2">
                {!comp.ready && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-7 h-7 animate-spin text-zinc-300" />
                    </div>
                )}
                <div className="relative max-w-full max-h-full" style={{ aspectRatio: aspect, height: '100%' }}>
                    <canvas
                        ref={canvasRef}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerLeave={onPointerUp}
                        className="block w-full h-full rounded-lg shadow-sm touch-none bg-white dark:bg-zinc-900"
                        style={{ cursor: comp.activeId ? 'none' : 'default', objectFit: 'contain' }}
                    />
                    <BrushCursor canvasRef={canvasRef} size={displayBrush} mode={comp.mode} enabled={!!comp.activeId} />
                </div>

                {/* Brush pill — centered above the layer strip */}
                {comp.ready && comp.activeId && (
                    <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/5 dark:border-white/10 ${Theme.Effects.Shadow} rounded-full px-3 py-1.5`}>
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-full p-0.5">
                            <Tooltip text={isDe ? 'Hinzufügen' : 'Add'} side="top">
                                <button
                                    onClick={() => comp.setMode('add')}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${comp.mode === 'add' ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </Tooltip>
                            <Tooltip text={isDe ? 'Entfernen' : 'Remove'} side="top">
                                <button
                                    onClick={() => comp.setMode('remove')}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${comp.mode === 'remove' ? 'bg-white dark:bg-zinc-700 text-red-500 shadow-sm' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                            </Tooltip>
                        </div>
                        <input
                            type="range" min={20} max={Math.max(200, Math.round((comp.refDims.w || 1024) / 4))}
                            value={comp.brushSize}
                            onChange={(e) => comp.setBrushSize(Number(e.target.value))}
                            className="w-28 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500"
                        />
                    </div>
                )}
            </div>

            {/* Layer strip — centered */}
            <div className="shrink-0 px-4 py-4">
                <div className="flex items-end justify-center gap-3 overflow-x-auto no-scrollbar">
                    {comp.order.map((id) => {
                        const img = imageById.get(id);
                        if (!img) return null;
                        const isVisible = comp.visible.has(id);
                        const isActive = id === comp.activeId;
                        const isBase = id === comp.baseId;
                        const pos = comp.order.indexOf(id);
                        return (
                            <div key={id} className="shrink-0 flex flex-col items-center gap-1.5">
                                {/* Reorder */}
                                <div className="flex items-center gap-0.5 h-5">
                                    <button
                                        onClick={() => comp.moveLayer(id, -1)}
                                        disabled={pos === 0}
                                        className="w-5 h-5 flex items-center justify-center rounded text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-0 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => comp.moveLayer(id, 1)}
                                        disabled={pos === comp.order.length - 1}
                                        className="w-5 h-5 flex items-center justify-center rounded text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-0 transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Thumbnail = visibility toggle */}
                                <button
                                    onClick={() => comp.toggleVisible(id)}
                                    className={`relative w-16 h-16 rounded-lg overflow-hidden transition-all ${
                                        isActive ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-black'
                                        : 'ring-1 ring-zinc-200 dark:ring-zinc-800'
                                    } ${isVisible ? '' : 'opacity-40 grayscale'}`}
                                >
                                    <img src={img.thumbSrc || img.src} alt="" className="w-full h-full object-cover" />
                                    {/* Checkmark / visibility badge */}
                                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-[4px] flex items-center justify-center ${isVisible ? 'bg-zinc-900/85 dark:bg-white/90' : 'bg-black/30 border border-white/50'}`}>
                                        {isVisible && <Check className="w-3 h-3 text-white dark:text-zinc-900" strokeWidth={3} />}
                                    </span>
                                </button>

                                {/* Active-layer hint */}
                                <span className={`text-[10px] font-medium h-3 ${isActive ? 'text-orange-500' : 'text-transparent'}`}>
                                    {isDe ? 'Pinsel' : 'Brush'}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <p className="text-center text-[11px] text-zinc-400 mt-1">
                    {comp.activeId
                        ? (isDe ? 'Auf das aktive Bild (orange) malen — + hinzufügen, − entfernen. Pfeile sortieren, Häkchen blendet ein/aus.'
                               : 'Paint on the active image (orange) — + add, − remove. Arrows reorder, checkmark toggles.')
                        : (isDe ? 'Mindestens zwei Ebenen einblenden, um Teile zu kombinieren.'
                               : 'Show at least two layers to combine parts.')}
                </p>
            </div>
        </div>
    );
};

/** Brush ring that follows the pointer over the canvas. */
const BrushCursor: React.FC<{
    canvasRef: React.RefObject<HTMLCanvasElement>;
    size: number;
    mode: 'add' | 'remove';
    enabled: boolean;
}> = ({ canvasRef, size, mode, enabled }) => {
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !enabled) { setPos(null); return; }
        const move = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
            setPos(inside ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
        };
        const leave = () => setPos(null);
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerleave', leave);
        return () => { canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave); };
    }, [canvasRef, enabled]);

    if (!pos) return null;
    return (
        <div
            className="pointer-events-none absolute rounded-full"
            style={{
                left: pos.x, top: pos.y, width: size, height: size,
                transform: 'translate(-50%, -50%)',
                border: `2px solid ${mode === 'remove' ? '#ef4444' : '#10b981'}`,
                boxShadow: '0 0 0 1px rgba(0,0,0,.4)',
            }}
        />
    );
};
