import React, { memo, useEffect, useState, useRef } from 'react';
import { CanvasImage, AnnotationObject, TranslationFunction, GenerationQuality } from '@/types';
import { Download, ChevronLeft, ChevronRight, Trash, RotateCcw, MoreVertical, Save, Plus, Square, SquareCheck } from 'lucide-react';
import { EditorCanvas } from './EditorCanvas';
import { Tooltip, Typo, Theme } from '@/components/ui/DesignSystem';
import { downloadImage } from '@/utils/imageUtils';
import { generateId } from '@/utils/ids';
import { storageService } from '@/services/storageService';

interface ImageItemProps {
    image: CanvasImage;
    isSelected: boolean;
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

const ProcessingOverlay: React.FC<{ startTime?: number, duration: number, t: TranslationFunction }> = ({ startTime, duration, t }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const start = startTime || Date.now();
        const update = () => {
            const now = Date.now();
            const elapsed = now - start;
            let p = (elapsed / duration) * 100;
            if (p > 95) p = 95 + (1 - Math.exp(-(elapsed - duration) / 8000)) * 4.9;
            setProgress(Math.min(p, 99.9));
        };
        const interval = setInterval(update, 30);
        update();
        return () => clearInterval(interval);
    }, [startTime, duration]);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-50">
            <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm" />

            <div className="relative w-full max-w-[160px] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-500 z-10">
                <div className={`flex items-end justify-between ${Typo.Label}`}>
                    <span className={`${Theme.Colors.TextPrimary} drop-shadow-md`}>{t('processing')}</span>
                </div>
                <div className="h-0.5 w-full bg-zinc-200/50 dark:bg-white/20 rounded-full overflow-hidden shadow-sm">
                    <div
                        className="h-full bg-zinc-900 dark:bg-white transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

const getDurationForQuality = (quality?: GenerationQuality): number => {
    switch (quality) {
        case 'fast': return 12000;
        case 'pro-2k': return 36000;
        case 'pro-4k': return 60000;
        default: return 23000;
    }
};

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
                const url = await storageService.getSignedUrl(path, needsHQ ? undefined : { width: 600, quality: 75 });
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
            className={`absolute inset-0 w-full h-full object-contain pointer-events-none block transition-all duration-500 ${!isHighRes ? 'blur-sm' : 'blur-0'}`}
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
                transition: 'opacity 0.3s ease-out'
            }}
        />
    );
});

