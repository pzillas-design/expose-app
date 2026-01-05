
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Box, Plus, Square, Circle, Minus, Eraser, Loader2, Check, Pencil, Trash2 } from 'lucide-react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory } from '@/types';

interface ObjectsTabProps {
    onAddObject?: (label: string, itemId: string, icon?: string) => void;
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
    const [isEditMode, setIsEditMode] = useState(false);
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
        if (!iconNameOrChar || iconNameOrChar === '📦') return <Box className="w-3.5 h-3.5 opacity-40 translate-y-[0.5px]" />;
        if (iconNameOrChar === 'Square') return <Square className="w-4 h-4 opacity-40 translate-y-[0.5px]" />;
        if (iconNameOrChar === 'Circle') return <Circle className="w-4 h-4 opacity-40 translate-y-[0.5px]" />;
        if (iconNameOrChar === 'Minus') return <Minus className="w-4 h-4 -rotate-45 opacity-40 translate-y-[0.5px]" />;
        if (iconNameOrChar === 'Eraser') return <Eraser className="w-4 h-4 opacity-40 translate-y-[0.5px]" />;
        return <span className="text-xl leading-none">{iconNameOrChar}</span>;
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 overflow-hidden">

            {/* Header with Headline and Icons */}
            <div className="px-6 pt-6 pb-4 border-t border-zinc-100 dark:border-zinc-800/50">
                <div className="flex items-center justify-between">
                    <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[9px]`}>
                        {currentLang === 'de' ? 'Stempel' : 'Stamps'}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => { setIsAdding(!isAdding); if (!isAdding) setIsEditMode(false); }}
                            className={`p-1.5 rounded-lg transition-all ${isAdding ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                        >
                            <Plus className={`w-3.5 h-3.5 transition-transform ${isAdding ? 'rotate-45' : ''}`} />
                        </button>
                        <button
                            onClick={() => { setIsEditMode(!isEditMode); if (!isEditMode) setIsAdding(false); }}
                            className={`p-1.5 rounded-lg transition-all ${isEditMode ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-6 px-1">
                <div className="flex flex-col">
                    {/* Inline Adding Row at the TOP */}
                    {isAdding && (
                        <div className="flex items-center gap-3 px-5 py-3.5 bg-zinc-50/50 dark:bg-zinc-800/30 border-y border-zinc-100 dark:border-zinc-800/50 animate-in slide-in-from-top-2 duration-200">
                            <span className="w-6 shrink-0 flex items-center justify-center">
                                <Box className="w-3.5 h-3.5 text-zinc-400 opacity-40 translate-y-[0.5px]" />
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
                                    onClick={() => !isEditMode && onAddObject?.(item.label, item.id, item.icon)}
                                    className={`group/item relative flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 select-none transition-all ${isEditMode ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
                                >
                                    <span className="w-6 shrink-0 flex items-center justify-center">
                                        {renderIcon(item.icon)}
                                    </span>
                                    <span className={`${Typo.Body} text-zinc-600 dark:text-zinc-400 group-hover/item:text-black dark:group-hover/item:text-white transition-colors flex-1 truncate`}>
                                        {item.label}
                                    </span>

                                    {isEditMode ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteUserItem(item.catId, item.id); }}
                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-300 hover:text-red-500 rounded-md transition-all animate-in fade-in zoom-in-90"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    ) : (
                                        <span className="opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 text-zinc-400 dark:text-zinc-500 text-[10px] font-medium whitespace-nowrap pointer-events-none">
                                            {currentLang === 'de' ? 'Hinzufügen' : 'Add'}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
