
import React, { useMemo } from 'react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory } from '@/types';
import { Pen, Type, Square, Circle, MousePointer2, Shapes, Minus, Trash2 } from 'lucide-react';
import { ObjectsTab } from './ObjectsTab';

interface BrushTabProps {
    brushSize?: number;
    onBrushSizeChange?: (size: number) => void;
    onBrushResizeStart?: () => void;
    onBrushResizeEnd?: () => void;
    maskTool?: 'brush' | 'text' | 'shape' | 'select';
    onMaskToolChange?: (tool: 'brush' | 'text' | 'shape' | 'select') => void;
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
        <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[9px] mb-4 block px-1`}>
            {label}
        </span>
    );

    const ShapeOption = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`
                flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all aspect-square border
                ${active
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-200 dark:border-white/10 shadow-sm'
                    : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/20'
                }
            `}
        >
            <Icon className="w-5 h-5" />
            <span className="text-[11px] font-medium tracking-tight">{label}</span>
        </button>
    );

    return (
        <div className={`flex flex-col h-full ${Theme.Colors.PanelBg} animate-in fade-in duration-300`}>
            {/* Context Specific Content Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar pt-6 pb-2">

                {/* 1. BRUSH SETTINGS */}
                {maskTool === 'brush' && (
                    <div className="px-6 space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-4">
                            <SectionHeader label={currentLang === 'de' ? 'Pinsel-Einstellungen' : 'Brush Settings'} />

                            <div className="p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-white/5 space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className={`${Typo.Body} text-zinc-500`}>{t('brush_size')}</span>
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

                            <p className="text-[12px] leading-relaxed text-zinc-400 px-1 italic">
                                {t('brush_hint') || 'Paint over areas you want to change.'}
                            </p>
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

                {/* 2. SHAPE SETTINGS */}
                {maskTool === 'shape' && (
                    <div className="px-6 space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        <SectionHeader label={currentLang === 'de' ? 'Form auswählen' : 'Select Shape'} />
                        <div className="grid grid-cols-3 gap-3">
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

                {/* 3. STAMPS (OBJECTS) SETTINGS */}
                {maskTool === 'stamps' && (
                    <div className="animate-in slide-in-from-bottom-2 duration-300">
                        <ObjectsTab
                            t={t}
                            currentLang={currentLang}
                            library={objectLibrary}
                            onAddUserCategory={onAddUserCategory}
                            onDeleteUserCategory={onDeleteUserCategory}
                            onAddUserItem={onAddUserItem}
                            onDeleteUserItem={onDeleteUserItem}
                            onAddObject={onAddObject}
                            scrollable={true}
                        />
                    </div>
                )}

                {/* 4. SELECT / TEXT PLACEHOLDERS */}
                {(maskTool === 'select' || maskTool === 'text') && (
                    <div className="px-6 py-20 flex flex-col items-center text-center space-y-4 animate-in fade-in duration-500">
                        {maskTool === 'select' ? <MousePointer2 className="w-8 h-8 text-zinc-200" /> : <Type className="w-8 h-8 text-zinc-200" />}
                        <div className="space-y-1">
                            <h4 className={`${Typo.Label} text-zinc-400`}>
                                {maskTool === 'select'
                                    ? (currentLang === 'de' ? 'Elemente auswählen' : 'Select Elements')
                                    : (currentLang === 'de' ? 'Text-Werkzeug' : 'Text Tool')}
                            </h4>
                            <p className="text-[11px] text-zinc-400 max-w-[200px]">
                                {currentLang === 'de'
                                    ? 'Klicken Sie auf Anmerkungen im Bild, um sie zu bearbeiten.'
                                    : 'Click on annotations in the image to edit them.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
