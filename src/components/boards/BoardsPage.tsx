import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, MoreVertical, Trash2, Edit3, Clock, Image as ImageIcon, Menu, Wallet } from 'lucide-react';
import { Theme, Typo, Button, IconButton, Card } from '../ui/DesignSystem';
import { Board } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Logo } from '../ui/Logo';

const getInitials = (name?: string, email?: string) => {
    if (name) {
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    }
    if (email) return email[0].toUpperCase();
    return '?';
};

function GridThumbnail({ images, thumbnail, itemCount }: { images?: string[], thumbnail?: string, itemCount?: number }) {
    const displayImages = images || [];
    const total = itemCount || displayImages.length;

    if (displayImages.length === 0) {
        if (thumbnail) {
            return <img src={thumbnail} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out" />;
        }
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/50">
                <ImageIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-700" strokeWidth={1} />
            </div>
        );
    }

    // Fixed 2x2 Grid Layout
    const showPlus = total > 4;
    const itemsToShow = displayImages.slice(0, showPlus ? 3 : 4);

    return (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 h-full w-full gap-0 bg-zinc-50 dark:bg-zinc-900/50 transition-transform duration-700 ease-out">
            {/* Slot 1 */}
            <div className="relative bg-zinc-50 dark:bg-zinc-900/30">
                {itemsToShow[0] && <img src={itemsToShow[0]} className="w-full h-full object-cover" />}
            </div>
            {/* Slot 2 */}
            <div className="relative bg-zinc-50 dark:bg-zinc-900/30">
                {itemsToShow[1] && <img src={itemsToShow[1]} className="w-full h-full object-cover" />}
            </div>
            {/* Slot 3 */}
            <div className="relative bg-zinc-50 dark:bg-zinc-900/30">
                {itemsToShow[2] && <img src={itemsToShow[2]} className="w-full h-full object-cover" />}
            </div>
            {/* Slot 4 / Plus */}
            <div className="relative bg-zinc-50 dark:bg-zinc-900/30 flex items-center justify-center">
                {showPlus ? (
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-600">+{total - 3}</span>
                ) : (
                    itemsToShow[3] && <img src={itemsToShow[3]} className="w-full h-full object-cover" />
                )}
            </div>
        </div>
    );
}

interface BoardsPageProps {
    boards: Board[];
    onSelectBoard: (boardId: string) => void;
    onCreateBoard: () => void;
    onDeleteBoard: (boardId: string) => void;
    onRenameBoard: (boardId: string, name: string) => void;
    user: any;
    userProfile: any;
    onOpenSettings: (tab?: any) => void;
    t: (key: any) => string;
    lang: 'de' | 'en';
    isLoading: boolean;
    credits: number;
}

