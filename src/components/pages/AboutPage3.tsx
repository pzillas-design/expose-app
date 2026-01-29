import React, { useEffect, useState, useRef } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Search, Monitor, Cpu, ArrowRight } from 'lucide-react';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

// --- Interaction Components ---

const FloatingImage = ({ src, depth, x, y, size, opacity }: { src: string, depth: number, x: string, y: string, size: string, opacity: number }) => (
    <div
        className="absolute transition-transform duration-700 ease-out"
        style={{
            left: x,
            top: y,
            width: size,
            transform: `translateZ(${depth}px)`,
            zIndex: Math.floor(depth) + 1000,
            opacity: opacity
        }}
    >
        <img src={src} className="w-full h-auto shadow-2xl rounded-sm" alt="Canvas" />
    </div>
);

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll Ranges (simplified)
    const getProgress = (start: number, end: number) => {
        const p = (scrollY - start) / (end - start);
        return Math.min(Math.max(p, 0), 1);
    };

    // --- Section 1: The Dive (0 - 2000) ---
    const s1Alpha = 1 - getProgress(1200, 1800);
    const diveDepth = scrollY * 1.2;

    // --- Section 2: The Horizon (2000 - 4500) ---
    const s2Alpha = getProgress(1800, 2200) * (1 - getProgress(4000, 4500));
    const horizonX = (getProgress(2200, 4000) * -150); // Move left by 150%

    // --- Section 3: The Focus Lens (4500 - 7000) ---
    const s3Alpha = getProgress(4300, 4800) * (1 - getProgress(6500, 7000));
    const focusScale = 1 + getProgress(4800, 6500) * 0.5;

    // --- Section 4: The Quote (7000 - 10000) ---
    const s4Alpha = getProgress(6800, 7500);
    const quoteSize = 0.5 + getProgress(7500, 9500) * 0.5;

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-[1000vh] flex flex-col selection:bg-orange-500 selection:text-white">
            <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />

            <main className="fixed inset-0 overflow-hidden">

                {/* Section 1: THE DIVE */}
                {s1Alpha > 0 && (
                    <div
                        className="absolute inset-0 flex items-center justify-center preserve-3d transition-opacity pointer-events-none"
                        style={{
                            opacity: s1Alpha,
                            transform: `perspective(1200px) translate3d(0, 0, ${diveDepth}px)`
                        }}
                    >
                        <div className="text-center p-6" style={{ transform: 'translateZ(200px)' }}>
                            <h1 className="text-8xl sm:text-[14rem] font-bold tracking-tighter leading-[0.7] mb-8">Dive <br /><span className="text-orange-500">Deep.</span></h1>
                            <p className="text-xl text-zinc-500 font-medium">Entdecke die Tiefe deiner Kreativität.</p>
                        </div>
                        <FloatingImage src="/about/iterativ arbeiten img/41.jpg" x="75%" y="15%" depth={-200} size="300px" opacity={1} />
                        <FloatingImage src="/about/iterativ arbeiten img/11.jpg" x="10%" y="60%" depth={-600} size="450px" opacity={0.8} />
                        <FloatingImage src="/about/iterativ arbeiten img/21.jpg" x="60%" y="70%" depth={-1200} size="400px" opacity={0.6} />
                    </div>
                )}

                {/* Section 2: THE HORIZON (Horizontal Track) */}
                {s2Alpha > 0 && (
                    <div
                        className="absolute inset-0 flex flex-col justify-center bg-zinc-50 dark:bg-zinc-900/30 transition-opacity"
                        style={{ opacity: s2Alpha }}
                    >
                        <div className="px-20 mb-12 relative z-10 transition-transform duration-700" style={{ transform: `translateY(${(1 - s2Alpha) * 50}px)` }}>
                            <h2 className="text-8xl font-bold tracking-tighter mb-4 italic">Parallel + Iterativ.</h2>
                            <p className="text-2xl text-zinc-500">Unendliche Varianten reihen sich ein in deinen Workflow.</p>
                        </div>
                        <div
                            className="flex gap-10 px-20 transition-transform duration-300 ease-out"
                            style={{ transform: `translateX(${horizonX}vw)` }}
                        >
                            {['41.jpg', '42.jpg', '44.jpg', '45.jpg', '11.jpg', '13.jpg', '14.jpg', '21.jpg', '24.jpg', '31.jpg'].map((img, i) => (
                                <div key={i} className="min-w-[400px] aspect-[4/5] bg-white dark:bg-zinc-800 rounded-xl overflow-hidden shadow-2xl border border-white/10 shrink-0 transform hover:scale-105 transition-transform">
                                    <img src={`/about/iterativ arbeiten img/${img}`} className="w-full h-full object-cover" alt="Iterated variant" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section 3: THE FOCUS LENS (Blueprint HUD) */}
                {s3Alpha > 0 && (
                    <div
                        className="absolute inset-0 flex items-center justify-center transition-opacity"
                        style={{ opacity: s3Alpha }}
                    >
                        <div
                            className="relative w-[80vw] max-w-5xl h-[60vh] border border-orange-500/30 rounded-3xl bg-zinc-100/50 dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden transition-transform duration-700"
                            style={{ transform: `scale(${focusScale})` }}
                        >
                            {/* Technical Grid Overlay */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

                            <div className="absolute inset-0 flex flex-col p-20 justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-4">
                                        <div className="text-[10px] font-mono tracking-widest text-orange-500 flex items-center gap-2">
                                            <Cpu className="w-3 h-3" /> SYSTEM_ENGINE_V5
                                        </div>
                                        <h3 className="text-6xl font-bold tracking-tight">Präzise Steuerung.</h3>
                                        <p className="max-w-md text-xl text-zinc-500 leading-relaxed">Kein Ratespiel mehr. Jedes Detail, jede Variable, jede Nuance liegt in Ihrer Hand.</p>
                                    </div>
                                    <div className="w-48 aspect-video bg-black rounded-lg border border-white/10 flex items-center justify-center">
                                        <div className="text-[10px] font-mono text-zinc-500 animate-pulse">OPTIMIZING...</div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="flex-1 h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl border border-zinc-300 dark:border-zinc-700 flex items-center justify-center overflow-hidden group">
                                            <div className="absolute inset-0 bg-orange-500 translate-y-full group-hover:translate-y-0 transition-transform" />
                                            <div className="relative z-10 text-[10px] font-bold group-hover:text-white transition-colors uppercase">Layer {i}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Center Focus "Lens" */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-1/2 h-1/2 border-2 border-orange-500 rounded-full animate-ping opacity-20" />
                                <div className="absolute w-4 h-4 bg-orange-500 rounded-full" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Section 4: THE CINEMATIC QUOTE */}
                {s4Alpha > 0 && (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center p-20 transition-opacity"
                        style={{ opacity: s4Alpha }}
                    >
                        <div className="max-w-7xl text-center transition-transform duration-1000" style={{ transform: `scale(${quoteSize})` }}>
                            <blockquote className="text-[5vw] sm:text-[10vw] font-black italic tracking-tighter leading-[0.8] mb-20 text-balance">
                                "Behind every <span className="text-orange-500">image</span> is a <span className="text-zinc-400">story</span> waiting to be told."
                            </blockquote>
                            <div className="flex flex-col items-center gap-8">
                                <div className="w-px h-32 bg-gradient-to-b from-orange-500 to-transparent" />
                                <button
                                    onClick={onCreateBoard}
                                    className="group flex items-center gap-4 bg-orange-500 hover:bg-orange-600 text-white px-12 py-6 rounded-full text-lg font-bold transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]"
                                >
                                    Start Creating <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                                </button>
                                <div className="text-sm font-mono tracking-[0.5em] text-zinc-500 uppercase mt-12">— Michael Pzillas, Founder</div>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            <div className="fixed top-1/2 right-10 -translate-y-1/2 flex flex-col items-center gap-4 opacity-30">
                <div className="w-0.5 h-32 bg-gradient-to-b from-transparent via-zinc-500 to-transparent" />
                <span className="text-[10px] font-mono rotate-90 whitespace-nowrap tracking-[0.3em]">
                    {scrollY < 2000 ? 'THE DIVE' : scrollY < 4500 ? 'THE HORIZON' : scrollY < 7000 ? 'THE FOCUS' : 'THE STORY'}
                </span>
            </div>

            <GlobalFooter t={t} />

            <style>{`
                .preserve-3d { transform-style: preserve-3d; }
            `}</style>
        </div>
    );
};
