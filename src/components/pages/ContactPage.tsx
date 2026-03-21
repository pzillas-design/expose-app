import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Theme, Typo, SectionHeader } from '@/components/ui/DesignSystem';
import { LocaleKey } from '@/data/locales';

interface ContactPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateNew: () => void;
    onSignIn?: () => void;
    currentLang: LocaleKey;
    t: TranslationFunction;
}

export const ContactPage: React.FC<ContactPageProps> = ({ user, userProfile, credits, onCreateNew, onSignIn, currentLang, t }) => {
    const navigate = useNavigate();
    const email = "hello@expose.ae";

    // Localized content for Variant 1
    const content = {
        de: {
            line1: "Wir freuen uns, von dir zu hören. Schreib uns an ",
            line2Prefix: "",
            line2Suffix: "",
        },
        en: {
            line1: "We’d love to hear from you. Write to us at ",
            line2Prefix: "",
            line2Suffix: "",
        }
    }[currentLang];

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col selection:bg-orange-500 selection:text-white">
            <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden min-h-[120vh]">
                    {/* Visual Background Elements */}
                    <div className="absolute top-1/4 -left-24 md:-left-20 w-64 md:w-80 h-64 md:h-80 bg-orange-500/13 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-1/4 -right-24 md:-right-20 w-64 md:w-80 h-64 md:h-80 bg-red-600/13 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10 py-12 md:py-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="flex flex-col items-center justify-center text-center px-6">
                        {/* Hero Text with Kumbh Sans Semibold */}
                        <h1 className="text-[2.65rem] sm:text-5xl md:text-6xl lg:text-7xl font-kumbh font-semibold tracking-tighter mb-14 md:mb-16 leading-[1.1] md:leading-[1.16] max-w-[13ch] md:max-w-4xl">
                            {content.line1} <br className="hidden md:block" />
                            {content.line2Prefix}
                            <a
                                href={`mailto:${email}`}
                                className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-80 transition-opacity"
                            >
                                    {email}
                                </a>{content.line2Suffix}
                            </h1>
                        </div>
                    </div>
            </main>

            <GlobalFooter
                t={t}
                onGalleryClick={() => {
                    if (!user) onSignIn?.();
                    else navigate('/');
                }}
            />
        </div>
    );
};
