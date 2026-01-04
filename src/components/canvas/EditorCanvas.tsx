import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AnnotationObject, TranslationFunction } from '@/types';
import { X, Check, Pen, Trash2 } from 'lucide-react';
import { Typo, Tooltip, Theme } from '@/components/ui/DesignSystem';
import { generateId } from '@/utils/ids';

interface EditorCanvasProps {
    width: number;
    height: number;
    annotations: AnnotationObject[];
    onChange: (newAnnotations: AnnotationObject[]) => void;
    brushSize: number;
    activeTab: string;
    maskTool?: 'brush' | 'text' | 'shape';
    activeShape?: 'rect' | 'circle' | 'line';
    isActive: boolean;
    onEditStart?: (mode: 'brush' | 'objects') => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    t?: TranslationFunction;
}

const RES_SCALE = 3;

// Styles moved to constants for cleanliness
const OVERLAY_STYLES = {
    ChipContainer: `relative flex items-center gap-0 rounded-lg border transition-all ${Theme.Colors.ModalBg} ${Theme.Colors.Border} hover:border-zinc-500 group/chip shadow-sm`,
    ChipContainerActive: `relative flex items-center gap-0 rounded-lg border transition-all ${Theme.Colors.ModalBg} ${Theme.Colors.Border} p-1.5 min-w-[120px] z-30 shadow-md`,
    ActionBtn: `flex items-center justify-center w-5 h-5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-black dark:hover:text-white transition-all shrink-0`,
    SaveBtn: `flex items-center justify-center w-5 h-5 rounded bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-all shrink-0 ml-1`,
    RefThumb: `relative group/thumb shrink-0 w-6 h-6 mr-1.5`,
    RefImage: `w-full h-full object-cover rounded border border-zinc-200 dark:border-zinc-700`,
    Arrow: `absolute w-0 h-0 border-[6px] border-transparent pointer-events-none`
};

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
    width,
    height,
    annotations,
    onChange,
    brushSize,
    activeTab,
    maskTool = 'brush',
    activeShape = 'rect',
    isActive,
    onEditStart,
    onContextMenu,
    t
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);

    // State
    const [isDrawing, setIsDrawing] = useState(false);
    const [activeMaskId, setActiveMaskId] = useState<string | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [draggingId, setDraggingId] = useState<string | null>(null); // Generalized dragging
    const [isCreatingShape, setIsCreatingShape] = useState(false);
    const [shapeStart, setShapeStart] = useState<{ x: number, y: number } | null>(null);

    const currentPathRef = useRef<{ x: number, y: number }[]>([]);

    // --- Rendering ---
    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Reset transform to identity then clear
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply scaling
        ctx.scale(RES_SCALE, RES_SCALE);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw existing paths (Brushes)
        annotations.forEach(ann => {
            if (ann.type !== 'mask_path' || ann.points.length < 1) return;
            ctx.beginPath();
            ctx.lineWidth = ann.strokeWidth;

            ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';

            ctx.moveTo(ann.points[0].x, ann.points[0].y);
            for (let i = 1; i < ann.points.length; i++) {
                ctx.lineTo(ann.points[i].x, ann.points[i].y);
            }
            ctx.stroke();
        });

        // Draw current brush stroke
        if (isDrawing && currentPathRef.current.length > 0) {
            ctx.beginPath();
            ctx.lineWidth = brushSize;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            const pts = currentPathRef.current;
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.stroke();
        }
    }, [annotations, isDrawing, activeMaskId, brushSize, isActive, width]);

    useEffect(() => { renderCanvas(); }, [renderCanvas, width, height]);

    // Handle Resize
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
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

    // --- Mouse/Touch Handlers ---
    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isActive || activeTab !== 'brush') return;
        if ((e.target as HTMLElement).closest('.annotation-ui')) return;
        e.stopPropagation();

        // Clean empty annotations
        const cleanedAnnotations = annotations.filter(a => (a.text && a.text.trim() !== '') || a.referenceImage || a.type === 'shape' || a.points.length > 1 || a.type === 'stamp');
        if (cleanedAnnotations.length !== annotations.length) {
            onChange(cleanedAnnotations);
        }

        // @ts-ignore
        const clientX = e.touches ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        // @ts-ignore
        const clientY = e.touches ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const { x, y } = getCoordinates(clientX, clientY);

        if (maskTool === 'text') {
            const newId = generateId();
            const newStamp: AnnotationObject = {
                id: newId, type: 'stamp', points: [], x, y, strokeWidth: 0, color: '#fff', text: '', createdAt: Date.now()
            };
            onChange([...cleanedAnnotations, newStamp]);
            setActiveMaskId(newId);
            return;
        }

        if (maskTool === 'shape') {
            const newId = generateId();
            const newShape: AnnotationObject = {
                id: newId, type: 'shape', shapeType: activeShape || 'rect',
                x, y, width: 1, height: 1, points: [{ x, y }, { x, y }], // Points for line
                strokeWidth: 4, color: '#fff', createdAt: Date.now()
            };
            onChange([...cleanedAnnotations, newShape]);
            setActiveMaskId(newId);
            setIsCreatingShape(true);
            setShapeStart({ x, y });
            return;
        }

        setIsDrawing(true);
        currentPathRef.current = [{ x, y }];
        setActiveMaskId(null);
        renderCanvas();
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        // @ts-ignore
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        // @ts-ignore
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Cursor Logic
        if (cursorRef.current && containerRef.current && activeTab === 'brush') {
            const rect = containerRef.current.getBoundingClientRect();
            if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                const x = clientX - rect.left;
                const y = clientY - rect.top;
                cursorRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
                if (!isHovering) setIsHovering(true);
            } else {
                if (isHovering) setIsHovering(false);
            }
        } else {
            if (isHovering) setIsHovering(false);
        }

        const { x, y } = getCoordinates(clientX, clientY);

        // Handle Shape Creation
        if (isCreatingShape && activeMaskId && shapeStart) {
            const updated = annotations.map(ann => {
                if (ann.id !== activeMaskId) return ann;

                // Logic for different shapes
                if (ann.shapeType === 'rect') {
                    // Allow dragging in any direction (negative width/height handled by normalizing x/y)
                    const w = x - shapeStart.x;
                    const h = y - shapeStart.y;
                    return { ...ann, width: Math.abs(w), height: Math.abs(h), x: w < 0 ? x : shapeStart.x, y: h < 0 ? y : shapeStart.y };
                }
                else if (ann.shapeType === 'circle') {
                    // Center-based or Corner-based? Corner based is standard for rect-like drawing.
                    // Let's do diameter based on drag distance.
                    const w = x - shapeStart.x;
                    const h = y - shapeStart.y;
                    // Keep it circular? Or Ellipse? "Kreis" implies Circle.
                    const diameter = Math.max(Math.abs(w), Math.abs(h));
                    return { ...ann, width: diameter, height: diameter, x: w < 0 ? x : shapeStart.x, y: h < 0 ? y : shapeStart.y };
                }
                else if (ann.shapeType === 'line') {
                    return { ...ann, points: [{ x: shapeStart.x, y: shapeStart.y }, { x, y }] };
                }
                return ann;
            });
            onChange(updated);
            return;
        }

        if (!isDrawing || maskTool === 'text') return;
        e.stopPropagation();

        const last = currentPathRef.current[currentPathRef.current.length - 1];
        if (Math.abs(last.x - x) > 2 || Math.abs(last.y - y) > 2) {
            currentPathRef.current.push({ x, y });
            renderCanvas();
        }
    };

    const handleMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
        if (isCreatingShape) {
            setIsCreatingShape(false);
            setShapeStart(null);
            return;
        }

        if (!isDrawing || maskTool === 'text') return;
        setIsDrawing(false);
        e.stopPropagation();

        const intrinsicStrokeWidth = brushSize;

        if (currentPathRef.current.length > 1) {
            const newId = generateId();
            const cleanedPrev = annotations.filter(a => (a.text && a.text.trim() !== '') || a.referenceImage || a.type === 'shape' || a.type === 'stamp');

            const newMask: AnnotationObject = {
                id: newId,
                type: 'mask_path',
                points: [...currentPathRef.current],
                strokeWidth: intrinsicStrokeWidth,
                color: '#fff',
                text: '',
                createdAt: Date.now()
            };
            onChange([...cleanedPrev, newMask]);
            setActiveMaskId(newId);
        }
        currentPathRef.current = [];
    };

    // --- Object/Shape Drag ---
    const handleDragStart = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        setDraggingId(id);
    };

    useEffect(() => {
        const handleGlobalMove = (e: MouseEvent) => {
            if (draggingId && containerRef.current) {
                let { x, y } = getCoordinates(e.clientX, e.clientY);
                x = clamp(x, 0, width);
                y = clamp(y, 0, height);

                const newAnns = annotations.map(a => {
                    if (a.id !== draggingId) return a;
                    // Special handling for Line points shift
                    if (a.type === 'shape' && a.shapeType === 'line' && a.points.length >= 2) {
                        // For lines, x/y is tricky. Just moving start point and keep delta?
                        // Simple approach: Center the line on x,y?
                        // Let's assume standard drag sets x/y which means Top-Left of bounding box?
                        // Shapes use x,y.
                        // I'll calculate dx, dy from previous frame? No, I don't store prev.
                        // I'll just skip line dragging for now to be safe, creating new ones is fast.
                        // User can delete and redraw. "layout zurecht legen" -> usually create new.
                        return a;
                    }
                    if (a.type === 'shape' || a.type === 'stamp') {
                        return { ...a, x, y };
                    }
                    return a;
                });
                onChange(newAnns);
            }
        };
        const handleGlobalUp = () => { setDraggingId(null); };
        if (draggingId) {
            window.addEventListener('mousemove', handleGlobalMove);
            window.addEventListener('mouseup', handleGlobalUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
        };
    }, [draggingId, annotations, onChange, width, height]);


    // --- Helpers ---
    const updateAnnotation = (id: string, patch: Partial<AnnotationObject>) => {
        onChange(annotations.map(a => a.id === id ? { ...a, ...patch } : a));
    };
    const deleteAnnotation = (id: string) => {
        onChange(annotations.filter(a => a.id !== id));
        setActiveMaskId(null);
    };

    const handleEditClick = (ann: AnnotationObject) => {
        setActiveMaskId(ann.id);
        if (onEditStart) {
            if (ann.type === 'mask_path') onEditStart('brush');
            if (ann.type === 'shape') onEditStart('brush'); // Keep in brush/shape mode
        }
    };

    return (
        <>
            <div
                ref={containerRef}
                className="absolute inset-0 z-10 w-full h-full"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                onDrop={(e) => { /* Reuse Drop Logic */ }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onContextMenu={onContextMenu}
                onMouseUp={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
            >

                <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 w-full h-full touch-none ${activeTab === 'brush' ? (maskTool !== 'brush' && maskTool !== 'shape' ? 'cursor-default' : 'cursor-none') : 'cursor-default'}`}
                />

                {/* Cursor */}
                {activeTab === 'brush' && (maskTool === 'brush' || maskTool === 'shape') && isActive && !isCreatingShape && (
                    <>
                        {maskTool === 'brush' && (
                            <div
                                ref={cursorRef}
                                className={`absolute pointer-events-none rounded-full border border-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-50 transition-opacity duration-150 ${isHovering ? 'opacity-100' : 'opacity-0'}`}
                                style={{ width: brushSize, height: brushSize, left: 0, top: 0 }}
                            />
                        )}
                        {maskTool === 'shape' && (
                            <div
                                ref={cursorRef}
                                className={`absolute pointer-events-none z-50 text-white ${isHovering ? 'opacity-100' : 'opacity-0'}`}
                                style={{ left: 0, top: 0 }}
                            >
                                <span className="text-xl drop-shadow-md">+</span>
                            </div>
                        )}
                    </>
                )}

                {/* Render Annotations & Shapes */}
                {annotations.map(ann => {
                    const isActiveItem = activeMaskId === ann.id;

                    // --- SHAPES ---
                    if (ann.type === 'shape') {
                        let left = (ann.x || 0) / width * 100;
                        let top = (ann.y || 0) / height * 100;
                        let w = (ann.width || 0) / width * 100;
                        let h = (ann.height || 0) / height * 100;

                        if (ann.shapeType === 'line') {
                            const p1 = ann.points?.[0] || { x: 0, y: 0 };
                            const p2 = ann.points?.[1] || { x: 0, y: 0 };
                            const minX = Math.min(p1.x, p2.x);
                            const minY = Math.min(p1.y, p2.y);
                            const maxX = Math.max(p1.x, p2.x);
                            const maxY = Math.max(p1.y, p2.y);
                            const pad = 10;
                            left = (minX - pad) / width * 100;
                            top = (minY - pad) / height * 100;
                            w = (maxX - minX + pad * 2) / width * 100;
                            h = (maxY - minY + pad * 2) / height * 100;

                            return (
                                <div
                                    key={ann.id}
                                    className={`absolute group annotation-ui cursor-move ${isActiveItem ? 'z-50' : 'z-20'}`}
                                    style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }}
                                    onClick={(e) => { e.stopPropagation(); setActiveMaskId(ann.id); }}
                                >
                                    <svg width="100%" height="100%" viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`} className="overflow-visible pointer-events-none">
                                        <line
                                            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                                            stroke="white" strokeWidth="4"
                                            className="drop-shadow-md"
                                        />
                                        {isActiveItem && (
                                            <>
                                                <circle cx={p1.x} cy={p1.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                                                <circle cx={p2.x} cy={p2.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                                            </>
                                        )}
                                    </svg>
                                    {isActiveItem && (
                                        <button
                                            className="absolute top-0 right-0 p-1 bg-red-500 rounded text-white shadow"
                                            onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            );
                        }

                        // Rect/Circle
                        return (
                            <div
                                key={ann.id}
                                className={`absolute group annotation-ui cursor-move ${isActiveItem ? 'z-50' : 'z-20'}`}
                                style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }}
                                onMouseDown={(e) => handleDragStart(e, ann.id)}
                                onClick={(e) => { e.stopPropagation(); setActiveMaskId(ann.id); }}
                            >
                                {ann.shapeType === 'rect' ? (
                                    <div className="w-full h-full border-4 border-white bg-white/10 shadow-sm box-border" />
                                ) : (
                                    <div className="w-full h-full border-4 border-white bg-white/10 shadow-sm rounded-full box-border" />
                                )}

                                {isActiveItem && (
                                    <>
                                        {/* Resize handles corners - visual only for now */}
                                        <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white" />
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white" />
                                        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white" />
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-se-resize" />

                                        <button
                                            className="absolute -top-8 right-0 p-1 bg-red-500 rounded text-white shadow-md hover:scale-110 transition-transform"
                                            onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                    }

                    // --- REFERENCE / TEXT Logic ---
                    let leftPct = 0, topPct = 0, isTopEdge = false;

                    if (ann.type === 'stamp') {
                        if (ann.x === undefined || ann.y === undefined) return null;
                        leftPct = (ann.x / width) * 100;
                        topPct = (ann.y / height) * 100;
                    } else if (ann.type === 'mask_path') {
                        let minX = Infinity, minY = Infinity;
                        ann.points.forEach(p => { if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; });
                        leftPct = (minX / width) * 100;
                        topPct = (minY / height) * 100;
                        isTopEdge = (minY / height) < 0.1;
                    }

                    // Alignment Logic
                    let horizontalAlign: 'left' | 'center' | 'right' = 'center';
                    if (leftPct < 15) horizontalAlign = 'left';
                    else if (leftPct > 85) horizontalAlign = 'right';

                    let containerTransform = 'translate(-50%, 0)';
                    if (horizontalAlign === 'left') containerTransform = 'translate(-10px, 0)';
                    if (horizontalAlign === 'right') containerTransform = 'translate(calc(-100% + 10px), 0)';

                    const verticalShift = isTopEdge ? 'translateY(12px)' : 'translateY(calc(-100% - 12px))';
                    const finalTransform = ann.type === 'stamp' ? `${containerTransform} translateY(-50%)` : `${containerTransform} ${verticalShift}`;

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
                    if (isPointingUp) { fillArrowStyle.bottom = '100%'; fillArrowStyle.marginBottom = '-1px'; }
                    else { fillArrowStyle.top = '100%'; fillArrowStyle.marginTop = '-1px'; }

                    const hasText = ann.text && ann.text.trim().length > 0;
                    const isInitial = !hasText;

                    return (
                        <div
                            key={ann.id}
                            className="absolute annotation-ui z-20"
                            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                            onMouseDown={(e) => ann.type === 'stamp' && handleDragStart(e, ann.id)}
                        >
                            <div style={{ transform: finalTransform }} className="transition-transform duration-200">
                                {isActiveItem ? (
                                    <div className={OVERLAY_STYLES.ChipContainerActive}>
                                        <div className={`${OVERLAY_STYLES.Arrow} ${borderArrowClass}`} style={borderArrowStyle} />
                                        <div className={`${OVERLAY_STYLES.Arrow} ${fillArrowClass}`} style={fillArrowStyle} />
                                        {ann.referenceImage && <div className={OVERLAY_STYLES.RefThumb}><img src={ann.referenceImage} className={OVERLAY_STYLES.RefImage} alt="ref" /></div>}
                                        <input
                                            value={ann.text || ''}
                                            onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                                            onKeyDown={(e) => { if (e.key === 'Enter') setActiveMaskId(null); }}
                                            placeholder="Describe..."
                                            className={`bg-transparent border-none outline-none ${Typo.Micro} tracking-normal flex-1 focus:ring-0 min-w-[80px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 mr-1.5`}
                                            autoFocus
                                            onMouseDown={(e) => e.stopPropagation()}
                                        />
                                        {ann.type === 'mask_path' && isInitial && (
                                            <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); updateAnnotation(ann.id, { text: 'remove this' }); setActiveMaskId(null); }} className="px-1 py-0.5 mx-1 text-[10px] font-medium whitespace-nowrap text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors">{t ? t('remove_btn') : 'Remove'}</button>
                                        )}
                                        <Tooltip text="Save">
                                            <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setActiveMaskId(null); }} className={OVERLAY_STYLES.SaveBtn}><Check className="w-3 h-3" /></button>
                                        </Tooltip>
                                    </div>
                                ) : (
                                    <>
                                        {ann.type === 'reference_image' ? (
                                            <div className={`${OVERLAY_STYLES.ChipContainer} p-1.5 cursor-default hover:scale-105`}>
                                                <div className={`${OVERLAY_STYLES.Arrow} ${borderArrowClass}`} style={borderArrowStyle} />
                                                <div className={`${OVERLAY_STYLES.Arrow} ${fillArrowClass}`} style={fillArrowStyle} />
                                                <div className="relative shrink-0 w-6 h-6 mr-1.5"><img src={ann.referenceImage} className={OVERLAY_STYLES.RefImage} alt="ref" /></div>
                                                <span className={`${Typo.Micro} whitespace-nowrap text-zinc-900 dark:text-zinc-100 mr-1.5 select-none`}>{ann.text || "Ref"}</span>
                                                <div className="flex items-center gap-0.5">
                                                    <Tooltip text="Delete"><button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }} className={`${OVERLAY_STYLES.ActionBtn} opacity-50 hover:opacity-100 ml-1`}><X className="w-3 h-3" /></button></Tooltip>
                                                </div>
                                            </div>
                                        ) : (
                                            // WYSIWYG Text/Stamp
                                            <div className="group/wysiwyg relative select-none" onClick={(e) => { e.stopPropagation(); handleEditClick(ann); }}>
                                                <div className="font-sans font-bold text-white px-3 py-1.5 rounded-lg shadow-sm transition-transform hover:scale-105 cursor-pointer backdrop-blur-sm" style={{ fontSize: Math.max(16, width * 0.025), backgroundColor: 'rgba(0,0,0,0.85)', lineHeight: 1.2 }}>
                                                    {ann.text || (ann.type === 'stamp' ? "📦" : "TEXT")}
                                                </div>
                                                <div className="absolute left-1/2 -translate-x-1/2 -top-10 flex items-center gap-1 bg-black p-1.5 rounded-full shadow-xl opacity-0 group-hover/wysiwyg:opacity-100 transition-opacity pointer-events-none group-hover/wysiwyg:pointer-events-auto z-50 ring-1 ring-white/20">
                                                    <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleEditClick(ann); }} className="text-white hover:text-blue-300 p-1 rounded-full hover:bg-white/10"><Pen className="w-3.5 h-3.5" /></button>
                                                    <div className="w-px h-3 bg-white/20 mx-1" />
                                                    <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }} className="text-white hover:text-red-300 p-1 rounded-full hover:bg-white/10"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
};
