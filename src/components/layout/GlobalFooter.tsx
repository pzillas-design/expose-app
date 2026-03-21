import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Wordmark } from '@/components/ui/Wordmark';

type TranslationFunction = (key: string) => string;

const footerLinks = (t: TranslationFunction) => [
    { label: t('footer_photos') || 'Gallery', to: '/' },
    { label: t('footer_about') || 'About', to: '/about' },
    { label: t('footer_contact') || 'Contact', to: '/contact' },
    { label: t('footer_legal') || 'Legal', to: '/impressum' }
];

function FooterLockup() {
    return (
        <Link
            to="/about"
            aria-label="Exposé"
            className="flex items-center gap-4 transition-opacity duration-300 hover:opacity-80"
        >
            <Logo className="h-11 w-11 sm:h-10 sm:w-10" />
            <Wordmark className="h-5 w-auto text-zinc-900 dark:text-white sm:h-6" />
        </Link>
    );
}

function FooterNav({ t, onGalleryClick }: { t: TranslationFunction, onGalleryClick?: () => void }) {
    return (
        <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 md:justify-end md:gap-x-10">
            {footerLinks(t).map((link, idx) => {
                const isGallery = idx === 0;
                const handleClick = (e: React.MouseEvent) => {
                    if (isGallery && onGalleryClick) {
                        e.preventDefault();
                        onGalleryClick();
                    }
                };

                return (
                    <Link
                        key={link.to}
                        to={link.to}
                        onClick={handleClick}
                        className="text-[14px] font-normal text-zinc-400 transition-colors duration-200 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
                    >
                        {link.label}
                    </Link>
                );
            })}
        </nav>
    );
}

export const GlobalFooter: React.FC<{ t: TranslationFunction, onGalleryClick?: () => void }> = ({ t, onGalleryClick }) => {
    return (
        <footer className="mt-auto w-full bg-white px-6 pb-12 pt-7 dark:bg-zinc-950 sm:px-8 sm:pb-16 sm:pt-8 lg:px-12 xl:px-16">
            <div className="flex w-full flex-col gap-6 sm:gap-7 md:flex-row md:items-center md:justify-between md:gap-8">
                <div className="flex justify-center md:justify-start">
                    <FooterLockup />
                </div>
                <div className="flex justify-center md:justify-end">
                    <FooterNav t={t} onGalleryClick={onGalleryClick} />
                </div>
            </div>
        </footer>
    );
};
