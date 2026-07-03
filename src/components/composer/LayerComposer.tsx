import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Plus, Minus, ChevronUp, ChevronDown, Eye, EyeOff, Loader2, Circle, Download } from 'lucide-react';
import { CanvasImage } from '@/types';
import { Theme, Tooltip, Button, RoundIconButton } from '@/components/ui/DesignSystem';
import { useLayerCompositing } from './useLayerCompositing';
import type { ComposerLayer } from './useLayerCompositing';

interface LayerComposerProps {
    stack: CanvasImage[];
    initialBaseId: string;
    title?: string;
    onClose: () => void;
    onSave: (baseImage: CanvasImage, compositeDataUrl: string, refW: number, refH: number) => Promise<string | null> | void;
    t: (key: any) => string;
    isDe: boolean;
}

const MIN_W = 300;
const MAX_W = 600;

export const LayerComposer: React.FC<LayerComposerProps> = ({ stack, initialBaseId, title, onClose, onSave, isDe }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [saving, setSaving] = useState(false);
    const [panelWidth, setPanelWidth] = useState(MIN_W);
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

    const handleDownload = useCallback(() => {
        const out = comp.exportComposite();
        if (!out) return;
        // Gleiche Namenskonvention wie beim Speichern (handleSaveComposite):
        // baseName_vN mit der nächsten freien Version im Stapel.
        const parseVer = (t?: string) => {
            const m = (t || '').match(/_v(\d+)$/);
            return m ? parseInt(m[1], 10) : 1;
        };
        const base = stack.find(i => i.id === comp.baseId) || stack[0];
        const rawBase = (base?.baseName || base?.title || title || 'composite').replace(/_v\d+$/, '');
        const nextVer = stack.reduce((max, i) => Math.max(max, parseVer(i.title)), 0) + 1;
        const a = document.createElement('a');
        a.href = out.dataUrl;
        a.download = `${`${rawBase}_v${nextVer}`.replace(/[^a-z0-9_-]+/gi, '_')}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }, [comp, stack, title]);

    const displayBrush = useMemo(() => {
        const canvas = canvasRef.current;
        if (!canvas || !comp.refDims.w) return comp.brushSize;
        const rect = canvas.getBoundingClientRect();
        return comp.brushSize * (rect.width / comp.refDims.w);
    }, [comp.brushSize, comp.refDims.w, comp.ready]);

    // Inner (hard-core) radius fraction — the dashed outer ring is the full brush,
    // the solid inner ring shows where the soft falloff begins.
    const innerRatio = Math.min(0.98, 1 - comp.softness / 100);
    // While dragging a slider, show a centered preview (like the annotation editor).
    const [isAdjusting, setIsAdjusting] = useState(false);

    const panelOrder = useMemo(() => [...comp.order].reverse(), [comp.order]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-zinc-50 dark:bg-black animate-in fade-in duration-150">

            {/* Standard header: back · title · download · save */}
            <header className="relative shrink-0 h-14 flex items-center px-3 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <RoundIconButton icon={<ChevronLeft className="w-5 h-5" />} onClick={onClose} variant="ghost" />
                <h2 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-black dark:text-white truncate max-w-[40%]">
                    {title || (isDe ? 'Ebenen' : 'Layers')}
                </h2>
                <div className="ml-auto flex items-center gap-1.5">
                    <Tooltip text={isDe ? 'Herunterladen' : 'Download'} side="bottom">
                        <RoundIconButton icon={<Download className="w-5 h-5" />} onClick={handleDownload} variant="ghost" disabled={!comp.ready} />
                    </Tooltip>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !comp.ready}
                        variant="primary-mono"
                        size="m"
                        icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                    >
                        {isDe ? 'Speichern' : 'Save'}
                    </Button>
                </div>
            </header>

            {/* Body */}
            <div className="flex-1 flex min-h-0 overflow-hidden">

            {/* Canvas area */}
            <div className="relative flex-1 min-w-0 min-h-0 flex items-center justify-center">
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
                    className="block max-w-full max-h-full touch-none bg-white dark:bg-zinc-900"
                    style={{
                        cursor: comp.activeId ? 'none' : 'default',
                        // Reveal like the detail view once the composite is ready.
                        animation: comp.ready ? 'detail-img-in 260ms cubic-bezier(0.25,1,0.5,1) both' : undefined,
                    }}
                />
                <BrushCursor canvasRef={canvasRef} size={displayBrush} innerRatio={innerRatio} enabled={!!comp.activeId} hidden={isAdjusting} mode={comp.mode} />

                {/* Centered brush preview while dragging a slider */}
                {comp.ready && comp.activeId && isAdjusting && (
                    <div className="pointer-events-none absolute left-1/2 top-1/2 z-30" style={{ transform: 'translate(-50%, -50%)' }}>
                        <BrushRing size={displayBrush} innerRatio={innerRatio} mode={comp.mode} />
                    </div>
                )}

                {/* Bottom toolbar — styled like the annotation toolbar */}
                {comp.ready && (
                    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/5 dark:border-white/5 ${Theme.Effects.Shadow} rounded-full pointer-events-auto`}>
                        {/* Add / Remove — no container bg, only the active icon is filled
                            (mirrors the annotation toolbar) */}
                        <div className="flex items-center gap-1">
                            <Tooltip text={isDe ? 'Hinzufügen' : 'Add'} side="top">
                                <button onClick={() => comp.setMode('add')} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${comp.mode === 'add' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                                    <Plus className="w-5 h-5" />
                                </button>
                            </Tooltip>
                            <Tooltip text={isDe ? 'Entfernen' : 'Remove'} side="top">
                                <button onClick={() => comp.setMode('remove')} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${comp.mode === 'remove' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                                    <Minus className="w-5 h-5" />
                                </button>
                            </Tooltip>
                        </div>

                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

                        {/* Brush size */}
                        <div className="flex items-center gap-2 px-2">
                            <Tooltip text={isDe ? 'Pinselgröße' : 'Brush size'} side="top"><Circle className="w-4 h-4 text-zinc-400 shrink-0" /></Tooltip>
                            <input type="range" min={20} max={Math.max(200, Math.round((comp.refDims.w || 1024) / 4))}
                                value={comp.brushSize} onChange={(e) => comp.setBrushSize(Number(e.target.value))}
                                onMouseDown={() => setIsAdjusting(true)} onMouseUp={() => setIsAdjusting(false)}
                                onTouchStart={() => setIsAdjusting(true)} onTouchEnd={() => setIsAdjusting(false)}
                                className="w-24 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer accent-zinc-500" />
                        </div>

                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

                        {/* Edge softness (per stroke) */}
                        <div className="flex items-center gap-2 px-2">
                            <Tooltip text={isDe ? 'Kantenweichheit' : 'Edge softness'} side="top">
                                {/* Blurry dot icon representing edge softness */}
                                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                    <div className="w-3 h-3 rounded-full bg-zinc-400 blur-[2.5px]" />
                                </div>
                            </Tooltip>
                            <input type="range" min={0} max={100}
                                value={comp.softness} onChange={(e) => comp.setSoftness(Number(e.target.value))}
                                onMouseDown={() => setIsAdjusting(true)} onMouseUp={() => setIsAdjusting(false)}
                                onTouchStart={() => setIsAdjusting(true)} onTouchEnd={() => setIsAdjusting(false)}
                                className="w-24 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer accent-zinc-500" />
                        </div>
                    </div>
                )}
            </div>

            {/* Resize handle — fine divider border + panel-coloured fill (white in
                light mode, not grey); only greys out on hover. */}
            <div
                onMouseDown={() => setIsResizing(true)}
                className="w-1.5 shrink-0 cursor-col-resize border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            />

            {/* Right layer panel — resizable, SideSheet-like. Divider line lives on
                the resize handle now, so no border-l here. */}
            <div
                className="shrink-0 h-full flex flex-col bg-white dark:bg-zinc-950"
                style={{ width: `${panelWidth}px` }}
            >
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
            </div>

            </div>{/* /body */}
        </div>
    );
};

