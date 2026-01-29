import React, { useEffect, useState, useRef } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { MousePointer2, Info, Layers, Eye } from 'lucide-react';

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

                {/* Subtle Hover Glow */}
                <div className={`absolute -inset-4 bg-orange-500/10 blur-xl rounded-full transition-opacity duration-500 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
            </div>
        </div>
    );
};

const ParallelStream = () => {
    const streamImages = [
        '41.jpg', '42.jpg', '44.jpg', '45.jpg',
        '11.jpg', '13.jpg', '14.jpg',
        '21.jpg', '24.jpg'
    ];

    return (
        <div className="flex gap-12 py-20 px-[20vw]">
            {streamImages.map((img, i) => (
                <div
                    key={i}
                    className="shrink-0 group relative transition-transform duration-700 hover:-translate-y-4"
                    style={{ transform: `translateZ(${Math.sin(i) * 50}px)` }}
                >
                    <div className="w-64 lg:w-96 aspect-[3/4] overflow-hidden bg-zinc-100 dark:bg-zinc-900 shadow-2xl border border-white/10 relative">
                        <img
                            src={`/about/iterativ arbeiten img/${img}`}
                            alt="Iteration"
                            className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="absolute bottom-6 left-6 text-white text-[10px] font-mono tracking-widest translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                            VARIATION_{i.toString().padStart(2, '0')}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [scrollDepth, setScrollDepth] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY;
            setScrollDepth(scrolled * 0.5); // Adjust sensitivity
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
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-[500vh] flex flex-col selection:bg-orange-500 selection:text-white">
            <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />

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
                        />
                    ))}

                    {/* Section: Iterativ + Parallel */}
                    <div
                        className="absolute top-[200%] left-0 w-full"
                        style={{ transform: 'translateZ(-1500px)' }}
                    >
                        <div className="max-w-6xl mx-auto px-6 mb-20 text-center">
                            <span className="text-xs font-mono tracking-[0.5em] uppercase text-orange-500 mb-6 block">Parallel Power</span>
                            <h2 className="text-6xl lg:text-9xl font-bold tracking-tighter mb-8 leading-tight">Iterativ + parallel <br />arbeiten.</h2>
                            <p className="text-2xl text-zinc-500 max-w-2xl mx-auto">Ganze Variantenreihen gleichzeitig generieren. Vergleichen, verwerfen, veredeln – in Echtzeit.</p>
                        </div>

                        <div className="overflow-x-auto no-scrollbar scroll-smooth">
                            <ParallelStream />
                        </div>
                    </div>



                    {/* Section: Präzise Steuerung */}
                    <div
                        className="absolute top-[350%] left-1/2 -translate-x-1/2 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-20 items-center px-6"
                        style={{ transform: 'translateZ(-3000px)' }}
                    >
                        <div className="space-y-8">
                            <span className="text-xs font-mono tracking-[0.5em] uppercase text-orange-500 block">Total Control</span>
                            <h2 className="text-6xl lg:text-8xl font-bold tracking-tighter leading-tight">Präzise <br />Steuerung.</h2>
                            <p className="text-2xl text-zinc-500 leading-relaxed">Variablen und Presets geben Ihnen die Kontrolle zurück. Strukturieren Sie Chaos in messbare Qualität.</p>
                        </div>
                        <div className="relative group perspective-[2000px]">
                            {/* Floating Mockup with Depth */}
                            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] transform transition-transform duration-1000 group-hover:rotate-y-12">
                                <div className="space-y-6">
                                    <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                                    <div className="grid grid-cols-4 gap-2">
                                        {[1, 2, 3, 4].map(i => <div key={i} className="aspect-square bg-orange-500/10 rounded-lg border border-orange-500/20" />)}
                                    </div>
                                    <div className="h-24 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl" />
                                    <div className="h-12 bg-zinc-900 dark:bg-white rounded-xl" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Visual Prompting */}
                    <div
                        className="absolute top-[500%] left-0 w-full px-6"
                        style={{ transform: 'translateZ(-4500px)' }}
                    >
                        <div className="max-w-4xl mx-auto text-center mb-32">
                            <h2 className="text-7xl lg:text-9xl font-bold tracking-tighter mb-8">Visual prompting.</h2>
                            <p className="text-2xl text-zinc-500">Marker setzen statt Sätze hämmern. Sagen Sie der KI nicht nur was, sondern <span className="text-zinc-900 dark:text-white">genau wo</span> etwas passieren soll.</p>
                        </div>

                        <div className="relative max-w-5xl mx-auto aspect-video bg-zinc-100 dark:bg-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 group">
                            <img src="/about/iterativ arbeiten img/31.jpg" className="w-full h-full object-cover opacity-50 contrast-125" alt="Visual Prompting" />

                            {/* Floating Markers at deep depths relative to the image */}
                            <div className="absolute top-1/4 left-1/3 p-4 bg-orange-500 rounded-full shadow-[0_0_40px_rgba(249,115,22,0.5)] animate-pulse" />
                            <div className="absolute bottom-1/3 right-1/4 p-4 bg-blue-500 rounded-full shadow-[0_0_40px_rgba(59,130,246,0.5)] animate-pulse delay-700" />
                        </div>
                    </div>

                    {/* Final Quote Layer */}
                    <div
                        className="absolute top-[650%] left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 text-center"
                        style={{ transform: 'translateZ(-6000px)' }}
                    >
                        <blockquote className="text-6xl lg:text-8xl font-medium italic mb-12 leading-[1.1]">
                            "Hinter jedem Bild steckt eine Geschichte, die darauf wartet, erzählt zu werden."
                        </blockquote>
                        <div className="text-sm font-mono tracking-widest uppercase text-zinc-500">— Michael Pzillas, Founder</div>
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
