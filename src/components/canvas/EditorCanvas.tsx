
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AnnotationObject, TranslationFunction } from '@/types';
import { X, Check, Pen, Trash2 } from 'lucide-react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
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
    onEditStart?: (mode: 'brush' | 'objects') => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    t?: TranslationFunction;
}

const RES_SCALE = 3;

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
                if (ann.points.length < 1) return;
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
                ctx.lineWidth = 2;

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
                    ctx.save();
                    const cx = (ann.x || 0) + (ann.width || 0) / 2;
                    const cy = (ann.y || 0) + (ann.height || 0) / 2;
                    ctx.translate(cx, cy);
                    ctx.rotate(((ann.rotation || 0) * Math.PI) / 180);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, (ann.width || 0) / 2, (ann.height || 0) / 2, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
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
        e.stopPropagation();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const { x, y } = getCoordinates(clientX, clientY);

        // Only brush tool works via canvas click now
        // Text and shapes are placed via buttons in the sidebar
        if (maskTool === 'brush') {
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

                if (ann.shapeType === 'circle') {
                    if (dragState.mode === 'rotate') {
                        const cx = ann.x! + ann.width! / 2;
                        const cy = ann.y! + ann.height! / 2;
                        const angle = Math.atan2(y - cy, x - cx) * (180 / Math.PI);
                        return { ...ann, rotation: angle + 90 };
                    }
                    if (['tl', 'tr', 'bl', 'br'].includes(dragState.mode)) {
                        let { initialX: iX, initialY: iY, initialW: iW, initialH: iH } = dragState;
                        let nX = iX, nY = iY, nW = iW, nH = iH;
                        if (dragState.mode === 'tl') { nX += dx; nY += dy; nW -= dx; nH -= dy; }
                        else if (dragState.mode === 'tr') { nY += dy; nW += dx; nH -= dy; }
                        else if (dragState.mode === 'bl') { nX += dx; nW -= dx; nH += dy; }
                        else if (dragState.mode === 'br') { nW += dx; nH += dy; }
                        return { ...ann, x: nX, y: nY, width: Math.max(10, nW), height: Math.max(10, nH) };
                    }
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
            return;
        }
        if (!isDrawing) return;
        setIsDrawing(false);
        if (currentPathRef.current.length > 1) {
            onChange([...annotations, { id: generateId(), type: 'mask_path', points: [...currentPathRef.current], strokeWidth: brushSize, color: '#fff', text: '', createdAt: Date.now() }]);
        }
        currentPathRef.current = [];
    };

    const startDrag = (e: React.MouseEvent, id: string, mode: any, ann: AnnotationObject, vertexIndex?: number) => {
        e.stopPropagation(); e.preventDefault();
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
            <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full touch-none ${activeTab === 'brush' ? (maskTool === 'brush' ? 'cursor-none' : 'cursor-default') : 'cursor-default'}`} />

            {/* Sticky Brush Preview when resizing */}
            {activeTab === 'brush' && isBrushResizing && (
                <div
                    className="absolute z-50 rounded-full border border-white shadow-[0_0_10px_rgba(255,255,255,0.7)] pointer-events-none transition-all duration-75"
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
            {activeTab === 'brush' && maskTool === 'brush' && isActive && !isBrushResizing && <div ref={cursorRef} className={`absolute pointer-events-none rounded-full border border-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-50 transition-opacity duration-150 ${isHovering ? 'opacity-100' : 'opacity-0'}`} style={{ width: brushSize * zoom, height: brushSize * zoom, left: 0, top: 0 }} />}

            {/* UI Overlay for Annotations */}
            {annotations.map(ann => {
                const isEditMode = activeTab === 'brush';
                const active = currentActiveId === ann.id;

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
                            <div key={ann.id} className={`absolute pointer-events-none annotation-ui ${active ? 'z-50' : 'z-20'}`} style={{ left: 0, top: 0, width: '100%', height: '100%' }}>
                                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible pointer-events-none absolute inset-0">
                                    <polygon
                                        points={points.map(p => `${p.x},${p.y}`).join(' ')}
                                        fill="transparent"
                                        stroke={active ? '#3b82f6' : 'transparent'}
                                        strokeWidth={active ? 2 : 15}
                                        className="pointer-events-auto cursor-move"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setActiveMaskId(ann.id);
                                            startDrag(e, ann.id, 'move', ann);
                                        }}
                                    />
                                </svg>
                                {active && (
                                    <>
                                        {points.map((p, idx) => (
                                            <div key={idx} className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full cursor-pointer z-[60] shadow-md pointer-events-auto"
                                                style={{ left: `${(p.x / width) * 100}%`, top: `${(p.y / height) * 100}%`, transform: 'translate(-50%,-50%)' }}
                                                onMouseDown={(e) => startDrag(e, ann.id, 'vertex', ann, idx)} />
                                        ))}
                                        <button className="absolute p-2 bg-red-500 rounded-full text-white shadow-xl pointer-events-auto hover:bg-red-600 transition-colors"
                                            style={{ left: `${(maxX / width) * 100}%`, top: `${(minY / height) * 100}%`, transform: 'translate(10px, -30px)' }}
                                            onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}>
                                            <Trash2 className="w-4 h-4" />
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
                            <div key={ann.id} className={`absolute pointer-events-none annotation-ui ${active ? 'z-50' : 'z-20'}`} style={{ left: 0, top: 0, width: '100%', height: '100%' }}>
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
                                {active && (
                                    <>
                                        <div className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full cursor-pointer z-[60] shadow-md pointer-events-auto"
                                            style={{ left: `${(p0.x / width) * 100}%`, top: `${(p0.y / height) * 100}%`, transform: 'translate(-50%,-50%)' }}
                                            onMouseDown={(e) => startDrag(e, ann.id, 'vertex', ann, 0)} />
                                        <div className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full cursor-pointer z-[60] shadow-md pointer-events-auto"
                                            style={{ left: `${(p1.x / width) * 100}%`, top: `${(p1.y / height) * 100}%`, transform: 'translate(-50%,-50%)' }}
                                            onMouseDown={(e) => startDrag(e, ann.id, 'vertex', ann, 1)} />
                                        <button className="absolute p-2 bg-red-500 rounded-full text-white shadow-xl pointer-events-auto"
                                            style={{ left: `${(Math.max(p0.x, p1.x) / width) * 100}%`, top: `${(Math.min(p0.y, p1.y) / height) * 100}%`, transform: 'translate(10px, -30px)' }}
                                            onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}>
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                    }

                    if (ann.shapeType === 'circle') {
                        const cx = (ann.x || 0) + (ann.width || 0) / 2;
                        const cy = (ann.y || 0) + (ann.height || 0) / 2;
                        const rx = (ann.width || 0) / 2;
                        const ry = (ann.height || 0) / 2;
                        const rot = ann.rotation || 0;

                        return (
                            <div key={ann.id} className={`absolute pointer-events-none annotation-ui ${active ? 'z-50' : 'z-20'}`} style={{ left: 0, top: 0, width: '100%', height: '100%' }}>
                                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible pointer-events-none absolute inset-0">
                                    <ellipse
                                        cx={cx}
                                        cy={cy}
                                        rx={rx}
                                        ry={ry}
                                        transform={`rotate(${rot} ${cx} ${cy})`}
                                        fill="transparent"
                                        stroke={active ? '#3b82f6' : 'transparent'}
                                        strokeWidth={active ? 2 : 15}
                                        className="pointer-events-auto cursor-move"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setActiveMaskId(ann.id);
                                            startDrag(e, ann.id, 'move', ann);
                                        }}
                                    />
                                </svg>
                                {active && (
                                    <>
                                        {/* Corner handles for scaling */}
                                        <div className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full cursor-nw-resize pointer-events-auto shadow-md z-[60]"
                                            style={{ left: `${((ann.x || 0) / width) * 100}%`, top: `${((ann.y || 0) / height) * 100}%`, transform: 'translate(-50%, -50%)' }}
                                            onMouseDown={(e) => startDrag(e, ann.id, 'tl', ann)} />
                                        <div className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full cursor-ne-resize pointer-events-auto shadow-md z-[60]"
                                            style={{ left: `${(((ann.x || 0) + (ann.width || 0)) / width) * 100}%`, top: `${((ann.y || 0) / height) * 100}%`, transform: 'translate(-50%, -50%)' }}
                                            onMouseDown={(e) => startDrag(e, ann.id, 'tr', ann)} />
                                        <div className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full cursor-sw-resize pointer-events-auto shadow-md z-[60]"
                                            style={{ left: `${((ann.x || 0) / width) * 100}%`, top: `${(((ann.y || 0) + (ann.height || 0)) / height) * 100}%`, transform: 'translate(-50%, -50%)' }}
                                            onMouseDown={(e) => startDrag(e, ann.id, 'bl', ann)} />
                                        <div className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full cursor-se-resize pointer-events-auto shadow-md z-[60]"
                                            style={{ left: `${(((ann.x || 0) + (ann.width || 0)) / width) * 100}%`, top: `${(((ann.y || 0) + (ann.height || 0)) / height) * 100}%`, transform: 'translate(-50%, -50%)' }}
                                            onMouseDown={(e) => startDrag(e, ann.id, 'br', ann)} />

                                        {/* Rotation Handle */}
                                        <div className="absolute w-5 h-5 bg-white border-2 border-primary rounded-full cursor-crosshair pointer-events-auto flex items-center justify-center shadow-lg z-[60]"
                                            style={{ left: `${(cx / width) * 100}%`, top: `${(((ann.y || 0) - 40) / height) * 100}%`, transform: 'translate(-50%, -50%)' }}
                                            onMouseDown={(e) => startDrag(e, ann.id, 'rotate', ann)}>
                                            <div className="w-0.5 h-6 bg-primary absolute top-full" />
                                        </div>
                                        <button className="absolute p-2 bg-red-500 rounded-full text-white shadow-xl pointer-events-auto hover:bg-red-600 transition-colors z-[60]"
                                            style={{ left: `${(((ann.x || 0) + (ann.width || 0)) / width) * 100}%`, top: `${((ann.y || 0) / height) * 100}%`, transform: 'translate(10px, -30px)' }}
                                            onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}>
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                    }
                }

                if (ann.type === 'stamp') {
                    const left = (ann.x / width) * 100;
                    const top = (ann.y / height) * 100;
                    const currentFontSize = Math.max(10, width * 0.012 * zoom);

                    return (
                        <div key={ann.id} className={`absolute annotation-ui ${active ? 'z-50' : 'z-20'}`} style={{ left: `${left}%`, top: `${top}%` }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setActiveMaskId(ann.id);
                                startDrag(e, ann.id, 'move', ann);
                            }}>
                            <div className={`relative flex items-center bg-black text-white shadow-xl transition-all duration-300 origin-bottom`}
                                style={{
                                    fontSize: currentFontSize,
                                    paddingLeft: 10 * zoom,
                                    paddingRight: active && isEditMode ? 5 * zoom : 10 * zoom,
                                    paddingTop: 6 * zoom,
                                    paddingBottom: 6 * zoom,
                                    borderRadius: 6 * zoom,
                                    transform: 'translate(-50%, -100%) translateY(-10px)',
                                    minWidth: active ? (100 * zoom) : 'auto',
                                    opacity: isEditMode || active ? 1 : 0.85
                                }}>
                                {active && isEditMode ? (
                                    <div className="flex items-center gap-1.5">
                                        <input value={ann.text || ''} onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && setActiveMaskId(null)}
                                            className="bg-transparent border-none outline-none text-white p-0 focus:ring-0 font-bold placeholder:text-white/30"
                                            style={{ width: Math.max(60 * zoom, (ann.text?.length || 0) * currentFontSize * 0.6) }}
                                            placeholder={t ? t('describe_changes') : "Änderung..."}
                                            autoFocus
                                            onMouseDown={e => e.stopPropagation()} />
                                        <button onClick={e => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                                            className="p-1 hover:bg-white/20 rounded transition-colors group/trash">
                                            <Trash2 className="text-white/60 group-hover/trash:text-red-400" style={{ width: 14 * zoom, height: 14 * zoom }} />
                                        </button>
                                    </div>
                                ) : (
                                    <span className="whitespace-nowrap font-medium">
                                        {ann.text || (t ? t('untitled') : "Text")}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
};
