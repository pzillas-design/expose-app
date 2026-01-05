
import React, { memo, useEffect, useState, useRef } from 'react';
import { CanvasImage, AnnotationObject, TranslationFunction, GenerationQuality } from '@/types';
import { Download, ChevronLeft, ChevronRight, Trash2, RotateCcw } from 'lucide-react';
import { EditorCanvas } from './EditorCanvas';
import { Tooltip, Typo, Theme } from '@/components/ui/DesignSystem';
import { downloadImage } from '@/utils/imageUtils';
import { AnnotationToolbar } from './AnnotationToolbar';
import { generateId } from '@/utils/ids';
import { storageService } from '@/services/storageService';


interface ImageItemProps {
    image: CanvasImage;
    isSelected: boolean;
    zoom: number;
    hasAnySelection?: boolean;
    onRetry?: (id: string) => void;
    onChangePrompt?: (id: string) => void;
    editorState?: {
        mode: 'prompt' | 'brush' | 'objects';
        brushSize: number;
        maskTool: 'brush' | 'text' | 'shape';
        activeShape?: 'rect' | 'circle' | 'line';
    };
    onUpdateAnnotations?: (id: string, anns: AnnotationObject[]) => void;
    onEditStart?: (mode: 'brush' | 'objects') => void;

    // Navigation Props
    onNavigate?: (direction: -1 | 1, fromId?: string) => void,
    hasLeft?: boolean,
    hasRight?: boolean,
    index?: number;

    onDelete?: (id: string) => void;
    onContextMenu?: (e: React.MouseEvent, id: string) => void;
    editorActions?: {
        setMaskTool: (t: 'brush' | 'text' | 'shape') => void;
        setBrushSize: (s: number) => void;
        setActiveShape: (s: 'rect' | 'circle' | 'line') => void;
    };
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
        case 'fast': return 12000;
        case 'pro-2k': return 36000;
        case 'pro-4k': return 60000;
        case 'pro-1k': default: return 23000;
    }
};

