
import React, { useMemo } from 'react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory, AnnotationObject } from '@/types';
import { Pen, Type, Square, Circle, MousePointer2, Shapes, Minus, Trash2 } from 'lucide-react';
import { ObjectsTab } from './ObjectsTab';

interface BrushTabProps {
    brushSize?: number;
    onBrushSizeChange?: (size: number) => void;
    onBrushResizeStart?: () => void;
    onBrushResizeEnd?: () => void;
    maskTool?: 'brush' | 'text' | 'shape' | 'stamps';
    onMaskToolChange?: (tool: 'brush' | 'text' | 'shape' | 'stamps') => void;
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
    onAddShape?: (shape: 'rect' | 'circle' | 'line') => void;
    onBack?: () => void;
}

export const BrushTab: React.FC<BrushTabProps> = ({
    brushSize = 40,
    onBrushSizeChange,
    onBrushResizeStart,
    onBrushResizeEnd,
    maskTool = 'brush',
    onMaskToolChange,
    activeShape = 'rect',
    onActiveShapeChange,
    t, currentLang, library, onAddUserCategory, onDeleteUserCategory, onAddUserItem, onDeleteUserItem, onAddObject,
    onAddShape
}) => {

    const objectLibrary = useMemo(() => {
        return library;
    }, [library]);

    const SectionHeader = ({ label }: { label: string }) => (
        <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[9px] mb-2 block px-6 opacity-70`}>
            {label}
        </span>
    );

    const ToolSwitcherItem = ({ icon: Icon, active, onClick, label }: any) => (
        <button
            onClick={onClick}
            className={`
                flex-1 flex flex-col items-center justify-center gap-1.5 py-4 transition-all border-r last:border-r-0 ${Theme.Colors.Border}
                ${active
                    ? 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-900 dark:text-white relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-zinc-900 dark:after:bg-white'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50/20 dark:hover:bg-zinc-800/5'
                }
            `}
        >
            <Icon className="w-4 h-4" />
            <span className="text-[9px] font-bold tracking-widest uppercase">{label}</span>
        </button>
    );

    const ShapeOption = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`
                flex-1 flex flex-col items-center gap-2 p-4 transition-all border rounded-lg
                ${active
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-900/20 dark:border-white/20 shadow-sm'
                    : 'bg-transparent border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }
            `}
        >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
        </button>
    );

    return (
        <div className={`flex flex-col h-full ${Theme.Colors.PanelBg}`}>
            {/* 1. HORIZONTAL TOOLBAR */}
            <div className={`flex items-center shrink-0 border-b ${Theme.Colors.Border} bg-white dark:bg-zinc-900/50`}>
                <ToolSwitcherItem
                    icon={Pen}
                    active={maskTool === 'brush'}
                    onClick={() => onMaskToolChange?.('brush')}
                    label={currentLang === 'de' ? 'Pinsel' : 'Brush'}
                />
                <ToolSwitcherItem
                    icon={Shapes}
                    active={maskTool === 'shape'}
                    onClick={() => onMaskToolChange?.('shape')}
                    label={currentLang === 'de' ? 'Formen' : 'Shapes'}
                />
                <ToolSwitcherItem
                    icon={Type}
                    active={maskTool === 'text'}
                    onClick={() => onMaskToolChange?.('text')}
                    label="Text"
                />
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar py-8 space-y-10 animate-in fade-in duration-300">

                {/* 2. CONTEXT SETTINGS - Normalized layout */}
                {maskTool === 'brush' && (
                    <div className="space-y-6">
                        <SectionHeader label={currentLang === 'de' ? 'Pinsel-Größe' : 'Brush Size'} />
                        <div className="px-6">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className={`${Typo.Mono} text-sm font-bold text-zinc-900 dark:text-white`}>{brushSize} PX</span>
                                </div>
                                <input
                                    type="range"
                                    min="10" max="400"
                                    value={brushSize}
                                    onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
                                    onMouseDown={onBrushResizeStart}
                                    onMouseUp={onBrushResizeEnd}
                                    className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-zinc-900 dark:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                                />
                            </div>
                        </div>

                        <div className="px-6 pt-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddObject('Clear', 'util:clear_masks');
                                }}
                                className="w-full py-3 px-4 rounded-xl border border-red-500/10 bg-red-500/5 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                {currentLang === 'de' ? 'Alle Masken löschen' : 'Clear All Masks'}
                            </button>
                        </div>
                    </div>
                )}

                {maskTool === 'shape' && (
                    <div className="space-y-4">
                        <SectionHeader label={currentLang === 'de' ? 'Form auswählen' : 'Select Shape'} />
                        <div className="flex px-6 gap-2">
                            <ShapeOption
                                icon={Square}
                                label="Box"
                                active={activeShape === 'rect'}
                                onClick={() => { onActiveShapeChange?.('rect'); onAddShape?.('rect'); }}
                            />
                            <ShapeOption
                                icon={Circle}
                                label="Kreis"
                                active={activeShape === 'circle'}
                                onClick={() => { onActiveShapeChange?.('circle'); onAddShape?.('circle'); }}
                            />
                            <ShapeOption
                                icon={Minus}
                                label="Linie"
                                active={activeShape === 'line'}
                                onClick={() => { onActiveShapeChange?.('line'); onAddShape?.('line'); }}
                            />
                        </div>
                    </div>
                )}

                {maskTool === 'text' && (
                    <div className="py-20 text-center px-10">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-6">
                            <Type className="w-6 h-6 text-zinc-400" />
                        </div>
                        <h4 className="text-[14px] font-bold uppercase tracking-tight text-zinc-900 dark:text-white leading-tight">
                            {currentLang === 'de' ? 'Text Werkzeug' : 'Text Tool'}
                        </h4>
                        <p className="text-[12px] text-zinc-400 mt-3">
                            {currentLang === 'de' ? 'Funktion ist in Kürze verfügbar.' : 'This feature is coming soon.'}
                        </p>
                    </div>
                )}
            </div>

            {/* 3. STICKERS - Cleaned up redundant headers */}
            <div className="flex flex-col bg-zinc-50/50 dark:bg-zinc-900/10 mt-auto border-t border-zinc-200 dark:border-white/5">
                <ObjectsTab
                    t={t}
                    currentLang={currentLang}
                    library={objectLibrary}
                    onAddUserCategory={onAddUserCategory}
                    onDeleteUserCategory={onDeleteUserCategory}
                    onAddUserItem={onAddUserItem}
                    onDeleteUserItem={onDeleteUserItem}
                    onAddObject={onAddObject}
                    scrollable={false}
                />
            </div>
        </div>
    );
};
