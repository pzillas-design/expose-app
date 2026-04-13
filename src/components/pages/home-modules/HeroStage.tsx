import React, { useState, useEffect, useRef, memo } from 'react';

import { HeroHeadline } from './HeroHeadline';

interface FloatingImageProps {
    src: string;
    depth: number;
    x: string;
    y: string;
    size: string;
    key?: React.Key;
}

// Module-level constant: only created once, never recreated on render
// Dynamic sizes (10vw–36vw), spread to edges, shallow depth for top images
// so perspective doesn't push them toward center
const FLOATING_IMAGES = [
    { src: '/home/1 creation reimagined/2.jpeg', x: '50%', y: '5%', depth: -400, size: '22vw' },
    { src: '/home/1 creation reimagined/3.jpeg', x: '80%', y: '55%', depth: -150, size: '28vw' },
    { src: '/home/1 creation reimagined/6.jpeg', x: '15%', y: '15%', depth: -800, size: '22vw' },
    { src: '/home/1 creation reimagined/9.jpeg', x: '55%', y: '85%', depth: -300, size: '26vw' },
    { src: '/home/1 creation reimagined/12.jpeg', x: '5%', y: '75%', depth: -200, size: '30vw' },
    { src: '/home/1 creation reimagined/4.jpeg', x: '8%', y: '45%', depth: -600, size: '32vw' },
    { src: '/home/1 creation reimagined/8.jpeg', x: '85%', y: '25%', depth: -1000, size: '20vw' },
    { src: '/home/1 creation reimagined/10.jpeg', x: '45%', y: '70%', depth: -1200, size: '22vw' },
    { src: '/home/1 creation reimagined/7.jpeg', x: '0%', y: '12%', depth: -180, size: '25vw' },
] as const;

const FloatingImage = memo(({ src, depth, x, y, size }: FloatingImageProps) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="absolute hero-floating-image"
            style={{
                left: x,
                top: y,
                width: size,
                transform: `translate3d(0, 0, ${depth}px) ${isHovered ? 'scale(1.05)' : 'scale(1)'}`,
                transition: 'transform 0.4s ease-out',
                zIndex: Math.floor(depth) + 1000,
                WebkitBackfaceVisibility: 'hidden',
                backfaceVisibility: 'hidden',
                perspective: '1000px',
                transformStyle: 'preserve-3d',
                willChange: isHovered ? 'transform' : 'auto'
            } as any}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative group cursor-none">
                <img
                    src={src}
                    srcSet={`${src.replace('/home/1 creation reimagined/', '/home/1 creation reimagined/mobile/').replace(/ /g, '%20')} 600w, ${src.replace(/ /g, '%20')} 2000w`}
                    sizes="(max-width: 1023px) 60vw, 40vw"
                    className="w-full h-full transition-opacity duration-300"
                    alt="Canvas Element"
                    loading="eager"
                    decoding="async"
                />
                <div className={`absolute -inset-4 bg-orange-500/10 rounded-full transition-opacity duration-500 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
            </div>
        </div>
    );
});

export interface HeroStageProps {
    progress: number; // Global progress [0, 1]
    scrollActive: boolean;
}

export const HeroStage: React.FC<HeroStageProps> = memo(({ progress, scrollActive }) => {
    const [wordIndex, setWordIndex] = useState(0);
    // Scroll-driven local progress: maps global progress 0-0.18 to 0-1
    const localProgress = Math.min(progress / 0.18, 1);

    useEffect(() => {
        const nextIndex = localProgress < 0.12 ? 0 : localProgress < 0.32 ? 1 : 2;
        if (nextIndex !== wordIndex) setWordIndex(nextIndex);
    }, [localProgress, wordIndex]);

    // Clean cut: fully visible 0-0.14, fades 0.14-0.20, gone 0.20+
    const heroOpacity = progress <= 0.14 ? 1 : progress >= 0.20 ? 0 : 1 - (progress - 0.14) / 0.06;

    // Direct zoom from progress — set directly on ref to avoid documentElement cascade recalc
    const depth = localProgress * 2200;
    const zoomContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (zoomContainerRef.current) {
            zoomContainerRef.current.style.transform = `translate3d(0, 0, ${depth}px)`;
        }
    }, [depth]);

    return (
        <div
            className="absolute inset-0 z-20 will-change-opacity"
            style={{
                opacity: scrollActive ? heroOpacity : 0,
                pointerEvents: heroOpacity < 0.05 ? 'none' : 'auto'
            }}
        >
            <div className="absolute inset-0 overflow-hidden" style={{ perspective: '2000px' }}>
                <div
                    ref={zoomContainerRef}
                    className="relative w-full h-full preserve-3d"
                    style={{ transform: 'translate3d(0, 0, 0px)', transition: 'transform 0.12s linear' }}
                >
                    {/* Floating Images */}
                    {FLOATING_IMAGES.map((img, i) => (
                        <FloatingImage key={i} {...img} />
                    ))}

                    {/* Headline layer — now inside the preserve-3d container for 3D zoom */}
                    <div
                        className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none hero-headline-container"
                        style={{ zIndex: 1100, transform: 'translate3d(0, 0, 0)' }}
                    >
                        <HeroHeadline wordIndex={wordIndex} progress={localProgress} />
                    </div>
                </div>
            </div>
        </div>
    );
});
