import React, { useState, useMemo } from 'react';
import { Plus, Pen, Trash } from 'lucide-react';
import { PromptTemplate, TranslationFunction } from '@/types';
import { Theme, Typo, IconButton } from '@/components/ui/DesignSystem';
import { SidebarAccordion, SidebarAccordionItem } from '@/components/ui/SidebarAccordion';
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
        <div className={`flex flex-col bg-zinc-50/50 dark:bg-zinc-900/20 relative transition-colors duration-200 w-full`}>
            {/* PRESETS SECTION */}
            <SidebarAccordion
                title={t('presets_header')}
                isExpanded={isPresetsExpanded}
                onToggle={() => setIsPresetsExpanded(!isPresetsExpanded)}
                hasTopBorder={false}
                onAdd={onRequestCreate}
                isEmpty={pinnedTemplates.length === 0}
                emptyText={currentLang === 'de' ? 'Noch keine Vorlagen vorhanden.' : 'No presets available yet.'}
            >
                {pinnedTemplates.map(t => (
                    <SidebarAccordionItem
                        key={t.id}
                        label={t.title}
                        onClick={() => onSelect(t)}
                        onMenuClick={(e) => handleOpenMenu(e, t.id)}
                        menuTooltip={currentLang === 'de' ? 'Vorlage bearbeiten' : 'Edit template'}
                    />
                ))}
            </SidebarAccordion>

            {/* RECENT SECTION */}
            <SidebarAccordion
                title={currentLang === 'de' ? 'Zuletzt' : 'Recent'}
                isExpanded={isRecentExpanded}
                onToggle={() => setIsRecentExpanded(!isRecentExpanded)}
                isEmpty={recentTemplates.length === 0}
                emptyText={currentLang === 'de' ? 'Ihre zuletzt verwendeten Prompts werden hier gelistet.' : 'Your recently used prompts will automatically appear here.'}
            >
                {recentTemplates.map(t => (
                    <SidebarAccordionItem
                        key={t.id}
                        label={t.title}
                        onClick={() => onSelect(t)}
                        onMenuClick={(e) => handleOpenMenu(e, t.id)}
                        menuTooltip={currentLang === 'de' ? 'Vorlage bearbeiten' : 'Edit template'}
                    />
                ))}
            </SidebarAccordion>

            {/* Context Menu */}
            {menuState && createPortal(
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setMenuState(null)} onContextMenu={(e) => { e.preventDefault(); setMenuState(null); }} />
                    <div
                        className={`
                            fixed z-[101] min-w-[160px] p-1
                            bg-white dark:bg-zinc-950
                            border border-zinc-200 dark:border-zinc-800
                            rounded-lg shadow-md shadow-black/5 ring-1 ring-black/5
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
                                        <Trash className="w-3.5 h-3.5 text-red-500 group-hover:text-red-600" />
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
