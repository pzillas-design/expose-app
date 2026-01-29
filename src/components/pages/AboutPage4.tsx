import React, { useEffect, useState, useRef } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { AboutVersionSwitcher } from './AboutVersionSwitcher';
import { ArrowRight, Cpu, Layout, Maximize2 } from 'lucide-react';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

const CinematicSection = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <section className={`relative h-screen w-full overflow-hidden flex items-center justify-center ${className}`}>
        {children}
    </section>
);

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [scrollY, setScrollY] = useState(0);
    const [scrolled, setScrolled] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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

    // --- Animation Progressions ---
    const s1Progress = getProgress(0, 1000); // 0 to 100vh
    const s2Progress = getProgress(1000, 2500); // 100 to 250vh
    const s3Progress = getProgress(2500, 4500); // 250 to 450vh
    const s4Progress = getProgress(4500, 6000); // 450 to 600vh

    return (
        <div className="bg-black text-white min-h-[700vh] flex flex-col selection:bg-orange-500 selection:text-white font-sans">
            <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${scrolled ? 'bg-black/80 backdrop-blur-2xl border-b border-white/5' : 'bg-transparent'}`}>
                <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />
            </div>

            <AboutVersionSwitcher activeId="4" />

            <main className="w-full">

                {/* SECTION 1: THE GLASS HERO (Creation Reimagined) */}
                <CinematicSection className="sticky top-0 z-10">
                    <div className="absolute inset-0 bg-black">
                        <img
                            src="/about/iterativ arbeiten img/41.jpg"
                            className="w-full h-full object-cover transition-all duration-1000"
                            style={{
                                opacity: 0.4 + s1Progress * 0.4,
                                filter: `blur(${(1 - s1Progress) * 40}px)`,
                                transform: `scale(${1.2 - s1Progress * 0.1})`
                            }}
                            alt="Background"
                        />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />

                    <div className="relative z-10 text-center px-10 max-w-7xl mx-auto">
                        <div
                            className="transition-all duration-1000 ease-out"
                            style={{
                                transform: `translateY(${(1 - s1Progress) * 100}px)`,
                                opacity: s1Progress * 1.5
                            }}
                        >
                            <h1 className="text-7xl md:text-[14rem] font-black tracking-tighter leading-[0.7] mb-12 italic uppercase drop-shadow-2xl">
                                Creation <br /> <span className="text-orange-500">Reimagined.</span>
                            </h1>
                            <p className="text-xl md:text-3xl font-medium tracking-tight text-white/50 max-w-3xl mx-auto leading-relaxed">
                                Der Wendepunkt in deinem kreativen Prozess. Visionär, präzise und grenzenlos.
                            </p>
                        </div>
                    </div>

                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-30 animate-bounce">
                        <div className="text-[10px] font-mono tracking-[0.4em] uppercase">Eintauchen</div>
                        <div className="w-px h-12 bg-white" />
                    </div>
                </CinematicSection>

                <div className="h-[100vh]" /> {/* Gap for Section 1 Scroll */}

                {/* SECTION 2: THE EXPANDING CANVAS (Iterativ + parallel) */}
                <CinematicSection className="sticky top-0 z-20 bg-zinc-950">
                    <div className="absolute inset-0 flex items-center justify-center p-20 overflow-hidden">
                        {/* Central Large Image */}
                        <div
                            className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl transition-transform duration-1000"
                            style={{
                                transform: `scale(${0.8 + s2Progress * 0.4})`,
                                opacity: getProgress(1000, 1300)
                            }}
                        >
                            <img src="/about/iterativ arbeiten img/11.jpg" className="w-full h-full object-cover" alt="Focus" />
                            <div className="absolute inset-0 bg-black/20" />
                        </div>

                        {/* Floating Parallel Elements */}
                        <div className="absolute inset-0 pointer-events-none">
                            {[13, 14, 21, 24].map((id, i) => (
                                <div
                                    key={id}
                                    className="absolute w-64 h-auto rounded-2xl shadow-2xl overflow-hidden transition-all duration-1000 border border-white/5"
                                    style={{
                                        left: `${15 + i * 20}%`,
                                        top: `${20 + (i % 2) * 40}%`,
                                        transform: `translateY(${(1 - s2Progress) * (100 + i * 50)}px) rotate(${(1 - s2Progress) * 10}deg)`,
                                        opacity: s2Progress
                                    }}
                                >
                                    <img src={`/about/iterativ arbeiten img/${id}.jpg`} className="w-full h-auto" alt="Parallel" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="absolute bottom-40 left-0 w-full px-20 flex justify-between items-end z-30">
                        <div
                            className="max-w-xl transition-all duration-700"
                            style={{ transform: `translateY(${(1 - s2Progress) * 50}px)`, opacity: s2Progress }}
                        >
                            <h2 className="text-6xl md:text-9xl font-black tracking-tighter leading-none italic uppercase mb-8">
                                <span className="text-orange-500">Parallel</span> <br />arbeiten.
                            </h2>
                            <p className="text-lg md:text-2xl text-zinc-400 font-medium">
                                Varianten in Echtzeit vergleichen. Werde zum Regisseur deines eigenen digitalen Ateliers.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-20 h-2 bg-orange-500 rounded-full" />
                            <div className="w-32 h-2 bg-zinc-800 rounded-full" />
                        </div>
                    </div>
                </CinematicSection>

                <div className="h-[150vh]" /> {/* Gap for Section 2 Scroll */}

                {/* SECTION 3: THE BLUEPRINT REVEAL (Präzise Steuerung) */}
                <CinematicSection className="sticky top-0 z-30 bg-black">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-[90vw] h-[80vh] rounded-[4rem] overflow-hidden border border-white/10 group">
                            {/* The Real Image */}
                            <img src="/about/iterativ arbeiten img/41.jpg" className="w-full h-full object-cover" alt="Result" />

                            {/* The Blueprint/Technical Reveal */}
                            <div
                                className="absolute inset-0 overflow-hidden"
                                style={{
                                    clipPath: `inset(0 0 ${(1 - s3Progress) * 100}% 0)`,
                                    transition: 'clip-path 0.1s linear'
                                }}
                            >
                                <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center p-20 border-t-2 border-orange-500">
                                    <div className="absolute top-10 left-10 text-[10px] font-mono tracking-widest text-orange-500/50">SYSTEM_REVEAL // PRECISION_V5</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-20 w-full max-w-6xl">
                                        <div className="space-y-12">
                                            <h2 className="text-6xl md:text-9xl font-black tracking-tighter leading-none italic uppercase">
                                                Präzise <br /><span className="text-orange-500">Steuerung.</span>
                                            </h2>
                                            <p className="text-lg md:text-2xl text-zinc-500 leading-relaxed max-w-lg">
                                                Variablen, Presets und logische Strukturen. Wir bringen Ordnung in das Chaos der Möglichkeiten.
                                            </p>
                                        </div>
                                        <div className="flex flex-col justify-center space-y-6">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="group p-8 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-8 hover:bg-white/10 transition-all">
                                                    <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                                                        <Cpu className="w-8 h-8" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-[10px] font-mono text-zinc-500 mb-1 tracking-widest">CONTROL_NODE_0{i}</div>
                                                        <div className="text-xl font-bold">Variable Optimization</div>
                                                    </div>
                                                    <div className="text-orange-500 font-mono">100%</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </CinematicSection>

                <div className="h-[200vh]" /> {/* Gap for Section 3 Scroll */}

                {/* SECTION 4: FINAL REVEAL (Narrative CTA) */}
                <section className="relative h-screen bg-black flex flex-col items-center justify-center overflow-hidden z-40">
                    <div className="absolute inset-0 bg-orange-500/5 blur-[150px] rounded-full" />

                    <div className="relative z-10 text-center px-10">
                        <blockquote className="text-4xl md:text-[6vw] font-black tracking-tighter leading-[0.85] mb-20 italic max-w-7xl mx-auto drop-shadow-2xl">
                            "Hinter jedem Bild steckt eine Geschichte, die darauf wartet, erzählt zu werden."
                        </blockquote>
                        <div className="flex flex-col items-center gap-12">
                            <button
                                onClick={onCreateBoard}
                                className="px-16 py-8 bg-white text-black font-black text-2xl italic rounded-full hover:scale-110 transition-all hover:bg-orange-500 hover:text-white shadow-[0_20px_100px_rgba(255,255,255,0.1)] flex items-center gap-4 group"
                            >
                                JETZT STARTEN <ArrowRight className="w-8 h-8 group-hover:translate-x-3 transition-transform" />
                            </button>
                            <p className="text-zinc-600 font-mono tracking-[0.6em] uppercase text-xs">— MICHAEL PZILLAS, FOUNDER</p>
                        </div>
                    </div>
                </section>
            </main>

            <GlobalFooter t={t} />

            <style>{`
                @font-face {
                    font-family: 'Inter';
                    src: url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                }
                main { font-family: 'Inter', sans-serif; }
            `}</style>
        </div>
    );
};
