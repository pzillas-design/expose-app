import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CanvasImage } from '@/types';
import { Loader2, Plus, SquarePen, Layers, Upload } from 'lucide-react';
import { SideSheet } from '@/components/sidesheet/SideSheet';
import { GlobalFooter } from '@/components/layout/GlobalFooter';
import { useMobile } from '@/hooks/useMobile';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { useKeyboardGridNavigation } from '@/hooks/useKeyboardGridNavigation';
import { useItemDialog } from '@/components/ui/Dialog';

interface FeedPageProps {
    images: CanvasImage[];
    isLoading: boolean;
    hasMore: boolean;
    onSelectImage: (id: string) => void;
    onCreateNew: () => void;
    onUpload?: () => void;
    onLoadMore: () => void;
    isSelectMode?: boolean;
    selectedIds?: string[];
    onToggleSelect?: (id: string) => void;
    state?: any;
    actions?: any;
    t?: any;
}

export const FeedPage: React.FC<FeedPageProps> = ({ images, isLoading, hasMore, onSelectImage, onCreateNew, onUpload, onLoadMore, isSelectMode, selectedIds = [], onToggleSelect, state, actions, t }) => {
    const sentinelRef = React.useRef<HTMLDivElement>(null);
    const isMobile = useMobile();
    const [isCreateMenuOpen, setIsCreateMenuOpen] = React.useState(false);
    const createMenuRef = React.useRef<HTMLDivElement>(null);
    const gridRef = React.useRef<HTMLDivElement>(null);
    const { confirm } = useItemDialog();

    // Dynamically calculate columns based on CSS grid classes to feed into keyboard nav
    const [columns, setColumns] = React.useState(2);
    React.useEffect(() => {
        const updateColumns = () => {
            if (!gridRef.current) return;
            const gridCompStyle = window.getComputedStyle(gridRef.current);
            const colCount = gridCompStyle.getPropertyValue('grid-template-columns').split(' ').length;
            setColumns(colCount);
        };
        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    const { activeIndex, setActiveIndex } = useKeyboardGridNavigation({
        itemCount: images.length,
        columns,
        isActive: true, // Grid is always active on FeedPage unless a modal is open, we can refine this
        onEscape: () => {
            if (isSelectMode) {
                actions?.setIsSelectMode?.(false);
            }
        },
        onEnter: (idx) => {
            const img = images[idx];
            if (!img) return;
            if (isSelectMode && onToggleSelect) onToggleSelect(img.id);
            else onSelectImage(img.id);
        },
        onDelete: async (idx) => {
            const img = images[idx];
            if (!img) return;

            // If in select mode and multiple are selected, we might want to delete all selected.
            // For now, let's delete the actively focused one, or all selected if that one is selected
            const toDelete = isSelectMode && selectedIds.includes(img.id) ? selectedIds : [img.id];

            const confirmed = await confirm({
                title: 'Bild(er) löschen',
                description: `Möchtest du wirklich ${toDelete.length} Bild(er) löschen?`,
                confirmLabel: 'LÖSCHEN',
                cancelLabel: 'ABBRECHEN',
                variant: 'danger'
            });
            if (confirmed && actions?.handleDeleteImage) {
                toDelete.forEach(id => actions.handleDeleteImage(id));
                if (isSelectMode) actions?.setIsSelectMode?.(false);
            }
        }
    });

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
                setIsCreateMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    React.useEffect(() => {
        if (!hasMore || isLoading) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                onLoadMore();
            }
        }, { threshold: 0.1 });

        if (sentinelRef.current) {
            observer.observe(sentinelRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, isLoading, onLoadMore]);

    if (isLoading && images.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-black">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400 dark:text-zinc-800" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-black relative">
                <div ref={gridRef} className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-[1.5px] bg-zinc-100 dark:bg-black p-[1.5px] ${isMobile ? 'pb-32' : ''}`}>
                    {/* Create New Tile */}
                    <div
                        ref={createMenuRef}
                        className="aspect-square cursor-pointer overflow-hidden group bg-white dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors relative"
                        onClick={() => setIsCreateMenuOpen(p => !p)}
                    >
                        <Plus className="w-5 h-5 text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors" />

                        {isCreateMenuOpen && (
                            <div className="absolute bottom-4 left-4 z-50">
                                <DropdownMenu
                                    items={[
                                        { label: 'Generieren', icon: <SquarePen className="w-4 h-4" />, onClick: () => { setIsCreateMenuOpen(false); onCreateNew(); } },
                                        { label: 'Hochladen', icon: <Upload className="w-4 h-4" />, onClick: () => { setIsCreateMenuOpen(false); onUpload?.(); } },
                                    ]}
                                />
                            </div>
                        )}
                    </div>

                    {images.length > 0 ? images.map((img, idx) => {
                        const isSelected = selectedIds.includes(img.id);
                        const isKeyboardActive = activeIndex === idx;
                        const previewSrc = img.thumbSrc || img.src;

                        return (
                            <div
                                key={img.id}
                                onMouseEnter={() => setActiveIndex(idx)}
                                onClick={() => {
                                    if (isSelectMode && onToggleSelect) onToggleSelect(img.id);
                                    else onSelectImage(img.id);
                                }}
                                className={`aspect-square cursor-pointer overflow-hidden group relative bg-white dark:bg-zinc-950`}
                            >
                                {previewSrc ? (
                                    <img
                                        src={previewSrc}
                                        alt={img.title}
                                        className={`w-full h-full object-cover transition-transform duration-200 ease-out ${isSelectMode && isSelected ? 'scale-[0.85]' : (isKeyboardActive ? 'scale-105' : 'group-hover:scale-105')}`}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        {img.isGenerating ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-zinc-400 dark:text-zinc-700" />
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-800">Generating</span>
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800" />
                                        )}
                                    </div>
                                )}

                                {/* Overlay – purely visual, never eats clicks */}
                                <div className={`absolute inset-0 transition-opacity pointer-events-none ${isSelectMode || isKeyboardActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    {/* Subtle dark tint */}
                                    <div className={`absolute inset-0 transition-colors ${isKeyboardActive && !isSelectMode ? 'bg-black/15' : 'bg-black/0 group-hover:bg-black/15'}`} />
                                </div>

                                {/* Checkbox – outside overlay so it's always clickable */}
                                <div
                                    className={`absolute top-2 right-2 flex items-center justify-center w-5 h-5 transition-all z-20 ${!isSelectMode && !isKeyboardActive ? 'opacity-0 group-hover:opacity-100' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        if (!isSelectMode) {
                                            actions?.setIsSelectMode?.(true);
                                        }
                                        if (onToggleSelect) {
                                            onToggleSelect(img.id);
                                        }
                                    }}
                                >
                                    {isSelectMode ? (
                                        isSelected ? (
                                            <div className="w-full h-full rounded-full bg-orange-500 flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-black/10 border border-white/40" />
                                        )
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-black/20 border border-white/50 cursor-pointer hover:bg-black/30 transition-colors" />
                                    )}
                                </div>
                            </div>
                        )
                    }) : !isLoading && (
                        <div className="col-span-full h-96 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 gap-2">
                            <p className="text-sm font-medium">No images yet</p>
                            <p className="text-xs">Click "Create" to generate your first one.</p>
                        </div>
                    )}
                </div>

                {/* Pagination Sentinel */}
                {hasMore && (
                    <div ref={sentinelRef} className="h-20 flex items-center justify-center py-8">
                        {isLoading && <Loader2 className="w-6 h-6 animate-spin text-zinc-400 dark:text-zinc-800" />}
                    </div>
                )}

                {/* Footer at the end of the list */}
                {!hasMore && !isLoading && (
                    <div className="mt-8">
                        <GlobalFooter t={t || ((key: string) => key)} />
                    </div>
                )}
            </div>

            {/* Selection SideSheet */}
            {isSelectMode && !isMobile && (
                <div className="w-[380px] shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col z-10 relative">
                    {selectedIds.length > 0 ? (() => {
                        const selectedImages = images.filter(img => selectedIds.includes(img.id));
                        const selectedImage = selectedImages.length > 0 ? selectedImages[selectedImages.length - 1] : null;

                        return (
                            <SideSheet
                                selectedImage={selectedImage}
                                selectedImages={selectedImages}
                                sideSheetMode={state?.sideSheetMode || 'prompt'}
                                onModeChange={actions?.handleModeChange || (() => { })}
                                brushSize={state?.brushSize || 50}
                                onBrushSizeChange={actions?.setBrushSize || (() => { })}
                                onBrushResizeStart={() => actions?.setIsBrushResizing?.(true)}
                                onBrushResizeEnd={() => actions?.setIsBrushResizing?.(false)}
                                onGenerate={(Math.random as any)} /* multi-generate is handled elsewhere or suppressed for now */
                                onUpdateAnnotations={actions?.handleUpdateAnnotations || (() => { })}
                                onUpdatePrompt={actions?.handleUpdatePrompt || (() => { })}
                                onUpdateVariables={actions?.handleUpdateVariables || (() => { })}
                                onDeleteImage={actions?.handleDeleteImage || (() => { })}
                                onDeselectAll={actions?.deselectAll || (() => { })}
                                onGenerateMore={actions?.handleGenerateMore || (() => { })}
                                onNavigateParent={actions?.handleNavigateParent || (() => { })}
                                onDownload={actions?.handleDownload || (() => { })}
                                isDragOver={state?.isDragOver}
                                onGlobalDragLeave={() => actions?.setIsDragOver?.(false)}
                                t={t || ((key: string) => key)}
                                lang={state?.currentLang || 'en'}
                                fullLibrary={state?.fullLibrary || []}
                                onAddUserCategory={actions?.addUserCategory || (() => { })}
                                onDeleteUserCategory={actions?.deleteUserCategory || (() => { })}
                                onAddUserItem={actions?.addUserItem || (async () => { })}
                                onDeleteUserItem={actions?.deleteUserItem || (() => { })}
                                maskTool={state?.maskTool || 'brush'}
                                onMaskToolChange={actions?.setMaskTool || (() => { })}
                                activeShape={state?.activeShape || 'rect'}
                                onActiveShapeChange={actions?.setActiveShape || (() => { })}
                                onInteractionStart={() => actions?.setSnapEnabled?.(false)}
                                onInteractionEnd={() => actions?.setSnapEnabled?.(true)}
                                qualityMode={state?.qualityMode || 'fast'}
                                onQualityModeChange={actions?.setQualityMode || (() => { })}
                                templates={state?.templates || []}
                                onSaveTemplate={actions?.saveTemplate || (async () => { })}
                                onDeleteTemplate={actions?.deleteTemplate || (async () => { })}
                                userProfile={state?.userProfile}
                            />
                        );
                    })() : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 gap-3">
                            <Layers className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                            <p className="text-sm font-medium">
                                {state?.lang === 'de' ? 'Wählen Sie Bilder zum Bearbeiten aus' : 'Select images to edit'}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
