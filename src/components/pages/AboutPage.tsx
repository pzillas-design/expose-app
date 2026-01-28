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

                {/* USP 1: Iterativ + Parallel */}
                <section className="relative min-h-screen py-32 flex flex-col items-center justify-center bg-zinc-950 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="z-10 order-2 lg:order-1">
                            <h2 className="text-5xl sm:text-7xl font-bold tracking-tighter text-white mb-8 leading-[0.9]">
                                <span className="text-orange-500">Iterativ</span> + parallel <br />
                                arbeiten.
                            </h2>
                            <p className="text-zinc-400 text-xl leading-relaxed max-w-md">
                                Unser einzigartiger Canvas erlaubt es Ihnen, ganze Variantenreihen gleichzeitig zu generieren und im direkten Vergleich zu verfeinern.
                            </p>
                        </div>
                        <div className="relative order-1 lg:order-2">
                            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(249,115,22,0.1)] border border-zinc-800/50 bg-zinc-900 group">
                                <img
                                    src="/about/usp-canvas.png"
                                    alt="Parallel Workflow"
                                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* USP 2: Vorlagen */}
                <section className="relative min-h-screen py-32 flex flex-col items-center justify-center bg-zinc-950/50 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="relative">
                            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.05)] border border-zinc-800/50 bg-zinc-900 group">
                                <img
                                    src="/about/usp-presets.png"
                                    alt="Templates and Variables"
                                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000"
                                />
                            </div>
                        </div>
                        <div className="z-10 text-right flex flex-col items-end">
                            <h2 className="text-5xl sm:text-7xl font-bold tracking-tighter text-white mb-8 leading-[0.9]">
                                Vorlagen <br />
                                <span className="text-zinc-600">nutzen und erstellen.</span>
                            </h2>
                            <p className="text-zinc-400 text-xl leading-relaxed max-w-md">
                                Strukturieren Sie Ihre kreativen Prozesse mit Variablen und Presets. Wiederholbarkeit auf Knopfdruck, ohne Speed einzubüßen.
                            </p>
                        </div>
                    </div>
                </section>

                {/* USP 3: Visual Prompting (Fullscreen Center Focus) */}
                <section className="relative min-h-screen py-32 flex flex-col items-center justify-center bg-zinc-950 overflow-hidden">
                    <div className="max-w-5xl mx-auto px-6 w-full text-center mb-16">
                        <h2 className="text-6xl sm:text-8xl font-bold tracking-tighter text-white mb-8 leading-[0.9]">
                            Visual <span className="text-orange-500">prompting.</span>
                        </h2>
                        <p className="text-zinc-400 text-xl leading-relaxed mx-auto max-w-2xl">
                            Kommunizieren Sie direkt mit der KI durch visuelle Marker. Sie sagen nicht nur was, sondern WO etwas passieren soll.
                        </p>
                    </div>
                    <div className="w-full max-w-4xl px-6">
                        <div className="aspect-video rounded-3xl overflow-hidden shadow-[0_0_150px_rgba(255,255,255,0.05)] border border-zinc-800 bg-zinc-900 group">
                            <img
                                src="/about/usp-prompting.png"
                                alt="Visual Prompting"
                                className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000"
                            />
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
