import React, { useState, useEffect } from 'react';
import { CanvasImage, TranslationFunction } from '@/types';
import { Copy, Check as CheckIcon, X } from 'lucide-react';
import { Typo, Theme, Tooltip, IconButton } from '@/components/ui/DesignSystem';
import { useToast } from '@/components/ui/Toast';

interface ImageInfoModalProps {
    image: CanvasImage;
    onClose: () => void;
    t: TranslationFunction;
    currentLang?: 'de' | 'en';
}

export const ImageInfoModal: React.FC<ImageInfoModalProps> = ({
    image,
    onClose,
    t,
    currentLang = 'de'
}) => {
    const { showToast } = useToast();
    const [actualDimensions, setActualDimensions] = useState<{ width: number; height: number } | null>(null);

    // Read actual image dimensions from the loaded image
    useEffect(() => {
        if (image.src) {
            const img = new Image();
            img.onload = () => {
                setActualDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.src = image.src;
        }
    }, [image.src]);

    const handleCopyPrompt = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (image.generationPrompt) {
            navigator.clipboard.writeText(image.generationPrompt);
            showToast(t('copied_to_clipboard') || 'Copied to clipboard', 'success');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Body - Styled like SideSheet */}
            <div className={`
                relative bg-white dark:bg-zinc-900
                rounded-xl shadow-2xl max-w-lg w-full p-8
                border border-zinc-200 dark:border-zinc-800
                flex flex-col gap-8 animate-in zoom-in-95 duration-200
            `}>
                {/* 0. Section Title: Info */}
                <div className="flex items-center justify-between">
                    <h2 className={`${Typo.H2} text-zinc-900 dark:text-zinc-100`}>
                        Info
                    </h2>
                    <IconButton
                        icon={<X className="w-5 h-5" />}
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    />
                </div>

                {/* 1. Prompt Section - First */}
                {image.generationPrompt && (
                    <div className="flex flex-col gap-2 group">
                        <span className={`${Typo.Body} text-zinc-400 text-xs uppercase tracking-wider`}>
                            {t('prompt') || 'Prompt'}
                        </span>
                        <Tooltip text={currentLang === 'de' ? 'Prompt kopieren' : 'Copy prompt'}>
                            <div
                                onClick={handleCopyPrompt}
                                className={`
                                    bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800
                                    ${Typo.Mono} text-zinc-600 dark:text-zinc-300 text-xs leading-relaxed 
                                    max-h-48 overflow-y-auto cursor-pointer 
                                    hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors
                                    group/prompt relative
                                `}
                            >
                                {image.generationPrompt}
                                <div className="absolute top-2 right-2 opacity-0 group-hover/prompt:opacity-100 transition-opacity">
                                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                </div>
                            </div>
                        </Tooltip>
                    </div>
                )}

                {/* 2. Metadata Grid */}
                <div className="grid grid-cols-[max-content_1fr] items-baseline gap-x-8 gap-y-4">
                    {/* Filename */}
                    <span className={`${Typo.Body} text-zinc-400 text-xs`}>{t('filename') || 'Dateiname'}</span>
                    <span className={`${Typo.Mono} text-black dark:text-white text-xs truncate select-all`}>
                        {image.title || 'Untitled'}_v{image.version || 1}
                    </span>

                    {/* Created At */}
                    <span className={`${Typo.Body} text-zinc-400 text-xs`}>{t('created') || 'Erstellt'}</span>
                    <span className={`${Typo.Mono} text-zinc-500 dark:text-zinc-400 text-xs`}>
                        {image.createdAt ? (() => {
                            const d = new Date(image.createdAt);
                            return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                        })() : '-'}
                    </span>

                    {/* Model */}
                    <span className={`${Typo.Body} text-zinc-400 text-xs`}>{t('model') || 'Modell'}</span>
                    <span className={`${Typo.Mono} text-zinc-500 dark:text-zinc-400 text-xs`}>
                        {image.quality === 'pro-4k' ? 'Nano Banana Pro 4K' :
                            image.quality === 'pro-2k' ? 'Nano Banana Pro 2K' :
                                image.quality === 'pro-1k' ? 'Nano Banana Pro 1K' :
                                    image.quality === 'fast' ? 'Nano Banana (Fast)' :
                                        (image.modelVersion || 'Nano Banana')}
                    </span>

                    {/* Resolution */}
                    <span className={`${Typo.Body} text-zinc-400 text-xs`}>{t('dimensions') || 'Auflösung'}</span>
                    <span className={`${Typo.Mono} text-zinc-500 dark:text-zinc-400 text-xs`}>
                        {actualDimensions
                            ? `${actualDimensions.width} × ${actualDimensions.height}px`
                            : image.realWidth && image.realHeight
                                ? `${image.realWidth} × ${image.realHeight}px`
                                : image.quality === 'pro-4k' ? '4096 × 4096px'
                                    : image.quality === 'pro-2k' ? '2048 × 2048px'
                                        : '1024 × 1024px'}
                    </span>
                </div>

            </div>
        </div>
    );
};
