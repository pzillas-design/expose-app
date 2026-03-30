import React, { memo, useMemo, useCallback } from 'react';
import { CanvasImage, ImageRow } from '@/types';
import { Loader2, Plus, Layers, Upload, Download, X, ImagePlus } from 'lucide-react';
import { SideSheet } from '@/components/sidesheet/SideSheet';
import { GlobalFooter } from '@/components/layout/GlobalFooter';
import { useMobile } from '@/hooks/useMobile';
import { useKeyboardGridNavigation } from '@/hooks/useKeyboardGridNavigation';
import { useItemDialog } from '@/components/ui/Dialog';
import { Theme, Typo, Button, Tooltip } from '@/components/ui/DesignSystem';
import { BlobBackground } from '@/components/ui/BlobBackground';
import { GenerationProgressBar } from '@/components/canvas/ImageItem';
import { FeedHeroSection } from '../layout/FeedHeroSection';

/* ── TTL helpers ── */
const TTL_DAYS = 30;
const WARNING_DAYS = 7;

function getDaysRemaining(createdAt: string | number | undefined): number | null {
    if (!createdAt) return null;
    const created = typeof createdAt === 'number' ? createdAt : new Date(createdAt).getTime();
    const expiresAt = created + TTL_DAYS * 24 * 60 * 60 * 1000;
    return Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
}

/* ── Memoised grid item ── */
interface FeedGridItemProps {
    img: CanvasImage;
    idx: number;
    isSelected: boolean;
    isKeyboardActive: boolean;
    isSelectMode: boolean;
    onSelectImage: (id: string) => void;
    onToggleSelect?: (id: string, isRange?: boolean) => void;
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
    /** Staggered fade-in delay in ms (for group open animation) */
    staggerDelay?: number;
    /** Whether this item was the last one viewed in detail — plays zoom-out return animation */
    isLastViewed?: boolean;
    /** Generated image not yet opened by user */
    isNew?: boolean;
    /** Days remaining before auto-deletion (≤7 shows yellow warning dot) */
    daysRemaining?: number | null;
    /** Current UI language for tooltip text */
    currentLang?: 'de' | 'en';
}

