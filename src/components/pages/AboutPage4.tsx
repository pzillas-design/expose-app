import React, { useEffect, useState, useRef } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { AboutVersionSwitcher } from './AboutVersionSwitcher';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

const FluidBlob = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`relative ${className}`} style={{ filter: 'url(#goo)' }}>
        {children}
    </div>
);

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [scrolled, setScrolled] = useState(false);
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
            setScrollY(window.scrollY);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const getProgress = (start: number, end: number) => {
        const p = (scrollY - start) / (end - start);
        return Math.min(Math.max(p, 0), 1);
    };

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col selection:bg-orange-500 selection:text-white overflow-x-hidden">
            <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-900' : 'bg-transparent'}`}>
                <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />
            </div>

            <AboutVersionSwitcher activeId="4" />

            {/* SVG Gooey Filter Definitions */}
            <svg className="hidden">
                <defs>
                    <filter id="goo">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
                        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                    </filter>
                </defs>
            </svg>

            <main className="flex-1 w-full">
                {/* Hero: Fluid Materialization */}
                <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
                    <FluidBlob className="flex flex-col items-center">
                        <div
                            className="w-64 h-64 bg-orange-500 rounded-full blur-3xl opacity-20 absolute -z-10 transition-transform duration-1000"
                            style={{ transform: `scale(${1 + scrollY * 0.002}) translate(${Math.sin(scrollY * 0.01) * 50}px, ${Math.cos(scrollY * 0.01) * 50}px)` }}
                        />
                        <h1 className="text-8xl md:text-[12rem] font-black tracking-tighter leading-none text-center select-none">
                            Liquid<br />
                            <span className="text-orange-500 italic">Vision.</span>
                        </h1>
                    </FluidBlob>
                    <p className="mt-12 text-zinc-400 font-mono tracking-[0.5em] uppercase text-xs animate-pulse">Scroll to Materialize</p>
                </section>

                {/* Section: Growing Ideas */}
                <section className="min-h-screen py-40 flex flex-col items-center">
                    <div className="max-w-4xl px-6 text-center mb-32">
                        <h2 className="text-6xl md:text-8xl font-bold tracking-tight mb-8">Ideen zum <span className="text-orange-500">Leben</span> erwecken.</h2>
                        <p className="text-xl text-zinc-500 leading-relaxed">Exposé ist nicht nur ein Tool. Es ist der organische Fluss zwischen deiner Vision und der Realität.</p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-12 max-w-7xl px-6" style={{ filter: 'url(#goo)' }}>
                        {[41, 11, 21, 31, 42, 13].map((id, i) => {
                            const progress = getProgress(400 + i * 100, 1200 + i * 100);
                            return (
                                <div
                                    key={id}
                                    className="w-48 sm:w-64 md:w-80 aspect-[4/5] bg-zinc-200 dark:bg-zinc-900 rounded-[4rem] transition-all duration-[800ms] overflow-hidden group shadow-2xl"
                                    style={{
                                        transform: `translateY(${(1 - progress) * 100}px) scale(${0.8 + progress * 0.2})`,
                                        opacity: progress,
                                        borderRadius: `${progress * 2}rem`
                                    }}
                                >
                                    <img
                                        src={`/about/iterativ arbeiten img/${id}.jpg`}
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                        alt="Fluid Materialization"
                                    />
                                    <div className="absolute inset-0 bg-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Section: The Technical Fog */}
                <section className="min-h-screen py-40 bg-zinc-900 text-white relative flex flex-col items-center justify-center overflow-hidden">
                    <div
                        className="absolute inset-0 opacity-10"
                        style={{
                            backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")',
                            maskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)'
                        }}
                    />

                    <div className="relative z-10 max-w-4xl px-6 text-center space-y-12">
                        <div className="inline-block px-4 py-1.5 rounded-full border border-orange-500/50 text-[10px] font-mono text-orange-400 tracking-widest uppercase mb-4">
                            Precision Core v5
                        </div>
                        <h2 className="text-7xl md:text-9xl font-black tracking-tighter leading-none italic">
                            Brutale Kraft.<br />
                            <span className="text-orange-500">Absolute Kontrolle.</span>
                        </h2>
                        <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                            Hinter der eleganten Fluidität arbeitet eine Engine von unerreichter Tiefe. Jede Variable ist ein Hebel für deine Perfektion.
                        </p>
                    </div>

                    {/* Draggable-like Discovery Zone */}
                    <div className="mt-24 w-full max-w-5xl aspect-video rounded-3xl bg-black border border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-800 font-mono text-[8vw] select-none opacity-20">
                            UNDER_CONSTRUCTION
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/80 backdrop-blur-xl transition-transform duration-700" style={{ transform: `scale(${1.2 - getProgress(1800, 2500) * 0.2})`, opacity: 1 - getProgress(2200, 2600) }}>
                            <div className="text-center group-hover:scale-105 transition-transform">
                                <span className="text-6xl text-white">??</span>
                                <p className="mt-4 text-xs font-mono uppercase tracking-widest text-zinc-500">Discovery Layer Locked</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final: The Core */}
                <section className="py-60 flex flex-col items-center text-center">
                    <div className="w-1 h-32 bg-gradient-to-b from-orange-500 to-transparent mb-12" />
                    <blockquote className="max-w-4xl px-6 text-6xl md:text-8xl font-bold tracking-tighter leading-none mb-20 italic">
                        "Die beste Technologie ist die, die sich wie Magie anfüllt."
                    </blockquote>
                    <button
                        onClick={onCreateBoard}
                        className="px-12 py-6 bg-black dark:bg-white text-white dark:text-black rounded-full text-lg font-bold hover:scale-110 transition-transform shadow-2xl"
                    >
                        Jetzt Starten
                    </button>
                    <p className="mt-12 text-sm font-mono text-zinc-400 uppercase tracking-widest">— Exposé Lab</p>
                </section>
            </main>

            <GlobalFooter t={t} />

            <style>{`
                @keyframes orbit {
                    from { transform: rotate(0deg) translateX(50px) rotate(0deg); }
                    to { transform: rotate(360deg) translateX(50px) rotate(-360deg); }
                }
            `}</style>
        </div>
    );
};
