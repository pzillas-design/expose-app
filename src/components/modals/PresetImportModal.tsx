import React from 'react';
import { PromptTemplate, TranslationFunction, PresetControl } from '@/types';
import { Button, Theme, Typo, IconButton } from '@/components/ui/DesignSystem';
import { X, Download, Wand2, Plus, Check } from 'lucide-react';

interface PresetImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    template: Partial<PromptTemplate>;
    onImport: () => void;
    t: TranslationFunction;
    currentLang: 'de' | 'en';
}

export const PresetImportModal: React.FC<PresetImportModalProps> = ({
    isOpen,
    onClose,
    template,
    onImport,
    t,
    currentLang
}) => {
    if (!isOpen || !template) return null;

    const hasControls = template.controls && template.controls.length > 0;

    return (
        <div
            className="fixed inset-0 z-[120] bg-zinc-950/80 flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-md"
            onClick={onClose}
        >
            <div
                className={`
                    w-full max-w-md 
                    ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} 
                    shadow-2xl flex flex-col overflow-hidden
                    animate-in zoom-in-95 slide-in-from-bottom-4 duration-500
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Visual Header */}
                <div className="h-24 bg-gradient-to-br from-zinc-900 to-black dark:from-white dark:to-zinc-200 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)]" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/10 dark:bg-black/10 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20 dark:border-black/10">
                        <Wand2 className="w-6 h-6 text-white dark:text-black" />
                    </div>
                </div>

                <div className="px-8 pt-6 pb-2">
                    <Typo.Micro className="text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-2 text-center block">
                        {currentLang === 'de' ? 'VORLAGE GETEILT' : 'TEMPLATE SHARED'}
                    </Typo.Micro>
                    <h2 className={`${Typo.H2} text-2xl ${Theme.Colors.TextHighlight} text-center mb-6`}>
                        {template.title}
                    </h2>

                    <div className="space-y-6">
                        {/* Prompt Preview */}
                        <div className="flex flex-col gap-2">
                            <label className={`${Typo.Label} text-zinc-400 uppercase text-[10px] tracking-wider`}>Prompt</label>
                            <div className={`p-4 ${Theme.Colors.PanelBg} border ${Theme.Colors.Border} ${Theme.Geometry.Radius} font-mono text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 max-h-32 overflow-y-auto no-scrollbar whitespace-pre-wrap`}>
                                {template.prompt}
                            </div>
                        </div>

                        {/* Controls/Variables Preview */}
                        {hasControls && (
                            <div className="flex flex-col gap-2">
                                <label className={`${Typo.Label} text-zinc-400 uppercase text-[10px] tracking-wider`}>
                                    {currentLang === 'de' ? 'Variablen' : 'Variables'}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {template.controls?.map((c: PresetControl) => (
                                        <div key={c.id} className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                            <span className="opacity-50">#</span>
                                            {c.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 flex flex-col gap-3">
                    <Button
                        variant="primary"
                        onClick={onImport}
                        className="w-full py-6 text-sm font-bold shadow-lg shadow-zinc-900/10 dark:shadow-white/5"
                        icon={<Plus className="w-5 h-5" />}
                    >
                        {currentLang === 'de' ? 'In Bibliothek speichern' : 'Save to library'}
                    </Button>
                    <button
                        onClick={onClose}
                        className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    >
                        {t('cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};
