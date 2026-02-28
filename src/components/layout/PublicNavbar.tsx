import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Wordmark } from '@/components/ui/Wordmark';
import { Button } from '@/components/ui/DesignSystem';
import { TranslationFunction } from '@/types';

interface PublicNavbarProps {
    user: any;
    onSignIn: () => void;
    t: TranslationFunction;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ user, onSignIn, t }) => {
    const location = useLocation();

    return (
        <header className="absolute top-0 left-0 right-0 h-32 z-50 flex items-center justify-between px-10 md:px-12 bg-transparent">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                <Logo className="w-10 h-10" />
                <Wordmark className="h-5 text-zinc-900 dark:text-white" />
            </Link>

            {/* Navigation Links */}
            <nav className="flex items-center gap-8">
                <Link
                    to="/"
                    className={`text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                >
                    {t('footer_about') || 'About'}
                </Link>
                <Link
                    to="/contact"
                    className={`text-sm font-medium transition-colors ${location.pathname === '/contact' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                >
                    {t('footer_contact') || 'Contact'}
                </Link>

                {/* Auth Button */}
                {!user ? (
                    <Button
                        onClick={onSignIn}
                        variant="black"
                        size="m"
                        className="font-bold !text-[13px] px-6"
                    >
                        {t('login_btn') || 'Anmelden'}
                    </Button>
                ) : (
                    <Link to="/">
                        <Button
                            variant="primary-mono"
                            size="m"
                            className="font-bold !text-[13px] px-6"
                        >
                            Zur App
                        </Button>
                    </Link>
                )}
            </nav>
        </header>
    );
};
