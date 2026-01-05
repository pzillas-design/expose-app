
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Box, Plus, Square, Circle, Minus, Eraser } from 'lucide-react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory } from '@/types';

interface ObjectsTabProps {
    onAddObject?: (label: string, itemId: string) => void;
    t: TranslationFunction;
    currentLang: 'de' | 'en';
    library: LibraryCategory[];
    onAddUserCategory: (label: string) => void;
    onDeleteUserCategory: (id: string) => void;
    onAddUserItem: (catId: string, label: string) => void;
    onDeleteUserItem: (catId: string, itemId: string) => void;
    onBack?: () => void;
}

export const ObjectsTab: React.FC<ObjectsTabProps> = ({
    onAddObject, t, currentLang, library,
    onAddUserCategory, onDeleteUserCategory, onAddUserItem, onDeleteUserItem, onBack
}) => {
    // Open categories by default
    const [openCategories, setOpenCategories] = useState<string[]>(['basics', 'utilities']);

    // Auto-expand categories if library changes
    useEffect(() => {
        if (library.length > 0) {
            setOpenCategories(library.map(c => c.id));
        }
    }, [library]);

    const filteredCategories = library;

    // Helpers for Icons
    const renderIcon = (iconNameOrChar: string | undefined) => {
        if (!iconNameOrChar) return '📦';
        if (iconNameOrChar === 'Square') return <Square className="w-5 h-5 opacity-70" />;
        if (iconNameOrChar === 'Circle') return <Circle className="w-5 h-5 opacity-70" />;
        if (iconNameOrChar === 'Minus') return <Minus className="w-5 h-5 -rotate-45 opacity-70" />;
        if (iconNameOrChar === 'Eraser') return <Eraser className="w-5 h-5 opacity-70" />;
        return <span className="text-xl leading-none">{iconNameOrChar}</span>;
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">

            {/* Minimal spacing at top */}
            <div className="h-2 shrink-0" />

            {/* List Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
                <div className="flex flex-col">
                    {filteredCategories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
                            <Box className="w-8 h-8 opacity-20" />
                            <span className={Typo.Label}>{t('no_objects')}</span>
                        </div>
                    ) : (
                        filteredCategories.map((category) => {
                            const isExpanded = openCategories.includes(category.id);

                            return (
                                <div key={category.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-none">
                                    <div className="flex items-center justify-between pl-6 pr-4 py-3.5 transition-colors group select-none hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                        <button
                                            onClick={() => setOpenCategories(prev =>
                                                prev.includes(category.id) ? prev.filter(c => c !== category.id) : [...prev, category.id]
                                            )}
                                            className="flex-1 flex items-center gap-3 text-left min-w-0"
                                        >
                                            <span className="text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors shrink-0">
                                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                            </span>
                                            <span className={`${Typo.Label} ${Theme.Colors.TextSecondary} group-hover:text-black dark:group-hover:text-white transition-colors normal-case tracking-normal text-[13px] truncate`}>
                                                {category.label}
                                            </span>
                                        </button>
                                    </div>

                                    {isExpanded && (
                                        <div className="flex flex-col pb-2 animate-in slide-in-from-top-1 duration-200">
                                            {category.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => onAddObject?.(item.label, item.id)}
                                                    className="group/item relative flex items-center gap-3 pl-6 pr-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer active:scale-[0.99] select-none transition-all"
                                                >
                                                    <span className="w-6 shrink-0 flex items-center justify-center">
                                                        {renderIcon(item.icon)}
                                                    </span>

                                                    <span className={`${Typo.Body} text-zinc-600 dark:text-zinc-400 group-hover/item:text-black dark:group-hover/item:text-white transition-colors flex-1 truncate`}>
                                                        {item.label}
                                                    </span>

                                                    {/* Hover Hint Label - Premium Slide Out */}
                                                    <div className="absolute left-[70%] top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 group-hover/item:left-[100%] transition-all duration-300 pointer-events-none whitespace-nowrap z-50 pl-4">
                                                        <div className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-2xl flex items-center gap-2 border border-white/10 dark:border-black/10">
                                                            <Plus className="w-3 h-3" />
                                                            {currentLang === 'de' ? 'Klicken zum Einfügen' : 'Click to place'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {category.items.length === 0 && (
                                                <div className="px-6 py-3 text-xs text-zinc-400 italic">
                                                    Empty
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
