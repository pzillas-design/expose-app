import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/DesignSystem';
import { Download } from 'lucide-react';

interface VoiceDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDownload: () => void;
    imageName: string;
    lang: 'de' | 'en';
}

export const VoiceDownloadModal: React.FC<VoiceDownloadModalProps> = ({ isOpen, onClose, onDownload, imageName }) => {
    const handleDownload = () => {
        onDownload();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Download ${imageName}`}
            maxWidth="sm"
        >
            <div className="px-6 pb-6 pt-2">
                <Button
                    variant="primary-mono"
                    size="l"
                    onClick={handleDownload}
                    icon={<Download className="w-5 h-5" />}
                    className="w-full"
                >
                    Download
                </Button>
            </div>
        </Modal>
    );
};
