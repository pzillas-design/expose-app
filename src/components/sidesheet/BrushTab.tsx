
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
    maskTool?: 'brush' | 'text' | 'shape' | 'select' | 'stamps';
    onMaskToolChange?: (tool: 'brush' | 'text' | 'shape' | 'select' | 'stamps') => void;
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
    maskTool = 'select',
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
        <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[9px] mb-4 block px-1`}>
            {label}
        </span>
    );

    const ToolSwitcherItem = ({ icon: Icon, active, onClick, label }: any) => (
        <button
            onClick={onClick}
            className={`
                flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all
                ${active
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/20'
                }
            `}
        >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">{label}</span>
        </button>
    );

    const ShapeOption = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
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
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    );

    return (
        <div className={`flex flex-col h-full ${Theme.Colors.PanelBg}`}>
            <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-6 space-y-8">

                {/* 1. HORIZONTAL TOOLBAR */}
                <div className="space-y-3">
                    <SectionHeader label={t('tools_label') || (currentLang === 'de' ? 'Werkzeuge' : 'Tools')} />
                    <div className="flex items-center gap-1.5 p-1 bg-zinc-50/50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-white/5">
                        <ToolSwitcherItem
                            icon={MousePointer2}
                            active={maskTool === 'select'}
                            onClick={() => onMaskToolChange?.('select')}
                            label={t('selection_tool') || (currentLang === 'de' ? 'Auswahl' : 'Select')}
                        />
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
                </div>

                {/* 2. CONTEXT SETTINGS */}
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {maskTool === 'brush' && (
                        <div className="space-y-5">
                            <SectionHeader label={currentLang === 'de' ? 'Pinsel-Größe' : 'Brush Size'} />
                            <div className="p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-white/5 space-y-5">
                                <div className="flex items-center justify-between">
                                    <span className={`${Typo.Mono} text-sm font-medium text-zinc-900 dark:text-white`}>{brushSize}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="10" max="400"
                                    value={brushSize}
                                    onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
                                    onMouseDown={onBrushResizeStart}
                                    onMouseUp={onBrushResizeEnd}
                                    className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-zinc-900 dark:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                                />
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddObject('Clear', 'util:clear_masks');
                                }}
                                className="w-full py-3 px-4 rounded-xl border border-red-100 dark:border-red-900/20 text-red-500 text-[12px] font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                {currentLang === 'de' ? 'Alle Masken löschen' : 'Clear All Masks'}
                            </button>
                        </div>
                    )}

                    {maskTool === 'shape' && (
                        <div className="space-y-4">
                            <SectionHeader label={currentLang === 'de' ? 'Form auswählen' : 'Select Shape'} />
                            <div className="flex gap-2">
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

                    {(maskTool === 'select' || maskTool === 'text') && (
                        <div className="py-4 text-center">
                            <p className="text-[12px] text-zinc-400 italic">
                                {maskTool === 'select'
                                    ? (currentLang === 'de' ? 'Wählen Sie Elemente im Bild aus.' : 'Select elements in the image.')
                                    : (currentLang === 'de' ? 'Text-Werkzeug wird bald verfügbar sein.' : 'Text tool coming soon.')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. STAMPS (Old reliable) */}
            <div className="flex flex-col bg-zinc-50/30 dark:bg-zinc-900/20 mt-auto border-t border-zinc-200 dark:border-zinc-800">
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
