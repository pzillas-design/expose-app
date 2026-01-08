
import React, { useMemo, useEffect } from 'react';
import { Typo, Theme, Button } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory, AnnotationObject } from '@/types';
import { Pen, Type, Square, Circle, Minus } from 'lucide-react';
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
    onAddText?: () => void;
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
    onAddShape,
    onAddText
}) => {

    // Reset brush to 'select' mode when tab mounts (not always active)
    useEffect(() => {
        onMaskToolChange?.('select');
    }, []);

    const objectLibrary = useMemo(() => {
        return library;
    }, [library]);

    const SectionHeader = ({ label }: { label: string }) => (
        <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[9px] mb-3 block px-6 opacity-70`}>
            {label}
        </span>
    );

    return (
        <div className={`flex flex-col h-full ${Theme.Colors.PanelBg}`}>
            <div className="flex-1 overflow-y-auto no-scrollbar py-8 space-y-6 animate-in fade-in duration-300">

                {/* 1. OBJECT TOOLS - Secondary Buttons Stacked */}
                <div className="space-y-3 px-6">
                    <SectionHeader label={currentLang === 'de' ? 'Objekte platzieren' : 'Place Objects'} />
                    <Button
                        variant="secondary"
                        icon={<Type className="w-4 h-4" />}
                        onClick={() => {
                            onMaskToolChange?.('select');
                            onAddText?.();
                        }}
                        className="w-full"
                    >
                        {currentLang === 'de' ? 'Text einfügen' : 'Insert Text'}
                    </Button>
                    <Button
                        variant="secondary"
                        icon={<Square className="w-4 h-4" />}
                        onClick={() => {
                            onMaskToolChange?.('select');
                            onAddShape?.('rect');
                        }}
                        className="w-full"
                    >
                        {currentLang === 'de' ? 'Rechteck einfügen' : 'Insert Rectangle'}
                    </Button>
                    <Button
                        variant="secondary"
                        icon={<Circle className="w-4 h-4" />}
                        onClick={() => {
                            onMaskToolChange?.('select');
                            onAddShape?.('circle');
                        }}
                        className="w-full"
                    >
                        {currentLang === 'de' ? 'Kreis einfügen' : 'Insert Circle'}
                    </Button>
                    <Button
                        variant="secondary"
                        icon={<Minus className="w-4 h-4" />}
                        onClick={() => {
                            onMaskToolChange?.('select');
                            onAddShape?.('line');
                        }}
                        className="w-full"
                    >
                        {currentLang === 'de' ? 'Linie einfügen' : 'Insert Line'}
                    </Button>
                </div>

                {/* 2. BRUSH TOOL - Stateful Button */}
                <div className="space-y-3 px-6">
                    <SectionHeader label={currentLang === 'de' ? 'Werkzeuge' : 'Tools'} />
                    <Button
                        variant={maskTool === 'brush' ? 'primary' : 'secondary'}
                        icon={<Pen className="w-4 h-4" />}
                        onClick={() => onMaskToolChange?.(maskTool === 'brush' ? 'select' : 'brush')}
                        className="w-full"
                    >
                        {currentLang === 'de' ? 'Pinsel' : 'Brush'}
                    </Button>

                    {/* Brush Size Slider - Only when active */}
                    {maskTool === 'brush' && (
                        <div className="animate-in slide-in-from-top-2 fade-in duration-200 p-4 bg-zinc-50 dark:bg-zinc-800/20 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className={`${Typo.Label} text-zinc-600 dark:text-zinc-400 text-[10px] uppercase tracking-wider`}>
                                        {currentLang === 'de' ? 'Größe' : 'Size'}
                                    </span>
                                    <span className={`${Typo.Mono} text-xs font-bold text-zinc-900 dark:text-white`}>{brushSize} PX</span>
                                </div>
                                <input
                                    type="range"
                                    min="10" max="400"
                                    value={brushSize}
                                    onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
                                    onMouseDown={onBrushResizeStart}
                                    onMouseUp={onBrushResizeEnd}
                                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-zinc-900 dark:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. STICKERS */}
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
