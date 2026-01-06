
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AnnotationObject, TranslationFunction } from '@/types';
import { X, Check, Pen, Trash2 } from 'lucide-react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { generateId } from '@/utils/ids';

interface EditorCanvasProps {
    width: number;
    height: number;
    zoom: number; // New: zoom for scaling
    annotations: AnnotationObject[];
    onChange: (newAnnotations: AnnotationObject[]) => void;
    brushSize: number;
    activeTab: string;
    maskTool?: 'brush' | 'text' | 'shape' | 'select' | 'polygon';
    activeShape?: 'rect' | 'circle';
    isActive: boolean;
    onEditStart?: (mode: 'brush' | 'objects') => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    t?: TranslationFunction;
    isBrushPreviewing?: boolean; // New: force show brush cursor for slider preview
}

const RES_SCALE = 3;

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
    width,
    height,
    zoom,
    annotations,
    onChange,
    brushSize,
    activeTab,
    maskTool = 'select',
    activeShape = 'rect',
    isActive,
    onEditStart,
    onContextMenu,
    t,
    isBrushPreviewing = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [activeMaskId, setActiveMaskId] = useState<string | null>(null);
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        if (activeMaskId) {
            setTimeout(() => {
                const activeInput = document.querySelector('.annotation-ui input') as HTMLInputElement;
                if (activeInput) activeInput.focus();
            }, 50);
        }
    }, [activeMaskId]);

    const [dragState, setDragState] = useState<{
        id: string;
        mode: 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | 'vertex' | 'draw_shape';
        vertexIndex?: number;
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
        initialW: number;
        initialH: number;
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
            } else if (activeTab !== 'brush') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                if (ann.type === 'shape') {
                    if (ann.shapeType === 'rect') ctx.fillRect(ann.x || 0, ann.y || 0, ann.width || 0, ann.height || 0);
                    else if (ann.shapeType === 'circle') {
                        ctx.beginPath();
                        ctx.arc((ann.x || 0) + (ann.width || 0) / 2, (ann.y || 0) + (ann.height || 0) / 2, (Math.min(ann.width || 0, ann.height || 0)) / 2, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (ann.shapeType === 'line' && ann.points.length >= 2) {
                        ctx.beginPath();
                        ctx.lineWidth = ann.strokeWidth;
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                        ctx.moveTo(ann.points[0].x, ann.points[0].y);
                        ctx.lineTo(ann.points[1].x, ann.points[1].y);
                        ctx.stroke();
                    }
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

        if (maskTool === 'text') {
            const newId = generateId();
            onChange([...annotations, { id: newId, type: 'stamp', points: [], x, y, strokeWidth: 0, color: '#fff', text: '', createdAt: Date.now() }]);
            setActiveMaskId(newId);
            return;
        }

        if (maskTool === 'shape' && activeShape === 'line') {
            const newId = generateId();
            onChange([...annotations, { id: newId, type: 'shape', shapeType: 'line', points: [{ x, y }, { x, y }], strokeWidth: 4, color: '#fff', createdAt: Date.now() }]);
            setDragState({
                id: newId, mode: 'draw_shape', startX: x, startY: y, initialX: x, initialY: y, initialW: 0, initialH: 0, initialPoints: [{ x, y }, { x, y }], isMoved: false
            });
            return;
        }

        if (maskTool === 'shape') {
            // Start click-and-drag for rect/circle
            const newId = generateId();
            const newAnn: AnnotationObject = {
                id: newId, type: 'shape', shapeType: activeShape as 'rect' | 'circle', x, y, width: 0, height: 0, points: [], strokeWidth: 4, color: '#fff', createdAt: Date.now()
            };
            onChange([...annotations, newAnn]);
            setDragState({
                id: newId, mode: 'draw_shape', startX: x, startY: y, initialX: x, initialY: y, initialW: 0, initialH: 0, initialPoints: [], isMoved: false
            });
            return;
        }

        if (maskTool === 'select') {
            setActiveMaskId(null);
            return;
        }

        // Brush
        setIsDrawing(true);
        currentPathRef.current = [{ x, y }];
        setActiveMaskId(null);
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

                if (dragState.mode === 'draw_shape') {
                    if (ann.shapeType === 'line') {
                        return { ...ann, points: [ann.points[0], { x, y }] };
                    }
                    const newX = Math.min(dragState.startX, x);
                    const newY = Math.min(dragState.startY, y);
                    const newW = Math.abs(x - dragState.startX);
                    const newH = Math.abs(y - dragState.startY);
                    return { ...ann, x: newX, y: newY, width: newW, height: newH };
                }

                if (dragState.mode === 'move') {
                    if (ann.shapeType === 'polygon') return { ...ann, points: dragState.initialPoints.map(p => ({ x: p.x + dx, y: p.y + dy })) };
                    return { ...ann, x: dragState.initialX + dx, y: dragState.initialY + dy };
                }

                if (ann.shapeType === 'rect' || ann.shapeType === 'circle') {
                    let { initialX: iX, initialY: iY, initialW: iW, initialH: iH } = dragState;
                    let nX = iX, nY = iY, nW = iW, nH = iH;
                    if (dragState.mode === 'tl') { nX += dx; nY += dy; nW -= dx; nH -= dy; }
                    else if (dragState.mode === 'tr') { nY += dy; nW += dx; nH -= dy; }
                    else if (dragState.mode === 'bl') { nX += dx; nW -= dx; nH += dy; }
                    else if (dragState.mode === 'br') { nW += dx; nH += dy; }
                    return { ...ann, x: nX, y: nY, width: Math.max(10, nW), height: Math.max(10, nH) };
                }

                if (ann.shapeType === 'polygon' && dragState.mode === 'vertex' && dragState.vertexIndex !== undefined) {
                    const pts = [...ann.points]; pts[dragState.vertexIndex] = { x, y };
                    return { ...ann, points: pts };
                }
                return ann;
            });
            onChange(updated);
            return;
        }

        if (cursorRef.current && containerRef.current && activeTab === 'brush' && maskTool === 'brush') {
            const rect = containerRef.current.getBoundingClientRect();
            const cx = isBrushPreviewing ? rect.width / 2 : (clientX - rect.left);
            const cy = isBrushPreviewing ? rect.height / 2 : (clientY - rect.top);
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
            if (dragState.mode === 'draw_shape') setActiveMaskId(dragState.id);
            else if (!dragState.isMoved) setActiveMaskId(dragState.id);
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

    const startDrag = (e: React.MouseEvent, id: string, mode: 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | 'vertex', ann: AnnotationObject, vertexIndex?: number) => {
        e.stopPropagation(); e.preventDefault();
        const clientX = 'touches' in e ? (e as any).touches[0].clientX : (e as any).clientX;
        const clientY = 'touches' in e ? (e as any).touches[0].clientY : (e as any).clientY;
        const { x, y } = getCoordinates(clientX, clientY);
        setDragState({
            id, mode, vertexIndex, startX: x, startY: y,
            initialX: ann.x || 0, initialY: ann.y || 0, initialW: ann.width || 0, initialH: ann.height || 0,
            initialPoints: ann.points || [], isMoved: false
        });
    };

    return (
        <div ref={containerRef} className="absolute inset-0 z-10 w-full h-full" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
            <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full touch-none ${activeTab === 'brush' ? (maskTool === 'brush' ? 'cursor-none' : 'cursor-default') : 'cursor-default'}`} />

            {activeTab === 'brush' && maskTool === 'brush' && isActive && <div ref={cursorRef} className={`absolute pointer-events-none rounded-full border border-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-50 transition-opacity duration-150 ${(isHovering || isBrushPreviewing) ? 'opacity-100' : 'opacity-0'}`} style={{ width: brushSize, height: brushSize, left: 0, top: 0 }} />}

            {/* UI Overlay for Annotations (Visible in both Edit and Prompt modes now) */}
            {annotations.map(ann => {
                const isEditMode = activeTab === 'brush' || activeTab === 'objects';
                const active = activeMaskId === ann.id;

                // Common scaling factors
                // Base size at 1.0 zoom - using proportionality to image width
                const baseSizeFactor = width * 0.012;
                const currentFontSize = Math.max(10, baseSizeFactor * zoom);
                const currentPaddingH = 10 * zoom;
                const currentPaddingV = 6 * zoom;
                const currentRadius = 6 * zoom;
                const currentGap = 8 * zoom;

                if (ann.type === 'shape') {
                    if (ann.shapeType === 'polygon') {
                        const pts = ann.points;
                        if (!pts || pts.length < 1) return null;
                        const minX = Math.min(...pts.map(p => p.x)); const minY = Math.min(...pts.map(p => p.y));
                        const maxX = Math.max(...pts.map(p => p.x)); const maxY = Math.max(...pts.map(p => p.y));
                        const p = 20; const left = (minX - p) / width * 100; const top = (minY - p) / height * 100;
                        const w = (maxX - minX + p * 2) / width * 100; const h = (maxY - minY + p * 2) / height * 100;
                        const pathData = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';
                        return (
                            <div key={ann.id} className="absolute annotation-ui" style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%`, zIndex: active ? 50 : 20 }}>
                                <svg width="100%" height="100%" viewBox={`${minX - p} ${minY - p} ${maxX - minX + p * 2} ${maxY - minY + p * 2}`} className="overflow-visible pointer-events-none">
                                    <path
                                        d={pathData}
                                        fill="rgba(255,255,255,0.1)"
                                        stroke={active ? '#3b82f6' : 'white'}
                                        strokeWidth="4"
                                        className="pointer-events-auto cursor-move"
                                        onMouseDown={(e) => {
                                            if (!isEditMode) {
                                                e.stopPropagation();
                                                onEditStart?.('objects');
                                                setActiveMaskId(ann.id);
                                                return;
                                            }
                                            startDrag(e, ann.id, 'move', ann);
                                        }}
                                    />
                                </svg>
                                {active && pts.map((p, idx) => (
                                    <div key={idx} className="absolute w-3.5 h-3.5 bg-white border-2 border-primary rounded-full cursor-pointer z-[60]" style={{ left: `${(p.x - (minX - p)) / (maxX - minX + p * 2) * 100}%`, top: `${(p.y - (minY - p)) / (maxY - minY + p * 2) * 100}%`, transform: 'translate(-50%,-50%)' }} onMouseDown={(e) => startDrag(e, ann.id, 'vertex', ann, idx)} />
                                ))}
                                {active && <button className="absolute -top-7 right-0 p-1 bg-red-500 rounded text-white shadow" onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}><Trash2 className="w-3 h-3" /></button>}
                            </div>
                        );
                    }
                    if (ann.shapeType === 'line') {
                        const pts = ann.points || [];
                        if (pts.length < 2) return null;
                        const minX = Math.min(pts[0].x, pts[1].x); const minY = Math.min(pts[0].y, pts[1].y);
                        const maxX = Math.max(pts[0].x, pts[1].x); const maxY = Math.max(pts[0].y, pts[1].y);

                        const p = 10;
                        const left = (minX - p) / width * 100; const top = (minY - p) / height * 100;
                        const w = (maxX - minX + p * 2) / width * 100; const h = (maxY - minY + p * 2) / height * 100;

                        return (
                            <div
                                key={ann.id}
                                className={`absolute annotation-ui ${active ? 'z-50' : 'z-20'}`}
                                style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }}
                                onMouseDown={(e) => {
                                    if (!isEditMode) {
                                        e.stopPropagation();
                                        onEditStart?.('brush');
                                        setActiveMaskId(ann.id);
                                        return;
                                    }
                                    startDrag(e, ann.id, 'move', ann);
                                }}
                            >
                                <svg width="100%" height="100%" viewBox={`${minX - p} ${minY - p} ${maxX - minX + p * 2} ${maxY - minY + p * 2}`} className="overflow-visible pointer-events-none">
                                    <line
                                        x1={pts[0].x} y1={pts[0].y}
                                        x2={pts[1].x} y2={pts[1].y}
                                        stroke={active ? '#3b82f6' : 'white'}
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        className="pointer-events-auto cursor-move opacity-20 hover:opacity-100 transition-opacity"
                                    />
                                </svg>
                                {active && (
                                    <>
                                        <div className="absolute w-3 h-3 bg-primary border border-white rounded-full cursor-pointer z-[60]" style={{ left: `${(pts[0].x - (minX - p)) / (maxX - minX + p * 2) * 100}%`, top: `${(pts[0].y - (minY - p)) / (maxY - minY + p * 2) * 100}%`, transform: 'translate(-50%,-50%)' }} onMouseDown={(e) => startDrag(e, ann.id, 'vertex', ann, 0)} />
                                        <div className="absolute w-3 h-3 bg-primary border border-white rounded-full cursor-pointer z-[60]" style={{ left: `${(pts[1].x - (minX - p)) / (maxX - minX + p * 2) * 100}%`, top: `${(pts[1].y - (minY - p)) / (maxY - minY + p * 2) * 100}%`, transform: 'translate(-50%,-50%)' }} onMouseDown={(e) => startDrag(e, ann.id, 'vertex', ann, 1)} />
                                        <button className="absolute -top-7 right-0 p-1 bg-red-500 rounded text-white shadow" onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}><Trash2 className="w-3 h-3" /></button>
                                    </>
                                )}
                            </div>
                        );
                    }
                    const left = (ann.x || 0) / width * 100; const top = (ann.y || 0) / height * 100;
                    const w = (ann.width || 0) / width * 100; const h = (ann.height || 0) / height * 100;
                    return (
                        <div
                            key={ann.id}
                            className={`absolute annotation-ui ${active ? 'z-50' : 'z-20'}`}
                            style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }}
                            onMouseDown={(e) => {
                                if (!isEditMode) {
                                    e.stopPropagation();
                                    onEditStart?.('objects');
                                    setActiveMaskId(ann.id);
                                    return;
                                }
                                startDrag(e, ann.id, 'move', ann);
                            }}
                        >
                            <div className={`w-full h-full border-4 border-white bg-white/10 ${ann.shapeType === 'circle' ? 'rounded-full' : ''} cursor-move ${active ? 'border-primary' : ''}`} />
                            {active && (
                                <>
                                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-primary border border-white cursor-nw-resize" onMouseDown={(e) => startDrag(e, ann.id, 'tl', ann)} />
                                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary border border-white cursor-ne-resize" onMouseDown={(e) => startDrag(e, ann.id, 'tr', ann)} />
                                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-primary border border-white cursor-sw-resize" onMouseDown={(e) => startDrag(e, ann.id, 'bl', ann)} />
                                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary border border-white cursor-se-resize" onMouseDown={(e) => startDrag(e, ann.id, 'br', ann)} />
                                    <button className="absolute -top-7 right-0 p-1 bg-red-500 rounded text-white shadow" onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}><Trash2 className="w-3 h-3" /></button>
                                </>
                            )}
                        </div>
                    );
                }

                let left = 0, top = 0;
                if (ann.type === 'stamp') {
                    left = (ann.x / width) * 100;
                    top = (ann.y / height) * 100;
                } else {
                    return null; // Skip rendering text chips for brush paths
                }

                return (
                    <div
                        key={ann.id}
                        className={`absolute annotation-ui ${active ? 'z-50' : 'z-20'}`}
                        style={{ left: `${left}%`, top: `${top}%` }}
                        onMouseDown={(e) => {
                            if (!isEditMode) {
                                e.stopPropagation();
                                onEditStart?.('objects');
                                setActiveMaskId(ann.id);
                                return;
                            }
                            startDrag(e, ann.id, 'move', ann);
                        }}
                    >
                        <div
                            className={`relative flex items-center bg-black text-white shadow-xl transition-all duration-300 origin-bottom`}
                            style={{
                                fontSize: currentFontSize,
                                paddingLeft: currentPaddingH,
                                paddingRight: active && isEditMode ? currentPaddingH / 2 : currentPaddingH,
                                paddingTop: currentPaddingV,
                                paddingBottom: currentPaddingV,
                                borderRadius: currentRadius,
                                transform: 'translate(-50%, -100%) translateY(-10px)',
                                minWidth: active ? (100 * zoom) : 'auto',
                                opacity: isEditMode || active ? 1 : 0.85
                            }}
                        >
                            {active && isEditMode ? (
                                <div className="flex items-center gap-1.5" style={{ gap: currentGap }}>
                                    <input
                                        value={ann.text || ''}
                                        onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && setActiveMaskId(null)}
                                        className="bg-transparent border-none outline-none text-white p-0 focus:ring-0 font-bold placeholder:text-white/30"
                                        style={{ width: Math.max(60 * zoom, (ann.text?.length || 0) * currentFontSize * 0.6) }}
                                        placeholder={t ? t('describe_changes') : "Änderung..."}
                                        autoFocus
                                        onMouseDown={e => e.stopPropagation()}
                                    />
                                    <button
                                        onClick={e => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                                        className="p-1 hover:bg-white/20 rounded transition-colors group/trash"
                                        style={{ padding: 4 * zoom }}
                                    >
                                        <Trash2 className="text-white/60 group-hover/trash:text-red-400" style={{ width: 14 * zoom, height: 14 * zoom }} />
                                    </button>
                                </div>
                            ) : (
                                <span className="whitespace-nowrap font-medium">
                                    {ann.text || (ann.type === 'mask_path' ? "Beschreibe..." : (t ? t('untitled') : "Text"))}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
