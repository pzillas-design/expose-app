import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AnnotationObject, TranslationFunction } from '@/types';
import { X, Check, Pen, Trash2, GripHorizontal } from 'lucide-react';
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

    // Resizing State
    const [dragState, setDragState] = useState<{
        id: string;
        mode: 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | 'p1' | 'p2';
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

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isActive || activeTab !== 'brush') return;
        if ((e.target as HTMLElement).closest('.annotation-ui')) return;
        e.stopPropagation();

        // Clean empty annotations (stamps must have text, mask_paths must have points)
        const cleanedAnnotations = annotations.filter(a => {
            if (a.type === 'stamp' && (!a.text || a.text.trim() === '')) return false;
            if (a.type === 'mask_path' && a.points.length <= 1) return false;
            return true;
        });

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

        // No more drag-to-create shape here. Annotations are added via toolbar.
        if (maskTool === 'shape') {
            setActiveMaskId(null); // Deselect on bg click
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
        const { x, y } = getCoordinates(clientX, clientY);

        // --- Drag/Resize Logic ---
        if (dragState) {
            e.preventDefault();
            e.stopPropagation();

            const dx = x - dragState.startX;
            const dy = y - dragState.startY;

            // Threshold for movement
            if (!dragState.isMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                setDragState(prev => prev ? { ...prev, isMoved: true } : null);
            }

            const updated = annotations.map(ann => {
                if (ann.id !== dragState.id) return ann;

                // Move Entire Shape
                if (dragState.mode === 'move') {
                    if (ann.shapeType === 'line') {
                        // Move both points
                        const p1 = dragState.initialPoints[0];
                        const p2 = dragState.initialPoints[1];
                        return {
                            ...ann,
                            x: dragState.initialX + dx,
                            y: dragState.initialY + dy,
                            points: [
                                { x: p1.x + dx, y: p1.y + dy },
                                { x: p2.x + dx, y: p2.y + dy }
                            ]
                        };
                    } else {
                        return { ...ann, x: dragState.initialX + dx, y: dragState.initialY + dy };
                    }
                }

                // Resize Rect/Circle
                if (ann.shapeType === 'rect' || ann.shapeType === 'circle') {
                    let newX = dragState.initialX;
                    let newY = dragState.initialY;
                    let newW = dragState.initialW;
                    let newH = dragState.initialH;

                    if (dragState.mode === 'tl') {
                        newX += dx; newY += dy; newW -= dx; newH -= dy;
                    } else if (dragState.mode === 'tr') {
                        newY += dy; newW += dx; newH -= dy;
                    } else if (dragState.mode === 'bl') {
                        newX += dx; newW -= dx; newH += dy;
                    } else if (dragState.mode === 'br') {
                        newW += dx; newH += dy;
                    } else if (dragState.mode === 't') {
                        newY += dy; newH -= dy;
                    } else if (dragState.mode === 'b') {
                        newH += dy;
                    } else if (dragState.mode === 'l') {
                        newX += dx; newW -= dx;
                    } else if (dragState.mode === 'r') {
                        newW += dx;
                    }

                    // Enforce min size
                    if (newW < 20) newW = 20;
                    if (newH < 20) newH = 20;

                    return { ...ann, x: newX, y: newY, width: newW, height: newH };
                }

                // Resize Line (Update Endpoints)
                if (ann.shapeType === 'line') {
                    const pts = [...ann.points];
                    if (dragState.mode === 'p1') {
                        pts[0] = { x: x, y: y }; // Snap to cursor
                    } else if (dragState.mode === 'p2') {
                        pts[1] = { x: x, y: y };
                    }
                    return { ...ann, points: pts };
                }

                return ann;
            });
            onChange(updated);
            return;
        }

        // Cursor Logic
        if (cursorRef.current && containerRef.current && activeTab === 'brush') {
            const rect = containerRef.current.getBoundingClientRect();
            if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                const cx = clientX - rect.left;
                const cy = clientY - rect.top;
                cursorRef.current.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
                if (!isHovering) setIsHovering(true);
            } else {
                if (isHovering) setIsHovering(false);
            }
        }

        if (!isDrawing || maskTool !== 'brush') return;
        e.stopPropagation();

        const last = currentPathRef.current[currentPathRef.current.length - 1];
        if (Math.abs(last.x - x) > 2 || Math.abs(last.y - y) > 2) {
            currentPathRef.current.push({ x, y });
            renderCanvas();
        }
    };

    const handleMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
        if (dragState) {
            // If it was just a click (no move), activate this item
            if (!dragState.isMoved) {
                setActiveMaskId(dragState.id);
            }
            setDragState(null);
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

    // --- Drag Start Handlers ---
    const startDrag = (e: React.MouseEvent, id: string, mode: 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | 'p1' | 'p2', ann: AnnotationObject) => {
        e.stopPropagation();
        e.preventDefault();

        // @ts-ignore
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        // @ts-ignore
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const { x, y } = getCoordinates(clientX, clientY);

        setDragState({
            id,
            mode,
            startX: x,
            startY: y,
            initialX: ann.x || 0,
            initialY: ann.y || 0,
            initialW: ann.width || 0,
            initialH: ann.height || 0,
            initialPoints: ann.points || [],
            isMoved: false
        });
        // We don't set activeMaskId here anymore, we do it on mouseUp if it wasn't a drag
    };

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
            onEditStart('brush');
        }
    };

    return (
        <>
            <div
                ref={containerRef}
                className="absolute inset-0 z-10 w-full h-full"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
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
                    className={`absolute inset-0 w-full h-full touch-none ${activeTab === 'brush' ? (maskTool !== 'brush' ? 'cursor-default' : 'cursor-none') : 'cursor-default'}`}
                />

                {activeTab === 'brush' && maskTool === 'brush' && isActive && !dragState && (
                    <div
                        ref={cursorRef}
                        className={`absolute pointer-events-none rounded-full border border-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-50 transition-opacity duration-150 ${isHovering ? 'opacity-100' : 'opacity-0'}`}
                        style={{ width: brushSize, height: brushSize, left: 0, top: 0 }}
                    />
                )}

                {/* Render Annotations & Shapes/Controls */}
                {annotations.map(ann => {
                    const isActiveItem = activeMaskId === ann.id;

                    // --- SHAPES ---
                    if (ann.type === 'shape') {
                        let left = (ann.x || 0) / width * 100;
                        let top = (ann.y || 0) / height * 100;
                        let w = (ann.width || 0) / width * 100;
                        let h = (ann.height || 0) / height * 100;

                        // LINE Special Render
                        if (ann.shapeType === 'line') {
                            const p1 = ann.points?.[0] || { x: 0, y: 0 };
                            const p2 = ann.points?.[1] || { x: 0, y: 0 };
                            const minX = Math.min(p1.x, p2.x);
                            const minY = Math.min(p1.y, p2.y);
                            const maxX = Math.max(p1.x, p2.x);
                            const maxY = Math.max(p1.y, p2.y);
                            const pad = 15; // Increased pad for handles

                            // Bounding box for the SVG container
                            left = (minX - pad) / width * 100;
                            top = (minY - pad) / height * 100;
                            w = (maxX - minX + pad * 2) / width * 100;
                            h = (maxY - minY + pad * 2) / height * 100;

                            return (
                                <div
                                    key={ann.id}
                                    className={`absolute group annotation-ui ${isActiveItem ? 'z-50' : 'z-20'}`}
                                    style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }}
                                >
                                    <svg width="100%" height="100%" viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`} className="overflow-visible pointer-events-none">
                                        {/* Hit area line (thicker, invisible) */}
                                        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth="20" className="cursor-move pointer-events-auto" onMouseDown={(e) => startDrag(e, ann.id, 'move', ann)} />
                                        {/* Visible Line */}
                                        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="white" strokeWidth="4" className="drop-shadow-md pointer-events-none" />
                                    </svg>

                                    {/* Line Endpoint Handles (Absolute positioning relative to parent div is hard due to SVG scaling) */}
                                    {/* Actually, Render handles as divs using percentages relative to the container? No, container changes size. */}
                                    {/* Let's render handles as separate absolute divs on top of the container, calculated manually. */}

                                    {isActiveItem && (
                                        <>
                                            {/* P1 Handle */}
                                            <div
                                                className="absolute w-4 h-4 bg-blue-500 border border-white rounded-full cursor-pointer shadow-md hover:scale-125 transition-transform"
                                                style={{
                                                    left: `${(p1.x - (minX - pad)) / (maxX - minX + pad * 2) * 100}%`,
                                                    top: `${(p1.y - (minY - pad)) / (maxY - minY + pad * 2) * 100}%`,
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                                onMouseDown={(e) => startDrag(e, ann.id, 'p1', ann)}
                                            />
                                            {/* P2 Handle */}
                                            <div
                                                className="absolute w-4 h-4 bg-blue-500 border border-white rounded-full cursor-pointer shadow-md hover:scale-125 transition-transform"
                                                style={{
                                                    left: `${(p2.x - (minX - pad)) / (maxX - minX + pad * 2) * 100}%`,
                                                    top: `${(p2.y - (minY - pad)) / (maxY - minY + pad * 2) * 100}%`,
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                                onMouseDown={(e) => startDrag(e, ann.id, 'p2', ann)}
                                            />

                                            <button
                                                className="absolute top-0 right-0 p-1 bg-red-500 rounded text-white shadow pointer-events-auto"
                                                onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            );
                        }

                        // Rect/Circle
                        return (
                            <div
                                key={ann.id}
                                className={`absolute group annotation-ui ${isActiveItem ? 'z-50' : 'z-20'}`}
                                style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }}
                                onMouseDown={(e) => startDrag(e, ann.id, 'move', ann)}
                            >
                                {ann.shapeType === 'rect' ? (
                                    <div className="w-full h-full border-4 border-white bg-white/10 shadow-sm box-border cursor-move" />
                                ) : (
                                    <div className="w-full h-full border-4 border-white bg-white/10 shadow-sm rounded-full box-border cursor-move" />
                                )}

                                {isActiveItem && (
                                    <>
                                        {/* Resize handles */}
                                        <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-500 border border-white cursor-nw-resize hover:scale-110"
                                            onMouseDown={(e) => startDrag(e, ann.id, 'tl', ann)} />
                                        <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 border border-white cursor-ne-resize hover:scale-110"
                                            onMouseDown={(e) => startDrag(e, ann.id, 'tr', ann)} />
                                        <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-500 border border-white cursor-sw-resize hover:scale-110"
                                            onMouseDown={(e) => startDrag(e, ann.id, 'bl', ann)} />
                                        <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 border border-white cursor-se-resize hover:scale-110"
                                            onMouseDown={(e) => startDrag(e, ann.id, 'br', ann)} />

                                        {/* Delete Button - Offset to avoid covering handles */}
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
                    const isStamp = ann.type === 'stamp' || ann.type === 'mask_path';

                    // Specialized render for reference images (they have arrows in BOTH states)
                    if (ann.type === 'reference_image') {
                        return (
                            <div key={ann.id} className="absolute annotation-ui z-20" style={{ left: `${leftPct}%`, top: `${topPct}%` }}>
                                <div style={{ transform: finalTransform }} className="transition-all duration-200">
                                    <div className={`${isActiveItem ? OVERLAY_STYLES.ChipContainerActive : OVERLAY_STYLES.ChipContainer} p-1.5 cursor-move`} onMouseDown={(e) => startDrag(e, ann.id, 'move', ann)}>
                                        <div className={`${OVERLAY_STYLES.Arrow} ${borderArrowClass}`} style={borderArrowStyle} />
                                        <div className={`${OVERLAY_STYLES.Arrow} ${fillArrowClass}`} style={fillArrowStyle} />
                                        <div className="relative shrink-0 w-6 h-6 mr-1.5"><img src={ann.referenceImage} className={OVERLAY_STYLES.RefImage} alt="ref" /></div>
                                        {isActiveItem ? (
                                            <input
                                                value={ann.text || ''}
                                                onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'Enter') setActiveMaskId(null); }}
                                                placeholder="Describe..."
                                                className={`bg-transparent border-none outline-none ${Typo.Micro} tracking-normal flex-1 focus:ring-0 min-w-[80px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 mr-1.5`}
                                                autoFocus
                                                onMouseDown={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <span className={`${Typo.Micro} whitespace-nowrap text-zinc-900 dark:text-zinc-100 mr-1.5 select-none`}>{ann.text || "Ref"}</span>
                                        )}
                                        <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }} className={`${OVERLAY_STYLES.ActionBtn} opacity-50 hover:opacity-100 ml-1`}><X className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // Unified Black Chip for Stamps and Mask Labels
                    return (
                        <div
                            key={ann.id}
                            className="absolute annotation-ui z-20"
                            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                            onMouseDown={(e) => startDrag(e, ann.id, 'move', ann)}
                        >
                            <div style={{ transform: finalTransform }} className="transition-transform duration-200">
                                <div
                                    className={`group/chip relative font-sans font-bold text-white px-2.5 py-1.5 rounded-lg shadow-md backdrop-blur-sm transition-all cursor-pointer ${isActiveItem ? 'ring-1 ring-zinc-300 dark:ring-zinc-600 scale-105' : 'hover:scale-105'}`}
                                    style={{
                                        fontSize: Math.max(14, width * 0.02),
                                        backgroundColor: 'rgba(0,0,0,0.85)',
                                        lineHeight: 1.2,
                                        minWidth: 'none'
                                    }}
                                >
                                    {isActiveItem ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                value={ann.text || ''}
                                                onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'Enter') setActiveMaskId(null); }}
                                                placeholder=""
                                                className="bg-transparent border-none outline-none text-white placeholder-zinc-500 p-0 focus:ring-0 h-auto font-bold"
                                                style={{ fontSize: 'inherit', width: `${Math.max(4, (ann.text?.length || 0) + 1)}ch` }}
                                                autoFocus
                                                onMouseDown={(e) => e.stopPropagation()}
                                            />
                                            <div className="flex items-center gap-0.5 ml-0.5">
                                                <button
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!ann.text || ann.text.trim() === '') {
                                                            deleteAnnotation(ann.id);
                                                        } else {
                                                            setActiveMaskId(null);
                                                        }
                                                    }}
                                                    className="p-1 hover:bg-white/20 rounded-md transition-colors text-white"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                                <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }} className="p-1 hover:bg-red-500 rounded-md transition-colors text-white"><X className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {ann.text || ""}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
};
