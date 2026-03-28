import React, { useState, useEffect } from 'react';
import { CanvasImage, TranslationFunction } from '@/types';
import { Edit2, Check as CheckIcon } from 'lucide-react';
import { Typo, IconButton, Tooltip } from '@/components/ui/DesignSystem';
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

    useEffect(() => {
        if (image.src) {
            const img = new Image();
            img.onload = () => setActualDimensions({ width: img.naturalWidth, height: img.naturalHeight });
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

    // Build variable display: { season: ['winter'] } → "Jahreszeit: Winter"
    const variableEntries = image.variableValues
        ? Object.entries(image.variableValues).filter(([, vals]) => vals && (vals as string[]).length > 0)
        : [];

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
                                    {image.title || 'Untitled'}
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

                    {/* Model - only show for generated images */}
                    {image.generationPrompt && (
                        <>
                            <span className={labelClass}>{t('model')}</span>
                            <span className={valueClass}>
                                {image.quality === 'nb2-4k' ? 'Nano Banana 2 · 4K' :
                                    image.quality === 'nb2-2k' ? 'Nano Banana 2 · 2K' :
                                        image.quality === 'nb2-1k' ? 'Nano Banana 2 · 1K' :
                                            image.quality === 'fast' ? 'Nano Banana (Fast)' :
                                                (image.modelVersion || 'Nano Banana')}
                            </span>
                        </>
                    )}

                    {/* Resolution */}
                    <span className={labelClass}>{t('dimensions') || 'Auflösung'}</span>
                    <span className={valueClass}>
                        {actualDimensions
                            ? `${actualDimensions.width} × ${actualDimensions.height}px`
                            : image.realWidth && image.realHeight
                                ? `${image.realWidth} × ${image.realHeight}px`
                                : image.quality === 'nb2-4k' ? '4096 × 4096px'
                                    : image.quality === 'nb2-2k' ? '2048 × 2048px'
                                        : '1024 × 1024px'}
                    </span>

                    {/* Prompt — variables appended inline, copy on hover via Tooltip */}
                    {image.generationPrompt && (
                        <>
                            <span className={`${labelClass} self-start pt-0.5`}>{t('prompt') || 'Prompt'}</span>
                            <Tooltip text={currentLang === 'de' ? 'Kopieren' : 'Copy'} side="top">
                                <span
                                    className={`${valueClass} leading-relaxed break-words whitespace-pre-wrap line-clamp-4 cursor-pointer`}
                                    onClick={handleCopyPrompt}
                                >
                                    {image.generationPrompt}
                                    {variableEntries.length > 0 && (
                                        <span className="text-zinc-400 dark:text-zinc-500">
                                            {' · '}{variableEntries.map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join(' · ')}
                                        </span>
                                    )}
                                </span>
                            </Tooltip>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};
