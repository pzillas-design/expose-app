import React, { useState } from 'react';

interface HeroProps {
    scrollY: number;
    progress: number;
    t: any;
}

const FloatingImage = ({ src, depth, x, y, size }: { src: string, depth: number, x: string, y: string, size: string, key?: any }) => {
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
            <div className="relative group overflow-hidden">
                <img
                    src={src}
                    className="w-full h-auto shadow-2xl transition-all duration-500 rounded-none border border-white/5"
                    alt="Canvas Element"
                />

                {/* Subtle Hover Overlay */}
                <div className={`absolute inset-0 bg-orange-500/10 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

                {/* Tech Metadata (Visual only) */}
                <div className={`absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-none border border-white/10 text-[8px] font-bold text-white/50 tracking-widest uppercase transition-all duration-500 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    VAR_0{Math.floor(Math.random() * 9)} // DEPTH: {depth}PX
                </div>
            </div>
        </div>
    );
};

export const HeroDive = ({ scrollY }: HeroProps) => {
    const scrollDepth = scrollY * 0.8; // Adjusted for better dive feel

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
        <div
            className="relative h-screen flex items-center justify-center overflow-hidden bg-black text-white"
            style={{ perspective: '1000px' }}
        >
            <div
                className="relative flex items-center justify-center preserve-3d w-full h-full transition-transform duration-100 ease-out"
                style={{ transform: `translate3d(0, 0, ${scrollDepth}px)` }}
            >
                {/* Hero Text - Restored from Commit 2450848 */}
                <div className="text-center z-10" style={{ transform: 'translateZ(200px)' }}>
                    <h1 className="text-7xl md:text-[10rem] font-bold tracking-tighter uppercase leading-[0.8] mb-12 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        Creation <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Reimagined.</span>
                    </h1>
                    <p className="max-w-md mx-auto text-lg md:text-xl text-zinc-500 font-bold tracking-tight uppercase px-6">
                        Scroll down to dive into the architecture of your next big idea.
                    </p>
                </div>

                {/* Floating Images (Full 8-image depth array) */}
                <div className="absolute inset-0 pointer-events-none preserve-3d">
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
                </div>
            </div>

            {/* Custom Scroll Indicator */}
            <div className="fixed top-1/2 right-10 -translate-y-1/2 flex flex-col items-center gap-4 opacity-20 pointer-events-none">
                <div className="w-px h-32 bg-gradient-to-b from-transparent via-white to-transparent" />
                <span className="text-[10px] font-bold rotate-90 whitespace-nowrap tracking-[0.3em] uppercase">Scroll to Dive</span>
            </div>
        </div>
    );
};
