
import React, { useMemo } from 'react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory } from '@/types';
import { Pen, Type, Square, Circle, MousePointer2, Shapes, Triangle } from 'lucide-react';
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
}

export const BrushTab: React.FC<BrushTabProps> = ({
    brushSize = 40,
    onBrushSizeChange,
    maskTool = 'select',
    onMaskToolChange,
    activeShape = 'rect',
    onActiveShapeChange,
    t, currentLang, library, onAddUserCategory, onDeleteUserCategory, onAddUserItem, onDeleteUserItem, onAddObject
}) => {

    const objectLibrary = useMemo(() => {
        return library;
    }, [library]);

    const SectionHeader = ({ label }: { label: string }) => (
        <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[9px] mb-3 block`}>
            {label}
        </span>
    );

    const ToolCard = ({ icon: Icon, label, description, toolId, active, children }: { icon: any, label: string, description?: string, toolId: any, active: boolean, children?: React.ReactNode }) => (
        <div
            className={`
                group flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden
                ${active
                    ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 shadow-lg scale-[1.02]'
                    : 'bg-white dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }
            `}
        >
            <button
                onClick={() => onMaskToolChange?.(toolId)}
                className={`
                    w-full flex items-center gap-4 px-4 py-4 text-left transition-colors
                    ${active ? 'text-white dark:text-black' : 'text-zinc-600 dark:text-zinc-400'}
                `}
            >
                <div className={`p-2.5 rounded-xl transition-colors ${active ? 'bg-white/10 dark:bg-black/5' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                    <span className={`${Typo.Label} font-bold`}>{label}</span>
                    {description && <span className={`${Typo.Micro} opacity-60`}>{description}</span>}
                </div>
            </button>

            {active && children && (
                <div className="px-5 pb-5 pt-2 animate-in slide-in-from-top-2 duration-300">
                    {children}
                </div>
            )}
        </div>
    );

    const SubTool = ({ icon: Icon, label, id, active, onClick }: { icon: any, label: string, id: string, active: boolean, onClick: () => void }) => (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`
                flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all
                ${active
                    ? 'bg-white/20 dark:bg-black/10 border-white/20 dark:border-black/10 text-white dark:text-black'
                    : 'bg-white/5 dark:bg-black/5 border-transparent text-white/60 dark:text-black/60 hover:bg-white/10'
                }
            `}
        >
            <Icon className="w-4 h-4" />
            <span className={Typo.Micro}>{label}</span>
        </button>
    );

    return (
        <div className={`flex flex-col h-full ${Theme.Colors.PanelBg}`}>
            <div className="px-5 pt-6 pb-6 space-y-4 shrink-0 overflow-y-auto no-scrollbar">
                <SectionHeader label={t('tools_label') || (currentLang === 'de' ? 'Werkzeuge' : 'Tools')} />

                <div className="flex flex-col gap-3">
                    {/* SELECTION */}
                    <ToolCard
                        icon={MousePointer2}
                        label={t('selection_tool') || (currentLang === 'de' ? 'Auswahl' : 'Selection')}
                        description={currentLang === 'de' ? 'Objekte verschieben und bearbeiten' : 'Move and edit objects'}
                        toolId="select"
                        active={maskTool === 'select'}
                    />

                    {/* BRUSH */}
                    <ToolCard
                        icon={Pen}
                        label={currentLang === 'de' ? 'Pinsel' : 'Brush'}
                        description={currentLang === 'de' ? 'Bereiche manuell markieren' : 'Mark areas manually'}
                        toolId="brush"
                        active={maskTool === 'brush'}
                    >
                        <div className="space-y-4 mt-2">
                            <div className="flex items-center justify-between text-white dark:text-black">
                                <label className={Typo.Micro}>{t('brush_size')}</label>
                                <span className={Typo.Mono}>{brushSize}px</span>
                            </div>
                            <input
                                type="range"
                                min="10" max="400"
                                value={brushSize}
                                onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
                                className={`
                                    w-full h-1 rounded-lg appearance-none cursor-pointer bg-white/20 dark:bg-black/10
                                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white dark:[&::-webkit-slider-thumb]:bg-black
                                `}
                            />
                            <p className={`${Typo.Micro} opacity-50 text-white dark:text-black leading-relaxed`}>
                                {currentLang === 'de' ? 'Klicke und ziehe im Bild, um Masken zu malen.' : 'Click and drag on the image to paint masks.'}
                            </p>
                        </div>
                    </ToolCard>

                    {/* TEXT */}
                    <ToolCard
                        icon={Type}
                        label="Text"
                        description={currentLang === 'de' ? 'Beschreibungen hinzufügen' : 'Add descriptions'}
                        toolId="text"
                        active={maskTool === 'text'}
                    >
                        <p className={`${Typo.Micro} text-white dark:text-black opacity-60 leading-relaxed`}>
                            {currentLang === 'de' ? 'Klicke auf eine Stelle im Bild, um Text zu platzieren.' : 'Click anywhere on the image to place text.'}
                        </p>
                    </ToolCard>

                    {/* SHAPES */}
                    <ToolCard
                        icon={Shapes}
                        label={currentLang === 'de' ? 'Formen' : 'Shapes'}
                        description={currentLang === 'de' ? 'Geometrische Masken' : 'Geometric masks'}
                        toolId="shape"
                        active={maskTool === 'shape' || maskTool === 'polygon'}
                    >
                        <div className="space-y-4 mt-2">
                            <div className="flex gap-2">
                                <SubTool
                                    icon={Square}
                                    label="Box"
                                    id="rect"
                                    active={maskTool === 'shape' && activeShape === 'rect'}
                                    onClick={() => { onMaskToolChange?.('shape'); onActiveShapeChange?.('rect'); }}
                                />
                                <SubTool
                                    icon={Circle}
                                    label="Kreis"
                                    id="circle"
                                    active={maskTool === 'shape' && activeShape === 'circle'}
                                    onClick={() => { onMaskToolChange?.('shape'); onActiveShapeChange?.('circle'); }}
                                />
                                <SubTool
                                    icon={Triangle}
                                    label="Polygon"
                                    id="polygon"
                                    active={maskTool === 'polygon'}
                                    onClick={() => onMaskToolChange?.('polygon')}
                                />
                            </div>
                            <p className={`${Typo.Micro} text-white dark:text-black opacity-60 leading-relaxed`}>
                                {maskTool === 'polygon'
                                    ? (currentLang === 'de' ? 'Klicke im Bild, um Eckpunkte für dein Polygon zu setzen.' : 'Click on the image to set vertices for your polygon.')
                                    : (currentLang === 'de' ? 'Klicke und ziehe im Bild, um die Form aufzuspannen.' : 'Click and drag on the image to create the shape.')
                                }
                            </p>
                        </div>
                    </ToolCard>
                </div>
            </div>

            {/* Stamps Library */}
            <div className="flex-1 min-h-0 flex flex-col bg-zinc-50/10 dark:bg-zinc-950/20 border-t border-zinc-100 dark:border-zinc-800/50">
                <div className="px-5 pt-5">
                    <SectionHeader label={currentLang === 'de' ? 'Objekt-Bibliothek' : 'Object Library'} />
                </div>
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
