import React, { memo, useMemo, useCallback } from 'react';
import { CanvasImage, ImageRow } from '@/types';
import { Loader2, Plus, Layers, Upload, Download, X } from 'lucide-react';
import { SideSheet } from '@/components/sidesheet/SideSheet';
import { GlobalFooter } from '@/components/layout/GlobalFooter';
import { useMobile } from '@/hooks/useMobile';
import { useKeyboardGridNavigation } from '@/hooks/useKeyboardGridNavigation';
import { useItemDialog } from '@/components/ui/Dialog';
import { Theme, Typo, Button } from '@/components/ui/DesignSystem';
import { BlobBackground } from '@/components/ui/BlobBackground';
import { GenerationProgressBar } from '@/components/canvas/ImageItem';

/* ── Memoised grid item ── */
interface FeedGridItemProps {
    img: CanvasImage;
    idx: number;
    isSelected: boolean;
    isKeyboardActive: boolean;
    isSelectMode: boolean;
    onSelectImage: (id: string) => void;
    onToggleSelect?: (id: string) => void;
    setActiveIndex: (idx: number | null) => void;
    actions?: any;
    /** Thumbnail/src of the parent image, used as blurred background when generating a variation */
    parentSrc?: string;
    /** Number of images in this group (≥2 triggers stack visual + badge) */
    groupCount?: number;
    /** Whether any image in this group is currently generating */
    hasGenerating?: boolean;
    /** Called when user clicks a group cover tile — opens the group drill-down */
    onOpenGroup?: () => void;
}

