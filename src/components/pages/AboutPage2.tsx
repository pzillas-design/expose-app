import React, { useEffect, useState } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

// --- Organic Components ---

const FluidBackground = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-20 translate-z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-200/40 dark:bg-orange-900/40 blur-[120px] rounded-full animate-[morph_15s_ease-in-out_infinite_alternate]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-blue-100/30 dark:bg-blue-900/20 blur-[100px] rounded-full animate-[morph_20s_ease-in-out_infinite_alternate-reverse]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
    </div>
);

const FluidImageScroll = () => {
    const images = ['11.jpg', '13.jpg', '14.jpg', '21.jpg', '24.jpg', '31.jpg', '32.jpg', '33.jpg'];

    return (
        <div className="flex gap-12 animate-[scroll_60s_linear_infinite] hover:[animation-play-state:paused] py-20">
            {[...images, ...images].map((img, i) => (
                <div key={i} className="flex-none w-64 sm:w-80 group">
                    <div className="relative aspect-[3/4] rounded-[3rem] overflow-hidden shadow-2xl transition-all duration-700 group-hover:rounded-2xl group-hover:scale-105">
                        <img
                            src={`/about/iterativ arbeiten img/${img}`}
                            alt="Fluidity"
                            className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            ))}
        </div>
    );
};

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 min-h-screen flex flex-col selection:bg-orange-100 selection:text-orange-900 font-serif">
            <style>{`
                @keyframes morph {
                    0% { border-radius: 40% 60% 60% 40% / 40% 40% 60% 60%; transform: translate(0,0) scale(1); }
                    100% { border-radius: 60% 40% 40% 60% / 60% 60% 40% 40%; transform: translate(5%,5%) scale(1.1); }
                }
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>

            <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />

            <main className="flex-1 w-full">
                {/* Hero: The Flow */}
                <section className="relative h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
                    <FluidBackground />
                    <div className="relative z-10 space-y-8 max-w-4xl animate-in fade-in slide-in-from-bottom-12 duration-1000">
                        <h1 className="text-7xl sm:text-9xl font-light tracking-tight leading-[0.9]">
                            Der Fluss <br />
                            <span className="italic text-zinc-400 dark:text-zinc-600">der Intuition.</span>
                        </h1>
                        <p className="text-xl sm:text-2xl text-zinc-500 dark:text-zinc-400 font-light max-w-2xl mx-auto leading-relaxed">
                            Kreativität braucht keinen Widerstand. Exposé fängt Ihre Gedanken ein und lässt sie zur Form verschmelzen – sanft, organisch und ohne Grenzen.
                        </p>
                    </div>
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-20 transform scale-75">
                        <div className="w-px h-20 bg-zinc-900 dark:bg-zinc-100" />
                    </div>
                </section>

                {/* Section 2: Seamless Scroll */}
                <section className="bg-zinc-50 dark:bg-zinc-900/10 py-40 overflow-hidden">
                    <div className="px-6 max-w-4xl mx-auto mb-20 text-center">
                        <h2 className="text-4xl sm:text-6xl font-light mb-8 italic">Unendliche Möglichkeiten.</h2>
                        <p className="text-lg text-zinc-500 font-light">Wir haben das Raster aufgebrochen. In Exposé fließen Ideen ineinander, bis das perfekte Bild entsteht.</p>
                    </div>
                    <FluidImageScroll />
                </section>

                {/* Section 3: The Soul of Design */}
                <section className="py-60 px-6 relative">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
                        <div className="space-y-12">
                            <h3 className="text-5xl sm:text-7xl font-light leading-tight">Wo die Seele <br />auf Pixel trifft.</h3>
                            <p className="text-xl text-zinc-500 font-light leading-relaxed">
                                Technik sollte sich nie wie Technik anfühlen. Wir haben jedes Detail so gestaltet, dass es sich natürlich anfühlt – als wäre es schon immer Teil Ihrer Vision gewesen.
                            </p>
                            <button className="px-10 py-5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-900 dark:hover:bg-white hover:text-white dark:hover:text-black transition-all duration-500 text-lg">
                                Unsere Philosophie erfahren
                            </button>
                        </div>
                        <div className="relative">
                            <div className="aspect-square bg-gradient-to-br from-orange-50 to-blue-50 dark:from-zinc-900 dark:to-zinc-800 rounded-[4rem] flex items-center justify-center p-12">
                                <div className="w-full h-full border border-zinc-200/50 dark:border-zinc-700/50 rounded-[3rem] animate-[morph_10s_ease-in-out_infinite_alternate]" />
                                <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-10 font-serif">æ</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Quote: Poetical Closing */}
                <section className="py-40 bg-white dark:bg-zinc-950 text-center">
                    <div className="max-w-3xl mx-auto px-6 italic">
                        <p className="text-3xl sm:text-5xl font-light text-zinc-400 dark:text-zinc-600 leading-tight mb-12">
                            "Das Bild ist nicht das Ziel. Der Moment der Entdeckung ist alles."
                        </p>
                        <div className="h-px w-20 bg-zinc-200 dark:bg-zinc-800 mx-auto mb-8" />
                        <span className="font-sans text-[10px] tracking-[0.5em] uppercase text-zinc-400">M. Pzillas</span>
                    </div>
                </section>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};