export const ImageItem: React.FC<ImageItemProps> = memo(({
    image,
    isSelected,
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
    const [naturalAspectRatio, setNaturalAspectRatio] = useState<number | null>(null);
    const [isImageReady, setIsImageReady] = useState(!image.isGenerating);

    // Reset ready state when a NEW generation starts for this item
    useEffect(() => {
        if (image.isGenerating) {
            setIsImageReady(false);
        }
    }, [image.isGenerating, image.id]);

    // Use aspect ratio for stable Layout - minimal reflows
    const ratio = naturalAspectRatio || (image.width / image.height);
    const finalWidth = (image.height * ratio) * zoom;
    const finalHeight = image.height * zoom;

    const navIconBtnClass = `absolute flex items-center justify-center w-12 h-12 transition-all duration-200 text-zinc-400 hover:text-black dark:text-zinc-500 dark:hover:text-white rounded-full hover:bg-white/90 dark:hover:bg-zinc-900/90 hover:backdrop-blur-md hover:shadow-xl pointer-events-auto z-[60]`;

    return (
        <div
            data-image-id={image.id}
            onContextMenu={(e) => onContextMenu?.(e, image.id)}
            className={`relative shrink-0 select-none group snap-center ${isSelected ? 'z-30' : 'z-20'}`}
            style={{
                width: finalWidth,
                height: finalHeight, // Stable height!
                opacity: (hasAnySelection && !isSelected) ? 0.6 : 1,
                transition: 'opacity 0.2s ease-out'
            }}
        >
            {zoom > 0.4 && (
                <div
                    className="absolute -top-[44px] left-0 flex items-center justify-start gap-1 w-full h-10 px-0.5 animate-in fade-in duration-300 cursor-pointer group/title z-40"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    {/* Left Group: Meatballs | Checkbox | Filename */}
                    <div className="flex items-center gap-1 min-w-0">
                        {/* Meatballs - Always visible (muted/active) */}
                        <Tooltip content={t('options') || 'Options'}>
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

                        {/* Selection Checkbox - Visible on Hover/Active */}
                        <Tooltip content={isSelected ? (t('deselect') || 'Deselect') : (t('select') || 'Select')}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelect) onSelect(image.id, true, false);
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onMouseUp={(e) => e.stopPropagation()}
                                className={`p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-all text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-white 
                                    ${(isContextMenuOpen || (isSelected && selectedCount > 1))
                                        ? 'opacity-100'
                                        : 'opacity-0 group-hover/title:opacity-100'}`}
                            >
                                {(isSelected && selectedCount > 1) ? (
                                    <SquareCheck className="w-4 h-4 text-black dark:text-white" />
                                ) : (
                                    <Square className="w-4 h-4" />
                                )}
                            </button>
                        </Tooltip>

                        {/* Filename - Visible on Hover/Active */}
                        <span className={`${Typo.Label} truncate text-[10px] tracking-wider transition-all 
                            ${(isContextMenuOpen || (isSelected && selectedCount > 1))
                                ? 'text-black dark:text-white opacity-100 translate-x-0'
                                : 'text-zinc-400 dark:text-zinc-500 opacity-0 group-hover/title:opacity-100 group-hover/title:translate-x-0'}`}
                        >
                            {image.title || 'Untitled'}.jpg
                        </span>
                    </div>
                </div>
            )}

            <div
                className={`relative h-full w-full overflow-hidden ${Theme.Colors.PanelBg} ${isSelected ? 'ring-1 ring-black dark:ring-white burst-in' : ''}`}
            >
                {/* Loading Skeleton - overlay on top of parent image if available */}
                <div
                    className={`absolute inset-0 transition-opacity duration-500 ${isImageReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                >
                    {/* Background: Opaque if no src (fresh gen), semi-transparent if src exists (variation) */}
                    <div className={`absolute inset-0 ${image.src ? 'bg-white/30 dark:bg-black/30 backdrop-blur-[2px]' : 'bg-zinc-100 dark:bg-zinc-800'}`} />

                    {/* Shimmer effect */}
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
                        isSelected={isSelected}
                        title={image.title || 'Image'}
                        onDimensionsDetected={(w, h) => setNaturalAspectRatio(w / h)}
                        onLoaded={() => setIsImageReady(true)}
                    />

                    {/* Click to load hint - subtle and muted */}
                    {!isSelected && !image.isGenerating && isImageReady && zoom > 0.3 && (
                        <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none animate-in fade-in duration-700">
                            <span className={`${Typo.Micro} text-zinc-400/60 dark:text-zinc-500/60 tracking-wider uppercase font-medium`}>
                                {t('click_to_load') || 'zum Laden klicken'}
                            </span>
                        </div>
                    )}
                </div>

                {!image.isGenerating && onUpdateAnnotations && editorState && (isSelected || (image.annotations && image.annotations.length > 0)) && (
                    <div className="absolute inset-0 z-20">
                        <EditorCanvas
                            width={finalWidth / zoom}
                            height={finalHeight / zoom}
                            zoom={zoom}
                            annotations={image.annotations || []}
                            onChange={(anns) => onUpdateAnnotations(image.id, anns)}
                            brushSize={editorState.brushSize}
                            activeTab={editorState.mode}
                            maskTool={editorState.maskTool}
                            activeShape={editorState.activeShape}
                            isBrushResizing={editorState.isBrushResizing}
                            isActive={isSelected}
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

                {image.isGenerating && (image.generationStartTime || image.quality) && (
                    <ProcessingOverlay
                        startTime={image.generationStartTime}
                        duration={image.estimatedDuration || getDurationForQuality(image.quality)}
                        t={t}
                    />
                )}
            </div>



            {/* Bottom Navigation Buttons - Absolute Overlay */}
            {zoom > 0.4 && (
                <div
                    className={`absolute -bottom-14 left-0 right-0 flex items-center justify-center gap-2 px-0.5 transition-all duration-300 ${(isSelected && isPrimary && !image.isGenerating)
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-2 pointer-events-none'
                        }`}
                >
                    {/* Previous Image - Square Button */}
                    {hasLeft && (
                        <Tooltip text={t('previous') || 'Previous'}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate?.(-1, image.id);
                                }}
                                className={`h-9 w-9 flex items-center justify-center rounded-lg shadow-sm border ${Theme.Colors.Border} ${Theme.Effects.Glass} hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors`}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        </Tooltip>
                    )}

                    {/* Center Action Group - Joined Pill */}
                    <div className={`flex flex-row items-center h-9 overflow-hidden rounded-lg shadow-sm border ${Theme.Colors.Border} ${Theme.Effects.Glass}`}>
                        {/* Generate More */}
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

                        {/* Separator */}
                        <div className={`w-px h-4 ${Theme.Colors.BorderSubtle} border-r shrink-0`} />

                        {/* Save/Download */}
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
                    </div>

                    {/* Next Image - Square Button */}
                    {hasRight && (
                        <Tooltip text={t('next') || 'Next'}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate?.(1, image.id);
                                }}
                                className={`h-9 w-9 flex items-center justify-center rounded-lg shadow-sm border ${Theme.Colors.Border} ${Theme.Effects.Glass} hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors`}
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
