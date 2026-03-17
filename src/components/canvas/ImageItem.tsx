import React, { memo, useEffect, useState, useRef } from 'react';
import { CanvasImage, AnnotationObject, TranslationFunction } from '@/types';
import { Download, ChevronLeft, ChevronRight, Trash, RotateCcw, MoreVertical, Save, Plus, Square, SquareCheck } from 'lucide-react';
import { EditorCanvas } from './EditorCanvas';
import { Tooltip, Typo, Theme } from '@/components/ui/DesignSystem';
import { BlobBackground } from '@/components/ui/BlobBackground';
import { downloadImage } from '@/utils/imageUtils';
import { generateId } from '@/utils/ids';
import { storageService, THUMB_OPTIONS } from '@/services/storageService';
import { useMobile } from '@/hooks/useMobile';

interface ImageItemProps {
    image: CanvasImage;
    isSelected?: boolean; // @deprecated use isMarked
    isMarked?: boolean;
    isActive?: boolean;
    isPrimary?: boolean;
    zoom: number;
    hasAnySelection?: boolean;
    onRetry?: (id: string) => void;
    editorState?: {
        mode: 'prompt' | 'brush' | 'objects';
        brushSize: number;
        maskTool: 'brush' | 'text' | 'shape' | 'select';
        activeShape?: 'rect' | 'circle' | 'line';
        isBrushResizing?: boolean;
        activeAnnotationId?: string | null;
        customReferenceInstructions?: Record<string, string>;
    };
    onUpdateAnnotations?: (id: string, anns: AnnotationObject[]) => void;
    onEditStart?: (mode: 'brush' | 'objects') => void;
    onNavigate?: (direction: -1 | 1, fromId?: string) => void;
    hasLeft?: boolean;
    hasRight?: boolean;
    onDelete?: (id: string) => void;
    onDownload?: (id: string) => void;
    onInteractionStart?: () => void;
    onInteractionEnd?: () => void;
    onContextMenu?: (e: React.MouseEvent, id: string, rect?: DOMRect) => void;
    onNavigateParent?: (id: string) => void;
    onShowInfo?: (id: string) => void;
    onSelect?: (id: string, multi: boolean, range: boolean) => void;
    selectedCount?: number;
    isContextMenuOpen?: boolean;
    t: TranslationFunction;
}


const ImageSource = memo(({ path, src, thumbSrc, maskSrc, zoom, isSelected, title, onDimensionsDetected, onLoaded }: { path: string, src: string, thumbSrc?: string, maskSrc?: string, zoom: number, isSelected: boolean, title: string, onDimensionsDetected?: (w: number, h: number) => void, onLoaded?: () => void }) => {
    const [currentSrc, setCurrentSrc] = useState<string | null>(maskSrc || thumbSrc || src || null);
    const [isLoaded, setIsLoaded] = useState(false);
    const isBlob = src?.startsWith('blob:');
    const [isHighRes, setIsHighRes] = useState(isBlob || (!!src && (!thumbSrc || !path)));
    const fetchLock = useRef(false);
    const lastPath = useRef(path);
    const lastSrc = useRef(src);
    const hasNotifiedLoad = useRef(false);

    // Sync state if props change (e.g. after generation completes or when swapping images)
    useEffect(() => {
        const pathChanged = path !== lastPath.current;
        const srcChanged = src !== lastSrc.current;

        if (pathChanged || srcChanged) {
            // Only hide the image if the path actually changed (major swap)
            // If just the src changed (e.g. upload skeleton -> real data), keep it visible
            if (pathChanged) {
                setIsLoaded(false);
            }

            // If selected and no storage path yet (initial upload), prioritize high-res src
            const isBlob = src?.startsWith('blob:');
            const initialSrc = (isBlob || (!path && isSelected && src)) ? src : (maskSrc || thumbSrc || src || null);

            // Avoid setting state if nothing changed to prevent extra cycles
            if (initialSrc !== currentSrc) {
                setCurrentSrc(initialSrc);
            }

            setIsHighRes(isBlob || (!!src && (!thumbSrc || !path || (isSelected && !path))));
            lastPath.current = path;
            lastSrc.current = src;
            hasNotifiedLoad.current = false;
        }
    }, [path, src, maskSrc, thumbSrc, isSelected, currentSrc]);

    useEffect(() => {
        if (maskSrc) {
            setCurrentSrc(maskSrc);
            setIsHighRes(true);
            return;
        }

        const fetchUrl = async () => {
            if (!path || fetchLock.current) return;

            // Determine if we need high resolution
            const needsHQ = isSelected;

            // Skip if we already have the right quality for this path
            if (needsHQ && isHighRes && path === lastPath.current) return;
            if (!needsHQ && !isHighRes && path === lastPath.current && currentSrc) return;

            fetchLock.current = true;
            try {
                // Load thumbnail (600px) by default, full resolution only when selected
                const url = await storageService.getSignedUrl(path, needsHQ ? undefined : THUMB_OPTIONS);
                if (url) {
                    // Reset loaded state when switching images
                    if (path !== lastPath.current) {
                        setIsLoaded(false);
                    }
                    setCurrentSrc(url);
                    setIsHighRes(needsHQ);
                    lastPath.current = path;
                }
            } finally {
                fetchLock.current = false;
            }
        };

        const shouldFetch = !currentSrc || (isSelected && !isHighRes && !!path) || (path !== lastPath.current && !!path);

        if (shouldFetch) {
            const delay = (!currentSrc || path !== lastPath.current) ? 0 : 200;
            const timeout = setTimeout(fetchUrl, delay);
            return () => clearTimeout(timeout);
        } else if (isSelected && !isHighRes && !path && src) {
            // Handle initial upload high-res switch
            setCurrentSrc(src);
            setIsHighRes(true);
        }
    }, [path, src, maskSrc, isSelected, isHighRes, currentSrc]);

    return (
        <img
            src={currentSrc || ''}
            alt={title}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none block"
            loading="lazy"
            onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                    onDimensionsDetected?.(img.naturalWidth, img.naturalHeight);
                }
                setIsLoaded(true);

                // Only notify parent once per image
                if (!hasNotifiedLoad.current) {
                    hasNotifiedLoad.current = true;
                    onLoaded?.();
                }
            }}
            style={{
                imageRendering: (zoom > 1.5 && !isHighRes) ? 'pixelated' : 'auto',
                opacity: (currentSrc && isLoaded) ? 1 : 0,
                transition: 'opacity 0.2s ease-out'
            }}
        />
    );
});