// Overlay control button: persistent circular fill (no blur). Light mode uses a
// light fill with dark icon; dark mode a dark fill with white icon.
const overlayBtn = 'w-9 h-9 rounded-full flex items-center justify-center bg-white/70 dark:bg-black/40 text-zinc-900 dark:text-white hover:bg-white/90 dark:hover:bg-black/60 transition-colors disabled:opacity-30 disabled:pointer-events-none';

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
        // Clean thumbnail: active = full opacity + thin white border. Controls stay
        // hidden until you hover the card (no icons cluttering the thumbnails).
        <div
            onClick={onSelect}
            className={`group relative w-full rounded-lg overflow-hidden cursor-pointer transition-all ${
                isActive ? 'ring-1 ring-zinc-900 dark:ring-white opacity-100'
                : `ring-1 ring-zinc-200 dark:ring-zinc-800 hover:ring-zinc-300 dark:hover:ring-zinc-700 ${isVisible ? 'opacity-75 hover:opacity-100' : 'opacity-35 hover:opacity-50'}`
            }`}
            style={{ aspectRatio: `${ar}` }}
        >
            <canvas ref={thumbRef} className="block w-full h-full" />

            {/* Vertical control column — up arrow / eye / down arrow. Arrows are
                permanent on the active layer and hover-only otherwise; the eye
                stays visible on every layer. */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
                <Tooltip text={isDe ? 'Nach oben' : 'Move up'} side="left">
                    <button onClick={(e) => { e.stopPropagation(); onMove(1); }} disabled={isTop} className={`${overlayBtn} pointer-events-auto transition-opacity group-hover:opacity-100 ${isActive ? 'opacity-70' : 'opacity-0'}`}><ChevronUp className="w-5 h-5" /></button>
                </Tooltip>
                <Tooltip text={isVisible ? (isDe ? 'Ausblenden' : 'Hide') : (isDe ? 'Einblenden' : 'Show')} side="left">
                    <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className={`${overlayBtn} pointer-events-auto opacity-70 group-hover:opacity-100 transition-opacity`}>
                        {isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                </Tooltip>
                <Tooltip text={isDe ? 'Nach unten' : 'Move down'} side="left">
                    <button onClick={(e) => { e.stopPropagation(); onMove(-1); }} disabled={isBottom} className={`${overlayBtn} pointer-events-auto transition-opacity group-hover:opacity-100 ${isActive ? 'opacity-70' : 'opacity-0'}`}><ChevronDown className="w-5 h-5" /></button>
                </Tooltip>
            </div>
        </div>
    );
};

