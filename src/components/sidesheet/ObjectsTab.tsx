
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, Box, ArrowLeft, GripVertical, X, Plus, Trash2, Check, Pen } from 'lucide-react';
import { Typo, Theme, IconButton, Button, Tooltip } from '@/components/ui/DesignSystem';
import { TranslationFunction, LibraryCategory } from '@/types';

interface ObjectsTabProps {
    onAddObject?: (label: string, itemId: string) => void;
    onBack?: () => void;
    t: TranslationFunction;
    currentLang: 'de' | 'en';
    library: LibraryCategory[];
    onAddUserCategory: (label: string) => void;
    onDeleteUserCategory: (id: string) => void;
    onAddUserItem: (catId: string, label: string) => void;
    onDeleteUserItem: (catId: string, itemId: string) => void;
}

export const ObjectsTab: React.FC<ObjectsTabProps> = ({
    onAddObject, onBack, t, currentLang, library,
    onAddUserCategory, onDeleteUserCategory, onAddUserItem, onDeleteUserItem
}) => {
    const [openCategories, setOpenCategories] = useState<string[]>(['basics']); // Default open relevant cat
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);

    // Creation States
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [addingItemToCatId, setAddingItemToCatId] = useState<string | null>(null);
    const [newItemName, setNewItemName] = useState('');

    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    const handleDragStart = (e: React.DragEvent, text: string, itemId: string) => {
        if (isEditMode) {
            e.preventDefault();
            return;
        }
        const payload = JSON.stringify({ text: text, itemId, variantIndex: 0 });
        e.dataTransfer.setData('application/x-nano-stamp', payload);
        e.dataTransfer.effectAllowed = 'copy';

        const el = e.currentTarget as HTMLElement;
        el.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const el = e.currentTarget as HTMLElement;
        el.style.opacity = '1';
    };

    const toggleCategory = (id: string) => {
        setOpenCategories(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const clearSearch = () => {
        setSearch('');
        setIsSearchOpen(false);
    };

    const handleCreateCategory = () => {
        if (newCatName.trim()) {
            onAddUserCategory(newCatName.trim());
            setNewCatName('');
            setIsCreatingCategory(false);
        }
    };

    const handleCreateItem = (catId: string) => {
        if (newItemName.trim()) {
            onAddUserItem(catId, newItemName.trim());
            setNewItemName('');
            setAddingItemToCatId(null);
        }
    };

    const filteredCategories = useMemo(() => {
        // 1. Filter by language (allow User created categories always or if lang matches)
        let cats = library.filter(c => c.isUserCreated || (c.lang || 'de') === currentLang);

        // 2. Filter by Search
        if (search.trim()) {
            const lowerSearch = search.toLowerCase();
            cats = cats.map(cat => ({
                ...cat,
                items: cat.items.filter(item =>
                    item.label.toLowerCase().includes(lowerSearch)
                )
            })).filter(cat => cat.items.length > 0);
        }
        return cats;
    }, [search, currentLang, library]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900">

            {/* Header */}
            <div className={`h-14 shrink-0 border-b ${Theme.Colors.Border} flex items-center px-4 justify-between relative transition-colors ${isEditMode ? 'bg-zinc-100 dark:bg-zinc-800/50' : Theme.Colors.PanelBg}`}>

                {/* Default Header Content */}
                <div className={`absolute inset-0 flex items-center justify-between px-4 transition-all duration-300 ${isSearchOpen ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
                    <div className="flex items-center gap-2">
                        <IconButton icon={<ArrowLeft className="w-4 h-4" />} onClick={onBack} tooltip={t('back')} />
                        <span className={`${Typo.Label} ${Theme.Colors.TextPrimary}`}>
                            {isEditMode ? t('edit') : t('objects_tool')}
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <Tooltip text={isEditMode ? t('done') : t('edit')}>
                            <IconButton
                                icon={isEditMode ? <Check className="w-4 h-4 text-emerald-500" /> : <Pen className="w-4 h-4" />}
                                onClick={() => setIsEditMode(!isEditMode)}
                                active={isEditMode}
                            />
                        </Tooltip>
                        {!isEditMode && (
                            <IconButton icon={<Search className="w-4 h-4" />} onClick={() => setIsSearchOpen(true)} tooltip={t('search')} />
                        )}
                    </div>
                </div>

                {/* Search Overlay */}
                <div className={`absolute inset-0 flex items-center gap-2 px-4 bg-zinc-100 dark:bg-zinc-800 transition-all duration-300 ${isSearchOpen ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-105'}`}>
                    <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('search_library')}
                        className={`flex-1 bg-transparent border-none outline-none ${Typo.Body} ${Theme.Colors.TextPrimary} placeholder-zinc-500 h-full`}
                    />
                    <IconButton icon={<X className="w-4 h-4" />} onClick={clearSearch} tooltip={t('close')} />
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-6">

                {/* Category Creation Input (Only visible in Edit Mode) */}
                {isCreatingCategory && (
                    <div className={`p-4 border-b ${Theme.Colors.Border} ${Theme.Colors.SurfaceSubtle} animate-in slide-in-from-top-2`}>
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                value={newCatName}
                                onChange={(e) => setNewCatName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                                placeholder={t('category_name')}
                                className={`flex-1 ${Theme.Colors.Surface} border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-sm outline-none`}
                            />
                            <IconButton icon={<Check className="w-4 h-4" />} onClick={handleCreateCategory} disabled={!newCatName.trim()} />
                            <IconButton icon={<X className="w-4 h-4" />} onClick={() => setIsCreatingCategory(false)} />
                        </div>
                    </div>
                )}

                {/* Add Category Button (Only visible in Edit Mode and not creating) */}
                {isEditMode && !isCreatingCategory && (
                    <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/50">
                        <Button
                            variant="secondary"
                            onClick={() => setIsCreatingCategory(true)}
                            className="w-full text-xs py-2 border-dashed"
                            icon={<Plus className="w-3.5 h-3.5" />}
                        >
                            {t('add_category')}
                        </Button>
                    </div>
                )}

                <div className="flex flex-col">
                    {filteredCategories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
                            <Box className="w-8 h-8 opacity-20" />
                            <span className={Typo.Label}>{t('no_objects')}</span>
                        </div>
                    ) : (
                        filteredCategories.map((category) => {
                            // In Edit mode, expand everything slightly differently or keep user preference? 
                            // Let's keep user preference but auto-expand if adding item.
                            const isExpanded = search.trim() ? true : openCategories.includes(category.id);
                            const isUserCat = category.isUserCreated;

                            return (
                                <div key={category.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-none">
                                    {!search.trim() && (
                                        <div className={`flex items-center justify-between pl-6 pr-4 py-3.5 transition-colors group select-none ${isEditMode ? 'bg-zinc-50/50 dark:bg-zinc-900' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                                            <button
                                                onClick={() => toggleCategory(category.id)}
                                                className="flex-1 flex items-center gap-3 text-left min-w-0"
                                            >
                                                <span className="text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors shrink-0">
                                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                </span>
                                                <span className={`${Typo.Label} ${Theme.Colors.TextSecondary} group-hover:text-black dark:group-hover:text-white transition-colors normal-case tracking-normal text-[13px] truncate`}>
                                                    {category.label}
                                                </span>
                                            </button>

                                            <div className="flex items-center gap-1">
                                                {isEditMode && (
                                                    <>
                                                        <IconButton
                                                            icon={<Plus className="w-3.5 h-3.5" />}
                                                            onClick={() => {
                                                                if (!openCategories.includes(category.id)) toggleCategory(category.id);
                                                                setAddingItemToCatId(category.id);
                                                            }}
                                                            className="p-1 h-7 w-7 text-zinc-400 hover:text-black dark:hover:text-white"
                                                            tooltip={t('add_item')}
                                                        />
                                                        {isUserCat && (
                                                            <IconButton
                                                                icon={<Trash2 className="w-3.5 h-3.5" />}
                                                                onClick={() => onDeleteUserCategory(category.id)}
                                                                className="p-1 h-7 w-7 text-zinc-400 hover:text-red-500"
                                                                tooltip={t('delete')}
                                                            />
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {isExpanded && (
                                        <div className={`flex flex-col pb-2 ${!search.trim() ? 'animate-in slide-in-from-top-1 duration-200' : ''}`}>

                                            {/* New Item Input for this category */}
                                            {addingItemToCatId === category.id && (
                                                <div className="px-4 py-2 flex items-center gap-2 animate-in fade-in bg-zinc-50 dark:bg-zinc-800/30">
                                                    <div className="w-6 shrink-0" /> {/* Indent */}
                                                    <input
                                                        autoFocus
                                                        value={newItemName}
                                                        onChange={(e) => setNewItemName(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateItem(category.id)}
                                                        placeholder={t('item_name')}
                                                        className={`flex-1 ${Theme.Colors.Surface} border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs outline-none`}
                                                    />
                                                    <IconButton icon={<Check className="w-3 h-3" />} onClick={() => handleCreateItem(category.id)} disabled={!newItemName.trim()} className="h-6 w-6" />
                                                    <IconButton icon={<X className="w-3 h-3" />} onClick={() => setAddingItemToCatId(null)} className="h-6 w-6" />
                                                </div>
                                            )}

                                            {category.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    draggable={!isEditMode}
                                                    onDragStart={(e) => handleDragStart(e, item.label, item.id)}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={() => !isEditMode && onAddObject?.(item.label, item.id)}
                                                    className={`
                                                      group/item relative flex items-center gap-3 pl-6 pr-4 py-2.5
                                                      ${isEditMode ? 'hover:bg-transparent' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-grab active:cursor-grabbing'}
                                                      select-none transition-colors
                                                  `}
                                                >
                                                    <span className={`text-lg leading-none filter drop-shadow-sm select-none w-6 text-center shrink-0 ${!item.icon ? 'opacity-0' : ''}`}>
                                                        {item.icon || '📦'}
                                                    </span>

                                                    <span className={`${Typo.Body} text-zinc-600 dark:text-zinc-400 ${!isEditMode && 'group-hover/item:text-black dark:group-hover/item:text-white'} transition-colors flex-1 truncate`}>
                                                        {item.label}
                                                    </span>

                                                    {isEditMode && item.isUserCreated && (
                                                        <IconButton
                                                            icon={<Trash2 className="w-3 h-3" />}
                                                            onClick={(e) => { e.stopPropagation(); onDeleteUserItem(category.id, item.id); }}
                                                            className="h-6 w-6 text-zinc-300 hover:text-red-500"
                                                        />
                                                    )}
                                                </div>
                                            ))}

                                            {category.items.length === 0 && !addingItemToCatId && (
                                                <div className="px-4 py-3 text-center text-[10px] text-zinc-400 italic">
                                                    {isEditMode ? t('library_empty') : 'Empty'}
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
