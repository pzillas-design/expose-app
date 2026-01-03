
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Plus, Settings, LayoutGrid, Wallet, Shield } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Wordmark } from '../ui/Wordmark';
import { Theme, Typo, Button } from '../ui/DesignSystem';

interface AppNavbarProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: (key: any) => string;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
    user,
    userProfile,
    credits,
    onCreateBoard,
    t
}) => {
    const getInitials = (name?: string, email?: string) => {
        if (name) {
            const parts = name.split(' ');
            if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
            return parts[0][0].toUpperCase();
        }
        if (email) return email[0].toUpperCase();
        return '?';
    };

    return (
        <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70">
            <div className="max-w-[1700px] mx-auto w-full px-8 lg:px-12 2xl:px-16 h-20 flex items-center justify-between">
                {/* Brand */}
                <NavLink to="/projects" className="flex items-center gap-4 group transition-all duration-300">
                    <Logo className="w-10 h-10 group-hover:scale-110 transition-transform duration-500" />
                    <Wordmark className="h-6 text-zinc-900 dark:text-white" />
                </NavLink>

                {/* Navigation Links */}
                <nav className="hidden md:flex items-center gap-2 bg-zinc-100/50 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-white/5">
                    <NavLink
                        to="/projects"
                        className={({ isActive }) => `
                            flex items-center gap-2.5 px-6 py-2 rounded-xl text-[13px] font-medium transition-all duration-300
                            ${isActive
                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-800/50'}
                        `}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Projekte
                    </NavLink>
                    {userProfile?.role === 'admin' && (
                        <NavLink
                            to="/admin"
                            className={({ isActive }) => `
                                flex items-center gap-2.5 px-6 py-2 rounded-xl text-[13px] font-medium transition-all duration-300
                                ${isActive
                                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-800/50'}
                            `}
                        >
                            <Shield className="w-4 h-4" />
                            Admin
                        </NavLink>
                    )}
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => `
                            flex items-center gap-2.5 px-6 py-2 rounded-xl text-[13px] font-medium transition-all duration-300
                            ${isActive
                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-800/50'}
                        `}
                    >
                        <Settings className="w-4 h-4" />
                        Einstellungen
                    </NavLink>
                </nav>

                {/* Right Side Actions */}
                <div className="flex items-center gap-6">
                    {/* Credits Display */}
                    <div className="hidden sm:flex items-center gap-3 bg-zinc-100/30 dark:bg-zinc-900/30 px-4 py-2 rounded-xl border border-zinc-200/50 dark:border-white/5">
                        <Wallet className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-[13px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
                            {(credits || 0).toFixed(2)} €
                        </span>
                    </div>

                    {/* New Board Button */}
                    <Button
                        onClick={onCreateBoard}
                        variant="primary"
                        icon={<Plus className="w-4 h-4" />}
                        className="px-6 h-11 hidden lg:flex"
                    >
                        Neues Projekt
                    </Button>

                    {/* Compact New Board for small screens */}
                    <button
                        onClick={onCreateBoard}
                        className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                    </button>

                    {/* User Profile / Account Link */}
                    <NavLink
                        to="/settings/account"
                        className="group flex items-center gap-3 pl-3 pr-1 py-1 rounded-2xl border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-300"
                    >
                        <span className="hidden sm:block text-[13px] font-medium text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                            {user?.email?.split('@')[0]}
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[12px] font-bold text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors shadow-inner overflow-hidden border border-zinc-200 dark:border-zinc-800">
                            {getInitials(userProfile?.full_name, user?.email)}
                        </div>
                    </NavLink>
                </div>
            </div>
        </header>
    );
};
