import React from 'react';
import { Plus, Layout, MoreVertical, Trash2, Edit3, Clock, Image as ImageIcon } from 'lucide-react';
import { Theme, Typo, Button, IconButton, Card } from '../ui/DesignSystem';
import { Board } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Logo } from '../ui/Logo';

interface BoardsPageProps {
    boards: Board[];
    onSelectBoard: (boardId: string) => void;
    onCreateBoard: () => void;
    onDeleteBoard: (boardId: string) => void;
    onRenameBoard: (boardId: string, name: string) => void;
    user: any;
    onOpenSettings: () => void;
    t: (key: any) => string;
    lang: 'de' | 'en';
    isLoading: boolean;
}

export function BoardsPage({
    boards,
    onSelectBoard,
    onCreateBoard,
    onDeleteBoard,
    onRenameBoard,
    user,
    onOpenSettings,
    t,
    lang,
    isLoading
}: BoardsPageProps) {
    const locale = lang === 'de' ? de : enUS;

    return (
        <div className={`min-h-screen w-full ${Theme.Colors.CanvasBg} ${Theme.Colors.TextPrimary} flex flex-col`}>
            {/* Header */}
            <header className="h-16 px-8 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Logo className="w-10 h-10" />
                    <span className={`${Typo.H1} tracking-tight`}>Exposé</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end mr-2">
                        <span className={Typo.H3}>{user?.email?.split('@')[0]}</span>
                        <span className={Typo.Micro}>{user?.email}</span>
                    </div>
                    <button
                        onClick={onOpenSettings}
                        className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:ring-2 ring-zinc-500/20 transition-all"
                    >
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                            alt="avatar"
                            className="w-full h-full object-cover"
                        />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full px-8 py-12">
                <div className="flex items-baseline justify-between mb-10">
                    <div>
                        <h1 className={Typo.Display}>Boards</h1>
                        <p className={`${Typo.Body} opacity-60 mt-2`}>
                            {boards.length} {boards.length === 1 ? 'Board' : 'Boards'} insgesamt
                        </p>
                    </div>

                    <Button
                        onClick={onCreateBoard}
                        icon={<Plus className="w-4 h-4" />}
                        className="px-6"
                    >
                        Neues Board
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {/* Create New Board Card */}
                    <button
                        onClick={onCreateBoard}
                        className={`
                            group relative aspect-[4/3] flex flex-col items-center justify-center gap-4
                            bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800
                            rounded-xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-300
                            hover:bg-zinc-50 dark:hover:bg-zinc-800/50
                        `}
                    >
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6 text-zinc-400" />
                        </div>
                        <span className={`${Typo.Label} text-zinc-500`}>Neues Board erstellen</span>
                    </button>

                    {isLoading ? (
                        // Skeleton Cards
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
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
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [name, setName] = React.useState(board.name);

    const handleRename = (e: React.FormEvent) => {
        e.preventDefault();
        onRename(name);
        setIsRenaming(false);
    };

    return (
        <Card
            className="group relative flex flex-col overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border-zinc-200/60 dark:border-zinc-800/60"
            onClick={onSelect}
        >
            {/* Thumbnail Area */}
            <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 relative flex items-center justify-center overflow-hidden">
                {board.thumbnail ? (
                    <img src={board.thumbnail} alt={board.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="flex flex-col items-center gap-2 opacity-20 group-hover:opacity-30 transition-opacity">
                        <ImageIcon className="w-12 h-12" strokeWidth={1} />
                    </div>
                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />

                {/* Meta Badge */}
                <div className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur shadow-sm rounded-md border border-zinc-200/50 dark:border-zinc-800/50">
                    <span className={Typo.Micro}>{board.itemCount || 0} Bilder</span>
                </div>
            </div>

            {/* Info Area */}
            <div className="p-4 flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                    {isRenaming ? (
                        <form onSubmit={handleRename} onClick={e => e.stopPropagation()} className="flex-1">
                            <input
                                autoFocus
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onBlur={handleRename}
                                className="w-full bg-zinc-100 dark:bg-zinc-800 border-none outline-none rounded px-1 -ml-1 text-sm font-medium"
                            />
                        </form>
                    ) : (
                        <span className={`${Typo.H3} truncate flex-1 group-hover:text-black dark:group-hover:text-white transition-colors`}>
                            {board.name}
                        </span>
                    )}

                    <div className="relative" onClick={e => e.stopPropagation()}>
                        <IconButton
                            icon={<MoreVertical className="w-4 h-4" />}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="opacity-0 group-hover:opacity-100"
                        />

                        {isMenuOpen && (
                            <div className="absolute right-0 top-10 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl z-20 py-1 animate-in fade-in zoom-in-95 duration-100">
                                <button
                                    onClick={() => { setIsRenaming(true); setIsMenuOpen(false); }}
                                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm text-left"
                                >
                                    <Edit3 className="w-4 h-4" /> Umbenennen
                                </button>
                                <button
                                    onClick={() => { onDelete(); setIsMenuOpen(false); }}
                                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm text-red-500 text-left"
                                >
                                    <Trash2 className="w-4 h-4" /> Löschen
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 opacity-40">
                    <Clock className="w-3 h-3" />
                    <span className={Typo.Micro}>
                        {formatDistanceToNow(board.updatedAt, { addSuffix: true, locale })}
                    </span>
                </div>
            </div>
        </Card>
    );
}
