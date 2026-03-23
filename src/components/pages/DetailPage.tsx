import React, { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
import { ChevronLeft, ChevronRight, Download, Info, Trash2, MoreHorizontal, Type, Square, Circle, Minus, Pen, Trash, Check, Shapes, X, Repeat } from 'lucide-react';
import { CanvasImage } from '@/types';
import { SideSheet } from '@/components/sidesheet/SideSheet';
import { useMobile } from '@/hooks/useMobile';
import { Theme, Typo, Tooltip, RoundIconButton, Button } from '@/components/ui/DesignSystem';
import { useItemDialog } from '@/components/ui/Dialog';
import { EditorCanvas } from '@/components/canvas/EditorCanvas';
import { ObjectsTab } from '@/components/sidesheet/ObjectsTab';
import { BlobBackground } from '@/components/ui/BlobBackground';
import { GenerationProgressBar } from '@/components/canvas/ImageItem';

/* ── Circular progress for thumb strip generating placeholders ── */
const ThumbCircularProgress: React.FC<{ startTime?: number; estimatedDuration?: number }> = ({ startTime, estimatedDuration }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!startTime) return;
        const duration = estimatedDuration || 60000;
        const tick = () => {
            const elapsed = Date.now() - startTime;
            const raw = elapsed / duration;
            const capped = 1 - Math.exp(-raw * 1.5);
            setProgress(Math.min(capped * 0.85, 0.85));
        };
        tick();
        const id = setInterval(tick, 800);
        return () => clearInterval(id);
    }, [startTime, estimatedDuration]);

    const r = 9;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - progress);

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: 'rotate(-90deg)' }}>
                {/* Track */}
                <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
                {/* Fill */}
                <circle
                    cx="12" cy="12" r={r} fill="none"
                    stroke="rgba(255,255,255,1)" strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
                />
            </svg>
        </div>
    );
};

/* ── Memoised thumbnail button ── */
const ThumbButton = memo<{ id: string; src: string; isActive: boolean; isNew?: boolean; leaving?: boolean; thumbOpacity: number; onSelect: (id: string) => void }>(
    ({ id, src, isActive, isNew, leaving, thumbOpacity, onSelect }) => {
        const [hovered, setHovered] = useState(false);
        const [mounted, setMounted] = useState(false);
        useEffect(() => {
            const raf = requestAnimationFrame(() => setMounted(true));
            return () => cancelAnimationFrame(raf);
        }, []);
        const collapseEase = 'cubic-bezier(0.4, 0, 0.2, 1)';
        // Width/margin: entering thumbs jump instantly to full size so offsetLeft is immediately
        // correct for scroll centering. Only leaving thumbs animate width to 0.
        const wrapperWidth = leaving ? '0px' : '36px';
        const wrapperMargin = leaving ? '0px' : '8px';
        const active = mounted && !leaving;
        const invisible = thumbOpacity === 0;
        const displayOpacity = leaving ? 0 : (isActive ? 1 : hovered ? Math.max(thumbOpacity, 0.85) : thumbOpacity);
        const btnTransition = hovered || leaving || displayOpacity === thumbOpacity
            ? `opacity 200ms ease, transform 200ms ease`
            : 'opacity 300ms ease, transform 150ms ease';
        return (
            <div
                className="shrink-0 overflow-visible h-9 flex items-center"
                style={{
                    width: wrapperWidth,
                    marginRight: wrapperMargin,
                    transition: leaving ? `width 300ms ${collapseEase}, margin 300ms ${collapseEase}` : 'none',
                }}
            >
                <button
                    data-thumb-id={id}
                    onClick={() => { if (!leaving) onSelect(id); }}
                    onMouseEnter={() => { if (!invisible && !leaving) setHovered(true); }}
                    onMouseLeave={() => setHovered(false)}
                    style={{
                        opacity: displayOpacity,
                        transform: `scale(${leaving ? 0.6 : (active ? (isActive ? 1.1 : 0.9) : 0.6)})`,
                        transition: btnTransition,
                        pointerEvents: leaving ? 'none' : undefined,
                    }}
                    className={`relative h-9 w-9 rounded-[3px] overflow-hidden outline-none${isActive && !leaving ? ' ring-2 ring-orange-600 ring-offset-2 ring-offset-white dark:ring-offset-black z-10' : ''}${invisible ? ' pointer-events-none' : ''}`}
                >
                    <img src={src} decoding="async" className="w-full h-full object-cover" />
                    {isNew && (
                        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-orange-400 to-red-500 pointer-events-none" />
                    )}
                </button>
            </div>
        );
    }
);
ThumbButton.displayName = 'ThumbButton';

