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

function GridThumbnail({ images, thumbnail }: { images?: string[], thumbnail?: string }) {
    const displayImages = images?.slice(0, 4) || [];

    if (displayImages.length === 0) {
        if (thumbnail) {
            return <img src={thumbnail} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />;
        }
        return (
            <div className="absolute inset-0 flex items-center justify-center opacity-60">
                <ImageIcon className="w-12 h-12 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
            </div>
        );
    }

    if (displayImages.length === 1) {
        return <img src={displayImages[0]} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />;
    }

    if (displayImages.length === 2) {
        return (
            <div className="absolute inset-0 grid grid-cols-2 h-full w-full gap-[2px] bg-white/10 group-hover:scale-105 transition-transform duration-700 ease-out">
                {displayImages.map((src, i) => (
                    <img key={i} src={src} className="w-full h-full object-cover" />
                ))}
            </div>
        );
    }

    return (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 h-full w-full gap-[2px] bg-white/10 group-hover:scale-105 transition-transform duration-700 ease-out">
            {displayImages.slice(0, 4).map((src, i) => (
                <img key={i} src={src} className="w-full h-full object-cover" />
            ))}
            {displayImages.length === 3 && (
                <div className="bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 opacity-10" />
                </div>
            )}
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

            <div className="max-w-7xl mx-auto w-full px-8 flex-1 flex flex-col">

                {/* REFINED MODERN HEADER */}
                <header className="pt-16 pb-12 flex items-center justify-between">
                    <div className="flex items-center gap-5 group cursor-pointer">
                        <Logo className="w-14 h-14 group-hover:scale-105 transition-transform duration-500" />
                        <span className="text-4xl font-medium tracking-tighter" style={{ fontFamily: "'Kumbh Sans', sans-serif" }}>exposé</span>
                    </div>

                    <div className="flex items-center gap-10">
                        {/* USER PROFILE (AVATAR + EMAIL) */}
                        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onOpenSettings('account')}>
                            {/* AVATAR RUND */}
                            <div className={`w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[11px] font-bold text-zinc-400 dark:text-zinc-500 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors`}>
                                {getInitials(userProfile?.full_name, user?.email)}
                            </div>

                            {/* EMAIL / NAME */}
                            <span className="text-sm font-medium tracking-tight text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                                {userProfile?.full_name || user?.email || user?.email?.split('@')[0]}
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
                        <h1 className="text-[48px] font-bold tracking-tight text-zinc-900 dark:text-white leading-none" style={{ fontFamily: "'Kumbh Sans', sans-serif" }}>Meine Boards</h1>
                        <button onClick={onCreateBoard} className={`flex items-center gap-3 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 ${Theme.Geometry.Radius} transition-all hover:opacity-90 active:scale-[0.98] group ${Theme.Effects.Shadow}`}>
                            <Plus className="w-4 h-4" />
                            <span className={Typo.ButtonLabel}>Neues Board</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">

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
    const hasImages = (board.previewImages && board.previewImages.length > 0) || board.thumbnail;

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPos({ x: rect.left, y: rect.bottom + 8 });
        setMenuOpen(true);
    };

    return (
        <>
            <div className={`group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer ${Theme.Effects.Shadow} transition-all duration-500 hover:-translate-y-1 ${Theme.Colors.Surface} border ${Theme.Colors.Border}`} onClick={onSelect}>
                <GridThumbnail images={board.previewImages} thumbnail={board.thumbnail} />

                {hasImages ? (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col gap-1 translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-base font-medium tracking-tight text-white truncate drop-shadow-sm flex-1">{board.name}</h3>
                                <button
                                    onClick={handleMenuClick}
                                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-white/70 uppercase tracking-widest font-medium whitespace-nowrap">
                                    {formatDistanceToNow(board.updatedAt, { locale })} • {board.itemCount || 0} Fotos
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="absolute inset-0 p-6 flex flex-col justify-end bg-zinc-50/50 dark:bg-zinc-900/50">
                        <div className="flex items-center justify-between gap-3 mb-1">
                            <h3 className={`${Typo.H2} truncate group-hover:text-zinc-900 dark:group-hover:text-white transition-colors flex-1`}>{board.name}</h3>
                            <button
                                onClick={handleMenuClick}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-all"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-medium whitespace-nowrap">
                                {formatDistanceToNow(board.updatedAt, { locale })} • {board.itemCount || 0} Fotos
                            </span>
                        </div>
                    </div>
                )}
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
