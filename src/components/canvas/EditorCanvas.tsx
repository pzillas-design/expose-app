
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AnnotationObject, TranslationFunction } from '@/types';
import { X, Check, Pen } from 'lucide-react';
import { Typo, Tooltip, Theme } from '@/components/ui/DesignSystem';
import { generateId } from '@/utils/ids';

interface EditorCanvasProps {
    width: number;
    height: number;
    imageSrc: string;
    annotations: AnnotationObject[];
    onChange: (newAnnotations: AnnotationObject[]) => void;
    brushSize: number;
    activeTab: string;
    maskTool?: 'brush' | 'text';
    isActive: boolean;
    onEditStart?: (mode: 'brush' | 'objects') => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    t?: TranslationFunction;
}

const RES_SCALE = 3;

// Styles moved to constants for cleanliness
const OVERLAY_STYLES = {
    // No shadows, clean borders
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
    isActive,
    onEditStart,
    onContextMenu,
    t
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [activeMaskId, setActiveMaskId] = useState<string | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [draggingStampId, setDraggingStampId] = useState<string | null>(null);

    const currentPathRef = useRef<{ x: number, y: number }[]>([]);

    // --- Rendering ---
    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = containerRef.current?.getBoundingClientRect();
        const displayWidth = rect?.width || width;
        const scaleFactor = width / displayWidth;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(RES_SCALE, RES_SCALE);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw existing paths
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

        // Draw current stroke
        if (isDrawing && currentPathRef.current.length > 0) {
            ctx.beginPath();
            ctx.lineWidth = brushSize * scaleFactor;
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

        // Clean empty annotations before starting new one
        const cleanedAnnotations = annotations.filter(a => (a.text && a.text.trim() !== '') || a.referenceImage);
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
                id: newId,
                type: 'stamp',
                points: [],
                x, y, strokeWidth: 0, color: '#fff',
                text: '',
                createdAt: Date.now()
            };
            onChange([...cleanedAnnotations, newStamp]);
            setActiveMaskId(newId);
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

        if (!isDrawing || maskTool === 'text') return;
        e.stopPropagation();

        const { x, y } = getCoordinates(clientX, clientY);
        const last = currentPathRef.current[currentPathRef.current.length - 1];
        if (Math.abs(last.x - x) > 2 || Math.abs(last.y - y) > 2) {
            currentPathRef.current.push({ x, y });
            renderCanvas();
        }
    };

    const handleMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || maskTool === 'text') return;
        setIsDrawing(false);
        e.stopPropagation();

        const rect = containerRef.current?.getBoundingClientRect();
        const displayWidth = rect?.width || width;
        const scaleFactor = width / displayWidth;
        const intrinsicStrokeWidth = brushSize * scaleFactor;

        if (currentPathRef.current.length > 1) {
            const newId = generateId();
            // Clean empty annotations
            const cleanedPrev = annotations.filter(a => (a.text && a.text.trim() !== '') || a.referenceImage);

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

    // --- Stamp Drag ---
    const handleStampDragStart = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        // Enable dragging in any mode (prompt, brush, objects)
        setDraggingStampId(id);
    };

    useEffect(() => {
        const handleGlobalMove = (e: MouseEvent) => {
            if (draggingStampId && containerRef.current) {
                let { x, y } = getCoordinates(e.clientX, e.clientY);

                // Constrain to canvas bounds
                x = clamp(x, 0, width);
                y = clamp(y, 0, height);

                const newAnns = annotations.map(a => a.id === draggingStampId ? { ...a, x, y } : a);
                onChange(newAnns);
            }
        };
        const handleGlobalUp = () => { setDraggingStampId(null); };
        if (draggingStampId) {
            window.addEventListener('mousemove', handleGlobalMove);
            window.addEventListener('mouseup', handleGlobalUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
        };
    }, [draggingStampId, annotations, onChange, width, height]);

    // --- Drop Handlers ---
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const payloadStr = e.dataTransfer.getData('application/x-nano-stamp');
        if (!payloadStr) return;

        try {
            const { text, itemId, variantIndex } = JSON.parse(payloadStr);
            let { x, y } = getCoordinates(e.clientX, e.clientY);

            // Constrain to canvas bounds
            x = clamp(x, 0, width);
            y = clamp(y, 0, height);

            const newStamp: AnnotationObject = {
                id: generateId(),
                type: 'stamp',
                points: [],
                x: x, y: y, strokeWidth: 0, color: '#fff',
                text: text, itemId: itemId, variantIndex: variantIndex,
                createdAt: Date.now()
            };
            onChange([...annotations, newStamp]);
        } catch (e) { console.error(e); }
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
        // Trigger mode switch via callback
        if (onEditStart) {
            if (ann.type === 'mask_path') onEditStart('brush');
            if (ann.type === 'stamp') onEditStart('objects');
        }
    };

    return (
        <>
            <div
                ref={containerRef}
                className="absolute inset-0 z-10 w-full h-full"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                onDrop={handleDrop}
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
                    className={`absolute inset-0 w-full h-full touch-none ${activeTab === 'brush' ? (maskTool === 'text' ? 'cursor-text' : 'cursor-none') : 'cursor-default'}`}
                />

                {/* Cursor */}
                {activeTab === 'brush' && maskTool === 'brush' && isActive && (
                    <>
                        <div
                            ref={cursorRef}
                            className={`absolute pointer-events-none rounded-full border border-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-50 transition-opacity duration-150 ${isHovering ? 'opacity-100' : 'opacity-0'}`}
                            style={{ width: brushSize, height: brushSize, left: 0, top: 0 }}
                        />
                        {!isHovering && (
                            <div
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-white/5 pointer-events-none z-50 animate-in fade-in duration-300"
                                style={{ width: brushSize, height: brushSize }}
                            />
                        )}
                    </>
                )}

                {/* Render Annotations */}
                {annotations.map(ann => {
                    // Coordinate Calculation
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

                    // Determine horizontal alignment based on edge proximity
                    let horizontalAlign: 'left' | 'center' | 'right' = 'center';
                    if (leftPct < 15) horizontalAlign = 'left';
                    else if (leftPct > 85) horizontalAlign = 'right';

                    // Calculate Transform based on alignment
                    let containerTransform = 'translate(-50%, 0)'; // Default Center
                    if (horizontalAlign === 'left') containerTransform = 'translate(-10px, 0)';
                    if (horizontalAlign === 'right') containerTransform = 'translate(calc(-100% + 10px), 0)';

                    // Vertical Shift
                    const verticalShift = isTopEdge
                        ? 'translateY(12px)' // Push down if too high
                        : 'translateY(calc(-100% - 12px))'; // Default above

                    // Merge transforms
                    const finalTransform = ann.type === 'stamp'
                        ? `${containerTransform} translateY(-50%)` // Stamp centers vertically
                        : `${containerTransform} ${verticalShift}`;

                    // --- Double Arrow Logic for Border ---
                    const isPointingUp = isTopEdge;

                    // Base position for both arrows
                    const arrowBaseStyle: React.CSSProperties = {};
                    if (horizontalAlign === 'left') arrowBaseStyle.left = '10px';
                    else if (horizontalAlign === 'right') arrowBaseStyle.right = '10px';
                    else { arrowBaseStyle.left = '50%'; arrowBaseStyle.transform = 'translateX(-50%)'; }

                    // 1. Outer Arrow (Border Color)
                    const borderArrowClass = isPointingUp
                        ? "border-b-zinc-200 dark:border-b-zinc-800"
                        : "border-t-zinc-200 dark:border-t-zinc-800";

                    const borderArrowStyle = { ...arrowBaseStyle };
                    if (isPointingUp) borderArrowStyle.bottom = '100%';
                    else borderArrowStyle.top = '100%';

                    // 2. Inner Arrow (Fill Color - White in Light Mode)
                    const fillArrowClass = isPointingUp
                        ? "border-b-white dark:border-b-zinc-900"
                        : "border-t-white dark:border-t-zinc-900";

                    const fillArrowStyle = { ...arrowBaseStyle };
                    if (isPointingUp) {
                        fillArrowStyle.bottom = '100%';
                        fillArrowStyle.marginBottom = '-1px'; // Shift inwards
                    } else {
                        fillArrowStyle.top = '100%';
                        fillArrowStyle.marginTop = '-1px'; // Shift inwards
                    }

                    const isActiveItem = activeMaskId === ann.id;
                    const hasText = ann.text && ann.text.trim().length > 0;
                    const isInitial = !hasText; // Proxy for initial creation state

                    return (
                        <div
                            key={ann.id}
                            className="absolute annotation-ui z-20"
                            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                            onMouseDown={(e) => ann.type === 'stamp' && handleStampDragStart(e, ann.id)}
                        >
                            <div style={{ transform: finalTransform }} className="transition-transform duration-200">
                                {isActiveItem ? (
                                    <div className={OVERLAY_STYLES.ChipContainerActive}>
                                        {/* Double Arrow */}
                                        <div className={`${OVERLAY_STYLES.Arrow} ${borderArrowClass}`} style={borderArrowStyle} />
                                        <div className={`${OVERLAY_STYLES.Arrow} ${fillArrowClass}`} style={fillArrowStyle} />

                                        {/* Ref Image */}
                                        {ann.referenceImage && (
                                            <div className={OVERLAY_STYLES.RefThumb}>
                                                <img src={ann.referenceImage} className={OVERLAY_STYLES.RefImage} alt="ref" />
                                            </div>
                                        )}

                                        <input
                                            value={ann.text || ''}
                                            onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                                            onKeyDown={(e) => { if (e.key === 'Enter') setActiveMaskId(null); }}
                                            placeholder="Describe..."
                                            className={`bg-transparent border-none outline-none ${Typo.Micro} tracking-normal flex-1 focus:ring-0 min-w-[80px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 mr-1.5`}
                                            autoFocus
                                            onMouseDown={(e) => e.stopPropagation()}
                                        />

                                        {/* Remove This Chip - Minimal Style (Grey) */}
                                        {ann.type === 'mask_path' && isInitial && (
                                            <button
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateAnnotation(ann.id, { text: 'remove this' });
                                                    setActiveMaskId(null);
                                                }}
                                                className="px-1 py-0.5 mx-1 text-[10px] font-medium whitespace-nowrap text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                            >
                                                {t ? t('remove_btn') : 'Remove'}
                                            </button>
                                        )}

                                        {/* Save/Done Button */}
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
                                        className={`${OVERLAY_STYLES.ChipContainer} p-1.5 ${ann.type === 'stamp' ? 'cursor-move' : 'cursor-default'} hover:scale-105`}
                                    >
                                        {/* Double Arrow */}
                                        <div className={`${OVERLAY_STYLES.Arrow} ${borderArrowClass}`} style={borderArrowStyle} />
                                        <div className={`${OVERLAY_STYLES.Arrow} ${fillArrowClass}`} style={fillArrowStyle} />

                                        {ann.referenceImage && (
                                            <div className="relative shrink-0 w-6 h-6 mr-1.5">
                                                <img src={ann.referenceImage} className={OVERLAY_STYLES.RefImage} alt="ref" />
                                            </div>
                                        )}

                                        <span className={`${Typo.Micro} whitespace-nowrap text-zinc-900 dark:text-zinc-100 mr-1.5 select-none`}>
                                            {ann.text || "Edit"}
                                        </span>

                                        {/* Hover actions: Edit & Delete */}
                                        <div className="flex items-center gap-0.5">
                                            {/* Edit Button - Always present for layout stability, fades in on hover */}
                                            <Tooltip text="Edit">
                                                <button
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.stopPropagation(); handleEditClick(ann); }}
                                                    className={`${OVERLAY_STYLES.ActionBtn} opacity-0 group-hover/chip:opacity-100 transition-opacity duration-200`}
                                                >
                                                    <Pen className="w-3 h-3" />
                                                </button>
                                            </Tooltip>

                                            {/* Delete Button - Always visible but dimmed (50%), bright on hover */}
                                            <Tooltip text="Delete">
                                                <button
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                                                    className={`${OVERLAY_STYLES.ActionBtn} opacity-50 hover:opacity-100 ml-1`}
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
};
