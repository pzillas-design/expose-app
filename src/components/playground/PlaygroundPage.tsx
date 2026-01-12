
import React, { useState } from 'react';
import { Type, Square, Circle, Minus, Pen, ChevronRight, ChevronDown, Check, MousePointer2, Layers } from 'lucide-react';
import { Theme, Typo, Button, IconButton, Card, SectionHeader } from '@/components/ui/DesignSystem';
import { TranslationFunction } from '@/types';

interface PlaygroundPageProps {
    t: TranslationFunction;
}

export const PlaygroundPage: React.FC<PlaygroundPageProps> = ({ t }) => {
    const [activeVariant, setActiveVariant] = useState(0);
    const [selectedTool, setSelectedTool] = useState<string | null>(null);
    const [isShapesOpen, setIsShapesOpen] = useState(false);

    const variants = [
        { id: 0, name: 'Variant 1: Nested List', description: 'Classical hierarchical approach' },
        { id: 1, name: 'Variant 2: Hybrid (Canvas)', description: 'Floating tools on canvas' },
        { id: 2, name: 'Variant 3: Grid', description: 'Compact one-click access' },
        { id: 3, name: 'Variant 4: Tabs + Buttons', description: 'Segmented controls for shapes' },
        { id: 4, name: 'Variant 5: Iconic Sidebar', description: 'Slim professional toolbar' },
    ];

    const MockCanvas = ({ children }: { children?: React.ReactNode }) => (
        <div className={`relative flex-1 h-[600px] ${Theme.Colors.CanvasBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} overflow-hidden flex items-center justify-center`}>
            <div className="text-zinc-300 dark:text-zinc-800 flex flex-col items-center gap-4">
                <Layers className="w-12 h-12 opacity-20" />
                <span className={Typo.Label}>Mock Canvas Area</span>
            </div>
            {children}
        </div>
    );

    const VariantPicker = () => (
        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl w-fit">
            {variants.map(v => (
                <button
                    key={v.id}
                    onClick={() => { setActiveVariant(v.id); setSelectedTool(null); }}
                    className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${activeVariant === v.id ? 'bg-white dark:bg-zinc-900 shadow-sm text-black dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                    {v.name}
                </button>
            ))}
        </div>
    );

    // --- VARIANT 1: NESTED ---
    const SideSheetV1 = () => (
        <div className="flex flex-col gap-4">
            <Button variant="ghost" className="w-full justify-start" icon={<Type className="w-4 h-4" />}>Text hinzufügen</Button>
            <Button variant="ghost" className="w-full justify-start" icon={<Pen className="w-4 h-4" />}>Pinsel Tool</Button>

            <div className="flex flex-col gap-1">
                <button
                    onClick={() => setIsShapesOpen(!isShapesOpen)}
                    className={`flex items-center justify-between w-full p-3 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${isShapesOpen ? 'text-black dark:text-white' : 'text-zinc-500'}`}
                >
                    <div className="flex items-center gap-2">
                        <Square className="w-4 h-4" />
                        <span className={Typo.ButtonLabel}>Formen</span>
                    </div>
                    {isShapesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {isShapesOpen && (
                    <div className="pl-6 flex flex-col gap-1 border-l ml-5 border-zinc-200 dark:border-zinc-800 py-1">
                        <Button variant="ghost" className="w-full justify-start py-2 h-auto" icon={<Square className="w-3.5 h-3.5" />}>Rechteck</Button>
                        <Button variant="ghost" className="w-full justify-start py-2 h-auto" icon={<Circle className="w-3.5 h-3.5" />}>Kreis</Button>
                        <Button variant="ghost" className="w-full justify-start py-2 h-auto" icon={<Minus className="w-3.5 h-3.5" />}>Linie</Button>
                    </div>
                )}
            </div>
        </div>
    );

    // --- VARIANT 2: HYBRID ---
    const SideSheetV2 = () => (
        <div className="flex flex-col gap-4">
            <SectionHeader>Hauptwerkzeuge</SectionHeader>
            <div className="flex flex-col gap-2">
                <IconButton active={selectedTool === 'text'} icon={<Type className="w-5 h-5" />} onClick={() => setSelectedTool('text')} tooltip="Text" className="w-full !justify-start px-4 gap-3"><span className={Typo.ButtonLabel}>Text</span></IconButton>
                <IconButton active={selectedTool === 'brush'} icon={<Pen className="w-5 h-5" />} onClick={() => setSelectedTool('brush')} tooltip="Pinsel" className="w-full !justify-start px-4 gap-3"><span className={Typo.ButtonLabel}>Pinsel</span></IconButton>
                <IconButton active={selectedTool === 'shape'} icon={<Square className="w-5 h-5" />} onClick={() => setSelectedTool('shape')} tooltip="Formen" className="w-full !justify-start px-4 gap-3"><span className={Typo.ButtonLabel}>Formen</span></IconButton>
            </div>

            {selectedTool === 'brush' && (
                <div className="mt-4 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-300">
                    <SectionHeader>Pinselgröße</SectionHeader>
                    <input type="range" className="w-full accent-black dark:accent-white" />
                </div>
            )}
        </div>
    );

    const CanvasOverlayV2 = () => selectedTool === 'shape' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow-2xl rounded-xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-400">
            <IconButton icon={<Square className="w-4 h-4" />} tooltip="Rechteck" />
            <IconButton icon={<Circle className="w-4 h-4" />} tooltip="Kreis" />
            <IconButton icon={<Minus className="w-4 h-4" />} tooltip="Linie" />
            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />
            <IconButton icon={<MousePointer2 className="w-4 h-4" />} onClick={() => setSelectedTool(null)} />
        </div>
    );

    // --- VARIANT 3: GRID ---
    const SideSheetV3 = () => (
        <div className="flex flex-col gap-4">
            <SectionHeader>Alle Werkzeuge</SectionHeader>
            <div className="grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group">
                    <Type className="w-6 h-6 text-zinc-400 group-hover:text-black dark:group-hover:text-white" />
                    <span className={Typo.LabelSmall}>Text</span>
                </button>
                <button className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group">
                    <Pen className="w-6 h-6 text-zinc-400 group-hover:text-black dark:group-hover:text-white" />
                    <span className={Typo.LabelSmall}>Pinsel</span>
                </button>
                <button className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group">
                    <Square className="w-6 h-6 text-zinc-400 group-hover:text-black dark:group-hover:text-white" />
                    <span className={Typo.LabelSmall}>Rechteck</span>
                </button>
                <button className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group">
                    <Circle className="w-6 h-6 text-zinc-400 group-hover:text-black dark:group-hover:text-white" />
                    <span className={Typo.LabelSmall}>Kreis</span>
                </button>
                <button className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group col-span-2">
                    <Minus className="w-6 h-6 text-zinc-400 group-hover:text-black dark:group-hover:text-white" />
                    <span className={Typo.LabelSmall}>Linie hinzufügen</span>
                </button>
            </div>
        </div>
    );

    // --- VARIANT 4: TABS ---
    const SideSheetV4 = () => (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <SectionHeader>Standard</SectionHeader>
                <Button variant="secondary" className="w-full" icon={<Type className="w-4 h-4" />}>Text einfügen</Button>
                <Button variant="secondary" className="w-full" icon={<Pen className="w-4 h-4" />}>Pinsel aktivieren</Button>
            </div>

            <div className="flex flex-col gap-3">
                <SectionHeader>Formen</SectionHeader>
                <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    {['rect', 'circle', 'line'].map(s => (
                        <button
                            key={s}
                            onClick={() => setSelectedTool(s)}
                            className={`flex-1 flex justify-center py-2 rounded-md transition-all ${selectedTool === s ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            {s === 'rect' && <Square className="w-4 h-4" />}
                            {s === 'circle' && <Circle className="w-4 h-4" />}
                            {s === 'line' && <Minus className="w-4 h-4" />}
                        </button>
                    ))}
                </div>
                {selectedTool && (
                    <Button variant="primary" className="animate-in fade-in duration-300">
                        {selectedTool === 'rect' ? 'Rechteck einfügen' : selectedTool === 'circle' ? 'Kreis einfügen' : 'Linie ziehen'}
                    </Button>
                )}
            </div>
        </div>
    );

    // --- VARIANT 5: ICONBAR ---
    const SideSheetV5 = () => (
        <div className="flex gap-4 min-h-[300px]">
            <div className="flex flex-col gap-1 p-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl h-fit">
                <IconButton active={selectedTool === 'text'} icon={<Type className="w-4 h-4" />} onClick={() => setSelectedTool('text')} tooltip="Text" />
                <IconButton active={selectedTool === 'brush'} icon={<Pen className="w-4 h-4" />} onClick={() => setSelectedTool('brush')} tooltip="Pinsel" />
                <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1 mx-2" />
                <IconButton active={selectedTool === 'rect'} icon={<Square className="w-4 h-4" />} onClick={() => setSelectedTool('rect')} tooltip="Rechteck" />
                <IconButton active={selectedTool === 'circle'} icon={<Circle className="w-4 h-4" />} onClick={() => setSelectedTool('circle')} tooltip="Kreis" />
                <IconButton active={selectedTool === 'line'} icon={<Minus className="w-4 h-4" />} onClick={() => setSelectedTool('line')} tooltip="Linie" />
            </div>

            <div className="flex-1 flex flex-col gap-4 py-2">
                <h4 className={Typo.H3}>
                    {selectedTool === 'text' && 'Texteinstellungen'}
                    {selectedTool === 'brush' && 'Pinseleinstellungen'}
                    {['rect', 'circle', 'line'].includes(selectedTool || '') && 'Formeinstellungen'}
                    {!selectedTool && 'Werkzeug wählen'}
                </h4>
                <p className={Typo.Body}>{!selectedTool ? 'Wähle ein Werkzeug links in der Leiste aus, um fortzufahren.' : 'Hier würden die spezifischen Einstellungen für das gewählte Tool erscheinen.'}</p>
                {selectedTool === 'brush' && <input type="range" className="w-full mt-4" />}
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen ${Theme.Colors.CanvasBg} p-12 flex flex-col`}>
            <div className="max-w-6xl mx-auto w-full">
                <div className="mb-12">
                    <h1 className={`${Typo.H1} text-3xl mb-2`}>Annotation UX Playground</h1>
                    <p className={Theme.Colors.TextSecondary}>Teste verschiedene Layout-Varianten für die Anmerkungs-Tools im SideSheet.</p>
                </div>

                <VariantPicker />

                <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 items-start">
                    {/* SIDESHEET PREVIEW */}
                    <Card className="p-0 overflow-hidden shadow-2xl">
                        <div className={`h-14 px-6 flex items-center border-b ${Theme.Colors.Border} ${Theme.Colors.PanelBg}`}>
                            <span className={Typo.H2}>Anmerkungen</span>
                        </div>
                        <div className={`p-8 ${Theme.Colors.PanelBg} min-h-[500px]`}>
                            {activeVariant === 0 && <SideSheetV1 />}
                            {activeVariant === 1 && <SideSheetV2 />}
                            {activeVariant === 2 && <SideSheetV3 />}
                            {activeVariant === 3 && <SideSheetV4 />}
                            {activeVariant === 4 && <SideSheetV5 />}
                        </div>
                        <div className={`p-6 border-t ${Theme.Colors.Border} ${Theme.Colors.PanelBg}`}>
                            <Button variant="primary" className="w-full" icon={<Check className="w-4 h-4" />}>Speichern</Button>
                        </div>
                    </Card>

                    {/* CANVAS PREVIEW */}
                    <div className="flex flex-col gap-4">
                        <MockCanvas>
                            {activeVariant === 1 && <CanvasOverlayV2 />}
                        </MockCanvas>
                        <Card className="p-6">
                            <h3 className={Typo.H3}>Design Notizen</h3>
                            <p className={`${Typo.Body} mt-2 opacity-70`}>
                                {variants[activeVariant].description}. Dieses Layout fokussiert sich auf
                                {activeVariant === 0 ? ' Übersichtlichkeit durch Hierarchie.' :
                                    activeVariant === 1 ? ' minimierte Mauswege durch Canvas-Interaktion.' :
                                        activeVariant === 2 ? ' Schnelligkeit durch direkten Zugriff.' :
                                            activeVariant === 3 ? ' logische Gruppierung von Formen.' :
                                                ' einen professionellen Workflow für Power-User.'}
                            </p>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

