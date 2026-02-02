import React, { useEffect, useState, useRef } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Pen, Camera, X } from 'lucide-react';
import { TwoDotsVertical } from '@/components/ui/CustomIcons';
import { Theme } from '@/components/ui/DesignSystem';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

// --- Interaction Components ---

interface FloatingImageProps {
    src: string;
    depth: number;
    x: string;
    y: string;
    size: string;
    key?: React.Key;
}

const FloatingImage = ({ src, depth, x, y, size }: FloatingImageProps) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="absolute transition-all duration-700 ease-out"
            style={{
                left: x,
                top: y,
                width: size,
                transform: `translateZ(${depth}px) ${isHovered ? 'scale(1.05)' : 'scale(1)'}`,
                zIndex: Math.floor(depth) + 1000
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative group cursor-none">
                <img
                    src={src}
                    className="w-full h-auto shadow-2xl transition-all duration-500 rounded-sm"
                    alt="Canvas Element"
                />
                <div className={`absolute -inset-4 bg-orange-500/10 blur-xl rounded-full transition-opacity duration-500 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
            </div>
        </div>
    );
};

// --- Mockup Components ---

const CanvasMockup = () => {
    const [scrollProgress, setScrollProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Calculate progress based on element position
            // Start animation when element enters viewport (bottom of screen)
            // Complete when element reaches center (50vh)
            const start = windowHeight; // Bottom of screen
            const end = windowHeight * 0.5; // Center of screen
            const current = rect.top;

            // Progress from 0 (chaos) to 1 (order)
            const progress = Math.min(Math.max((start - current) / (start - end), 0), 1);
            setScrollProgress(progress);
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial calculation
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Irregular grid: 4-3-2-4 rows (fransiges Design)
    const imageRows = [
        ['41.jpg', '42.jpg', '43.jpg', '44.jpg'],
        ['11.jpg', '12.jpg', '13.jpg'],
        ['21.jpg', '22.jpg'],
        ['31.jpg', '32.jpg', '14.jpg', '23.jpg']
    ];

    // Larger Z-offsets for chaos effect (prevent overlap)
    // All positive values so images only scale DOWN, never up
    const zOffsets = [
        300, 400, 250, 350,  // Row 1 - all positive (further away)
        280, 380, 320,       // Row 2
        340, 260,            // Row 3
        290, 370, 310, 330   // Row 4
    ];

    return (
        <div ref={containerRef} className="w-full flex flex-col gap-2 sm:gap-3 lg:gap-4" style={{ transformStyle: 'preserve-3d' }}>
            {imageRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2 sm:gap-3 lg:gap-4" style={{ transformStyle: 'preserve-3d' }}>
                    {row.map((img, imgIndex) => {
                        const delay = (rowIndex * 4 + imgIndex) * 0.04; // Stagger effect
                        const zIndex = rowIndex * 4 + imgIndex;
                        const zOffset = zOffsets[zIndex] || 0;

                        // Apply delay to progress for staggered effect
                        const delayedProgress = Math.min(Math.max(scrollProgress - delay, 0), 1);

                        // Interpolate between chaos and order
                        // Scale: larger values (1.3-1.5) → 1.0 (only scale DOWN)
                        const startScale = 1.3 + (zOffset / 1000); // 1.3 to 1.7 based on Z
                        const currentScale = startScale - (delayedProgress * (startScale - 1.0));
                        const currentZ = zOffset * (1 - delayedProgress); // varied → 0
                        const currentOpacity = 0.3 + (delayedProgress * 0.7); // 0.3 → 1.0

                        return (
                            <div
                                key={img}
                                className="relative group overflow-hidden w-32 sm:w-40 md:w-48 lg:w-56 flex-shrink-0"
                                style={{
                                    opacity: currentOpacity,
                                    transform: `translateZ(${currentZ}px) scale(${currentScale})`,
                                    transition: 'all 300ms ease-out',
                                    transformStyle: 'preserve-3d',
                                }}
                            >
                                {/* Image container - NO border radius */}
                                <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                                    <img
                                        src={`/about/2-iterativ-parallel/${img}`}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-105"
                                        alt=""
                                    />
                                    {/* Subtle overlay for depth */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </div>

                                {/* Workflow indicator - subtle number badge */}
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm flex items-center justify-center text-[9px] font-bold text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    {zIndex + 1}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

const SidepanelMockup = () => {
    const [selectedSeason, setSelectedSeason] = useState('Sommer');
    const [selectedTime, setSelectedTime] = useState('Nachmittag');

    return (
        <div className="w-full max-w-sm mx-auto bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-900 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-900 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400 dark:text-zinc-500">Bearbeiten</span>
                <X className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
            </div>

            <div className="p-6 flex flex-col gap-4">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-900">
                    <p className="text-sm font-mono text-zinc-600 dark:text-zinc-300">
                        Inszeniere das Bild neu, indem du die Jahreszeit anpasst
                        <span className="inline-block w-1.5 h-4 bg-orange-500 ml-1 animate-pulse" />
                    </p>
                </div>
                <div className="flex flex-col gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-400">Saison</span>
                    <div className="flex flex-wrap gap-2">
                        {['Sommer', 'Herbst', 'Winter', 'Frühling'].map(s => (
                            <button key={s} onClick={() => setSelectedSeason(s)} className={`px-3 py-1 text-[11px] rounded-md transition-all ${selectedSeason === s ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-bold' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500'}`}>{s}</button>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-400">Uhrzeit</span>
                    <div className="flex flex-wrap gap-2">
                        {['Mittag', 'Nachmittag', 'Golden Hour', 'Blue Hour', 'Nacht'].map(t => (
                            <button key={t} onClick={() => setSelectedTime(t)} className={`px-3 py-1 text-[11px] rounded-md transition-all ${selectedTime === t ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-bold' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500'}`}>{t}</button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400 text-[11px]"><Pen className="w-3 h-3 text-blue-500" /> Anmerkung</div>
                    <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400 text-[11px]"><Camera className="w-3 h-3 text-orange-500" /> Referenzbild</div>
                </div>
                <button className="w-full py-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-sm tracking-tight mt-4 flex items-center justify-center gap-2">
                    <span>GENERIEREN</span>
                    <TwoDotsVertical className="w-4 h-4 ml-auto" />
                </button>
            </div>
        </div>
    );
};

// --- Scroll Animation Wrapper ---

const ScrollReveal: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => setIsVisible(true), delay);
                }
            },
            { threshold: 0.1, rootMargin: '-50px' }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [delay]);

    return (
        <div
            ref={ref}
            className="transition-all duration-1000 ease-out"
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(40px)'
            }}
        >
            {children}
        </div>
    );
};

// --- Main Page Component ---

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [scrollDepth, setScrollDepth] = useState(0);
    const [scrolled, setScrolled] = useState(false);
    const [introProgress, setIntroProgress] = useState(0); // 0 to 1

    useEffect(() => {
        const handleScroll = () => {
            const y = window.scrollY;
            const introHeight = window.innerHeight * 2.0; // Duration of the 3D dive

            // Calculate progress for the intro (0 to 1)
            const progress = Math.min(Math.max(y / introHeight, 0), 1);
            setIntroProgress(progress);
            setScrollDepth(y * 0.8);
            setScrolled(y > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const floatingImages = [
        { src: '/about/iterativ arbeiten img/41.jpg', x: '10%', y: '15%', depth: 0, size: '400px' },
        { src: '/about/iterativ arbeiten img/11.jpg', x: '55%', y: '25%', depth: -300, size: '500px' },
        { src: '/about/iterativ arbeiten img/21.jpg', x: '25%', y: '50%', depth: -600, size: '350px' },
        { src: '/about/iterativ arbeiten img/31.jpg', x: '60%', y: '65%', depth: -900, size: '450px' },
        { src: '/about/iterativ arbeiten img/42.jpg', x: '15%', y: '85%', depth: -1200, size: '600px' },
    ];

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col selection:bg-orange-500 selection:text-white">
            <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50' : 'bg-transparent'}`}>
                <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />
            </div>

            {/* --- Fixed 3D Intro Container --- */}
            <div
                className="fixed inset-0 z-20 overflow-hidden transition-opacity duration-1000"
                style={{
                    opacity: 1 - Math.pow(introProgress, 2),
                    pointerEvents: introProgress > 0.95 ? 'none' : 'auto'
                }}
            >
                <div className="w-full h-full" style={{ perspective: '1000px' }}>
                    <div
                        className="relative w-full h-full preserve-3d transition-transform duration-500 ease-out"
                        style={{ transform: `translate3d(0, 0, ${scrollDepth}px)` }}
                    >
                        {/* Hero Text Layer */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6" style={{ transform: 'translateZ(350px)' }}>
                            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter leading-[0.8] mb-8">
                                Creation <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Reimagined.</span>
                            </h1>
                            <p className="max-w-md mx-auto text-base sm:text-lg text-zinc-500 font-medium">
                                Scroll down to dive into the architecture of your next big idea.
                            </p>
                        </div>

                        {floatingImages.map((img, i) => (
                            <FloatingImage key={i} {...img} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Spacer to allow scrolling through the intro */}
            <div className="h-[200vh] w-full relative z-0" />

            {/* --- Content Sections (Scrolling up from below) --- */}
            <main className="relative z-10 bg-white dark:bg-zinc-950">

                {/* Iterativ + Parallel */}
                <section className="py-32 overflow-visible">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
                        {/* Images on the left - edge to edge */}
                        <div className="w-full order-1 lg:order-1 pl-0">
                            <div className="sticky top-32 lg:top-40" style={{ perspective: '1200px' }}>
                                <CanvasMockup />
                            </div>
                        </div>
                        {/* Text on the right */}
                        <ScrollReveal delay={200}>
                            <div className="flex-1 max-w-2xl order-2 lg:order-2 min-h-[800px] flex flex-col justify-center px-6">
                                <h2 className="text-5xl sm:text-6xl lg:text-8xl xl:text-9xl font-bold tracking-tighter mb-8 leading-[0.8]">
                                    <span className="text-orange-500">Iterativ</span> <br />+ parallel arbeiten.
                                </h2>
                                <p className="text-xl sm:text-2xl text-zinc-500 leading-relaxed">
                                    Ganze Variantenreihen gleichzeitig generieren. Vergleichen, verwerfen, veredeln – in Echtzeit.
                                </p>
                            </div>
                        </ScrollReveal>
                    </div>
                </section>

                <div className="w-full h-px bg-zinc-100 dark:bg-zinc-900 mx-auto max-w-[1700px]" />

                {/* Präzise Steuerung */}
                <section className="py-32 bg-zinc-50/50 dark:bg-zinc-900/10 overflow-visible">
                    <div className="max-w-[1700px] mx-auto px-6">
                        {/* Text only - placeholder for future visual */}
                        <ScrollReveal delay={100}>
                            <div className="flex-1 max-w-2xl min-h-[600px] flex flex-col justify-center">
                                <h2 className="text-5xl sm:text-6xl lg:text-8xl xl:text-9xl font-bold tracking-tighter mb-8 leading-[0.85]">
                                    <span className="text-zinc-300 dark:text-zinc-700">Präzise</span> Steuerung.
                                </h2>
                                <p className="text-xl sm:text-2xl text-zinc-500 leading-relaxed">
                                    Variablen und Presets geben Ihnen die Kontrolle zurück. Strukturieren Sie Chaos in messbare Qualität.
                                </p>
                            </div>
                        </ScrollReveal>
                    </div>
                </section>

                <div className="w-full h-px bg-zinc-100 dark:bg-zinc-900 mx-auto max-w-[1700px]" />

                {/* Visual Prompting */}
                <section className="py-32 px-6">
                    <div className="max-w-[1700px] mx-auto flex flex-col items-center text-center">
                        <ScrollReveal>
                            <div className="max-w-4xl mb-24">
                                <h2 className="text-5xl sm:text-6xl lg:text-8xl xl:text-[10rem] font-bold tracking-tighter mb-8 leading-[0.9]">
                                    Visual <span className="text-orange-500">prompting.</span>
                                </h2>
                                <p className="text-xl sm:text-2xl text-zinc-500">
                                    Marker setzen statt Sätze hämmern. Sagen Sie der KI nicht nur was, sondern <span className="text-zinc-900 dark:text-white">genau wo</span> etwas passieren soll.
                                </p>
                            </div>
                        </ScrollReveal>
                        <ScrollReveal delay={200}>
                            <div className="w-full max-w-6xl aspect-video rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 relative group bg-zinc-900">
                                <img src="/about/iterativ arbeiten img/31.jpg" className="w-full h-full object-cover opacity-60 contrast-125 transition-transform duration-[3000ms] group-hover:scale-105" alt="" />
                                <div className="absolute top-[25%] left-[35%] p-4 rounded-full border-2 border-orange-500 bg-orange-500/20 backdrop-blur-md animate-pulse">
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono rounded whitespace-nowrap shadow-2xl">"Sessel austauschen"</div>
                                </div>
                                <div className="absolute bottom-[30%] right-[25%] p-4 rounded-full border-2 border-blue-500 bg-blue-500/20 backdrop-blur-md animate-pulse delay-700">
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono rounded whitespace-nowrap shadow-2xl">"Lichtquelle hinzufügen"</div>
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                </section>

                {/* Quote Section */}
                <section className="py-60 px-6 text-center bg-zinc-50 dark:bg-zinc-900/20">
                    <div className="max-w-5xl mx-auto">
                        <blockquote className="text-6xl lg:text-[7rem] font-medium tracking-tight italic mb-16 leading-[1.1] text-zinc-900 dark:text-white">
                            "Hinter jedem Bild steckt eine Geschichte, die darauf wartet, erzählt zu werden."
                        </blockquote>
                        <div className="text-sm font-mono tracking-[0.5em] uppercase text-zinc-400">— Michael Pzillas, Founder</div>
                    </div>
                </section>

                <GlobalFooter t={t} />
            </main>

            <style>{`
                .preserve-3d { transform-style: preserve-3d; }
                .perspective-1000 { perspective: 1000px; }
            `}</style>
        </div>
    );
};
