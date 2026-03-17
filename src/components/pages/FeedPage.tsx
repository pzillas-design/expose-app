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
    /** Current design style variant */
    galleryStyle?: 'square' | 'masonry' | 'edge' | 'masonry-sharp' | 'masonry-flat';
}

const FeedGridItem = memo<FeedGridItemProps>(({ img, idx, isSelected, isKeyboardActive, isSelectMode, onSelectImage, onToggleSelect, setActiveIndex, actions, parentSrc, groupCount = 1, hasGenerating = false, onOpenGroup, galleryStyle = 'square' }) => {
    const previewSrc = img.thumbSrc || img.src;
    const isGen = !!img.isGenerating;
    const isGroup = groupCount > 1;

    // Determine container classes based on style
    const containerClasses = useMemo(() => {
        const base = `relative isolate ${isGen ? 'cursor-default' : 'cursor-pointer'} group aspect-square flex items-center justify-center`;
        return base;
    }, [isGen]);

    const isCropStyle = galleryStyle === 'square' || galleryStyle === 'edge';

    // Compute average color once from thumbnail for masonry-flat stack card
    const [stackColor, setStackColor] = React.useState<string>('');
    React.useEffect(() => {
        if (!isGroup || isGen || galleryStyle !== 'masonry-flat' || !previewSrc) return;
        let cancelled = false;
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            if (cancelled) return;
            const canvas = document.createElement('canvas');
            canvas.width = 4; canvas.height = 4;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(image, 0, 0, 4, 4);
            const data = ctx.getImageData(0, 0, 4, 4).data; // 16 pixels
            let rSum = 0, gSum = 0, bSum = 0;
            for (let i = 0; i < data.length; i += 4) {
                rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2];
            }
            const n = data.length / 4;
            let r = rSum / n, g = gSum / n, b = bSum / n;
            // Desaturate ~40% toward gray so it works as a subtle background
            const gray = (r + g + b) / 3;
            r = Math.round(r * 0.6 + gray * 0.4);
            g = Math.round(g * 0.6 + gray * 0.4);
            b = Math.round(b * 0.6 + gray * 0.4);
            setStackColor(`rgb(${r},${g},${b})`);
        };
        image.onerror = () => {};
        image.src = previewSrc;
        return () => { cancelled = true; };
    }, [isGroup, isGen, galleryStyle, previewSrc]);

    // Calculate precise bounds for aspect ratio images inside the square container
    const isWide = img.width > img.height;
    const boundedStyle = isCropStyle ? { width: '100%', height: '100%' } : {
        aspectRatio: `${img.width} / ${img.height}`,
        width: isWide ? '100%' : 'auto',
        height: isWide ? 'auto' : '100%',
        maxHeight: '100%',
        maxWidth: '100%'
    };

    return (
        <div
            onPointerEnter={(e) => { if (e.pointerType !== 'touch') setActiveIndex(idx); }}
            onPointerLeave={(e) => { if (e.pointerType !== 'touch') setActiveIndex(null); }}
            onClick={() => {
                if (isGen) return;
                if (onOpenGroup) { onOpenGroup(); return; }
                if (isSelectMode && onToggleSelect) onToggleSelect(img.id);
                else onSelectImage(img.id);
            }}
            className={containerClasses}
        >
            {/* Wrapper for the image bounding box */}
            <div className="relative isolate" style={boundedStyle}>

                {/* 1. STACKS (attached to the bounded image dimensions) */}
                {isGroup && !isGen && galleryStyle !== 'edge' && galleryStyle !== 'masonry' && galleryStyle !== 'masonry-sharp' && galleryStyle !== 'masonry-flat' && (
                    <>
                        {groupCount > 2 && <div className={`absolute inset-x-2 -bottom-2 h-full bg-zinc-300 dark:bg-zinc-600 -z-20 ${galleryStyle === 'square' ? 'rounded-xl' : ''}`} />}
                        <div className={`absolute inset-x-1 -bottom-1 h-full bg-zinc-200 dark:bg-zinc-700 -z-10 ${galleryStyle === 'square' ? 'rounded-xl' : ''}`} />
                    </>
                )}

                {/* Soft Masonry stack */}
                {isGroup && !isGen && galleryStyle === 'masonry' && (
                    <>
                        {groupCount > 2 && <div className="absolute inset-0 transform translate-x-2 translate-y-2 rounded-xl bg-zinc-300 dark:bg-zinc-600 -z-20 shadow-sm" />}
                        <div className="absolute inset-0 transform translate-x-1 translate-y-1 rounded-xl bg-zinc-200 dark:bg-zinc-700 -z-10 shadow-sm" />
                    </>
                )}

                {/* Sharp Stack clues for new aspect ratio designs */}
                {isGroup && !isGen && galleryStyle === 'masonry-sharp' && (
                    <>
                        {groupCount > 2 && (
                            <div className="absolute inset-0 transform translate-x-3 translate-y-3 ring-1 ring-black/10 dark:ring-white/10 -z-20 bg-zinc-900 overflow-hidden shadow-sm">
                                {previewSrc && <img src={previewSrc} className="w-full h-full object-cover blur-[5px] opacity-40 mix-blend-screen dark:mix-blend-normal" alt="" />}
                            </div>
                        )}
                        <div className="absolute inset-0 transform translate-x-1.5 translate-y-1.5 ring-1 ring-black/10 dark:ring-white/10 -z-10 bg-zinc-800 overflow-hidden shadow-sm">
                            {previewSrc && <img src={previewSrc} className="w-full h-full object-cover blur-[2px] opacity-60 mix-blend-screen dark:mix-blend-normal" alt="" />}
                        </div>
                    </>
                )}

                {/* Modern Flat solid deep overlap stacks — bottom center like square style */}
                {isGroup && !isGen && galleryStyle === 'masonry-flat' && (
                    <>
                        {groupCount > 2 && <div className="absolute inset-x-[10px] -bottom-[15px] h-full -z-20 shadow-sm ring-1 ring-black/8 dark:ring-white/15 bg-zinc-400 dark:bg-zinc-700 scale-[0.93]" style={stackColor ? { backgroundColor: stackColor, opacity: 0.55 } : undefined} />}
                        <div className="absolute inset-x-[5px] -bottom-[8px] h-full -z-10 shadow-sm ring-1 ring-black/8 dark:ring-white/15 bg-zinc-300 dark:bg-zinc-600 scale-[0.96]" style={stackColor ? { backgroundColor: stackColor } : undefined} />
                    </>
                )}

                {/* 2. MAIN CARD */}
                <div
                    className={`absolute inset-0 overflow-hidden ${(galleryStyle === 'square' || galleryStyle === 'masonry') ? 'rounded-xl' : ''} ${isGen ? 'bg-zinc-100 dark:bg-zinc-900' : 'bg-white dark:bg-black group-hover:bg-zinc-50 dark:group-hover:bg-zinc-950 transition-colors'} ${(galleryStyle === 'masonry-sharp' || galleryStyle === 'masonry-flat') ? 'ring-1 ring-black/5 dark:ring-white/10' : ''}`}
                >

                    {isGen ? (
                        <>
                            {parentSrc ? (
                                <div className="absolute inset-0">
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
                        <div className="absolute inset-0 flex items-center justify-center">
                            <img
                                src={previewSrc}
                                alt={img.title}
                                className={`w-full h-full object-cover transition-opacity duration-200 ${isSelectMode && isSelected ? 'opacity-60' : ''}`}
                                loading="lazy"
                            />
                        </div>
                    ) : null}

                    {/* Hover scrim */}
                    {!isGen && (
                        <div className={`absolute inset-0 pointer-events-none transition-colors duration-100 ${isKeyboardActive ? 'bg-black/8' : 'bg-black/0 group-hover:bg-black/4'}`} />
                    )}

                    {/* Selection circle */}
                    {!isGen && (
                        <div
                            className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-20 transition-all duration-200 ${isSelected
                                ? 'opacity-100 scale-100 bg-gradient-to-br from-orange-400 to-red-500 shadow-md'
                                : isSelectMode
                                    ? 'opacity-100 scale-100 border-[1.5px] border-zinc-300 dark:border-zinc-600 bg-white/90 dark:bg-zinc-800/90'
                                    : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 border-[1.5px] border-zinc-300 dark:border-zinc-600 bg-white/90'
                                }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (!isSelectMode) actions?.setIsSelectMode?.(true);
                                if (onToggleSelect) onToggleSelect(img.id);
                            }}
                        >
                            {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    )}

                    {/* Group count badge — circle if single digit, pill if 2+ */}
                    {isGroup && !isGen && (
                        <div className={`absolute bottom-2 right-2 z-10 flex items-center justify-center gap-1 bg-zinc-100/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium pointer-events-none leading-none shadow-sm backdrop-blur-sm ${groupCount < 10 && !hasGenerating ? 'w-5 h-5 rounded-full' : 'rounded-full px-2 py-[3px]'}`}>
                            {hasGenerating && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />}
                            {groupCount}
                        </div>
                    )}
                </div>
            </div>
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

    // UI toggle for 5 design variants
    const [galleryStyle, setGalleryStyle] = React.useState<'square' | 'masonry' | 'edge' | 'masonry-sharp' | 'masonry-flat'>('masonry-flat');

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
    const imageIdMap = useMemo(() => new Map(images.map(i => [i.id, i])), [images]);

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
                    <div className="flex-1 flex flex-col relative pb-16">
                        {images.length > 0 ? (
                            <>

                                <div ref={gridRef} className={`
                            ${galleryStyle === 'edge'
                                        ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-[1px] px-0'
                                        : galleryStyle === 'masonry-flat'
                                            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 px-4 sm:px-8 mt-4 sm:mt-6'
                                            : 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-6 px-2 sm:px-6 mt-4 sm:mt-6'
                                    }
                            bg-transparent transition-all ${isMobile ? 'pb-[max(9rem,calc(9rem+env(safe-area-inset-bottom)))]' : ''}
                        `}>
                                    {/* Plus tile — matches main card style */}
                                    {!expandedGroupId && (
                                        <div
                                            className={`aspect-square relative cursor-pointer group flex items-center justify-center transition-colors duration-150 ${(galleryStyle === 'square' || galleryStyle === 'masonry') ? 'rounded-xl' : ''} ${(galleryStyle !== 'square' && galleryStyle !== 'edge') ? 'ring-1 ring-black/5 dark:ring-white/10 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800' : 'bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                                            onClick={onCreateNew}
                                        >
                                            <Plus className="w-5 h-5 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-500 transition-colors" />
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
                                                galleryStyle={galleryStyle}
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

                        {/* Small dropdown toggle under the grid */}
                        {images.length > 0 && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto shadow-md rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                <select
                                    value={galleryStyle}
                                    onChange={(e) => setGalleryStyle(e.target.value as any)}
                                    className="appearance-none bg-transparent outline-none cursor-pointer py-1.5 pl-4 pr-8 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 text-center uppercase tracking-wider"
                                    style={{ WebkitAppearance: 'none' }}
                                >
                                    <option value="square">Modern Grid</option>
                                    <option value="edge">Edge-to-Edge</option>
                                    <option value="masonry">Layout Soft</option>
                                    <option value="masonry-sharp">Layout Sharp</option>
                                    <option value="masonry-flat">Modern Flat</option>
                                </select>
                                <div className="absolute right-3 top-[50%] -translate-y-[50%] pointer-events-none">
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        )}

                    </div>
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
