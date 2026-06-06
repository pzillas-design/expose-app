import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Check, Plus, Minus, ChevronUp, ChevronDown, Eye, EyeOff, Loader2 } from 'lucide-react';
import { CanvasImage } from '@/types';
import { Theme, Tooltip } from '@/components/ui/DesignSystem';
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
        ordered.sort((a, b) => (a.id === initialBaseId ? -1 : b.id === initialBaseId ? 1 : 0));
        return ordered
            .filter(i => !i.isGenerating && (i.src || i.thumbSrc || i.storage_path))
            .map(i => ({ id: i.id, image: i }));
    }, [stack, initialBaseId]);

    const comp = useLayerCompositing(layers, canvasRef);
    const imageById = useMemo(() => new Map(stack.map(i => [i.id, i])), [stack]);

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

    const onPointerUp = useCallback(() => {
        if (drawingRef.current) comp.commitStroke();
        drawingRef.current = false;
        lastPtRef.current = null;
    }, [comp]);

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
    const panelOrder = useMemo(() => [...comp.order].reverse(), [comp.order]); // top first

    return (
        <div className="fixed inset-0 z-[100] flex bg-zinc-50 dark:bg-black animate-in fade-in duration-150">

            {/* Canvas area */}
            <div className="relative flex-1 min-h-0 flex items-center justify-center p-4 md:p-8">
                <Tooltip text={isDe ? 'Schließen' : 'Close'} side="right">
                    <button
                        onClick={onClose}
                        className={`absolute top-4 left-4 z-20 w-9 h-9 rounded-full flex items-center justify-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-black/5 dark:border-white/10 ${Theme.Effects.Shadow} text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </Tooltip>

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

                {/* Brush pill — icon only */}
                {comp.ready && comp.activeId && (
                    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/5 dark:border-white/10 ${Theme.Effects.Shadow} rounded-full px-3 py-1.5`}>
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-full p-0.5">
                            <Tooltip text={isDe ? 'Hinzufügen' : 'Add'} side="top">
                                <button onClick={() => comp.setMode('add')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${comp.mode === 'add' ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}>
                                    <Plus className="w-4 h-4" />
                                </button>
                            </Tooltip>
                            <Tooltip text={isDe ? 'Entfernen' : 'Remove'} side="top">
                                <button onClick={() => comp.setMode('remove')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${comp.mode === 'remove' ? 'bg-white dark:bg-zinc-700 text-red-500 shadow-sm' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}>
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

            {/* Right layer panel */}
            <div className="w-[188px] shrink-0 h-full flex flex-col border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <div className="flex items-center justify-end px-3 h-14 shrink-0 border-b border-zinc-100 dark:border-zinc-900">
                    <Tooltip text={isDe ? 'Als neues Bild speichern' : 'Save as new image'} side="left">
                        <button
                            onClick={handleSave}
                            disabled={saving || !comp.ready}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-40 transition-opacity"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                    </Tooltip>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 py-3 flex flex-col gap-3">
                    {panelOrder.map((id) => {
                        const img = imageById.get(id);
                        if (!img) return null;
                        const pos = comp.order.indexOf(id);
                        return (
                            <LayerCard
                                key={id}
                                id={id}
                                img={img}
                                isActive={id === comp.activeId}
                                isVisible={comp.visible.has(id)}
                                isTop={pos === comp.order.length - 1}
                                isBottom={pos === 0}
                                revision={comp.revision}
                                ready={comp.ready}
                                drawThumb={comp.drawLayerThumb}
                                onSelect={() => comp.setActiveId(id)}
                                onToggle={() => comp.toggleVisible(id)}
                                onMove={(d) => comp.moveLayer(id, d)}
                                isDe={isDe}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/** One layer card — its thumbnail reflects the current mask (erased = checker). */
const LayerCard: React.FC<{
    id: string;
    img: CanvasImage;
    isActive: boolean;
    isVisible: boolean;
    isTop: boolean;
    isBottom: boolean;
    revision: number;
    ready: boolean;
    drawThumb: (id: string, target: HTMLCanvasElement) => void;
    onSelect: () => void;
    onToggle: () => void;
    onMove: (dir: -1 | 1) => void;
    isDe: boolean;
}> = ({ id, img, isActive, isVisible, isTop, isBottom, revision, ready, drawThumb, onSelect, onToggle, onMove, isDe }) => {
    const thumbRef = useRef<HTMLCanvasElement>(null);
    const ar = (img.realWidth && img.realHeight) ? img.realWidth / img.realHeight
        : (img.width && img.height ? img.width / img.height : 1);

    useEffect(() => {
        const c = thumbRef.current;
        if (!c) return;
        const w = 160;
        const h = Math.max(40, Math.round(w / (ar || 1)));
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
        drawThumb(id, c);
    }, [id, revision, ready, ar, drawThumb]);

    return (
        <button
            onClick={onSelect}
            className={`relative w-full rounded-lg overflow-hidden transition-all ${
                isActive ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950'
                : 'ring-1 ring-zinc-200 dark:ring-zinc-800 hover:ring-zinc-300 dark:hover:ring-zinc-700'
            } ${isVisible ? '' : 'opacity-40'}`}
            style={{ aspectRatio: `${ar}` }}
        >
            <canvas ref={thumbRef} className="block w-full h-full" />

            {/* Visibility */}
            <Tooltip text={isVisible ? (isDe ? 'Ausblenden' : 'Hide') : (isDe ? 'Einblenden' : 'Show')} side="left">
                <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); onToggle(); }}
                    className="absolute top-1.5 left-1.5 w-6 h-6 rounded-md flex items-center justify-center bg-black/45 backdrop-blur-sm text-white hover:bg-black/65 transition-colors"
                >
                    {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </span>
            </Tooltip>

            {/* Reorder */}
            <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
                <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); if (!isTop) onMove(1); }}
                    className={`w-6 h-6 rounded-md flex items-center justify-center bg-black/45 backdrop-blur-sm text-white hover:bg-black/65 transition-all ${isTop ? 'opacity-0 pointer-events-none' : ''}`}
                >
                    <ChevronUp className="w-3.5 h-3.5" />
                </span>
                <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); if (!isBottom) onMove(-1); }}
                    className={`w-6 h-6 rounded-md flex items-center justify-center bg-black/45 backdrop-blur-sm text-white hover:bg-black/65 transition-all ${isBottom ? 'opacity-0 pointer-events-none' : ''}`}
                >
                    <ChevronDown className="w-3.5 h-3.5" />
                </span>
            </div>
        </button>
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
    useEffect(() => {
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
