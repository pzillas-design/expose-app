import React, { useState } from 'react';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Theme, Typo, SectionHeader, Button } from '@/components/ui/DesignSystem';
import { Mail, MapPin, Phone, Send, Loader2, Check } from 'lucide-react';

interface ContactPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateNew: () => void;
    onSignIn?: () => void;
    t: TranslationFunction;
}

export const ContactPage: React.FC<ContactPageProps> = ({ user, userProfile, credits, onCreateNew, onSignIn, t }) => {
    const email = "hello@expose.ae";
    const currentLang = typeof t('current_lang') === 'string' ? t('current_lang') : 'en';

    // Localized content for Variant 1
    const content = {
        de: {
            line1: "Wir freuen uns, von dir zu hören.",
            line2Prefix: "Schreib uns gerne unter ",
            line2Suffix: "",
            button: "Nachricht senden"
        },
        en: {
            line1: "We’d love to hear from you.",
            line2Prefix: "Drop us a line at ",
            line2Suffix: "",
            button: "Send a message"
        }
    }[currentLang === 'de' ? 'de' : 'en'];

    return (
        <div className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col selection:bg-orange-500 selection:text-white">

            <main className="flex-1 flex flex-col justify-center relative overflow-hidden">
                {/* Visual Background Elements */}
                <div className="absolute top-1/4 -left-20 w-80 h-80 bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10 py-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="flex flex-col items-center justify-center text-center px-6">
                        {/* Hero Text with Kumbh Sans Semibold */}
                        <h1 className="text-4xl md:text-7xl font-kumbh font-semibold tracking-tighter mb-24 leading-[1.2] max-w-5xl">
                            {content.line1} <br className="hidden md:block" />
                            {content.line2Prefix}
                            <a
                                href={`mailto:${email}`}
                                className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-80 transition-opacity"
                            >
                                {email}
                            </a>{content.line2Suffix}
                        </h1>

                        {/* Standard Button - Scaled like HomePage */}
                        <div className="flex flex-col items-center">
                            <Button
                                onClick={() => window.location.href = `mailto:${email}`}
                                variant="primary"
                                icon={<Mail className="w-4 h-4" />}
                                className="scale-125"
                            >
                                {content.button}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
