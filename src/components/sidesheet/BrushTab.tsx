import React from 'react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory } from '@/types';
import { Pen, Type, Shapes, Square, Circle, Minus } from 'lucide-react';
import { ObjectsTab } from './ObjectsTab';

interface BrushTabProps {
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    maskTool: 'brush' | 'text' | 'shape';
    onMaskToolChange: (tool: 'brush' | 'text' | 'shape') => void;
    activeShape: 'rect' | 'circle' | 'line';
    onActiveShapeChange: (shape: 'rect' | 'circle' | 'line') => void;
    t: TranslationFunction;

    // Objects Props
    currentLang: 'de' | 'en';
    library: LibraryCategory[];
    onAddUserCategory: (label: string) => void;
    onDeleteUserCategory: (id: string) => void;
    onAddUserItem: (catId: string, label: string) => void;
    onDeleteUserItem: (catId: string, itemId: string) => void;
    onAddObject: (label: string, itemId: string) => void;
}

export const BrushTab: React.FC<BrushTabProps> = ({
    brushSize, onBrushSizeChange, maskTool, onMaskToolChange, activeShape, onActiveShapeChange, t,
    currentLang, library, onAddUserCategory, onDeleteUserCategory, onAddUserItem, onDeleteUserItem, onAddObject
}) => {
    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
            <div className="px-5 py-6 space-y-6 shrink-0">
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
                    <button
                        onClick={() => onMaskToolChange('shape')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${maskTool === 'shape'
                            ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        <Shapes className="w-4 h-4" />
                        <span className={Typo.Label}>Formen</span>
                    </button>
                </div>

                {/* Brush Size - On Brush */}
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

                {/* Shape Selector - On Shape Tool */}
                {maskTool === 'shape' && (
                    <div className="grid grid-cols-3 gap-2 animate-in fade-in duration-300">
                        <button
                            onClick={() => onActiveShapeChange('rect')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${activeShape === 'rect' ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-800' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                        >
                            <Square className="w-6 h-6" />
                            <span className={Typo.Micro}>Quadrat</span>
                        </button>
                        <button
                            onClick={() => onActiveShapeChange('circle')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${activeShape === 'circle' ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-800' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                        >
                            <Circle className="w-6 h-6" />
                            <span className={Typo.Micro}>Kreis</span>
                        </button>
                        <button
                            onClick={() => onActiveShapeChange('line')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${activeShape === 'line' ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-800' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                        >
                            <Minus className="w-6 h-6 -rotate-45" />
                            <span className={Typo.Micro}>Linie</span>
                        </button>
                    </div>
                )}

                <div className={`px-2 py-2 ${Typo.Micro} text-zinc-500 text-center leading-relaxed flex items-center justify-center`}>
                    {maskTool === 'brush' && t('brush_hint')}
                    {maskTool === 'text' && "Klicke auf das Bild, um eine Text-Anmerkung zu platzieren."}
                    {maskTool === 'shape' && "Ziehe auf dem Bild, um die Form zu erstellen."}
                </div>
            </div>

            {/* Objects Library (Takes remaining space) */}
            <div className="flex-1 min-h-0 px-4 pb-4">
                <ObjectsTab
                    t={t}
                    currentLang={currentLang}
                    library={library}
                    onAddUserCategory={onAddUserCategory}
                    onDeleteUserCategory={onDeleteUserCategory}
                    onAddUserItem={onAddUserItem}
                    onDeleteUserItem={onDeleteUserItem}
                    onAddObject={onAddObject}
                />
            </div>
        </div>
    );
};
