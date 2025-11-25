
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AnnotationObject } from '../types';
import { X, ArrowRight, Eraser } from 'lucide-react';

interface EditorCanvasProps {
    width: number;
    height: number;
    imageSrc: string;
    annotations: AnnotationObject[];
    onChange: (newAnnotations: AnnotationObject[]) => void;
    brushSize: number;
    activeTab: 'prompt' | 'brush' | 'objects';
    isActive: boolean;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
    width,
    height,
    annotations,
    onChange,
    brushSize,
    activeTab,
    isActive
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

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw existing paths
        annotations.forEach(ann => {
            if (ann.type !== 'mask_path' || ann.points.length < 1) return;
            ctx.beginPath();
            ctx.lineWidth = ann.strokeWidth;

            // WHITE COLOR FOR BRUSH STROKES
            ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';

            ctx.moveTo(ann.points[0].x, ann.points[0].y);
            for (let i = 1; i < ann.points.length; i++) {
                ctx.lineTo(ann.points[i].x, ann.points[i].y);
            }
            ctx.stroke();
            // Optional: Fill for better visibility of area
            // ctx.fill(); 
        });

        // Draw current stroke
        if (isDrawing && currentPathRef.current.length > 0) {
            // Calculate scale factor to match screen pixels to canvas pixels
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;

            ctx.beginPath();
            ctx.lineWidth = brushSize * scaleX; // Apply scale factor
            ctx.strokeStyle = 'rgba(255, 255, 255, 1)'; // White Active
            const pts = currentPathRef.current;
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.stroke();
        }
    }, [annotations, isDrawing, activeMaskId, brushSize, isActive]);

    useEffect(() => {
        renderCanvas();
    }, [renderCanvas, width, height]);

    // Handle Resize
    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.width = width;
            canvasRef.current.height = height;
            renderCanvas();
        }
    }, [width, height, renderCanvas]);


    // --- Coordinates Helper ---
    const getCoordinates = (clientX: number, clientY: number) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    // --- Mouse/Touch Handlers for Drawing ---
    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        // STRICT BRUSH CHECK: Only draw if tab is strictly 'brush'
        if (!isActive || activeTab !== 'brush') return;

        if ((e.target as HTMLElement).closest('.annotation-ui')) return;

        e.stopPropagation();

        // CLEANUP IMMEDIATE: Remove any previous strokes that don't have a prompt (text) and aren't marked for removal
        // This ensures they disappear AS SOON as you start drawing a new one
        const cleanAnnotations = annotations.filter(ann => {
            if (ann.type === 'mask_path') {
                // Keep if it has text OR is marked for removal
                return (ann.text && ann.text.trim().length > 0) || ann.isRemove;
            }
            return true; // Keep other types (stamps, etc.)
        });

        // Only update if we actually removed something to avoid unnecessary renders
        if (cleanAnnotations.length !== annotations.length) {
            onChange(cleanAnnotations);
        }

        setIsDrawing(true);
        // @ts-ignore
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        // @ts-ignore
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const { x, y } = getCoordinates(clientX, clientY);
        currentPathRef.current = [{ x, y }];
        setActiveMaskId(null);
        renderCanvas();
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        // @ts-ignore
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        // @ts-ignore
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Cursor update (Only show brush cursor if tab is BRUSH)
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
            // Hide custom cursor if not in brush mode
            if (isHovering) setIsHovering(false);
        }

        if (!isDrawing) return;
        e.stopPropagation();

        const { x, y } = getCoordinates(clientX, clientY);
        const last = currentPathRef.current[currentPathRef.current.length - 1];
        if (Math.abs(last.x - x) > 1 || Math.abs(last.y - y) > 1) {
            currentPathRef.current.push({ x, y });
            renderCanvas();
        }
    };

    const handleMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        e.stopPropagation();

        if (currentPathRef.current.length > 1 && canvasRef.current) {
            // Calculate scale factor for saving
            const rect = canvasRef.current.getBoundingClientRect();
            const scaleX = canvasRef.current.width / rect.width;

            const newId = Math.random().toString(36).substr(2, 9);
            const newMask: AnnotationObject = {
                id: newId,
                type: 'mask_path',
                points: [...currentPathRef.current],
                strokeWidth: brushSize * scaleX, // Save with scaled width
                color: '#fff',
                text: ''
            };

            // Add to CURRENT annotations (which should be clean now due to mouseDown)
            onChange([...annotations, newMask]);
            setActiveMaskId(newId);
        }
        currentPathRef.current = [];
    };

    // --- Stamp Drag & Drop (Within Canvas) ---
    const handleStampDragStart = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        if (activeTab === 'prompt') return;
        setDraggingStampId(id);
        setActiveMaskId(id);
    };

    useEffect(() => {
        const handleGlobalMove = (e: MouseEvent) => {
            if (draggingStampId && containerRef.current) {
                const { x, y } = getCoordinates(e.clientX, e.clientY);
                const newAnns = annotations.map(a => a.id === draggingStampId ? { ...a, x, y } : a);
                onChange(newAnns);
            }
        };
        const handleGlobalUp = () => {
            setDraggingStampId(null);
        };

        if (draggingStampId) {
            window.addEventListener('mousemove', handleGlobalMove);
            window.addEventListener('mouseup', handleGlobalUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
        };
    }, [draggingStampId, annotations, onChange]);

    // --- Drop from Sidebar ---
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const payloadStr = e.dataTransfer.getData('application/x-nano-stamp');
        if (!payloadStr) return;

        try {
            const { text, itemId, variantIndex } = JSON.parse(payloadStr);
            const { x, y } = getCoordinates(e.clientX, e.clientY);

            const newStamp: AnnotationObject = {
                id: Math.random().toString(36).substr(2, 9),
                type: 'stamp',
                points: [],
                x: x,
                y: y,
                strokeWidth: 0,
                color: '#fff',
                text: text,
                itemId: itemId,
                variantIndex: variantIndex
            };
            onChange([...annotations, newStamp]);
            setActiveMaskId(newStamp.id);
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

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 z-10 w-full h-full"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
            onDrop={handleDrop}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
        >
            {/* Canvas Layer */}
            <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full touch-none ${activeTab === 'brush' ? 'cursor-crosshair' : 'cursor-default'}`}
            />

            {/* Cursor (ONLY FOR BRUSH TAB) */}
            {activeTab === 'brush' && isActive && (
                <div
                    ref={cursorRef}
                    className={`absolute pointer-events-none rounded-full border-2 border-white z-50 transition-opacity duration-150 ${isHovering ? 'opacity-100' : 'opacity-0'}`}
                    style={{ width: brushSize, height: brushSize, left: 0, top: 0 }}
                />
            )}

            {/* DOM Stamps Layer */}
            {annotations.filter(a => a.type === 'stamp').map(ann => {
                if (ann.x === undefined || ann.y === undefined) return null;
                const leftPct = (ann.x / width) * 100;
                const topPct = (ann.y / height) * 100;
                const isActiveStamp = activeMaskId === ann.id;

                return (
                    <div
                        key={ann.id}
                        className="absolute annotation-ui"
                        style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(-50%, -50%)' }}
                        onMouseDown={(e) => handleStampDragStart(e, ann.id)}
                    >
                        {/* Unified Chip Style with Zipfel (Arrow) */}
                        <div className={`
                          relative px-2 py-1.5 rounded-lg border shadow-xl flex items-center gap-2 group cursor-move transition-all
                          before:content-[''] before:absolute before:left-1/2 before:-translate-x-1/2 before:top-full before:border-[6px] before:border-x-transparent before:border-b-transparent
                          ${isActiveStamp
                                ? 'bg-zinc-900 border-zinc-700 z-50 scale-105 before:border-t-zinc-900'
                                : 'bg-[#09090b] border-zinc-800 hover:border-zinc-600 before:border-t-[#09090b]'}
                      `}>
                            <div className={`w-1.5 h-1.5 rounded-full ml-1 ${isActiveStamp ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]' : 'bg-zinc-400'}`} />
                            <span className="text-[10px] font-normal tracking-wider whitespace-nowrap text-white mr-1">
                                {ann.text}
                            </span>


                            <button
                                onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                                className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )
            })}

            {/* Path Tooltips/Labels */}
            {annotations.filter(a => a.type === 'mask_path').map(ann => {
                let minX = Infinity, minY = Infinity;
                ann.points.forEach(p => { if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; });
                const leftPct = (minX / width) * 100;
                const topPct = (minY / height) * 100;
                const isActivePath = activeMaskId === ann.id;

                // Base Style shared for unification
                const baseChipStyle = `
                relative flex items-center gap-2 px-2 py-1.5 rounded-lg border shadow-xl transition-all
                before:content-[''] before:absolute before:left-4 before:top-full before:border-[6px] before:border-x-transparent before:border-b-transparent
             `;

                return (
                    <div
                        key={ann.id}
                        className="absolute z-20 annotation-ui"
                        style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: `translate(0, -100%) translateY(-12px)` }}
                    >
                        <div className="relative">
                            {isActivePath ? (
                                <div className={`
                                ${baseChipStyle}
                                bg-[#09090b] border-zinc-700 before:border-t-[#09090b]
                                pl-3 pr-1.5 gap-2 min-w-[240px]
                            `}>
                                    <input
                                        value={ann.text || ''}
                                        onChange={(e) => updateAnnotation(ann.id, { text: e.target.value, isRemove: false })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') setActiveMaskId(null); }}
                                        placeholder="Describe change..."
                                        className="bg-transparent border-none outline-none text-[10px] font-normal tracking-wide flex-1 focus:ring-0 w-full min-w-0 text-white placeholder-zinc-600"
                                        autoFocus
                                        onMouseDown={(e) => e.stopPropagation()}
                                    />



                                    {/* Remove Action Text Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateAnnotation(ann.id, { text: 'remove object', isRemove: false });
                                            setActiveMaskId(null);
                                        }}
                                        className="px-2 py-1 rounded border border-zinc-700 bg-zinc-800/50 text-[9px] font-normal tracking-wider transition-colors text-zinc-400 hover:text-white hover:bg-zinc-700 hover:border-zinc-600"
                                    >
                                        Remove This
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                                        className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={(e) => { e.stopPropagation(); setActiveMaskId(ann.id); }}
                                    className={`
                                    ${baseChipStyle} hover:scale-105 cursor-pointer
                                    bg-[#09090b] border-zinc-800 hover:border-zinc-600 before:border-t-[#09090b]
                                `}
                                >
                                    <span className="text-[10px] font-normal tracking-wide whitespace-nowrap shadow-sm text-white">
                                        {ann.text || "Edit Area"}
                                    </span>



                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                                        className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
