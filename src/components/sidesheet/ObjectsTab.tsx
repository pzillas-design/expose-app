import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Box, Square, Circle, Minus, Eraser, Loader2, Check, Trash, MoreVertical, Smile, X } from 'lucide-react';
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
    onBack?: () => void;
    scrollable?: boolean;
}

export const ObjectsTab: React.FC<ObjectsTabProps> = ({
    onAddObject, t, currentLang, library,
    onAddUserCategory, onDeleteUserCategory, onAddUserItem, onDeleteUserItem, onBack,
    scrollable = true
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
                            <Trash className="w-3.5 h-3.5 text-red-500 group-hover:text-red-600" />
                            <span className={`${Typo.Body} text-red-500 group-hover:text-red-600 dark:text-red-400 font-medium`}>
                                {t('delete') || 'Delete'}
                            </span>
                        </button>
                    </div>
                </>,
                document.body
            )}
            {isModalOpen && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className={`relative w-[480px] ${Theme.Colors.ModalBg} ${Theme.Colors.Border} border rounded-xl shadow-2xl overflow-hidden flex flex-col items-center justify-center p-12 gap-8 animate-in zoom-in-95 duration-200`}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex flex-col items-center gap-2 text-center">
                            <h2 className={`text-2xl font-medium tracking-tight text-white`}>
                                {currentLang === 'de' ? 'Sticker erstellen' : 'Create Sticker'}
                            </h2>
                            <p className={`text-base text-zinc-400`}>
                                {currentLang === 'de' ? 'Geben Sie dem Sticker einen Namen und ein Emoji.' : 'Give the sticker a name and an emoji.'}
                            </p>
                        </div>

                        {/* Inputs */}
                        <div className="w-full flex flex-col gap-4">
                            <div className="space-y-2">
                                <label className={`${Typo.Label} text-zinc-500 uppercase tracking-wider`}>
                                    {t('enter_sticker_name') || 'Name'}
                                </label>
                                <input
                                    autoFocus
                                    value={stickerName}
                                    onChange={(e) => setStickerName(e.target.value)}
                                    placeholder={t('enter_sticker_name') || (currentLang === 'de' ? 'Name eingeben...' : 'Enter name...')}
                                    className={`w-full h-12 px-4 bg-zinc-900 border ${Theme.Colors.Border} rounded-lg text-base outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/20 transition-all placeholder:text-zinc-600 text-white`}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={`${Typo.Label} text-zinc-500 uppercase tracking-wider`}>Icon (Emoji)</label>
                                <div className="flex gap-4">
                                    <div className={`relative w-16 h-12 flex items-center justify-center border ${Theme.Colors.Border} rounded-lg bg-zinc-900 overflow-hidden shrink-0`}>
                                        <input
                                            value={stickerEmoji}
                                            onChange={(e) => setStickerEmoji(e.target.value.slice(0, 2))}
                                            placeholder="☺"
                                            className="w-full h-full text-center bg-transparent border-none outline-none text-2xl p-0 focus:ring-0 cursor-text text-white placeholder:text-zinc-700"
                                        />
                                    </div>
                                    <div className="flex-1 text-sm text-zinc-500 leading-relaxed py-1">
                                        {currentLang === 'de'
                                            ? 'Optional: Ein Emoji für den Sticker.'
                                            : 'Optional: An emoji for the sticker.'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col gap-3 w-full pt-2">
                            <Button variant="primary" onClick={handleCreate} disabled={!stickerName.trim() || isSubmitting} className="w-full h-12 text-base font-medium tracking-wide">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (currentLang === 'de' ? 'ERSTELLEN' : 'CREATE')}
                            </Button>
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="w-full h-12 text-base font-medium tracking-wide bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700">
                                {currentLang === 'de' ? 'ABBRECHEN' : 'CANCEL'}
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
