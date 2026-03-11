import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CanvasImage } from '@/types';
import { Loader2, Plus, Layers, Upload } from 'lucide-react';
import { SideSheet } from '@/components/sidesheet/SideSheet';
import { GlobalFooter } from '@/components/layout/GlobalFooter';
import { useMobile } from '@/hooks/useMobile';
import { useKeyboardGridNavigation } from '@/hooks/useKeyboardGridNavigation';
import { useItemDialog } from '@/components/ui/Dialog';
import { Theme, Typo, Button } from '@/components/ui/DesignSystem';
import { Logo } from '@/components/ui/Logo';

interface FeedPageProps {
    images: CanvasImage[];
    isLoading: boolean;
    hasMore: boolean;
    onSelectImage: (id: string) => void;
    onCreateNew: () => void;
    onUpload?: (files?: FileList) => void;
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
    const gridRef = React.useRef<HTMLDivElement>(null);
    const { confirm } = useItemDialog();

    // Drag & drop file upload
    const [isDropActive, setIsDropActive] = React.useState(false);
    const dragCounter = React.useRef(0);

    const handleDragEnter = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDropActive(true);
        }
    }, []);

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            setIsDropActive(false);
        }
    }, []);

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDropActive(false);

        const files = e.dataTransfer.files;
        if (files?.length && onUpload) {
            onUpload(files);
        }
    }, [onUpload]);

    // Dynamically calculate columns based on actual DOM layout
    const [columns, setColumns] = React.useState(2);
    React.useEffect(() => {
        const updateColumns = () => {
            if (!gridRef.current || !gridRef.current.children.length) return;
            const children = Array.from(gridRef.current.children) as HTMLElement[];
            if (children.length === 0) return;
            const firstTop = children[0].offsetTop;
            let colCount = 0;
            for (const child of children) {
                if (child.offsetTop === firstTop) {
                    colCount++;
                } else {
                    break;
                }
            }
            setColumns(colCount > 0 ? colCount : 2);
        };
        // Initial compute and resize listener
        requestAnimationFrame(updateColumns);
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, [images]); // Re-calculate when images load

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
                title: toDelete.length > 1 ? (state?.lang === 'de' ? 'Bilder löschen' : 'Delete images') : (state?.lang === 'de' ? 'Bild löschen' : 'Delete image'),
                description: state?.lang === 'de'
                    ? `Möchtest du wirklich ${toDelete.length} Bild(er) löschen?`
                    : `Do you really want to delete ${toDelete.length} image(s)?`,
                confirmLabel: state?.lang === 'de' ? 'LÖSCHEN' : 'DELETE',
                cancelLabel: state?.lang === 'de' ? 'ABBRECHEN' : 'CANCEL',
                variant: 'danger'
            });
            if (confirmed && actions?.handleDeleteImage) {
                toDelete.forEach(id => actions.handleDeleteImage(id, true));
                if (isSelectMode) actions?.setIsSelectMode?.(false);
            }
        }
    });


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

    const triggerUpload = () => document.getElementById('feed-upload-input')?.click();

    return (
        <div
            className="flex-1 flex overflow-hidden"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Shared hidden file input for all upload triggers */}
            <input
                type="file"
                id="feed-upload-input"
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => { if (e.target.files?.length) onUpload?.(e.target.files); e.target.value = ''; }}
            />
            <div className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-zinc-950 relative flex flex-col">
                {/* Drag & drop overlay */}
                {isDropActive && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <div className="absolute inset-0 bg-zinc-950/60" />
                        <div className={`relative flex flex-col items-center gap-3 px-10 py-8 ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusXl} ${Theme.Effects.ShadowLg}`}>
                            <Upload className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                            <p className={`${Typo.Body} text-sm text-zinc-600 dark:text-zinc-400`}>
                                {t?.('drop_files_here') || 'Dateien hier ablegen'}
                            </p>
                        </div>
                    </div>
                )}
                <div className="flex-1 flex flex-col">
                    {images.length > 0 ? (
                        <div ref={gridRef} className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-0 ${isMobile ? 'pb-32' : ''}`}>
                            {/* Upload Tile */}
                            <div
                                className="aspect-square cursor-pointer group bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors relative"
                                onClick={triggerUpload}
                            >
                                <Upload className="w-5 h-5 text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors" />
                            </div>

                            {images.map((img, idx) => {
                                const isSelected = selectedIds.includes(img.id);
                                const isKeyboardActive = activeIndex === idx;
                                const previewSrc = img.thumbSrc || img.src;
                                const isGen = !!img.isGenerating;

                                // Progress bar: how far through the estimated duration are we?
                                const elapsed = isGen ? Math.max(0, Date.now() - (img.generationStartTime || Date.now())) : 0;
                                const estimated = Math.max(1000, img.estimatedDuration || 30000);

                                return (
                                    <div
                                        key={img.id}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        onMouseLeave={() => setActiveIndex(null)}
                                        onClick={() => {
                                            if (isGen) return; // generating images are not clickable
                                            if (isSelectMode && onToggleSelect) onToggleSelect(img.id);
                                            else onSelectImage(img.id);
                                        }}
                                        className={`aspect-square ${isGen ? 'cursor-default' : 'cursor-pointer'} group relative overflow-hidden ${Theme.Colors.CanvasBg} dark:bg-zinc-950`}
                                    >
                                        {previewSrc ? (
                                            <img
                                                src={previewSrc}
                                                alt={img.title}
                                                className={`w-full h-full object-cover transition-all duration-300 ease-out ${
                                                    isGen
                                                        ? 'blur-sm scale-105 brightness-75'
                                                        : isSelectMode && isSelected
                                                            ? 'scale-[0.85]'
                                                            : isKeyboardActive
                                                                ? 'scale-105'
                                                                : 'group-hover:scale-105'
                                                }`}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                {isGen ? (
                                                    /* Shimmer for new generations without source image */
                                                    <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
                                                            style={{ animation: 'shimmer 1.8s ease-in-out infinite' }} />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800" />
                                                )}
                                            </div>
                                        )}

                                        {/* Generation overlay: progress bar at bottom */}
                                        {isGen && (
                                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-black/20 pointer-events-none">
                                                <div
                                                    className="h-full bg-orange-500"
                                                    style={{
                                                        animationName: 'gen-progress',
                                                        animationDuration: `${estimated}ms`,
                                                        animationDelay: `-${Math.min(elapsed, estimated * 0.92)}ms`,
                                                        animationTimingFunction: 'linear',
                                                        animationFillMode: 'both',
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Hover/select overlay – only when not generating */}
                                        {!isGen && (
                                            <div className={`absolute inset-0 transition-opacity pointer-events-none ${isSelectMode || isKeyboardActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                <div className={`absolute inset-0 transition-colors ${isKeyboardActive && !isSelectMode ? 'bg-black/15' : 'bg-black/0 group-hover:bg-black/15'}`} />
                                            </div>
                                        )}

                                        {/* Checkbox – hidden while generating */}
                                        {!isGen && (
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
                                                        <div className="w-full h-full rounded-full bg-white/25" />
                                                    )
                                                ) : (
                                                    <div className="w-full h-full rounded-full bg-white/25 cursor-pointer hover:bg-white/40 transition-colors" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : !isLoading && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-lg mx-auto text-center gap-12 animate-in fade-in zoom-in-95 duration-1000 min-h-full">
                            <div className="flex flex-col items-center gap-8">
                                <div className="space-y-4">
                                    <h1 className="text-3xl font-medium tracking-tight text-black dark:text-white">
                                        {t?.('welcome_title') || (state?.lang === 'de' ? 'Willkommen bei exposé' : 'Welcome to exposé')}
                                    </h1>
                                    <p className={`${Typo.Body} text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto text-sm`}>
                                        {t?.('welcome_empty_desc') || (state?.lang === 'de' ? 'Laden Sie Fotos zum Bearbeiten hoch oder generieren Sie etwas Neues.' : 'Upload photos to edit or generate something new.')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col w-full gap-4 max-w-[320px]">
                                <Button
                                    variant="primary-mono"
                                    size="l"
                                    onClick={triggerUpload}
                                    icon={<Upload className="w-5 h-5" />}
                                >
                                    {t?.('action_upload') || 'HOCHLADEN'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="l"
                                    onClick={onCreateNew}
                                    icon={<Plus className="w-5 h-5" />}
                                >
                                    {t?.('action_generate') || 'BILD GENERIEREN'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-auto">
                    <GlobalFooter t={t || ((key: string) => key)} />
                </div>
            </div>

            {/* Selection SideSheet */}
            {isSelectMode && !isMobile && (
                <div className={`w-[380px] shrink-0 border-l ${Theme.Colors.Border} ${Theme.Colors.CanvasBg} flex flex-col z-10 relative`}>
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
                                onGenerate={actions?.handleGenerate || (() => { })}
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
