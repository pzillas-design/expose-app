import React, { useMemo } from 'react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory } from '@/types';
import { Pen, Type, Stamp, Square, Circle, Minus, X as XIcon, Trash, Eraser } from 'lucide-react'; // Changed Shapes to specific icons
import { ObjectsTab } from './ObjectsTab';

interface BrushTabProps {
    brushSize?: number;
    onBrushSizeChange?: (size: number) => void;
    maskTool?: 'brush' | 'text' | 'shape';
    onMaskToolChange?: (tool: 'brush' | 'text' | 'shape') => void;
    // activeShape/onActiveShapeChange might be redundant if shapes are in library items now, but keeping for compatibility if needed.
    activeShape?: 'rect' | 'circle' | 'line';
    onActiveShapeChange?: (shape: 'rect' | 'circle' | 'line') => void;
    t: TranslationFunction;

    // Objects Props
    currentLang: 'de' | 'en';
    library: LibraryCategory[];
    onAddUserCategory: (label: string) => void;
    onDeleteUserCategory: (id: string) => void;
    onAddUserItem: (catId: string, label: string) => void;
    onDeleteUserItem: (catId: string, itemId: string) => void;
    onAddObject: (label: string, itemId: string) => void;
    onBack?: () => void;
}

export const BrushTab: React.FC<BrushTabProps> = ({
    brushSize = 40,
    onBrushSizeChange,
    maskTool = 'brush',
    onMaskToolChange,
    activeShape,
    onActiveShapeChange,
    t, currentLang, library, onAddUserCategory, onDeleteUserCategory, onAddUserItem, onDeleteUserItem, onAddObject, onBack
}) => {

    // Inject "Utilities" category (Forms + Remove)
    const extendedLibrary = useMemo(() => {
        const utilCategory: LibraryCategory = {
            id: 'utilities',
            label: 'Utilities', // Or 'Helfer', but user said "Utilities ist vielleicht die erste Kategorie"
            lang: 'de',
            isUserCreated: false,
            items: [
                { id: 'shape:rect', label: currentLang === 'de' ? 'Rechteck' : 'Rectangle', icon: 'Square' as any }, // We'll handle icon logic in ObjectsTab or assume emoji for now, but user wants shapes.
                { id: 'shape:circle', label: currentLang === 'de' ? 'Kreis' : 'Circle', icon: 'Circle' as any },
                { id: 'shape:line', label: currentLang === 'de' ? 'Linie' : 'Line', icon: 'Minus' as any },
                { id: 'util:remove', label: 'Remove', icon: 'Eraser' as any } // User said: "Stamp called Remove... Utilities... Polygon-Forms included"
            ]
        };
        // Ensure we don't duplicate if it already exists (though it shouldn't here)
        return [utilCategory, ...library];
    }, [library, currentLang]);


    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
            <div className="px-5 pt-6 pb-2 space-y-6 shrink-0">
                {/* Tool Toggle */}
                <div className="grid grid-cols-2 gap-1 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
                    <button
                        onClick={() => onMaskToolChange?.('brush')}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${maskTool === 'brush'
                            ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        <Pen className="w-4 h-4" />
                        <span className={Typo.Label}>Pinsel</span>
                    </button>
                    <button
                        onClick={() => onMaskToolChange?.('text')}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${maskTool === 'text'
                            ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        <Type className="w-4 h-4" />
                        <span className={Typo.Label}>Text</span>
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
                                onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
                                className="w-full h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black dark:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                            />
                        </div>
                        <div className={`pt-2 ${Typo.Micro} text-zinc-500 text-center leading-relaxed flex items-center justify-center`}>
                            {t('brush_hint')}
                        </div>
                    </div>
                )}
                {maskTool === 'text' && (
                    <div className={`px-2 py-2 ${Typo.Micro} text-zinc-500 text-center leading-relaxed flex items-center justify-center`}>
                        {t('text_hint') || "Click on the image to place text."}
                    </div>
                )}
            </div>

            {/* Stamps Section (Always Visible) */}
            <div className="flex-1 min-h-0 flex flex-col pt-2 bg-zinc-50/30 dark:bg-zinc-950/20 border-t border-zinc-100 dark:border-zinc-800/50">
                <div className="px-5 py-4 flex items-center gap-2">
                    <Stamp className="w-4 h-4 text-zinc-400" />
                    <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[10px]`}>Stamps</span>
                </div>
                <div className="flex-1 min-h-0 px-4 pb-4 overflow-hidden">
                    <ObjectsTab
                        t={t}
                        currentLang={currentLang}
                        library={extendedLibrary}
                        onAddUserCategory={onAddUserCategory}
                        onDeleteUserCategory={onDeleteUserCategory}
                        onAddUserItem={onAddUserItem}
                        onDeleteUserItem={onDeleteUserItem}
                        onAddObject={onAddObject}
                    />
                </div>
            </div>
        </div>
    );
};
