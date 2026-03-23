import React, { useState } from 'react';
import { HeroHeadline } from './HeroHeadline';

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
                transform: `translate3d(0, 0, ${depth}px) ${isHovered ? 'scale(1.05)' : 'scale(1)'}`,
                zIndex: Math.floor(depth) + 1000,
                '--base-vw': sizeVal,
                willChange: 'transform'
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

    const floatingImagesV1 = [
        { src: '/home/1 creation reimagined/4.jpeg', x: '-12%', y: '78%', depth: -300, size: '38vw' },   // wide landscape, bottom-left
        { src: '/home/1 creation reimagined/2.jpeg', x: '78%', y: '2%', depth: -500, size: '30vw' },     // tall portrait, top-right
        { src: '/home/1 creation reimagined/9.jpeg', x: '42%', y: '92%', depth: -150, size: '19vw' },    // wide, bottom-center peek
        { src: '/home/1 creation reimagined/7.jpeg', x: '-18%', y: '-5%', depth: -950, size: '46vw' },   // wide landscape, top-left deep
        { src: '/home/1 creation reimagined/1.jpeg', x: '88%', y: '82%', depth: -400, size: '28vw' },    // square, bottom-right
        { src: '/home/1 creation reimagined/5.jpeg', x: '72%', y: '45%', depth: -800, size: '26vw' },    // tall portrait, mid-right deep
        { src: '/home/1 creation reimagined/3.jpeg', x: '32%', y: '-8%', depth: -600, size: '24vw' },    // square-ish, top-center
        { src: '/home/1 creation reimagined/8.jpeg', x: '8%', y: '40%', depth: -1200, size: '22vw' },    // wide, mid-left very deep
        { src: '/home/1 creation reimagined/6.jpeg', x: '55%', y: '60%', depth: -700, size: '20vw' },    // wide landscape, center-right
    ];

    const floatingImagesV3 = [
        { src: '/home/1 creation reimagined/4.jpeg', x: '-15%', y: '10%', depth: -200, size: '45vw' },    // Very close, large, top-left
        { src: '/home/1 creation reimagined/2.jpeg', x: '70%', y: '75%', depth: -400, size: '35vw' },     // Middle-close, bottom-right
        { src: '/home/1 creation reimagined/9.jpeg', x: '10%', y: '85%', depth: -1200, size: '25vw' },    // Very deep, bottom-left
        { src: '/home/1 creation reimagined/7.jpeg', x: '80%', y: '-15%', depth: -600, size: '38vw' },    // Deep-ish, top-right
        { src: '/home/1 creation reimagined/5.jpeg', x: '45%', y: '95%', depth: -900, size: '20vw' },     // Deep, center-bottom
        { src: '/home/1 creation reimagined/3.jpeg', x: '-20%', y: '60%', depth: -1500, size: '30vw' },   // Very deep, far-left
        { src: '/home/1 creation reimagined/8.jpeg', x: '25%', y: '-20%', depth: -800, size: '22vw' },    // Deep, top-left
        { src: '/home/1 creation reimagined/6.jpeg', x: '55%', y: '15%', depth: -1100, size: '28vw' },    // Deep, center-right
        { src: '/home/1 creation reimagined/1.jpeg', x: '85%', y: '40%', depth: -300, size: '24vw' },     // Middle-close, far-right (Added back for V3 as a variant)
    ];

    const floatingImages = floatingImagesV3;

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
                        font-size: clamp(4.55rem, 15.6vw, 11rem) !important;
                    }
                }
            `}</style>
            
            {/* Background Gradients - Shared with ContactPage for brand consistency */}
            <div className="absolute top-1/4 -left-24 md:-left-20 w-64 md:w-80 h-64 md:h-80 bg-orange-500/13 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-24 md:-right-20 w-64 md:w-80 h-64 md:h-80 bg-red-600/13 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full h-full" style={{ perspective: '1000px' }}>
                <div
                    className="relative w-full h-full preserve-3d lg:transition-transform lg:duration-500 lg:ease-out"
                    style={{ transform: `translate3d(0, 0, ${scrollDepth}px)`, willChange: 'transform' }}
                >
                    {/* Hero Text Headline Layer */}
                    <div
                        className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none hero-headline-container"
                        style={{
                            transform: 'translate3d(0, 0, 50px)',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                        }}
                    >
                        <HeroHeadline progress={localProgress} />
                    </div>

                    {floatingImages.map((img, i) => (
                        <FloatingImage key={i} {...img} />
                    ))}
                </div>
            </div>
        </div>
    );
};
