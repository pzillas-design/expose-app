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

    // Simplified library for ObjectsTab (Basics + User Items)
    const objectLibrary = useMemo(() => {
        const basicCategory = library.find(c => c.id === 'basics');
        const userCats = library.filter(c => c.isUserCreated);

        const filtered: LibraryCategory[] = [];
        if (basicCategory) {
            filtered.push({
                ...basicCategory,
                label: currentLang === 'de' ? 'Objekte' : 'Objects'
            });
        }
        // Include user categories but merge them or keep as is? User said "nur noch einzelne stamps" 
        // but we keep their existing categories for now, just don't allow NEW ones in ObjectsTab.
        return [...filtered, ...userCats];
    }, [library, currentLang]);

    const UtilityButton = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
        <button
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 transition-all group active:scale-95"
        >
            <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className={`${Typo.Micro} font-medium`}>{label}</span>
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
            <div className="px-5 pt-6 pb-2 space-y-6 shrink-0 overflow-y-auto no-scrollbar">
                {/* Core Tools */}
                <div className="space-y-2">
                    <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[9px]`}>Werkzeuge</span>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => onMaskToolChange?.('brush')}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${maskTool === 'brush'
                                ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-md'
                                : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Pen className="w-4 h-4" />
                                <span className={Typo.Label}>Pinsel</span>
                            </div>
                            {maskTool === 'brush' && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
                        </button>

                        <button
                            onClick={() => onMaskToolChange?.('text')}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${maskTool === 'text'
                                ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-md'
                                : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Type className="w-4 h-4" />
                                <span className={Typo.Label}>Text</span>
                            </div>
                            {maskTool === 'text' && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
                        </button>
                    </div>
                </div>

                {/* Utilities Section */}
                <div className="space-y-2">
                    <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[9px]`}>Utilities</span>
                    <div className="grid grid-cols-4 gap-2">
                        <UtilityButton icon={Square} label="Box" onClick={() => onAddObject('Box', 'shape:rect')} />
                        <UtilityButton icon={Circle} label="Kreis" onClick={() => onAddObject('Kreis', 'shape:circle')} />
                        <UtilityButton icon={Minus} label="Linie" onClick={() => onAddObject('Linie', 'shape:line')} />
                        <UtilityButton icon={Eraser} label="Eraser" onClick={() => onAddObject('Remove', 'util:remove')} />
                    </div>
                </div>

                {/* Brush Settings */}
                {maskTool === 'brush' && (
                    <div className="space-y-4 animate-in fade-in duration-300 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
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
                    </div>
                )}
            </div>

            {/* Stamps Section */}
            <div className="flex-1 min-h-0 flex flex-col pt-2 bg-zinc-50/30 dark:bg-zinc-950/20 border-t border-zinc-100 dark:border-zinc-800/50">
                <div className="px-5 py-3 flex items-center gap-2">
                    <Stamp className="w-4 h-4 text-zinc-400" />
                    <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[10px]`}>Stamps</span>
                </div>
                <div className="flex-1 min-h-0 px-4 pb-4 overflow-hidden">
                    <ObjectsTab
                        t={t}
                        currentLang={currentLang}
                        library={objectLibrary}
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
