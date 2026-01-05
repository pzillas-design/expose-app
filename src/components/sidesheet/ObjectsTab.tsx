
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Box, Plus, Square, Circle, Minus, Eraser, Loader2, Check } from 'lucide-react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory } from '@/types';

interface ObjectsTabProps {
    onAddObject?: (label: string, itemId: string) => void;
    t: TranslationFunction;
    currentLang: 'de' | 'en';
    library: LibraryCategory[];
    onAddUserCategory: (label: string) => void;
    onDeleteUserCategory: (id: string) => void;
    onAddUserItem: (catId: string, label: string, icon?: string) => Promise<void>;
    onDeleteUserItem: (catId: string, itemId: string) => void;
    onBack?: () => void;
}

export const ObjectsTab: React.FC<ObjectsTabProps> = ({
    onAddObject, t, currentLang, library,
    onAddUserCategory, onDeleteUserCategory, onAddUserItem, onDeleteUserItem, onBack
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Collect all items from all categories
    const allItems = useMemo(() => {
        return library.flatMap(cat => cat.items.map(item => ({ ...item, catId: cat.id })));
    }, [library]);

    useEffect(() => {
        if (isAdding && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAdding]);

    const handleCreate = async () => {
        if (!newLabel.trim() || isSubmitting) {
            setIsAdding(false);
            setNewLabel('');
            return;
        }

        setIsSubmitting(true);
        try {
            // In our simplified logic, everything goes to 'basics'
            await onAddUserItem('basics', newLabel.trim());
            setNewLabel('');
            setIsAdding(false);
        } catch (err) {
            console.error("Failed to create object", err);
        } finally {
            setIsSubmitting(false);
        }
    };

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
            <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
                <div className="flex flex-col">
                    {allItems.length === 0 && !isAdding ? (
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
                                    <span className="opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 text-zinc-400 dark:text-zinc-500 text-[10px] font-medium whitespace-nowrap pointer-events-none">
                                        {currentLang === 'de' ? 'Hinzufügen' : 'Add'}
                                    </span>
                                </div>
                            ))}

                            {/* Inline Adding Row */}
                            {isAdding && (
                                <div className="flex items-center gap-3 px-6 py-3.5 bg-zinc-50/50 dark:bg-zinc-800/30 border-y border-zinc-100 dark:border-zinc-800/50 animate-in slide-in-from-bottom-2 duration-200">
                                    <span className="w-6 shrink-0 flex items-center justify-center opacity-40">
                                        📦
                                    </span>
                                    <input
                                        ref={inputRef}
                                        value={newLabel}
                                        onChange={e => setNewLabel(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleCreate();
                                            if (e.key === 'Escape') setIsAdding(false);
                                        }}
                                        disabled={isSubmitting}
                                        className={`flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 ${Typo.Body} text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400`}
                                        placeholder={currentLang === 'de' ? 'Name eingeben...' : 'Enter name...'}
                                    />
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                                    ) : (
                                        <button
                                            onClick={handleCreate}
                                            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
                                        >
                                            <Check className="w-4 h-4 text-green-600" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Add Trigger */}
                {!isAdding && (
                    <div className="px-6 py-6 flex justify-center">
                        <button
                            onClick={() => setIsAdding(true)}
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
                )}
            </div>
        </div>
    );
};
