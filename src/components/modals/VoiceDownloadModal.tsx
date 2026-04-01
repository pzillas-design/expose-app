import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Typo } from '@/components/ui/DesignSystem';
import { Download } from 'lucide-react';

interface VoiceDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDownload: () => void;
    imageName: string;
    lang: 'de' | 'en';
}

export const VoiceDownloadModal: React.FC<VoiceDownloadModalProps> = ({ isOpen, onClose, onDownload, imageName, lang }) => {
    const handleDownload = () => {
        onDownload();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={lang === 'de' ? 'Bild herunterladen' : 'Download image'}
            maxWidth="sm"
        >
            <div className="px-6 pb-6 pt-4 flex flex-col items-center gap-5">
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Download className="w-5 h-5 text-zinc-500" />
                </div>

                <p className={`${Typo.Body} text-sm text-zinc-500 truncate max-w-[280px] text-center`}>
                    {imageName}
                </p>

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
        </Modal>
    );
};
