import React, { useEffect, useState } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Theme, Typo } from '@/components/ui/DesignSystem';
import { ChevronDown, Pen, Camera, X, ChevronRight } from 'lucide-react';
import { TwoDotsVertical } from '@/components/ui/CustomIcons';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

// --- Mockup Components ---

const CanvasMockup = () => {
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Image grid configuration: Swapped rows 1 & 2, removed 12, 23, 43.jpg
    const imageRows = [
        ['21.jpg', '22.jpg', '24.jpg'],
        ['11.jpg', '13.jpg', '14.jpg'],
        ['31.jpg', '32.jpg', '33.jpg'],
        ['41.jpg', '42.jpg', '44.jpg', '45.jpg']
    ];

    return (
        <div ref={containerRef} className="w-full flex flex-col gap-3 sm:gap-6">
            {imageRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-3 sm:gap-6 items-end">
                    {row.map((imageName, imgIndex) => {
                        // Calculate target opacity based on position in row (staggering from right to left by 15%)
                        const targetOpacity = Math.max(0.1, 1 - (row.length - 1 - imgIndex) * 0.15);

                        return (
                            <div
                                key={imageName}
                                className={`
                                    w-28 sm:w-56 lg:w-80 h-auto overflow-hidden
                                    transition-all duration-[1500ms]
                                `}
                                style={{
                                    transitionDelay: `${(imgIndex * 180) + (rowIndex * 40)}ms`,
                                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                                    opacity: isVisible ? targetOpacity : 0,
                                    transform: isVisible
                                        ? 'scale(1)'
                                        : 'scale(0.98)'
                                }}
                            >
                                <img
                                    src={`/about/iterativ arbeiten img/${imageName}`}
                                    alt={`Canvas example ${imageName}`}
                                    className="w-full h-auto block border-0 outline-none"
                                />
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
        <div className="w-full max-w-sm mx-auto bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-900 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-700">
            {/* Mock Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-900 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400 dark:text-zinc-500">Bearbeiten</span>
                <X className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
            </div>

            <div className="p-6 flex flex-col gap-4">
                {/* Prompt Mock */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-900">
                    <p className="text-sm font-mono text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        Inszeniere das Bild neu, indem du die Jahreszeit anpasst
                        <span className="inline-block w-1.5 h-4 bg-orange-500 ml-1 animate-pulse" />
                    </p>
                </div>

                {/* Variable Blocks Mock */}
                <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-900 flex flex-col gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Saison</span>
                    <div className="flex flex-wrap gap-2">
                        {['Sommer', 'Herbst', 'Winter', 'Frühling'].map(s => (
                            <button
                                key={s}
                                onClick={() => setSelectedSeason(s)}
                                className={`px-3 py-1.5 rounded-md text-[11px] transition-all ${selectedSeason === s ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-bold' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-900 flex flex-col gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Uhrzeit</span>
                    <div className="flex flex-wrap gap-2">
                        {['Mittag', 'Nachmittag', 'Golden Hour', 'Blue Hour', 'Nacht'].map(t => (
                            <button
                                key={t}
                                onClick={() => setSelectedTime(t)}
                                className={`px-3 py-1.5 rounded-md text-[11px] transition-all ${selectedTime === t ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-bold' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tools Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400 text-[11px]">
                        <Pen className="w-3 h-3 text-blue-500" /> Anmerkung
                    </div>
                    <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400 text-[11px]">
                        <Camera className="w-3 h-3 text-orange-500" /> Referenzbild
                    </div>
                </div>

                {/* Generate Button */}
                <button className="w-full py-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-sm tracking-tight mt-4 flex items-center justify-center gap-2 group overflow-hidden relative">
                    <span className="relative z-10">GENERIEREN</span>
                    <TwoDotsVertical className="w-4 h-4 ml-auto relative z-10" />
                    <div className="absolute inset-0 bg-zinc-800 dark:bg-zinc-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
            </div>
        </div>
    );
};

// --- Page Component ---

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col selection:bg-orange-500 selection:text-white">
            <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-900' : 'bg-transparent'}`}>
                <AppNavbar
                    user={user}
                    userProfile={userProfile}
                    credits={credits}
                    onCreateBoard={onCreateBoard}
                    t={t}
                />
            </div>

            <main className="flex-1 w-full">
                {/* Full-Height Hero Section */}
                <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(63,63,70,0.1)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(63,63,70,0.15)_0%,transparent_70%)]" />
                        <div className="absolute inset-0 bg-white dark:bg-zinc-950" />
                    </div>

                    <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                        <span className="text-zinc-400 dark:text-zinc-500 font-mono text-sm tracking-[0.3em] uppercase mb-8 block animate-in fade-in slide-in-from-bottom-4 duration-1000">Est. 2026</span>
                        <h1 className="text-7xl sm:text-8xl md:text-[10rem] font-bold tracking-tighter text-zinc-900 dark:text-white mb-8 leading-[0.8] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                            Creation <br />
                            <span className="text-zinc-300 dark:text-zinc-600">Reimagined.</span>
                        </h1>
                        <p className="max-w-xl mx-auto text-xl text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-500">
                            Architektur für Pixel-Perfektionisten. <br />Schlichtheit trifft auf brute Kraft.
                        </p>
                    </div>

                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 animate-bounce opacity-40">
                        <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-900 dark:text-white">Scroll</span>
                        <ChevronDown className="w-5 h-5 text-zinc-900 dark:text-white" />
                    </div>
                </section>

                {/* USP 1: Iterativ + Parallel (FULL-BLEED REFINED) */}
                <section className="relative min-h-[120vh] py-32 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden">
                    <div className="w-full flex flex-col lg:flex-row items-center relative z-10">
                        <div className="w-auto order-2 lg:order-1 flex-none">
                            <CanvasMockup />
                        </div>
                        <div className="flex-1 order-1 lg:order-2 px-6 lg:px-20 xl:px-40 flex flex-col justify-center">
                            <h2 className="text-6xl sm:text-7xl lg:text-9xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-8 leading-[0.8]">
                                <span className="text-orange-500">Iterativ</span> <br />+ parallel arbeiten.
                            </h2>
                            <p className="text-zinc-400 dark:text-zinc-500 text-xl lg:text-2xl leading-relaxed max-w-lg">
                                Ganze Variantenreihen gleichzeitig generieren. Vergleichen, verwerfen, veredeln – in Echtzeit.
                            </p>
                        </div>
                    </div>
                </section>

                {/* USP 2: Sidepanel / Präzise Steuerung (FULLSCREEN CODE MOCKUP) */}
                <section className="relative min-h-screen py-32 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900/20 overflow-hidden border-y border-zinc-100 dark:border-zinc-900/50">
                    <div className="max-w-[1700px] mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                        <div className="lg:col-span-7 flex justify-center">
                            <div className="relative group perspective-[2000px] w-full max-w-md">
                                <div className="hidden lg:block absolute -inset-20 bg-orange-500/5 blur-[120px] rounded-full group-hover:bg-orange-500/10 transition-all duration-1000" />
                                <div className="transition-transform duration-1000">
                                    <SidepanelMockup />
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-5 flex flex-col items-start lg:items-end text-left lg:text-right">
                            <h2 className="text-6xl sm:text-8xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-8 leading-[0.9]">
                                <span className="text-zinc-300 dark:text-zinc-700">Präzise</span> Steuerung.
                            </h2>
                            <p className="text-zinc-400 dark:text-zinc-500 text-xl leading-relaxed max-w-sm">
                                Variablen und Presets geben Ihnen die Kontrolle zurück. Strukturieren Sie Chaos in messbare Qualität.
                            </p>
                        </div>
                    </div>
                </section>

                {/* USP 3: Visual Prompting */}
                <section className="relative min-h-screen py-32 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden">
                    <div className="max-w-5xl mx-auto px-6 w-full text-center mb-16">
                        <h2 className="text-7xl sm:text-9xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-8 leading-[0.9]">
                            Visual <span className="text-orange-500">prompting.</span>
                        </h2>
                        <p className="text-zinc-400 dark:text-zinc-500 text-xl leading-relaxed mx-auto max-w-2xl">
                            Marker setzen statt Sätze hämmern. Sagen Sie der KI nicht nur was, sondern <span className="text-zinc-900 dark:text-white">genau wo</span> etwas passieren soll.
                        </p>
                    </div>
                    <div className="w-full max-w-5xl px-6 relative group">
                        <div className="absolute inset-0 bg-zinc-100 dark:bg-white/5 blur-[150px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/50 relative">
                            {/* Abstract Visualization of Annotations */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative w-full h-full cursor-crosshair">
                                    {/* Mock Annotation Markers */}
                                    <div className="absolute top-[20%] left-[30%] p-4 rounded-full border-2 border-orange-500 bg-orange-500/20 backdrop-blur-md animate-pulse">
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded font-mono text-[11px] whitespace-nowrap text-zinc-900 dark:text-white shadow-lg">"Sessel austauschen"</div>
                                    </div>
                                    <div className="absolute bottom-[25%] right-[20%] p-4 rounded-full border-2 border-blue-500 bg-blue-500/20 backdrop-blur-md animate-pulse delay-700">
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded font-mono text-[11px] whitespace-nowrap text-zinc-900 dark:text-white shadow-lg">"Lichtquelle hinzufügen"</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Cinematic Quote Section */}
                <section className="py-60 bg-white dark:bg-zinc-950 relative overflow-hidden text-center">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-5 dark:opacity-10 blur-[120px] pointer-events-none">
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600 rounded-full animate-pulse" />
                        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-zinc-300 dark:bg-zinc-700 rounded-full animate-pulse delay-1000" />
                    </div>
                    <div className="max-w-4xl mx-auto px-6 relative z-10">
                        <blockquote className="text-5xl sm:text-7xl font-medium tracking-tight text-zinc-900 dark:text-white leading-[1] italic">
                            "Hinter jedem Bild steckt eine Geschichte, die darauf wartet, erzählt zu werden."
                        </blockquote>
                        <footer className="mt-12 text-zinc-400 dark:text-zinc-600 font-mono tracking-widest uppercase text-sm">
                            — Michael Pzillas, Founder
                        </footer>
                    </div>
                </section>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
