
import React, { useMemo } from 'react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory } from '@/types';
import { Pen, Type, Square, Circle, Minus, MousePointer2 } from 'lucide-react';
import { ObjectsTab } from './ObjectsTab';

interface BrushTabProps {
    brushSize?: number;
    onBrushSizeChange?: (size: number) => void;
    maskTool?: 'brush' | 'text' | 'shape';
    onMaskToolChange?: (tool: 'brush' | 'text' | 'shape') => void;
    activeShape?: 'rect' | 'circle' | 'line';
    onActiveShapeChange?: (shape: 'rect' | 'circle' | 'line') => void;
    t: TranslationFunction;

    // Objects Props
    currentLang: 'de' | 'en';
    library: LibraryCategory[];
    onAddUserCategory: (label: string) => void;
    onDeleteUserCategory: (id: string) => void;
    onAddUserItem: (catId: string, label: string, icon?: string) => Promise<void>;
    onDeleteUserItem: (catId: string, itemId: string) => void;
    onAddObject: (label: string, itemId: string) => void;
    onBack?: () => void;
}

export const BrushTab: React.FC<BrushTabProps> = ({
    brushSize = 40,
    onBrushSizeChange,
    maskTool = 'brush',
    onMaskToolChange,
    t, currentLang, library, onAddUserCategory, onDeleteUserCategory, onAddUserItem, onDeleteUserItem, onAddObject
}) => {

    const objectLibrary = useMemo(() => {
        // Return all categories from the library (Global + User)
        return library;
    }, [library]);

    const SectionHeader = ({ label }: { label: string }) => (
        <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[9px] mb-2 block`}>
            {label}
        </span>
    );

    const ToolButton = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all active:scale-[0.98]
                ${active
                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-sm'
                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-700'
                }
            `}
        >
            <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span className={Typo.Label}>{label}</span>
            </div>
            {active && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
        </button>
    );

    const UtilityButton = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
        <button
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group active:scale-[0.98]"
        >
            <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className={`${Typo.Micro} font-medium`}>{label}</span>
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
            <div className="px-5 pt-6 pb-4 space-y-6 shrink-0 overflow-y-auto no-scrollbar">

                {/* Werkzeuge */}
                <div>
                    <SectionHeader label={currentLang === 'de' ? 'Werkzeuge' : 'Tools'} />
                    <div className="flex flex-col gap-2">
                        <ToolButton
                            icon={Pen}
                            label={currentLang === 'de' ? 'Pinsel' : 'Brush'}
                            active={maskTool === 'brush'}
                            onClick={() => onMaskToolChange?.('brush')}
                        />
                        <ToolButton
                            icon={Type}
                            label="Text"
                            active={maskTool === 'text'}
                            onClick={() => onMaskToolChange?.('text')}
                        />
                    </div>
                </div>

                {/* Utilities */}
                <div>
                    <SectionHeader label="Utilities" />
                    <div className="grid grid-cols-4 gap-2">
                        <UtilityButton icon={Square} label="Box" onClick={() => onAddObject('Box', 'shape:rect')} />
                        <UtilityButton icon={Circle} label="Kreis" onClick={() => onAddObject('Kreis', 'shape:circle')} />
                        <UtilityButton icon={Minus} label="Linie" onClick={() => onAddObject('Linie', 'shape:line')} />
                    </div>
                </div>

                {/* Brush Settings - Only show for brush */}
                {maskTool === 'brush' && (
                    <div className="space-y-4 animate-in fade-in duration-300 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
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

            {/* Stamps Library */}
            <div className="flex-1 min-h-0 flex flex-col pt-2 bg-zinc-50/30 dark:bg-zinc-950/20 border-t border-zinc-100 dark:border-zinc-800/50">
                <div className="flex-1 min-h-0 px-4 overflow-hidden flex flex-col">
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
