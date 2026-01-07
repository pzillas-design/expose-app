import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Box, Square, Circle, Minus, Eraser, Loader2, Check, Trash2, MoreVertical } from 'lucide-react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { SidebarAccordion, SidebarAccordionItem } from '@/components/ui/SidebarAccordion';
import { TranslationFunction, LibraryCategory } from '@/types';
import { createPortal } from 'react-dom';

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
    scrollable?: boolean;
}

export const ObjectsTab: React.FC<ObjectsTabProps> = ({
    onAddObject, t, currentLang, library,
    onAddUserCategory, onDeleteUserCategory, onAddUserItem, onDeleteUserItem, onBack,
    scrollable = true
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [menuState, setMenuState] = useState<{ catId: string, itemId: string, x: number, y: number } | null>(null);

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
        if (!iconNameOrChar || iconNameOrChar === '📦') return <Box className="w-3.5 h-3.5" />;
        if (iconNameOrChar === 'Square') return <Square className="w-3.5 h-3.5" />;
        if (iconNameOrChar === 'Circle') return <Circle className="w-3.5 h-3.5" />;
        if (iconNameOrChar === 'Minus') return <Minus className="w-3.5 h-3.5" />;
        if (iconNameOrChar === 'Eraser') return <Eraser className="w-3.5 h-3.5" />;
        return <span className="text-sm font-medium">{iconNameOrChar}</span>;
    };

    const handleOpenMenu = (e: React.MouseEvent, catId: string, itemId: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuState({ catId, itemId, x: rect.right, y: rect.top });
    };

    return (
        <div className={`flex flex-col relative w-full`}>
            <SidebarAccordion
                title={currentLang === 'de' ? 'Stempel' : 'Stamps'}
                isExpanded={isExpanded}
                onToggle={() => setIsExpanded(!isExpanded)}
                onAdd={() => setIsAdding(!isAdding)}
                isEmpty={allItems.length === 0 && !isAdding}
                emptyText={currentLang === 'de' ? 'Keine Stempel gefunden' : 'No stamps found'}
                hasTopBorder={false}
            >
                {/* Inline Adding Row at the TOP */}
                {isAdding && (
                    <div className="flex items-center gap-3 px-6 py-2.5 bg-zinc-50/50 dark:bg-zinc-800/30 animate-in slide-in-from-top-2 duration-200">
                        <Box className="w-3.5 h-3.5 text-zinc-400" />
                        <input
                            ref={inputRef}
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            onKeyDown={(e) => {
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

                {allItems.map((item, idx) => (
                    <SidebarAccordionItem
                        key={`${item.id}-${idx}`}
                        label={item.label}
                        icon={renderIcon(item.icon)}
                        onClick={() => onAddObject?.(item.label, item.id, item.icon)}
                        onMenuClick={(e) => handleOpenMenu(e, item.catId, item.id)}
                        rightLabel={currentLang === 'de' ? 'Hinzufügen' : 'Add'}
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
                            rounded-lg shadow-xl shadow-black/10 ring-1 ring-black/5
                            animate-in fade-in zoom-in-95 duration-100 flex flex-col
                        `}
                        style={{
                            top: menuState.y + 30,
                            left: menuState.x - 160
                        }}
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteUserItem(menuState.catId, menuState.itemId);
                                setMenuState(null);
                            }}
                            className={`flex items-center gap-3 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors group cursor-pointer w-full ${Theme.Geometry.Radius}`}
                        >
                            <Trash2 className="w-3.5 h-3.5 text-red-500 group-hover:text-red-600" />
                            <span className={`${Typo.Body} text-red-500 group-hover:text-red-600 dark:text-red-400 font-medium`}>
                                {t('delete') || 'Delete'}
                            </span>
                        </button>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};
