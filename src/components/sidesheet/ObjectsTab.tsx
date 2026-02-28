import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Box, Square, Circle, Minus, Eraser, Loader2, Check, Trash, MoreVertical, Smile, X, Plus, Type, Pen } from 'lucide-react';
import { Typo, Theme, Button } from '@/components/ui/DesignSystem';
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
    onAddText?: () => void;
    onBack?: () => void;
    scrollable?: boolean;
    variant?: 'vertical' | 'horizontal';
}

export const ObjectsTab: React.FC<ObjectsTabProps> = ({
    onAddObject, t, currentLang, library,
    onAddUserCategory, onDeleteUserCategory, onAddUserItem, onDeleteUserItem, onAddText, onBack,
    scrollable = true, variant = 'vertical'
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stickerName, setStickerName] = useState('');
    const [stickerEmoji, setStickerEmoji] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [menuState, setMenuState] = useState<{ catId: string, itemId: string, x: number, y: number } | null>(null);

    // Collect all items from all categories
    const allItems = useMemo(() => {
        return library.flatMap(cat => cat.items.map(item => ({ ...item, catId: cat.id })));
    }, [library]);

    // Reset form when modal opens
    useEffect(() => {
        if (isModalOpen) {
            setStickerName('');
            setStickerEmoji('');
        }
    }, [isModalOpen]);

    const handleCreate = async () => {
        if (!stickerName.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onAddUserItem('basics', stickerName.trim(), stickerEmoji.trim() || undefined);
            setIsModalOpen(false);
        } catch (err) { console.error(err); }
        finally { setIsSubmitting(false); }
    };

    const renderIcon = (iconNameOrChar: string | undefined) => {
        if (iconNameOrChar === 'Square') return <Square className="w-3.5 h-3.5" />;
        if (iconNameOrChar === 'Circle') return <Circle className="w-3.5 h-3.5" />;
        if (iconNameOrChar === 'Minus') return <Minus className="w-3.5 h-3.5" />;
        if (iconNameOrChar === 'Eraser') return <Eraser className="w-3.5 h-3.5" />;

        // Emoji check (simple)
        if (iconNameOrChar && iconNameOrChar.length <= 4 && !['Box', '📦'].includes(iconNameOrChar)) {
            return <span className="text-sm leading-none flex items-center justify-center grayscale-0">{iconNameOrChar}</span>;
        }

        // Dot default
        return <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />;
    };

    const handleOpenMenu = (e: React.MouseEvent, catId: string, itemId: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuState({ catId, itemId, x: rect.right, y: rect.top });
    };

    return (
        <div className={`flex flex-col relative w-full`}>
            {variant === 'vertical' ? (
                <SidebarAccordion
                    title={t('stamps_label') || (currentLang === 'de' ? 'Sticker' : 'Stickers')}
                    isExpanded={isExpanded}
                    onToggle={() => setIsExpanded(!isExpanded)}
                    onAdd={() => setIsModalOpen(true)}
                    isEmpty={allItems.length === 0}
                    emptyText={t('no_stamps') || (currentLang === 'de' ? 'Keine Sticker gefunden' : 'No stickers found')}
                    hasTopBorder={false}
                    addTooltip={currentLang === 'de' ? 'Sticker erstellen' : 'Create Sticker'}
                >

                    {allItems.map((item, idx) => (
                        <SidebarAccordionItem
                            key={`${item.id}-${idx}`}
                            label={item.label}
                            icon={renderIcon(item.icon)}
                            onClick={() => onAddObject?.(item.label, item.id, item.icon)}
                            onMenuClick={(e) => handleOpenMenu(e, item.catId, item.id)}
                            rightLabel={t('add_sticker')}
                        />
                    ))}
                </SidebarAccordion>
            ) : (
                <div className="flex items-center gap-2 w-full overflow-x-auto no-scrollbar pointer-events-auto py-4 before:content-[''] before:w-4 before:shrink-0 after:content-[''] after:w-4 after:shrink-0">
                    {/* Edit Stickers Button */}
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsModalOpen(true); }}
                        className="shrink-0 h-10 w-10 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] flex items-center justify-center transition-all group"
                        title={currentLang === 'de' ? 'Sticker bearbeiten' : 'Edit Stickers'}
                    >
                        <Pen className="w-4 h-4 text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300" />
                    </button>

                    {/* Free Text Chip */}
                    <button
                        onClick={() => onAddText?.()}
                        className="shrink-0 h-10 px-4 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] group"
                    >
                        <Type className="w-4 h-4 text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors" />
                        <span className="text-sm font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-200">{t('text') || 'Text'}</span>
                    </button>

                    {/* Render flat sticker list horizontally */}
                    {allItems.map((item, idx) => (
                        <button
                            key={`${item.id}-${idx}`}
                            onClick={() => onAddObject?.(item.label, item.id, item.icon)}
                            onContextMenu={(e) => { e.preventDefault(); handleOpenMenu(e, item.catId, item.id); }}
                            className="shrink-0 h-10 px-4 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] group"
                        >
                            {item.icon && <span className="text-xl leading-none group-hover:scale-110 transition-transform">{item.icon}</span>}
                            <span className="text-sm font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-200">{item.label}</span>
                        </button>
                    ))}

                    {allItems.length === 0 && (
                        <span className="text-sm text-zinc-500 px-4 whitespace-nowrap">
                            {currentLang === 'de' ? 'Erstelle deinen ersten Sticker' : 'Create your first sticker'}
                        </span>
                    )}
                </div>
            )}

            {/* Context Menu */}
            {menuState && createPortal(
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setMenuState(null)} onContextMenu={(e) => { e.preventDefault(); setMenuState(null); }} />
                    <div
                        className={`
 fixed z-[101] min-w-[160px] p-1
 bg-white dark:bg-zinc-950
 border border-zinc-200 dark:border-zinc-800
 rounded-lg ring-1 ring-black/5
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
                            <Trash className="w-3.5 h-3.5 text-red-500 group-hover:text-red-600" />
                            <span className={`${Typo.Body} text-red-500 group-hover:text-red-600 dark:text-red-400 font-medium`}>
                                {t('delete') || 'Delete'}
                            </span>
                        </button>
                    </div>
                </>,
                document.body
            )}
            {/* Modal for adding/editing stickers */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
                    <div className="relative w-full max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-900">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                {currentLang === 'de' ? 'Sticker verwalten' : 'Manage Stickers'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-full p-1.5">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col max-h-[60vh] overflow-y-auto no-scrollbar">

                            {/* Existing Items List */}
                            <div className="p-2 flex flex-col gap-1">
                                {allItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 group transition-colors">
                                        <div className="flex items-center gap-3 px-2">
                                            {item.icon ? (
                                                <span className="text-xl leading-none">{item.icon}</span>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 font-bold uppercase">{item.label.substring(0, 2)}</div>
                                            )}
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{item.label}</span>
                                        </div>
                                        <button
                                            onClick={() => onDeleteUserItem(item.catId, item.id)}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 dark:text-zinc-600 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {allItems.length === 0 && (
                                    <div className="px-4 py-8 text-center text-sm text-zinc-500">
                                        {currentLang === 'de' ? 'Noch keine Sticker vorhanden.' : 'No stickers yet.'}
                                    </div>
                                )}
                            </div>

                            {/* Add New Form */}
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-900 flex flex-col gap-3">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">
                                    {currentLang === 'de' ? 'Neuen Sticker hinzufügen' : 'Add New Sticker'}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        value={stickerEmoji}
                                        onChange={(e) => setStickerEmoji(e.target.value.slice(0, 2))}
                                        placeholder="😀"
                                        className="w-12 h-10 px-0 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-lg outline-none focus:border-zinc-400 transition-all text-zinc-900 dark:text-white"
                                    />
                                    <input
                                        value={stickerName}
                                        onChange={(e) => setStickerName(e.target.value)}
                                        placeholder={t('enter_sticker_name') || 'Name...'}
                                        className="flex-1 h-10 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:border-zinc-400 transition-all text-zinc-900 dark:text-white"
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                    />
                                    <button
                                        onClick={handleCreate}
                                        disabled={!stickerName.trim() || isSubmitting}
                                        className="h-10 px-4 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center font-medium shadow-sm"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