export function BoardsPage({
    boards,
    onSelectBoard,
    onCreateBoard,
    onDeleteBoard,
    onRenameBoard,
    user,
    userProfile,
    onOpenSettings,
    t,
    lang,
    isLoading,
    credits
}: BoardsPageProps) {
    const locale = lang === 'de' ? de : enUS;

    const getPageStyles = () => {
        return 'bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900';
    };

    return (
        <div className={`min-h-screen w-full flex flex-col transition-all duration-700 ${getPageStyles()}`}>

            <div className="max-w-[1700px] mx-auto w-full px-8 lg:px-12 2xl:px-16 flex-1 flex flex-col">

                {/* REFINED MODERN HEADER */}
                <header className="pt-16 pb-12 flex items-center justify-between">
                    <div className="flex items-center gap-5 group cursor-pointer">
                        <Logo className="w-14 h-14 group-hover:scale-105 transition-transform duration-500" />
                        <span className="text-4xl font-semibold tracking-tighter" style={{ fontFamily: "'Kumbh Sans', sans-serif" }}>exposé</span>
                    </div>

                    <div className="flex items-center gap-10">
                        {/* USER PROFILE (AVATAR + EMAIL) */}
                        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onOpenSettings('account')}>
                            {/* AVATAR RUND */}
                            <div className={`w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[11px] font-bold text-zinc-400 dark:text-zinc-500 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors`}>
                                {getInitials(userProfile?.full_name, user?.email)}
                            </div>

                            <span className="text-sm font-medium tracking-tight text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                                {user?.email || ''}
                            </span>
                        </div>

                        {/* CREDITS (CANVAS FONT) */}
                        <span className="text-sm font-mono font-medium tracking-tight opacity-40">
                            {(credits || 0).toFixed(2)} €
                        </span>


                        {/* MENU ICON ONLY (PLACED RIGHT) */}
                        <button
                            onClick={() => onOpenSettings('general')}
                            className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                            title="Settings"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <main className="pt-12 pb-32 flex-1 flex flex-col">

                    <div className="flex items-center justify-between mb-16">
                        <h1 className="text-[48px] font-semibold tracking-tight text-zinc-900 dark:text-white leading-none" style={{ fontFamily: "'Kumbh Sans', sans-serif" }}>Meine Boards</h1>
                        <button onClick={onCreateBoard} className={`flex items-center gap-3 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 ${Theme.Geometry.Radius} transition-all hover:opacity-90 active:scale-[0.98] group ${Theme.Effects.Shadow}`}>
                            <Plus className="w-4 h-4" />
                            <span className={Typo.ButtonLabel}>Neues Board</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-8 2xl:gap-10">

                        <button onClick={onCreateBoard} className={`group relative flex flex-col items-center justify-center gap-2 transition-all duration-500 outline-none ${Theme.Colors.Surface} border border-dashed ${Theme.Colors.Border} rounded-2xl aspect-[3/4] hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700`}>
                            <div className="flex items-center justify-center transition-all duration-500 group-hover:scale-110">
                                <Plus className="w-20 h-20 text-zinc-900 dark:text-white transition-colors" strokeWidth={0.5} />
                            </div>
                            <span className={`${Typo.ButtonLabel} text-zinc-900 dark:text-white transition-all`}>Neues Board</span>
                        </button>

                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className={`aspect-[3/4] bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-2xl`} />
                            ))
                        ) : (
                            boards.map((board) => (
                                <BoardCard
                                    key={board.id}
                                    board={board}
                                    onSelect={() => onSelectBoard(board.id)}
                                    onDelete={() => onDeleteBoard(board.id)}
                                    onRename={(name) => onRenameBoard(board.id, name)}
                                    locale={locale}
                                />
                            ))
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

interface BoardCardProps {
    key?: string;
    board: Board;
    onSelect: () => void;
    onDelete: () => void;
    onRename: (name: string) => void;
    locale: any;
}

function BoardCard({ board, onSelect, onDelete, onRename, locale }: BoardCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPos({ x: rect.left, y: rect.bottom + 8 });
        setMenuOpen(true);
    };

    return (
        <>
            <div
                className={`group flex flex-col aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer ${Theme.Effects.Shadow} transition-all duration-500 hover:-translate-y-1 ${Theme.Colors.Surface} border ${Theme.Colors.Border}`}
                onClick={onSelect}
            >
                {/* Image Grid Section */}
                <div className="flex-[2.5] relative bg-zinc-50 dark:bg-zinc-900 overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
                    <GridThumbnail images={board.previewImages} thumbnail={board.thumbnail} itemCount={board.itemCount} />
                </div>

                {/* Info Section */}
                <div className="px-5 py-[17px] flex flex-col justify-center min-h-0 bg-white dark:bg-zinc-900/50">
                    <div className="flex items-center justify-between gap-3 mb-0">
                        <h3 className={`${Typo.H2} truncate flex-1 font-semibold`}>
                            {board.name}
                        </h3>
                        <button
                            onClick={handleMenuClick}
                            className="p-1.5 -mr-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="text-zinc-400 dark:text-zinc-600 -mt-[1px]">
                        <span className={`${Typo.Body} opacity-70`}>
                            {formatDistanceToNow(board.updatedAt, { locale, addSuffix: true })}
                        </span>
                    </div>
                </div>
            </div>

            {menuOpen && createPortal(
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setMenuOpen(false)} onContextMenu={(e) => { e.preventDefault(); setMenuOpen(false); }} />
                    <div
                        className={`
                            fixed z-[101] min-w-[160px]
                            bg-white dark:bg-zinc-950
                            border border-zinc-200 dark:border-zinc-800
                            rounded-lg shadow-xl ring-1 ring-black/5
                            overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col
                        `}
                        style={{ top: menuPos.y, left: Math.min(menuPos.x, window.innerWidth - 180) }}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); onRename(board.name); setMenuOpen(false); }}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 text-left transition-colors group"
                        >
                            <Edit3 className="w-4 h-4 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            <span className={`${Typo.Body} text-zinc-600 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white font-medium`}>Umbennnen</span>
                        </button>
                        <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1 mx-2" />
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors group"
                        >
                            <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors" />
                            <span className={`${Typo.Body} text-red-500 group-hover:text-red-600 dark:text-red-400 font-medium`}>Löschen</span>
                        </button>
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
