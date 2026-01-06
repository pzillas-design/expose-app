
import React, { useMemo } from 'react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory } from '@/types';
import { Pen, Type, Square, Circle, MousePointer2, Shapes, Minus, Trash2 } from 'lucide-react';
import { ObjectsTab } from './ObjectsTab';

interface BrushTabProps {
    brushSize?: number;
    onBrushSizeChange?: (size: number) => void;
    onBrushResizeStart?: () => void;
    onBrushResizeEnd?: () => void;
    maskTool?: 'brush' | 'text' | 'shape' | 'select';
    onMaskToolChange?: (tool: 'brush' | 'text' | 'shape' | 'select') => void;
    activeShape?: 'rect' | 'circle' | 'line';
    onActiveShapeChange?: (shape: 'rect' | 'circle' | 'line') => void;
    t: TranslationFunction;
    currentLang: 'de' | 'en';
    library: LibraryCategory[];
    onAddUserCategory: (label: string) => void;
    onDeleteUserCategory: (id: string) => void;
    onAddUserItem: (catId: string, label: string, icon?: string) => Promise<void>;
    onDeleteUserItem: (catId: string, itemId: string) => void;
    onAddObject: (label: string, itemId: string, icon?: string) => void;
    onBack?: () => void;
}

export const BrushTab: React.FC<BrushTabProps> = ({
    brushSize = 40,
    onBrushSizeChange,
    onBrushResizeStart,
    onBrushResizeEnd,
    maskTool = 'select',
    onMaskToolChange,
    activeShape = 'rect',
    onActiveShapeChange,
    t, currentLang, library, onAddUserCategory, onDeleteUserCategory, onAddUserItem, onDeleteUserItem, onAddObject
}) => {

    const objectLibrary = useMemo(() => {
        return library;
    }, [library]);

    const SectionHeader = ({ label }: { label: string }) => (
        <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[9px] mb-3 block px-1`}>
            {label}
        </span>
    );

    const ToolCard = ({ icon: Icon, label, toolId, active, children }: { icon: any, label: string, toolId: any, active: boolean, children?: React.ReactNode }) => (
        <div className={`
            flex flex-col transition-all duration-300
            ${active
                ? 'bg-zinc-100 dark:bg-zinc-800/80 ring-1 ring-zinc-200 dark:ring-white/10 rounded-xl shadow-sm'
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30 rounded-lg opacity-80 hover:opacity-100'
            }
        `}>
            <button
                onClick={() => onMaskToolChange?.(toolId)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left outline-none"
            >
                <Icon className={`w-4 h-4 ${active ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`} />
                <span className={`${Typo.Label} ${active ? 'text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {label}
                </span>
            </button>

            {active && children && (
                <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-1 duration-200">
                    <div className="pt-2 border-t border-zinc-200 dark:border-white/5 mt-1">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );

    const ShapeOption = ({ icon: Icon, label, id, active, onClick }: { icon: any, label: string, id: string, active: boolean, onClick: () => void }) => (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`
                flex-1 flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all
                ${active
                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                    : 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }
            `}
        >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    );

    return (
        <div className={`flex flex-col h-full ${Theme.Colors.PanelBg}`}>
            <div className="px-4 py-6 space-y-6 shrink-0 overflow-y-auto no-scrollbar">

                {/* Tools Section */}
                <div className="flex flex-col gap-1">
                    <SectionHeader label={t('tools_label') || (currentLang === 'de' ? 'Werkzeuge' : 'Tools')} />

                    {/* SELECT */}
                    <ToolCard
                        icon={MousePointer2}
                        label={t('selection_tool') || (currentLang === 'de' ? 'Auswahl' : 'Selection')}
                        toolId="select"
                        active={maskTool === 'select'}
                    />

                    {/* BRUSH */}
                    <ToolCard
                        icon={Pen}
                        label={currentLang === 'de' ? 'Pinsel' : 'Brush'}
                        toolId="brush"
                        active={maskTool === 'brush'}
                    >
                        <div className="space-y-3 pt-1">
                            <div className="flex items-center justify-between">
                                <span className={`${Typo.Micro} text-zinc-500`}>{t('brush_size')}</span>
                                <span className={`${Typo.Mono} text-xs text-zinc-900 dark:text-white`}>{brushSize}px</span>
                            </div>
                            <input
                                type="range"
                                min="10" max="400"
                                value={brushSize}
                                onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
                                onPointerDown={onBrushResizeStart}
                                onPointerUp={onBrushResizeEnd}
                                onPointerLeave={onBrushResizeEnd}
                                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-zinc-900 dark:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                            />

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddObject('Clear', 'util:clear_masks');
                                }}
                                className="w-full py-2 px-3 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {currentLang === 'de' ? 'Alle Masken löschen' : 'Clear All Masks'}
                            </button>
                        </div>
                    </ToolCard>

                    {/* SHAPES */}
                    <ToolCard
                        icon={Shapes}
                        label={currentLang === 'de' ? 'Formen' : 'Shapes'}
                        toolId="shape"
                        active={maskTool === 'shape'}
                    >
                        <div className="gap-2 grid grid-cols-3 pt-1">
                            <ShapeOption
                                icon={Square}
                                label="Box"
                                id="rect"
                                active={activeShape === 'rect'}
                                onClick={() => onActiveShapeChange?.('rect')}
                            />
                            <ShapeOption
                                icon={Circle}
                                label="Kreis"
                                id="circle"
                                active={activeShape === 'circle'}
                                onClick={() => onActiveShapeChange?.('circle')}
                            />
                            <ShapeOption
                                icon={Minus}
                                label="Linie"
                                id="line"
                                active={activeShape === 'line'}
                                onClick={() => onActiveShapeChange?.('line')}
                            />
                        </div>
                    </ToolCard>

                    {/* TEXT */}
                    <ToolCard
                        icon={Type}
                        label="Text"
                        toolId="text"
                        active={maskTool === 'text'}
                    />
                </div>

            </div>

            {/* Stamps Library */}
            <div className="flex-1 min-h-0 flex flex-col pt-2 bg-zinc-50/50 dark:bg-zinc-900/20 border-t border-zinc-200/50 dark:border-white/5">
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
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
