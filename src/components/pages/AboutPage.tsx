import React, { useEffect, useState, useRef } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Pen, Camera, X, Plus, ChevronDown } from 'lucide-react';
import { TwoDotsVertical } from '@/components/ui/CustomIcons';
import { Theme, Typo, Button } from '@/components/ui/DesignSystem';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    onSignIn?: () => void;
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
                // Start exactly when the section hits the top (sticky start)
                // End when section travel ends (rect.height - windowHeight)
                const startPoint = 0;
                // For a 250vh section, total travel is 150vh
                const endPoint = -windowHeight * 1.5;

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
    activeSeason,
    activeTime,
    buttonScale = 1,
    seasonScale = 1,
    timeScale = 1,
    activeSection,
    isSeasonPressed,
    isTimePressed,
    generationProgress = 0,
    isGenerating = false,
}: {
    activeSeason?: string;
    activeTime?: string;
    buttonScale?: number;
    seasonScale?: number;
    timeScale?: number;
    activeSection?: 'prompt' | 'season' | 'time' | 'generate';
    isSeasonPressed?: boolean;
    isTimePressed?: boolean;
    generationProgress?: number;
    isGenerating?: boolean;
}) => {
    const highlightClass = "border-zinc-400 dark:border-zinc-600";

    return (
        <div className="flex flex-col h-full overflow-hidden px-6 pt-6 pb-4">
            <div className="flex-none flex flex-col gap-5">
                {/* 1. Prompt Box */}
                <div className="flex flex-col gap-3">
                    <div className={`p-4 rounded-lg bg-transparent border transition-all duration-300 ${activeSection === 'prompt' ? highlightClass : 'border-zinc-200 dark:border-zinc-800'}`}>
                        <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Inszeniere das Bild neu indem du die Jahreszeit anpasst
                            <span className="inline-block w-[1.5px] h-[14px] bg-zinc-900 dark:bg-zinc-100 ml-0.5 align-middle -translate-y-[1px] mockup-cursor" />
                        </p>
                    </div>
                </div>

                {/* 2. Jahreszeit Section */}
                <div className={`flex flex-col border rounded-lg bg-transparent p-5 gap-4 group transition-all duration-300 ${activeSection === 'season' ? highlightClass : 'border-zinc-200 dark:border-zinc-800'}`}>
                    <div className="flex flex-col gap-2.5">
                        <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">Jahreszeit</span>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {['Frühling', 'Sommer', 'Winter'].map(s => (
                                <div
                                    key={s}
                                    className={`px-4 py-2.5 text-xs rounded-md transition-all duration-150 flex items-center justify-center leading-none font-medium ${activeSeason === s ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md' : isSeasonPressed && s === 'Winter' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                    style={{ transform: (s === 'Winter' || activeSeason === s) ? `scale(${seasonScale})` : 'scale(1)' }}
                                >
                                    {s}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Uhrzeit Section */}
                <div className={`flex flex-col border rounded-lg bg-transparent p-5 gap-4 group transition-all duration-300 ${activeSection === 'time' ? highlightClass : 'border-zinc-200 dark:border-zinc-800'}`}>
                    <div className="flex flex-col gap-2.5">
                        <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">Uhrzeit</span>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {['Morgen', 'Mittag', 'Nachmittag', 'Golden Hour', 'Blue Hour'].map(t => (
                                <div
                                    key={t}
                                    className={`px-4 py-2.5 text-xs rounded-md transition-all duration-150 flex items-center justify-center leading-none font-medium ${activeTime === t ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md' : isTimePressed && t === 'Golden Hour' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                    style={{ transform: (t === 'Golden Hour' || activeTime === t) ? `scale(${timeScale})` : 'scale(1)' }}
                                >
                                    {t}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Generate Button Block (Now fixed in position relative to top) */}
                <div className="flex flex-col gap-4">
                    <div className="hidden lg:grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium border border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer group">
                            <Pen className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" /> Anmerkung
                        </div>
                        <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium border border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer group">
                            <Camera className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" /> Referenzbild
                        </div>
                    </div>

                    <div
                        className={`w-full h-12 rounded-lg font-bold text-[11px] flex items-center justify-center relative uppercase tracking-widest transition-all duration-150 transform-gpu bg-black dark:bg-white text-white dark:text-black overflow-hidden`}
                        style={{ transform: `scale(${buttonScale})` }}
                    >
                        <span>Generieren</span>
                        <div className="absolute right-3 p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 transition-colors">
                            <TwoDotsVertical className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>

            {/* DYNAMIC SPACE: Grows as viewport height increases */}
            <div className="flex-1 min-h-[20px]" />

            {/* 4. Vorlagen Section (Docks to bottom or gets cut off) */}
            <div className="hidden lg:flex flex-none flex-col border-t border-zinc-200 dark:border-zinc-800 -mx-6">
                <div className="h-14 flex items-center justify-between px-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/10 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-2">
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Vorlagen</span>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <div className="pt-0.5 pb-0 space-y-1.5">
                    {['Home Staging', 'Cleanup', 'Jahreszeit'].map((lib, i) => (
                        <div key={lib} className="flex items-center justify-between py-2 px-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/10 group transition-colors cursor-pointer">
                            <span className="text-[13px] text-zinc-500 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors">{lib}</span>
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-30 transition-opacity pr-2">
                                <div className="w-1 h-1 bg-zinc-500 rounded-full" />
                                <div className="w-1 h-1 bg-zinc-500 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

interface Section3MockupUIProps {
    season?: string;
    time?: string;
    buttonScale: number;
    seasonScale: number;
    timeScale: number;
    generationProgress: number;
    isGenerating: boolean;
    isFinished: boolean;
    progress: number;
    activeSection?: 'prompt' | 'season' | 'time' | 'generate';
    isSeasonPressed: boolean;
    isTimePressed: boolean;
    isButtonPressed: boolean;
    mockupRef?: React.RefObject<HTMLDivElement>;
    textRef?: React.RefObject<HTMLDivElement>;
}

const Section3MockupUI = ({
    season,
    time,
    buttonScale,
    seasonScale,
    timeScale,
    generationProgress,
    isGenerating,
    isFinished,
    progress,
    activeSection,
    isSeasonPressed,
    isTimePressed,
    isButtonPressed,
    mockupRef,
    textRef
}: Section3MockupUIProps) => {
    // Determine Cursor Position based on progress stages
    const getCursorPos = () => {
        if (progress < 0.06) return { top: '100px', left: '100px' }; // Prompt
        if (progress < 0.14) return { top: '300px', left: '200px' }; // Season (Winter)
        if (progress < 0.22) return { top: '480px', left: '280px' }; // Time (Golden Hour)
        return { top: '650px', left: '175px' }; // Generate
    };

    const cursorPos = getCursorPos();
    return (
        <div className="w-full flex items-center justify-center" style={{ height: '80vh', minHeight: '80vh' }}>
            <div className="max-w-[1700px] mx-auto w-full h-full flex items-stretch px-8 lg:px-12 2xl:px-16 relative">
                {/* 1. Left Column: Text (Ends at screen center) */}
                <div className="flex-1 flex items-center lg:pr-[175px] z-20">
                    <ScrollReveal delay={100}>
                        <div ref={textRef} className="flex flex-col text-left max-w-xl will-change-transform">
                            <h2 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tighter mb-8 leading-[0.85]">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Vorlagen</span> <br />
                                nutzen & anlegen.
                            </h2>
                            <p className="text-xl sm:text-2xl text-zinc-500 leading-relaxed font-light">
                                Definieren Sie Ihren Stil und nutzen Sie ihn immer wieder für konsistente Ergebnisse.
                            </p>
                        </div>
                    </ScrollReveal>
                </div>

                {/* 2. Right Column Area: Contains the absolute 'breaking' Mockup Unit */}
                <div className="flex-1 relative">
                    <div
                        ref={mockupRef}
                        className="absolute top-0 bottom-0 flex items-stretch bg-white dark:bg-zinc-900 rounded-tl-[12px] rounded-bl-[12px] border border-zinc-200 dark:border-zinc-800 overflow-hidden z-10 pointer-events-none will-change-transform will-change-opacity"
                        style={{
                            left: '-175px',
                            right: '-100vw'
                        }}
                    >
                        {/* 0. Top Progress Bar (Global for whole box, constrained to viewport) */}
                        <div
                            className={`absolute top-0 left-0 h-[3px] z-[60] transition-opacity duration-300 ${isGenerating ? 'opacity-100' : 'opacity-0'}`}
                            style={{ width: 'calc(50vw + 175px)' }}
                        >
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-300 ease-out"
                                style={{ width: `${generationProgress * 100}%` }}
                            />
                        </div>
                        {/* A. Middle: Sidepanel (Fixed width) */}
                        <div
                            className="hidden lg:flex flex-none border-r border-zinc-200 dark:border-zinc-800 flex-col overflow-hidden bg-white dark:bg-zinc-900/50"
                            style={{ width: '350px' }}
                        >
                            <SidepanelMockup
                                activeSeason={season}
                                activeTime={time}
                                buttonScale={buttonScale}
                                seasonScale={seasonScale}
                                timeScale={timeScale}
                                activeSection={activeSection}
                                isSeasonPressed={isSeasonPressed}
                                isTimePressed={isTimePressed}
                                generationProgress={generationProgress}
                                isGenerating={isGenerating}
                            />
                        </div>

                        {/* B. Right: Visual Animation Area (Fills remaining space) */}
                        <div className="relative flex-none bg-zinc-50 dark:bg-zinc-950 overflow-hidden" style={{ width: 'calc(100vw / 2 - 175px)' }}>
                            {/* Sommer Image (Original) */}
                            <img
                                src="/about/3-vorlagen/small/edit_sommer.jpg"
                                className={`absolute inset-0 w-full h-full object-cover ${isFinished ? 'opacity-0' : 'opacity-100'}`}
                                alt="Sommer Scene"
                            />

                            {/* Winter Image (Result) */}
                            <img
                                src="/about/3-vorlagen/small/edit_winter.jpg"
                                className={`absolute inset-0 w-full h-full object-cover ${isFinished ? 'opacity-100' : 'opacity-0'}`}
                                alt="Winter Scene Result"
                            />

                            {/* Removed old generation overlay */}

                            {/* Edge Shadow */}
                            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black/5 to-transparent pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InteractiveSeasonPanel = ({ triggerRef, mockupRef, textRef }: { triggerRef: React.RefObject<HTMLElement>, mockupRef: React.RefObject<HTMLDivElement>, textRef: React.RefObject<HTMLDivElement> }) => {
    const [progress, setProgress] = useState(0);
    const [autoProgress, setAutoProgress] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    const [isSeasonStepPressed, setIsSeasonStepPressed] = useState(false);
    const [isTimeStepPressed, setIsTimeStepPressed] = useState(false);
    const [isButtonStepPressed, setIsButtonStepPressed] = useState(false);

    const [seasonState, setSeasonState] = useState<string | undefined>(undefined);
    const [timeState, setTimeState] = useState<string | undefined>(undefined);

    const hasTriggeredSeason = useRef(false);
    const hasTriggeredTime = useRef(false);
    const hasTriggeredGenerate = useRef(false);

    useEffect(() => {
        const handleScroll = () => {
            if (!triggerRef.current) return;
            const rect = triggerRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Travel distance is total section height minus what's visible (100vh sticky)
            const travelDistance = rect.height - windowHeight;
            const rawProgress = -rect.top / travelDistance;

            setProgress(Math.min(Math.max(rawProgress, 0), 1));
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [triggerRef]);

    // Unified Interaction Logic (Single Event Triggers)
    useEffect(() => {
        // 1. Reset Logic
        if (progress < 0.05) {
            hasTriggeredSeason.current = false;
            hasTriggeredTime.current = false;
            hasTriggeredGenerate.current = false;
            setSeasonState(undefined);
            setTimeState(undefined);
            setAutoProgress(0);
            setIsFinished(false);
            setIsSeasonStepPressed(false);
            setIsTimeStepPressed(false);
            setIsButtonStepPressed(false);
            return;
        }

        // Individual Step Resets (for scrolling back)
        if (progress < 0.14 && hasTriggeredTime.current) {
            hasTriggeredTime.current = false;
            setTimeState(undefined);
            setIsTimeStepPressed(false);
        }
        if (progress < 0.22 && hasTriggeredGenerate.current) {
            hasTriggeredGenerate.current = false;
            setAutoProgress(0);
            setIsFinished(false);
            setIsButtonStepPressed(false);
        }

        // 2. Winter Click (Threshold: 0.08)
        if (progress >= 0.08 && !hasTriggeredSeason.current) {
            hasTriggeredSeason.current = true;
            setIsSeasonStepPressed(true);
            setTimeout(() => {
                setIsSeasonStepPressed(false);
                setSeasonState('Winter');
            }, 150);
        }

        // 3. Golden Hour Click (Threshold: 0.16)
        if (progress >= 0.16 && !hasTriggeredTime.current) {
            hasTriggeredTime.current = true;
            setIsTimeStepPressed(true);
            setTimeout(() => {
                setIsTimeStepPressed(false);
                setTimeState('Golden Hour');
            }, 150);
        }

        // 4. Generate & Progress Click (Threshold: 0.24)
        if (progress >= 0.24 && !hasTriggeredGenerate.current) {
            hasTriggeredGenerate.current = true;
            setIsButtonStepPressed(true);

            setTimeout(() => {
                setIsButtonStepPressed(false);

                // Start the automatic progress animation immediately after snap-out
                let startTime: number | null = null;
                const duration = 1250;

                const animate = (timestamp: number) => {
                    if (!startTime) startTime = timestamp;
                    const elapsed = timestamp - startTime;
                    const linearProgress = Math.min(elapsed / duration, 1);
                    const easedProgress = Math.pow(linearProgress, 2.0);

                    setAutoProgress(easedProgress);

                    if (linearProgress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        setIsFinished(true);
                    }
                };
                requestAnimationFrame(animate);
            }, 150);
        }
    }, [progress]);

    // DERIVED ANIMATION STATES (Consolidated)
    const isSeasonPressed = isSeasonStepPressed;
    const season = seasonState;
    const seasonScale = isSeasonPressed ? 0.90 : 1;

    const isTimePressed = isTimeStepPressed;
    const time = timeState;
    const timeScale = isTimePressed ? 0.90 : 1;

    const isButtonPressed = isButtonStepPressed;
    const buttonScale = isButtonPressed ? 0.95 : 1;

    const isFinishedCalculated = isFinished && progress >= 0.24;
    const isGenerating = autoProgress > 0 && !isFinishedCalculated && progress >= 0.24;

    const generationProgress = autoProgress;

    // Derived Highlight States (Simplified)
    const activeSection = progress < 0.05 ? 'prompt' :
        progress < 0.13 ? 'season' :
            progress < 0.21 ? 'time' :
                'generate';

    return (
        <Section3MockupUI
            season={season}
            time={time}
            buttonScale={buttonScale}
            seasonScale={seasonScale}
            timeScale={timeScale}
            generationProgress={generationProgress}
            isGenerating={isGenerating}
            isFinished={isFinishedCalculated}
            progress={progress}
            activeSection={activeSection}
            isSeasonPressed={isSeasonPressed}
            isTimePressed={isTimePressed}
            isButtonPressed={isButtonPressed}
            mockupRef={mockupRef}
            textRef={textRef}
        />
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

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, onSignIn, t }) => {
    const section1Ref = useRef<HTMLElement>(null);
    const section3Ref = useRef<HTMLElement>(null);
    const heroLayerRef = useRef<HTMLDivElement>(null);
    const heroContainerRef = useRef<HTMLDivElement>(null);
    const section2StickyRef = useRef<HTMLDivElement>(null);
    const section2ClusterRef = useRef<HTMLDivElement>(null);
    const section3MockupRef = useRef<HTMLDivElement>(null);
    const section2TextRef = useRef<HTMLDivElement>(null);
    const section3TextRef = useRef<HTMLDivElement>(null);
    const section4Ref = useRef<HTMLElement>(null);
    const section4ContentRef = useRef<HTMLDivElement>(null);
    const section4BackgroundRef = useRef<HTMLDivElement>(null);
    const section4Image1Ref = useRef<HTMLImageElement>(null);
    const section4Image2Ref = useRef<HTMLImageElement>(null);
    const section4ProgressRef = useRef<HTMLDivElement>(null);
    const section4LabelsRef = useRef<HTMLDivElement>(null);
    const section4LampRef = useRef<SVGSVGElement>(null);
    const section4LampPath1Ref = useRef<SVGPathElement>(null);
    const section4LampPath2Ref = useRef<SVGPathElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            const y = window.scrollY;
            const introHeight = window.innerHeight * 2.0;
            const progress = Math.min(Math.max(y / introHeight, 0), 1);

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

            // Section 2 Fade Out (Cluster only - text stays)
            if (section1Ref.current && section2ClusterRef.current) {
                const rect = section1Ref.current.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const travelDistance = rect.height - windowHeight;
                const progressS2 = Math.min(Math.max(-rect.top / travelDistance, 0), 1);

                // Fade out cluster vertically and opacity at the very end
                if (progressS2 > 0.85) {
                    const fadeProgress = (progressS2 - 0.85) / 0.15;
                    const fadeOpacity = Math.max(0, 1 - fadeProgress);
                    section2ClusterRef.current.style.opacity = fadeOpacity.toString();
                    // Additional slight upward movement for the cluster while fading
                    section2ClusterRef.current.style.transform = `translate3d(0, -${fadeProgress * 100}px, 0)`;
                } else {
                    section2ClusterRef.current.style.opacity = '1';
                    section2ClusterRef.current.style.transform = 'translate3d(0, 0, 0)';
                }

                // Parallax Text Movement (Only for Section 2)
                if (section2TextRef.current) {
                    const translateY = (0.5 - progressS2) * 900;
                    section2TextRef.current.style.transform = `translate3d(0, ${translateY}px, 0)`;
                }
            }

            // Section 3 Fade In & Parallax (Coupled with physical entry)
            if (section3Ref.current && section3MockupRef.current) {
                const rect = section3Ref.current.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const travelDistance = rect.height - windowHeight;
                const progressS3 = Math.min(Math.max(-rect.top / travelDistance, 0), 1);

                // 1. Mockup Fade in (Triggered immediately as it enters)
                const mockupFadeEnd = 0.08;   // Fully visible after 8% scroll

                const fadeOpacity = progressS3 < mockupFadeEnd
                    ? Math.min(1, progressS3 / mockupFadeEnd)
                    : 1;

                section3MockupRef.current.style.opacity = fadeOpacity.toString();

                // 2. Unified Scroll-out (Once text reaches top of mockup)
                // Interaction phase ends around 0.50 progress for a 500vh section
                const scrollOutStart = 0.5;
                const scrollY = progressS3 > scrollOutStart
                    ? (progressS3 - scrollOutStart) * -windowHeight * 2.1
                    : 0;

                section3MockupRef.current.style.transform = `translate3d(0, ${scrollY}px, 0)`;

                if (section3TextRef.current) {
                    // Parallax text entrance + Unified scroll-out
                    const parallaxY = (0.15 - progressS3) * 1500;
                    section3TextRef.current.style.transform = `translate3d(0, ${parallaxY + scrollY}px, 0)`;
                }
            }

            // Section 4 Full-Page Sticky Animation (Multi-Phase)
            if (section4Ref.current && section4BackgroundRef.current && section4ContentRef.current) {
                const rect = section4Ref.current.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const travelDistance = rect.height - windowHeight;
                const progressS4 = Math.min(Math.max(-rect.top / travelDistance, 0), 1);

                // 1. Text Reveal (0.0 - 0.15)
                const typoOpacity = progressS4 < 0.15 ? progressS4 / 0.15 : 1;
                section4ContentRef.current.style.opacity = typoOpacity.toString();

                // 2. Progressive Content Appearance (0.15 - 0.75)
                if (section4LabelsRef.current) {
                    const container = section4LabelsRef.current.children[0] as HTMLElement;
                    if (container) {
                        const children = container.children;
                        // Sequence: Küche (0), Esstisch (1), Sofa (2), Lamp (3)

                        for (let i = 0; i < children.length; i++) {
                            const child = children[i] as HTMLElement;
                            const startTrigger = 0.15 + (i * 0.12);
                            const endTrigger = startTrigger + 0.1;
                            const progress = Math.min(Math.max((progressS4 - startTrigger) / (endTrigger - startTrigger), 0), 1);

                            if (child === section4LampRef.current) {
                                // Special handling for Lamp SVG drawing (Last in sequence)
                                child.style.opacity = progress.toString();
                                if (section4LampPath1Ref.current && section4LampPath2Ref.current) {
                                    const length1 = 220;
                                    const length2 = 800;

                                    // Sequential Drawing: Path 1 (Stick) then Path 2 (Body)
                                    // Split progress: 0.0 - 0.3 for Path 1, 0.3 - 1.0 for Path 2
                                    const progressPath1 = Math.min(Math.max(progress / 0.3, 0), 1);
                                    const progressPath2 = Math.min(Math.max((progress - 0.3) / 0.7, 0), 1);

                                    section4LampPath1Ref.current.style.strokeDasharray = `${length1}`;
                                    section4LampPath1Ref.current.style.strokeDashoffset = `${length1 * (1 - progressPath1)}`;

                                    section4LampPath2Ref.current.style.strokeDasharray = `${length2}`;
                                    section4LampPath2Ref.current.style.strokeDashoffset = `${length2 * (1 - progressPath2)}`;
                                }
                            } else {
                                // Standard label reveal
                                child.style.opacity = progress.toString();
                                child.style.transform = `scale(${0.9 + progress * 0.1}) translate3d(0, ${(1 - progress) * 10}px, 0)`;
                            }
                        }
                    }
                }

                // 3. Orange Progress Bar (Starts AFTER Lamp Drawing is complete at ~0.61)
                if (section4ProgressRef.current) {
                    const barProgress = Math.min(Math.max((progressS4 - 0.65) / 0.15, 0), 1);
                    section4ProgressRef.current.style.width = `${barProgress * 100}%`;
                    section4ProgressRef.current.style.opacity = (barProgress > 0 && progressS4 < 0.8) ? '1' : '0';
                }

                // 4. Image Transition (0.75 - 0.95)
                if (section4Image2Ref.current) {
                    const transformProgress = Math.min(Math.max((progressS4 - 0.75) / 0.2, 0), 1);
                    section4Image2Ref.current.style.opacity = transformProgress.toString();

                    // SINK FADEOUT: Typography and labels fade out together
                    const fadeOutOpacity = (1 - transformProgress).toString();
                    if (section4LabelsRef.current) {
                        section4LabelsRef.current.style.opacity = fadeOutOpacity;
                    }
                    if (section4ContentRef.current) {
                        section4ContentRef.current.style.opacity = (parseFloat(typoOpacity.toString()) * (1 - transformProgress)).toString();
                    }
                }

                // Parallax Zoom
                const bgScale = 1.05 - (progressS4 * 0.05);
                section4BackgroundRef.current.style.transform = `scale(${bgScale}) translate3d(0, 0, 0)`;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
            <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} onSignIn={onSignIn} t={t} />

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
                <section ref={section1Ref} className="relative h-[350vh]">
                    <div ref={section2StickyRef} className="sticky top-0 h-screen overflow-hidden will-change-opacity">
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
                                    ref={section2ClusterRef}
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
                                <div ref={section2TextRef} className="flex flex-col justify-center max-w-2xl will-change-transform">
                                    <h2 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tighter mb-8 leading-[0.8]">
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Iterativ</span> & parallel arbeiten.
                                    </h2>
                                    <p className="text-xl sm:text-2xl text-zinc-500 leading-relaxed">
                                        Ganze Bildstrecken gleichzeitig generieren, vergleichen und perfektionieren.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>


                {/* Section 3: Vorlagen nutzen und anlegen */}
                {/* Structural Overlay: Negative margin and higher z-index for seamless "handover" */}
                <section
                    ref={section3Ref}
                    className="relative z-20 bg-white dark:bg-zinc-950"
                    style={{ height: '500vh' }}
                >
                    <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-x-hidden">
                        <div className="w-full flex items-center justify-center">
                            <InteractiveSeasonPanel triggerRef={section3Ref} mockupRef={section3MockupRef} textRef={section3TextRef} />
                        </div>
                    </div>
                </section>

                <div className="w-full h-px bg-zinc-100 dark:bg-zinc-900 mx-auto max-w-[1700px]" />

                {/* Section 4: Visual Prompting (Full-Page Sticky with Transformation) */}
                <section ref={section4Ref} className="relative h-[450vh] bg-white dark:bg-zinc-950">
                    <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
                        {/* Background Layer */}
                        <div ref={section4BackgroundRef} className="absolute inset-0 z-0">
                            {/* Image 1: Initial State (now 2.jpg) */}
                            <img
                                ref={section4Image1Ref}
                                src="/about/3 visual promting/2.jpg"
                                className="absolute inset-0 w-full h-full object-cover grayscale-[10%] contrast-[1.1]"
                                alt=""
                            />
                            {/* Image 2: Result (now 1.jpg) */}
                            <img
                                ref={section4Image2Ref}
                                src="/about/3 visual promting/1.jpg"
                                className="absolute inset-0 w-full h-full object-cover opacity-0 grayscale-[10%] contrast-[1.1] z-10"
                                alt=""
                            />

                            {/* Background Overlays Removed per user request */}
                        </div>

                        {/* Generation Progress Bar */}
                        <div
                            ref={section4ProgressRef}
                            className="absolute top-0 left-0 h-1 bg-orange-500 z-50 transition-all duration-300 ease-out opacity-0 shadow-[0_0_20px_rgba(249,115,22,0.5)]"
                            style={{ width: '0%' }}
                        />

                        {/* Typography Container moved to the end of the sticky wrapper to ensure top-layer stacking */}


                        {/* Annotation Labels (Exact User Design) */}
                        <div ref={section4LabelsRef} className="absolute inset-0 pointer-events-none z-40 transition-opacity duration-500 flex items-center justify-center overflow-hidden">
                            {/* Pinned Container (3:2 Aspect Ratio matching the image) */}
                            <div className="relative aspect-[3/2] min-w-full min-h-full flex-none">
                                {/* Label 1: Küche */}
                                <div className="absolute top-[45%] left-[27%] opacity-0 z-20 will-change-transform">
                                    <div className="relative flex flex-col items-center">
                                        {/* Dark Chip */}
                                        <div className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl flex items-center gap-4">
                                            <span className="text-lg font-medium text-white">Küche</span>
                                            <X className="w-4 h-4 text-zinc-500" />
                                        </div>
                                        {/* Connector Zipfel - ENLARGED */}
                                        <div className="w-4 h-4 bg-zinc-900 rotate-45 -mt-[8px] border-r border-b border-white/10" />
                                    </div>
                                </div>

                                {/* Label 2: Esstisch */}
                                <div className="absolute bottom-[25%] left-[20%] opacity-0 z-20 will-change-transform">
                                    <div className="relative flex flex-col items-center">
                                        <div className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl flex items-center gap-4">
                                            <span className="text-lg font-medium text-white">Esstisch</span>
                                            <X className="w-4 h-4 text-zinc-500" />
                                        </div>
                                        <div className="w-4 h-4 bg-zinc-900 rotate-45 -mt-[8px] border-r border-b border-white/10" />
                                    </div>
                                </div>

                                {/* Label 3: Sofa */}
                                <div className="absolute bottom-[20%] right-[20%] opacity-0 z-20 will-change-transform">
                                    <div className="relative flex flex-col items-center">
                                        <div className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl flex items-center gap-4">
                                            <span className="text-lg font-medium text-white">Sofa</span>
                                            <X className="w-4 h-4 text-zinc-500" />
                                        </div>
                                        <div className="w-4 h-4 bg-zinc-900 rotate-45 -mt-[8px] border-r border-b border-white/10" />
                                    </div>
                                </div>

                                {/* Lamp Drawing (Top Left above Küche) - APPEARS AFTER SOFA */}
                                <svg
                                    ref={section4LampRef}
                                    width="320"
                                    height="360"
                                    viewBox="0 0 246 272"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="absolute opacity-0 z-10 drop-shadow-[0_0_20px_rgba(251,146,60,0.3)]"
                                    style={{ top: '12%', left: '18%' }}
                                >
                                    <defs>
                                        <linearGradient id="lampGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#fb923c" />
                                            <stop offset="100%" stopColor="#ef4444" />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        ref={section4LampPath1Ref}
                                        d="M129.009 0.0950928C124.967 127.525 124.469 180.048 129.009 215.595"
                                        stroke="url(#lampGradient)"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        ref={section4LampPath2Ref}
                                        d="M206.413 212.83C200.199 206.22 171.641 193.497 107.124 195.48C26.4762 197.958 -64.3028 250.01 76.3236 265.873C216.95 281.736 328.802 208.369 152.513 182.095"
                                        stroke="url(#lampGradient)"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                        </div>

                        <style>{`
                            .section4-drop-shadow-light {
                                filter: drop-shadow(0 12px 48px rgba(255, 255, 255, 0.9));
                            }
                            .dark .section4-drop-shadow-dark {
                                filter: drop-shadow(0 12px 48px rgba(0, 0, 0, 0.9));
                            }
                        `}</style>
                        <div className="absolute inset-0 z-[100] container mx-auto px-6 h-full flex flex-col justify-center items-center text-center pointer-events-none">
                            <div ref={section4ContentRef} className="max-w-6xl mb-12 will-change-transform will-change-opacity opacity-0 flex flex-col items-center pointer-events-auto section4-drop-shadow-light section4-drop-shadow-dark">
                                <h2 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-6">
                                    Visual <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Prompting.</span>
                                </h2>
                                <p className="text-xl sm:text-2xl text-zinc-600 dark:text-zinc-500 max-w-2xl leading-relaxed">
                                    Sagen Sie der KI nicht nur was, sondern zeigen Sie ihr exakt wo.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="w-full h-px bg-zinc-100 dark:bg-zinc-900 mx-auto max-w-[1700px]" />

                {/* Section 5: Clean CTA */}
                <section className="relative py-60 px-6 overflow-hidden bg-white dark:bg-zinc-950">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-white/10 to-transparent" />

                    <div className="relative z-10 max-w-5xl mx-auto text-center">
                        <h2 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter mb-12 leading-[0.9]">
                            Bereit für <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Next-Gen</span> Creation?
                        </h2>

                        <div className="flex flex-col items-center justify-center gap-6 mt-16">
                            <Button
                                onClick={onCreateBoard}
                                variant="primary"
                                className="scale-150"
                            >
                                Projekt starten
                            </Button>
                        </div>
                    </div>

                    {/* Subtle Background Elements */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />
                </section>

                <GlobalFooter t={t} />
            </main>

            <style>{`
                .preserve-3d { transform-style: preserve-3d; }
                .perspective-1000 { perspective: 1000px; }
                .mockup-cursor {
                    animation: cursor-blink 1s steps(1, start) infinite;
                }
                @keyframes cursor-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `}</style>
        </div >
    );
};
