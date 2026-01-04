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
                <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
                    <button
                        onClick={() => onMaskToolChange?.('brush')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${maskTool === 'brush'
                            ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        <Pen className="w-4 h-4" />
                        <span className={Typo.Label}>Pinsel</span>
                    </button>
                    <button
                        onClick={() => onMaskToolChange?.('text')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${maskTool === 'text'
                            ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        <Type className="w-4 h-4" />
                        <span className={Typo.Label}>Text</span>
                    </button>
                    <button
                        onClick={() => onMaskToolChange?.('shape')} // Using 'shape' mode to represent "Stamps/Objects" mode now? 
                        // Wait, user said "Objects we call Stamps". "Tools, Text, Brush, and then Objects we call Stamps".
                        // Existing modes are 'brush' | 'text' | 'shape'. We can reuse 'shape' or just use a new visual label but same enum.
                        // Or is 'shape' the mode for dragging shapes? 
                        // User wants shapes IN the library. So if I click "Stamps" tab, I see the library.
                        // So let's map "Stamps" UI button to... 'shape' mode? Or maybe keep it as a tab selector?
                        // Let's assume 'shape' mode activates the Stamp/Object placement features.
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${maskTool === 'shape'
                            ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        <Stamp className="w-4 h-4" />
                        <span className={Typo.Label}>Stamps</span>
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

            {/* Objects Library (Takes remaining space, visible when Stamps is selected OR just visible always below? User said "And then the tools... and then Objects we call Stamps." and "Forms we put into Objects Library". Usually libraries are large.
                If I toggle Text, I don't need the library. If I toggle Brush, I don't need the library.
                So Library should only be visible when "Stamps" (maskTool === 'shape') is active?
                The user didn't explicitly say "hide library when brush active", but it makes sense for space.
                Let's show Library ONLY when `maskTool === 'shape'`. 
            */}
            {maskTool === 'shape' && (
                <div className="flex-1 min-h-0 px-4 pb-4 animate-in slide-in-from-bottom-2 duration-300">
                    <ObjectsTab
                        t={t}
                        currentLang={currentLang}
                        library={extendedLibrary}
                        onAddUserCategory={onAddUserCategory}
                        onDeleteUserCategory={onDeleteUserCategory}
                        onAddUserItem={onAddUserItem}
                        onDeleteUserItem={onDeleteUserItem}
                        onAddObject={onAddObject}
                    // hide Header back button in embedded mode?
                    // User wants "SideSheet header with Back button", so ObjectsTab header might be redundant if we have SideSheet header?
                    // But I restored SideSheet header. ObjectsTab has an embedded header I should probably hide or simplify.
                    // I will pass `hideHeader={true}` if I modify ObjectsTab to support it, or just let it be.
                    // ObjectsTab has "Library | Edit | Search". This is useful. I'll keep it.
                    />
                </div>
            )}
        </div>
    );
};
