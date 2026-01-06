
import React, { memo, useEffect, useState, useRef } from 'react';
import { CanvasImage, AnnotationObject, TranslationFunction, GenerationQuality } from '@/types';
import { Download, ChevronLeft, ChevronRight, Trash2, RotateCcw } from 'lucide-react';
import { EditorCanvas } from './EditorCanvas';
import { Tooltip, Typo, Theme } from '@/components/ui/DesignSystem';
import { downloadImage } from '@/utils/imageUtils';
import { generateId } from '@/utils/ids';
import { storageService } from '@/services/storageService';

interface ImageItemProps {
    image: CanvasImage;
    isSelected: boolean;
    zoom: number;
    hasAnySelection?: boolean;
    onRetry?: (id: string) => void;
    editorState?: {
        mode: 'prompt' | 'brush' | 'objects';
        brushSize: number;
        maskTool: 'brush' | 'text' | 'shape' | 'select' | 'polygon';
        activeShape?: 'rect' | 'circle';
    };
    onUpdateAnnotations?: (id: string, anns: AnnotationObject[]) => void;
    onEditStart?: (mode: 'brush' | 'objects') => void;
    onNavigate?: (direction: -1 | 1, fromId?: string) => void,
    hasLeft?: boolean,
    hasRight?: boolean,
    onDelete?: (id: string) => void;
    onContextMenu?: (e: React.MouseEvent, id: string) => void;
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
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-50 bg-white/90 dark:bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-[160px] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-500">
                <div className={`flex items-end justify-between ${Typo.Label}`}>
                    <span className={`${Theme.Colors.TextPrimary}`}>{t('processing')}</span>
                </div>
                <div className="h-0.5 w-full bg-zinc-200 dark:bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-900 dark:bg-white transition-all duration-75 ease-linear" style={{ width: `${progress}%` }} />
                </div>
            </div>
        </div>
    );
}

const getDurationForQuality = (quality?: GenerationQuality): number => {
    switch (quality) {
        case 'fast': return 12000;
        case 'pro-2k': return 36000;
        case 'pro-4k': return 60000;
        default: return 23000;
    }
};

const ImageSource = memo(({ path, src, thumbSrc, maskSrc, zoom, isSelected, title, onDimensionsDetected, onLoaded }: { path: string, src: string, thumbSrc?: string, maskSrc?: string, zoom: number, isSelected: boolean, title: string, onDimensionsDetected?: (w: number, h: number) => void, onLoaded?: () => void }) => {
    // Priority: Mask (Editing) > Direct Src (Pre-signed/Blob) > Thumb (Skeleton/Initial)
    const [currentSrc, setCurrentSrc] = useState<string | null>(maskSrc || src || thumbSrc || null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isHighRes, setIsHighRes] = useState(!!src && !thumbSrc);
    const fetchLock = useRef(false);
    const lastPath = useRef(path);

    // Sync state if props change (e.g. after generation completes or when swapping images)
    useEffect(() => {
        if (path !== lastPath.current || (src && src !== currentSrc)) {
            setIsLoaded(false);
            setCurrentSrc(maskSrc || src || thumbSrc || null);
            setIsHighRes(!!src && !thumbSrc);
            lastPath.current = path;
        }
    }, [path, src, maskSrc, thumbSrc]);

    useEffect(() => {
        if (maskSrc) {
            setCurrentSrc(maskSrc);
            setIsHighRes(true);
            return;
        }

        const needsHQ = isSelected && zoom > 1.8;

        const fetchUrl = async () => {
            if (!path || fetchLock.current) return;

            // Only skip if we already have HighRes for THIS specific path
            if (isHighRes && path === lastPath.current) return;

            fetchLock.current = true;
            try {
                // Standard: 1200px. HQ: Original.
                const url = await storageService.getSignedUrl(path, needsHQ ? undefined : { width: 1200, quality: 80 });
                if (url) {
                    // Only reset isLoaded if we are switching to a DIFFERENT image
                    if (path !== lastPath.current) {
                        setIsLoaded(false);
                    }
                    setCurrentSrc(url);
                    if (needsHQ) setIsHighRes(true);
                    lastPath.current = path;
                }
            } finally {
                fetchLock.current = false;
            }
        };

        const shouldFetch = !currentSrc || (needsHQ && !isHighRes) || (path !== lastPath.current);

        if (shouldFetch) {
            const delay = (!currentSrc || path !== lastPath.current) ? 0 : 800;
            const timeout = setTimeout(fetchUrl, delay);
            return () => clearTimeout(timeout);
        }
    }, [path, src, zoom, maskSrc, isSelected, isHighRes]);

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
                onLoaded?.();
            }}
            style={{
                imageRendering: (zoom > 1.5 && !isHighRes) ? 'pixelated' : 'auto',
                opacity: (currentSrc && isLoaded) ? 1 : 0,
                transition: 'opacity 0.4s ease-out'
            }}
        />
    );
});

