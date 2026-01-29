import React, { useState, useEffect, useRef } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { GripVertical, AlertTriangle, CheckCircle2, Zap, Hourglass } from 'lucide-react';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

// --- Comparison Components ---

const ComparisonSection = ({ leftContent, rightContent, dividerPos }: { leftContent: React.ReactNode, rightContent: React.ReactNode, dividerPos: number }) => {
    return (
        <div className="relative h-screen min-h-[600px] overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
            {/* Left Side (The Struggle) */}
            <div
                className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex flex-col items-center justify-center grayscale contrast-50 opacity-40"
                style={{ width: `${dividerPos}%` }}
            >
                <div className="w-[100vw] h-full flex items-center justify-center p-20">
                    {leftContent}
                </div>
            </div>

            {/* Right Side (The Flow) */}
            <div
                className="absolute inset-y-0 right-0 bg-white dark:bg-zinc-950 overflow-hidden flex flex-col items-center justify-center"
                style={{ left: `${dividerPos}%` }}
            >
                <div className="w-[100vw] h-full flex items-center justify-center p-20 relative left-[calc(-100vw+100vw*var(--divider-percent)/100)]" style={{ transform: `translateX(-${dividerPos}vw)` }}>
                    <div className="w-full flex justify-center">
                        {rightContent}
                    </div>
                </div>
            </div>

            {/* Syncing Right Side Viewport Offset */}
            <style>{`.right-inner { transform: translateX(calc(-100vw * ${dividerPos / 100})); }`}</style>
        </div>
    );
};

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [dividerPos, setDividerPos] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const x = ((clientX - rect.left) / rect.width) * 100;
        setDividerPos(Math.min(Math.max(x, 5), 95));
    };

    return (
        <div
            ref={containerRef}
            className={`bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col selection:bg-orange-500 selection:text-white ${isDragging ? 'select-none cursor-col-resize' : ''}`}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchMove={handleMouseMove}
            onTouchEnd={() => setIsDragging(false)}
        >
            <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />

            {/* Draggable Divider Line */}
            <div
                className="fixed inset-y-0 z-[150] w-px bg-orange-500 flex items-center justify-center cursor-col-resize group"
                style={{ left: `${dividerPos}%` }}
                onMouseDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
            >
                <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                    <GripVertical className="w-5 h-5" />
                </div>
                <div className="absolute top-24 -left-20 bg-black text-white px-3 py-1 text-[10px] font-bold rounded flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-orange-400" /> CHAOS
                </div>
                <div className="absolute top-24 -right-24 bg-black text-white px-3 py-1 text-[10px] font-bold rounded flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-400" /> PRECISION
                </div>
            </div>

            <main className="flex-1 w-full relative">

                {/* Section 1: Hero Split */}
                <div className="relative h-screen w-full flex overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
                    <div className="w-[100vw] h-full shrink-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900" style={{ clipPath: `inset(0 ${100 - dividerPos}% 0 0)` }}>
                        <div className="max-w-4xl px-20">
                            <h1 className="text-8xl sm:text-[12rem] font-bold tracking-tighter opacity-10">STRUGGLE.</h1>
                        </div>
                    </div>
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none" style={{ clipPath: `inset(0 0 0 ${dividerPos}%)` }}>
                        <div className="max-w-4xl px-20 text-center">
                            <h1 className="text-8xl sm:text-[12rem] font-bold tracking-tighter leading-[0.8] mb-8">
                                Creation <br />
                                <span className="text-zinc-400">Reimagined.</span>
                            </h1>
                            <p className="text-xl text-zinc-500 max-w-md mx-auto">
                                Drücken Sie den Slider nach links, um die volle Power von Exposé zu enthüllen.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section 2: Complexity vs Simplicity */}
                <div className="relative h-screen w-full flex overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
                    <div className="w-[100vw] h-full shrink-0 flex flex-col items-center justify-center p-20 bg-zinc-200 dark:bg-zinc-900/50" style={{ clipPath: `inset(0 ${100 - dividerPos}% 0 0)` }}>
                        <div className="max-w-xl space-y-12 opacity-50">
                            <div className="flex items-center gap-6">
                                <Hourglass className="w-12 h-12 text-zinc-400" />
                                <h2 className="text-5xl font-bold">Stundenlanges Prompt-Raten.</h2>
                            </div>
                            <p className="text-lg">Ohne echte Kontrolle ist KI nur ein Glücksspiel. Man verschwendet Zeit mit endlosen Wiederholungen.</p>
                        </div>
                    </div>
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-20 bg-white dark:bg-zinc-950" style={{ clipPath: `inset(0 0 0 ${dividerPos}%)` }}>
                        <div className="max-w-xl space-y-12">
                            <div className="flex items-center gap-6">
                                <Zap className="w-12 h-12 text-orange-500 fill-orange-500/20" />
                                <h2 className="text-5xl font-bold">Präzision in Sekunden.</h2>
                            </div>
                            <p className="text-lg text-zinc-500">Exposé strukturiert den kreativen Prozess. Visual Prompting und parallele Iteration für Ergebnisse, die sitzen.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="text-3xl font-bold text-orange-500">90%</div>
                                    <div className="text-xs uppercase tracking-widest text-zinc-400 mt-2">Weniger Iterations-Müll</div>
                                </div>
                                <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="text-3xl font-bold text-orange-500">∞</div>
                                    <div className="text-xs uppercase tracking-widest text-zinc-400 mt-2">Mehr Möglichkeiten</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Visual Split (The Canvas) */}
                <div className="relative h-screen w-full flex overflow-hidden">
                    <div className="w-[100vw] h-full shrink-0 flex items-center justify-center bg-black overflow-hidden" style={{ clipPath: `inset(0 ${100 - dividerPos}% 0 0)` }}>
                        <img src="/about/iterativ arbeiten img/21.jpg" className="w-full h-full object-cover grayscale blur-md opacity-30 scale-110" alt="Struggle" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-9xl font-black text-white/5 tracking-[0.2em] -rotate-12">CHAOS</span>
                        </div>
                    </div>
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden" style={{ clipPath: `inset(0 0 0 ${dividerPos}%)` }}>
                        <img src="/about/iterativ arbeiten img/21.jpg" className="w-full h-full object-cover" alt="Expose" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-20 left-20">
                            <h3 className="text-6xl font-bold text-white mb-4 italic">"Hinter jedem Bild steckt eine Geschichte..."</h3>
                            <p className="text-zinc-400 font-mono tracking-widest uppercase text-sm">— Michael Pzillas, Founder</p>
                        </div>
                    </div>
                </div>

            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
