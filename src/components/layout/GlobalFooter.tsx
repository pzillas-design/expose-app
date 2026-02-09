import React from 'react';
import { TranslationFunction } from '@/types';
import { Logo } from '@/components/ui/Logo';
import { Link } from 'react-router-dom';

interface GlobalFooterProps {
    t: TranslationFunction;
}

export const GlobalFooter: React.FC<GlobalFooterProps> = ({ t }) => {
    return (
        <footer className="w-full bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900/50 py-16 mt-auto">
            <div className="max-w-[1700px] mx-auto px-8 lg:px-12 2xl:px-16 flex flex-col items-center gap-8">

                {/* Brand Section - Larger Colored Logo */}
                <div className="flex flex-col items-center justify-center">
                    <Logo className="w-9 h-9" />
                </div>

                {/* Navigation - Single line, minimal text, normal case */}
                <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                    <Link
                        to="/"
                        state={{ skipRedirect: true }}
                        className="text-[13px] font-medium text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                    >
                        {t('footer_about') || 'Home'}
                    </Link>
                    <Link
                        to="/projects"
                        className="text-[13px] font-medium text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                    >
                        {t('tab_projects') || 'Projekte'}
                    </Link>
                    <a
                        href="/contact"
                        className="text-[13px] font-medium text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                    >
                        {t('footer_contact') || 'Contact'}
                    </a>
                    <a
                        href="/impressum"
                        className="text-[13px] font-medium text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                    >
                        {t('footer_legal') || 'Impressum'}
                    </a>
                    <a
                        href="/datenschutz"
                        className="text-[13px] font-medium text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                    >
                        {t('footer_privacy') || 'Datenschutz'}
                    </a>
                </nav>
            </div>
        </footer>
    );
};
