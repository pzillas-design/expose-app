
import React, { useMemo } from 'react';
import { Typo, Theme, Button } from '@/components/ui/DesignSystem';
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
                <div className="space-y-2">
                    {/* Object Buttons */}
                    <button
                        onClick={() => {
                            onMaskToolChange?.('select');
                            onAddText?.();
                        }}
                        className="group w-full flex items-center justify-between py-3.5 px-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Type className="w-4 h-4 text-zinc-100" />
                            <span className="text-sm font-medium text-zinc-100">{currentLang === 'de' ? 'Text' : 'Text'}</span>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-zinc-400 text-[10px] font-normal whitespace-nowrap">
                            {currentLang === 'de' ? 'Einfügen' : 'Insert'}
                        </span>
                    </button>

                    <button
                        onClick={() => {
                            onMaskToolChange?.('select');
                            onAddShape?.('rect');
                        }}
                        className="group w-full flex items-center justify-between py-3.5 px-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Square className="w-4 h-4 text-zinc-100" />
                            <span className="text-sm font-medium text-zinc-100">{currentLang === 'de' ? 'Rechteck' : 'Rectangle'}</span>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-zinc-400 text-[10px] font-normal whitespace-nowrap">
                            {currentLang === 'de' ? 'Einfügen' : 'Insert'}
                        </span>
                    </button>

                    <button
                        onClick={() => {
                            onMaskToolChange?.('select');
                            onAddShape?.('circle');
                        }}
                        className="group w-full flex items-center justify-between py-3.5 px-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Circle className="w-4 h-4 text-zinc-100" />
                            <span className="text-sm font-medium text-zinc-100">{currentLang === 'de' ? 'Kreis' : 'Circle'}</span>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-zinc-400 text-[10px] font-normal whitespace-nowrap">
                            {currentLang === 'de' ? 'Einfügen' : 'Insert'}
                        </span>
                    </button>

                    <button
                        onClick={() => {
                            onMaskToolChange?.('select');
                            onAddShape?.('line');
                        }}
                        className="group w-full flex items-center justify-between py-3.5 px-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Minus className="w-4 h-4 text-zinc-100" />
                            <span className="text-sm font-medium text-zinc-100">{currentLang === 'de' ? 'Linie' : 'Line'}</span>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-zinc-400 text-[10px] font-normal whitespace-nowrap">
                            {currentLang === 'de' ? 'Einfügen' : 'Insert'}
                        </span>
                    </button>

                    {/* Brush Tool */}
                    <div className={`w-full rounded-lg transition-all ${maskTool === 'brush' ? 'bg-zinc-700' : 'bg-zinc-800/50 hover:bg-zinc-800'}`}>
                        <button
                            onClick={() => onMaskToolChange?.(maskTool === 'brush' ? 'select' : 'brush')}
                            className="group w-full flex items-center justify-between py-3 px-4"
                        >
                            <div className="flex items-center gap-3">
                                <Pen className="w-4 h-4 text-zinc-100" />
                                <span className="text-sm font-medium text-zinc-100">{currentLang === 'de' ? 'Pinsel' : 'Brush'}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${maskTool === 'brush' ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Brush Size Slider - Inside the tile */}
                        {maskTool === 'brush' && (
                            <div className="animate-in slide-in-from-top-2 fade-in duration-200 px-4 pb-4 pt-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] text-zinc-400 font-mono font-bold min-w-[24px]">{brushSize}</span>
                                    <input
                                        type="range"
                                        min="10" max="400"
                                        value={brushSize}
                                        onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
                                        onMouseDown={onBrushResizeStart}
                                        onMouseUp={onBrushResizeEnd}
                                        className="flex-1 h-1 bg-zinc-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-zinc-300 transition-all"
                                    />
                                    <button
                                        onClick={onClearBrushStrokes}
                                        className="p-1.5 w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-600 hover:text-red-400 transition-all"
                                        title={currentLang === 'de' ? 'Alle Pinselstriche löschen' : 'Clear all brush strokes'}
                                    >
                                        <Trash className="w-3.5 h-3.5" />
                                    </button>
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
