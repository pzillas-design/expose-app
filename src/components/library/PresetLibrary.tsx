import React, { useMemo } from 'react';
import { Plus, Pen, Trash2, MoreHorizontal } from 'lucide-react';
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
    const [menuState, setMenuState] = React.useState<{ id: string, x: number, y: number } | null>(null);

    // Filter templates by language
    const filteredTemplates = useMemo(() => {
        return templates.filter(t => !t.lang || t.lang === currentLang);
    }, [templates, currentLang]);

    // Split into pinned and recent
    const pinnedTemplates = useMemo(() => {
        return filteredTemplates.filter(t => t.isPinned || t.isDefault);
    }, [filteredTemplates]);

    const recentTemplates = useMemo(() => {
        return filteredTemplates
            .filter(t => t.lastUsed && !t.isPinned && !t.isDefault)
            .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
            .slice(0, 5);
    }, [filteredTemplates]);

    const handleOpenMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuState({
            id,
            x: rect.right,
            y: rect.top
        });
    };

    const renderTemplate = (t: PromptTemplate) => (
        <button
            key={t.id}
            onClick={() => onSelect(t)}
            className={`w-full flex items-center gap-3 px-3 py-2 ${Theme.Geometry.Radius} ${Theme.Colors.SurfaceHover} transition-colors group text-left`}
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
                <MoreHorizontal className="w-4 h-4" />
            </button>
        </button>
    );

    return (
        <div className={`flex flex-col ${Theme.Colors.PanelBg} w-full`}>
            {/* Pinned/Default Presets */}
            {pinnedTemplates.length > 0 && (
                <div className="px-3 pt-4 pb-2 space-y-1">
                    {pinnedTemplates.map(renderTemplate)}
                </div>
            )}

            {/* Zuletzt / Recent Section */}
            {recentTemplates.length > 0 && (
                <div className="border-t border-zinc-100 dark:border-zinc-800/50">
                    <div className="px-3 pt-4 pb-1">
                        <span className={`${Typo.LabelSmall} uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-3`}>
                            {currentLang === 'de' ? 'Zuletzt' : 'Recent'}
                        </span>
                    </div>
                    <div className="px-3 pb-2 space-y-1">
                        {recentTemplates.map(renderTemplate)}
                    </div>
                </div>
            )}

            {/* Create New Button */}
            <div className="px-3 py-4 border-t border-zinc-100 dark:border-zinc-800/50">
                <button
                    onClick={onRequestCreate}
                    className={`w-full flex items-center gap-3 px-3 py-2 ${Theme.Geometry.Radius} ${Theme.Colors.SurfaceHover} transition-colors group text-left`}
                >
                    <Plus className="w-4 h-4 text-blue-500" />
                    <span className={`${Typo.Body} text-blue-500 font-medium`}>
                        {t('create_preset') || 'Create Preset'}
                    </span>
                </button>
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
                            top: menuState.y,
                            left: menuState.x - 160
                        }}
                    >
                        {(() => {
                            const template = templates.find(t => t.id === menuState.id);
                            if (!template) return null;
                            const isOwned = template.user_id !== null;

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

                                    {isOwned && (
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
                                    )}
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
