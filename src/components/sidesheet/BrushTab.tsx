
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
            <div className="flex-1 py-6 flex flex-col px-6 animate-in fade-in duration-300">
                <div className="flex flex-col gap-6">
                    {/* Tool Selection Segmented Control */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 p-1.5 bg-zinc-100/80 dark:bg-zinc-900/50 rounded-[14px] overflow-x-auto no-scrollbar w-full">
                            <button
                                onClick={() => {
                                    onMaskToolChange?.('select');
                                    onAddText?.();
                                }}
                                className={`flex-1 min-w-[56px] flex flex-col items-center gap-1.5 p-2.5 rounded-[10px] hover:bg-white dark:hover:bg-zinc-800 hover:${Theme.Effects.ShadowSm} text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all`}
                            >
                                <Type className="w-4 h-4" />
                                <span className="text-[10px] font-medium">{currentLang === 'de' ? 'Text' : 'Text'}</span>
                            </button>

                            <button
                                onClick={() => {
                                    onMaskToolChange?.('select');
                                    onAddShape?.('rect');
                                }}
                                className={`flex-1 min-w-[56px] flex flex-col items-center gap-1.5 p-2.5 rounded-[10px] hover:bg-white dark:hover:bg-zinc-800 hover:${Theme.Effects.ShadowSm} text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all`}
                            >
                                <Square className="w-4 h-4" />
                                <span className="text-[10px] font-medium">{currentLang === 'de' ? 'Form' : 'Shape'}</span>
                            </button>

                            <button
                                onClick={() => {
                                    onMaskToolChange?.('select');
                                    onAddShape?.('circle');
                                }}
                                className={`flex-1 min-w-[56px] flex flex-col items-center gap-1.5 p-2.5 rounded-[10px] hover:bg-white dark:hover:bg-zinc-800 hover:${Theme.Effects.ShadowSm} text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all`}
                            >
                                <Circle className="w-4 h-4" />
                                <span className="text-[10px] font-medium">{currentLang === 'de' ? 'Kreis' : 'Circle'}</span>
                            </button>

                            <button
                                onClick={() => {
                                    onMaskToolChange?.('select');
                                    onAddShape?.('line');
                                }}
                                className={`flex-1 min-w-[56px] flex flex-col items-center gap-1.5 p-2.5 rounded-[10px] hover:bg-white dark:hover:bg-zinc-800 hover:${Theme.Effects.ShadowSm} text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all`}
                            >
                                <Minus className="w-4 h-4" />
                                <span className="text-[10px] font-medium">{currentLang === 'de' ? 'Linie' : 'Line'}</span>
                            </button>

                            <div className="w-[1px] h-8 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />

                            <button
                                onClick={() => onMaskToolChange?.(maskTool === 'brush' ? 'select' : 'brush')}
                                className={`flex-1 min-w-[56px] flex flex-col items-center gap-1.5 p-2.5 rounded-[10px] transition-all ${maskTool === 'brush' ? 'bg-white dark:bg-zinc-800 text-orange-500 ' + Theme.Effects.ShadowSm + ' ring-1 ring-black/5 dark:ring-white/5' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-transparent dark:hover:bg-zinc-800'}`}
                            >
                                <Pen className="w-4 h-4" />
                                <span className="text-[10px] font-medium">{currentLang === 'de' ? 'Pinsel' : 'Brush'}</span>
                            </button>
                        </div>

                        {/* Brush Settings - Expandable underneath tools */}
                        {maskTool === 'brush' && (
                            <div className="animate-in slide-in-from-top-2 fade-in duration-200 p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-[14px] border border-zinc-100 dark:border-zinc-800/50 mt-1">
                                <div className="flex items-center gap-4 px-1">
                                    <span className="text-[11px] font-medium text-zinc-500 w-8">{brushSize}px</span>
                                    <input
                                        type="range"
                                        min="10" max="400"
                                        value={brushSize}
                                        onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
                                        onMouseDown={onBrushResizeStart}
                                        onMouseUp={onBrushResizeEnd}
                                        className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500 dark:accent-orange-400 relative"
                                    />
                                    <IconButton
                                        icon={<Trash className="w-4 h-4" />}
                                        onClick={onClearBrushStrokes}
                                        tooltip={currentLang === 'de' ? 'Alle löschen' : 'Clear all'}
                                        className="!rounded-full w-8 h-8 !bg-transparent text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0 -mr-1"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-4">
                    <div className="flex flex-col -mx-6">
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
