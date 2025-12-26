
import React from 'react';
import { Typo } from '@/components/ui/DesignSystem';
import { TranslationFunction } from '@/types';

interface BrushTabProps {
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    t: TranslationFunction;
}

export const BrushTab: React.FC<BrushTabProps> = ({ brushSize, onBrushSizeChange, t }) => {
    return (
        <div className="px-6 py-6 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className={Typo.Label}>{t('brush_size')}</label>
                    <span className={Typo.Mono}>{brushSize}px</span>
                </div>
                <div className="relative h-6 flex items-center">
                    <input
                        type="range"
                        min="20" max="600"
                        value={brushSize}
                        onChange={(e) => onBrushSizeChange(Number(e.target.value))}
                        className="w-full h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black dark:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                    />
                </div>
            </div>
            <div className={`px-4 py-8 ${Typo.Micro} text-zinc-600 text-center leading-relaxed`}>
                {t('brush_hint')}
            </div>
        </div>
    );
};
