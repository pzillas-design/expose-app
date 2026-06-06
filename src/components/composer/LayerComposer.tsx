import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Minus, ChevronUp, ChevronDown, Eye, EyeOff, Loader2, Circle, CircleDotDashed } from 'lucide-react';
import { CanvasImage } from '@/types';
import { Theme, Tooltip, Button } from '@/components/ui/DesignSystem';
import { useLayerCompositing } from './useLayerCompositing';
import type { ComposerLayer } from './useLayerCompositing';

interface LayerComposerProps {
    stack: CanvasImage[];
    initialBaseId: string;
    onClose: () => void;
    onSave: (baseImage: CanvasImage, compositeDataUrl: string, refW: number, refH: number) => Promise<string | null> | void;
    t: (key: any) => string;
    isDe: boolean;
}

const MIN_W = 300;
const MAX_W = 600;

export const LayerComposer: React.FC<LayerComposerProps> = ({ stack, initialBaseId, onClose, onSave, isDe }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [saving, setSaving] = useState(false);
    const [panelWidth, setPanelWidth] = useState(360);
    const [isResizing, setIsResizing] = useState(false);

    const layers: ComposerLayer[] = useMemo(() => {
        const ordered = [...stack];
        ordered.sort((a, b) => (a.id === initialBaseId ? -1 : b.id === initialBaseId ? 1 : 0));
        return ordered
            .filter(i => !i.isGenerating && (i.src || i.thumbSrc || i.storage_path))
            .map(i => ({ id: i.id, image: i }));
    }, [stack, initialBaseId]);

    const comp = useLayerCompositing(layers, canvasRef);
    const imageById = useMemo(() => new Map(stack.map(i => [i.id, i])), [stack]);

    // --- Panel resize (mirrors the edit-mode SideSheet) ---
    useEffect(() => {
        if (!isResizing) return;
        const onMove = (e: MouseEvent) => {
            const w = Math.min(Math.max(window.innerWidth - e.clientX, MIN_W), MAX_W);
            setPanelWidth(w);
        };
        const onUp = () => { setIsResizing(false); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [isResizing]);

    // --- Pointer painting ---
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

    const panelOrder = useMemo(() => [...comp.order].reverse(), [comp.order]);

    return (
        <div className="fixed inset-0 z-[100] flex overflow-hidden bg-zinc-50 dark:bg-black animate-in fade-in duration-150">

            {/* Canvas area */}
            <div className="relative flex-1 min-w-0 min-h-0 flex items-center justify-center p-4 md:p-8">
                <Tooltip text={isDe ? 'Schließen' : 'Close'} side="right">
                    <button
                        onClick={onClose}
                        className={`absolute top-4 left-4 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/5 dark:border-white/10 ${Theme.Effects.Shadow} text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </Tooltip>

                {!comp.ready && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-7 h-7 animate-spin text-zinc-300" />
                    </div>
                )}

                {/* Canvas: scales to fit the available box while preserving aspect
                    (object-contain via intrinsic canvas size + max constraints). */}
                <canvas
                    ref={canvasRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                    className="block max-w-full max-h-full rounded-lg shadow-sm touch-none bg-white dark:bg-zinc-900"
                    style={{ cursor: comp.activeId ? 'none' : 'default' }}
                />
                <BrushCursor canvasRef={canvasRef} size={displayBrush} mode={comp.mode} enabled={!!comp.activeId} />

                {/* Bottom toolbar — styled like the annotation toolbar */}
                {comp.ready && (
                    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/5 dark:border-white/5 ${Theme.Effects.Shadow} rounded-full pointer-events-auto`}>
                        {/* Add / Remove */}
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-full p-1">
                            <Tooltip text={isDe ? 'Hinzufügen' : 'Add'} side="top">
                                <button onClick={() => comp.setMode('add')} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${comp.mode === 'add' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>
                                    <Plus className="w-5 h-5" />
                                </button>
                            </Tooltip>
                            <Tooltip text={isDe ? 'Entfernen' : 'Remove'} side="top">
                                <button onClick={() => comp.setMode('remove')} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${comp.mode === 'remove' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>
                                    <Minus className="w-5 h-5" />
                                </button>
                            </Tooltip>
                        </div>

                        {/* Brush size */}
                        <div className="flex items-center gap-2 px-2">
                            <Tooltip text={isDe ? 'Pinselgröße' : 'Brush size'} side="top"><Circle className="w-4 h-4 text-zinc-400 shrink-0" /></Tooltip>
                            <input type="range" min={20} max={Math.max(200, Math.round((comp.refDims.w || 1024) / 4))}
                                value={comp.brushSize} onChange={(e) => comp.setBrushSize(Number(e.target.value))}
                                className="w-28 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer accent-zinc-500" />
                        </div>
                    </div>
                )}
            </div>

            {/* Resize handle */}
            <div
                onMouseDown={() => setIsResizing(true)}
                className="w-1.5 shrink-0 cursor-col-resize bg-transparent hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            />

            {/* Right layer panel — resizable, SideSheet-like */}
            <div
                className="shrink-0 h-full flex flex-col border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                style={{ width: `${panelWidth}px` }}
            >
                <div className="flex items-center px-4 h-14 shrink-0 border-b border-zinc-100 dark:border-zinc-900">
                    <h2 className="text-sm font-semibold text-black dark:text-white">{isDe ? 'Ebenen' : 'Layers'}</h2>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 flex flex-col gap-5">
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

                {/* Footer: feather + save */}
                <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-900 px-4 pt-4 pb-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3 py-3">
                        <Tooltip text={isDe ? 'Weiche Kante (global)' : 'Feather (global)'} side="top">
                            <CircleDotDashed className="w-4 h-4 text-zinc-400 shrink-0" />
                        </Tooltip>
                        <input
                            type="range" min={0} max={Math.max(40, Math.round((comp.refDims.w || 1024) / 16))}
                            value={comp.feather} onChange={(e) => comp.setFeather(Number(e.target.value))}
                            className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer accent-zinc-500"
                        />
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !comp.ready}
                        variant="primary-mono"
                        size="l"
                        className="w-full !h-[44px] !rounded-full"
                        icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                    >
                        {isDe ? 'Speichern' : 'Save'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const ctlBtn = 'w-8 h-8 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none';

/** One layer: controls row on top, masked thumbnail below. */
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
        const w = 320;
        const h = Math.max(60, Math.round(w / (ar || 1)));
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
        drawThumb(id, c);
    }, [id, revision, ready, ar, drawThumb]);

    return (
        <div className="flex flex-col gap-2">
            {/* Controls above the thumbnail — visibility left, reorder right */}
            <div className="flex items-center gap-1.5">
                <Tooltip text={isVisible ? (isDe ? 'Ausblenden' : 'Hide') : (isDe ? 'Einblenden' : 'Show')} side="top">
                    <button onClick={onToggle} className={`${ctlBtn} ${isVisible ? '' : 'ring-1 ring-zinc-300 dark:ring-zinc-600'}`}>
                        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                </Tooltip>
                <Tooltip text={isDe ? 'Nach oben' : 'Move up'} side="top">
                    <button onClick={() => onMove(1)} disabled={isTop} className={`${ctlBtn} ml-auto`}><ChevronUp className="w-4 h-4" /></button>
                </Tooltip>
                <Tooltip text={isDe ? 'Nach unten' : 'Move down'} side="top">
                    <button onClick={() => onMove(-1)} disabled={isBottom} className={ctlBtn}><ChevronDown className="w-4 h-4" /></button>
                </Tooltip>
            </div>

            {/* Masked thumbnail (transparent where erased → panel bg shows through) */}
            <button
                onClick={onSelect}
                className={`relative w-full rounded-lg overflow-hidden transition-all ${
                    isActive ? 'ring-2 ring-orange-500'
                    : 'ring-1 ring-zinc-200 dark:ring-zinc-800 hover:ring-zinc-300 dark:hover:ring-zinc-700'
                } ${isVisible ? '' : 'opacity-40'}`}
                style={{ aspectRatio: `${ar}` }}
            >
                <canvas ref={thumbRef} className="block w-full h-full" />
            </button>
        </div>
    );
};

/** Dashed brush ring with a centered +/− glyph showing the active mode. */
const BrushCursor: React.FC<{
    canvasRef: React.RefObject<HTMLCanvasElement>;
    size: number;
    mode: 'add' | 'remove';
    enabled: boolean;
}> = ({ canvasRef, size, mode, enabled }) => {
    // Fixed-position cursor in viewport coords — independent of canvas layout/
    // letterboxing, so it always lines up with the pointer.
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !enabled) { setPos(null); return; }
        const move = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
            setPos(inside ? { x: e.clientX, y: e.clientY } : null);
        };
        const leave = () => setPos(null);
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerleave', leave);
        return () => { canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave); };
    }, [canvasRef, enabled]);

    if (!pos) return null;
    const Glyph = mode === 'remove' ? Minus : Plus;
    return (
        <div
            className="pointer-events-none fixed z-[110] rounded-full flex items-center justify-center"
            style={{
                left: pos.x, top: pos.y, width: size, height: size,
                transform: 'translate(-50%, -50%)',
                border: '2px dashed #fff',
                boxShadow: '0 0 0 1px rgba(0,0,0,.5)',
            }}
        >
            <Glyph className="w-4 h-4 text-white" strokeWidth={3} style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,.9))' }} />
        </div>
    );
};