/* ── Memoised generating thumbnail ── */
const GeneratingThumb = memo<{ id: string; pSrc?: string; isActive: boolean; thumbOpacity: number; startTime?: number; estimatedDuration?: number; onSelect: (id: string) => void }>(
    ({ id, pSrc, isActive, thumbOpacity, startTime, estimatedDuration, onSelect }) => {
        const [hovered, setHovered] = useState(false);
        const [mounted, setMounted] = useState(false);
        useEffect(() => {
            const raf = requestAnimationFrame(() => setMounted(true));
            return () => cancelAnimationFrame(raf);
        }, []);
        const invisible = thumbOpacity === 0;
        const displayOpacity = isActive ? 1 : hovered ? Math.max(thumbOpacity, 0.85) : thumbOpacity;
        const springEase = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
        return (
            // Wrapper is full-width immediately so offsetLeft is stable for scroll centering.
            // Visual animation runs on the button via opacity/scale only.
            <div
                className="shrink-0 overflow-visible h-9 flex items-center"
                style={{
                    width: '36px',
                    marginRight: '8px',
                    transition: 'none',
                }}
            >
                <button
                    data-thumb-id={id}
                    onClick={() => onSelect(id)}
                    onMouseEnter={() => { if (!invisible) setHovered(true); }}
                    onMouseLeave={() => setHovered(false)}
                    style={{
                        opacity: mounted ? displayOpacity : 0,
                        transform: `scale(${mounted ? (isActive ? 1.1 : 0.9) : 0.6})`,
                        transition: `opacity 300ms ease, transform 320ms ${springEase}`,
                    }}
                    className={`relative h-9 w-9 rounded-[3px] overflow-hidden outline-none${isActive ? ' ring-2 ring-orange-600 ring-offset-2 ring-offset-white dark:ring-offset-black z-10' : ''}${invisible ? ' pointer-events-none' : ''}`}
                >
                    {pSrc ? (
                        <img src={pSrc} className="w-full h-full object-cover blur-sm brightness-75 scale-110" alt="" />
                    ) : (
                        <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                    )}
                    <ThumbCircularProgress startTime={startTime} estimatedDuration={estimatedDuration} />
                </button>
            </div>
        );
    }
);
GeneratingThumb.displayName = 'GeneratingThumb';

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
    isExiting?: boolean;
    hasMore?: boolean;
    onLoadMore?: () => void;

    // SideSheet Props (pass-through)
    state: any;
    actions: any;
    t: any;
}

