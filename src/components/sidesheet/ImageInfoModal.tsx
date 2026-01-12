import React, { useState } from 'react';
import { CanvasImage, TranslationFunction } from '@/types';
import { Copy, RotateCcw, Download, Edit2, Check as CheckIcon, ChevronRight } from 'lucide-react';
import { Button, IconButton, Typo, Theme, Tooltip } from '@/components/ui/DesignSystem';
import { useToast } from '@/components/ui/Toast';
import { downloadImage } from '@/utils/imageUtils';

interface ImageInfoModalProps {
    image: CanvasImage;
    t: TranslationFunction;
    onClose: () => void;
    onGenerateMore: (id: string) => void;
    onUpdateImageTitle?: (id: string, title: string) => void;
    onNavigateParent?: (id: string) => void;
    currentLang: 'de' | 'en';
}

export const ImageInfoModal: React.FC<ImageInfoModalProps> = ({
    image,
    t,
    onClose,
    onGenerateMore,
    onUpdateImageTitle,
    onNavigateParent,
    currentLang
}) => {
    const { showToast } = useToast();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleValue, setEditTitleValue] = useState(image.title || '');

    if (!image) return null;

    const handleCopyPrompt = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (image.generationPrompt) {
            navigator.clipboard.writeText(image.generationPrompt);
            showToast(t('copied_to_clipboard') || 'Copied to clipboard', 'success');
        }
    };

    return (
        <div
            className="absolute top-14 right-0 left-0 px-2.5 z-40 animate-in fade-in slide-in-from-top-2 duration-200"
            onClick={(e) => e.stopPropagation()}
        >
            {/* The "Zipfel" (Arrow) - Positioned to point at the Info icon */}
            <div className="absolute -top-1.5 right-[22px] w-3 h-3 bg-white dark:bg-zinc-900 border-l border-t border-zinc-200 dark:border-zinc-800 rotate-45 z-50" />

            {/* Modal Body */}
            <div className={`
                relative bg-white dark:bg-zinc-900 
                border border-zinc-200 dark:border-zinc-800 
                rounded-md shadow-2xl overflow-hidden flex flex-col gap-8 p-6
            `}>
                {/* 0. Section Title: Info */}
                <span className={`${Typo.H2} text-zinc-900 dark:text-zinc-100`}>
                    Info
                </span>

                {/* 1. Filename/Title (Editable Input) */}
                <div className="flex flex-col gap-1.5 col-span-2 group/title">
                    <span className={`${Typo.Body} text-zinc-400 text-[10px]`}>
                        {t('filename')}
                    </span>
                    <div className="flex items-center gap-2">
                        <input
                            className={`
                                flex-1 bg-zinc-50 dark:bg-zinc-800/50 
                                border border-zinc-200 dark:border-zinc-700 
                                rounded-lg px-3 py-2
                                outline-none 
                                ${Typo.Mono} text-sm text-black dark:text-white 
                                focus:border-zinc-400 dark:focus:border-zinc-500
                                transition-colors
                            `}
                            value={editTitleValue}
                            onChange={(e) => {
                                setEditTitleValue(e.target.value);
                                onUpdateImageTitle?.(image.id, e.target.value);
                            }}
                            placeholder="Untitled"
                        />
                    </div>
                </div>

                {/* 2. Prompt Section */}
                {image.generationPrompt && (
                    <div className="flex flex-col gap-1.5 group">
                        <span className={`${Typo.Body} text-zinc-400 text-xs`}>
                            {t('tt_prompt')}
                        </span>
                        <Tooltip text={currentLang === 'de' ? 'Prompt kopieren' : 'Copy prompt'}>
                            <p
                                onClick={handleCopyPrompt}
                                className={`${Typo.Mono} text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed max-h-32 overflow-y-auto no-scrollbar cursor-pointer hover:text-black dark:hover:text-white transition-colors`}
                            >
                                {image.generationPrompt}
                            </p>
                        </Tooltip>
                    </div>
                )}

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-8">

                    {/* Resolution */}
                    <div className="flex flex-col gap-1.5">
                        <span className={`${Typo.Body} text-zinc-400 text-xs`}>
                            {t('resolution')}
                        </span>
                        <span className={`${Typo.Mono} text-zinc-500 dark:text-zinc-400 text-xs`}>
                            {image.realWidth && image.realHeight
                                ? `${image.realWidth} × ${image.realHeight}px`
                                : image.quality === 'pro-4k' ? '4096 × 4096px'
                                    : image.quality === 'pro-2k' ? '2048 × 2048px'
                                        : '1024 × 1024px'}
                        </span>
                    </div>

                    {/* Created At */}
                    <div className="flex flex-col gap-1.5">
                        <span className={`${Typo.Body} text-zinc-400 text-xs`}>
                            {t('created_at')}
                        </span>
                        <span className={`${Typo.Mono} text-zinc-500 dark:text-zinc-400 text-xs`}>
                            {image.createdAt ? (() => {
                                const d = new Date(image.createdAt);
                                return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                            })() : '-'}
                        </span>
                    </div>

                    {/* Model */}
                    {image.quality && (
                        <div className="flex flex-col gap-1.5">
                            <span className={`${Typo.Body} text-zinc-400 text-xs`}>
                                {t('model')}
                            </span>
                            <span className={`${Typo.Mono} text-zinc-500 dark:text-zinc-400 text-xs`}>
                                {(() => {
                                    switch (image.quality) {
                                        case 'pro-4k': return 'Nano Banana Pro 4K';
                                        case 'pro-2k': return 'Nano Banana Pro 2K';
                                        case 'pro-1k': return 'Nano Banana Pro 1K';
                                        case 'fast': return 'Nano Banana (Fast)';
                                        default: return image.modelVersion || 'Nano Banana';
                                    }
                                })()}
                            </span>
                        </div>
                    )}

                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-4">
                    {image.parentId && (
                        <Button
                            variant="secondary"
                            onClick={() => onGenerateMore(image.id)}
                            disabled={image.isGenerating}
                            className="justify-start px-4 h-11 gap-3 shadow-none"
                        >
                            <RotateCcw className="w-4 h-4 text-zinc-400" />
                            <span className={`${Typo.Label} uppercase tracking-wider text-zinc-600 dark:text-zinc-300`}>
                                {t('ctx_create_variations')}
                            </span>
                        </Button>
                    )}

                    <Button
                        variant="secondary"
                        onClick={() => image.src && downloadImage(image.src, image.title || image.id)}
                        disabled={image.isGenerating}
                        className="justify-start px-4 h-11 gap-3 shadow-none"
                    >
                        <Download className="w-4 h-4 text-zinc-400" />
                        <span className={`${Typo.Label} uppercase tracking-wider text-zinc-600 dark:text-zinc-300`}>
                            {t('tt_download')}
                        </span>
                    </Button>
                </div>
            </div>
        </div>
    );
};
