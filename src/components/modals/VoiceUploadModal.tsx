import React, { useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Typo } from '@/components/ui/DesignSystem';
import { Upload } from 'lucide-react';

interface VoiceUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: FileList) => void;
    lang: 'de' | 'en';
}

export const VoiceUploadModal: React.FC<VoiceUploadModalProps> = ({ isOpen, onClose, onUpload, lang }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            onUpload(e.target.files);
            onClose();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={lang === 'de' ? 'Bild hochladen' : 'Upload image'}
            maxWidth="sm"
        >
            <div className="px-6 pb-6 pt-4 flex flex-col items-center gap-5">
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-zinc-500" />
                </div>

                <p className={`${Typo.Body} text-sm text-zinc-500 text-center`}>
                    {lang === 'de' ? 'Wähle ein Bild zum Bearbeiten aus.' : 'Choose an image to edit.'}
                </p>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                />

                <Button
                    variant="primary-mono"
                    size="l"
                    onClick={() => fileInputRef.current?.click()}
                    icon={<Upload className="w-5 h-5" />}
                    className="w-full"
                >
                    {lang === 'de' ? 'Datei auswählen' : 'Choose file'}
                </Button>
            </div>
        </Modal>
    );
};
