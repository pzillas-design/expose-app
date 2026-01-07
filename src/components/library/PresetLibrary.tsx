import React, { useState, useMemo } from 'react';
import { Plus, Pen, ChevronDown, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';
import { PromptTemplate, TranslationFunction } from '@/types';
import { Theme, Typo, IconButton } from '@/components/ui/DesignSystem';
import { createPortal } from 'react-dom';

interface PresetLibraryProps {
    templates: PromptTemplate[];
    onSelect: (template: PromptTemplate) => void;
    onTogglePin: (id: string) => void;
    onRequestCreate: () => void;
    onRequestEdit: (template: PromptTemplate) => void;
    t: TranslationFunction;
    currentLang: 'de' | 'en';
}

export const PresetLibrary: React.FC<PresetLibraryProps> = ({
    templates,
    onSelect,
    onTogglePin,
    onRequestCreate,
    onRequestEdit,
    t,
    currentLang
}) => {
    const [isPresetsExpanded, setIsPresetsExpanded] = useState(true);
    const [isRecentExpanded, setIsRecentExpanded] = useState(false);
    const [menuState, setMenuState] = React.useState<{ id: string, x: number, y: number } | null>(null);

    // Filter templates by language
    const languageFilteredTemplates = useMemo(() => {
        return templates.filter(t => !t.lang || t.lang === currentLang);
    }, [templates, currentLang]);

    const pinnedTemplates = useMemo(() => {
        return languageFilteredTemplates.filter(t => t.isPinned || t.isDefault);
    }, [languageFilteredTemplates]);

    const recentTemplates = useMemo(() => {
        return languageFilteredTemplates
            .filter(t => t.lastUsed && !t.isPinned && !t.isDefault)
            .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
            .slice(0, 5);
    }, [languageFilteredTemplates]);

    const handleOpenMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuState({
            id,
            x: rect.right,
            y: rect.top
        });
    };

    return (
        <div className={`flex flex-col ${Theme.Colors.PanelBg} relative transition-colors duration-200 w-full`}>
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* PRESETS SECTION */}
                <div className="flex flex-col">
                    <div className={`flex items-center justify-between px-3 h-14 border-t ${Theme.Colors.Border} hover:bg-zinc-50 dark:hover:bg-zinc-800/10 transition-colors group`}>
                        <button
                            onClick={() => setIsPresetsExpanded(!isPresetsExpanded)}
                            className="flex items-center gap-2 flex-1 h-full"
                        >
                            {isPresetsExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                            <span className={`${Typo.LabelSmall} uppercase tracking-widest text-zinc-400 dark:text-zinc-500`}>
                                {t('presets_header')}
                            </span>
                        </button>

                        <div className="flex items-center gap-1">
                            <IconButton
                                icon={<Plus className="w-3.5 h-3.5" />}
                                onClick={(e) => { e.stopPropagation(); onRequestCreate(); }}
                                tooltip={t('new_preset') || 'New Preset'}
                            />
                        </div>
                    </div>

                    {isPresetsExpanded && (
                        <div className="px-3 pt-0.5 pb-4 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            {pinnedTemplates.length > 0 ? (
                                pinnedTemplates.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => onSelect(t)}
                                        className={`w-full flex items-center gap-3 px-3 py-1.5 ${Theme.Geometry.Radius} ${Theme.Colors.SurfaceHover} transition-colors group text-left`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className={`${Typo.Body} ${Theme.Colors.TextSecondary} group-hover:text-black dark:group-hover:text-white truncate font-normal`}>
                                                {t.title}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleOpenMenu(e, t.id)}
                                            className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-opacity p-1"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </button>
                                ))
                            ) : (
                                <div className="px-6 py-10 text-center animate-in fade-in duration-500">
                                    <p className={`${Typo.Body} font-medium text-zinc-400 dark:text-zinc-500 leading-relaxed w-full`}>
                                        {currentLang === 'de'
                                            ? 'Noch keine Vorlagen vorhanden.'
                                            : 'No presets available yet.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* RECENT SECTION */}
                <div className="flex flex-col">
                    <button
                        onClick={() => setIsRecentExpanded(!isRecentExpanded)}
                        className={`flex items-center gap-2 px-3 h-14 border-t ${Theme.Colors.Border} hover:bg-zinc-50 dark:hover:bg-zinc-800/10 transition-colors`}
                    >
                        {isRecentExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                        <span className={`${Typo.LabelSmall} uppercase tracking-widest text-zinc-400 dark:text-zinc-500`}>
                            {currentLang === 'de' ? 'Zuletzt' : 'Recent'}
                        </span>
                    </button>

                    {isRecentExpanded && (
                        <div className="px-3 pt-0.5 pb-4 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            {recentTemplates.length > 0 ? (
                                recentTemplates.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => onSelect(t)}
                                        className={`w-full flex items-center gap-3 px-3 py-1.5 ${Theme.Geometry.Radius} ${Theme.Colors.SurfaceHover} transition-colors group text-left`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className={`${Typo.Body} ${Theme.Colors.TextSecondary} group-hover:text-black dark:group-hover:text-white truncate font-normal`}>
                                                {t.title}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleOpenMenu(e, t.id)}
                                            className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-opacity p-1"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </button>
                                ))
                            ) : (
                                <div className="px-6 py-10 text-center animate-in fade-in duration-500">
                                    <p className={`${Typo.Body} font-medium text-zinc-400 dark:text-zinc-500 leading-relaxed w-full`}>
                                        {currentLang === 'de'
                                            ? 'Ihre zuletzt verwendeten Prompts werden hier gelistet.'
                                            : 'Your recently used prompts will automatically appear here.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Context Menu */}
            {menuState && createPortal(
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setMenuState(null)} onContextMenu={(e) => { e.preventDefault(); setMenuState(null); }} />
                    <div
                        className={`
                            fixed z-[101] min-w-[160px] p-1
                            bg-white dark:bg-zinc-950
                            border border-zinc-200 dark:border-zinc-800
                            rounded-lg shadow-xl shadow-black/10 ring-1 ring-black/5
                            animate-in fade-in zoom-in-95 duration-100 flex flex-col
                        `}
                        style={{
                            top: menuState.y + 30, // Position below the button
                            left: menuState.x - 160
                        }}
                    >
                        {(() => {
                            const template = templates.find(t => t.id === menuState.id);
                            if (!template) return null;

                            return (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRequestEdit(template);
                                            setMenuState(null);
                                        }}
                                        className={`flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 text-left transition-colors group cursor-pointer w-full ${Theme.Geometry.Radius}`}
                                    >
                                        <Pen className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black dark:group-hover:text-white" />
                                        <span className={`${Typo.Body} text-zinc-600 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white font-medium`}>
                                            {t('edit') || 'Edit'}
                                        </span>
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTogglePin(template.id);
                                            setMenuState(null);
                                        }}
                                        className={`flex items-center gap-3 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors group cursor-pointer w-full ${Theme.Geometry.Radius}`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-red-500 group-hover:text-red-600" />
                                        <span className={`${Typo.Body} text-red-500 group-hover:text-red-600 dark:text-red-400 font-medium`}>
                                            {t('delete') || 'Delete'}
                                        </span>
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};
