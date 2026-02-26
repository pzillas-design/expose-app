
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AnnotationObject, TranslationFunction } from '@/types';
import { X, Check, Pen, Trash, RotateCw } from 'lucide-react';
import { Typo, Theme, Tooltip } from '@/components/ui/DesignSystem';
import { generateId } from '@/utils/ids';

export interface EditorCanvasProps {
    width: number;
    height: number;
    zoom: number; // New: zoom for scaling
    annotations: AnnotationObject[];
    onChange: (newAnnotations: AnnotationObject[]) => void;
    brushSize: number;
    activeTab: string;
    maskTool?: 'brush' | 'text' | 'shape' | 'select';
    activeShape?: 'rect' | 'circle' | 'line';
    isActive: boolean;
    isBrushResizing?: boolean;
    activeAnnotationId?: string | null;
    onActiveAnnotationChange?: (id: string | null) => void;
    onInteractionStart?: () => void; // New: signal start of move/resize
    onInteractionEnd?: () => void; // New: signal end of move/resize
    onEditStart?: (mode: 'brush' | 'objects') => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    t?: TranslationFunction;
}

const RES_SCALE = 3;

// Styles moved to constants for cleanliness
const OVERLAY_STYLES = {
    // No shadows, clean borders
    ChipContainer: `relative flex items-center gap-0 rounded-lg border transition-all ${Theme.Colors.ModalBg} ${Theme.Colors.Border} hover:border-zinc-500 group/chip `,

    ChipContainerActive: `relative flex items-center gap-0 rounded-lg border transition-all ${Theme.Colors.ModalBg} ${Theme.Colors.Border} p-1.5 min-w-[120px] z-30 `,

    ActionBtn: `flex items-center justify-center w-5 h-5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-black dark:hover:text-white transition-all shrink-0`,
    SaveBtn: `flex items-center justify-center w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-all shrink-0 ml-1`,
    RefThumb: `relative group/thumb shrink-0 w-6 h-6 mr-1.5`,
    RefImage: `w-full h-full object-cover rounded border border-zinc-200 dark:border-zinc-700`,
    Arrow: `absolute w-0 h-0 border-[6px] border-transparent pointer-events-none`
};

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
    width,
    height,
    zoom,
    annotations = [],
    onChange,
    brushSize,
    activeTab,
    maskTool = 'select',
    activeShape = 'rect',
    isActive,
    isBrushResizing = false,
    activeAnnotationId,
    onActiveAnnotationChange,
    onInteractionStart,
    onInteractionEnd,
    onEditStart,
    onContextMenu,
    t
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [activeMaskIdInternal, setInternalActiveMaskId] = useState<string | null>(null);

    // Determine active ID from props or internal state
    const currentActiveId = activeAnnotationId !== undefined ? activeAnnotationId : activeMaskIdInternal;

    const setActiveMaskId = (id: string | null) => {
        if (onActiveAnnotationChange) onActiveAnnotationChange(id);
        setInternalActiveMaskId(id);
    };

    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        if (currentActiveId) {
            setTimeout(() => {
                const activeInput = document.querySelector('.annotation-ui input') as HTMLInputElement;
                if (activeInput) activeInput.focus();
            }, 50);
        }
    }, [currentActiveId]);

    const [dragState, setDragState] = useState<{
        id: string;
        mode: 'move' | 'tl' | 'tr' | 'bl' | 'br' | 'rotate' | 'vertex';
        vertexIndex?: number;
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
        initialW: number;
        initialH: number;
        initialRotation: number;
        initialPoints: { x: number, y: number }[];
        isMoved: boolean;
    } | null>(null);

    const currentPathRef = useRef<{ x: number, y: number }[]>([]);

    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(RES_SCALE, RES_SCALE);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        annotations.forEach(ann => {
            if (ann.type === 'mask_path') {
                if (!ann.points || ann.points.length < 1) return;
                ctx.beginPath();
                ctx.lineWidth = ann.strokeWidth;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.moveTo(ann.points[0].x, ann.points[0].y);
                for (let i = 1; i < ann.points.length; i++) ctx.lineTo(ann.points[i].x, ann.points[i].y);
                ctx.stroke();
            }

            // Shapes rendering - always render regardless of activeTab
            if (ann.type === 'shape') {
                // Shapes rendering with unified look (filled white, opacity)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = ann.strokeWidth || 4;

                if (ann.shapeType === 'rect') {
                    if (ann.points && ann.points.length >= 3) {
                        ctx.beginPath();
                        ctx.moveTo(ann.points[0].x, ann.points[0].y);
                        for (let i = 1; i < ann.points.length; i++) ctx.lineTo(ann.points[i].x, ann.points[i].y);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    }
                }
                else if (ann.shapeType === 'circle') {
                    const cx = (ann.x || 0) + (ann.width || 0) / 2;
                    const cy = (ann.y || 0) + (ann.height || 0) / 2;
                    const rx = Math.abs((ann.width || 0) / 2);
                    const ry = Math.abs((ann.height || 0) / 2);
                    const rot = (ann.rotation || 0) * Math.PI / 180;

                    ctx.beginPath();
                    ctx.ellipse(cx, cy, rx, ry, rot, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                } else if (ann.shapeType === 'line' && ann.points && ann.points.length >= 2) {
                    ctx.beginPath();
                    ctx.lineWidth = ann.strokeWidth || 4;
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.moveTo(ann.points[0].x, ann.points[0].y);
                    ctx.lineTo(ann.points[1].x, ann.points[1].y);
                    ctx.stroke();
                }
            }
        });

        if (isDrawing && currentPathRef.current.length > 0 && maskTool === 'brush') {
            ctx.beginPath();
            ctx.lineWidth = brushSize;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.moveTo(currentPathRef.current[0].x, currentPathRef.current[0].y);
            for (let i = 1; i < currentPathRef.current.length; i++) ctx.lineTo(currentPathRef.current[i].x, currentPathRef.current[i].y);
            ctx.stroke();
        }
    }, [annotations, isDrawing, brushSize, width, activeTab, maskTool]);

    useEffect(() => { renderCanvas(); }, [renderCanvas, width, height]);

    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.width = width * RES_SCALE;
            canvasRef.current.height = height * RES_SCALE;
            renderCanvas();
        }
    }, [width, height, renderCanvas]);

    const getCoordinates = (clientX: number, clientY: number) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (width / rect.width),
            y: (clientY - rect.top) * (height / rect.height)
        };
    };

    const updateAnnotation = (id: string, patch: Partial<AnnotationObject>) => {
        onChange(annotations.map(a => a.id === id ? { ...a, ...patch } : a));
    };

    const deleteAnnotation = (id: string) => {
        onChange(annotations.filter(a => a.id !== id));
        setActiveMaskId(null);
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isActive || activeTab !== 'brush') return;
        if ((e.target as HTMLElement).closest('.annotation-ui')) return;

        // ONLY stop propagation if we are actually using the brush/drawing
        if (maskTool === 'brush') {
            e.stopPropagation();
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const { x, y } = getCoordinates(clientX, clientY);

            setIsDrawing(true);
            currentPathRef.current = [{ x, y }];
            setActiveMaskId(null);
        }
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const { x, y } = getCoordinates(clientX, clientY);

        if (dragState) {
            e.preventDefault(); e.stopPropagation();
            const dx = x - dragState.startX;
            const dy = y - dragState.startY;

            if (!dragState.isMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                setDragState(prev => prev ? { ...prev, isMoved: true } : null);
            }

            const updated = annotations.map(ann => {
                if (ann.id !== dragState.id) return ann;

                if (dragState.mode === 'move') {
                    if (ann.points && ann.points.length > 0) {
                        return {
                            ...ann,
                            points: dragState.initialPoints.map(p => ({
                                x: p.x + dx,
                                y: p.y + dy
                            }))
                        };
                    }
                    return { ...ann, x: dragState.initialX + dx, y: dragState.initialY + dy };
                }

                if (dragState.mode === 'vertex' && dragState.vertexIndex !== undefined && ann.points) {
                    const newPoints = [...ann.points];
                    newPoints[dragState.vertexIndex] = {
                        x: dragState.initialPoints[dragState.vertexIndex].x + dx,
                        y: dragState.initialPoints[dragState.vertexIndex].y + dy
                    };
                    return { ...ann, points: newPoints };
                }

                // Resize Logic
                if (['tl', 'tr', 'bl', 'br'].includes(dragState.mode)) {
                    const ix = dragState.initialX;
                    const iy = dragState.initialY;
                    const iw = dragState.initialW;
                    const ih = dragState.initialH;

                    let nx = ix, ny = iy, nw = iw, nh = ih;
                    const dx = x - dragState.startX;
                    const dy = y - dragState.startY;

                    if (dragState.mode === 'br') {
                        nw = iw + dx;
                        nh = ih + dy;
                    } else if (dragState.mode === 'bl') {
                        nx = ix + dx;
                        nw = iw - dx;
                        nh = ih + dy;
                    } else if (dragState.mode === 'tr') {
                        ny = iy + dy;
                        nh = ih - dy;
                        nw = iw + dx;
                    } else if (dragState.mode === 'tl') {
                        nx = ix + dx;
                        nw = iw - dx;
                        ny = iy + dy;
                        nh = ih - dy;
                    }

                    // Prevent minimal size issues
                    if (nw < 10) nw = 10;
                    if (nh < 10) nh = 10;

                    return { ...ann, x: nx, y: ny, width: nw, height: nh };
                }

                if (ann.shapeType === 'circle') {
                    // Circle specific logic if needed
                }

                return ann;
            });
            onChange(updated);
            return;
        }

        if (cursorRef.current && containerRef.current && activeTab === 'brush' && maskTool === 'brush') {
            const rect = containerRef.current.getBoundingClientRect();
            const cx = clientX - rect.left; const cy = clientY - rect.top;
            cursorRef.current.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
        }

        if (!isDrawing || maskTool !== 'brush') return;
        const last = currentPathRef.current[currentPathRef.current.length - 1];
        if (Math.abs(last.x - x) > 2 || Math.abs(last.y - y) > 2) {
            currentPathRef.current.push({ x, y });
            renderCanvas();
        }
    };

    const handleMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
        if (dragState) {
            if (!dragState.isMoved) setActiveMaskId(dragState.id);
            setDragState(null);
            onInteractionEnd?.();
            return;
        }
        if (!isDrawing) return;
        setIsDrawing(false);
        if (currentPathRef.current.length > 1) {
            onChange([...annotations, { id: generateId(), type: 'mask_path', points: [...currentPathRef.current], strokeWidth: brushSize, color: '#fff', text: '', createdAt: Date.now() }]);
        }
        currentPathRef.current = [];
        onInteractionEnd?.();
    };

    const startDrag = (e: React.MouseEvent, id: string, mode: any, ann: AnnotationObject, vertexIndex?: number) => {
        e.stopPropagation(); e.preventDefault();
        onInteractionStart?.();
        const clientX = 'touches' in e ? (e as any).touches[0].clientX : (e as any).clientX;
        const clientY = 'touches' in e ? (e as any).touches[0].clientY : (e as any).clientY;
        const { x, y } = getCoordinates(clientX, clientY);
        setDragState({
            id, mode, vertexIndex, startX: x, startY: y,
            initialX: ann.x || 0, initialY: ann.y || 0, initialW: ann.width || 0, initialH: ann.height || 0,
            initialRotation: ann.rotation || 0,
            initialPoints: ann.points || [], isMoved: false
        });
    };

    return (
        <div ref={containerRef} className="absolute inset-0 z-10 w-full h-full" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
            <canvas
                ref={canvasRef}
                className={`
 absolute inset-0 w-full h-full 
 ${activeTab === 'brush' && maskTool === 'brush' ? 'touch-none cursor-none' : 'cursor-default'}
 `}
            />

            {/* Sticky Brush Preview when resizing */}
            {activeTab === 'brush' && isBrushResizing && (
                <div
                    className="absolute z-50 rounded-full border border-white )] pointer-events-none transition-all duration-75"
                    style={{
                        width: brushSize * zoom,
                        height: brushSize * zoom,
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        opacity: 1
                    }}
                />
            )}

            {/* Normal Cursor Brush Preview */}
            {activeTab === 'brush' && maskTool === 'brush' && isActive && !isBrushResizing && <div ref={cursorRef} className={`absolute pointer-events-none rounded-full border border-white )] z-50 transition-opacity duration-150 ${isHovering ? 'opacity-100' : 'opacity-0'}`} style={{ width: brushSize * zoom, height: brushSize * zoom, left: 0, top: 0 }} />}

            {/* UI Overlay for Annotations */}
            {annotations.map(ann => {
                const isEditMode = activeTab === 'brush';
                const isActiveItem = currentActiveId === ann.id;

                if (ann.type === 'shape') {
                    if (ann.shapeType === 'rect') {
                        const points = ann.points || [];
                        const xs = points.map(p => p.x);
                        const ys = points.map(p => p.y);
                        const minX = Math.min(...xs);
                        const maxX = Math.max(...xs);
                        const minY = Math.min(...ys);
                        const maxY = Math.max(...ys);

                        return (
                            <div key={ann.id} className={`absolute pointer-events-none annotation-ui ${isActiveItem ? 'z-50' : 'z-20'}`} style={{ left: 0, top: 0, width: '100%', height: '100%' }}>
                                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible pointer-events-none absolute inset-0">
                                    <polygon
                                        points={points.map(p => `${p.x},${p.y}`).join(' ')}
                                        fill="transparent"
                                        stroke={isActiveItem ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)'}
                                        strokeWidth={isActiveItem ? 2 : 1}
                                        className="pointer-events-auto cursor-move"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setActiveMaskId(ann.id);
                                            startDrag(e, ann.id, 'move', ann);
                                        }}
                                    />
                                </svg>
                                {isActiveItem && (
                                    <>
                                        {points.map((p, idx) => (
                                            <div key={idx} className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full cursor-pointer z-[60] pointer-events-auto"
                                                style={{ left: `${(p.x / width) * 100}%`, top: `${(p.y / height) * 100}%`, transform: 'translate(-50%,-50%)' }}
                                                onMouseDown={(e) => startDrag(e, ann.id, 'vertex', ann, idx)} />
                                        ))}
                                        <button className="absolute p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 pointer-events-auto transition-colors z-[60] flex items-center justify-center w-8 h-8"
                                            style={{ left: `${(maxX / width) * 100}%`, top: `${(minY / height) * 100}%`, transform: 'translate(10px, -30px)' }}
                                            onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}>
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                    }

                    if (ann.shapeType === 'line') {
                        const p0 = ann.points[0];
                        const p1 = ann.points[1];
                        return (
                            <div key={ann.id} className={`absolute pointer-events-none annotation-ui ${isActiveItem ? 'z-50' : 'z-20'}`} style={{ left: 0, top: 0, width: '100%', height: '100%' }}>
                                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible pointer-events-none absolute inset-0">
                                    <line
                                        x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y}
                                        stroke="transparent"
                                        strokeWidth="20"
                                        className="pointer-events-auto cursor-move"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setActiveMaskId(ann.id);
                                            startDrag(e, ann.id, 'move', ann);
                                        }}
                                    />
                                </svg>
                                {isActiveItem && (
                                    <>
                                        <div className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full cursor-pointer z-[60] pointer-events-auto"
                                            style={{ left: `${(p0.x / width) * 100}%`, top: `${(p0.y / height) * 100}%`, transform: 'translate(-50%,-50%)' }}
                                            onMouseDown={(e) => startDrag(e, ann.id, 'vertex', ann, 0)} />
                                        <div className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full cursor-pointer z-[60] pointer-events-auto"
                                            style={{ left: `${(p1.x / width) * 100}%`, top: `${(p1.y / height) * 100}%`, transform: 'translate(-50%,-50%)' }}
                                            onMouseDown={(e) => startDrag(e, ann.id, 'vertex', ann, 1)} />
                                        <button className="absolute p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 pointer-events-auto transition-colors z-[60] flex items-center justify-center w-8 h-8"
                                            style={{ left: `${(Math.max(p0.x, p1.x) / width) * 100}%`, top: `${(Math.min(p0.y, p1.y) / height) * 100}%`, transform: 'translate(10px, -30px)' }}
                                            onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}>
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                    }

                    if (ann.shapeType === 'circle') {
                        const x = ann.x || 0;
                        const y = ann.y || 0;
                        const w = ann.width || 0;
                        const h = ann.height || 0;
                        const rotation = ann.rotation || 0;
                        const cx = x + w / 2;
                        const cy = y + h / 2;
                        const rx = Math.abs(w / 2);
                        const ry = Math.abs(h / 2);

                        return (
                            <div key={ann.id} className={`absolute pointer-events-none annotation-ui ${isActiveItem ? 'z-50' : 'z-20'}`} style={{ left: 0, top: 0, width: '100%', height: '100%' }}>
                                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible pointer-events-none absolute inset-0">
                                    <ellipse
                                        cx={cx}
                                        cy={cy}
                                        rx={Math.abs(w / 2)}
                                        ry={Math.abs(h / 2)}
                                        transform={`rotate(${rotation} ${cx} ${cy})`}
                                        fill="transparent"
                                        stroke={isActiveItem ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)'}
                                        strokeWidth={isActiveItem ? 2 : 1}
                                        className="pointer-events-auto cursor-move"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setActiveMaskId(ann.id);
                                            startDrag(e, ann.id, 'move', ann);
                                        }}
                                    />
                                </svg>
                                {isActiveItem && (
                                    <>
                                        {/* 4 Cardinal Handles for Circle Resize (top, right, bottom, left) */}
                                        {[
                                            { x: cx, y: cy - ry, cursor: 'n-resize', mode: 'tr' },
                                            { x: cx + rx, y: cy, cursor: 'e-resize', mode: 'br' },
                                            { x: cx, y: cy + ry, cursor: 's-resize', mode: 'bl' },
                                            { x: cx - rx, y: cy, cursor: 'w-resize', mode: 'tl' }
                                        ].map((h, i) => (
                                            <div key={i}
                                                className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full z-[60] pointer-events-auto "
                                                style={{
                                                    left: `${(h.x / width) * 100}%`,
                                                    top: `${(h.y / height) * 100}%`,
                                                    cursor: h.cursor,
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                                onMouseDown={(e) => startDrag(e, ann.id, h.mode as any, ann)}
                                            />
                                        ))}

                                        <button className="absolute p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 pointer-events-auto transition-colors z-[60] flex items-center justify-center w-8 h-8"
                                            style={{ left: `${(x + w) / width * 100}%`, top: `${y / height * 100}%`, transform: 'translate(10px, -30px)' }}
                                            onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}>
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                    }
                }

                // Coordinate Calculation for Chips
                let leftPct = 0, topPct = 0, isTopEdge = false;

                if (ann.type === 'stamp') {
                    if (ann.x === undefined || ann.y === undefined) return null;
                    leftPct = (ann.x / width) * 100;
                    topPct = (ann.y / height) * 100;
                } else if (ann.type === 'mask_path') {
                    let minX = Infinity, minY = Infinity;
                    if (!ann.points || ann.points.length === 0) return null;
                    ann.points.forEach(p => { if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; });
                    leftPct = (minX / width) * 100;
                    topPct = (minY / height) * 100;
                    isTopEdge = (minY / height) < 0.1;
                }

                // Determine horizontal alignment
                let horizontalAlign: 'left' | 'center' | 'right' = 'center';
                if (leftPct < 15) horizontalAlign = 'left';
                else if (leftPct > 85) horizontalAlign = 'right';

                // Calculate Transform
                let containerTransform = 'translate(-50%, 0)';
                if (horizontalAlign === 'left') containerTransform = 'translate(-10px, 0)';
                if (horizontalAlign === 'right') containerTransform = 'translate(calc(-100% + 10px), 0)';

                // Vertical Shift
                const verticalShift = isTopEdge ? 'translateY(12px)' : 'translateY(calc(-100% - 12px))';

                // Merge transforms
                const finalTransform = ann.type === 'stamp'
                    ? `${containerTransform} translateY(-50%)`
                    : `${containerTransform} ${verticalShift}`;

                // Arrow Logic
                const isPointingUp = isTopEdge;
                const arrowBaseStyle: React.CSSProperties = {};
                if (horizontalAlign === 'left') arrowBaseStyle.left = '10px';
                else if (horizontalAlign === 'right') arrowBaseStyle.right = '10px';
                else { arrowBaseStyle.left = '50%'; arrowBaseStyle.transform = 'translateX(-50%)'; }

                const borderArrowClass = isPointingUp ? "border-b-zinc-200 dark:border-b-zinc-800" : "border-t-zinc-200 dark:border-t-zinc-800";
                const borderArrowStyle = { ...arrowBaseStyle };
                if (isPointingUp) borderArrowStyle.bottom = '100%'; else borderArrowStyle.top = '100%';

                const fillArrowClass = isPointingUp ? "border-b-white dark:border-b-zinc-900" : "border-t-white dark:border-t-zinc-900";
                const fillArrowStyle = { ...arrowBaseStyle };
                if (isPointingUp) { fillArrowStyle.bottom = '100%'; fillArrowStyle.marginBottom = '-1px'; } else { fillArrowStyle.top = '100%'; fillArrowStyle.marginTop = '-1px'; }

                const hasText = ann.text && ann.text.trim().length > 0;
                const showChip = ann.type === 'stamp';
                const pathString = ann.type === 'mask_path' ? ann.points?.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';

                return (
                    <React.Fragment key={ann.id}>
                        {ann.type === 'mask_path' && (
                            <div className={`absolute inset-0 pointer-events-none ${isActiveItem ? 'z-50' : 'z-10'}`}>
                                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible pointer-events-none absolute inset-0">
                                    <path
                                        d={pathString}
                                        fill="none"
                                        stroke="transparent"
                                        strokeWidth={Math.max(20, (ann as any).strokeWidth || 40)}
                                        className="pointer-events-auto cursor-move"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setActiveMaskId(ann.id);
                                            startDrag(e, ann.id, 'move', ann);
                                        }}
                                    />
                                </svg>
                                {isActiveItem && (
                                    <button className="absolute p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 pointer-events-auto transition-colors z-[60] flex items-center justify-center w-8 h-8"
                                        style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(10px, -30px)' }}
                                        onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}>
                                        <Trash className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}

                        {showChip && (
                            <div
                                className={`absolute annotation-ui ${isActiveItem ? 'z-[60]' : 'z-20'}`}
                                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                                onMouseDown={(e) => ann.type === 'stamp' && startDrag(e, ann.id, 'move', ann)}
                            >
                                <div style={{ transform: finalTransform }} className={`${dragState?.id === ann.id ? '' : 'transition-transform duration-200'}`}>
                                    {isActiveItem ? (
                                        <div className={OVERLAY_STYLES.ChipContainerActive}>
                                            <div className={`${OVERLAY_STYLES.Arrow} ${borderArrowClass}`} style={borderArrowStyle} />
                                            <div className={`${OVERLAY_STYLES.Arrow} ${fillArrowClass}`} style={fillArrowStyle} />
                                            {ann.referenceImage && (
                                                <div className={OVERLAY_STYLES.RefThumb}>
                                                    <img src={ann.referenceImage} className={OVERLAY_STYLES.RefImage} alt="ref" />
                                                </div>
                                            )}
                                            <input
                                                value={ann.text || ''}
                                                onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'Enter') setActiveMaskId(null); }}
                                                placeholder="Text eingeben"
                                                className={`bg-transparent border-none outline-none ${Typo.Micro} tracking-normal flex-1 focus:ring-0 min-w-[80px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 mr-1.5`}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            />
                                            <Tooltip text="Save">
                                                <button
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.stopPropagation(); setActiveMaskId(null); }}
                                                    className={OVERLAY_STYLES.SaveBtn}
                                                >
                                                    <Check className="w-3 h-3" />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    ) : (
                                        <div
                                            className={`${OVERLAY_STYLES.ChipContainer} p-1.5 cursor-move hover:scale-105 group/chip`}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                startDrag(e, ann.id, 'move', ann);
                                            }}
                                        >
                                            <div className={`${OVERLAY_STYLES.Arrow} ${borderArrowClass}`} style={borderArrowStyle} />
                                            <div className={`${OVERLAY_STYLES.Arrow} ${fillArrowClass}`} style={fillArrowStyle} />
                                            {ann.referenceImage && (
                                                <div className="relative shrink-0 w-6 h-6 mr-1.5">
                                                    <img src={ann.referenceImage} className={OVERLAY_STYLES.RefImage} alt="ref" />
                                                </div>
                                            )}
                                            <span className={`${Typo.Micro} whitespace-nowrap mr-1.5 select-none ${ann.text ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`}>
                                                {ann.text || "Text eingeben"}
                                            </span>
                                            <div className="flex items-center gap-0.5">
                                                <button
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.stopPropagation(); setActiveMaskId(ann.id); }}
                                                    className={`${OVERLAY_STYLES.ActionBtn} opacity-0 group-hover/chip:opacity-100 transition-opacity duration-200`}
                                                >
                                                    <Pen className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                                                    className={`${OVERLAY_STYLES.ActionBtn} opacity-50 hover:opacity-100 ml-1`}
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};
