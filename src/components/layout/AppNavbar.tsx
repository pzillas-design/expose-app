
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
        if (name && name.trim()) {
            const parts = name.trim().split(' ');
            const first = parts[0];
            const second = parts[1];
            if (first && second && second[0]) return (first[0] + second[0]).toUpperCase();
            if (first && first[0]) return first[0].toUpperCase();
        }
        if (email && email[0]) return email[0].toUpperCase();
        return '?';
    };

    return (
        <header className="sticky top-0 z-50 w-full">
            <div className="max-w-[1700px] mx-auto w-full px-8 lg:px-12 2xl:px-16 h-28 pt-4 flex items-center justify-between">
                {/* Brand */}
                <NavLink to="/" className="flex items-center gap-4 group transition-all duration-300">
                    <Logo className="w-11 h-11 group-hover:scale-110 transition-transform duration-500" />
                    <Wordmark className="h-6 text-zinc-900 dark:text-white" />
                </NavLink>

                {/* Navigation Links */}
                <nav className="hidden md:flex items-center gap-2 p-1.5 rounded-2xl backdrop-blur-xl bg-white/85 dark:bg-zinc-900/85 border border-zinc-200/30 dark:border-white/10">
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
                        {t('tab_projects')}
                    </NavLink>

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
                        {t('tab_settings')}
                    </NavLink>
                </nav>

                {/* Right Side Actions */}
                <div className="flex items-center gap-6">
                    {/* New Board Button */}
                    <Button
                        onClick={onCreateBoard}
                        variant="primary"
                        icon={<Plus className="w-4 h-4" />}
                        className="px-6 h-11 hidden lg:flex"
                    >
                        {t('default_project_name')}
                    </Button>

                    {/* Compact New Board for small screens */}
                    <button
                        onClick={onCreateBoard}
                        className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                    </button>

                </div>
            </div>
        </header>
    );
};
