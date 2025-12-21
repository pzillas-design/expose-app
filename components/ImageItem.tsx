
import React, { memo, useEffect, useState } from 'react';
import { CanvasImage, AnnotationObject, TranslationFunction, GenerationQuality } from '../types';
import { Plus, Download, ChevronLeft, ChevronRight, RefreshCcw } from 'lucide-react';
import { EditorCanvas } from './EditorCanvas';
import { Tooltip, Typo, Theme } from './ui/DesignSystem';

interface ImageItemProps {
    image: CanvasImage;
    isSelected: boolean;
    zoom: number;
    onMouseDown: (e: React.MouseEvent, id: string) => void;
    onRetry?: (id: string) => void;
    onChangePrompt?: (id: string) => void;
    editorState?: {
        mode: 'prompt' | 'brush' | 'objects';
        brushSize: number;
    };
    onUpdateAnnotations?: (id: string, anns: AnnotationObject[]) => void;
    onEditStart?: (mode: 'brush' | 'objects') => void;

    // Navigation Props
    onNavigate?: (direction: -1 | 1) => void,
    hasLeft?: boolean,
    hasRight?: boolean,

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
    zoom,
    onMouseDown,
    onRetry,
    editorState,
    onUpdateAnnotations,
    onEditStart,
    onNavigate,
    hasLeft,
    hasRight,
    t
}) => {
    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = image.src;
        link.download = `${image.title}.png`;
        link.click();
    };

    // Unified Base styles for consistency
    const baseGlass = `${Theme.Effects.Glass} border ${Theme.Colors.Border} rounded-lg shadow-sm`;
    const hoverStyle = "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors";

    // Navigation Button specific: Ghost by default, Frame on hover
    const navIconBtnClass = `absolute flex items-center justify-center w-10 h-10 transition-all duration-200 text-zinc-400 hover:text-black dark:text-zinc-500 dark:hover:text-white rounded-xl hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 pointer-events-auto z-[60]`;

    // Action Button specific: Inside container, Height 100% of container, No Radius (handled by parent overflow)
    const actionBtnClass = `flex items-center gap-2 px-4 h-full ${hoverStyle} shrink-0 rounded-none`;

    return (
        <div
            data-image-id={image.id}
            className={`relative shrink-0 select-none group transition-opacity duration-200 snap-center will-change-transform ${isSelected
                ? 'z-20 opacity-100'
                : 'z-0 opacity-70 hover:opacity-100'
                }`}
            style={{
                width: image.width * zoom,
                scrollSnapStop: 'always',
            }}
            onMouseDown={(e) => onMouseDown(e, image.id)}
        >
            {/* Top Toolbar: Filename + Action Icons */}
            <div className="flex items-center justify-between w-full mb-1.5 px-0.5 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`${Typo.Label} ${Theme.Colors.TextSecondary} truncate tracking-wider uppercase text-[10px]`} title={image.title}>
                        {image.title}
                    </span>

                    {isSelected && (
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                            <Tooltip text={t('tt_more')} side="top">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRetry?.(image.id); }}
                                    className="p-1 rounded-md text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all pointer-events-auto"
                                >
                                    <RefreshCcw className="w-3.5 h-3.5" />
                                </button>
                            </Tooltip>

                            <Tooltip text={t('tt_save')} side="top">
                                <button
                                    onClick={handleDownload}
                                    className="p-1 rounded-md text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all pointer-events-auto"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </button>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>

            <div
                className={`relative ${Theme.Colors.PanelBg} overflow-hidden ${isSelected ? 'ring-1 ring-black dark:ring-white' : ''}`}
                style={{ height: image.height * zoom }}
            >
                <img
                    src={image.maskSrc || image.src}
                    alt={image.title}
                    className="w-full h-full object-cover pointer-events-none block"
                />

                {/* Editor Overlay */}
                {!image.isGenerating && onUpdateAnnotations && editorState && (
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
                            t={t}
                        />
                    </div>
                )}

                {image.isGenerating && (
                    <ProcessingOverlay
                        startTime={image.generationStartTime}
                        duration={getDurationForQuality(image.quality)}
                        t={t}
                    />
                )}
            </div>

            {isSelected && (
                <>
                    {/* Edge Navigation Icons */}
                    <div className="absolute inset-0 pointer-events-none">
                        {hasLeft && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onNavigate?.(-1); }}
                                className={`${navIconBtnClass} left-0 top-1/2 -translate-y-1/2 -translate-x-14`}
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        )}
                        {hasRight && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onNavigate?.(1); }}
                                className={`${navIconBtnClass} right-0 top-1/2 -translate-y-1/2 translate-x-14`}
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
});

ImageItem.displayName = 'ImageItem';
