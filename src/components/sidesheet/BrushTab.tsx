
import React from 'react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { TranslationFunction } from '@/types';
import { Pen, Type } from 'lucide-react';

interface BrushTabProps {
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    maskTool: 'brush' | 'text';
    onMaskToolChange: (tool: 'brush' | 'text') => void;
    t: TranslationFunction;
}

export const BrushTab: React.FC<BrushTabProps> = ({
    brushSize, onBrushSizeChange, maskTool, onMaskToolChange, t
}) => {
    return (
        <div className="px-6 py-6 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
            {/* Tool Toggle */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
                <button
                    onClick={() => onMaskToolChange('brush')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${maskTool === 'brush'
                            ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                >
                    <Pen className="w-4 h-4" />
                    <span className={Typo.Label}>Pinsel</span>
                </button>
                <button
                    onClick={() => onMaskToolChange('text')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${maskTool === 'text'
                            ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                >
                    <Type className="w-4 h-4" />
                    <span className={Typo.Label}>Text</span>
                </button>
            </div>

            {/* Brush Size - Only show for brush */}
            {maskTool === 'brush' && (
                <div className="space-y-4 animate-in fade-in duration-300">
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
            )}

            <div className={`px-4 py-8 ${Typo.Micro} text-zinc-600 text-center leading-relaxed h-24 flex items-center justify-center`}>
                {maskTool === 'brush'
                    ? t('brush_hint')
                    : "Klicke auf das Bild, um eine Text-Anmerkung direkt an einer Position zu platzieren."
                }
            </div>
        </div>
    );
};
