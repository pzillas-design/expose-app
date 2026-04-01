import React, { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Upload } from 'lucide-react';

interface VoiceUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: FileList) => void;
    lang: 'de' | 'en';
}

export const VoiceUploadModal: React.FC<VoiceUploadModalProps> = ({ isOpen, onClose, onUpload, lang }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const de = lang === 'de';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={de ? 'Bild hochladen' : 'Upload image'}
            maxWidth="sm"
        >
            <div className="px-6 pb-6 pt-2">
                <div
                    className={`w-full aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                        isDragOver
                            ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/20'
                            : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                        if (files.length > 0) {
                            const dt = new DataTransfer();
                            files.forEach(f => dt.items.add(f));
                            onUpload(dt.files);
                            onClose();
                        }
                    }}
                >
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-700 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-zinc-400" />
                    </div>
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                        {de ? 'Bild hierher ziehen oder klicken' : 'Drop image here or click'}
                    </p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files?.length) {
                            onUpload(e.target.files);
                            onClose();
                        }
                        e.target.value = '';
                    }}
                />
            </div>
        </Modal>
    );
};
