import React from 'react';
import { X, Image as ImageIcon, Sparkles, Clock, Layers } from 'lucide-react';
import { CanvasImage, TranslationFunction } from '@/types';
import { Typo, Theme } from '@/components/ui/DesignSystem';

interface ImageInfoModalProps {
    image: CanvasImage;
    onClose: () => void;
    t: TranslationFunction;
}

export const ImageInfoModal: React.FC<ImageInfoModalProps> = ({ image, onClose, t }) => {
    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-zinc-400" />
                        <h2 className={`${Typo.H3} ${Theme.Colors.TextPrimary}`}>
                            {t('image_info') || 'Image Info'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {/* Filename */}
                    <InfoRow
                        icon={<ImageIcon className="w-4 h-4" />}
                        label={t('filename') || 'Filename'}
                        value={`${image.title || 'Untitled'}.jpg`}
                    />

                    {/* Dimensions */}
                    <InfoRow
                        icon={<Layers className="w-4 h-4" />}
                        label={t('dimensions') || 'Dimensions'}
                        value={`${image.realWidth || image.width} × ${image.realHeight || image.height}px`}
                    />

                    {/* Quality */}
                    {image.quality && (
                        <InfoRow
                            icon={<Sparkles className="w-4 h-4" />}
                            label={t('quality') || 'Quality'}
                            value={image.quality}
                        />
                    )}

                    {/* Created */}
                    {image.createdAt && (
                        <InfoRow
                            icon={<Clock className="w-4 h-4" />}
                            label={t('created') || 'Created'}
                            value={formatDate(image.createdAt)}
                        />
                    )}

                    {/* Prompt */}
                    {image.generationPrompt && (
                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                            <div className={`${Typo.Label} ${Theme.Colors.TextSecondary} mb-2`}>
                                {t('prompt') || 'Prompt'}
                            </div>
                            <div className={`${Typo.Body} ${Theme.Colors.TextPrimary} text-sm leading-relaxed`}>
                                {image.generationPrompt}
                            </div>
                        </div>
                    )}

                    {/* User Draft Prompt */}
                    {image.userDraftPrompt && (
                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                            <div className={`${Typo.Label} ${Theme.Colors.TextSecondary} mb-2`}>
                                {t('user_prompt') || 'User Prompt'}
                            </div>
                            <div className={`${Typo.Body} ${Theme.Colors.TextPrimary} text-sm leading-relaxed`}>
                                {image.userDraftPrompt}
                            </div>
                        </div>
                    )}

                    {/* Parent Info */}
                    {image.parentId && (
                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                            <div className={`${Typo.Label} ${Theme.Colors.TextSecondary} mb-2`}>
                                {t('parent_image') || 'Parent Image'}
                            </div>
                            <div className={`${Typo.Body} ${Theme.Colors.TextPrimary} text-sm font-mono`}>
                                {image.parentId.slice(0, 8)}...
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-start gap-3">
        <div className="mt-0.5 text-zinc-400">
            {icon}
        </div>
        <div className="flex-1">
            <div className={`${Typo.Label} ${Theme.Colors.TextSecondary} mb-1 text-xs uppercase tracking-wide`}>
                {label}
            </div>
            <div className={`${Typo.Body} ${Theme.Colors.TextPrimary}`}>
                {value}
            </div>
        </div>
    </div>
);
