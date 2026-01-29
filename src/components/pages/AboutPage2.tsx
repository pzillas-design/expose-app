import React, { useEffect, useState, useRef } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { AboutVersionSwitcher } from './AboutVersionSwitcher';
import { Layers, Eye } from 'lucide-react';

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
    mode: 'art' | 'tech';
}

const FloatingImage = ({ src, depth, x, y, size, mode }: FloatingImageProps) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="absolute transition-all duration-700 ease-out"
            style={{
                left: x,
                top: y,
                width: size,
                transform: `translateZ(${depth}px) ${isHovered ? 'scale(1.1)' : 'scale(1)'}`,
                zIndex: Math.floor(depth)
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative group cursor-none">
                <img
                    src={src}
                    className={`w-full h-auto shadow-2xl transition-all duration-500 ${mode === 'tech' ? 'grayscale opacity-50 contrast-125 brightness-75' : 'grayscale-0 opacity-100'}`}
                    alt="Canvas Element"
                />

                {/* Tech Overlay (Mode Tech) */}
                {mode === 'tech' && (
                    <div className="absolute inset-0 border border-orange-500/30 pointer-events-none">
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-orange-500" />
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-orange-500" />
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-orange-500" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-orange-500" />
                    </div>
                )}

                {/* Hover Metadata Explosion */}
                <div className={`absolute -inset-10 flex items-center justify-center transition-all duration-500 pointer-events-none ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                    <div className="p-4 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-mono text-white/70 space-y-2 translate-y-20">
                        <div className="flex justify-between gap-4"><span>SEED:</span> <span className="text-orange-400">83921002</span></div>
                        <div className="flex justify-between gap-4"><span>MODEL:</span> <span className="text-blue-400">FLUX.1-PRO</span></div>
                        <div className="flex justify-between gap-4"><span>LATENCY:</span> <span className="text-green-400">1.2s</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [scrollDepth, setScrollDepth] = useState(0);
    const [viewMode, setViewMode] = useState<'art' | 'tech'>('art');

    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY;
            setScrollDepth(scrolled * 0.5);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const images = [
        { src: '/about/iterativ arbeiten img/41.jpg', x: '10%', y: '10%', depth: 0, size: '400px' },
        { src: '/about/iterativ arbeiten img/11.jpg', x: '55%', y: '20%', depth: -300, size: '500px' },
        { src: '/about/iterativ arbeiten img/21.jpg', x: '25%', y: '45%', depth: -600, size: '350px' },
        { src: '/about/iterativ arbeiten img/31.jpg', x: '60%', y: '60%', depth: -900, size: '450px' },
        { src: '/about/iterativ arbeiten img/42.jpg', x: '15%', y: '110%', depth: -1200, size: '600px' },
        { src: '/about/iterativ arbeiten img/13.jpg', x: '50%', y: '130%', depth: -1500, size: '400px' },
        { src: '/about/iterativ arbeiten img/24.jpg', x: '20%', y: '160%', depth: -1800, size: '550px' },
        { src: '/about/iterativ arbeiten img/32.jpg', x: '65%', y: '180%', depth: -2100, size: '300px' },
    ];

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-[400vh] flex flex-col selection:bg-orange-500 selection:text-white">
            <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />

            <AboutVersionSwitcher activeId="2" />

            {/* Global View Controls */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200]">
                <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-full flex gap-1 shadow-2xl">
                    <button
                        onClick={() => setViewMode('art')}
                        className={`px-6 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'art' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
                    >
                        <Eye className="w-3.5 h-3.5" /> THE ART
                    </button>
                    <button
                        onClick={() => setViewMode('tech')}
                        className={`px-6 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'tech' ? 'bg-orange-500 text-white' : 'text-white/50 hover:text-white'}`}
                    >
                        <Layers className="w-3.5 h-3.5" /> THE ENGINE
                    </button>
                </div>
            </div>

            <main className="fixed inset-0 overflow-hidden pointer-events-none">
                <div
                    className="relative w-full h-full preserve-3d transition-transform duration-500 ease-out pointer-events-auto"
                    style={{ transform: `perspective(1000px) translate3d(0, 0, ${scrollDepth}px)` }}
                >
                    {/* Hero Text Layer */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6" style={{ transform: 'translateZ(200px)' }}>
                        <h1 className="text-7xl sm:text-[12rem] font-bold tracking-tighter leading-[0.8] mb-12">
                            Creation <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Reimagined.</span>
                        </h1>
                        <p className="max-w-md mx-auto text-xl text-zinc-500 font-medium">
                            Scroll down to dive into the architecture of your next big idea.
                        </p>
                    </div>

                    {/* Floating Images across depths */}
                    {images.map((img, i) => (
                        <FloatingImage
                            key={i}
                            src={img.src}
                            x={img.x}
                            y={img.y}
                            depth={img.depth}
                            size={img.size}
                            mode={viewMode}
                        />
                    ))}

                    {/* Content Layers at different depths */}
                    <div className="absolute top-[180%] left-1/2 -translate-x-1/2 w-full max-w-4xl p-6" style={{ transform: 'translateZ(-1000px)' }}>
                        <h2 className="text-6xl font-bold mb-8 text-center">Iterativ + parallel arbeiten.</h2>
                        <p className="text-2xl text-zinc-400 text-center leading-relaxed">Ganze Variantenreihen gleichzeitig generieren. Vergleichen, verwerfen, veredeln – in Echtzeit.</p>
                    </div>

                    <div className="absolute top-[280%] left-1/2 -translate-x-1/2 w-full max-w-4xl p-6" style={{ transform: 'translateZ(-2000px)' }}>
                        <h2 className="text-6xl font-bold mb-8 text-center">Präzise Steuerung.</h2>
                        <p className="text-2xl text-zinc-400 text-center leading-relaxed">Variablen und Presets geben Ihnen die Kontrolle zurück. Strukturieren Sie Chaos in messbare Qualität.</p>
                    </div>

                    <div className="absolute top-[380%] left-1/2 -translate-x-1/2 w-full max-w-4xl p-6" style={{ transform: 'translateZ(-3000px)' }}>
                        <blockquote className="text-6xl font-medium italic mb-12 text-center">
                            "Hinter jedem Bild steckt eine Geschichte, die darauf wartet, erzählt zu werden."
                        </blockquote>
                        <div className="text-sm font-mono tracking-widest uppercase text-zinc-500 text-center">— Michael Pzillas, Founder</div>
                    </div>
                </div>
            </main>

            {/* Custom Cursor Hint */}
            <div className="fixed top-1/2 right-10 -translate-y-1/2 flex flex-col items-center gap-4 opacity-30 group">
                <div className="w-0.5 h-32 bg-gradient-to-b from-transparent via-zinc-500 to-transparent" />
                <span className="text-[10px] font-mono rotate-90 whitespace-nowrap tracking-[0.3em]">SCROLL TO DIVE</span>
            </div>

            <style>{`
                .preserve-3d { transform-style: preserve-3d; }
            `}</style>
        </div>
    );
};