const ImageSource = memo(({ path, src, thumbSrc, maskSrc, zoom, isSelected, title }: { path: string, src: string, thumbSrc?: string, maskSrc?: string, zoom: number, isSelected: boolean, title: string }) => {
    // Start with maskSrc (if editing) or thumbSrc (if available) or nothing (to avoid HD flash)
    const [currentSrc, setCurrentSrc] = useState<string | null>(maskSrc || thumbSrc || null);
    const [isHighRes, setIsHighRes] = useState(zoom >= 1.0);
    const isInitialRef = useRef(true);

    useEffect(() => {
        if (maskSrc) {
            setCurrentSrc(maskSrc);
            return;
        }

        const fetchUrl = async () => {
            if (!path) {
                // Legacy fallback: if no storage path, we must use the original src
                if (src && currentSrc !== src) setCurrentSrc(src);
                return;
            }

            const highRes = isSelected && zoom >= 1.0;
            const url = await storageService.getSignedUrl(path, highRes ? undefined : { width: 800, quality: 75 });
            if (url) {
                setCurrentSrc(url);
                setIsHighRes(highRes);
            }
        };

        // Determine if we need to fetch/switch resolution
        // Switching to HighRes: needs to be selected AND zoom >= 1.0
        // Switching back to LowRes: if zoom drops low OR it's no longer selected
        const shouldSwitchRes = (isSelected && zoom >= 1.0 && !isHighRes) ||
            ((zoom < 0.8 || !isSelected) && isHighRes);

        const needsInitialFetch = !currentSrc && path;

        if (needsInitialFetch || shouldSwitchRes) {
            // No debounce for first load, 500ms debounce for switching
            const delay = (needsInitialFetch && isInitialRef.current) ? 0 : 500;
            const timeout = setTimeout(fetchUrl, delay);
            isInitialRef.current = false;
            return () => clearTimeout(timeout);
        }
    }, [path, zoom, maskSrc, src, thumbSrc, isSelected]);

    return (
        <img
            src={currentSrc || ''}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover pointer-events-none block"
            style={{
                imageRendering: zoom > 1.5 ? 'pixelated' : 'auto',
                filter: !currentSrc ? 'blur(10px)' : 'none',
                transition: 'filter 0.3s ease-out'
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
    editorActions,
    t
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        downloadImage(image.src, image.title);
    };

    const navIconBtnClass = `absolute flex items-center justify-center w-10 h-10 transition-all duration-200 text-zinc-400 hover:text-black dark:text-zinc-500 dark:hover:text-white rounded-full hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 pointer-events-auto z-[60]`;

    const handleAddShape = (type: 'rect' | 'circle' | 'line') => {
        if (!onUpdateAnnotations) return;
        const newId = generateId();
        const cx = image.width / 2;
        const cy = image.height / 2;
        const size = Math.min(image.width, image.height) * 0.3; // 30% size

        let newShape: AnnotationObject;

        if (type === 'line') {
            newShape = {
                id: newId, type: 'shape', shapeType: 'line',
                x: cx - size / 2, y: cy, width: size, height: size,
                points: [{ x: cx - size / 2, y: cy }, { x: cx + size / 2, y: cy }],
                strokeWidth: 4, color: '#fff', createdAt: Date.now()
            };
        } else {
            newShape = {
                id: newId, type: 'shape', shapeType: type,
                x: cx - size / 2, y: cy - size / 2, width: size, height: size,
                points: [],
                strokeWidth: 4, color: '#fff', createdAt: Date.now()
            };
        }
        const existing = image.annotations || [];
        onUpdateAnnotations(image.id, [...existing, newShape]);
    };

    return (
        <div
            ref={containerRef}
            data-image-id={image.id}
            onContextMenu={(e) => onContextMenu?.(e, image.id)}
            className={`relative shrink-0 select-none group transition-opacity duration-200 snap-center will-change-transform ${isSelected
                ? 'z-30'
                : (!hasAnySelection ? 'z-20' : 'z-0 hover:opacity-100')
                } ${hasAnySelection && !isSelected ? 'opacity-70' : 'opacity-100'}`}
            style={{
                width: image.width * zoom,
                scrollSnapStop: 'always',
            }}
        >
            {/* Top Toolbar: Filename + Actions - Only show when zoomed in */}
            {zoom > 0.4 && (
                <div className="flex items-center justify-between w-full h-7 mb-2 px-0.5 animate-in fade-in duration-300 relative z-[60]">
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onDelete?.(image.id);
                                }}
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
            )}

            <div
                className={`relative ${Theme.Colors.PanelBg} overflow-hidden ${isSelected ? 'ring-1 ring-black dark:ring-white' : ''}`}
                style={{ height: image.height * zoom }}
            >
                {/* LOD Image Loading */}
                <ImageSource
                    path={image.storage_path}
                    src={image.src}
                    thumbSrc={image.thumbSrc}
                    maskSrc={image.maskSrc}
                    zoom={zoom}
                    isSelected={isSelected}
                    title={image.title}
                />

                {/* Editor Overlay */}
                {!image.isGenerating && onUpdateAnnotations && editorState && (isSelected || (image.annotations && image.annotations.length > 0)) && (
                    <div className="absolute inset-0 z-10">
                        <EditorCanvas
                            width={image.width}
                            height={image.height}
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

                {image.isGenerating && (
                    <ProcessingOverlay
                        startTime={image.generationStartTime}
                        duration={image.estimatedDuration || getDurationForQuality(image.quality)}
                        t={t}
                    />
                )}
            </div>

            {isSelected && (
                <div className="absolute inset-0 pointer-events-none">
                    {hasLeft && zoom > 1.2 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onNavigate?.(-1, image.id); }}
                            className={`${navIconBtnClass} left-0 top-1/2 -translate-y-1/2 -translate-x-14`}
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    {hasRight && zoom > 1.2 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onNavigate?.(1, image.id); }}
                            className={`${navIconBtnClass} right-0 top-1/2 -translate-y-1/2 translate-x-14`}
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
});

ImageItem.displayName = 'ImageItem';
