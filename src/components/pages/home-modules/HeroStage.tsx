import React, { useState } from 'react';

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
            className="absolute lg:transition-all lg:duration-700 lg:ease-out hero-floating-image"
            style={{
                left: x,
                top: y,
                width: `calc(var(--base-vw, ${sizeVal}) * var(--mobile-scale, 1) * 1vw)`,
                transform: `translateZ(${depth}px) ${isHovered ? 'scale(1.05)' : 'scale(1)'}`,
                zIndex: Math.floor(depth) + 1000,
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
                <div className={`absolute -inset-4 bg-orange-500/10 rounded-full transition-opacity duration-500 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
            </div>
        </div>
    );
};

export interface HeroStageProps {
    progress: number; // Global progress [0, 1]
    scrollActive: boolean;
}

export const HeroStage: React.FC<HeroStageProps> = ({ progress, scrollActive }) => {
    // Local progress for Hero: we want it to finish early (around 0.15 global)
    // Map global [0, 0.15] to local [0, 1]
    const localProgress = Math.min(progress / 0.15, 1);
    const opacity = localProgress > 0.9 ? (1 - localProgress) * 10 : 1;

    const floatingImages = [
        { src: '/home/1 creation reimagined/41.jpg', x: '-15%', y: '85%', depth: -300, size: '35vw' },
        { src: '/home/1 creation reimagined/11.jpg', x: '80%', y: '5%', depth: -500, size: '44vw' },
        { src: '/home/1 creation reimagined/21.jpg', x: '45%', y: '95%', depth: -150, size: '17vw' },
        { src: '/home/1 creation reimagined/31.jpg', x: '-15%', y: '0%', depth: -950, size: '48vw' },
        { src: '/home/1 creation reimagined/42.jpg', x: '90%', y: '85%', depth: -400, size: '32vw' },
        { src: '/home/1 creation reimagined/12.jpg', x: '75%', y: '50%', depth: -800, size: '29vw' },
        { src: '/home/1 creation reimagined/22.jpg', x: '35%', y: '-5%', depth: -600, size: '25vw' },
        { src: '/home/1 creation reimagined/32.jpg', x: '10%', y: '80%', depth: -1200, size: '23vw' },
    ];

    // Scroll depth for 3D parallax: we'll use a fixed multiplier based on window height during orchestration
    // Since we're sticky, we rely on progress. 
    // y = globalProgress * totalHeight
    // For 1800vh, y at progress 0.15 is 270vh
    const scrollDepth = localProgress * 1500; // Arbitrary depth constant for the fly-through

    return (
        <div
            className="absolute inset-0 z-20 overflow-hidden transition-opacity duration-1000 will-change-opacity"
            style={{
                opacity: scrollActive ? opacity : 0,
                pointerEvents: localProgress > 0.95 ? 'none' : 'auto'
            }}
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
                    className="relative w-full h-full preserve-3d lg:transition-transform lg:duration-500 lg:ease-out will-change-transform"
                    style={{ transform: `translate3d(0, 0, ${scrollDepth}px)` }}
                >
                    {/* Hero Text Layer */}
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none"
                        style={{
                            transform: 'translate3d(0, 0, 150px)',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            WebkitFontSmoothing: 'antialiased',
                        }}
                    >
                        <div className="w-[66%] mt-[-2vh] hero-headline-container pointer-events-auto">
                            <h1
                                className="font-bold tracking-tighter leading-[1.0] hero-headline antialiased"
                                style={{
                                    fontSize: 'clamp(2.5rem, 8vw, 8.5rem)',
                                    transform: 'translateZ(0)',
                                    WebkitFontSmoothing: 'antialiased',
                                    WebkitTextStroke: '0.1px transparent', // Hack to force sharper text in Safari 3D
                                }}
                            >
                                Creation <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 block">Reimagined.</span>
                            </h1>
                        </div>
                    </div>

                    {floatingImages.map((img, i) => (
                        <FloatingImage key={i} {...img} />
                    ))}
                </div>
            </div>
        </div>
    );
};
