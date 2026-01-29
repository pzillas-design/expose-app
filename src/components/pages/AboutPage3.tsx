import React, { useEffect, useState } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Sparkles, Hammer, Heart, ShieldCheck } from 'lucide-react';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

// --- Artisanal Components ---

const PaperTexture = () => (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-10 mix-blend-multiply dark:mix-blend-overlay"
        style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/paper.png')` }} />
);

const CraftGrid = () => {
    const images = ['21.jpg', '24.jpg', '41.jpg', '42.jpg', '11.jpg', '13.jpg'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-7xl mx-auto px-6">
            {images.map((img, i) => (
                <div key={i} className="group relative">
                    <div className="bg-[#f4f1ea] dark:bg-zinc-900 p-4 shadow-[10px_10px_0px_#d4d0c3] dark:shadow-[10px_10px_0px_#18181b] border border-[#e5e1d5] dark:border-zinc-800 transition-all duration-500 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:shadow-[15px_15px_0px_#c4c0b3] dark:group-hover:shadow-[15px_15px_0px_#09090b]">
                        <img src={`/about/iterativ arbeiten img/${img}`} alt="Craft" className="w-full grayscale group-hover:grayscale-0 transition-all duration-700" />
                        <div className="mt-4 flex justify-between items-center opacity-40">
                            <span className="text-[10px] font-mono tracking-tighter italic">Edition 01/26</span>
                            <span className="text-[10px] font-mono tracking-tighter">EXPOSÉ_STUDIO</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    return (
        <div className="bg-[#f9f7f2] dark:bg-zinc-950 text-[#2d2d2d] dark:text-zinc-200 min-h-screen flex flex-col font-serif selection:bg-yellow-200 selection:text-black">
            <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />

            <main className="flex-1 w-full relative">
                <PaperTexture />

                {/* Hero: The Hand and the Tool */}
                <section className="relative h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden pt-20">
                    <div className="relative z-10 max-w-4xl space-y-12">
                        <div className="flex items-center justify-center gap-4 text-orange-600/60 mb-4 scale-150">
                            <Hammer className="w-6 h-6" />
                        </div>
                        <h1 className="text-6xl sm:text-8xl font-bold tracking-tight text-[#1a1a1a] dark:text-white leading-[1.1]">
                            Das Werkzeug <br />
                            <span className="italic font-normal">der neuen Meister.</span>
                        </h1>
                        <p className="max-w-xl mx-auto text-xl text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">
                            KI ist kein Ersatz für den Menschen – sie ist unser neuer Pinsel. In Exposé verbinden wir modernste Technologie mit der Demut vor dem echten Handwerk.
                        </p>
                    </div>
                    <div className="absolute top-20 left-10 opacity-5 dark:opacity-10 scale-150">
                        <Sparkles className="w-40 h-40" />
                    </div>
                </section>

                {/* Section 2: Carefully Crafted UI */}
                <section className="py-40 border-y border-[#e5e1d5] dark:border-zinc-900 bg-[#f4f1ea] dark:bg-zinc-900/30">
                    <div className="max-w-4xl mx-auto px-6 text-center mb-32">
                        <h2 className="text-4xl sm:text-6xl font-bold mb-8">Ehrliche Gestaltung.</h2>
                        <p className="text-lg font-sans text-zinc-500 dark:text-zinc-400">Jedes Icon, jede Linie und jeder Übergang wurde mit Hingabe entworfen. Technik, die sich wie Holz oder Leinen anfühlt.</p>
                    </div>
                    <CraftGrid />
                </section>

                {/* Section 3: The Human Touch in AI */}
                <section className="py-60 px-6">
                    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                        <div className="relative order-2 lg:order-1">
                            <div className="absolute inset-0 border-[20px] border-[#e5e1d5] dark:border-zinc-900 translate-x-8 translate-y-8" />
                            <div className="relative aspect-square bg-[#1a1a1a] flex items-center justify-center p-20 overflow-hidden shadow-2xl">
                                <div className="absolute inset-0 bg-orange-600/10 animate-pulse" />
                                <Heart className="w-full h-full text-white/5" />
                                <div className="absolute bottom-8 left-8 text-white/40 font-mono text-[10px] tracking-widest uppercase">The heart of the machine.</div>
                            </div>
                        </div>
                        <div className="space-y-10 order-1 lg:order-2">
                            <h3 className="text-5xl font-bold leading-tight">Menschliche Werte <br />im digitalen Raum.</h3>
                            <p className="text-xl font-sans text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                Wir glauben an Privatsphäre, Urheberschaft und die Würde des Künstlers. Exposé ist ein Werkzeug, das Ihre Arbeit schützt und veredelt.
                            </p>
                            <ul className="space-y-4 font-sans text-sm text-zinc-500">
                                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-green-600/60" /> Volle Datenkontrolle.</li>
                                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-green-600/60" /> Respekt vor dem Copyright.</li>
                                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-green-600/60" /> Lokal trainierte Modelle.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Manifesto: Closing Footer */}
                <section className="py-40 bg-[#1a1a1a] text-[#f4f1ea] text-center border-t border-white/5">
                    <div className="max-w-2xl mx-auto px-6">
                        <span className="text-[10px] font-mono tracking-[0.6em] uppercase mb-10 block opacity-40">Unser Manifest</span>
                        <p className="text-2xl sm:text-4xl font-bold leading-tight mb-16 italic">
                            "Wir streben nach Schönheit, die Bestand hat. Auch wenn sie aus Bits und Bytes besteht."
                        </p>
                        <div className="flex justify-center gap-8 opacity-40 grayscale contrast-200">
                            <img src="/logo.svg" className="w-6 h-6 invert" alt="Logo" />
                        </div>
                    </div>
                </section>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};

