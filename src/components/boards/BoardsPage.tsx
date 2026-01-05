import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Plus, MoreVertical, Trash2, Edit3, Clock, Image as ImageIcon, Settings, Wallet } from 'lucide-react';
import { Theme, Typo, Button, IconButton, Card } from '../ui/DesignSystem';
import { useItemDialog } from '../ui/Dialog';
import { Board } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Logo } from '../ui/Logo';
import { Wordmark } from '../ui/Wordmark';
import { AppNavbar } from '../layout/AppNavbar';

const getInitials = (name?: string, email?: string) => {
    if (name) {
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    }
    if (email) return email[0].toUpperCase();
    return '?';
};

function GridThumbnail({ images, thumbnail, itemCount, onLoaded }: { images?: string[], thumbnail?: string, itemCount?: number, onLoaded: () => void }) {
    const displayImages = images || [];
    const total = itemCount || displayImages.length;
    const [loadedCount, setLoadedCount] = React.useState(0);
    const totalToLoad = displayImages.length > 0 ? (total > 4 ? 3 : displayImages.length) : (thumbnail ? 1 : 0);

    React.useEffect(() => {
        if (totalToLoad === 0) onLoaded();
    }, [totalToLoad]);

    const handleLoad = () => {
        setLoadedCount(prev => {
            const next = prev + 1;
            if (next >= totalToLoad) onLoaded();
            return next;
        });
    };

    if (displayImages.length === 0) {
        if (thumbnail) {
            return <img src={thumbnail} onLoad={handleLoad} className="absolute inset-0 w-full h-full object-cover" />;
        }
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/50">
                <ImageIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-700" strokeWidth={1} />
            </div>
        );
    }

    const showPlus = total > 4;
    const itemsToShow = displayImages.slice(0, showPlus ? 3 : 4);

    return (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 h-full w-full gap-0 bg-zinc-50 dark:bg-zinc-900/50">
            {itemsToShow.map((src, i) => (
                <div key={i} className="relative bg-zinc-50 dark:bg-zinc-900/30">
                    <img src={src} onLoad={handleLoad} onError={handleLoad} className="w-full h-full object-cover" />
                </div>
            ))}
            {showPlus && (
                <div className="relative bg-zinc-50 dark:bg-zinc-900/30 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">+{total - 3}</span>
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

            <AppNavbar
                user={user}
                userProfile={userProfile}
                credits={credits}
                onCreateBoard={onCreateBoard}
                t={t}
            />

            <div className="max-w-[1700px] mx-auto w-full px-8 lg:px-12 2xl:px-16 flex-1 flex flex-col pt-12">

                <main className="pb-32 flex-1 flex flex-col">

                    <div className="mb-12">
                        <h1 className="text-xl font-medium tracking-tight">Meine Projekte</h1>
                        <p className="text-sm text-zinc-500 mt-1">Überblick über all deine Projekte.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-8 2xl:gap-10">

                        <button onClick={onCreateBoard} className={`group relative flex flex-col items-center justify-center gap-2 transition-all duration-500 outline-none ${Theme.Colors.Surface} border border-dashed ${Theme.Colors.Border} rounded-2xl aspect-[3/4] hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700`}>
                            <div className="flex items-center justify-center transition-all duration-500 group-hover:scale-110">
                                <Plus className="w-20 h-20 text-zinc-900 dark:text-white transition-colors" strokeWidth={0.5} />
                            </div>
                            <span className={`${Typo.ButtonLabel} text-zinc-900 dark:text-white transition-all`}>Neues Projekt</span>
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
                                    t={t}
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
    t: (key: any) => string;
}

function BoardCard({ board, onSelect, onDelete, onRename, locale, t }: BoardCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const [isLoaded, setIsLoaded] = useState(false);
    const { prompt, confirm } = useItemDialog();

    const handleMenuClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPos({ x: rect.left, y: rect.bottom + 8 });
        setMenuOpen(true);
    };

    return (
        <>
            <Link
                to={`/projects/${board.id}`}
                className={`group flex flex-col aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer ${Theme.Effects.Shadow} transition-all duration-500 hover:-translate-y-1 ${Theme.Colors.Surface} border ${Theme.Colors.Border}`}
            >
                {/* Image Grid Section */}
                <div className="flex-[2.5] relative bg-zinc-100 dark:bg-zinc-900 overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
                    {!isLoaded && (
                        <div className="absolute inset-0 z-10 bg-zinc-100 dark:bg-zinc-800 animate-pulse overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[shimmer_2s_infinite] -translate-x-full" />
                        </div>
                    )}
                    <div className={`absolute inset-0 transition-opacity duration-700 ease-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
                        <GridThumbnail
                            images={board.previewImages}
                            thumbnail={board.thumbnail}
                            itemCount={board.itemCount}
                            onLoaded={() => setIsLoaded(true)}
                        />
                    </div>
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
            </Link>

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
                            onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMenuOpen(false); // Close menu first
                                const newName = await prompt({
                                    title: t('rename_board' as any) || 'Projekt umbenennen',
                                    value: board.name,
                                    confirmLabel: 'Speichern',
                                    placeholder: 'Projektname'
                                });
                                if (newName && newName !== board.name) {
                                    onRename(newName);
                                }
                            }}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 text-left transition-colors group"
                        >
                            <Edit3 className="w-4 h-4 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            <span className={`${Typo.Body} text-zinc-600 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white font-medium`}>Umbenennen</span>
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
