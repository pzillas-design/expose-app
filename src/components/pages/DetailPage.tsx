import React, { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Info, Trash2, MoreHorizontal, Loader2, Type, Square, Circle, Minus, Pen, Trash, Check, Shapes } from 'lucide-react';
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

    // SideSheet Props (pass-through)
    state: any;
    actions: any;
    t: any;
}

export const DetailPage: React.FC<DetailPageProps> = ({
    images, selectedId, onBack, onSelectImage, onDelete, onDownload, onInfo, state, actions, t
}) => {
    const isMobile = useMobile();
    const [loadedImageId, setLoadedImageId] = useState<string | null>(null);
    const isMainLoaded = loadedImageId === selectedId;
    const [imageDims, setImageDims] = useState({ width: 0, height: 0 });
    const [subMenu, setSubMenu] = useState<'text' | 'shapes' | 'brush'>('brush');

    const img = images.find(i => i.id === selectedId);
    const idx = images.findIndex(i => i.id === selectedId);
    const { confirm } = useItemDialog();

    useEffect(() => {
        if (state.sideSheetMode === 'brush') {
            actions.setMaskTool(subMenu === 'brush' ? 'brush' : 'select');
        }
    }, [subMenu, state.sideSheetMode, actions]);

    const generateId = () => Math.random().toString(36).substring(2, 9);

    const handleAddObjectCenter = (label: string, itemId: string, icon?: string) => {
        if (!img) return;
        const cx = imageDims.width / 2 || img.width / 2;
        const cy = imageDims.height / 2 || img.height / 2;
        const newAnn: any = { id: generateId(), type: 'stamp', x: cx, y: cy, text: label, itemId, emoji: icon, color: '#fff', strokeWidth: 0, points: [], createdAt: Date.now() };
        actions.handleUpdateAnnotations(img.id, [...(img.annotations || []), newAnn]);
        actions.setMaskTool('select');
    };

    const handleAddText = () => {
        if (!img) return;
        const cx = imageDims.width / 2 || img.width / 2;
        const cy = imageDims.height / 2 || img.height / 2;
        const newText: any = { id: generateId(), type: 'stamp', x: cx, y: cy, text: '', color: '#fff', strokeWidth: 4, points: [], createdAt: Date.now() };
        actions.handleUpdateAnnotations(img.id, [...(img.annotations || []), newText]);
        actions.setMaskTool('select');
    };

    const handleAddShape = (shape: 'rect' | 'circle' | 'line') => {
        if (!img) return;
        const cx = imageDims.width / 2 || img.width / 2;
        const cy = imageDims.height / 2 || img.height / 2;
        const size = Math.min(imageDims.width || img.width, imageDims.height || img.height) * 0.3;
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
            const rect = imEl.getBoundingClientRect();
            setImageDims({ width: rect.width, height: rect.height });
        } else {
            setLoadedImageId(null);
            setImageDims({ width: 0, height: 0 });
        }

        // Fallback to ensure image doesn't stay blurry forever if onLoad never fires
        const fallbackTimer = setTimeout(() => {
            const el = document.getElementById(`detail-img-${selectedId}`) as HTMLImageElement;
            if (el && el.naturalWidth > 0) {
                setLoadedImageId(selectedId);
                setImageDims({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height });
            } else if (el) {
                setLoadedImageId(selectedId); // Force reveal
            }
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

    const startResizing = useCallback(() => setIsResizing(true), []);
    const stopResizing = useCallback(() => setIsResizing(false), []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= 300 && newWidth <= 600) setSidebarWidth(newWidth);
        }
    }, [isResizing]);

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

    /* Resize listener for canvas dimensions */
    useEffect(() => {
        const updateDims = () => {
            const imEl = document.getElementById(`detail-img-${selectedId}`);
            if (imEl) {
                const rect = imEl.getBoundingClientRect();
                setImageDims({ width: rect.width, height: rect.height });
            }
        };
        window.addEventListener('resize', updateDims);
        return () => window.removeEventListener('resize', updateDims);
    }, [selectedId]);

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

            <main className="flex-1 overflow-hidden flex">
                {/* Canvas Area */}
                <div className="flex-1 flex flex-col bg-white dark:bg-black relative overflow-hidden">
                    {/* Nav Arrows */}
                    {idx > 0 && (
                        <button onClick={() => onSelectImage(images[idx - 1].id)} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-white/40 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full flex items-center justify-center transition-all border border-zinc-200 dark:border-zinc-800/50 backdrop-blur-md ">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    {idx < images.length - 1 && (
                        <button onClick={() => onSelectImage(images[idx + 1].id)} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-white/40 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full flex items-center justify-center transition-all border border-zinc-200 dark:border-zinc-800/50 backdrop-blur-md ">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    )}

                    {/* Image Container with Progressive Loading */}
                    <div className="flex-1 flex items-center justify-center p-4 lg:p-12 relative min-h-0">
                        {/* Centered Wrapper for Image + Canvas */}
                        <div className="relative flex items-center justify-center max-w-full max-h-full" style={{ maxHeight: 'calc(100vh - 180px)' }}>

                            {/* Blurry Placeholder (Thumb) */}
                            {img.thumbSrc && !isMainLoaded && (
                                <img
                                    src={img.thumbSrc}
                                    className="absolute max-w-full max-h-full rounded-[2px] opacity-20 pointer-events-none"
                                    style={{ width: 'auto', height: 'auto', maxWidth: '90%', maxHeight: '90%' }}
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
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setImageDims({ width: rect.width, height: rect.height });
                                    setLoadedImageId(img.id);
                                }}
                                className={`max-w-full max-h-full object-contain rounded-[2px] border border-black/5 dark:border-white/5 transition-[opacity,transform] duration-200 ease-out ${isMainLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                                style={{
                                    width: 'auto',
                                    height: 'auto',
                                    maxWidth: '100%',
                                    maxHeight: 'calc(100vh - 180px)', // Account for header and strip
                                }}
                            />

                            {/* EditorCanvas Overlay */}
                            {!img.isGenerating && isMainLoaded && (
                                <div className="absolute inset-0 z-20" style={{ width: imageDims.width, height: imageDims.height, margin: 'auto' }}>
                                    <EditorCanvas
                                        width={imageDims.width}
                                        height={imageDims.height}
                                        zoom={1} // Detail view is 1x zoom (real css pixels)
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
                        </div>
                    </div>

                    {/* Bottom Area: Fixed space so canvas never jumps */}
                    <div className={`h-16 shrink-0 relative z-30 w-full overflow-visible transition-all duration-300 ${isMobile ? 'mb-[calc(10vh+12px)]' : 'mb-0'}`}>
                        {/* Thumbnail Strip */}
                        <div className={`absolute inset-0 flex items-center px-6 overflow-x-auto no-scrollbar bg-white dark:bg-black border-t border-zinc-100 dark:border-zinc-900 transition-all duration-150 ease-in-out ${state.sideSheetMode !== 'brush' ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
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

                {/* Desktop Side Sheet */}
                <aside
                    className={`hidden md:flex border-l border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950 flex-col shrink-0 relative ${isResizing ? 'select-none' : ''}`}
                    style={{ width: `${sidebarWidth}px` }}
                >
                    {/* Resizer Handle */}
                    <div
                        onMouseDown={startResizing}
                        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-black/5 dark:hover:bg-white/10 active:bg-blue-500/30 transition-colors z-50 group"
                    >
                        <div className="absolute inset-y-0 left-0 w-[1px] bg-transparent group-hover:bg-zinc-300 dark:group-hover:bg-zinc-700" />
                    </div>

                    <SideSheet
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
                        onGenerate={actions.handleGenerate}
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
