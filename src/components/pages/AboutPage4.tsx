import React, { useEffect, useState, useRef, useMemo } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { AboutVersionSwitcher } from './AboutVersionSwitcher';
import { ArrowRight, Cpu, Zap, Maximize2, Crosshair, Sparkles } from 'lucide-react';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

// --- Interaction Components ---

const FloatingElement = ({ children, depth, x, y, opacity, blur = 0 }: { children: React.ReactNode, depth: number, x: string, y: string, opacity: number, blur?: number }) => (
    <div
        className="absolute transition-all duration-1000 ease-out preserve-3d"
        style={{
            left: x,
            top: y,
            transform: `translateZ(${depth}px)`,
            zIndex: Math.floor(depth) + 1000,
            opacity: opacity,
            filter: blur > 0 ? `blur(${blur}px)` : 'none'
        }}
    >
        {children}
    </div>
);

const ParticleField = ({ count = 20 }: { count?: number }) => {
    const particles = useMemo(() => {
        return Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            z: Math.random() * -1000,
            size: Math.random() * 4 + 1
        }));
    }, [count]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden preserve-3d">
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute bg-white rounded-full opacity-20"
                    style={{
                        left: p.x,
                        top: p.y,
                        width: p.size,
                        height: p.size,
                        transform: `translateZ(${p.z}px)`
                    }}
                />
            ))}
        </div>
    );
};

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

    // --- Section 1: THE REFINED DIVE (0 - 2500) ---
    const s1Alpha = 1 - getProgress(1800, 2300);
    const diveDepth = scrollY * 1.4;

    // --- Section 2: DUAL-TRACK HORIZON (2500 - 5500) ---
    const s2Alpha = getProgress(2300, 2800) * (1 - getProgress(5000, 5500));
    const track1X = (getProgress(2800, 5000) * -120); // Top row moves left
    const track2X = (getProgress(2800, 5000) * 80) - 80; // Bottom row moves right

    // --- Section 3: PRECISION MAGNIFIER (5500 - 8500) ---
    const s3Alpha = getProgress(5300, 5800) * (1 - getProgress(8000, 8500));
    const magnifierPos = getProgress(5800, 8000) * 100;

    // --- Section 4: KINETIC STORY (8500 - 11000) ---
    const s4Alpha = getProgress(8300, 8800);
    const quoteProgress = getProgress(8800, 10500);

    return (
        <div className="bg-[#050505] text-white min-h-[11000vh] flex flex-col selection:bg-orange-500 selection:text-white font-sans overflow-x-hidden">
            <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${scrolled ? 'bg-black/90 backdrop-blur-2xl border-b border-white/5' : 'bg-transparent'}`}>
                <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />
            </div>

            <AboutVersionSwitcher activeId="4" />

            <main className="fixed inset-0 overflow-hidden">

                {/* SECTION 1: THE REFINED DIVE */}
                {s1Alpha > 0 && (
                    <div
                        className="absolute inset-0 flex items-center justify-center transition-opacity pointer-events-none preserve-3d"
                        style={{
                            opacity: s1Alpha,
                            transform: `perspective(1000px) translate3d(0, 0, ${diveDepth}px)`
                        }}
                    >
                        <ParticleField count={40} />

                        <div className="text-center z-10" style={{ transform: 'translateZ(300px)' }}>
                            <h1 className="text-8xl md:text-[16rem] font-black tracking-tighter leading-[0.7] drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] italic uppercase">
                                Dive<br /><span className="text-orange-500">Deeper.</span>
                            </h1>
                            <p className="mt-8 text-xl md:text-2xl text-white/40 font-medium tracking-[0.2em] uppercase">Der Ursprung deiner Vision</p>
                        </div>

                        {/* Extended Layers */}
                        <FloatingElement x="15%" y="10%" depth={-200} opacity={1}>
                            <img src="/about/iterativ arbeiten img/41.jpg" className="w-[300px] h-auto shadow-2xl border border-white/10" alt="Depth 1" />
                        </FloatingElement>
                        <FloatingElement x="75%" y="60%" depth={-500} opacity={0.8}>
                            <img src="/about/iterativ arbeiten img/11.jpg" className="w-[450px] h-auto shadow-2xl border border-white/10" alt="Depth 2" />
                        </FloatingElement>
                        <FloatingElement x="5%" y="40%" depth={-900} opacity={0.6} blur={2}>
                            <img src="/about/iterativ arbeiten img/21.jpg" className="w-[500px] h-auto shadow-2xl border border-white/10" alt="Depth 3" />
                        </FloatingElement>
                        <FloatingElement x="65%" y="15%" depth={-1400} opacity={0.4} blur={4}>
                            <img src="/about/iterativ arbeiten img/31.jpg" className="w-[400px] h-auto shadow-2xl border border-white/10" alt="Depth 4" />
                        </FloatingElement>
                    </div>
                )}

                {/* SECTION 2: DUAL-TRACK HORIZON */}
                {s2Alpha > 0 && (
                    <div
                        className="absolute inset-0 flex flex-col justify-center gap-12 transition-opacity"
                        style={{ opacity: s2Alpha }}
                    >
                        <div className="absolute top-20 left-20 z-30 transition-all duration-700" style={{ transform: `translateX(${(1 - s2Alpha) * -50}px)`, opacity: s2Alpha }}>
                            <h2 className="text-6xl md:text-9xl font-black italic tracking-tighter leading-[0.8] uppercase">
                                Iterativ <br /> <span className="text-orange-500">+ Parallel.</span>
                            </h2>
                        </div>

                        {/* Track 1: Moving Left */}
                        <div
                            className="flex gap-8 px-20 transition-transform duration-300 ease-out"
                            style={{ transform: `translateX(${track1X}vw)` }}
                        >
                            {['41.jpg', '42.jpg', '44.jpg', '45.jpg', '11.jpg'].map((img, i) => (
                                <div key={i} className="min-w-[450px] aspect-video bg-white/5 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group flex-shrink-0">
                                    <img src={`/about/iterativ arbeiten img/${img}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="Variant" />
                                    <div className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>

                        {/* Track 2: Moving Right */}
                        <div
                            className="flex gap-8 px-20 transition-transform duration-300 ease-out"
                            style={{ transform: `translateX(${track2X}vw)` }}
                        >
                            {['13.jpg', '14.jpg', '21.jpg', '24.jpg', '31.jpg'].map((img, i) => (
                                <div key={i} className="min-w-[450px] aspect-video bg-white/5 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group flex-shrink-0">
                                    <img src={`/about/iterativ arbeiten img/${img}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="Variant" />
                                    <div className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* SECTION 3: PRECISION GLASS HUD */}
                {s3Alpha > 0 && (
                    <div
                        className="absolute inset-0 flex items-center justify-center transition-opacity p-10"
                        style={{ opacity: s3Alpha }}
                    >
                        <div className="relative w-full max-w-7xl h-[75vh] bg-zinc-900 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(249,115,22,0.1)] border border-white/5 flex">

                            {/* Left Text Block */}
                            <div className="flex-1 p-20 flex flex-col justify-center space-y-12 z-10">
                                <div className="space-y-4">
                                    <div className="text-[10px] font-mono tracking-widest text-orange-500 flex items-center gap-2">
                                        <Crosshair className="w-3 h-3" /> PRECISION_SYSTEM_ANALYSIS
                                    </div>
                                    <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter leading-none uppercase">
                                        Präzise <br /> <span className="text-orange-500">Steuerung.</span>
                                    </h2>
                                </div>
                                <p className="text-xl text-zinc-500 max-w-md leading-relaxed">
                                    Variablen und Presets geben Ihnen die Kontrolle zurück. Wir strukturieren den kreativen Workflow in messbare Qualität.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    {['STIL', 'LICHT', 'FARBE', 'TEXTUREN'].map(tag => (
                                        <div key={tag} className="px-5 py-2 rounded-full border border-white/10 bg-white/5 text-[10px] font-mono tracking-widest text-zinc-400">{tag}</div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Image Block with Magnifier */}
                            <div className="flex-1 relative overflow-hidden bg-black">
                                <img src="/about/iterativ arbeiten img/41.jpg" className="w-full h-full object-cover opacity-60" alt="Base" />

                                {/* Magnifier HUD */}
                                <div
                                    className="absolute inset-0 transition-all duration-200 pointer-events-none"
                                    style={{
                                        clipPath: `circle(150px at ${magnifierPos}% 50%)`,
                                        opacity: s3Alpha > 0.5 ? 1 : 0
                                    }}
                                >
                                    <div className="absolute inset-0 bg-black">
                                        <img
                                            src="/about/iterativ arbeiten img/41.jpg"
                                            className="w-full h-full object-cover scale-[1.5]"
                                            style={{ transform: `translate(${(50 - magnifierPos) * 0.5}%, 0) scale(1.5)` }}
                                            alt="Zoomed"
                                        />
                                        <div className="absolute inset-0 bg-orange-500/10 backdrop-blur-sm mix-blend-overlay" />
                                    </div>
                                </div>

                                {/* Magnifier Ring */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-[300px] h-[300px] border-2 border-orange-500 rounded-full shadow-[0_0_50px_rgba(249,115,22,0.5)] z-20 pointer-events-none flex items-center justify-center"
                                    style={{ left: `calc(${magnifierPos}% - 150px)` }}
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-4 px-3 py-1.5 bg-orange-500 text-black text-[10px] font-mono font-bold tracking-widest clip-path-polygon">
                                        LENS_ACTIVE
                                        <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-orange-500"></div>
                                    </div>
                                    <div className="w-full h-[1px] bg-orange-500/30" />
                                    <div className="h-full w-[1px] bg-orange-500/30 absolute" />
                                    <Sparkles className="w-6 h-6 text-orange-500 animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 4: KINETIC STORY */}
                {s4Alpha > 0 && (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center p-20 transition-opacity bg-black"
                        style={{ opacity: s4Alpha }}
                    >
                        <div className="max-w-7xl text-center space-y-12">
                            <h2
                                className="text-[6vw] md:text-[8vw] font-black italic tracking-tighter leading-none text-balance transition-all duration-700"
                                style={{ transform: `scale(${0.9 + quoteProgress * 0.1})`, opacity: quoteProgress }}
                            >
                                "Hinter jedem <span className="text-orange-500">Bild</span> steckt eine <span className="text-white/30 italic">Geschichte,</span> die erzählt werden will."
                            </h2>

                            <div
                                className="flex flex-col items-center gap-12 transition-all duration-1000 delay-300"
                                style={{ transform: `translateY(${(1 - quoteProgress) * 100}px)`, opacity: quoteProgress }}
                            >
                                <div className="w-1 h-32 bg-gradient-to-b from-orange-500 to-transparent" />
                                <button
                                    onClick={onCreateBoard}
                                    className="group flex items-center gap-6 bg-white text-black px-12 py-6 rounded-full text-xl font-black italic hover:bg-orange-500 hover:text-white transition-all hover:scale-110 shadow-[0_30px_60px_rgba(255,255,255,0.05)]"
                                >
                                    CREATION REIMAGINED <ArrowRight className="w-8 h-8 group-hover:translate-x-3 transition-transform" />
                                </button>
                                <p className="text-zinc-600 font-mono tracking-[0.6em] uppercase text-xs">— MICHAEL PZILLAS, FOUNDER</p>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* Navigation Progress Bar */}
            <div className="fixed bottom-10 left-10 h-1 w-64 bg-white/10 rounded-full overflow-hidden z-[100]">
                <div
                    className="h-full bg-orange-500 transition-all duration-300"
                    style={{ width: `${getProgress(0, 10000) * 100}%` }}
                />
                <div className="absolute top-[-20px] left-0 text-[8px] font-mono tracking-widest text-zinc-500">STORY_PROGRESS</div>
            </div>

            <GlobalFooter t={t} />

            <style>{`
                .preserve-3d { transform-style: preserve-3d; }
                .clip-path-polygon { clip-path: inset(0 0 -10px 0); }
            `}</style>
        </div>
    );
};
