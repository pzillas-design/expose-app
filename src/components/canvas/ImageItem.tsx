
import React, { memo, useEffect, useState, useRef } from 'react';
import { CanvasImage, AnnotationObject, TranslationFunction, GenerationQuality } from '@/types';
import { Download, ChevronLeft, ChevronRight, Trash2, RotateCcw } from 'lucide-react';
import { EditorCanvas } from './EditorCanvas';
import { Tooltip, Typo, Theme } from '@/components/ui/DesignSystem';
import { downloadImage } from '@/utils/imageUtils';

interface ImageItemProps {
    image: CanvasImage;
    isSelected: boolean;
    zoom: number;
    hasAnySelection?: boolean;
    // onMouseDown: (e: React.MouseEvent, id: string) => void; // Removed per new logic
    onRetry?: (id: string) => void;
    onChangePrompt?: (id: string) => void;
    editorState?: {
        mode: 'prompt' | 'brush' | 'objects';
        brushSize: number;
    };
    onUpdateAnnotations?: (id: string, anns: AnnotationObject[]) => void;
    onEditStart?: (mode: 'brush' | 'objects') => void;

    // Navigation Props
    onNavigate?: (direction: -1 | 1, fromId?: string) => void,
    hasLeft?: boolean,
    hasRight?: boolean,
    index?: number; // For staggered animation

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
            // Easing at the end
            if (p > 95) p = 95 + (1 - Math.exp(-(elapsed - duration) / 8000)) * 4.9;
            setProgress(Math.min(p, 99.9));
        };
        const interval = setInterval(update, 30);
        update();
        return () => clearInterval(interval);
    }, [startTime, duration]);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-50 overflow-hidden bg-white/90 dark:bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-[160px] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-500 relative z-10">
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
        case 'fast':
            return 12000; // 12s
        case 'pro-2k':
            return 36000; // 36s
        case 'pro-4k':
            return 60000; // 60s
        case 'pro-1k':
        default:
            return 23000; // 23s
    }
};

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
    index = 0,
    onDelete,
    onContextMenu,
    t
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Intersection Observer to only load when nearing viewport
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setIsVisible(true);
                // Once visible, we can stop observing if we want to keep it in memory,
                // or keep observing to unload it (more aggressive memory saving)
                // Let's keep observing for maximum performance with many images.
            } else {
                setIsVisible(false);
            }
        }, {
            rootMargin: '100% 100%', // Load images when they are within 1 viewport distance
            threshold: 0.01
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const showHighRes = isSelected || zoom > 0.35;
    const currentSrc = (image.maskSrc || (!showHighRes && image.thumbSrc ? image.thumbSrc : image.src));

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        downloadImage(image.src, image.title);
    };

    // Unified Base styles for consistency
    const baseGlass = `${Theme.Effects.Glass} border ${Theme.Colors.Border} rounded-lg shadow-sm`;
    const hoverStyle = "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors";

    // Navigation Button specific: Ghost by default, Frame on hover
    const navIconBtnClass = `absolute flex items-center justify-center w-10 h-10 transition-all duration-200 text-zinc-400 hover:text-black dark:text-zinc-500 dark:hover:text-white rounded-full hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 pointer-events-auto z-[60]`;

    // Action Button specific: Inside container, Height 100% of container, No Radius (handled by parent overflow)
    const actionBtnClass = `flex items-center gap-2 px-4 h-full ${hoverStyle} shrink-0 rounded-none`;

    return (
        <div
            ref={containerRef}
            data-image-id={image.id}
            onContextMenu={(e) => onContextMenu?.(e, image.id)}
            className={`relative shrink-0 select-none group transition-opacity duration-500 ease-out snap-center will-change-transform ${!hasAnySelection || isSelected
                ? 'z-20'
                : 'z-0 hover:opacity-100' // Base opacity handled by fade-in
                } ${hasAnySelection && !isSelected ? 'opacity-70' : 'opacity-100'}`}
            style={{
                width: image.width * zoom,
                scrollSnapStop: 'always',
            }}
        >
            {/* Top Toolbar: Filename + Actions */}
            <div className="flex items-center justify-between w-full h-7 mb-2 px-0.5 animate-in fade-in duration-300">
                <span className={`${Typo.Label} ${Theme.Colors.TextSecondary} truncate tracking-wider uppercase text-[10px] leading-none shrink-0`} title={image.title}>
                    {image.title}
                </span>

                <div className={`flex items-center gap-3 transition-opacity duration-200 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'}`}>
                    <Tooltip text={t('tt_save')} side="top">
                        <button
                            onClick={handleDownload}
                            className={`p-1.5 rounded-md ${Theme.Colors.TextSubtle} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all pointer-events-auto`}
                        >
                            <Download className="w-3.5 h-3.5" />
                        </button>
                    </Tooltip>

                    <Tooltip text={t('ctx_delete_image')} side="top">
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(image.id); }}
                            className={`p-1.5 rounded-md ${Theme.Colors.TextSubtle} hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all pointer-events-auto`}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </Tooltip>

                    {image.parentId && (
                        <Tooltip text={t('tt_more')} side="top">
                            <button
                                onClick={(e) => { e.stopPropagation(); onRetry?.(image.id); }}
                                className={`p-1.5 rounded-md ${Theme.Colors.TextSubtle} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all pointer-events-auto`}
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        </Tooltip>
                    )}
                </div>
            </div>

            <div
                className={`relative ${Theme.Colors.PanelBg} overflow-hidden ${isSelected ? 'ring-1 ring-black dark:ring-white' : ''}`}
                style={{ height: image.height * zoom }}
            >
                {/* Skeleton Loader */}
                {!isLoaded && (
                    <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-6 ${Theme.Colors.SurfaceSubtle}`}>
                        <div className="w-full max-w-[100px] flex flex-col gap-2">
                            <div className="h-0.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-zinc-400 dark:bg-zinc-600 animate-[loading_2s_ease-in-out_infinite]" />
                            </div>
                        </div>
                    </div>
                )}

                {(isVisible || image.isGenerating) ? (
                    <img
                        src={currentSrc}
                        alt={image.title}
                        onLoad={() => setIsLoaded(true)}
                        loading="lazy"
                        decoding="async"
                        className={`w-full h-full object-cover pointer-events-none block transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                        style={{ imageRendering: zoom > 1.5 ? 'pixelated' : 'auto' }}
                    />
                ) : (
                    <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900/50" />
                )}

                {/* Editor Overlay - Only render if selected OR has existing annotations to show */}
                {!image.isGenerating && onUpdateAnnotations && editorState && (isSelected || (image.annotations && image.annotations.length > 0)) && (
                    <div className="absolute inset-0 z-10">
                        <EditorCanvas
                            width={image.width}
                            height={image.height}
                            imageSrc={image.src}
                            annotations={image.annotations || []}
                            onChange={(anns) => onUpdateAnnotations(image.id, anns)}
                            brushSize={editorState.brushSize}
                            activeTab={editorState.mode}
                            isActive={isSelected}
                            onEditStart={onEditStart}
                            onContextMenu={(e) => onContextMenu?.(e, image.id)}
                            t={t}
                        />
                    </div>
                )}

                {image.isGenerating && (
                    <ProcessingOverlay
                        startTime={image.generationStartTime}
                        duration={image.estimatedDuration || getDurationForQuality(image.quality)}
                        t={t}
                    />
                )}
            </div>

            {
                isSelected && (
                    <>
                        {/* Edge Navigation Icons - Hide when zoomed out (more than ~2-3 images visible) */}
                        <div className="absolute inset-0 pointer-events-none">
                            {hasLeft && zoom > 0.4 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onNavigate?.(-1, image.id); }}
                                    className={`${navIconBtnClass} left-0 top-1/2 -translate-y-1/2 -translate-x-14`}
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                            )}
                            {hasRight && zoom > 0.4 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onNavigate?.(1, image.id); }}
                                    className={`${navIconBtnClass} right-0 top-1/2 -translate-y-1/2 translate-x-14`}
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            )}
                        </div>
                    </>
                )
            }
        </div >
    );
});

ImageItem.displayName = 'ImageItem';
