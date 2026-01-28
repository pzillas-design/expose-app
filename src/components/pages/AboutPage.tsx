import React, { useEffect, useState } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Theme, Typo, SectionHeader } from '@/components/ui/DesignSystem';
import { ChevronDown } from 'lucide-react';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col selection:bg-white selection:text-black">
            <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'bg-zinc-950/80 backdrop-blur-md' : 'bg-transparent'}`}>
                <AppNavbar
                    user={user}
                    userProfile={userProfile}
                    credits={credits}
                    onCreateBoard={onCreateBoard}
                    t={t}
                />
            </div>

            <main className="flex-1 w-full">
                {/* Full-Height Hero Section */}
                <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
                    {/* Background Detail/Gradient */}
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(63,63,70,0.15)_0%,transparent_70%)]" />
                        <div className="absolute inset-0 bg-zinc-950" />
                    </div>

                    <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                        <span className="text-zinc-500 font-mono text-sm tracking-[0.3em] uppercase mb-8 block animate-in fade-in slide-in-from-bottom-4 duration-1000">Est. 2026</span>
                        <h1 className="text-6xl sm:text-8xl md:text-9xl font-bold tracking-tighter text-white mb-8 leading-[0.9] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                            Creation <br />
                            <span className="text-zinc-600">Reimagined.</span>
                        </h1>
                        <p className="max-w-xl mx-auto text-xl text-zinc-400 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-500">
                            Wir bauen Werkzeuge für die Architekten des Unmöglichen. Schlichtheit trifft auf brute Kraft.
                        </p>
                    </div>

                    {/* Scroll Indicator */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 animate-bounce opacity-40">
                        <span className="text-[10px] font-mono tracking-widest uppercase">Scroll</span>
                        <ChevronDown className="w-5 h-5" />
                    </div>
                </section>

                {/* Narrative Sections */}
                <section className="py-40 bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                            <div className="lg:col-span-5 sticky top-32">
                                <span className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-6 block">01 / Der Ursprung</span>
                                <h2 className="text-5xl font-bold tracking-tighter mb-8 leading-tight">
                                    Wo Vision auf <br />Materie trifft.
                                </h2>
                                <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-[1.6]">
                                    Expose entstand aus dem Wunsch, die Lücke zwischen Gedanke und Visualisierung zu schließen. In einer Welt, die sich immer schneller dreht, geben wir Ihnen den Raum, innezuhalten und zu erschaffen.
                                </p>
                            </div>
                            <div className="lg:col-span-7">
                                <div className="aspect-[4/5] bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl relative group">
                                    <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 m-8 rounded-xl group-hover:border-zinc-300 dark:group-hover:border-zinc-700 transition-colors">
                                        <span className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400">Cinematic Fragment I</span>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-40 bg-zinc-50 dark:bg-zinc-900/30">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-end">
                            <div className="lg:col-span-7 order-2 lg:order-1">
                                <div className="aspect-[16/9] bg-zinc-200 dark:bg-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative group">
                                    <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 m-8 rounded-xl group-hover:border-zinc-400 dark:group-hover:border-zinc-600 transition-colors">
                                        <span className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400">Cinematic Fragment II</span>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-5 order-1 lg:order-2 pb-12">
                                <span className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-6 block">02 / Die Philosophie</span>
                                <h2 className="text-5xl font-bold tracking-tighter mb-8 leading-tight">
                                    Weniger ist <br />Alles.
                                </h2>
                                <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-[1.6]">
                                    Wir kuratieren Pixel, damit Sie Welten erschaffen können. Unser Fokus liegt auf der Essenz der Kreation – ohne Rauschen, ohne Komplexität. Nur Sie und Ihre Idee.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Cinematic Quote Section */}
                <section className="py-60 bg-zinc-950 relative overflow-hidden text-center">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-30 blur-[100px] pointer-events-none">
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full animate-pulse" />
                        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full animate-pulse delay-1000" />
                    </div>
                    <div className="max-w-4xl mx-auto px-6 relative z-10">
                        <blockquote className="text-4xl sm:text-6xl font-medium tracking-tight text-white leading-[1.1] italic">
                            "Hinter jedem Bild steckt eine Geschichte, die darauf wartet, erzählt zu werden."
                        </blockquote>
                        <footer className="mt-12 text-zinc-500 font-mono tracking-widest uppercase text-sm">
                            — Michael Pzillas, Founder
                        </footer>
                    </div>
                </section>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