/**
 * Brush ring: a dashed white outer circle = the full brush extent, and a solid
 * white inner circle = where the soft falloff begins. The gap between them grows
 * with edge softness. Plain white lines, no shadow — like the annotation editor.
 */
const BrushRing: React.FC<{ size: number; innerRatio: number; mode?: 'add' | 'remove' }> = ({ size, innerRatio, mode }) => {
    const s = Math.max(10, size);
    const c = s / 2;
    const outer = Math.max(1, c - 1);
    const inner = Math.max(0.5, outer * innerRatio);
    const arm = Math.max(3, Math.min(6, s * 0.09)); // centered +/- glyph
    return (
        <svg width={s} height={s} className="block overflow-visible">
            <circle cx={c} cy={c} r={outer} fill="none" stroke="#fff" strokeWidth={1.5} strokeDasharray="4 4" />
            {innerRatio < 0.95 && <circle cx={c} cy={c} r={inner} fill="none" stroke="#fff" strokeWidth={1.5} />}
            {/* Mode indicator: white + (add) or − (remove) in the center */}
            {mode && (
                <g stroke="#fff" strokeWidth={2} strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }}>
                    <line x1={c - arm} y1={c} x2={c + arm} y2={c} />
                    {mode === 'add' && <line x1={c} y1={c - arm} x2={c} y2={c + arm} />}
                </g>
            )}
        </svg>
    );
};

/** Brush ring that follows the pointer over the canvas. */
const BrushCursor: React.FC<{
    canvasRef: React.RefObject<HTMLCanvasElement>;
    size: number;
    innerRatio: number;
    enabled: boolean;
    hidden?: boolean;
    mode?: 'add' | 'remove';
}> = ({ canvasRef, size, innerRatio, enabled, hidden, mode }) => {
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

    if (!pos || hidden) return null;
    return (
        <div className="pointer-events-none fixed z-[110]" style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}>
            <BrushRing size={size} innerRatio={innerRatio} mode={mode} />
        </div>
    );
};
