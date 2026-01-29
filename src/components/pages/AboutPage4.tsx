import React, { useEffect, useState, useRef } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { AboutVersionSwitcher } from './AboutVersionSwitcher';
import { ChevronRight, Cpu, Layers, Maximize, MousePointer2 } from 'lucide-react';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [scrollY, setScrollY] = useState(0);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const getProgress = (start: number, end: number) => {
        const p = (scrollY - start) / (end - start);
        return Math.min(Math.max(p, 0), 1);
    };

    // --- Section 1: Anamorphic Hero (0 - 1500) ---
    const s1Progress = getProgress(0, 1000);
    const titleSlices = [
        { text: 'CREATION', color: 'text-zinc-900 dark:text-white', offset: (1 - s1Progress) * -100 },
        { text: 'REIMAGINED.', color: 'text-orange-500', offset: (1 - s1Progress) * 100 }
    ];

    // --- Section 2: Fan-Out Stack (1500 - 4500) ---
    const s2Progress = getProgress(1500, 4000);
    const s2Alpha = getProgress(1400, 1800) * (1 - getProgress(4000, 4500));
    const images = ['41.jpg', '42.jpg', '44.jpg', '45.jpg', '11.jpg', '13.jpg', '14.jpg', '21.jpg'];

    // --- Section 3: HUD Scanner (4500 - 7500) ---
    const s3Progress = getProgress(4500, 7000);
    const s3Alpha = getProgress(4300, 4800) * (1 - getProgress(7000, 7500));
    const scannerPos = s3Progress * 100;

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-[900vh] flex flex-col selection:bg-orange-500 selection:text-white overflow-x-hidden">
            <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-900' : 'bg-transparent'}`}>
                <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />
            </div>

            <AboutVersionSwitcher activeId="4" />

            <main className="fixed inset-0 overflow-hidden">

                {/* Section 1: ANAMORPHIC HERO */}
                {s1Progress < 1 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ opacity: 1 - getProgress(900, 1200) }}>
                        <div className="flex flex-col gap-4 overflow-hidden py-20 px-10">
                            {titleSlices.map((slice, i) => (
                                <h1
                                    key={i}
                                    className={`text-[12vw] font-black tracking-tighter transition-transform duration-100 ease-out italic leading-[0.8] ${slice.color}`}
                                    style={{ transform: `translateX(${slice.offset}px)` }}
                                >
                                    {slice.text}
                                </h1>
                            ))}
                        </div>
                        <div className="mt-12 w-px h-24 bg-gradient-to-b from-orange-500 to-transparent animate-pulse" />
                    </div>
                )}

                {/* Section 2: THE FAN-OUT STACK (Iterativ + parallel) */}
                {s2Alpha > 0 && (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center transition-opacity"
                        style={{ opacity: s2Alpha }}
                    >
                        <div className="absolute top-24 left-0 w-full px-20 text-center z-10 transition-transform duration-700" style={{ transform: `translateY(${(1 - s2Alpha) * 100}px)` }}>
                            <h2 className="text-8xl font-black tracking-tighter mb-4 italic">Iterativ + parallel arbeiten.</h2>
                            <p className="text-2xl text-zinc-500 max-w-2xl mx-auto">Ganze Variantenreihen gleichzeitig generieren. Vergleichen, verwerfen, veredeln.</p>
                        </div>

                        <div className="relative w-full h-full flex items-center justify-center perspective-[2000px]">
                            {images.map((img, i) => {
                                const angle = (i / images.length) * 360;
                                const radius = 500 * s2Progress;
                                const rotateY = angle;
                                return (
                                    <div
                                        key={i}
                                        className="absolute w-80 h-auto rounded-xl overflow-hidden shadow-2xl border border-white/10 transition-all duration-700 ease-out"
                                        style={{
                                            transform: `rotateY(${rotateY}deg) translateZ(${radius}px) rotateX(${(s2Progress - 0.5) * -40}deg)`,
                                            opacity: 0.1 + s2Progress * 0.9,
                                            pointerEvents: s2Alpha > 0.8 ? 'auto' : 'none'
                                        }}
                                    >
                                        <img src={`/about/iterativ arbeiten img/${img}`} className="w-full h-full object-cover" alt="Iteration" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Section 3: THE SCANNER HUD (Präzise Steuerung) */}
                {s3Alpha > 0 && (
                    <div
                        className="absolute inset-0 flex items-center justify-center transition-opacity"
                        style={{ opacity: s3Alpha }}
                    >
                        <div className="relative w-[85vw] h-[75vh] bg-zinc-900 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(249,115,22,0.1)] border border-white/5">
                            {/* Base Image (Beautiful Result) */}
                            <img src="/about/iterativ arbeiten img/41.jpg" className="w-full h-full object-cover opacity-80" alt="Result" />

                            {/* HUD Underlay (Revealed by scanner) */}
                            <div
                                className="absolute inset-0 overflow-hidden pointer-events-none"
                                style={{ clipPath: `inset(0 0 0 ${scannerPos}%)` }}
                            >
                                <div className="absolute inset-0 bg-orange-500/10 backdrop-blur-3xl" />
                                <div className="absolute inset-0 p-20 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="text-[10px] font-mono tracking-widest text-orange-500 flex items-center gap-2">
                                            <Cpu className="w-3 h-3" /> PRECISION_CORE_REVEALED
                                        </div>
                                        <h3 className="text-8xl font-black text-white italic tracking-tighter">Präzise Steuerung.</h3>
                                        <p className="max-w-md text-xl text-zinc-400">Variablen und Presets geben Ihnen die Kontrolle zurück. Strukturieren Sie Chaos in messbare Qualität.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="flex-1 h-32 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-end">
                                                <div className="text-[10px] font-mono text-orange-400">PARAM_0{i}</div>
                                                <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                                                    <div className="h-full bg-orange-500 w-2/3" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                            </div>

                            {/* Scanner Bar */}
                            <div
                                className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-orange-500 to-transparent shadow-[0_0_30px_rgba(249,115,22,1)] z-20"
                                style={{ left: `${scannerPos}%` }}
                            >
                                <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-orange-500 rounded-full shadow-[0_0_20px_rgba(249,115,22,1)]" />
                                <div className="absolute bottom-0 left-0 -translate-x-1/2 p-2 bg-orange-500 text-black font-mono text-[8px] font-bold">SCANNING...</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Section 4: FINAL REVEAL */}
                {scrollY > 7500 && (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center p-20 transition-opacity duration-1000"
                        style={{ opacity: getProgress(7500, 8000) }}
                    >
                        <blockquote className="text-[6vw] font-black italic tracking-tighter leading-[0.8] mb-12 text-center text-balance max-w-6xl">
                            "Hinter jedem Bild steckt eine Geschichte, die darauf wartet, erzählt zu werden."
                        </blockquote>
                        <button
                            onClick={onCreateBoard}
                            className="group relative px-16 py-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-xl font-black italic transition-all shadow-[0_20px_60px_rgba(249,115,22,0.3)] hover:scale-105"
                        >
                            JETZT KREIEREN <ChevronRight className="inline-block ml-2 group-hover:translate-x-2 transition-transform" />
                        </button>
                        <p className="mt-16 text-zinc-500 font-mono tracking-[0.5em] uppercase text-[10px]">— Exposé Foundry</p>
                    </div>
                )}

            </main>

            <div className="fixed top-1/2 right-10 -translate-y-1/2 flex flex-col items-center gap-4 opacity-30 z-50">
                <div className="w-0.5 h-32 bg-gradient-to-b from-transparent via-zinc-500 to-transparent" />
                <span className="text-[10px] font-mono rotate-90 whitespace-nowrap tracking-[0.3em] uppercase">
                    {scrollY < 1500 ? 'Hero' : scrollY < 4500 ? 'Kinetic' : scrollY < 7500 ? 'Precision' : 'Story'}
                </span>
            </div>

            <GlobalFooter t={t} />

            <style>{`
                .perspective-{2000px} { perspective: 2000px; }
            `}</style>
        </div>
    );
};
