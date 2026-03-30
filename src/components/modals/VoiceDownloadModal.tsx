import React from 'react';
import { Button, Theme, Typo } from '@/components/ui/DesignSystem';
import { Download, X } from 'lucide-react';

interface VoiceDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDownload: () => void;
    imageName: string;
    lang: 'de' | 'en';
}

export const VoiceDownloadModal: React.FC<VoiceDownloadModalProps> = ({ isOpen, onClose, onDownload, imageName, lang }) => {
    if (!isOpen) return null;

    const handleDownload = () => {
        onDownload();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className={`relative w-full max-w-sm mx-4 ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusXl} ${Theme.Effects.ShadowLg} p-8 flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-200`}>
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Download className="w-5 h-5 text-zinc-500" />
                </div>

                <div className="text-center">
                    <h3 className={`${Typo.H4} mb-1`}>
                        {lang === 'de' ? 'Bild herunterladen' : 'Download image'}
                    </h3>
                    <p className={`${Typo.Body} text-sm text-zinc-500 truncate max-w-[280px]`}>
                        {imageName}
                    </p>
                </div>

                <Button
                    variant="primary-mono"
                    size="l"
                    onClick={handleDownload}
                    icon={<Download className="w-5 h-5" />}
                    className="w-full"
                >
                    {lang === 'de' ? 'Herunterladen' : 'Download'}
                </Button>
            </div>
        </div>
    );
};
