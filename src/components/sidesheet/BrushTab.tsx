
import React, { useMemo } from 'react';
import { Typo, Theme, Button } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory, AnnotationObject } from '@/types';
import { Pen, Type, Square, Circle, Minus } from 'lucide-react';
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
    onAddText
}) => {

    const objectLibrary = useMemo(() => {
        return library;
    }, [library]);

    return (
        <div className={`flex flex-col h-full ${Theme.Colors.PanelBg}`}>
            <div className="flex-1 overflow-y-auto no-scrollbar py-8 space-y-2 px-6 animate-in fade-in duration-300">

                {/* Object Buttons */}
                <button
                    onClick={() => {
                        onMaskToolChange?.('select');
                        onAddText?.();
                    }}
                    className="group w-full flex items-center justify-between py-3 px-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
                >
                    <div className="flex items-center gap-3">
                        <Type className="w-4 h-4 text-zinc-100" />
                        <span className="text-sm font-medium text-zinc-100">{currentLang === 'de' ? 'Text' : 'Text'}</span>
                    </div>
                    <span className="text-[10px] font-medium text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                        {currentLang === 'de' ? 'Einfügen' : 'Insert'}
                    </span>
                </button>

                <button
                    onClick={() => {
                        onMaskToolChange?.('select');
                        onAddShape?.('rect');
                    }}
                    className="group w-full flex items-center justify-between py-3 px-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
                >
                    <div className="flex items-center gap-3">
                        <Square className="w-4 h-4 text-zinc-100" />
                        <span className="text-sm font-medium text-zinc-100">{currentLang === 'de' ? 'Rechteck' : 'Rectangle'}</span>
                    </div>
                    <span className="text-[10px] font-medium text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                        {currentLang === 'de' ? 'Einfügen' : 'Insert'}
                    </span>
                </button>

                <button
                    onClick={() => {
                        onMaskToolChange?.('select');
                        onAddShape?.('circle');
                    }}
                    className="group w-full flex items-center justify-between py-3 px-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
                >
                    <div className="flex items-center gap-3">
                        <Circle className="w-4 h-4 text-zinc-100" />
                        <span className="text-sm font-medium text-zinc-100">{currentLang === 'de' ? 'Kreis' : 'Circle'}</span>
                    </div>
                    <span className="text-[10px] font-medium text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                        {currentLang === 'de' ? 'Einfügen' : 'Insert'}
                    </span>
                </button>

                <button
                    onClick={() => {
                        onMaskToolChange?.('select');
                        onAddShape?.('line');
                    }}
                    className="group w-full flex items-center justify-between py-3 px-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
                >
                    <div className="flex items-center gap-3">
                        <Minus className="w-4 h-4 text-zinc-100" />
                        <span className="text-sm font-medium text-zinc-100">{currentLang === 'de' ? 'Linie' : 'Line'}</span>
                    </div>
                    <span className="text-[10px] font-medium text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                        {currentLang === 'de' ? 'Einfügen' : 'Insert'}
                    </span>
                </button>

                {/* Brush Tool */}
                <button
                    onClick={() => onMaskToolChange?.(maskTool === 'brush' ? 'select' : 'brush')}
                    className={`group w-full flex items-center justify-between py-3 px-4 rounded-lg transition-colors border ${maskTool === 'brush' ? 'bg-zinc-700 border-zinc-600' : 'bg-zinc-800/50 border-transparent hover:bg-zinc-800 hover:border-zinc-700'}`}
                >
                    <div className="flex items-center gap-3">
                        <Pen className="w-4 h-4 text-zinc-100" />
                        <span className="text-sm font-medium text-zinc-100">{currentLang === 'de' ? 'Pinsel' : 'Brush'}</span>
                    </div>
                </button>

                {/* Brush Size Slider */}
                {maskTool === 'brush' && (
                    <div className="animate-in slide-in-from-top-2 fade-in duration-200 pt-2 pb-1">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">
                                    {currentLang === 'de' ? 'Größe' : 'Size'}
                                </span>
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-mono">{brushSize}px</span>
                            </div>
                            <input
                                type="range"
                                min="10" max="400"
                                value={brushSize}
                                onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
                                onMouseDown={onBrushResizeStart}
                                onMouseUp={onBrushResizeEnd}
                                className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-zinc-400 dark:[&::-webkit-slider-thumb]:bg-zinc-600 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-zinc-500 dark:hover:[&::-webkit-slider-thumb]:bg-zinc-500 transition-all"
                            />
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