const FeedGridItem = memo<FeedGridItemProps>(({ img, idx, isSelected, isKeyboardActive, isSelectMode, onSelectImage, onToggleSelect, setActiveIndex, actions, parentSrc, groupCount = 1, hasGenerating = false, onOpenGroup }) => {
    const previewSrc = img.thumbSrc || img.src;
    const isGen = !!img.isGenerating;
    const isGroup = groupCount > 1;

    return (
        <div
            key={img.id}
            onPointerEnter={(e) => { if (e.pointerType !== 'touch') setActiveIndex(idx); }}
            onPointerLeave={(e) => { if (e.pointerType !== 'touch') setActiveIndex(null); }}
            onClick={() => {
                if (isGen) return;
                if (onOpenGroup) { onOpenGroup(); return; }
                if (isSelectMode && onToggleSelect) onToggleSelect(img.id);
                else onSelectImage(img.id);
            }}
            className={`aspect-square ${isGen ? 'cursor-default' : 'cursor-pointer'} group relative`}
        >
            {/* Stack cards — outside the overflow-hidden content div so they peek into the gap */}
            {isGroup && !isGen && (
                <>
                    <div className="absolute inset-0 bg-zinc-300 dark:bg-zinc-600 transform rotate-[3deg] scale-[0.96]" />
                    <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-700 transform rotate-[1.5deg] scale-[0.98]" />
                </>
            )}
            {/* Content wrapper — clips image but lets stack cards peek out */}
            <div className={`absolute inset-0 overflow-hidden ${isGen ? 'bg-zinc-100 dark:bg-zinc-900' : `${Theme.Colors.CanvasBg} dark:bg-zinc-950`}`}>
            {isGen ? (
                <>
                    {parentSrc ? (
                        /* Variation of a source image — show source blurred as background */
                        <div className="absolute inset-0 overflow-hidden">
                            <img src={parentSrc} className="w-full h-full object-cover scale-110 blur-xl brightness-75" alt="" />
                        </div>
                    ) : (
                        <BlobBackground orbScale={0.77} speedScale={3.5} />
                    )}
                    <GenerationProgressBar
                        startTime={img.generationStartTime}
                        estimatedDuration={img.estimatedDuration}
                    />
                </>
            ) : previewSrc ? (
                <img
                    src={previewSrc}
                    alt={img.title}
                    className={`w-full h-full object-cover transition-all duration-150 ease-out ${
                        isSelectMode && isSelected
                            ? 'opacity-75'
                            : isKeyboardActive
                                ? 'brightness-110 scale-105'
                                : 'group-hover:scale-105'
                    }`}
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800" />
                </div>
            )}

            {!isGen && (
                <div className={`absolute inset-0 transition-opacity pointer-events-none ${isSelectMode || isKeyboardActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div className={`absolute inset-0 transition-colors ${isKeyboardActive && !isSelectMode ? 'bg-black/15' : 'bg-black/0 group-hover:bg-black/15'}`} />
                </div>
            )}

            {!isGen && (
                <div
                    className={`absolute top-2 left-2 flex items-center justify-center w-5 h-5 transition-all z-20 ${isSelected ? '' : 'opacity-0 group-hover:opacity-100'}`}
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
                            <div className="w-full h-full rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                        ) : (
                            <div className="w-full h-full rounded-full bg-white/50" />
                        )
                    ) : (
                        <div className="w-full h-full rounded-full bg-white/50 cursor-pointer hover:bg-white/70 transition-colors" />
                    )}
                </div>
            )}

            {/* Group count badge — bottom-right */}
            {isGroup && !isGen && (
                <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-md px-1.5 py-0.5 pointer-events-none">
                    {hasGenerating && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />}
                    {groupCount}
                </div>
            )}
            </div>{/* end content wrapper */}
        </div>
    );
});
FeedGridItem.displayName = 'FeedGridItem';

interface FeedPageProps {
    images: CanvasImage[];
    rows: ImageRow[];
    isLoading: boolean;
    hasMore: boolean;
    onSelectImage: (id: string) => void;
    onCreateNew: () => void;
    onGenerate?: () => void;
    onUpload?: (files?: FileList) => void;
    onLoadMore: () => void;
    isSelectMode?: boolean;
    isSelectionSideSheetOpen?: boolean;
    selectedIds?: string[];
    onToggleSelect?: (id: string) => void;
    state?: any;
    actions?: any;
    t?: any;
    expandedGroupId: string | null;
    onExpandedGroupChange: (id: string | null) => void;
}

export const FeedPage: React.FC<FeedPageProps> = ({ images, rows, isLoading, hasMore, onSelectImage, onCreateNew, onGenerate, onUpload, onLoadMore, isSelectMode, isSelectionSideSheetOpen, selectedIds = [], onToggleSelect, expandedGroupId, onExpandedGroupChange, state, actions, t }) => {
    const sentinelRef = React.useRef<HTMLDivElement>(null);
    const isMobile = useMobile();
    const gridRef = React.useRef<HTMLDivElement>(null);
    const { confirm } = useItemDialog();

    // Map: cover image id → row (for quick group lookup)
    const groupCountMap = useMemo(() => {
        const map = new Map<string, number>();
        rows.forEach(r => { if (r.items[0]) map.set(r.items[0].id, r.items.length); });
        return map;
    }, [rows]);

    const groupRowMap = useMemo(() => {
        const map = new Map<string, ImageRow>();
        rows.forEach(r => { if (r.items[0]) map.set(r.items[0].id, r); });
        return map;
    }, [rows]);

    // What to render: level 1 = one cover per group, level 2 = all items of expanded group
    const displayImages = useMemo(() => {
        if (expandedGroupId) {
            return rows.find(r => r.id === expandedGroupId)?.items || [];
        }
        // Level 1: first item of each row as the cover
        return rows.map(r => r.items[0]).filter(Boolean) as CanvasImage[];
    }, [expandedGroupId, rows]);

    // O(1) lookups instead of O(n) per item
    const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const imageIdMap    = useMemo(() => new Map(images.map(i => [i.id, i])), [images]);

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
    }, [displayImages]); // Re-calculate when displayed images change

    const { activeIndex, setActiveIndex } = useKeyboardGridNavigation({
        itemCount: displayImages.length,
        columns,
        isActive: true,
        onEscape: () => {
            if (expandedGroupId) { onExpandedGroupChange(null); return; }
            if (isSelectMode) actions?.setIsSelectMode?.(false);
        },
        onEnter: (idx) => {
            const img = displayImages[idx];
            if (!img) return;
            const gc = expandedGroupId ? 1 : (groupCountMap.get(img.id) ?? 1);
            const row = expandedGroupId ? null : groupRowMap.get(img.id);
            if (gc > 1 && row) { onExpandedGroupChange(row.id); return; }
            if (isSelectMode && onToggleSelect) onToggleSelect(img.id);
            else onSelectImage(img.id);
        },
        onDelete: async (idx) => {
            const img = displayImages[idx];
            if (!img) return;

            // If in select mode and multiple are selected, we might want to delete all selected.
            // For now, let's delete the actively focused one, or all selected if that one is selected
            const toDelete = isSelectMode && selectedIdSet.has(img.id) ? selectedIds : [img.id];

            const confirmed = await confirm({
                title: toDelete.length > 1 ? (t?.('delete_confirm_multi') || 'Delete images') : (t?.('delete_confirm_single') || 'Delete image'),
                description: toDelete.length > 1 ? (t?.('delete_confirm_multi') || `Do you really want to delete ${toDelete.length} image(s)?`) : (t?.('delete_confirm_single') || `Do you really want to delete ${toDelete.length} image(s)?`),
                confirmLabel: (t?.('delete') || 'DELETE').toUpperCase(),
                cancelLabel: (t?.('cancel') || 'CANCEL').toUpperCase(),
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
                                {t?.('drop_files_here') || 'Drop files here'}
                            </p>
                        </div>
                    </div>
                )}
                <div className="flex-1 flex flex-col">
                    {images.length > 0 ? (
                        <>

                        <div ref={gridRef} className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-1 overflow-hidden bg-white dark:bg-zinc-950 ${isMobile ? 'pb-32 pb-[max(8rem,calc(8rem+env(safe-area-inset-bottom)))]' : ''}`}>
                            {/* Create Tile — only on level 1 */}
                            {!expandedGroupId && (
                                <div
                                    className="aspect-square cursor-pointer group bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors relative"
                                    onClick={onCreateNew}
                                >
                                    <Plus className="w-5 h-5 text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors" />
                                </div>
                            )}

                            {displayImages.map((img, idx) => {
                                const gc = expandedGroupId ? 1 : (groupCountMap.get(img.id) ?? 1);
                                const row = expandedGroupId ? null : groupRowMap.get(img.id);
                                const hasGen = row?.items.some(i => i.isGenerating) ?? false;
                                const parentImg = img.parentId ? imageIdMap.get(img.parentId) : undefined;
                                const parentSrc = parentImg ? (parentImg.thumbSrc || parentImg.src) : undefined;
                                return (
                                <FeedGridItem
                                    key={img.id}
                                    img={img}
                                    idx={idx}
                                    isSelected={selectedIdSet.has(img.id)}
                                    isKeyboardActive={activeIndex === idx}
                                    isSelectMode={!!isSelectMode}
                                    onSelectImage={onSelectImage}
                                    onToggleSelect={onToggleSelect}
                                    setActiveIndex={setActiveIndex}
                                    actions={actions}
                                    parentSrc={parentSrc}
                                    groupCount={gc}
                                    hasGenerating={hasGen}
                                    onOpenGroup={gc > 1 && row ? () => onExpandedGroupChange(row.id) : undefined}
                                />
                                );
                            })}
                        </div>
                        </>
                    ) : !isLoading && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-lg mx-auto text-center gap-12 animate-in fade-in zoom-in-95 duration-1000 min-h-full">
                            <div className="flex flex-col items-center gap-8">
                                <div className="space-y-4">
                                    <h1 className="text-3xl font-medium tracking-tight text-black dark:text-white">
                                        {t?.('welcome_title') || 'Welcome to exposé'}
                                    </h1>
                                    <p className={`${Typo.Body} text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto text-sm`}>
                                        {t?.('welcome_empty_desc') || 'Upload photos to edit or generate something new.'}
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
                                    {t?.('action_upload') || 'Upload'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="l"
                                    onClick={onGenerate ?? onCreateNew}
                                    icon={<Plus className="w-5 h-5" />}
                                >
                                    {t?.('action_generate') || 'Generate image'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-auto">
                    <GlobalFooter t={t || ((key: string) => key)} />
                </div>
            </div>

            {/* Mobile selection action bar */}
            {isSelectMode && isMobile && selectedIds.length > 0 && (
                <div className={`fixed bottom-[max(5rem,calc(5rem+env(safe-area-inset-bottom)))] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} rounded-full shadow-xl backdrop-blur-md`}>
                    <button
                        onClick={() => actions?.handleDownload?.(selectedIds)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black dark:text-white"
                    >
                        <Download className="w-4 h-4" />
                        {selectedIds.length > 1 ? (t?.('n_download') || 'Download {{n}}').replace('{{n}}', String(selectedIds.length)) : (t?.('nav_download') || 'Download')}
                    </button>
                    <div className={`w-px h-5 ${Theme.Colors.Border} bg-current opacity-20`} />
                    <button
                        onClick={() => actions?.setIsSelectMode?.(false)}
                        className="flex items-center justify-center w-8 h-8 text-zinc-500 dark:text-zinc-400"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Selection SideSheet */}
            {isSelectMode && !isMobile && isSelectionSideSheetOpen && (
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
                                {t?.('select_images_to_edit') || 'Select images to edit'}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