export const DetailPage: React.FC<DetailPageProps> = ({
    images, selectedId, onBack, onSelectImage, onDelete, onDownload, onInfo, onSidebarWidthChange,
    isSideSheetVisible: isSideSheetVisibleProp, onSideSheetVisibleChange, isExiting,
    hasMore, onLoadMore,
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

    // O(1) lookups via Map instead of O(n) find/findIndex on every render
    const imageMap = useMemo(() => new Map(images.map(i => [i.id, i])), [images]);
    const imageIndexMap = useMemo(() => new Map(images.map((i, idx) => [i.id, idx])), [images]);

    // Thumbstrip: render ALL displayable images — stable DOM width prevents layout shifts from mx-auto
    // opacity-0 items beyond ±8 are pointer-events-none so they cost nothing at runtime
    const stripImages = useMemo(() => {
        const displayable = images.filter(i => i.isGenerating || i.thumbSrc || i.src);
        const currentIdx = displayable.findIndex(i => i.id === selectedId);
        return displayable.map((img, index) => ({
            img,
            distance: currentIdx === -1 ? 0 : Math.abs(index - currentIdx),
        }));
    }, [images, selectedId]);

    // Track thumbnails that just left stripImages so we can animate them out
    const leavingThumbsRef = useRef<Map<string, { img: CanvasImage; index: number }>>(new Map());
    const [leavingThumbs, setLeavingThumbs] = useState<Map<string, { img: CanvasImage; index: number }>>(new Map());
    const prevStripRef = useRef<Array<{ img: CanvasImage; distance: number }>>([]);
    useEffect(() => {
        const currentIds = new Set(stripImages.map(s => s.img.id));
        let changed = false;
        prevStripRef.current.forEach(({ img }, index) => {
            if (!currentIds.has(img.id) && !leavingThumbsRef.current.has(img.id)) {
                leavingThumbsRef.current.set(img.id, { img, index });
                changed = true;
                setTimeout(() => {
                    leavingThumbsRef.current.delete(img.id);
                    setLeavingThumbs(new Map(leavingThumbsRef.current));
                }, 380);
            }
        });
        if (changed) setLeavingThumbs(new Map(leavingThumbsRef.current));
        prevStripRef.current = stripImages;
    }, [stripImages]);

    // Merged strip: interleave leaving thumbs at their original positions
    const combinedStrip = useMemo(() => {
        const result: Array<{ img: CanvasImage; distance: number; leaving: boolean }> =
            stripImages.map(s => ({ ...s, leaving: false }));
        leavingThumbs.forEach(({ img, index }) => {
            const insertAt = Math.min(index, result.length);
            result.splice(insertAt, 0, { img, distance: 99, leaving: true });
        });
        return result;
    }, [stripImages, leavingThumbs]);

    // Suppress zoom animation when navigating within the detail view (only show on first entry from grid).
    // Reset only when the image actually finishes loading — not on selectedId change — so that all
    // intermediate re-renders during loading (imgNaturalDims, displayBox, etc.) also stay suppressed.
    const suppressEntryAnimRef = useRef(false);
    useEffect(() => { if (isMainLoaded) suppressEntryAnimRef.current = false; }, [isMainLoaded]);
    const handleSelectWithin = useCallback((id: string) => {
        suppressEntryAnimRef.current = true;
        onSelectImage(id);
    }, [onSelectImage]);

    const img = imageMap.get(selectedId);
    const idx = imageIndexMap.get(selectedId) ?? -1;

    // Keep a live ref so the debounced onBack guard can re-check after a tick.
    const imgRef = useRef(img);
    useEffect(() => { imgRef.current = img; }, [img]);
    const { confirm } = useItemDialog();

    // Track generating children of current image
    const generatingChild = useMemo(() =>
        img ? images.find(i => i.parentId === img.id && i.isGenerating) : undefined,
        [images, img]
    );
    // Auto-navigate to finished child: was generating → now done.
    // Disabled if the user navigated at any point during generation (even if they came back).
    const prevGeneratingChildRef = useRef<{ childId: string; parentId: string } | null>(null);
    const navHappenedDuringGenRef = useRef(false);
    useEffect(() => {
        if (generatingChild) {
            if (!prevGeneratingChildRef.current) {
                // New generation started — record starting position and reset nav flag
                prevGeneratingChildRef.current = { childId: generatingChild.id, parentId: selectedId };
                navHappenedDuringGenRef.current = false;
            } else if (prevGeneratingChildRef.current.childId === generatingChild.id
                       && selectedId !== prevGeneratingChildRef.current.parentId) {
                // User navigated while this generation was in progress
                navHappenedDuringGenRef.current = true;
            }
        } else if (prevGeneratingChildRef.current) {
            const { childId, parentId } = prevGeneratingChildRef.current;
            const userNavigated = navHappenedDuringGenRef.current || selectedId !== parentId;
            prevGeneratingChildRef.current = null;
            navHappenedDuringGenRef.current = false;
            if (userNavigated) return;
            const finishedImage = imageMap.get(childId);
            if (finishedImage && !finishedImage.isGenerating) {
                setIsSideSheetVisible(false);
                onSelectImage(childId);
            }
        }
    }, [generatingChild, images, selectedId, onSelectImage]);
    const imageViewportRef = useRef<HTMLDivElement>(null);

    // Keep blob visible after generation completes until the real image has loaded
    const prevIsGeneratingRef = useRef<boolean>(false);
    const prevSelectedIdRef = useRef<string>('');
    const thumbStripRef = useRef<HTMLDivElement>(null);
    const [waitingForGeneratedLoad, setWaitingForGeneratedLoad] = useState<string | null>(null);
    useEffect(() => {
        // If selectedId changed, reset tracking state before checking transition
        if (prevSelectedIdRef.current !== selectedId) {
            prevSelectedIdRef.current = selectedId;
            prevIsGeneratingRef.current = img?.isGenerating ?? false;
            setWaitingForGeneratedLoad(null);
            return;
        }
        const wasGenerating = prevIsGeneratingRef.current;
        prevIsGeneratingRef.current = img?.isGenerating ?? false;
        if (wasGenerating && !img?.isGenerating && img?.src) {
            setWaitingForGeneratedLoad(selectedId);
            setLoadedImageId(null); // reset so image fades in via onLoad
        }
    }, [img?.isGenerating, selectedId]);
    const showBlob = img?.isGenerating || waitingForGeneratedLoad === selectedId;

    const thumbStripInnerRef = useRef<HTMLDivElement>(null);
    // First-mount flag: use instant scroll on entry, smooth on subsequent navigation
    const isFirstStripScrollRef = useRef(true);

    // Update padding on mount + resize only — never on selectedId change to avoid layout
    // reflows that interrupt the opacity CSS transition on the thumb buttons.
    useEffect(() => {
        const strip = thumbStripRef.current;
        const inner = thumbStripInnerRef.current;
        if (!strip || !inner) return;
        const updatePadding = () => {
            const halfPad = Math.max(0, Math.floor(strip.clientWidth / 2) - 18);
            inner.style.paddingLeft = `${halfPad}px`;
            inner.style.paddingRight = `${halfPad}px`;
        };
        updatePadding();
        const obs = new ResizeObserver(updatePadding);
        obs.observe(strip);
        return () => obs.disconnect();
    }, []);

    // Scroll active thumb to center. Uses getBoundingClientRect so the result is correct
    // even at the start/end of the list (no dependency on padding math).
    // Load more images when near the end of the loaded list.
    useEffect(() => {
        const centerActiveThumb = () => {
            const strip = thumbStripRef.current;
            if (!strip) return;
            const activeThumb = strip.querySelector(`[data-thumb-id="${selectedId}"]`) as HTMLElement | null;
            if (!activeThumb) return;

            // Center using BoundingClientRect — accurate regardless of scroll position / padding
            const stripRect = strip.getBoundingClientRect();
            const thumbRect = activeThumb.getBoundingClientRect();
            const thumbCenterInContent = thumbRect.left - stripRect.left + strip.scrollLeft + thumbRect.width / 2;
            const behavior = isFirstStripScrollRef.current ? 'auto' : 'smooth';
            isFirstStripScrollRef.current = false;
            const scrollTarget = thumbCenterInContent - strip.clientWidth / 2;
            strip.scrollTo({ left: scrollTarget, behavior });
        };

        let raf1: number, raf2: number;
        raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(centerActiveThumb);
        });
        
        // Ensure centering on resize/Sidesheet toggle
        window.addEventListener('resize', centerActiveThumb);

        return () => { 
            cancelAnimationFrame(raf1); 
            cancelAnimationFrame(raf2);
            window.removeEventListener('resize', centerActiveThumb);
        };
    }, [selectedId, combinedStrip, isSideSheetVisible]);

    // Lazy-load more images when the active image is near the end of the loaded list
    useEffect(() => {
        if (!hasMore || !onLoadMore) return;
        const displayable = images.filter(i => i.isGenerating || i.thumbSrc || i.src);
        const idx = displayable.findIndex(i => i.id === selectedId);
        if (idx === -1) return;
        // Trigger load when within 20 images of the end
        if (displayable.length - idx <= 20) onLoadMore();
    }, [selectedId, images, hasMore, onLoadMore]);

    // Track actual image dimensions — initialized from DB values, updated from real load.
    // Also preloads via Image() so displayBox can be computed even when the visible <img>
    // hasn't been inserted into the DOM yet (chicken-and-egg with the displayBox guard).
    const [imgNaturalDims, setImgNaturalDims] = useState({ width: img?.width || 0, height: img?.height || 0 });
    useEffect(() => {
        if (!img?.src) return;
        // If we already have valid DB dimensions, use them immediately
        if (img.width && img.height) {
            setImgNaturalDims({ width: img.width, height: img.height });
            return;
        }
        // Fallback: preload to discover natural dimensions when DB values are missing
        const preload = new window.Image();
        preload.onload = () => {
            if (preload.naturalWidth > 0 && preload.naturalHeight > 0)
                setImgNaturalDims({ width: preload.naturalWidth, height: preload.naturalHeight });
        };
        preload.src = img.src;
    }, [img?.src, img?.width, img?.height]);

    const logicalDims = useMemo(() => ({
        width: img?.width || 0,
        height: img?.height || 0
    }), [img?.width, img?.height]);

    const [displayBox, setDisplayBox] = useState({ width: 0, height: 0 });

    const updateDisplayBox = useCallback(() => {
        const viewport = imageViewportRef.current;
        if (!viewport || imgNaturalDims.width <= 0 || imgNaturalDims.height <= 0) return;

        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;
        if (viewportWidth <= 0 || viewportHeight <= 0) return;

        const scale = Math.min(
            viewportWidth / imgNaturalDims.width,
            viewportHeight / imgNaturalDims.height
        );

        setDisplayBox({
            width: Math.max(1, Math.round(imgNaturalDims.width * scale)),
            height: Math.max(1, Math.round(imgNaturalDims.height * scale))
        });
    }, [imgNaturalDims.height, imgNaturalDims.width]);

    useEffect(() => {
        updateDisplayBox();
        const viewport = imageViewportRef.current;
        if (!viewport) return;

        const observer = new ResizeObserver(() => updateDisplayBox());
        observer.observe(viewport);
        window.addEventListener('resize', updateDisplayBox);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateDisplayBox);
        };
    }, [updateDisplayBox]);

    useEffect(() => {
        if (state.sideSheetMode === 'brush') {
            actions.setMaskTool(subMenu === 'brush' ? 'brush' : 'select');
        }
    }, [subMenu, state.sideSheetMode, actions]);

    const generateId = () => Math.random().toString(36).substring(2, 9);

    const handleAddObjectCenter = (label: string, itemId: string, icon?: string) => {
        if (!img) return;
        const cx = logicalDims.width / 2;
        const cy = logicalDims.height / 2;
        const newAnn: any = { id: generateId(), type: 'stamp', x: cx, y: cy, text: label, itemId, emoji: icon, color: '#fff', strokeWidth: 0, points: [], createdAt: Date.now() };
        actions.handleUpdateAnnotations(img.id, [...(img.annotations || []), newAnn]);
        actions.setMaskTool('select');
    };

    const handleAddText = () => {
        if (!img) return;
        const cx = logicalDims.width / 2;
        const cy = logicalDims.height / 2;
        const newText: any = { id: generateId(), type: 'stamp', x: cx, y: cy, text: '', color: '#fff', strokeWidth: 4, points: [], createdAt: Date.now() };
        actions.handleUpdateAnnotations(img.id, [...(img.annotations || []), newText]);
        actions.setMaskTool('select');
    };

    const handleAddShape = (shape: 'rect' | 'circle' | 'line') => {
        if (!img) return;
        // Use the logical image space that is persisted and exported.
        const cx = logicalDims.width / 2;
        const cy = logicalDims.height / 2;
        const size = Math.min(logicalDims.width, logicalDims.height) * 0.3;
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

        // Fallback in case onLoad never fires (cached images, errors, etc.)
        const fallbackTimer = setTimeout(() => {
            const el = document.getElementById(`detail-img-${selectedId}`) as HTMLImageElement;
            if (el) {
                setLoadedImageId(selectedId);
                setWaitingForGeneratedLoad(null);
            }
        }, 800);

        return () => clearTimeout(fallbackTimer);
    }, [selectedId]);

    const navigate = useCallback((d: 1 | -1) => {
        const n = idx + d;
        if (n >= 0 && n < images.length) {
            suppressEntryAnimRef.current = true;
            onSelectImage(images[n].id);
        }
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
                    // Navigation after delete is handled by handleDeleteImage in the controller
                    if (selectedId) await onDelete(selectedId);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate, confirm, onDelete, selectedId, onBack]);

    // Resizable Sidebar States
    const [sidebarWidth, setSidebarWidth] = useState(380);
    const [isResizing, setIsResizing] = useState(false);
    useEffect(() => { onSidebarWidthChange?.(380); }, []);

    const startResizing = useCallback(() => setIsResizing(true), []);
    const stopResizing = useCallback(() => setIsResizing(false), []);

    const MIN_SIDEBAR_WIDTH = 300;
    const MAX_SIDEBAR_WIDTH = 600;

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) {
            const newWidth = window.innerWidth - e.clientX;
            const clampedWidth = Math.min(Math.max(newWidth, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
            setSidebarWidth(clampedWidth);
            onSidebarWidthChange?.(clampedWidth);
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


    // No image found — go back, this page shouldn't exist without a valid image.
    // Only navigates away if images have already loaded (images.length > 0) but this
    // specific one isn't in the list (deleted/invalid). On a hard refresh the images
    // array starts empty while loading from DB — we must NOT navigate away in that window.
    useEffect(() => {
        if (img) return; // valid image — nothing to do
        if (images.length === 0) return; // images not loaded yet — wait
        const tid = window.setTimeout(() => {
            if (!imgRef.current) onBack();
        }, 150);
        return () => window.clearTimeout(tid);
    }, [img, images.length, onBack]);
    if (!img) return null;

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-100 dark:bg-black">
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
                    {/* Image Container */}
                    <div className="flex-1 relative overflow-hidden min-h-0">

                    {/* Nav Arrows — desktop only, visible on hover, hidden in brush mode */}
                    {idx > 0 && state.sideSheetMode !== 'brush' && (
                        <button onClick={() => handleSelectWithin(images[idx - 1].id)} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-black/40 hover:bg-black/70 text-white rounded-full items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    {idx < images.length - 1 && state.sideSheetMode !== 'brush' && (
                        <button onClick={() => handleSelectWithin(images[idx + 1].id)} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-black/40 hover:bg-black/70 text-white rounded-full items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    )}

                        {/* Floating action buttons (desktop only) */}
                        {!isMobile && state.sideSheetMode !== 'brush' && (
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-40 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                <div className="flex items-center gap-2 pointer-events-auto">
                                    {img.generationPrompt && img.parentId && (
                                        <Tooltip text={t('generate_more')}>
                                            <button
                                                onClick={() => actions.handleGenerateMore(img)}
                                                className="h-10 px-5 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center gap-1.5 text-xs font-medium transition-all"
                                            >
                                                <Repeat className="w-3.5 h-3.5" />
                                                {t('nav_more')}
                                            </button>
                                        </Tooltip>
                                    )}
                                    {!isSideSheetVisible && !showBlob && (
                                        <Tooltip text={t('open_editing_panel')}>
                                            <button onClick={() => setIsSideSheetVisible(true)} className="h-10 px-5 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center text-xs font-medium transition-all">
                                                {t('nav_edit')}
                                            </button>
                                        </Tooltip>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Sizing wrapper: image and annotations share the exact same fitted box */}
                        <div ref={imageViewportRef} className="absolute inset-0 flex items-center justify-center">
                            {displayBox.width > 0 && displayBox.height > 0 && (
                                <div
                                    className={`relative shrink-0 transition-[opacity,transform] duration-[180ms] ease-in ${isExiting ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
                                    style={{ width: displayBox.width, height: displayBox.height }}
                                >
                                    {/* Loading state while generating or waiting for image */}
                                    {showBlob && (() => {
                                        const parentImg = img.parentId ? imageMap.get(img.parentId) : null;
                                        const parentLoadSrc = parentImg?.thumbSrc || parentImg?.src;
                                        // Fallback: use the placeholder's own thumbSrc (copied from source during creation)
                                        const blurSrc = parentLoadSrc || img.thumbSrc;
                                        if (blurSrc) {
                                            return (
                                                <div className="absolute inset-0 overflow-hidden">
                                                    <img src={blurSrc} className="w-full h-full object-cover scale-110 blur-2xl brightness-100 dark:brightness-50" alt="" />
                                                </div>
                                            );
                                        }
                                        return <BlobBackground speedScale={2} />;
                                    })()}
                                    {img.isGenerating && (
                                        <GenerationProgressBar
                                            startTime={img.generationStartTime}
                                            estimatedDuration={img.estimatedDuration}
                                        />
                                    )}

                                    {img.thumbSrc && !isMainLoaded && (
                                        <img
                                            src={img.thumbSrc}
                                            className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${showBlob ? 'blur-xl brightness-100 dark:brightness-50 scale-110' : ''}`}
                                            style={suppressEntryAnimRef.current ? {} : { animation: 'detail-img-in 220ms cubic-bezier(0.25,1,0.5,1) both' }}
                                            alt=""
                                        />
                                    )}

                                    <img
                                        id={`detail-img-${img.id}`}
                                        key={img.id}
                                        src={img.src}
                                        alt={img.title}
                                        draggable={true}
                                        onLoad={(e) => {
                                            const imgEl = e.target as HTMLImageElement;
                                            setImgNaturalDims({ width: imgEl.naturalWidth, height: imgEl.naturalHeight });
                                            (imgEl.decode?.() ?? Promise.resolve()).catch(() => {}).then(() => {
                                                setLoadedImageId(img.id);
                                                setWaitingForGeneratedLoad(null);
                                            });
                                        }}
                                        onError={() => {
                                            setLoadedImageId(img.id);
                                            setWaitingForGeneratedLoad(null);
                                        }}
                                        className={`absolute inset-0 w-full h-full transition-opacity duration-200 ease-out ${isMainLoaded && !showBlob ? 'opacity-100' : 'opacity-0'}`}
                                        style={{ objectFit: 'contain' }}
                                    />

                                    {!showBlob && isMainLoaded && logicalDims.width > 0 && logicalDims.height > 0 && (
                                        <div className={`absolute inset-0 z-20 ${state.sideSheetMode === 'brush' || state.activeShape ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                                            <EditorCanvas
                                                width={logicalDims.width}
                                                height={logicalDims.height}
                                                annotationWidth={logicalDims.width}
                                                annotationHeight={logicalDims.height}
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
                                </div>
                            )}
                        </div>{/* closes sizing wrapper */}
                    </div>{/* closes image container */}

                    {/* Bottom Area: Fixed space so canvas never jumps */}
                    <div className={`${state.sideSheetMode === 'brush' ? 'h-20' : 'h-0'} md:h-20 shrink-0 relative z-30 w-full overflow-visible`}>
                        {/* Thumbnail Strip — desktop only */}
                        <div
                            ref={thumbStripRef}
                            className={`absolute inset-0 hidden md:flex items-center overflow-x-auto no-scrollbar bg-white dark:bg-black transition-all duration-150 ease-in-out ${state.sideSheetMode !== 'brush' ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-8 opacity-0 pointer-events-none'}`}
                            style={{
                                maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
                            }}
                        >
                            <div ref={thumbStripInnerRef} className="flex items-center">
                            {combinedStrip.map(({ img: i, distance, leaving }) => {
                                // ±8 visible with exponential opacity decay; ±9-12 invisible buffer for smooth transitions
                                const VISIBLE = 8;
                                const thumbOpacity = leaving ? 1
                                    : distance === 0 ? 1
                                    : distance > VISIBLE ? 0
                                    : Math.max(0.15, 0.6 * Math.pow(0.82, distance - 1));
                                if (i.isGenerating && !leaving) {
                                    const parentThumb = i.parentId ? imageMap.get(i.parentId) : null;
                                    const pSrc = parentThumb?.thumbSrc || parentThumb?.src;
                                    return (
                                        <GeneratingThumb
                                            key={i.id}
                                            id={i.id}
                                            pSrc={pSrc}
                                            isActive={selectedId === i.id}
                                            thumbOpacity={thumbOpacity}
                                            startTime={i.generationStartTime}
                                            estimatedDuration={i.estimatedDuration}
                                            onSelect={handleSelectWithin}
                                        />
                                    );
                                }
                                return (
                                    <ThumbButton
                                        key={i.id}
                                        id={i.id}
                                        src={i.thumbSrc || i.src || ''}
                                        isActive={selectedId === i.id}
                                        isNew={state?.unseenIds?.has(i.id)}
                                        leaving={leaving}
                                        thumbOpacity={thumbOpacity}
                                        onSelect={handleSelectWithin}
                                    />
                                );
                            })}
                            </div>
                        </div>

                        {/* Annotations Toolbar */}
                        {state.sideSheetMode === 'brush' && <div className="absolute bottom-6 left-0 right-0 z-50 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
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
                        </div>}
                    </div>
                </div>

                {/* Side Sheet — below image on mobile, side panel on desktop */}
                <aside
                    className={`flex flex-col relative md:overflow-hidden bg-zinc-50 dark:bg-black border-t border-zinc-100 dark:border-zinc-900 md:border-t-0 md:shrink-0 ${isSideSheetActuallyVisible ? 'md:border-l md:border-zinc-100 dark:md:border-zinc-900' : ''} ${isResizing ? 'select-none' : 'md:transition-[width] md:duration-300 md:ease-in-out'} ${!isSideSheetActuallyVisible && isMobile ? 'hidden' : ''}`}
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
