import React, { useState } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Theme, Typo, SectionHeader, Button } from '@/components/ui/DesignSystem';
import { Mail, MapPin, Phone, Send, Loader2, Check } from 'lucide-react';

interface ContactPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    onSignIn?: () => void;
    t: TranslationFunction;
}

export const ContactPage: React.FC<ContactPageProps> = ({ user, userProfile, credits, onCreateBoard, onSignIn, t }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate sending
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        setIsSent(true);
    };

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col">
            <AppNavbar
                user={user}
                userProfile={userProfile}
                credits={credits}
                onCreateBoard={onCreateBoard}
                onSignIn={onSignIn}
                t={t}
            />

            <main className="flex-1 w-full">
                <div className="relative pt-12 sm:pt-44 pb-24 sm:pb-32">
                    <div className="max-w-7xl mx-auto px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-24">

                            {/* Left Column: Info */}
                            <div>
                                <SectionHeader>Kontakt</SectionHeader>
                                <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
                                    Lassen Sie uns reden
                                </h1>
                                <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
                                    Haben Sie Fragen zu unseren Produkten, Preisen oder möchten Sie einfach Hallo sagen? Wir freuen uns, von Ihnen zu hören.
                                </p>

                                <div className="mt-12 space-y-8">
                                    <div className="flex gap-4 items-start group">
                                        <div className="flex-none p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                            <Mail className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-zinc-900 dark:text-white">Email</h3>
                                            <p className="mt-1 text-zinc-500 dark:text-zinc-400">support@expose.ae</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start group">
                                        <div className="flex-none p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-zinc-900 dark:text-white">Office</h3>
                                            <p className="mt-1 text-zinc-500 dark:text-zinc-400">Musterstraße 123<br />10115 Berlin, Deutschland</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Image Placeholder */}
                                <div className="mt-16 relative aspect-[16/9] rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg group">
                                    <div className="absolute inset-0 flex items-center justify-center text-zinc-400 dark:text-zinc-600 font-medium tracking-widest uppercase text-sm border-2 border-dashed border-zinc-300 dark:border-zinc-600 m-4 rounded-xl group-hover:border-zinc-400 dark:group-hover:border-zinc-500 transition-colors">
                                        Bild: Karte oder Office Außenansicht
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Form */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
                                {isSent ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-12 animate-in fade-in zoom-in-95 duration-500">
                                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6">
                                            <Check className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Nachricht gesendet!</h3>
                                        <p className="text-zinc-500 dark:text-zinc-400 mb-8">Wir melden uns so schnell wie möglich bei Ihnen.</p>
                                        <Button variant="secondary" onClick={() => setIsSent(false)}>Neue Nachricht</Button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                            <div>
                                                <label htmlFor="first-name" className="block text-sm font-semibold leading-6 text-zinc-900 dark:text-white mb-2">Vorname</label>
                                                <input type="text" id="first-name" className="w-full rounded-xl border-0 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2.5 text-zinc-900 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" required />
                                            </div>
                                            <div>
                                                <label htmlFor="last-name" className="block text-sm font-semibold leading-6 text-zinc-900 dark:text-white mb-2">Nachname</label>
                                                <input type="text" id="last-name" className="w-full rounded-xl border-0 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2.5 text-zinc-900 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" required />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-semibold leading-6 text-zinc-900 dark:text-white mb-2">Email</label>
                                            <input type="email" id="email" className="w-full rounded-xl border-0 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2.5 text-zinc-900 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" required />
                                        </div>
                                        <div>
                                            <label htmlFor="message" className="block text-sm font-semibold leading-6 text-zinc-900 dark:text-white mb-2">Nachricht</label>
                                            <textarea id="message" rows={4} className="w-full rounded-xl border-0 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2.5 text-zinc-900 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 resize-none" required />
                                        </div>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            className="w-full h-12 text-base"
                                            disabled={isSubmitting}
                                            icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        >
                                            {isSubmitting ? 'Wird gesendet...' : 'Nachricht senden'}
                                        </Button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
