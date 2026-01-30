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

// --- Interaction Components from About 2 ---

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

// --- Mockup Components from About 0 ---

const CanvasMockup = () => {
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setIsVisible(true);
            },
            { threshold: 0.1 }
        );
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const imageRows = [
        ['41.jpg', '42.jpg', '44.jpg', '45.jpg'],
        ['11.jpg', '13.jpg', '14.jpg'],
        ['21.jpg', '24.jpg'],
        ['31.jpg', '32.jpg', '33.jpg']
    ];

    return (
        <div ref={containerRef} className="w-full flex flex-col gap-6 sm:gap-12">
            {imageRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-3 sm:gap-6 items-end">
                    {row.map((imageName, imgIndex) => {
                        const targetOpacity = Math.max(0.1, 1 - (row.length - 1 - imgIndex) * 0.15);
                        return (
                            <div
                                key={imageName}
                                className="w-28 sm:w-56 lg:w-80 h-auto overflow-hidden transition-all duration-[1500ms]"
                                style={{
                                    transitionDelay: `${(imgIndex * 180) + (rowIndex * 40)}ms`,
                                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                                    opacity: isVisible ? targetOpacity : 0,
                                    transform: isVisible ? 'scale(1)' : 'scale(0.98)'
                                }}
                            >
                                <img src={`/about/iterativ arbeiten img/${imageName}`} className="w-full h-auto block" alt="" />
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
        <div className="w-full max-w-sm mx-auto bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-900 shadow-2xl overflow-hidden flex flex-col scale-110 lg:scale-125">
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

// --- Main Page Component ---

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [scrollDepth, setScrollDepth] = useState(0);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const y = window.scrollY;
            setScrollDepth(y * 0.6);
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
    ];

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-[700vh] flex flex-col selection:bg-orange-500 selection:text-white">
            <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-900' : 'bg-transparent'}`}>
                <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />
            </div>

            <main className="fixed inset-0 overflow-hidden pointer-events-none">
                <div
                    className="relative w-full h-full preserve-3d transition-transform duration-500 ease-out pointer-events-auto"
                    style={{ transform: `perspective(1000px) translate3d(0, 0, ${scrollDepth}px)` }}
                >
                    {/* --- Hero Dive Section --- */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6" style={{ transform: 'translateZ(350px)' }}>
                        <h1 className="text-7xl sm:text-[12rem] font-bold tracking-tighter leading-[0.8] mb-12">
                            Creation <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Reimagined.</span>
                        </h1>
                        <p className="max-w-md mx-auto text-xl text-zinc-500 font-medium">
                            Scroll down to dive into the architecture of your next big idea.
                        </p>
                    </div>

                    {floatingImages.map((img, i) => (
                        <FloatingImage key={i} {...img} />
                    ))}

                    {/* --- Iterativ + Parallel Section --- */}
                    <div
                        className="absolute top-[200%] left-0 w-full px-6 flex flex-col lg:flex-row items-center gap-20"
                        style={{ transform: 'translateZ(-1500px)' }}
                    >
                        <div className="w-auto flex-none">
                            <CanvasMockup />
                        </div>
                        <div className="flex-1 max-w-2xl">
                            <h2 className="text-6xl lg:text-9xl font-bold tracking-tighter mb-8 leading-[0.8]">
                                <span className="text-orange-500">Iterativ</span> <br />+ parallel arbeiten.
                            </h2>
                            <p className="text-2xl text-zinc-500 leading-relaxed">
                                Ganze Variantenreihen gleichzeitig generieren. Vergleichen, verwerfen, veredeln – in Echtzeit.
                            </p>
                        </div>
                    </div>

                    {/* --- Präzise Steuerung Section --- */}
                    <div
                        className="absolute top-[380%] left-0 w-full px-6 grid grid-cols-1 lg:grid-cols-2 gap-32 items-center"
                        style={{ transform: 'translateZ(-3500px)' }}
                    >
                        <div className="flex justify-center lg:justify-end order-2 lg:order-1">
                            <SidepanelMockup />
                        </div>
                        <div className="text-left order-1 lg:order-2 max-w-2xl">
                            <h2 className="text-6xl lg:text-9xl font-bold tracking-tighter mb-8 leading-[0.9]">
                                <span className="text-zinc-300 dark:text-zinc-700">Präzise</span> Steuerung.
                            </h2>
                            <p className="text-2xl text-zinc-500 leading-relaxed">
                                Variablen und Presets geben Ihnen die Kontrolle zurück. Strukturieren Sie Chaos in messbare Qualität.
                            </p>
                        </div>
                    </div>

                    {/* --- Visual Prompting Section --- */}
                    <div
                        className="absolute top-[580%] left-0 w-full px-6 flex flex-col items-center text-center"
                        style={{ transform: 'translateZ(-5500px)' }}
                    >
                        <div className="max-w-4xl mb-24">
                            <h2 className="text-7xl lg:text-[10rem] font-bold tracking-tighter mb-8 leading-[0.9]">
                                Visual <span className="text-orange-500">prompting.</span>
                            </h2>
                            <p className="text-2xl text-zinc-500">
                                Marker setzen statt Sätze hämmern. Sagen Sie der KI nicht nur was, sondern <span className="text-zinc-900 dark:text-white">genau wo</span> etwas passieren soll.
                            </p>
                        </div>
                        <div className="w-full max-w-6xl aspect-video rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 relative group bg-zinc-900">
                            <img src="/about/iterativ arbeiten img/31.jpg" className="w-full h-full object-cover opacity-60 contrast-125" alt="" />
                            <div className="absolute top-[25%] left-[35%] p-4 rounded-full border-2 border-orange-500 bg-orange-500/20 backdrop-blur-md animate-pulse">
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono rounded whitespace-nowrap shadow-2xl">"Sessel austauschen"</div>
                            </div>
                            <div className="absolute bottom-[30%] right-[25%] p-4 rounded-full border-2 border-blue-500 bg-blue-500/20 backdrop-blur-md animate-pulse delay-700">
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono rounded whitespace-nowrap shadow-2xl">"Lichtquelle hinzufügen"</div>
                            </div>
                        </div>
                    </div>

                    {/* --- Quote Section --- */}
                    <div
                        className="absolute top-[780%] left-1/2 -translate-x-1/2 w-full max-w-5xl px-6 text-center"
                        style={{ transform: 'translateZ(-7500px)' }}
                    >
                        <blockquote className="text-6xl lg:text-[7rem] font-medium tracking-tight italic mb-16 leading-[1.1]">
                            "Hinter jedem Bild steckt eine Geschichte, die darauf wartet, erzählt zu werden."
                        </blockquote>
                        <div className="text-sm font-mono tracking-[0.5em] uppercase text-zinc-500">— Michael Pzillas, Founder</div>
                    </div>
                </div>
            </main>

            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none animate-bounce">
                <div className="w-0.5 h-12 bg-zinc-500" />
            </div>

            <style>{`
                .preserve-3d { transform-style: preserve-3d; }
                .overflow-hidden { overflow: hidden; }
            `}</style>
        </div>
    );
};
