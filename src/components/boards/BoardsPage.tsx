import React from 'react';
import { Plus, MoreVertical, Trash2, Edit3, Clock, Image as ImageIcon, Settings, Wallet } from 'lucide-react';
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

    return (
        <div className={`min-h-screen w-full ${Theme.Colors.CanvasBg} ${Theme.Colors.TextPrimary} flex flex-col`}>
            <div className="max-w-7xl mx-auto w-full px-8">
                {/* Header */}
                <header className="w-full pt-16 pb-12 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/50 mb-4">
                    <div className="flex items-center gap-4">
                        <Logo className="w-12 h-12" />
                        <span
                            className="tracking-tight text-2xl"
                            style={{
                                fontFamily: "'Kumbh Sans', sans-serif",
                                fontWeight: 400,
                                lineHeight: '100%',
                                letterSpacing: '-0.02em',
                                textTransform: 'lowercase'
                            }}
                        >
                            exposé
                        </span>
                    </div>

                    <div className="flex items-center gap-8">
                        {/* Status & Settings */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 transition-colors">
                                <Wallet className="w-3.5 h-3.5 text-zinc-400" />
                                <span className={`${Typo.Mono} text-sm font-medium`}>{(credits || 0).toFixed(2)} €</span>
                            </div>
                            <IconButton
                                icon={<Settings className="w-4 h-4" />}
                                onClick={() => onOpenSettings('general')}
                                tooltip="Einstellungen"
                            />
                        </div>

                        {/* User Profile */}
                        <div
                            className="flex items-center gap-3 pl-8 border-l border-zinc-200 dark:border-zinc-800 cursor-pointer group hover:opacity-80 transition-all"
                            onClick={() => onOpenSettings('account')}
                        >
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden ring-offset-2 ring-transparent group-hover:ring-zinc-200 dark:group-hover:ring-zinc-700 transition-all">
                                <span className="text-sm font-bold text-zinc-500">
                                    {getInitials(userProfile?.full_name, user?.email)}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className={`${Typo.H3} leading-tight`}>{userProfile?.full_name || user?.email?.split('@')[0]}</span>
                                <span className={`${Typo.Micro} opacity-40 font-mono`}>{user?.email}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="py-12">
                    <div className="flex items-baseline justify-between mb-12">
                        <div>
                            <h1 className={`${Typo.Display} text-4xl tracking-tight`}>Meine Boards</h1>
                            <p className={`${Typo.Body} opacity-40 mt-2`}>
                                {boards.length} {boards.length === 1 ? 'Board' : 'Boards'} insgesamt
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {/* Create New Board Card */}
                        <button
                            onClick={onCreateBoard}
                            className={`
                                group relative flex flex-col items-center justify-center gap-4
                                bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800
                                rounded-2xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-300
                                hover:bg-zinc-50 dark:hover:bg-zinc-800/50 min-h-[340px] shadow-sm
                            `}
                        >
                            <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center transition-all duration-300 shadow-sm border-dashed">
                                <Plus className="w-8 h-8 text-zinc-400" />
                            </div>
                            <span className={`${Typo.Label} text-zinc-400 font-medium tracking-wide`}>Neues Board</span>
                        </button>

                        {isLoading ? (
                            // Skeleton Cards
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
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
            className="group relative flex flex-col hover:shadow-md transition-all duration-300 cursor-pointer border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm"
            onClick={onSelect}
        >
            {/* Thumbnail Area */}
            <div className="aspect-[4/3] bg-zinc-50 dark:bg-zinc-800/50 relative flex items-center justify-center overflow-hidden rounded-t-2xl border-b border-zinc-100 dark:border-zinc-800/50">
                {board.thumbnail ? (
                    <img src={board.thumbnail} alt={board.name} className="w-full h-full object-cover transition-opacity duration-300" />
                ) : (
                    <div className="flex flex-col items-center gap-4 opacity-10 group-hover:opacity-30 transition-all duration-300">
                        <ImageIcon className="w-16 h-16" strokeWidth={1} />
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Keine Inhalte</span>
                    </div>
                )}
            </div>

            {/* Info Area */}
            <div className="p-6 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                    {isRenaming ? (
                        <form onSubmit={handleRename} onClick={e => e.stopPropagation()} className="flex-1">
                            <input
                                autoFocus
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onBlur={handleRename}
                                className="w-full bg-zinc-100 dark:bg-zinc-800 border-none outline-none rounded-lg px-2 py-1 -ml-2 text-sm font-semibold"
                            />
                        </form>
                    ) : (
                        <span className={`${Typo.H3} truncate flex-1 text-base group-hover:text-black dark:group-hover:text-white transition-colors duration-300 font-semibold tracking-tight`}>
                            {board.name}
                        </span>
                    )}

                    <div className="relative" onClick={e => e.stopPropagation()}>
                        <IconButton
                            icon={<MoreVertical className="w-4 h-4" />}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="opacity-0 group-hover:opacity-100 transition-all duration-300 -mr-2"
                        />

                        {isMenuOpen && (
                            <div className="absolute right-0 top-10 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                                <button
                                    onClick={() => { setIsRenaming(true); setIsMenuOpen(false); }}
                                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm text-left transition-colors font-sans"
                                >
                                    <Edit3 className="w-4 h-4 text-zinc-400" /> Umbenennen
                                </button>
                                <button
                                    onClick={() => { onDelete(); setIsMenuOpen(false); }}
                                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-500 text-left transition-colors font-sans"
                                >
                                    <Trash2 className="w-4 h-4" /> Löschen
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5 opacity-30 group-hover:opacity-60 transition-opacity">
                        <Clock className="w-3 h-3" />
                        <span className={Typo.Micro}>
                            {formatDistanceToNow(board.updatedAt, { addSuffix: true, locale })}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-full border border-zinc-200/50 dark:border-zinc-800/50 opacity-40 group-hover:opacity-100 transition-all">
                        <ImageIcon className="w-3 h-3" />
                        <span className="text-[10px] font-bold font-mono">{board.itemCount || 0}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
