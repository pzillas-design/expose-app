import React, { useState, useEffect } from 'react';
import { CanvasImage, TranslationFunction } from '@/types';
import { Copy, Edit2, RotateCcw, Check as CheckIcon } from 'lucide-react';
import { Typo, Theme, Tooltip, IconButton, Button } from '@/components/ui/DesignSystem';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface ImageInfoModalProps {
    image: CanvasImage;
    onClose: () => void;
    onUpdateImageTitle?: (id: string, title: string) => void;
    onGenerateMore?: (id: string) => void;
    t: TranslationFunction;
    currentLang?: 'de' | 'en';
}

export const ImageInfoModal: React.FC<ImageInfoModalProps> = ({
    image,
    onClose,
    onUpdateImageTitle,
    onGenerateMore,
    t,
    currentLang = 'de'
}) => {
    const { showToast } = useToast();
    const [actualDimensions, setActualDimensions] = useState<{ width: number; height: number } | null>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleValue, setEditTitleValue] = useState(image.title || '');

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
        <Modal isOpen={true} onClose={onClose} title="Info">
            <div className="p-8 flex flex-col gap-10">
                {/* 1. Prompt Section - First */}
                {image.generationPrompt && (
                    <div className="flex flex-col gap-2 group">
                        <span className={`${Typo.Body} text-zinc-400 text-[10px] uppercase tracking-wider`}>
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
                <div className="grid grid-cols-[max-content_1fr] items-baseline gap-x-12 gap-y-4">
                    {/* Filename with Rename Support */}
                    <span className={`${Typo.Body} text-zinc-400 text-xs`}>{t('filename') || 'Dateiname'}</span>
                    <div className="group/title min-w-0 w-full">
                        {!isEditingTitle ? (
                            <div className="flex items-center gap-2 cursor-pointer group/text" onClick={() => {
                                setEditTitleValue(image.title || '');
                                setIsEditingTitle(true);
                            }}>
                                <span className={`${Typo.Mono} text-black dark:text-white text-xs truncate select-all`}>
                                    {image.title || 'Untitled'}_v{image.version || 1}
                                </span>
                                <Edit2 className="w-3 h-3 text-zinc-400 opacity-0 group-hover/text:opacity-100 transition-opacity" />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 w-full">
                                <input
                                    autoFocus
                                    className={`
                                        flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 
                                        rounded px-2 py-1 outline-none ${Typo.Mono} text-xs text-black dark:text-white 
                                        focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors w-full
                                    `}
                                    value={editTitleValue}
                                    onChange={(e) => setEditTitleValue(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') {
                                            if (onUpdateImageTitle) onUpdateImageTitle(image.id, editTitleValue);
                                            setIsEditingTitle(false);
                                        }
                                        if (e.key === 'Escape') {
                                            setEditTitleValue(image.title || '');
                                            setIsEditingTitle(false);
                                        }
                                    }}
                                />
                                <IconButton
                                    icon={<CheckIcon className="w-3 h-3" />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onUpdateImageTitle) onUpdateImageTitle(image.id, editTitleValue);
                                        setIsEditingTitle(false);
                                    }}
                                    className="bg-zinc-100 dark:bg-zinc-800 h-6 w-6 shrink-0"
                                />
                            </div>
                        )}
                    </div>

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

                {/* 3. Actions */}
                {onGenerateMore && image.parentId && (
                    <div className="flex flex-col pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                onGenerateMore(image.id);
                                onClose();
                            }}
                            className="justify-start px-4 gap-3"
                        >
                            <RotateCcw className="w-4 h-4 text-zinc-400" />
                            <span className={`${Typo.Label} uppercase tracking-wider text-zinc-600 dark:text-zinc-300`}>
                                {t('ctx_create_variations') || 'Mehr generieren'}
                            </span>
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};
