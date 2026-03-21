import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Theme, Typo, IconButton } from '@/components/ui/DesignSystem';
import { Copy, Check, X, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { slugify } from '@/utils/stringUtils';
import { TranslationFunction } from '@/types';

interface ShareTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateName: string;
    slug?: string;
    existingTemplates?: any[];
    t: TranslationFunction;
}

export const ShareTemplateModal: React.FC<ShareTemplateModalProps> = ({
    isOpen,
    onClose,
    templateName,
    slug: providedSlug,
    existingTemplates = [],
    t
}) => {
    const { showToast } = useToast();
    const [isCopied, setIsCopied] = useState(false);

    const slug = providedSlug;
    const shareUrl = slug ? `${window.location.origin}/s/${slug}` : '';

    const handleCopy = async () => {
        if (!slug) {
            showToast(t('share_error_save_first'), 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(shareUrl);
            setIsCopied(true);
            showToast(t('share_toast_copied'), 'success');
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            showToast(t('share_error_copy'), 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`w-full max-w-md ${Theme.Colors.ModalBg} border border-zinc-900/10 dark:border-zinc-100/10 ${Theme.Geometry.RadiusXl} flex flex-col p-8 gap-6 animate-in zoom-in-95 duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h2 className={Typo.H2}>{t('share_title')}</h2>
                    <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
                </div>

                <div className="space-y-4">
                    <p className={`${Typo.Body} text-zinc-500`}>
                        {slug ? t('share_ready_desc') : t('share_unsaved_desc')}
                    </p>

                    <div className="relative group">
                        <Input
                            value={shareUrl}
                            placeholder={slug ? '' : t('share_placeholder_unsaved')}
                            readOnly
                            className="font-mono text-[11px] bg-zinc-50 dark:bg-black/50 border-zinc-200 dark:border-zinc-800"
                        />
                    </div>
                </div>

                <Button
                    variant="primary"
                    onClick={handleCopy}
                    className="w-full !h-12 font-bold"
                    disabled={!slug}
                >
                    {isCopied ? t('share_copied_btn') : t('share_copy_btn')}
                </Button>
            </div>
        </div>
    );
};
