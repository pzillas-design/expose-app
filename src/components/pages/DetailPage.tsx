import React, { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Info, Trash2, MoreHorizontal, Loader2, Type, Square, Circle, Minus, Pen, Trash, Check, Shapes, X, Repeat } from 'lucide-react';
import { CanvasImage } from '@/types';
import { SideSheet } from '@/components/sidesheet/SideSheet';
import { useMobile } from '@/hooks/useMobile';
import { Theme, Tooltip, RoundIconButton, Button } from '@/components/ui/DesignSystem';
import { useItemDialog } from '@/components/ui/Dialog';
import { EditorCanvas } from '@/components/canvas/EditorCanvas';
import { ObjectsTab } from '@/components/sidesheet/ObjectsTab';

interface DetailPageProps {
    images: CanvasImage[];
    selectedId: string;
    onBack: () => void;
    onSelectImage: (id: string) => void;
    onDelete: (id: string) => void;
    onDownload: (id: string) => void;
    onInfo: (id: string) => void;
    onSidebarWidthChange?: (w: number) => void;
    isSideSheetVisible?: boolean;
    onSideSheetVisibleChange?: (v: boolean) => void;

    // SideSheet Props (pass-through)
    state: any;
    actions: any;
    t: any;
}

// ── Generating Skeleton Overlay ─────────────────────────────────────────────
const GeneratingOverlay: React.FC<{ startTime?: number; duration: number }> = ({ startTime, duration }) => {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const start = startTime || Date.now();
        const tick = () => {
            const elapsed = Date.now() - start;
            let p = (elapsed / duration) * 100;
            if (p > 95) p = 95 + (1 - Math.exp(-(elapsed - duration) / 8000)) * 4.9;
            setProgress(Math.min(p, 99.9));
        };
        const id = setInterval(tick, 30);
        tick();
        return () => clearInterval(id);
    }, [startTime, duration]);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 rounded-[2px] overflow-hidden">
            <div className="absolute inset-0 bg-white/70 dark:bg-zinc-950/88 backdrop-blur-md" />
            <div className="relative z-10 flex flex-col gap-3 w-full max-w-[180px]">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-widest">Generierung…</span>
                <div className="h-0.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full">
                    <div
                        className="h-full bg-zinc-800 dark:bg-white rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export const DetailPage: React.FC<DetailPageProps> = ({
    images, selectedId, onBack, onSelectImage, onDelete, onDownload, onInfo, onSidebarWidthChange,
    isSideSheetVisible: isSideSheetVisibleProp, onSideSheetVisibleChange,
    state, actions, t
}) => {
    const isMobile = useMobile();
    const [loadedImageId, setLoadedImageId] = useState<string | null>(null);
    const isMainLoaded = loadedImageId === selectedId;
    const [subMenu, setSubMenu] = useState<'text' | 'shapes' | 'brush'>('brush');
    // SideSheet visibility — controlled from outside if prop provided
    const [isSideSheetVisibleLocal, setIsSideSheetVisibleLocal] = useState(true);
    const isSideSheetVisible = isSideSheetVisibleProp ?? isSideSheetVisibleLocal;
    const setIsSideSheetVisible = (v: boolean) => {
        setIsSideSheetVisibleLocal(v);
        onSideSheetVisibleChange?.(v);
    };
    // Brush mode visually hides the sidesheet to give canvas full width
    const isSideSheetActuallyVisible = isSideSheetVisible && state.sideSheetMode !== 'brush';

    const img = images.find(i => i.id === selectedId);
    const idx = images.findIndex(i => i.id === selectedId);
    const { confirm } = useItemDialog();

    // Track actual image dimensions from the loaded <img> element
    const [imgNaturalDims, setImgNaturalDims] = useState({ width: img?.width || 0, height: img?.height || 0 });
    useEffect(() => {
        const el = document.getElementById(`detail-img-${selectedId}`) as HTMLImageElement;
        if (el && el.naturalWidth > 0 && el.naturalHeight > 0) {
            setImgNaturalDims({ width: el.naturalWidth, height: el.naturalHeight });
        }
    }, [selectedId]);

    useEffect(() => {
        if (state.sideSheetMode === 'brush') {
            actions.setMaskTool(subMenu === 'brush' ? 'brush' : 'select');
        }
    }, [subMenu, state.sideSheetMode, actions]);

    const generateId = () => Math.random().toString(36).substring(2, 9);

    const handleAddObjectCenter = (label: string, itemId: string, icon?: string) => {
        if (!img) return;
        const cx = imgNaturalDims.width / 2;
        const cy = imgNaturalDims.height / 2;
        const newAnn: any = { id: generateId(), type: 'stamp', x: cx, y: cy, text: label, itemId, emoji: icon, color: '#fff', strokeWidth: 0, points: [], createdAt: Date.now() };
        actions.handleUpdateAnnotations(img.id, [...(img.annotations || []), newAnn]);
        actions.setMaskTool('select');
    };

    const handleAddText = () => {
        if (!img) return;
        const cx = imgNaturalDims.width / 2;
        const cy = imgNaturalDims.height / 2;
        const newText: any = { id: generateId(), type: 'stamp', x: cx, y: cy, text: '', color: '#fff', strokeWidth: 4, points: [], createdAt: Date.now() };
        actions.handleUpdateAnnotations(img.id, [...(img.annotations || []), newText]);
        actions.setMaskTool('select');
    };

    const handleAddShape = (shape: 'rect' | 'circle' | 'line') => {
        if (!img) return;
        // Use normalized image space (imgNaturalDims.width/height) — consistent regardless of display size
        const cx = imgNaturalDims.width / 2;
        const cy = imgNaturalDims.height / 2;
        const size = Math.min(imgNaturalDims.width, imgNaturalDims.height) * 0.3;
        const half = size / 2;
        let newShape: any;
        if (shape === 'line') {
            newShape = { id: generateId(), type: 'shape', shapeType: 'line', points: [{ x: cx - half, y: cy }, { x: cx + half, y: cy }], strokeWidth: 4, color: '#fff', createdAt: Date.now() };
        } else if (shape === 'rect') {
            const x = cx - half, y = cy - half;
            newShape = { id: generateId(), type: 'shape', shapeType: 'rect', points: [{ x, y }, { x: x + size, y }, { x: x + size, y: y + size }, { x, y: y + size }], strokeWidth: 4, color: '#fff', createdAt: Date.now() };
        } else {
            newShape = { id: generateId(), type: 'shape', shapeType: 'circle', x: cx - half, y: cy - half, width: size, height: size, points: [], strokeWidth: 4, color: '#fff', createdAt: Date.now() };
        }
        actions.handleUpdateAnnotations(img.id, [...(img.annotations || []), newShape]);
        actions.setMaskTool('select');
    };

    // Sync global activeId is now exclusively handled by App.tsx to prevent race conditions

    // Deep-link support: ensure the missing image is fetched
    useEffect(() => {
        if (!img && selectedId && actions.ensureImageLoaded) {
            actions.ensureImageLoaded(selectedId);
        }
    }, [selectedId, img, actions.ensureImageLoaded]);


    // Reset load state on image change and check cache
    useEffect(() => {
        setSubMenu('brush');

        const imEl = document.getElementById(`detail-img-${selectedId}`) as HTMLImageElement;
        if (imEl && imEl.complete && imEl.naturalWidth > 0 && imEl.src && !imEl.src.includes('data:image/gif')) {
            setLoadedImageId(selectedId);
        } else {
            setLoadedImageId(null);
        }

        // Fallback in case onLoad never fires (cached images, etc.)
        const fallbackTimer = setTimeout(() => {
            const el = document.getElementById(`detail-img-${selectedId}`) as HTMLImageElement;
            if (el) setLoadedImageId(selectedId);
        }, 800);

        return () => clearTimeout(fallbackTimer);
    }, [selectedId]);

    const navigate = useCallback((d: 1 | -1) => {
        const n = idx + d;
        if (n >= 0 && n < images.length) onSelectImage(images[n].id);
    }, [idx, images, onSelectImage]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            // Ignore if an input or textarea is focused
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            // Annotation Mode Escape/Enter
            if (state.sideSheetMode === 'brush') {
                if (e.key === 'Escape' || e.key === 'Enter') {
                    e.preventDefault();
                    actions.setSideSheetMode('prompt');
                    return;
                }
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                onBack();
                return;
            }

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    navigate(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    navigate(1);
                    break;
                case 'Backspace':
                case 'Delete':
                    e.preventDefault();
                    if (selectedId) {
                        const confirmed = await confirm({
                            title: 'Bild löschen',
                            description: 'Möchtest du dieses Bild wirklich löschen?',
                            confirmLabel: 'LÖSCHEN',
                            cancelLabel: 'ABBRECHEN',
                            variant: 'danger'
                        });
                        if (confirmed) {
                            onDelete(selectedId);
                            // Auto-navigate to next or previous if available
                            if (idx < images.length - 1) onSelectImage(images[idx + 1].id);
                            else if (idx > 0) onSelectImage(images[idx - 1].id);
                            else onBack();
                        }
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate, confirm, onDelete, selectedId, idx, images.length, onSelectImage, onBack]);

    // Resizable Sidebar States
    const [sidebarWidth, setSidebarWidth] = useState(380);
    const [isResizing, setIsResizing] = useState(false);
    useEffect(() => { onSidebarWidthChange?.(380); }, []);

    const startResizing = useCallback(() => setIsResizing(true), []);
    const stopResizing = useCallback(() => setIsResizing(false), []);

    const SNAP_CLOSE_THRESHOLD = 220;

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth < SNAP_CLOSE_THRESHOLD) {
                // Snap closed
                setIsSideSheetVisible(false);
                setIsResizing(false);
            } else if (newWidth <= 600) {
                setSidebarWidth(Math.max(newWidth, 300));
                onSidebarWidthChange?.(Math.max(newWidth, 300));
            }
        }
    }, [isResizing, onSidebarWidthChange]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", resize);
            window.addEventListener("mouseup", stopResizing);
        } else {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        }
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [isResizing, resize, stopResizing]);


    if (!img) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-black">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400 dark:text-zinc-800" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-black">
            {/* Removed internal header - handled by AppNavbar */}

            <main className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
                {/* Canvas Area — mobile: height computed from image aspect ratio; desktop: flex-1 */}
                <div
                    className="md:flex-1 flex flex-col bg-white dark:bg-black relative overflow-hidden group shrink-0 md:shrink"
                    style={isMobile
                        ? {
                            height: (imgNaturalDims.width ?? 0) > 0 && (imgNaturalDims.height ?? 0) > 0
                                ? `${Math.round(window.innerWidth * imgNaturalDims.height / imgNaturalDims.width) + (state.sideSheetMode === 'brush' ? 64 : 0)}px`
                                : `${window.innerWidth + (state.sideSheetMode === 'brush' ? 64 : 0)}px`
                        }
                        : undefined
                    }
                >
                    {/* Nav Arrows — desktop only, visible on hover, hidden in brush mode */}
                    {idx > 0 && state.sideSheetMode !== 'brush' && (
                        <button onClick={() => onSelectImage(images[idx - 1].id)} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-black/40 hover:bg-black/70 text-white rounded-full items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    {idx < images.length - 1 && state.sideSheetMode !== 'brush' && (
                        <button onClick={() => onSelectImage(images[idx + 1].id)} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-black/40 hover:bg-black/70 text-white rounded-full items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    )}

                    {/* Image Container */}
                    <div className="flex-1 relative overflow-hidden min-h-0">

                        {/* Floating action buttons when sidesheet is collapsed (desktop only) */}
                        {!isSideSheetVisible && !isMobile && state.sideSheetMode !== 'brush' && (
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-40 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                <div className="flex items-center gap-2 pointer-events-auto">
                                    {!img.isGenerating && (
                                        <button onClick={() => setIsSideSheetVisible(true)} className="h-9 px-4 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center text-xs font-medium transition-all">
                                            {state.currentLang === 'de' ? 'Bearbeiten' : 'Edit'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => actions.handleGenerate(img.generationPrompt || '', undefined, img.activeTemplateId, img.variableValues)}
                                        className="h-9 px-4 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center gap-1.5 text-xs font-medium transition-all"
                                    >
                                        <Repeat className="w-3.5 h-3.5" />
                                        {state.currentLang === 'de' ? 'Mehr' : 'More'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Sizing wrapper: absolute inset-0 gives definite dimensions for image centering */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {/* Blurry Placeholder (Thumb) */}
                            {img.thumbSrc && !isMainLoaded && (
                                <img
                                    src={img.thumbSrc}
                                    className="absolute inset-0 w-full h-full object-contain opacity-20 pointer-events-none"
                                    alt=""
                                />
                            )}

                            {/* Main Image */}
                            <img
                                id={`detail-img-${img.id}`}
                                key={img.id}
                                src={img.src}
                                alt={img.title}
                                onLoad={(e) => {
                                    const imgEl = e.target as HTMLImageElement;
                                    setImgNaturalDims({ width: imgEl.naturalWidth, height: imgEl.naturalHeight });
                                    setLoadedImageId(img.id);
                                }}
                                className={`absolute inset-0 w-full h-full transition-[opacity,transform] duration-200 ease-out ${isMainLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                                style={{ objectFit: 'contain' }}
                            />

                            {/* Generating skeleton + progress bar */}
                            {img.isGenerating && (
                                <GeneratingOverlay
                                    startTime={img.generationStartTime}
                                    duration={img.estimatedDuration || 23000}
                                />
                            )}

                            {/* EditorCanvas Overlay — absolute inset-0 always perfectly aligned */}
                            {!img.isGenerating && isMainLoaded && (
                                <div className="absolute inset-0 z-20">
                                    <EditorCanvas
                                        width={imgNaturalDims.width}
                                        height={imgNaturalDims.height}
                                        zoom={1}
                                        annotations={img.annotations || []}
                                        onChange={(anns) => actions.handleUpdateAnnotations(img.id, anns)}
                                        brushSize={state.brushSize}
                                        activeTab={state.sideSheetMode === 'brush' ? 'brush' : 'none'}
                                        maskTool={state.maskTool}
                                        activeShape={state.activeShape}
                                        isBrushResizing={state.isBrushResizing}
                                        isActive={state.sideSheetMode === 'brush'}
                                        activeAnnotationId={state.activeAnnotationId}
                                        onActiveAnnotationChange={actions.onActiveAnnotationChange}
                                        t={t}
                                    />
                                </div>
                            )}
                        </div>{/* closes sizing wrapper */}
                    </div>{/* closes image container */}

                    {/* Bottom Area: Fixed space so canvas never jumps */}
                    <div className={`${state.sideSheetMode === 'brush' ? 'h-16' : 'h-0'} md:h-16 shrink-0 relative z-30 w-full overflow-visible`}>
                        {/* Thumbnail Strip — desktop only */}
                        <div className={`absolute inset-0 hidden md:flex items-center px-6 overflow-x-auto no-scrollbar bg-white dark:bg-black border-t border-zinc-100 dark:border-zinc-900 transition-all duration-150 ease-in-out ${state.sideSheetMode !== 'brush' ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
                            {images.map(i => {
                                const isActive = selectedId === i.id;
                                const previewSrc = i.thumbSrc || i.src;
                                return (
                                    <button
                                        key={i.id}
                                        onClick={() => onSelectImage(i.id)}
                                        className={`h-9 w-9 shrink-0 rounded-[3px] mr-2 transition-all duration-150 overflow-hidden border border-zinc-100 dark:border-zinc-900 ${isActive ? 'ring-2 ring-orange-500 dark:ring-orange-400 ring-offset-2 ring-offset-white dark:ring-offset-black scale-110 z-10 opacity-100' : 'opacity-40 hover:opacity-100 scale-90'}`}
                                    >
                                        {previewSrc && <img src={previewSrc} className="w-full h-full object-cover" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Annotations Toolbar */}
                        <div className={`absolute bottom-6 left-0 right-0 z-50 flex flex-col items-center gap-3 transition-all duration-150 ease-in-out ${state.sideSheetMode === 'brush' ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
                            {/* Secondary Row: Contextual Sub-Menu */}
                            <div className="w-full flex justify-center pointer-events-none">
                                {subMenu === 'text' && (
                                    <div className="w-full flex items-center justify-center pointer-events-none animate-in slide-in-from-bottom-2 fade-in duration-200">
                                        <ObjectsTab
                                            t={t}
                                            currentLang={state.lang}
                                            library={state.fullLibrary}
                                            onAddUserCategory={actions.addUserCategory}
                                            onDeleteUserCategory={actions.deleteUserCategory}
                                            onAddUserItem={actions.addUserItem}
                                            onDeleteUserItem={actions.deleteUserItem}
                                            onAddText={handleAddText}
                                            onAddObject={(label, itemId, icon) => {
                                                handleAddObjectCenter(label, itemId, icon);
                                                actions.setMaskTool('select');
                                            }}
                                            scrollable={true}
                                            variant="horizontal"
                                        />
                                    </div>
                                )}

                                {subMenu === 'shapes' && (
                                    <div className={`bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/5 dark:border-white/5 ${Theme.Effects.Shadow} rounded-full px-2 py-1.5 pointer-events-auto flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200`}>
                                        <button
                                            onClick={() => {
                                                actions.setMaskTool('select');
                                                handleAddShape('rect');
                                            }}
                                            className="w-12 h-12 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all hover:text-zinc-900 dark:hover:text-zinc-100"
                                        >
                                            <Square className="w-5 h-5" />
                                        </button>

                                        <button
                                            onClick={() => {
                                                actions.setMaskTool('select');
                                                handleAddShape('circle');
                                            }}
                                            className="w-12 h-12 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all hover:text-zinc-900 dark:hover:text-zinc-100"
                                        >
                                            <Circle className="w-5 h-5" />
                                        </button>

                                        <button
                                            onClick={() => {
                                                actions.setMaskTool('select');
                                                handleAddShape('line');
                                            }}
                                            className="w-12 h-12 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all hover:text-zinc-900 dark:hover:text-zinc-100"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}

                                {subMenu === 'brush' && (
                                    <div className={`bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/5 dark:border-white/5 ${Theme.Effects.Shadow} rounded-full px-5 py-2 pointer-events-auto flex items-center gap-4 w-64 animate-in slide-in-from-bottom-2 fade-in duration-200`}>
                                        <span className="text-[11px] font-medium text-zinc-500 w-8">{state.brushSize}px</span>
                                        <input
                                            type="range"
                                            min="10" max="400"
                                            value={state.brushSize}
                                            onChange={(e) => actions.setBrushSize(Number(e.target.value))}
                                            onMouseDown={() => actions.setIsBrushResizing(true)}
                                            onMouseUp={() => actions.setIsBrushResizing(false)}
                                            className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500 relative"
                                        />
                                        <button
                                            onClick={() => actions.handleUpdateAnnotations(img.id, img.annotations?.filter((a: any) => a.type !== 'path') || [])}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Primary Row: 3 Tools + Done */}
                            <div className={`flex items-center gap-2 p-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/5 dark:border-white/5 ${Theme.Effects.Shadow} rounded-full pointer-events-auto overflow-hidden`}>
                                <button
                                    onClick={() => {
                                        setSubMenu('text');
                                        actions.setMaskTool('select');
                                        // Auto-add text if there's no selection? Let's rely on user clicking chips
                                    }}
                                    className={`w-[52px] h-[52px] flex flex-col items-center justify-center rounded-full transition-all gap-0.5 ${subMenu === 'text' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                                >
                                    <Type className="w-5 h-5" />
                                    <div className={`w-1 h-1 rounded-full bg-zinc-800 dark:bg-zinc-300 transition-opacity ${subMenu === 'text' ? 'opacity-100' : 'opacity-0'}`} />
                                </button>

                                <button
                                    onClick={() => {
                                        setSubMenu('shapes');
                                        actions.setMaskTool('select');
                                    }}
                                    className={`w-[52px] h-[52px] flex flex-col items-center justify-center rounded-full transition-all gap-0.5 ${subMenu === 'shapes' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                                >
                                    <Shapes className="w-5 h-5" />
                                    <div className={`w-1 h-1 rounded-full bg-zinc-800 dark:bg-zinc-300 transition-opacity ${subMenu === 'shapes' ? 'opacity-100' : 'opacity-0'}`} />
                                </button>

                                <button
                                    onClick={() => {
                                        setSubMenu('brush');
                                        actions.setMaskTool('brush');
                                    }}
                                    className={`w-[52px] h-[52px] flex flex-col items-center justify-center rounded-full transition-all gap-0.5 ${subMenu === 'brush' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                                >
                                    <Pen className="w-5 h-5" />
                                    <div className={`w-1 h-1 rounded-full bg-zinc-800 dark:bg-zinc-300 transition-opacity ${subMenu === 'brush' ? 'opacity-100' : 'opacity-0'}`} />
                                </button>

                                <div className="w-[1px] h-8 bg-zinc-200 dark:bg-zinc-800 mx-2" />

                                <Button
                                    onClick={() => actions.handleModeChange('prompt')}
                                    variant="primary-mono"
                                    size="l"
                                    className={`!h-[52px] !rounded-full ${Theme.Effects.ShadowSm} hover:${Theme.Effects.Shadow}`}
                                >
                                    {t('done') || 'Fertig'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Side Sheet — below image on mobile, side panel on desktop */}
                <aside
                    className={`flex flex-col relative md:overflow-hidden bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900 md:border-t-0 md:shrink-0 ${isSideSheetActuallyVisible ? 'md:border-l md:border-zinc-100 dark:md:border-zinc-900' : ''} ${isResizing ? 'select-none' : 'md:transition-[width] md:duration-300 md:ease-in-out'} ${!isSideSheetActuallyVisible && isMobile ? 'hidden' : ''}`}
                    style={{ width: isMobile ? undefined : (isSideSheetActuallyVisible ? `${sidebarWidth}px` : '0px') }}
                >
                    {/* Resizer Handle — desktop only */}
                    {!isMobile && (
                        <div
                            onMouseDown={startResizing}
                            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-black/5 dark:hover:bg-white/10 active:bg-blue-500/30 transition-colors z-50 group"
                        >
                            <div className="absolute inset-y-0 left-0 w-[1px] bg-transparent group-hover:bg-zinc-300 dark:group-hover:bg-zinc-700" />
                        </div>
                    )}

                    <SideSheet
                        width={isMobile ? '100%' : `${sidebarWidth}px`}
                        disableMobileSheet={isMobile}
                        selectedImage={state.selectedImage}
                        selectedImages={state.selectedImages}
                        sideSheetMode={state.sideSheetMode}
                        onModeChange={actions.handleModeChange}
                        brushSize={state.brushSize}
                        onBrushSizeChange={actions.setBrushSize}
                        maskTool={state.maskTool}
                        onMaskToolChange={actions.setMaskTool}
                        activeShape={state.activeShape}
                        onActiveShapeChange={actions.setActiveShape}
                        onBrushResizeStart={() => actions.setIsBrushResizing(true)}
                        onBrushResizeEnd={() => actions.setIsBrushResizing(false)}
                        onGenerate={(...args: Parameters<typeof actions.handleGenerate>) => { setIsSideSheetVisible(false); actions.handleGenerate(...args); }}
                        onUpdateAnnotations={actions.handleUpdateAnnotations}
                        onUpdatePrompt={actions.handleUpdatePrompt}
                        onUpdateVariables={actions.handleUpdateVariables}
                        onDeleteImage={actions.handleDeleteImage}
                        onDeselectAll={actions.deselectAll}
                        onGenerateMore={actions.handleGenerateMore}
                        onNavigateParent={actions.handleNavigateParent}
                        onDownload={actions.handleDownload}
                        isDragOver={state.isDragOver}
                        onGlobalDragLeave={() => actions.setIsDragOver(false)}
                        t={t}
                        lang={state.currentLang}
                        fullLibrary={state.fullLibrary}
                        onAddUserCategory={actions.addUserCategory}
                        onDeleteUserCategory={actions.deleteUserCategory}
                        onAddUserItem={actions.addUserItem}
                        onDeleteUserItem={actions.deleteUserItem}
                        qualityMode={state.qualityMode}
                        onQualityModeChange={actions.setQualityMode}
                        templates={state.templates || []}
                        onSaveTemplate={actions.saveTemplate}
                        onDeleteTemplate={actions.deleteTemplate}
                        onRefreshTemplates={actions.refreshTemplates}
                        onSaveRecentPrompt={actions.recordPresetUsage}
                        onUpdateImageTitle={actions.updateProfile}
                        userProfile={state.userProfile}
                    />
                </aside>
            </main >
        </div >
    );
};
