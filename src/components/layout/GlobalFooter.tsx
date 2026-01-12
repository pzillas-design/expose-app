import React from 'react';
import { TranslationFunction } from '@/types';
import { Logo } from '@/components/ui/Logo';

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
                    <a
                        href="/about"
                        className="text-[13px] font-medium text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                    >
                        {t('footer_about')}
                    </a>
                    <a
                        href="https://pzillas.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[13px] font-medium text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                    >
                        {t('footer_website')}
                    </a>
                    <a
                        href="mailto:hello@expose.ae"
                        className="text-[13px] font-medium text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                    >
                        {t('footer_contact')}
                    </a>
                    <a
                        href="/legal"
                        className="text-[13px] font-medium text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                    >
                        {t('footer_legal')}
                    </a>
                    <a
                        href="/privacy"
                        className="text-[13px] font-medium text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                    >
                        {t('footer_privacy')}
                    </a>
                </nav>

                {/* Copyright - Subtle normal case */}
                <p className="text-[11px] font-medium text-zinc-300 dark:text-zinc-800 tracking-wide">
                    &copy; 2026 Exposé
                </p>
            </div>
        </footer>
    );
};
