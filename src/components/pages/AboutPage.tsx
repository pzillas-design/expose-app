import React, { useEffect, useState, useRef } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Pen, Camera, X, Plus, ChevronDown } from 'lucide-react';
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
    const sizeVal = parseInt(size);

    return (
        <div
            className="absolute transition-all duration-700 ease-out hero-floating-image"
            style={{
                left: x,
                top: y,
                width: `calc(var(--base-vw, ${sizeVal}) * var(--mobile-scale, 1) * 1vw)`,
                transform: `translateZ(${depth}px) ${isHovered ? 'scale(1.05)' : 'scale(1)'}`,
                zIndex: Math.floor(depth) + 1000,
                // Cast to any to allow CSS variables in inline style object
                '--base-vw': sizeVal
            } as any}
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
        ['11.jpg', '12.jpg', '14.jpg', '13.jpg'],
        ['21.jpg', '22.jpg', '23.jpg', null],
        ['31.jpg', '32.jpg', null, null],
        ['41.jpg', '42.jpg', '43.jpg', '44.jpg']
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

const SidepanelMockup = ({
    activeSeason = 'Sommer',
    activeTime = 'Nachmittag',
    isPressed = false
}: {
    activeSeason?: string;
    activeTime?: string;
    isPressed?: boolean;
}) => {
    return (
        <div className="w-full max-w-[340px] bg-white dark:bg-zinc-900 border-y lg:border-x border-zinc-200 dark:border-zinc-800 flex flex-col pt-24 pb-8 h-screen overflow-hidden">
            {/* 0. Top Header / Tabs */}
            <div className="px-6 pb-6">
                <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
                    <div className="flex-1 py-1.5 text-center bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Prompt</span>
                    </div>
                    <div className="flex-1 py-1.5 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Pinsel</span>
                    </div>
                    <div className="flex-1 py-1.5 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Objekte</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col px-6 gap-5 overflow-y-auto no-scrollbar">
                {/* 1. Prompt Box */}
                <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Beschreibung</span>
                    <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Inszeniere das Bild neu indem du die Jahreszeit anpasst.
                            <span className="inline-block w-1.5 h-3.5 bg-orange-500 ml-1 animate-pulse align-middle" />
                        </p>
                    </div>
                </div>

                {/* 2. Jahreszeit Section: App-style Card */}
                <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900/50 shadow-sm p-5 gap-4 relative group">
                    <div className="flex flex-col gap-2.5">
                        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">Jahreszeit</span>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {['Sommer', 'Herbst', 'Winter', 'Frühling'].map(s => (
                                <div key={s} className={`px-3 py-1.5 text-[11px] rounded-md transition-all duration-500 ${activeSeason === s ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium shadow-md scale-[1.02]' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
                                    {s}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Uhrzeit Section: App-style Card */}
                <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900/50 shadow-sm p-5 gap-4 relative group">
                    <div className="flex flex-col gap-2.5">
                        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">Uhrzeit</span>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {['Mittag', 'Nachmittag', 'Morgen', 'Golden Hour', 'Blue Hour', 'Nacht'].map(t => (
                                <div key={t} className={`px-3 py-1.5 text-[11px] rounded-md transition-all duration-500 ${activeTime === t ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium shadow-md scale-[1.02]' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
                                    {t}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-4">
                    {/* Tools Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium border border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer group">
                            <Pen className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" /> Anmerkung
                        </div>
                        <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium border border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer group">
                            <Camera className="w-3.5 h-3.5 text-orange-500 group-hover:scale-110 transition-transform" /> Referenzbild
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className={`w-full h-12 rounded-lg bg-black dark:bg-white text-white dark:text-black font-bold text-[10px] flex items-center justify-center relative shadow-sm uppercase tracking-widest transition-all duration-200 ${isPressed ? 'scale-95 opacity-80 bg-zinc-800 dark:bg-zinc-200' : 'scale-100'}`}>
                        <span>Generieren</span>
                        <div className="absolute right-3 p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 transition-colors">
                            <TwoDotsVertical className="w-4 h-4 opacity-70" />
                        </div>
                    </div>
                </div>

                {/* 4. Vorlagen Section: Replicating SidebarAccordion */}
                <div className="flex flex-col border-t border-zinc-200 dark:border-zinc-800 mt-6 -mx-6">
                    <div className="h-14 flex items-center justify-between px-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/10 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-2">
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Vorlagen</span>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <div className="pb-4 space-y-0.5">
                        {['Staging', 'Cleanup', 'Modern Home', 'Saison & Uhrzeit'].map((lib, i) => (
                            <div key={lib} className="flex items-center justify-between py-2 px-6 pl-12 hover:bg-zinc-50 dark:hover:bg-zinc-800/10 group transition-colors cursor-pointer">
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors">{lib}</span>
                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-30 transition-opacity pr-2">
                                    <div className="w-1 h-1 bg-zinc-500 rounded-full" />
                                    <div className="w-1 h-1 bg-zinc-500 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const InteractiveSeasonPanel = ({ triggerRef }: { triggerRef: React.RefObject<HTMLElement> }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (!triggerRef.current) return;
            const rect = triggerRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            const startPoint = 0;
            const endPoint = -windowHeight * 1.5;
            const rawProgress = (startPoint - rect.top) / (startPoint - endPoint);
            setProgress(Math.min(Math.max(rawProgress, 0), 1));
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [triggerRef]);

    // Derived Animation States based on scroll progress
    const season = progress < 0.2 ? 'Sommer' : 'Winter';
    const time = progress < 0.4 ? 'Mittag' : 'Nachmittag';
    const isButtonPressed = progress >= 0.6 && progress < 0.7;
    // Image transition starts after the button "click"
    const imageOpacity = progress < 0.75 ? 0 : (progress - 0.75) / 0.25;

    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col lg:flex-row items-center w-full gap-0 overflow-visible">
                {/* 1. Visual: Image on the Left, docked */}
                <div className="relative flex-1 h-[50vh] lg:h-screen bg-zinc-100 dark:bg-zinc-950 lg:rounded-l-3xl overflow-hidden border-y lg:border-l border-zinc-200 dark:border-zinc-800">
                    <img
                        src="/about/3-vorlagen/small/edit_sommer.jpg"
                        className="absolute inset-0 w-full h-full object-cover"
                        alt="Sommer"
                    />
                    <img
                        src="/about/3-vorlagen/small/edit_winter.jpg"
                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                        style={{ opacity: imageOpacity }}
                        alt="Winter"
                    />

                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20 z-20">
                        <div
                            className="h-full bg-orange-500 transition-all duration-300 ease-out"
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                </div>

                {/* 2. Control: Sidepanel in the MIDDLE */}
                <div className="shrink-0 flex-col hidden lg:flex z-10">
                    <SidepanelMockup
                        activeSeason={season}
                        activeTime={time}
                        isPressed={isButtonPressed}
                    />
                </div>

                {/* 3. Text: Headline and Subline on the RIGHT */}
                <div className="flex-1 lg:pl-32 xl:pl-48">
                    <ScrollReveal delay={100}>
                        <div className="flex flex-col text-left max-w-xl">
                            <h2 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tighter mb-8 leading-[0.85]">
                                Vorlagen <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">nutzen & anlegen.</span>
                            </h2>
                            <p className="text-xl sm:text-2xl text-zinc-500 leading-relaxed">
                                Definieren Sie Ihren Stil einmal und nutzen Sie ihn immer wieder.
                            </p>
                        </div>
                    </ScrollReveal>
                </div>
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

// --- Main Page Component ---

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [scrolled, setScrolled] = useState(false);
    const section1Ref = useRef<HTMLElement>(null);
    const section3Ref = useRef<HTMLElement>(null);
    const heroLayerRef = useRef<HTMLDivElement>(null);
    const heroContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            const y = window.scrollY;
            const introHeight = window.innerHeight * 2.0;
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
                // Sharp fade in last 10%
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
        { src: '/about/2-iterativ-parallel/41.jpg', x: '-15%', y: '85%', depth: -300, size: '35vw' },
        { src: '/about/2-iterativ-parallel/11.jpg', x: '80%', y: '5%', depth: -500, size: '44vw' },
        { src: '/about/2-iterativ-parallel/21.jpg', x: '45%', y: '95%', depth: -150, size: '17vw' },
        { src: '/about/2-iterativ-parallel/31.jpg', x: '-15%', y: '0%', depth: -950, size: '48vw' },
        { src: '/about/2-iterativ-parallel/42.jpg', x: '90%', y: '85%', depth: -400, size: '32vw' },
        { src: '/about/2-iterativ-parallel/12.jpg', x: '75%', y: '50%', depth: -800, size: '29vw' },
        { src: '/about/2-iterativ-parallel/22.jpg', x: '35%', y: '-5%', depth: -600, size: '25vw' },
        { src: '/about/2-iterativ-parallel/32.jpg', x: '10%', y: '80%', depth: -1200, size: '23vw' },
    ];

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col selection:bg-orange-500 selection:text-white">
            <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50' : 'bg-transparent'}`}>
                <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />
            </div>

            {/* --- Section 1: Hero (Fixed 3D Intro) --- */}
            <div
                ref={heroContainerRef}
                className="fixed inset-0 z-20 overflow-hidden transition-opacity duration-1000 will-change-opacity"
            >
                <style>{`
                    @media (max-width: 768px) {
                        .hero-floating-image {
                            --mobile-scale: 1.5;
                            max-width: 95vw;
                        }
                        .hero-headline-container {
                            width: 85% !important;
                        }
                        .hero-headline {
                            font-size: clamp(3.5rem, 12vw, 8.5rem) !important;
                        }
                    }
                `}</style>
                <div className="w-full h-full" style={{ perspective: '1000px' }}>
                    <div
                        ref={heroLayerRef}
                        className="relative w-full h-full preserve-3d transition-transform duration-500 ease-out will-change-transform"
                    >
                        {/* Hero Text Layer */}
                        <div
                            className="absolute inset-0 flex flex-col items-center justify-center text-center p-6"
                            style={{
                                transform: 'translate3d(0, 0, 150px)',
                                backfaceVisibility: 'hidden',
                                WebkitFontSmoothing: 'antialiased'
                            }}
                        >
                            <div className="w-[66%] mt-[-2vh] hero-headline-container">
                                <h1
                                    className="font-bold tracking-tighter leading-[0.85] antialiased hero-headline"
                                    style={{
                                        fontSize: 'clamp(2.5rem, 8vw, 8.5rem)',
                                        WebkitBackfaceVisibility: 'hidden',
                                        transform: 'translate3d(0, 0, 0)'
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
            <div className="h-[200vh] w-full relative z-0" />

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
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Parallel & iterativ</span> arbeiten.
                                    </h2>
                                    <p className="text-xl sm:text-2xl text-zinc-500 leading-relaxed">
                                        Ganze Bildstrecken gleichzeitig generieren, vergleichen und perfektionieren.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="w-full h-px bg-zinc-100 dark:bg-zinc-900 mx-auto max-w-[1700px]" />

                {/* Section 3: Vorlagen nutzen und anlegen */}
                <section ref={section3Ref} className="relative h-[300vh] bg-zinc-50/30 dark:bg-zinc-900/10">
                    <div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center">
                        <div className="w-full mx-auto overflow-visible">
                            <InteractiveSeasonPanel triggerRef={section3Ref} />
                        </div>
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
        </div >
    );
};
