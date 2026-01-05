
import React, { useState, useMemo } from 'react';
import { Search, Bookmark, Plus, Pen, X, ChevronDown, ChevronRight } from 'lucide-react';
import { PromptTemplate, TranslationFunction } from '@/types';
import { Tooltip, Theme, Typo, Button, IconButton } from '@/components/ui/DesignSystem';

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
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [search, setSearch] = useState('');

    // Filter State
    const [isPresetsExpanded, setIsPresetsExpanded] = useState(true);
    const [isRecentExpanded, setIsRecentExpanded] = useState(false);

    // --- Derived Data ---

    // Filter templates by language first
    const languageFilteredTemplates = useMemo(() => {
        return templates.filter(t => !t.lang || t.lang === currentLang);
    }, [templates, currentLang]);


    const pinnedTemplates = useMemo(() => {
        return languageFilteredTemplates.filter(t => t.isPinned || t.isDefault);
    }, [languageFilteredTemplates]);

    const recentTemplates = useMemo(() => {
        return languageFilteredTemplates
            .filter(t => t.lastUsed && !t.isPinned)
            .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
            .slice(0, 5);
    }, [languageFilteredTemplates]);

    const searchResults = useMemo(() => {
        let result = languageFilteredTemplates;

        if (search.trim()) {
            const lower = search.toLowerCase();
            result = result.filter(t =>
                t.title.toLowerCase().includes(lower) ||
                t.prompt.toLowerCase().includes(lower)
            );
        }

        if (search.trim()) {
            const lower = search.toLowerCase();
            result = result.filter(t =>
                t.title.toLowerCase().includes(lower) ||
                t.prompt.toLowerCase().includes(lower)
            );
        }

        return result;
    }, [languageFilteredTemplates, search]);

    // --- Handlers ---

    const closeSearch = () => {
        setIsSearchActive(false);
        setSearch('');
        setSearch('');
    };

    return (
        <div className={`flex flex-col ${Theme.Colors.PanelBg} relative transition-colors duration-200 w-full`}>

            {/* Top Search Bar (Only when active) */}
            {isSearchActive && (
                <div className="px-6 py-4 shrink-0 min-h-[57px] flex items-center border-b border-zinc-100 dark:border-zinc-800/50">
                    <div className="flex-1 flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                        <Search className={`w-3.5 h-3.5 ${Theme.Colors.TextSecondary} shrink-0`} />
                        <input
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('search_presets')}
                            className={`flex-1 bg-transparent border-none outline-none ${Typo.Body} placeholder-zinc-500 h-full`}
                        />
                        <IconButton icon={<X className="w-4 h-4" />} onClick={closeSearch} tooltip={t('close')} />
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex flex-col">
                <div className="flex flex-col">

                    {/* SEARCH: New Button */}
                    {isSearchActive && (
                        <div className="flex flex-col gap-1 pb-4 px-3">
                            <button
                                onClick={onRequestCreate}
                                className={`flex items-center gap-2 py-2.5 px-3 ${Theme.Geometry.Radius} text-zinc-500 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all w-full text-left group`}
                            >
                                <Plus className="w-3.5 h-3.5 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                <span className="text-xs font-medium">{t('new_preset')}</span>
                            </button>
                        </div>
                    )}

                    {/* SEARCH RESULTS */}
                    {isSearchActive ? (
                        <div className="space-y-1 animate-in fade-in duration-200">
                            {searchResults.length > 0 ? (
                                searchResults.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => onSelect(t)}
                                        className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 ${Theme.Geometry.Radius} ${Theme.Colors.SurfaceHover} transition-colors group text-left border border-transparent`}
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                            <span className={`${Typo.Body} text-zinc-700 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white font-normal truncate`}>
                                                {t.title || t.prompt}
                                            </span>

                                            <div
                                                onClick={(e) => { e.stopPropagation(); onRequestEdit(t); }}
                                                className="p-1 text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                            >
                                                <Pen className="w-3 h-3" />
                                            </div>
                                        </div>

                                        <div
                                            onClick={(e) => { e.stopPropagation(); onTogglePin(t.id); }}
                                            className="text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                        >
                                            <Bookmark className={`w-3.5 h-3.5 ${t.isPinned ? 'fill-black dark:fill-white text-black dark:text-white' : ''}`} />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className={`text-center py-8 ${Typo.Label} text-zinc-500`}>{t('no_objects')}</div>
                            )}
                        </div>
                    ) : (
                        /* DEFAULT VIEW */
                        <>
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

                                    <div className="flex items-center gap-1 transition-opacity">
                                        <IconButton
                                            icon={<Search className="w-3.5 h-3.5" />}
                                            onClick={(e) => { e.stopPropagation(); setIsSearchActive(true); }}
                                            tooltip={t('search_presets')}
                                        />
                                        <IconButton
                                            icon={<Plus className="w-3.5 h-3.5" />}
                                            onClick={(e) => { e.stopPropagation(); onRequestCreate(); }}
                                            tooltip={t('new_preset')}
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
                                                    className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 ${Theme.Geometry.Radius} ${Theme.Colors.SurfaceHover} transition-colors group text-left border border-transparent relative`}
                                                >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                                        <span className={`${Typo.Body} text-zinc-900 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white truncate font-normal`}>
                                                            {t.title}
                                                        </span>

                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); onRequestEdit(t); }}
                                                            className="p-1 text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                                        >
                                                            <Pen className="w-3 h-3" />
                                                        </div>
                                                    </div>

                                                    {/* Pin Button */}
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); onTogglePin(t.id); }}
                                                            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                        >
                                                            <Bookmark className="w-3 h-3 fill-zinc-400 dark:fill-zinc-500 group-hover:fill-zinc-600 dark:group-hover:fill-zinc-300 transition-colors" />
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-6 py-10 text-center animate-in fade-in duration-500">
                                                <p className={`${Typo.Body} font-medium text-zinc-400 dark:text-zinc-500 leading-relaxed w-full`}>
                                                    {currentLang === 'de'
                                                        ? 'Suchen und speichern Sie Presets, um sie hier griffbereit zu haben.'
                                                        : 'Search and save presets to keep them handy right here.'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* RECENT SECTION - Always visible header */}
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
                                                    <div className="flex items-center gap-1">
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); onTogglePin(t.id); }}
                                                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors p-1"
                                                        >
                                                            <Bookmark className="w-3 h-3" />
                                                        </div>
                                                    </div>
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
