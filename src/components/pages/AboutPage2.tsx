import React, { useEffect, useState, useRef } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';

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
            <div className="relative group">
                <img
                    src={src}
                    className="w-full h-auto shadow-2xl transition-all duration-500 rounded-sm"
                    alt="Canvas Element"
                />
            </div>
        </div>
    );
};

const ProgressionGrid = ({ depth }: { depth: number }) => {
    const images = ['41.jpg', '42.jpg', '44.jpg', '45.jpg', '11.jpg', '13.jpg', '14.jpg', '21.jpg'];

    return (
        <div
            className="absolute left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-4 w-full max-w-7xl px-10"
            style={{ transform: `translateZ(${depth}px)`, top: '220%' }}
        >
            {images.map((img, i) => (
                <div
                    key={i}
                    className="relative w-48 sm:w-64 h-auto shadow-xl transition-all duration-1000"
                    style={{
                        transform: `translateZ(${i * 20}px)`,
                        opacity: 0.8 + (i * 0.02)
                    }}
                >
                    <img src={`/about/iterativ arbeiten img/${img}`} alt="Iteration" className="w-full h-auto rounded-sm border border-white/10" />
                    {i % 2 === 0 && (
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-orange-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
                    )}
                </div>
            ))}
        </div>
    );
};

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [scrollDepth, setScrollDepth] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY;
            setScrollDepth(scrolled * 0.7);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const images = [
        { src: '/about/iterativ arbeiten img/41.jpg', x: '10%', y: '10%', depth: 0, size: '400px' },
        { src: '/about/iterativ arbeiten img/11.jpg', x: '65%', y: '20%', depth: -400, size: '500px' },
        { src: '/about/iterativ arbeiten img/21.jpg', x: '15%', y: '50%', depth: -800, size: '350px' },
        { src: '/about/iterativ arbeiten img/31.jpg', x: '70%', y: '60%', depth: -1200, size: '450px' },
        { src: '/about/iterativ arbeiten img/42.jpg', x: '20%', y: '110%', depth: -1600, size: '600px' },
    ];

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-[700vh] flex flex-col selection:bg-orange-500 selection:text-white overflow-x-hidden">
            <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />

            <main className="fixed inset-0 overflow-hidden pointer-events-none">
                <div
                    className="relative w-full h-full preserve-3d transition-transform duration-700 ease-out pointer-events-auto"
                    style={{ transform: `perspective(1200px) translate3d(0, 0, ${scrollDepth}px)` }}
                >
                    {/* Hero Text Layer */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6" style={{ transform: 'translateZ(100px)' }}>
                        <h1 className="text-7xl sm:text-[14rem] font-bold tracking-tighter leading-[0.7] mb-12">
                            Creation <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">Reimagined.</span>
                        </h1>
                        <p className="max-w-md mx-auto text-xl text-zinc-500 font-medium">
                            Scroll down to dive into the architecture of your next big idea.
                        </p>
                    </div>

                    {/* Floating Images */}
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

                    {/* Section: Iterativ & Parallel */}
                    <div className="absolute top-[180%] left-1/2 -translate-x-1/2 w-full flex flex-col items-center" style={{ transform: 'translateZ(-2500px)' }}>
                        <div className="max-w-4xl p-6 text-center mb-48">
                            <h2 className="text-9xl font-bold tracking-tighter mb-8 italic">Iterativ + Parallel.</h2>
                            <p className="text-3xl text-zinc-400 font-light leading-snug">Ganze Variantenreihen gleichzeitig generieren. <br />Vergleichen, verwerfen, veredeln – in Echtzeit.</p>
                        </div>
                        <ProgressionGrid depth={-500} />
                    </div>

                    {/* Section: Precision Control */}
                    <div className="absolute top-[350%] left-1/2 -translate-x-1/2 w-full max-w-5xl p-6 flex flex-col items-center" style={{ transform: 'translateZ(-6000px)' }}>
                        <h2 className="text-8xl font-bold mb-12 tracking-tight text-center">Präzise Steuerung.</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center text-center md:text-left">
                            <p className="text-2xl text-zinc-500 leading-relaxed">Variablen und Presets geben Ihnen die Kontrolle zurück. Strukturieren Sie Chaos in messbare Qualität.</p>
                            <div className="w-full aspect-square bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl flex items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-10 border-2 border-dashed border-orange-500/20 group-hover:border-orange-500/40 transition-colors" />
                                <div className="text-[10px] font-mono tracking-widest text-zinc-400">INTERFACE_CORE_V5</div>
                            </div>
                        </div>
                    </div>

                    {/* Final Quote */}
                    <div className="absolute top-[520%] left-1/2 -translate-x-1/2 w-full max-w-6xl p-6 text-center" style={{ transform: 'translateZ(-9000px)' }}>
                        <blockquote className="text-8xl font-medium italic mb-20 leading-[0.9] tracking-tighter">
                            "Hinter jedem Bild steckt eine Geschichte, die darauf wartet, erzählt zu werden."
                        </blockquote>
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-px h-20 bg-gradient-to-b from-orange-500 to-transparent" />
                            <div className="text-sm font-mono tracking-[0.5em] uppercase text-zinc-500">— Michael Pzillas, Founder</div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Pagination / Hint */}
            <div className="fixed top-1/2 right-10 -translate-y-1/2 flex flex-col items-center gap-4 opacity-30">
                <div className="w-0.5 h-32 bg-gradient-to-b from-transparent via-zinc-500 to-transparent" />
                <span className="text-[10px] font-mono rotate-90 whitespace-nowrap tracking-[0.3em]">SCROLL OR DIVE</span>
            </div>

            <GlobalFooter t={t} />

            <style>{`
                .preserve-3d { transform-style: preserve-3d; }
            `}</style>
        </div>
    );
};
