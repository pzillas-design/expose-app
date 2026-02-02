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
                    className="w-full h-full transition-all duration-500 rounded-sm"
                    alt="Canvas Element"
                />
                <div className={`absolute -inset-4 bg-orange-500/10 blur-xl rounded-full transition-opacity duration-500 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
            </div>
        </div>
    );
};

// --- Mockup Components ---

const CanvasMockup = ({ triggerRef }: { triggerRef: React.RefObject<HTMLElement> }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        let rafId: number;

        const handleScroll = () => {
            if (!containerRef.current || !triggerRef?.current) return;

            // Use requestAnimationFrame for smooth updates
            rafId = requestAnimationFrame(() => {
                if (!containerRef.current || !triggerRef.current) return;

                const rect = triggerRef.current.getBoundingClientRect();
                const windowHeight = window.innerHeight;

                // Scroll progress relative to the trigger section
                // Start anim: when section top is at 0 (sticky start)
                // End anim: when section top is at -windowHeight (scrolled 1 screen height)
                // Animation Timing Tuning:
                // Reduced buffer to 10% to minimize "Empty run" / Leerlauf.
                const startPoint = -windowHeight * 0.1;
                const endPoint = -windowHeight * 1.1;

                // Calculate progress
                const rawProgress = (startPoint - rect.top) / (startPoint - endPoint);
                const progress = Math.min(Math.max(rawProgress, 0), 1);

                // Apply transforms directly to DOM nodes
                imageRefs.current.forEach((imgRef, index) => {
                    if (!imgRef) return;

                    // Simple index based logic
                    // Wave logic: center triggers first, ripples outward
                    const delay = Math.abs(index - 6) * 0.05;
                    const zIndex = index;
                    const zOffsets = [
                        150, 200, 125, 175, 140, 190, 160, 170, 130, 145, 185, 155, 165
                    ];
                    const zOffset = zOffsets[zIndex] || 0;

                    // Staggered progress
                    const delayedProgress = Math.min(Math.max(progress - delay, 0), 1);

                    // Normalize
                    const normalizedProgress = progress > delay
                        ? Math.min((progress - delay) / (1 - delay - 0.1), 1)
                        : 0;

                    // Interpolate values
                    // Unified opacity tied to progress
                    const opacity = Math.min(normalizedProgress * 1.5, 1);

                    // Unified zoom from center (fly-through effect)
                    // Start: large positive Z (closer/zoom out) -> "von vorne"
                    // End: 0 (flat on plane)
                    // 400px start gives a nice "fly in" feel
                    const currentZ = 400 - (normalizedProgress * 400);

                    // Apply styles directly
                    // Added transition to mimic the "Hero" smoothness (interpolation)
                    imgRef.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s linear';
                    imgRef.style.opacity = opacity.toString();
                    imgRef.style.transform = `translateZ(${currentZ}px)`;
                });
            });
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial calculation

        return () => {
            window.removeEventListener('scroll', handleScroll);
            cancelAnimationFrame(rafId);
        };
    }, [triggerRef]);

    // Irregular grid: 4-3-2-4 rows with dummy placeholders to make all rows equal (4 items)
    const imageRows = [
        ['41.jpg', '42.jpg', '43.jpg', '44.jpg'],
        ['11.jpg', '12.jpg', '13.jpg', null], // 1 dummy
        ['21.jpg', '22.jpg', null, null],      // 2 dummies
        ['31.jpg', '32.jpg', '14.jpg', '23.jpg']
    ];

    let flatIndex = 0;

    return (
        <div
            ref={containerRef}
            className="w-full flex flex-col gap-4 sm:gap-6 lg:gap-8"
            style={{ transformStyle: 'preserve-3d' }}
        >
            {imageRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2 sm:gap-3 lg:gap-4 justify-start" style={{ transformStyle: 'preserve-3d' }}>
                    {row.map((img, imgIndex) => {
                        const currentIndex = flatIndex++;

                        // Skip rendering for dummy placeholders (null)
                        if (img === null) {
                            return <div key={`dummy-${rowIndex}-${imgIndex}`} className="flex-1 basis-0 min-w-0" />;
                        }

                        return (
                            <div
                                key={img}
                                ref={el => { imageRefs.current[currentIndex] = el; }}
                                className="relative overflow-hidden flex-1 basis-0 min-w-0"
                                style={{
                                    transformStyle: 'preserve-3d',
                                    willChange: 'transform, opacity', // Optimization hint
                                    opacity: 0, // Start invisible
                                    transform: 'translateZ(200px)' // Start state
                                }}
                            >
                                {/* Image container - NO border radius, NO hover effects */}
                                <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                                    <img
                                        src={`/about/2-iterativ-parallel/${img}`}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        alt=""
                                    />
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
    const [scrolled, setScrolled] = useState(false);
    const section1Ref = useRef<HTMLElement>(null);
    const heroLayerRef = useRef<HTMLDivElement>(null);
    const heroContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            const y = window.scrollY;
            const introHeight = window.innerHeight * 1.5;
            const progress = Math.min(Math.max(y / introHeight, 0), 1);

            // Apply scrolled state for navbar
            if (y > 50 !== scrolled) {
                setScrolled(y > 50);
            }

            // Direct DOM manipulation for performance
            if (heroLayerRef.current) {
                const scrollDepth = y * 0.8;
                heroLayerRef.current.style.transform = `translate3d(0, 0, ${scrollDepth}px)`;
            }

            if (heroContainerRef.current) {
                const opacity = progress > 0.9 ? (1 - progress) * 10 : 1;
                heroContainerRef.current.style.opacity = opacity.toString();
                heroContainerRef.current.style.pointerEvents = progress > 0.95 ? 'none' : 'auto';
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [scrolled]);

    const floatingImages = [
        { src: '/about/2-iterativ-parallel/41.jpg', x: '10%', y: '5%', depth: -500, size: '25vw' },
        { src: '/about/2-iterativ-parallel/11.jpg', x: '85%', y: '20%', depth: -850, size: '32vw' },
        { src: '/about/2-iterativ-parallel/21.jpg', x: '90%', y: '80%', depth: -350, size: '10vw' },
        { src: '/about/2-iterativ-parallel/31.jpg', x: '-25%', y: '85%', depth: -1100, size: '35vw' },
        { src: '/about/2-iterativ-parallel/42.jpg', x: '35%', y: '10%', depth: -650, size: '24vw' },
        { src: '/about/2-iterativ-parallel/12.jpg', x: '70%', y: '90%', depth: -1000, size: '20vw' },
        { src: '/about/2-iterativ-parallel/22.jpg', x: '-45%', y: '30%', depth: -1100, size: '18vw' },
    ];

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col selection:bg-orange-500 selection:text-white">
            <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50' : 'bg-transparent'}`}>
                <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />
            </div>

            {/* --- Section 1: Hero (Fixed 3D Intro) --- */}
            <div
                ref={heroContainerRef}
                className="fixed inset-0 z-20 overflow-hidden will-change-opacity"
            >
                <div className="w-full h-full" style={{ perspective: '1000px', WebkitPerspective: '1000px' }}>
                    <div
                        ref={heroLayerRef}
                        className="relative w-full h-full preserve-3d will-change-transform"
                    >
                        {/* Hero Text Layer */}
                        <div
                            className="absolute inset-0 flex flex-col items-center justify-center text-center p-6"
                            style={{
                                transform: 'translate3d(0, 0, 1px)', // Stay at 1:1 scale for maximum sharpness
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                WebkitFontSmoothing: 'subpixel-antialiased'
                            }}
                        >
                            <div className="w-[66%]">
                                <h1
                                    className="font-bold tracking-tighter leading-[0.8] antialiased"
                                    style={{
                                        fontSize: 'clamp(2.5rem, 8vw, 8.5rem)',
                                        transform: 'translate3d(0, 0, 0)',
                                        textRendering: 'optimizeLegibility'
                                    }}
                                >
                                    Creation <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Reimagined.</span>
                                </h1>
                            </div>
                        </div>

                        {floatingImages.map((img, i) => (
                            <FloatingImage key={i} {...img} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Spacer to allow scrolling through the intro */}
            <div className="h-[150vh] w-full relative z-0" />

            {/* --- Content Sections (Scrolling up from below) --- */}
            <main className="relative z-10 bg-white dark:bg-zinc-950">
                {/* Section 2: Iterativ + Parallel - Cinematic Scroll Sequence */}
                <section ref={section1Ref} className="relative h-[300vh]">
                    <div className="sticky top-0 h-screen overflow-hidden">
                        <div className="w-full h-full flex flex-col lg:flex-row">
                            {/* Left: Image Cluster */}
                            <div className="w-full lg:w-3/5 h-1/2 lg:h-full flex items-center justify-start px-6 lg:pl-0 lg:pr-6 pointer-events-none overflow-visible">
                                <style>{`
                                    #desktop-cluster-container { 
                                        width: 100%; 
                                        min-width: 100%;
                                    }
                                    @media (min-width: 1024px) {
                                        #desktop-cluster-container { 
                                            width: 125% !important; 
                                            min-width: 125% !important; 
                                        }
                                    }
                                `}</style>
                                <div
                                    id="desktop-cluster-container"
                                    style={{
                                        perspective: '1200px',
                                        perspectiveOrigin: 'center center'
                                    }}
                                >
                                    <CanvasMockup triggerRef={section1Ref} />
                                </div>
                            </div>

                            {/* Right: Text */}
                            <div className="w-full lg:w-2/5 h-1/2 lg:h-full flex items-center justify-center px-6 lg:px-12 xl:px-24 pt-12 lg:pt-0 relative z-10">
                                <div className="flex flex-col justify-center max-w-2xl">
                                    <h2 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tighter mb-8 leading-[0.8]">
                                        <span className="text-orange-500">Iterativ</span> + parallel arbeiten.
                                    </h2>
                                    <p className="text-xl sm:text-2xl text-zinc-500 leading-relaxed">
                                        Ganze Variantenreihen gleichzeitig generieren. Vergleichen, verwerfen, veredeln – in Echtzeit.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="w-full h-px bg-zinc-100 dark:bg-zinc-900 mx-auto max-w-[1700px]" />

                {/* Section 3: Präzise Steuerung */}
                <section className="py-32 bg-zinc-50/50 dark:bg-zinc-900/10 overflow-visible">
                    <div className="max-w-[1700px] mx-auto px-6">
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

                {/* Section 4: Visual Prompting */}
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

                {/* Section 5: Quote */}
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
