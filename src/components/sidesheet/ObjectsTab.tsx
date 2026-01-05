
import React, { useState, useMemo, useEffect } from 'react';
import { Box, Plus, Square, Circle, Minus, Eraser } from 'lucide-react';
import { Typo, Theme, IconButton } from '@/components/ui/DesignSystem';
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
    // Collect all items from all categories if we want to remove category headers
    const allItems = useMemo(() => {
        return library.flatMap(cat => cat.items.map(item => ({ ...item, catId: cat.id })));
    }, [library]);

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
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 overflow-hidden">

            {/* List Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
                <div className="flex flex-col">
                    {allItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
                            <Box className="w-8 h-8 opacity-20" />
                            <span className={Typo.Label}>{t('no_objects')}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y divide-zinc-50 dark:divide-zinc-800/50">
                            {allItems.map((item, idx) => (
                                <div
                                    key={`${item.id}-${idx}`}
                                    onClick={() => onAddObject?.(item.label, item.id)}
                                    className="group/item relative flex items-center gap-3 px-6 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer active:scale-[0.98] select-none transition-all"
                                >
                                    <span className="w-6 shrink-0 flex items-center justify-center">
                                        {renderIcon(item.icon)}
                                    </span>

                                    <span className={`${Typo.Body} text-zinc-600 dark:text-zinc-400 group-hover/item:text-black dark:group-hover/item:text-white transition-colors flex-1 truncate`}>
                                        {item.label}
                                    </span>

                                    {/* Simplified Hover Hint - Fade in on the right */}
                                    <span className="opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 text-zinc-400 dark:text-zinc-500 text-[10px] font-medium whitespace-nowrap pointer-events-none">
                                        {currentLang === 'de' ? 'Hinzufügen' : 'Add'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Button at the bottom of the list */}
                <div className="px-6 py-6 flex justify-center">
                    <button
                        onClick={() => {/* Trigger flow */ }}
                        className="group/add flex items-center gap-2.5 px-6 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-200 dark:border-zinc-700/50 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98]"
                    >
                        <div className="w-5 h-5 rounded-full bg-zinc-200/50 dark:bg-zinc-700/50 flex items-center justify-center group-hover/add:bg-black dark:group-hover/add:bg-white group-hover/add:text-white dark:group-hover/add:text-black transition-all">
                            <Plus className="w-3 h-3" />
                        </div>
                        <span className={`${Typo.Label} font-semibold tracking-tight`}>
                            {currentLang === 'de' ? 'Objekt hinzufügen' : 'Add object'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
