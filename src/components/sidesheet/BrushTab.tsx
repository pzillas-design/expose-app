
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

    // Custom secondary button with left-aligned content and hover text
    const SecondaryObjectButton = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 py-3 px-4 transition-all bg-zinc-800/90 dark:bg-zinc-800/90 text-white dark:text-white hover:bg-zinc-700/90 dark:hover:bg-zinc-700/90 rounded-lg active:scale-[0.98] group"
        >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-xs font-medium flex-1 text-left">{label}</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-zinc-400 dark:text-zinc-500 text-[10px] font-normal whitespace-nowrap">
                {currentLang === 'de' ? 'einfügen' : 'insert'}
            </span>
        </button>
    );

    return (
        <div className={`flex flex-col h-full ${Theme.Colors.PanelBg}`}>
            <div className="flex-1 overflow-y-auto no-scrollbar py-8 space-y-3 px-6 animate-in fade-in duration-300">

                {/* Object Buttons - Secondary Style with Left-Aligned Content */}
                <SecondaryObjectButton
                    icon={Type}
                    label={currentLang === 'de' ? 'Text' : 'Text'}
                    onClick={() => {
                        onMaskToolChange?.('select');
                        onAddText?.();
                    }}
                />
                <SecondaryObjectButton
                    icon={Square}
                    label={currentLang === 'de' ? 'Rechteck' : 'Rectangle'}
                    onClick={() => {
                        onMaskToolChange?.('select');
                        onAddShape?.('rect');
                    }}
                />
                <SecondaryObjectButton
                    icon={Circle}
                    label={currentLang === 'de' ? 'Kreis' : 'Circle'}
                    onClick={() => {
                        onMaskToolChange?.('select');
                        onAddShape?.('circle');
                    }}
                />
                <SecondaryObjectButton
                    icon={Minus}
                    label={currentLang === 'de' ? 'Linie' : 'Line'}
                    onClick={() => {
                        onMaskToolChange?.('select');
                        onAddShape?.('line');
                    }}
                />

                {/* Brush Tool - Same Secondary Style */}
                <Button
                    variant={maskTool === 'brush' ? 'primary' : 'secondary'}
                    icon={<Pen className="w-4 h-4" />}
                    onClick={() => onMaskToolChange?.(maskTool === 'brush' ? 'select' : 'brush')}
                    className="w-full"
                >
                    {currentLang === 'de' ? 'Pinsel' : 'Brush'}
                </Button>

                {/* Brush Size Slider - Only when active, no frame, subtle styling */}
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
                                className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-zinc-400 dark:[&::-webkit-slider-thumb]:bg-zinc-600 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-zinc-500 dark:hover:[&::-webkit-slider-thumb]:bg-zinc-500 transition-all"
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
