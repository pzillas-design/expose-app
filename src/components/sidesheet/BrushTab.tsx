import React, { useMemo } from 'react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory } from '@/types';
import { Pen, Type, Square, Circle, MousePointer2, Shapes, Trash2, Minus } from 'lucide-react';
import { ObjectsTab } from './ObjectsTab';

interface BrushTabProps {
    brushSize?: number;
    onBrushSizeChange?: (size: number) => void;
    maskTool?: 'brush' | 'text' | 'shape' | 'select' | 'polygon';
    onMaskToolChange?: (tool: 'brush' | 'text' | 'shape' | 'select' | 'polygon') => void;
    activeShape?: 'rect' | 'circle' | 'polygon';
    onActiveShapeChange?: (shape: 'rect' | 'circle' | 'polygon') => void;
    t: TranslationFunction;
    currentLang: 'de' | 'en';
    library: LibraryCategory[];
    onAddUserCategory: (label: string) => void;
    onDeleteUserCategory: (id: string) => void;
    onAddUserItem: (catId: string, label: string, icon?: string) => Promise<void>;
    onDeleteUserItem: (catId: string, itemId: string) => void;
    onAddObject: (label: string, itemId: string, icon?: string) => void;
    onBack?: () => void;
    onBrushPreviewingChange?: (active: boolean) => void;
}

export const BrushTab: React.FC<BrushTabProps> = ({
    brushSize = 40,
    onBrushSizeChange,
    maskTool = 'select',
    onMaskToolChange,
    activeShape = 'rect',
    onActiveShapeChange,
    t, currentLang, library, onAddUserCategory, onDeleteUserCategory, onAddUserItem, onDeleteUserItem, onAddObject,
    onBrushPreviewingChange
}) => {

    const objectLibrary = useMemo(() => {
        return library;
    }, [library]);

    const SectionHeader = ({ label }: { label: string }) => (
        <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[9px] mb-3 block`}>
            {label}
        </span>
    );

    const ToolTile = ({ icon: Icon, label, description, toolId, active, children }: { icon: any, label: string, description?: string, toolId: any, active: boolean, children?: React.ReactNode }) => (
        <div className={`flex flex-col rounded-2xl transition-all duration-300 ${active ? 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 shadow-sm' : ''}`}>
            <button
                onClick={() => onMaskToolChange?.(toolId)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl w-full text-left transition-all ${active ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
            >
                <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'bg-transparent'}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                    <span className={`${Typo.Label} font-bold leading-tight`}>{label}</span>
                    {description && !active && <span className="text-[10px] opacity-60 font-medium truncate max-w-[140px]">{description}</span>}
                </div>
            </button>
            {active && children && (
                <div className="px-4 pb-4 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
    );



    return (
        <div className={`flex flex-col h-full ${Theme.Colors.PanelBg}`}>
            <div className="px-5 pt-6 pb-6 space-y-4 shrink-0 overflow-y-auto no-scrollbar">
                <SectionHeader label={t('tools_label') || (currentLang === 'de' ? 'Werkzeuge' : 'Tools')} />

                <div className="flex flex-col gap-1">
                    <ToolTile
                        icon={MousePointer2}
                        label={t('selection_tool') || (currentLang === 'de' ? 'Auswahl' : 'Selection')}
                        description={currentLang === 'de' ? 'Verschieben & Bearbeiten' : 'Move & Edit'}
                        toolId="select"
                        active={maskTool === 'select'}
                    />

                    <ToolTile
                        icon={Pen}
                        label={currentLang === 'de' ? 'Pinsel' : 'Brush'}
                        description={currentLang === 'de' ? 'Manuell markieren' : 'Manual marking'}
                        toolId="brush"
                        active={maskTool === 'brush'}
                    >
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-zinc-500">
                                <label className="text-[10px] font-bold uppercase tracking-wider">{t('brush_size')}</label>
                                <span className={Typo.Mono}>{brushSize}px</span>
                            </div>
                            <input
                                type="range"
                                min="10" max="400"
                                value={brushSize}
                                onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
                                onMouseDown={() => onBrushPreviewingChange?.(true)}
                                onMouseUp={() => onBrushPreviewingChange?.(false)}
                                className={`
                                    w-full h-1 rounded-lg appearance-none cursor-pointer bg-zinc-200 dark:bg-zinc-800
                                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-900 dark:[&::-webkit-slider-thumb]:bg-white
                                    [&::-webkit-slider-thumb]:shadow-special
                                `}
                            />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddObject('Clear', 'util:clear_masks');
                                }}
                                className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-white/5 text-[11px] font-bold hover:bg-white dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 text-red-500 shadow-sm"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {currentLang === 'de' ? 'Masken löschen' : 'Clear Masks'}
                            </button>
                        </div>
                    </ToolTile>

                    <ToolTile
                        icon={Type}
                        label="Text"
                        description={currentLang === 'de' ? 'Hinweise geben' : 'Add hints'}
                        toolId="text"
                        active={maskTool === 'text'}
                    />

                    <ToolTile
                        icon={Shapes}
                        label={currentLang === 'de' ? 'Formen' : 'Shapes'}
                        description={currentLang === 'de' ? 'Geometrische Auswahl' : 'Geometric selection'}
                        toolId="shape"
                        active={maskTool === 'shape'}
                    >
                        <div className="flex gap-1.5">
                            {[
                                { id: 'rect', icon: Square, label: 'Box' },
                                { id: 'circle', icon: Circle, label: 'Kreis' },
                                { id: 'line', icon: Minus, label: 'Linie' }
                            ].map((s) => (
                                <button
                                    key={s.id}
                                    onClick={(e) => { e.stopPropagation(); onMaskToolChange?.('shape'); onActiveShapeChange?.(s.id as any); }}
                                    className={`
                                        flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all
                                        ${maskTool === 'shape' && activeShape === s.id
                                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}
                                    `}
                                >
                                    <s.icon className="w-4 h-4" />
                                    <span className="text-[9px] font-bold uppercase">{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </ToolTile>
                </div>
            </div>

            {/* Stamps Library */}
            <div className="flex-1 min-h-0 flex flex-col pt-2 bg-zinc-50/10 dark:bg-zinc-950/20 border-t border-zinc-100 dark:border-zinc-800/50">
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <ObjectsTab
                        t={t}
                        currentLang={currentLang}
                        library={objectLibrary}
                        onAddUserCategory={onAddUserCategory}
                        onDeleteUserCategory={onDeleteUserCategory}
                        onAddUserItem={onAddUserItem}
                        onDeleteUserItem={onDeleteUserItem}
                        onAddObject={onAddObject}
                    />
                </div>
            </div>
        </div>
    );
};