const FeedGridItem = memo<FeedGridItemProps>(({ img, idx, isSelected, isKeyboardActive, isSelectMode, onSelectImage, onToggleSelect, setActiveIndex, actions, parentSrc, groupCount = 1, hasGenerating = false, onOpenGroup, staggerDelay, isLastViewed, isNew, daysRemaining, currentLang = 'en' }) => {
    const isMobile = useMobile();
    const previewSrc = img.thumbSrc || img.src;
    const isGen = !!img.isGenerating;
    const isGroup = groupCount > 1;

    const isWide = img.width > img.height;
    const boundedStyle = {
        aspectRatio: `${img.width} / ${img.height}`,
        width: isWide ? '100%' : 'auto',
        height: isWide ? 'auto' : '100%',
        maxHeight: '100%',
        maxWidth: '100%',
    };

    return (
        <div
            onPointerEnter={(e) => { if (e.pointerType !== 'touch') setActiveIndex(idx); }}
            onPointerLeave={(e) => { if (e.pointerType !== 'touch') setActiveIndex(null); }}
            data-image-id={img.id}
            className={`relative isolate group aspect-square flex items-center justify-center`}
            style={isLastViewed
                ? {
                    // Set the 'from' keyframe values as inline style so the very first paint
                    // already shows the zoomed-in state — avoids the brief normal-size flash
                    // that occurs before the CSS animation engine kicks in.
                    transform: 'scale(1.1)',
                    opacity: 0.6,
                    animation: 'feed-zoom-return 400ms cubic-bezier(0.25,1,0.5,1) both',
                }
                : staggerDelay !== undefined
                    ? { animation: `feed-fade-in 280ms ${staggerDelay}ms both ease-out` }
                    : undefined}
        >
            {/* Wrapper for the image bounding box */}
            <div
                className="relative isolate cursor-pointer transition-transform duration-100 active:scale-[1.03]"
                style={boundedStyle}
                onClick={(e) => {
                    if (onOpenGroup) { onOpenGroup(); return; }
                    if (isSelectMode && onToggleSelect) onToggleSelect(img.id, e.shiftKey);
                    else onSelectImage(img.id);
                }}
            >

                {/* Stack cards — bottom center, spread on hover */}
                {isGroup && (
                    <>
                        {groupCount > 2 && (
                            <div
                                className="absolute h-full -z-20 bg-zinc-200 dark:bg-zinc-700"
                                style={{
                                    left: '10px', right: '10px',
                                    bottom: isKeyboardActive ? '-28px' : '-20px',
                                    transform: 'scaleX(0.93)',
                                    transition: 'bottom 240ms cubic-bezier(0.25,1,0.5,1)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                }}
                            />
                        )}
                        <div
                            className="absolute h-full -z-10 bg-zinc-300 dark:bg-zinc-600"
                            style={{
                                left: '5px', right: '5px',
                                bottom: isKeyboardActive ? '-16px' : '-11px',
                                transform: 'scaleX(0.96)',
                                transition: 'bottom 240ms cubic-bezier(0.25,1,0.5,1)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}
                        />
                    </>
                )}

                {/* Main card */}
                <div className={`absolute inset-0 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 ${isGen ? 'bg-zinc-100 dark:bg-zinc-900' : 'bg-white dark:bg-black group-hover:bg-zinc-50 dark:group-hover:bg-black transition-colors'}`}>

                    {isGen ? (
                        <>
                            {parentSrc ? (
                                <div className="absolute inset-0">
                                    <img src={parentSrc} className="w-full h-full object-cover scale-110 blur-xl brightness-75" alt="" />
                                </div>
                            ) : (
                                <BlobBackground />
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

                    {/* Hover scrim — desktop only; on touch, hover CSS causes iOS to require two taps */}
                    {!isGen && !isMobile && (
                        <div className={`absolute inset-0 pointer-events-none transition-colors duration-150 ${isKeyboardActive ? 'bg-black/[0.12]' : 'bg-black/0 group-hover:bg-black/[0.09]'}`} />
                    )}

                    {/* Selection circle — group-hover only on desktop to avoid iOS two-tap issue */}
                    {!isGen && (
                        <div
                            className={`absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center z-20 transition-all duration-200 ${isSelectMode && isSelected
                                ? 'opacity-100 scale-100 hover:scale-110 hover:opacity-100 bg-gradient-to-br from-orange-400 to-red-500 shadow-md'
                                : isSelectMode
                                    ? 'opacity-100 scale-100 hover:scale-110 hover:opacity-100 bg-white/90 dark:bg-zinc-800/90'
                                    : isKeyboardActive
                                        ? 'opacity-100 scale-100 hover:scale-110 hover:opacity-100 bg-white/90 dark:bg-zinc-800/90'
                                        : isMobile
                                            ? 'opacity-0 scale-75'
                                            : 'opacity-0 scale-75 group-hover:opacity-80 group-hover:scale-100 hover:!opacity-100 hover:!scale-110 bg-white/90 dark:bg-zinc-800/90'
                                }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (!isSelectMode) actions?.setIsSelectMode?.(true);
                                if (onToggleSelect) onToggleSelect(img.id, e.shiftKey);
                            }}
                        >
                            {isSelectMode && isSelected && (
                                <svg className="w-2.5 h-2.5 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    )}

                    {/* Group count badge — hidden for now (A/B test without counter) */}
                    {/* {isGroup && !isGen && (
                        <div className={`absolute bottom-2 right-2 z-10 flex items-center justify-center gap-1 bg-zinc-100/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium pointer-events-none leading-none shadow-sm backdrop-blur-sm ${groupCount < 10 && !hasGenerating ? 'w-5 h-5 rounded-full' : 'rounded-full px-2 py-[3px]'}`}>
                            {hasGenerating && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />}
                            {groupCount}
                        </div>
                    )} */}

                </div>

                {/* Priority: isNew orange dot > expiring yellow dot */}
                {isNew && !isGen ? (
                    <span className="absolute -top-1 -right-1 z-30 w-3 h-3 rounded-full bg-gradient-to-br from-orange-400 to-red-500 shadow-sm pointer-events-none" />
                ) : (daysRemaining != null && daysRemaining <= WARNING_DAYS && !isGen) ? (
                    <Tooltip text={currentLang === 'de'
                        ? `Wird in ${Math.max(0, daysRemaining)} ${daysRemaining === 1 ? 'Tag' : 'Tagen'} gelöscht`
                        : `Will be deleted in ${Math.max(0, daysRemaining)} ${daysRemaining === 1 ? 'day' : 'days'}`
                    }>
                        <span className="absolute -top-1 -right-1 z-30 w-3 h-3 rounded-full bg-yellow-400 shadow-sm cursor-default" />
                    </Tooltip>
                ) : null}
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
    isFetchingMore?: boolean;
    isSelectMode?: boolean;
    isSelectionSideSheetOpen?: boolean;
    selectedIds?: string[];
    onToggleSelect?: (id: string, isRange?: boolean) => void;
    state?: any;
    actions?: any;
    t?: any;
    expandedGroupId: string | null;
    onExpandedGroupChange: (id: string | null) => void;
    lastViewedId?: string | null;
    onScrollProgress?: (p: number) => void;
    voiceFocusIndex?: number | null;
}

export const FeedPage: React.FC<FeedPageProps> = ({ images, rows, isLoading, hasMore, onSelectImage, onCreateNew, onGenerate, onUpload, onLoadMore, isFetchingMore = false, isSelectMode, isSelectionSideSheetOpen, selectedIds = [], onToggleSelect, expandedGroupId, onExpandedGroupChange, lastViewedId, state, actions, t, onScrollProgress, voiceFocusIndex }) => {
    // URL-based fallback: expandedGroupId may still be null on first render after /stack/:id navigation
    const effectiveGroupId = expandedGroupId || (
        typeof window !== 'undefined' && window.location.pathname.startsWith('/stack/')
            ? window.location.pathname.split('/').pop() || null
            : null
    );

    const sentinelRef = React.useRef<HTMLDivElement>(null);
    const isMobile = useMobile();
    const gridRef = React.useRef<HTMLDivElement>(null);
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const scrollRafRef = React.useRef<number>(0);
    const { confirm } = useItemDialog();

    // Report scroll progress to parent (drives hero navbar collapse animation).
    // Depends on images.length so the listener is re-registered after the loading
    // state clears and scrollRef finally gets attached to the DOM.
    const [gradientOp, setGradientOp] = React.useState(1);
    const [scrollP, setScrollP] = React.useState(0);
    const hasImages = images.length > 0;
    React.useEffect(() => {
        if (!onScrollProgress) return;
        const el = scrollRef.current;
        if (!el) return;
        const HERO_SCROLL_DISTANCE = 120; // must match TOP_PAD(20) + BOT_EXTRA(100) in AppNavbar hero mode
        // Reset to 0 whenever we (re-)attach so the header snaps to expanded state
        const p0 = Math.min(el.scrollTop / HERO_SCROLL_DISTANCE, 1);
        onScrollProgress(p0);
        setScrollP(p0);
        setGradientOp(Math.max(1 - p0 * 1.3, 0));
        const fn = () => {
            cancelAnimationFrame(scrollRafRef.current);
            scrollRafRef.current = requestAnimationFrame(() => {
                const p = Math.min(el.scrollTop / HERO_SCROLL_DISTANCE, 1);
                onScrollProgress(p);
                setScrollP(p);
                setGradientOp(Math.max(1 - p * 1.3, 0));
            });
        };
        el.addEventListener('scroll', fn, { passive: true });
        return () => { el.removeEventListener('scroll', fn); cancelAnimationFrame(scrollRafRef.current); };
    }, [onScrollProgress, hasImages]);
    const prevSelectModeRef = React.useRef(false);
    const prevSelectedCountRef = React.useRef(0);
    const lastSelectImageRef = React.useRef<string | null>(null);

    // When entering select mode, scroll to the first selected image (which may have
    // shifted position because the grid re-mounts with all individual images ungrouped)
    // AND ensure we are not in a group drill-down (Select mode always ungroups).
    React.useEffect(() => {
        if (isSelectMode && effectiveGroupId) {
            onExpandedGroupChange(null);
        }
    }, [isSelectMode, effectiveGroupId, onExpandedGroupChange]);

    React.useEffect(() => {
        const isEntering = !!isSelectMode && !prevSelectModeRef.current;
        const isExiting = !isSelectMode && prevSelectModeRef.current;
        const isFirstSelection = !!isSelectMode && prevSelectModeRef.current && prevSelectedCountRef.current === 0 && selectedIds.length > 0;

        prevSelectModeRef.current = !!isSelectMode;
        prevSelectedCountRef.current = selectedIds.length;

        // Track last selected image for scroll restoration on exit
        if (isSelectMode && selectedIds.length > 0) {
            lastSelectImageRef.current = selectedIds[selectedIds.length - 1];
        }

        if ((isEntering || isFirstSelection) && selectedIds.length > 0) {
            const targetId = selectedIds[0];
            let retryCount = 0;
            const scrollFn = () => {
                const el = gridRef.current?.querySelector(`[data-image-id="${targetId}"]`);
                if (el) {
                    el.scrollIntoView({ block: 'center', behavior: 'instant' });
                } else if (retryCount < 10) {
                    retryCount++;
                    requestAnimationFrame(scrollFn);
                }
            };
            requestAnimationFrame(scrollFn);
        }

        // Scroll to the cover tile of the last selected image's group when exiting select mode
        if (isExiting && lastSelectImageRef.current) {
            const targetId = lastSelectImageRef.current;
            const start = Date.now();
            const tryScroll = () => {
                // Find cover tile for this image's group
                const row = rows.find(r => r.items.some(i => i.id === targetId));
                const coverId = row ? row.items[0].id : targetId;
                const el = document.querySelector(`[data-image-id="${coverId}"]`);
                if (el) {
                    el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
                } else if (Date.now() - start < 500) {
                    requestAnimationFrame(tryScroll);
                }
            };
            requestAnimationFrame(tryScroll);
            lastSelectImageRef.current = null;
        }
    }, [isSelectMode, selectedIds, effectiveGroupId, rows]);

    // Map: cover image id → row (for quick group lookup)
    // Cover = newest item (first in row, items sorted newest→oldest)
    const groupCountMap = useMemo(() => {
        const map = new Map<string, number>();
        rows.forEach(r => {
            const cover = r.items[0];
            if (cover) map.set(cover.id, r.items.length);
        });
        return map;
    }, [rows]);

    const groupRowMap = useMemo(() => {
        const map = new Map<string, ImageRow>();
        rows.forEach(r => {
            const cover = r.items[0];
            if (cover) map.set(cover.id, r);
        });
        return map;
    }, [rows]);

    // What to render: level 1 = newest item per group as cover, level 2 = all items of expanded group,
    // select mode = all individual images (stacks dissolved)
    const displayImages = useMemo(() => {
        if (effectiveGroupId) {
            return rows.find(r => r.id === effectiveGroupId)?.items || [];
        }
        if (isSelectMode) {
            return rows.flatMap(r => r.items);
        }
        return rows.map(r => r.items[0]).filter(Boolean) as CanvasImage[];
    }, [effectiveGroupId, isSelectMode, rows]);

    // Track which cover tile to animate when closing a group
    const [returnCoverId, setReturnCoverId] = React.useState<string | null>(null);
    const prevExpandedGroupId = React.useRef<string | null>(null);
    React.useEffect(() => {
        if (prevExpandedGroupId.current && !expandedGroupId) {
            const row = rows.find(r => r.id === prevExpandedGroupId.current);
            const cover = row?.items[0];
            if (cover) {
                setReturnCoverId(cover.id);
                setTimeout(() => setReturnCoverId(null), 500);
                // Scroll cover into view after grid re-renders
                const start = Date.now();
                const tryScroll = () => {
                    const el = document.querySelector(`[data-image-id="${cover.id}"]`);
                    if (el) {
                        el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
                    } else if (Date.now() - start < 500) {
                        requestAnimationFrame(tryScroll);
                    }
                };
                requestAnimationFrame(tryScroll);
            }
        }
        prevExpandedGroupId.current = expandedGroupId;
    }, [expandedGroupId, rows]);

    // Resolve lastViewedId → the cover tile of whichever row contains it
    const lastViewedRowCoverId = React.useMemo(() => {
        if (!lastViewedId) return null;
        if (displayImages.some(i => i.id === lastViewedId)) return lastViewedId;
        const row = rows.find(r => r.items.some(i => i.id === lastViewedId));
        if (!row) return null;
        return row.items[0].id;
    }, [lastViewedId, displayImages, rows]);

    // Gate the return-from-detail animation so it plays only once per mount.
    // Without this, after returnCoverId (group-close animation) clears, lastViewedRowCoverId
    // kicks in and causes a second spurious zoom animation on a different tile.
    // FeedPage remounts fresh on each grid entry, so useState(true) → false after 600ms is correct.
    const [lastViewedAnimActive, setLastViewedAnimActive] = React.useState(true);
    React.useEffect(() => {
        const t = setTimeout(() => setLastViewedAnimActive(false), 600);
        return () => clearTimeout(t);
    }, []); // intentionally empty: run once per mount

    // Scroll the last-viewed cover tile into view when returning from detail
    const didScrollRef = React.useRef(false);
    React.useEffect(() => {
        if (!lastViewedRowCoverId || didScrollRef.current) return;
        const start = Date.now();
        const tryScroll = () => {
            const el = document.querySelector(`[data-image-id="${lastViewedRowCoverId}"]`);
            if (el) {
                didScrollRef.current = true;
                el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
            } else if (Date.now() - start < 500) {
                requestAnimationFrame(tryScroll);
            }
        };
        requestAnimationFrame(tryScroll);
    }, [lastViewedRowCoverId, displayImages]);

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
            actions?.setIsDragOver?.(true);
        }
    }, [actions]);

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            setIsDropActive(false);
            actions?.setIsDragOver?.(false);
        }
    }, [actions]);

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDropActive(false);
        actions?.setIsDragOver?.(false);

        const files = e.dataTransfer.files;
        if (files?.length && onUpload) {
            onUpload(files);
        }
    }, [onUpload, actions]);

    // Dynamically calculate columns based on actual DOM layout
    const [columns, setColumns] = React.useState(2);
    React.useEffect(() => {
        const updateColumns = () => {
            if (!gridRef.current || !gridRef.current.children.length) return;
            const children = Array.from(gridRef.current.children) as HTMLElement[];
            if (children.length === 0) return;
            const firstTop = children[0].offsetTop;
            let colCountRaw = 0;
            for (const child of children) {
                if (child.offsetTop === firstTop) {
                    colCountRaw++;
                } else {
                    break;
                }
            }
            const colCount = colCountRaw > 0 ? colCountRaw : 2;
            setColumns(colCount);
            actions?.setGridColumns?.(colCount);
        };
        requestAnimationFrame(updateColumns);
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, [displayImages]);

    const { activeIndex, setActiveIndex } = useKeyboardGridNavigation({
        itemCount: displayImages.length,
        columns,
        isActive: true,
        getElementAtIndex: useCallback((idx: number) => {
            const img = displayImages[idx];
            return img ? document.querySelector(`[data-image-id="${img.id}"]`) : null;
        }, [displayImages]),
        onEscape: () => {
            if (effectiveGroupId) { onExpandedGroupChange(null); return; }
            if (isSelectMode) actions?.setIsSelectMode?.(false);
        },
        onEnter: (idx) => {
            const img = displayImages[idx];
            if (!img) return;
            const gc = effectiveGroupId ? 1 : (groupCountMap.get(img.id) ?? 1);
            const row = effectiveGroupId ? null : groupRowMap.get(img.id);
            if (gc > 1 && row) { onExpandedGroupChange(row.id); return; }
            if (isSelectMode && onToggleSelect) onToggleSelect(img.id);
            else onSelectImage(img.id);
        },
        onDelete: async (idx) => {
            const img = displayImages[idx];
            if (!img) return;

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
        if (!hasMore || isLoading || isFetchingMore) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoading && !isFetchingMore && hasMore) {
                console.log('[FeedPage] Sentinel hit, triggering onLoadMore');
                if (typeof onLoadMore === 'function') {
                    onLoadMore();
                }
            }
        }, {
            threshold: 0.1,
            rootMargin: '200px', // Start loading 200px before reaching the end
            root: scrollRef.current
        });

        if (sentinelRef.current) {
            observer.observe(sentinelRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, isLoading, isFetchingMore, onLoadMore]);

    if (isLoading && images.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400 dark:text-zinc-800" />
            </div>
        );
    }

    const triggerUpload = () => document.getElementById('feed-upload-input')?.click();

    return (
        <div
            className="flex-1 flex overflow-hidden relative"
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
            <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-zinc-950 relative flex flex-col">

                {/* Drag & drop overlay */}
                {isDropActive && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <div className="absolute inset-0 bg-black/60" />
                        <div className={`relative flex flex-col items-center gap-3 px-10 py-8 ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusXl} ${Theme.Effects.ShadowLg}`}>
                            <Upload className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                            <p className={`${Typo.Body} text-sm text-zinc-600 dark:text-zinc-400`}>
                                {t?.('drop_files_here') || 'Drop files here'}
                            </p>
                        </div>
                    </div>
                )}
                {/* Fixed spacer so content starts below the expanded hero header */}
                {!effectiveGroupId && !isSelectMode && images.length > 0 && onScrollProgress && (
                    <FeedHeroSection />
                )}
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 flex flex-col relative pb-16 min-h-[100dvh]">
                        {displayImages.length > 0 ? (
                            <>
                                <div
                                    key={`${effectiveGroupId ?? 'root'}-${isSelectMode ? 'select' : 'normal'}`}
                                    ref={gridRef}
                                    className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-12 px-4 sm:px-8 pt-8 sm:pt-16 mt-0 bg-transparent animate-in fade-in zoom-in-[99%] duration-200 ease-out ${isMobile ? 'pb-[max(9rem,calc(9rem+env(safe-area-inset-bottom)))]' : ''}`}
                                >
                                    {displayImages.map((img, idx) => {
                                        const gc = (effectiveGroupId || isSelectMode) ? 1 : (groupCountMap.get(img.id) ?? 1);
                                        const row = (effectiveGroupId || isSelectMode) ? null : groupRowMap.get(img.id);
                                        const hasGen = row?.items.some(i => i.isGenerating) ?? false;
                                        const parentImg = img.parentId ? imageIdMap.get(img.parentId) : undefined;
                                        const parentSrc = parentImg ? (parentImg.thumbSrc || parentImg.src) : undefined;
                                        const unseenIds: Set<string> = state?.unseenIds ?? new Set();
                                        // For group covers: dot if any item in group is unseen
                                        const rowItems = row?.items ?? [img];
                                        const isNew = !effectiveGroupId
                                            ? rowItems.some(i => unseenIds.has(i.id))
                                            : unseenIds.has(img.id);
                                        // TTL: use root image's createdAt for group covers
                                        const rootImg = rowItems.find(i => !i.parentId) ?? img;
                                        const daysLeft = getDaysRemaining(rootImg.createdAt);
                                        return (
                                            <FeedGridItem
                                                key={img.id}
                                                img={img}
                                                idx={idx}
                                                isSelected={selectedIdSet.has(img.id)}
                                                isKeyboardActive={activeIndex === idx || voiceFocusIndex === idx}
                                                isSelectMode={!!isSelectMode}
                                                onSelectImage={onSelectImage}
                                                onToggleSelect={onToggleSelect}
                                                setActiveIndex={setActiveIndex}
                                                actions={actions}
                                                parentSrc={parentSrc}
                                                groupCount={gc}
                                                hasGenerating={hasGen}
                                                onOpenGroup={gc > 1 && row ? () => {
                                                    actions?.markGroupSeen?.(row.items.map(i => i.id));
                                                    onExpandedGroupChange(row.id);
                                                } : undefined}
                                                staggerDelay={(effectiveGroupId || isSelectMode) ? Math.min(idx * 35, 350) : undefined}
                                                isLastViewed={!effectiveGroupId && !isSelectMode && img.id === (returnCoverId ?? (lastViewedAnimActive ? lastViewedRowCoverId : null) ?? '')}
                                                isNew={isNew}
                                                daysRemaining={daysLeft}
                                                currentLang={state?.currentLang}
                                            />
                                        );
                                    })}
                                </div>
                            </>
                        ) : !isLoading && (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-lg mx-auto text-center gap-12 animate-in fade-in zoom-in-95 duration-1000 min-h-full">
                                <div className="flex flex-col items-center gap-8">
                                    <div className="space-y-2">
                                        <h1 className="text-sm font-bold tracking-tight text-black dark:text-white">
                                            {t?.('welcome_title') || 'Welcome to exposé'}
                                        </h1>
                                        <p className={`${Typo.Body} text-zinc-500 dark:text-zinc-400 mx-auto text-sm`}>
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
                </div>

                {/* Infinite scroll sentinel + loading indicator */}
                {(hasMore || isFetchingMore) && (
                    <div ref={sentinelRef} className="flex flex-col items-center justify-center min-h-[8rem] py-8 gap-4">
                        <div className={`transition-all duration-1000 ease-in-out flex flex-col items-center ${ (isLoading || isFetchingMore) ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none' }`}>
                            <Loader2 className="w-10 h-10 animate-[spin_3s_linear_infinite] text-zinc-300 dark:text-zinc-800" />
                        </div>
                        
                        {!isLoading && !isFetchingMore && hasMore && (
                            <div className="animate-in fade-in duration-1000 flex flex-col items-center gap-2 text-zinc-400/50 dark:text-zinc-600/50">
                                <div className="text-[10px] uppercase tracking-[0.3em] font-medium">Scroll for more</div>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-auto">
                    <GlobalFooter
                        t={t}
                        onGalleryClick={() => {
                            // Already on feed, just scroll to top
                            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    />
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
