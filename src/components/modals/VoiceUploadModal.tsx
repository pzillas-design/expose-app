import React, { useRef } from 'react';
import { Button, Theme, Typo } from '@/components/ui/DesignSystem';
import { Upload, X } from 'lucide-react';

interface VoiceUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: FileList) => void;
    lang: 'de' | 'en';
}

export const VoiceUploadModal: React.FC<VoiceUploadModalProps> = ({ isOpen, onClose, onUpload, lang }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            onUpload(e.target.files);
            onClose();
        }
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
                    <Upload className="w-5 h-5 text-zinc-500" />
                </div>

                <div className="text-center">
                    <h3 className={`${Typo.H4} mb-1`}>
                        {lang === 'de' ? 'Bild hochladen' : 'Upload image'}
                    </h3>
                    <p className={`${Typo.Body} text-sm text-zinc-500`}>
                        {lang === 'de' ? 'Wähle ein Bild zum Bearbeiten aus.' : 'Choose an image to edit.'}
                    </p>
                </div>

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
        </div>
    );
};