/** Small animated progress bar shown inside generating blob tiles */
export const GenerationProgressBar: React.FC<{ startTime?: number; estimatedDuration?: number; finishing?: boolean }> = ({ startTime, estimatedDuration, finishing }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // When the image has arrived, snap to 100%
        if (finishing) {
            setProgress(1);
            return;
        }
        if (!startTime) return;
        const duration = estimatedDuration || 60000;

        const tick = () => {
            const elapsed = Date.now() - startTime;
            const raw = elapsed / duration;
            const capped = 1 - Math.exp(-raw * 1.5);
            // Cap at 85% — only reaches 100% when the image truly arrives
            setProgress(Math.min(capped * 0.85, 0.85));
        };

        tick();
        const id = setInterval(tick, 800);
        return () => clearInterval(id);
    }, [startTime, estimatedDuration, finishing]);

    return (
        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none">
            {/* Track */}
            <div className="w-full h-[3px] rounded-full bg-white/20 overflow-hidden">
                {/* Fill */}
                <div
                    className={`h-full rounded-full bg-white/70 ${finishing ? 'transition-all duration-500 ease-out' : 'transition-all duration-700 ease-out'}`}
                    style={{ width: `${progress * 100}%` }}
                />
            </div>
        </div>
    );
};

export const ImageItem: React.FC<ImageItemProps> = memo(({
    image,
    isSelected,
    isMarked,
    isActive,
    isPrimary,
    hasAnySelection,
    zoom,
    onRetry,
    editorState,
    onUpdateAnnotations,
    onEditStart,
    onNavigate,
    hasLeft,
    hasRight,
    onDelete,
    onDownload,
    onInteractionStart,
    onInteractionEnd,
    onContextMenu,
    onNavigateParent,
    onShowInfo,
    onSelect,
    selectedCount = 0,
    isContextMenuOpen,
    t
}) => {
    const isMobile = useMobile();
    const [naturalAspectRatio, setNaturalAspectRatio] = useState<number | null>(null);
    const [isImageReady, setIsImageReady] = useState(!image.isGenerating);
    // Brief "finishing" phase: progress bar flashes to 100% when image arrives
    const [isFinishing, setIsFinishing] = useState(false);
    const wasGeneratingRef = useRef(image.isGenerating);

    // Reset ready state when a NEW generation starts for this item
    useEffect(() => {
        if (image.isGenerating) {
            setIsImageReady(false);
            setIsFinishing(false);
            wasGeneratingRef.current = true;
        } else if (wasGeneratingRef.current) {
            // Image just arrived — flash progress bar to 100%
            wasGeneratingRef.current = false;
            setIsFinishing(true);
            const t = setTimeout(() => setIsFinishing(false), 700);
            return () => clearTimeout(t);
        }
    }, [image.isGenerating, image.id]);

    // Use DB dimensions as authoritative source; naturalAspectRatio only as fallback
    // (thumbnail pixel dimensions must not override correct DB aspect ratio)
    const ratio = (image.width > 0 && image.height > 0)
        ? image.width / image.height
        : (naturalAspectRatio || 1);
    const finalWidth = (image.height * ratio) * zoom;
    const finalHeight = image.height * zoom;

    const navIconBtnClass = `absolute flex items-center justify-center w-12 h-12 transition-all duration-200 text-zinc-400 hover:text-black dark:text-zinc-500 dark:hover:text-white rounded-full hover:bg-white/90 dark:hover:bg-zinc-900/90 hover:backdrop-blur-md hover: pointer-events-auto z-[60]`;

    return (
        <div
            data-image-id={image.id}
            onContextMenu={(e) => onContextMenu?.(e, image.id)}
            className={`relative shrink-0 select-none group snap-center transition-opacity duration-200 ease-out cursor-pointer
 ${isActive ? 'z-30 opacity-100' : 'z-20'}
 ${!isActive && isMarked ? 'opacity-100' : ''}
 ${!isActive && !isMarked ? 'opacity-60 hover:opacity-100' : ''}
 `}
            style={{
                width: finalWidth,
                height: finalHeight, // Stable height!
            }}
        >
            {zoom > 0.4 && !isMobile && (
                <div
                    className="absolute -top-12 left-0 flex items-center justify-between gap-1 w-full h-12 px-0 animate-in fade-in duration-200 cursor-pointer group/title z-40"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    {/* Left Group: Checkbox | Filename */}
                    <div className={`flex items-center gap-1 min-w-0 transition-opacity duration-200 
 ${(isContextMenuOpen || selectedCount >= 1 || isMarked)
                            ? 'opacity-100'
                            : 'opacity-0 group-hover/title:opacity-100'}`}
                    >
                        {!isMobile && (
                            <Tooltip text={isMarked ? (t('deselect_image') || 'Deselect Image') : (t('select_image') || 'Select Image')}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onSelect) onSelect(image.id, true, false);
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onMouseUp={(e) => e.stopPropagation()}
                                    className={`group/filename flex items-center gap-2 py-2 px-0 rounded-md transition-all max-w-full
 ${(isContextMenuOpen || isMarked)
                                            ? 'text-black dark:text-white opacity-100'
                                            : 'text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-white'}`}
                                >
                                    {isMarked ? (
                                        <SquareCheck className="w-4 h-4 text-black dark:text-white shrink-0" />
                                    ) : (
                                        <Square className="w-4 h-4 shrink-0" />
                                    )}

                                    <span className="truncate max-w-[180px] text-[12.5px] font-medium text-zinc-500 dark:text-zinc-400 group-hover/filename:text-zinc-900 dark:group-hover/filename:text-zinc-100 transition-colors">
                                        {image.title || 'Untitled'}.jpg
                                    </span>
                                </button>
                            </Tooltip>
                        )}
                        {isMobile && (
                            <div className="flex items-center gap-2 py-2 px-0 text-zinc-400 dark:text-zinc-500">
                                <span className="truncate max-w-[180px] text-[12.5px] font-medium text-zinc-500 dark:text-zinc-400">
                                    {image.title || 'Untitled'}.jpg
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right Group: Meatballs */}
                    <div className={`transition-opacity duration-200 
 ${(isContextMenuOpen || isMarked || isActive)
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'}`}
                    >
                        <Tooltip text={t('options') || 'Options'}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onContextMenu) onContextMenu(e, image.id, e.currentTarget.getBoundingClientRect());
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onMouseUp={(e) => e.stopPropagation()}
                                className={`p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-all 
 ${isContextMenuOpen
                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white'
                                        : 'text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-white'}`}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <circle cx="12" cy="7" r="2.5" />
                                    <circle cx="12" cy="17" r="2.5" />
                                </svg>
                            </button>
                        </Tooltip>
                    </div>
                </div>
            )}

            <div
                className={`relative h-full w-full overflow-hidden ${Theme.Colors.PanelBg} ${(isActive || isMarked) ? 'ring-1 ring-black dark:ring-white burst-in' : ''}`}
            >
                {/* Loading Skeleton — hidden when generating (BlobBackground takes over) */}
                <div
                    className={`absolute inset-0 transition-opacity duration-200 ${(isImageReady || image.isGenerating) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                >
                    <div className={`absolute inset-0 ${image.src ? 'bg-white/30 dark:bg-black/30 backdrop-blur-[2px]' : 'bg-zinc-100 dark:bg-zinc-800'}`} />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent skew-x-12 animate-[shimmer_2s_infinite] -translate-x-full" />
                </div>

                {/* Opaque background to prevent grid bleed-through on transparent images */}
                <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-900 z-[5]" />

                <div className="absolute inset-0 z-10">
                    <ImageSource
                        path={image.storage_path}
                        src={image.src}
                        thumbSrc={image.thumbSrc}
                        maskSrc={image.maskSrc}
                        zoom={zoom}
                        isSelected={(isMarked || isActive) ?? false}
                        title={image.title || 'Image'}
                        onDimensionsDetected={(w, h) => setNaturalAspectRatio(w / h)}
                        onLoaded={() => setIsImageReady(true)}
                    />

                </div>

                {!image.isGenerating && onUpdateAnnotations && editorState && (isActive || (image.annotations && image.annotations.length > 0)) && (
                    <div className="absolute inset-0 z-20">
                        <EditorCanvas
                            width={finalWidth / zoom}
                            height={finalHeight / zoom}
                            annotationWidth={image.width}
                            annotationHeight={image.height}
                            zoom={zoom}
                            annotations={image.annotations || []}
                            onChange={(anns) => onUpdateAnnotations(image.id, anns)}
                            brushSize={editorState.brushSize}
                            activeTab={editorState.mode}
                            maskTool={editorState.maskTool}
                            activeShape={editorState.activeShape}
                            isBrushResizing={editorState.isBrushResizing}
                            isActive={isActive}
                            activeAnnotationId={editorState.activeAnnotationId}
                            onActiveAnnotationChange={editorState.onActiveAnnotationChange}
                            onInteractionStart={onInteractionStart}
                            onInteractionEnd={onInteractionEnd}
                            onEditStart={onEditStart}
                            onContextMenu={(e) => onContextMenu?.(e, image.id)}
                            t={t}
                        />
                    </div>
                )}

                {/* Halo animation while generating — also brief "finishing" flash at 100% */}
                {(image.isGenerating || isFinishing) && (
                    <>
                        {image.isGenerating && <BlobBackground className="z-30" speedScale={1.8} />}
                        <GenerationProgressBar
                            startTime={image.generationStartTime}
                            estimatedDuration={image.estimatedDuration}
                            finishing={isFinishing}
                        />
                    </>
                )}
            </div>



            {/* Bottom Navigation Buttons - Absolute Overlay */}
            {zoom > 0.4 && (
                <div
                    className={`absolute -bottom-14 left-0 right-0 flex items-center justify-center gap-2 px-0.5 transition-all duration-300 ${isActive
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-2 pointer-events-none'
                        }`}
                >
                    {/* Previous Image - Square Button (desktop only) */}
                    {!isMobile && hasLeft && (
                        <Tooltip text={t('previous') || 'Previous'}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate?.(-1, image.id);
                                }}
                                className={`h-9 w-9 flex items-center justify-center rounded-lg border ${Theme.Colors.Border} ${Theme.Effects.Glass} hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors`}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        </Tooltip>
                    )}

                    {/* Center Action Group - Joined Pill */}
                    <div className={`flex flex-row items-center h-9 overflow-hidden rounded-lg border ${Theme.Colors.Border} ${Theme.Effects.Glass}`}>
                        {/* Generate More */}
                        {image.parentId && (
                            <>
                                <Tooltip text={t('tt_generate_more') || 'Generate more variations'}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRetry?.(image.id);
                                        }}
                                        className="flex items-center gap-2 px-4 h-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors shrink-0 rounded-none"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span className={Typo.Label}>{t('more') || 'MEHR'}</span>
                                    </button>
                                </Tooltip>

                                {/* Separator (desktop only) */}
                                {!isMobile && <div className={`w-px h-4 ${Theme.Colors.BorderSubtle} border-r shrink-0`} />}
                            </>
                        )}

                        {/* Save/Download (desktop only) */}
                        {!isMobile && (
                            <Tooltip text={t('tt_save') || 'Download image'}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onDownload) onDownload(image.id);
                                    }}
                                    className="flex items-center gap-2 px-4 h-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors shrink-0 rounded-none"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span className={Typo.Label}>{t('save') || 'SPEICHERN'}</span>
                                </button>
                            </Tooltip>
                        )}
                    </div>

                    {/* Next Image - Square Button (desktop only) */}
                    {!isMobile && hasRight && (
                        <Tooltip text={t('next') || 'Next'}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate?.(1, image.id);
                                }}
                                className={`h-9 w-9 flex items-center justify-center rounded-lg border ${Theme.Colors.Border} ${Theme.Effects.Glass} hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors`}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </Tooltip>
                    )}
                </div>
            )}
        </div>
    );
});

ImageItem.displayName = 'ImageItem';
