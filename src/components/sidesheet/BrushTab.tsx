
import React, { useMemo, useState } from 'react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory, AnnotationObject } from '@/types';
import { Pen, Type, Square, Circle, Minus, ChevronDown, ChevronUp } from 'lucide-react';
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

    const [isBrushExpanded, setIsBrushExpanded] = useState(false);
    const objectLibrary = useMemo(() => {
        return library;
    }, [library]);

    const SectionHeader = ({ label }: { label: string }) => (
        <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[9px] mb-3 block px-6 opacity-70`}>
            {label}
        </span>
    );

    const ToolButton = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
        <button
            onClick={onClick}
            className="flex-1 flex flex-col items-center gap-2 py-4 px-3 transition-all border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-95"
        >
            <Icon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            <span className="text-[10px] font-bold uppercase tracking-tight text-zinc-600 dark:text-zinc-400">{label}</span>
        </button>
    );

    return (
        <div className={`flex flex-col h-full ${Theme.Colors.PanelBg}`}>
            <div className="flex-1 overflow-y-auto no-scrollbar py-8 space-y-8 animate-in fade-in duration-300">

                {/* 1. OBJECT TOOLS - Grid Layout */}
                <div className="space-y-4 px-6">
                    <SectionHeader label={currentLang === 'de' ? 'Objekte platzieren' : 'Place Objects'} />
                    <div className="grid grid-cols-2 gap-3">
                        <ToolButton
                            icon={Type}
                            label={currentLang === 'de' ? 'Text' : 'Text'}
                            onClick={() => {
                                onAddText?.();
                            }}
                        />
                        <ToolButton
                            icon={Square}
                            label={currentLang === 'de' ? 'Rechteck' : 'Rectangle'}
                            onClick={() => {
                                onAddShape?.('rect');
                            }}
                        />
                        <ToolButton
                            icon={Circle}
                            label={currentLang === 'de' ? 'Kreis' : 'Circle'}
                            onClick={() => {
                                onAddShape?.('circle');
                            }}
                        />
                        <ToolButton
                            icon={Minus}
                            label={currentLang === 'de' ? 'Linie' : 'Line'}
                            onClick={() => {
                                onAddShape?.('line');
                            }}
                        />
                    </div>
                </div>

                {/* 2. BRUSH TOOL - Collapsible */}
                <div className="space-y-4 px-6">
                    <button
                        onClick={() => setIsBrushExpanded(!isBrushExpanded)}
                        className="w-full flex items-center justify-between group"
                    >
                        <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[9px] opacity-70 group-hover:opacity-100 transition-opacity`}>
                            {currentLang === 'de' ? 'Pinsel' : 'Brush'}
                        </span>
                        {isBrushExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                        ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                        )}
                    </button>

                    {isBrushExpanded && (
                        <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/20 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <button
                                    onClick={() => onMaskToolChange?.(maskTool === 'brush' ? 'select' : 'brush')}
                                    className={`p-3 rounded-lg transition-all ${maskTool === 'brush'
                                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                                        }`}
                                >
                                    <Pen className="w-5 h-5" />
                                </button>

                                <div className="flex-1 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
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
