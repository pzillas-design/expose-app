
import React, { useMemo } from 'react';
import { Typo, Theme, Button } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory, AnnotationObject } from '@/types';
import { Pen, Type, Square, Circle, Minus, ChevronDown, Trash } from 'lucide-react';
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
    onClearBrushStrokes
}) => {

    const objectLibrary = useMemo(() => {
        return library;
    }, [library]);

    return (
        <div className={`flex flex-col h-full ${Theme.Colors.PanelBg}`}>
            <div className="flex-1 overflow-y-auto no-scrollbar py-6 px-4 animate-in fade-in duration-300">

                {/* 2x2 Grid for Shape Tools */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    {/* Text */}
                    <button
                        onClick={() => {
                            onMaskToolChange?.('select');
                            onAddText?.();
                        }}
                        className="group flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-lg bg-zinc-800/40 hover:bg-zinc-700/60 transition-all border border-zinc-700/50 hover:border-zinc-600"
                    >
                        <Type className="w-5 h-5 text-zinc-300 group-hover:text-white transition-colors" />
                        <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                            {currentLang === 'de' ? 'Text' : 'Text'}
                        </span>
                    </button>

                    {/* Rectangle */}
                    <button
                        onClick={() => {
                            onMaskToolChange?.('select');
                            onAddShape?.('rect');
                        }}
                        className="group flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-lg bg-zinc-800/40 hover:bg-zinc-700/60 transition-all border border-zinc-700/50 hover:border-zinc-600"
                    >
                        <Square className="w-5 h-5 text-zinc-300 group-hover:text-white transition-colors" />
                        <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                            {currentLang === 'de' ? 'Rechteck' : 'Rectangle'}
                        </span>
                    </button>

                    {/* Circle */}
                    <button
                        onClick={() => {
                            onMaskToolChange?.('select');
                            onAddShape?.('circle');
                        }}
                        className="group flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-lg bg-zinc-800/40 hover:bg-zinc-700/60 transition-all border border-zinc-700/50 hover:border-zinc-600"
                    >
                        <Circle className="w-5 h-5 text-zinc-300 group-hover:text-white transition-colors" />
                        <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                            {currentLang === 'de' ? 'Kreis' : 'Circle'}
                        </span>
                    </button>

                    {/* Line */}
                    <button
                        onClick={() => {
                            onMaskToolChange?.('select');
                            onAddShape?.('line');
                        }}
                        className="group flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-lg bg-zinc-800/40 hover:bg-zinc-700/60 transition-all border border-zinc-700/50 hover:border-zinc-600"
                    >
                        <Minus className="w-5 h-5 text-zinc-300 group-hover:text-white transition-colors" />
                        <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                            {currentLang === 'de' ? 'Linie' : 'Line'}
                        </span>
                    </button>
                </div>

                {/* Brush Tool - Full Width */}
                <button
                    onClick={() => onMaskToolChange?.(maskTool === 'brush' ? 'select' : 'brush')}
                    className={`w-full flex items-center justify-between py-3 px-4 rounded-lg transition-all border ${maskTool === 'brush' ? 'bg-zinc-700/70 border-zinc-600' : 'bg-zinc-800/40 border-zinc-700/50 hover:bg-zinc-700/60 hover:border-zinc-600'}`}
                >
                    <div className="flex items-center gap-3">
                        <Pen className="w-4 h-4 text-zinc-300" />
                        <span className="text-sm font-medium text-zinc-200">{currentLang === 'de' ? 'Pinsel' : 'Brush'}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${maskTool === 'brush' ? 'rotate-180' : ''}`} />
                </button>

                {/* Brush Size Slider */}
                {maskTool === 'brush' && (
                    <div className="animate-in slide-in-from-top-2 fade-in duration-200 pt-2 pb-1">
                        <div className="flex items-center gap-3 px-1">
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-500 font-mono font-bold min-w-[24px]">{brushSize}</span>
                            <input
                                type="range"
                                min="10" max="400"
                                value={brushSize}
                                onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
                                onMouseDown={onBrushResizeStart}
                                onMouseUp={onBrushResizeEnd}
                                className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-zinc-400 dark:[&::-webkit-slider-thumb]:bg-zinc-600 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-zinc-500 dark:hover:[&::-webkit-slider-thumb]:bg-zinc-500 transition-all"
                            />
                            <button
                                onClick={onClearBrushStrokes}
                                className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-red-500 dark:hover:text-red-400 transition-all"
                                title={currentLang === 'de' ? 'Alle Pinselstriche löschen' : 'Clear all brush strokes'}
                            >
                                <Trash className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Stickers */}
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
