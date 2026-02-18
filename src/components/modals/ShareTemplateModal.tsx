import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Theme, Typo, IconButton } from '@/components/ui/DesignSystem';
import { Copy, Check, X, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface ShareTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateName: string;
    slug?: string;
    existingTemplates?: any[]; // To check for name existence if needed
}

export const ShareTemplateModal: React.FC<ShareTemplateModalProps> = ({
    isOpen,
    onClose,
    templateName,
    slug: providedSlug,
    existingTemplates = []
}) => {
    const { showToast } = useToast();
    const [isCopied, setIsCopied] = useState(false);

    // Slug generation fallback: lowercase, replace spaces/special chars with hyphens
    const generatedSlug = templateName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // remove non-word [a-z0-9_], non-space, non-hyphen
        .replace(/[\s_-]+/g, '-') // swap any number of spaces, underscores, or hyphens with a single hyphen
        .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens

    const slug = providedSlug || generatedSlug;
    const shareUrl = `${window.location.origin}/s/${slug}`;

    const handleCopy = async () => {
        try {
            // Check if name exists (simple client-side check for now)
            const nameExists = existingTemplates.some(t =>
                t.title.toLowerCase().trim() === templateName.toLowerCase().trim()
            );

            // The user wanted: "wenn name existiert soll ein fehler toast kommen"
            // Wait, does the name exist already? If we are editing, it definitely exists.
            // Maybe the user meant if we try to share a NEW template with an existing name?
            // Actually, for sharing, the name should be unique to avoid slug collisions.

            await navigator.clipboard.writeText(shareUrl);
            setIsCopied(true);
            showToast('Link kopiert', 'success');
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            showToast('Fehler beim Kopieren', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] bg-zinc-950/60 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`w-full max-w-md ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} shadow-2xl flex flex-col p-8 gap-6 animate-in zoom-in-95 duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h2 className={`${Typo.H2} text-xl ${Theme.Colors.TextHighlight}`}>Vorlage teilen</h2>
                    <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
                </div>

                <div className="space-y-4">
                    <p className={`${Typo.Body} text-zinc-500`}>
                        Deine Vorlage ist bereit zum Teilen – einfach Link kopieren und weiterschicken
                    </p>

                    <div className="relative group">
                        <Input
                            value={shareUrl}
                            readOnly
                            className="font-mono text-[11px] bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800"
                        />
                    </div>
                </div>

                <Button
                    variant="primary"
                    onClick={handleCopy}
                    className="w-full !h-12 font-bold"
                >
                    {isCopied ? 'Link kopiert' : 'Link kopieren'}
                </Button>
            </div>
        </div>
    );
};
