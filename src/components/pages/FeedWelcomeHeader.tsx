import React from 'react';
import { Upload, ImagePlus } from 'lucide-react';
import { Typo, Button } from '@/components/ui/DesignSystem';

interface Props {
    onUpload?: (files?: FileList) => void;
    onGenerate?: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    t?: (key: string) => string;
}

export const FeedWelcomeHeader: React.FC<Props> = ({ onUpload, onGenerate, fileInputRef }) => (
    <div className="px-4 sm:px-8 mt-4 sm:mt-6 mb-4 sm:mb-6">
        <div className="flex flex-col gap-5">
            <h2 className={`${Typo.Mono} text-4xl sm:text-5xl font-normal text-zinc-900 dark:text-white leading-tight`}>
                Start with an image.<br />See where it goes.
            </h2>
            <div className="flex flex-row gap-2">
                <Button variant="secondary" size="l" icon={<Upload className="w-5 h-5" />} onClick={() => fileInputRef.current?.click()}>Hochladen</Button>
                <Button variant="primary" size="l" icon={<ImagePlus className="w-5 h-5" />} onClick={onGenerate}>Generieren</Button>
            </div>
        </div>
    </div>
);
