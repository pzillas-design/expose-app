
import React, { useMemo } from 'react';
import { Typo, Theme, Button, IconButton } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory, AnnotationObject } from '@/types';
import { Pen, Type, Square, Circle, Minus, ChevronDown, Trash, Check } from 'lucide-react';
import { ObjectsTab } from './ObjectsTab';

interface BrushTabProps {
    brushSize?: number;
    onBrushSizeChange?: (size: number) => void;
    onBrushResizeStart?: () => void;
    onBrushResizeEnd?: () => void;
    maskTool?: 'brush' | 'text' | 'shape' | 'stamps' | 'select';
    onMaskToolChange?: (tool: 'brush' | 'text' | 'shape' | 'stamps' | 'select') => void;
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
    onAddText?: () => void;
    onBack?: () => void;
    onClearBrushStrokes?: () => void;
    onDone?: () => void;
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
    onAddShape,
    onAddText,
    onClearBrushStrokes,
    onDone
}) => {

    const objectLibrary = useMemo(() => {
        return library;
    }, [library]);

    return (
        <div className="flex flex-col min-h-full">
            <div className="flex-1 py-8 flex flex-col px-6 animate-in fade-in duration-300">
                <div className="flex flex-col gap-3">
                    {/* 2x2 Grid for standard tools */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => {
                                onMaskToolChange?.('select');
                                onAddText?.();
                            }}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
                        >
                            <Type className="w-5 h-5 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            <span className={Theme.Colors.TextSecondary + " group-hover:text-black dark:group-hover:text-white transition-colors " + Typo.LabelSmall}>
                                {currentLang === 'de' ? 'Text' : 'Text'}
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                onMaskToolChange?.('select');
                                onAddShape?.('line');
                            }}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
                        >
                            <Minus className="w-5 h-5 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            <span className={Theme.Colors.TextSecondary + " group-hover:text-black dark:group-hover:text-white transition-colors " + Typo.LabelSmall}>
                                {currentLang === 'de' ? 'Linie' : 'Line'}
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                onMaskToolChange?.('select');
                                onAddShape?.('rect');
                            }}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
                        >
                            <Square className="w-5 h-5 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            <span className={Theme.Colors.TextSecondary + " group-hover:text-black dark:group-hover:text-white transition-colors " + Typo.LabelSmall}>
                                {currentLang === 'de' ? 'Rechteck' : 'Rect'}
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                onMaskToolChange?.('select');
                                onAddShape?.('circle');
                            }}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
                        >
                            <Circle className="w-5 h-5 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            <span className={Theme.Colors.TextSecondary + " group-hover:text-black dark:group-hover:text-white transition-colors " + Typo.LabelSmall}>
                                {currentLang === 'de' ? 'Kreis' : 'Circle'}
                            </span>
                        </button>
                    </div>

                    {/* Large Brush Tile */}
                    <div className={`w-full rounded-xl border transition-all ${maskTool === 'brush' ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700' : 'bg-zinc-50/50 dark:bg-zinc-800/30 border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                        <button
                            onClick={() => onMaskToolChange?.(maskTool === 'brush' ? 'select' : 'brush')}
                            className="group w-full flex flex-col items-center gap-3 p-6 transition-all"
                        >
                            <Pen className={`w-6 h-6 transition-colors ${maskTool === 'brush' ? 'text-black dark:text-white' : 'text-zinc-400 group-hover:text-black dark:group-hover:text-white'}`} />
                            <span className={`${Typo.LabelSmall} transition-colors ${maskTool === 'brush' ? 'text-black dark:text-white' : 'text-zinc-400 group-hover:text-black dark:group-hover:text-white'}`}>
                                {currentLang === 'de' ? 'Pinsel zeichnen' : 'Draw Brush'}
                            </span>
                        </button>

                        {/* Brush Settings - Expandable */}
                        {maskTool === 'brush' && (
                            <div className="animate-in slide-in-from-top-2 fade-in duration-200 px-6 pb-6 pt-0 border-t border-zinc-200 dark:border-zinc-700/50 mt-1">
                                <div className="flex flex-col gap-4 pt-6">
                                    <div className="flex items-center justify-between">
                                        <span className={Typo.LabelSmall + " " + Theme.Colors.TextSecondary}>
                                            {currentLang === 'de' ? 'Pinselgröße' : 'Brush Size'}
                                        </span>
                                        <span className={Typo.Mono + " !text-xs !font-bold"}>{brushSize}px</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="10" max="400"
                                            value={brushSize}
                                            onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
                                            onMouseDown={onBrushResizeStart}
                                            onMouseUp={onBrushResizeEnd}
                                            className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-black dark:accent-white"
                                        />
                                        <IconButton
                                            icon={<Trash className="w-3.5 h-3.5" />}
                                            onClick={onClearBrushStrokes}
                                            tooltip={currentLang === 'de' ? 'Alle löschen' : 'Clear all'}
                                            className="text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-auto pt-12">
                    <div className="flex flex-col bg-zinc-50/50 dark:bg-zinc-900/10 border-t border-zinc-200 dark:border-white/5 -mx-6">
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
            </div>
        </div>
    );
};