export const ImageItem: React.FC<ImageItemProps> = memo(({
    image,
    isSelected,
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
    onContextMenu,
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

    const navIconBtnClass = `absolute flex items-center justify-center w-10 h-10 transition-all duration-200 text-zinc-400 hover:text-black dark:text-zinc-500 dark:hover:text-white rounded-full hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 pointer-events-auto z-[60]`;

    return (
        <div
            data-image-id={image.id}
            onContextMenu={(e) => onContextMenu?.(e, image.id)}
            className={`relative shrink-0 select-none group snap-center ${isSelected ? 'z-30' : 'z-20'}`}
            style={{
                width: finalWidth,
                opacity: (hasAnySelection && !isSelected) ? 0.6 : 1,
                transition: 'opacity 0.2s ease-out'
            }}
        >
            {/* Toolbar */}
            {zoom > 0.4 && (
                <div className="flex items-center justify-between w-full h-7 mb-2 px-0.5 animate-in fade-in duration-300">
                    <span className={`${Typo.Label} ${Theme.Colors.TextSecondary} truncate uppercase text-[10px] tracking-wider`}>
                        {image.title}
                    </span>
                    <div className={`flex items-center gap-2 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <button onClick={(e) => { e.stopPropagation(); downloadImage(image.src, image.title); }} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
                            <Download className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete?.(image.id); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-md">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {image.parentId && (
                            <button onClick={(e) => { e.stopPropagation(); onRetry?.(image.id); }} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div
                className={`relative overflow-hidden ${Theme.Colors.PanelBg} ${isSelected ? 'ring-1 ring-black dark:ring-white burst-in' : ''}`}
                style={{ height: finalHeight, width: finalWidth }}
            >
                {/* Skeleton Shimmer */}
                <div
                    className={`absolute inset-0 bg-zinc-100 dark:bg-zinc-800 transition-opacity duration-700 ${image.src ? 'opacity-0' : 'opacity-100'}`}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 dark:via-white/5 to-transparent skew-x-12 animate-[shimmer_2s_infinite] -translate-x-full" />
                </div>

                <div className="absolute inset-0 z-10">
                    <ImageSource
                        path={image.storage_path}
                        src={image.src}
                        thumbSrc={image.thumbSrc}
                        maskSrc={image.maskSrc}
                        zoom={zoom}
                        isSelected={isSelected}
                        title={image.title}
                        onDimensionsDetected={(w, h) => setNaturalAspectRatio(w / h)}
                        onLoaded={() => setIsImageReady(true)}
                    />
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
                            isActive={isSelected}
                            onEditStart={onEditStart}
                            onContextMenu={(e) => onContextMenu?.(e, image.id)}
                            t={t}
                        />
                    </div>
                )}

                {(image.isGenerating || !isImageReady) && (
                    <ProcessingOverlay
                        startTime={image.generationStartTime}
                        duration={image.estimatedDuration || getDurationForQuality(image.quality)}
                        t={t}
                    />
                )}
            </div>

            {isSelected && zoom > 1.2 && (
                <div className="absolute inset-0 pointer-events-none">
                    {hasLeft && (
                        <button onClick={(e) => { e.stopPropagation(); onNavigate?.(-1, image.id); }} className={`${navIconBtnClass} left-0 top-1/2 -translate-y-1/2 -translate-x-14`}>
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    {hasRight && (
                        <button onClick={(e) => { e.stopPropagation(); onNavigate?.(1, image.id); }} className={`${navIconBtnClass} right-0 top-1/2 -translate-y-1/2 translate-x-14`}>
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
});

ImageItem.displayName = 'ImageItem';
