import React from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Theme, Typo, SectionHeader } from '@/components/ui/DesignSystem';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col">
            <AppNavbar
                user={user}
                userProfile={userProfile}
                credits={credits}
                onCreateBoard={onCreateBoard}
                t={t}
            />

            <main className="flex-1 w-full">
                {/* Hero Section */}
                <div className="relative py-24 sm:py-32 overflow-hidden bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 text-center">
                        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-900 dark:text-white mb-6">
                            Wir gestalten die <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Zukunft</span>
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                            Expose ist mehr als nur ein Tool. Es ist Ihr Partner für kreative Exzellenz und digitale Innovation.
                        </p>
                    </div>
                </div>

                {/* Content Section */}
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <SectionHeader>Unsere Mission</SectionHeader>
                            <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                Kreativität ohne Grenzen
                            </h2>
                            <p className="mt-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                Wir glauben daran, dass Technologie die menschliche Kreativität erweitern sollte, nicht ersetzen.
                                Mit unseren Tools geben wir Ihnen die Macht, Ihre Visionen schneller und präziser als je zuvor zum Leben zu erwecken.
                            </p>
                            <p className="mt-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                Egal ob Sie Architekt, Designer oder Visionär sind – wir bieten Ihnen die Plattform, um Großes zu schaffen.
                            </p>
                        </div>
                        {/* Image Placeholder */}
                        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl group">
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-400 dark:text-zinc-600 font-medium tracking-widest uppercase text-sm border-2 border-dashed border-zinc-300 dark:border-zinc-600 m-4 rounded-2xl group-hover:border-zinc-400 dark:group-hover:border-zinc-500 transition-colors">
                                Bild: Team oder Office
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mt-32">
                        {/* Image Placeholder (Left on desktop) */}
                        <div className="order-2 lg:order-1 relative aspect-[4/3] rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl group">
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-400 dark:text-zinc-600 font-medium tracking-widest uppercase text-sm border-2 border-dashed border-zinc-300 dark:border-zinc-600 m-4 rounded-2xl group-hover:border-zinc-400 dark:group-hover:border-zinc-500 transition-colors">
                                Bild: Innovation / Tech
                            </div>
                        </div>
                        <div className="order-1 lg:order-2">
                            <SectionHeader>Unsere Werte</SectionHeader>
                            <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                Qualität & Innovation
                            </h2>
                            <ul className="mt-8 space-y-6">
                                {[
                                    { title: 'Exzellenz', desc: 'Wir geben uns nie mit dem Durchschnitt zufrieden.' },
                                    { title: 'Transparenz', desc: 'Offene Kommunikation ist der Schlüssel zu Vertrauen.' },
                                    { title: 'Nachhaltigkeit', desc: 'Wir denken langfristig und handeln verantwortungsbewusst.' }
                                ].map((item, i) => (
                                    <li key={i} className="flex gap-4">
                                        <div className="flex-none w-1 h-full mt-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-6 w-1 bg-blue-600 rounded-full" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-zinc-900 dark:text-white">{item.title}</h3>
                                            <p className="text-zinc-500 dark:text-zinc-400">{item.desc}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
