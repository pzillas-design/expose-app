import React, { useState, useEffect } from 'react';
import { CanvasImage, TranslationFunction } from '@/types';
import { Edit2, Check as CheckIcon, Copy } from 'lucide-react';
import { Typo, IconButton } from '@/components/ui/DesignSystem';
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
    t,
    currentLang = 'de'
}) => {
    const { showToast } = useToast();
    const [actualDimensions, setActualDimensions] = useState<{ width: number; height: number } | null>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleValue, setEditTitleValue] = useState(image.title || '');
    const [promptHovered, setPromptHovered] = useState(false);

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
            showToast(t('copied_to_clipboard') || 'Kopiert', 'success');
        }
    };

    const labelClass = `${Typo.Body} text-zinc-400 text-xs`;
    const valueClass = `${Typo.Mono} text-zinc-500 dark:text-zinc-400 text-xs`;

    return (
        <Modal isOpen={true} onClose={onClose} title="Info">
            <div className="p-8 flex flex-col gap-4">
                <div className="grid grid-cols-[max-content_1fr] items-baseline gap-x-12 gap-y-4">

                    {/* Filename with Rename Support */}
                    <span className={labelClass}>{t('filename') || 'Dateiname'}</span>
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
                    <span className={labelClass}>{t('created') || 'Erstellt'}</span>
                    <span className={valueClass}>
                        {image.createdAt ? (() => {
                            const d = new Date(image.createdAt);
                            return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                        })() : '-'}
                    </span>

                    {/* Model */}
                    <span className={labelClass}>{t('model')}</span>
                    <span className={valueClass}>
                        {image.quality === 'pro-4k' ? 'Nano Banana Pro 4K' :
                            image.quality === 'pro-2k' ? 'Nano Banana Pro 2K' :
                                image.quality === 'pro-1k' ? 'Nano Banana Pro 1K' :
                                    image.quality === 'fast' ? 'Nano Banana (Fast)' :
                                        (image.modelVersion || 'Nano Banana')}
                    </span>

                    {/* Resolution */}
                    <span className={labelClass}>{t('dimensions') || 'Auflösung'}</span>
                    <span className={valueClass}>
                        {actualDimensions
                            ? `${actualDimensions.width} × ${actualDimensions.height}px`
                            : image.realWidth && image.realHeight
                                ? `${image.realWidth} × ${image.realHeight}px`
                                : image.quality === 'pro-4k' ? '4096 × 4096px'
                                    : image.quality === 'pro-2k' ? '2048 × 2048px'
                                        : '1024 × 1024px'}
                    </span>

                    {/* Prompt — read-only, inline with other fields, copy on hover */}
                    {image.generationPrompt && (
                        <>
                            <span className={`${labelClass} self-start pt-0.5`}>{t('prompt') || 'Prompt'}</span>
                            <div
                                className="relative min-w-0 cursor-pointer group/prompt"
                                onMouseEnter={() => setPromptHovered(true)}
                                onMouseLeave={() => setPromptHovered(false)}
                                onClick={handleCopyPrompt}
                            >
                                <span className={`${valueClass} leading-relaxed break-words whitespace-pre-wrap line-clamp-4`}>
                                    {image.generationPrompt}
                                </span>
                                {promptHovered && (
                                    <span className="absolute -top-6 left-0 flex items-center gap-1 bg-zinc-800 dark:bg-zinc-700 text-white text-[10px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap">
                                        <Copy className="w-2.5 h-2.5" />
                                        {currentLang === 'de' ? 'Kopieren' : 'Copy'}
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};
