
import React, { useState, useMemo } from 'react';
import { Search, Bookmark, Plus, Pen, X, ChevronDown, ChevronRight, MoreHorizontal, Trash2 } from 'lucide-react';
import { PromptTemplate, TranslationFunction } from '@/types';
import { Tooltip, Theme, Typo, Button, IconButton } from '@/components/ui/DesignSystem';

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
    const [menuState, setMenuState] = useState<{ id: string, x: number, y: number } | null>(null);

    // Filter templates by language
    const filteredTemplates = useMemo(() => {
        return templates.filter(t => !t.lang || t.lang === currentLang);
    }, [templates, currentLang]);

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
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${Theme.Colors.Border}`}>
                <span className={`${Typo.LabelSmall} uppercase tracking-widest text-zinc-400 dark:text-zinc-500`}>
                    {t('presets_header')}
                </span>
                <IconButton
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={onRequestCreate}
                    tooltip={t('new_preset')}
                />
            </div>

            {/* Flat List Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-3">
                <div className="space-y-1">
                    {filteredTemplates.length > 0 ? (
                        filteredTemplates.map(template => {
                            const isOwned = template.user_id !== null;
                            const isMenuOpen = menuState?.id === template.id;

                            return (
                                <div key={template.id} className="relative group">
                                    <button
                                        onClick={() => onSelect(template)}
                                        className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 ${Theme.Geometry.Radius} ${Theme.Colors.SurfaceHover} transition-colors text-left border border-transparent`}
                                    >
                                        <span className={`${Typo.Body} text-zinc-900 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white truncate font-normal flex-1`}>
                                            {template.title || template.prompt}
                                        </span>

                                        {/* Actions Menu Trigger */}
                                        <div className="relative shrink-0 flex items-center">
                                            <button
                                                onClick={(e) => handleOpenMenu(e, template.id)}
                                                className={`p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-all ${isMenuOpen || isOwned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <div className="px-6 py-10 text-center text-zinc-500 text-xs">
                            {t('no_presets') || 'No presets found.'}
                        </div>
                    )}
                </div>
            </div>

            {/* Portal-based Context Menu */}
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
                            left: menuState.x - 160 // Align right edge with the button
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
                                                onTogglePin(template.id); // Re-using as delete/toggle
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


