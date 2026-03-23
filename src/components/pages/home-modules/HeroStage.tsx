import React, { useState, memo } from 'react';
import { HeroHeadline } from './HeroHeadline';

interface FloatingImageProps {
    src: string;
    depth: number;
    x: string;
    y: string;
    size: string;
    key?: React.Key;
}

const FloatingImage = memo(({ src, depth, x, y, size }: FloatingImageProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const sizeVal = parseInt(size);

    return (
        <div
            className="absolute hero-floating-image"
            style={{
                left: x,
                top: `calc(50% + ((${y} - 50%) * var(--y-scale, 1)))`,
                // Mobile: 55% of desktop vw-size = smaller footprint, same layout
                width: `calc(var(--base-vw, ${sizeVal}) * var(--img-scale, 1) * 1vw)`,
                transform: `translate3d(0, 0, ${depth}px) ${isHovered ? 'scale(1.05)' : 'scale(1)'}`,
                transition: 'transform 0.4s ease-out',
                zIndex: Math.floor(depth) + 1000,
                '--base-vw': sizeVal,
                willChange: isHovered ? 'transform' : 'auto'
            } as any}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative group cursor-none">
                <img
                    src={src}
                    srcSet={`${src.replace('/home/1 creation reimagined/', '/home/1 creation reimagined/mobile/')} 600w, ${src} 2000w`}
                    sizes="(max-width: 1023px) 60vw, 40vw"
                    className="w-full h-full rounded-sm"
                    alt="Canvas Element"
                    loading="lazy"
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
    // Local progress for Hero: we want it to finish early (around 0.15 global)
    // Map global [0, 0.15] to local [0, 1]
    const localProgress = Math.min(progress / 0.15, 1);
    const opacity = localProgress > 0.9 ? (1 - localProgress) * 10 : 1;

    const floatingImagesV1 = [
        { src: '/home/1 creation reimagined/8.jpeg', x: '-12%', y: '85%', depth: -400, size: '34vw' },   // bottom-left (remixed V9)
        { src: '/home/1 creation reimagined/2.jpeg', x: '78%', y: '2%', depth: -500, size: '30vw' },     // tall portrait, top-right
        { src: '/home/1 creation reimagined/10.jpeg', x: '42%', y: '92%', depth: -150, size: '19vw' },    // wide, bottom-center peek (shuffled)
        { src: '/home/1 creation reimagined/7.jpeg', x: '-18%', y: '-5%', depth: -950, size: '46vw' },   // wide landscape, top-left deep
        { src: '/home/1 creation reimagined/3.jpeg', x: '90%', y: '75%', depth: -550, size: '26vw' },    // bottom-right (remixed V9)
        { src: '/home/1 creation reimagined/6.jpeg', x: '32%', y: '-8%', depth: -600, size: '24vw' },    // square-ish, top-center (shuffled)
        { src: '/home/1 creation reimagined/9.jpeg', x: '15%', y: '75%', depth: -1200, size: '30vw' },   // bottom-left deep (remixed)
        { src: '/home/1 creation reimagined/4.jpeg', x: '58%', y: '62%', depth: -750, size: '30vw' },    // center-right (remixed V9)
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

    const floatingImagesV4 = [
        { src: '/home/1 creation reimagined/4.jpeg', x: '-20%', y: '15%', depth: -300, size: '40vw' },    // far left, top-ish
        { src: '/home/1 creation reimagined/2.jpeg', x: '85%', y: '20%', depth: -500, size: '35vw' },     // far right, top-ish
        { src: '/home/1 creation reimagined/9.jpeg', x: '-15%', y: '80%', depth: -150, size: '25vw' },    // far left, bottom
        { src: '/home/1 creation reimagined/7.jpeg', x: '80%', y: '75%', depth: -950, size: '42vw' },     // far right, bottom deep
        { src: '/home/1 creation reimagined/10.jpeg', x: '92%', y: '45%', depth: -400, size: '22vw' },    // right edge mid
        { src: '/home/1 creation reimagined/3.jpeg', x: '-25%', y: '40%', depth: -600, size: '30vw' },    // left edge mid
        { src: '/home/1 creation reimagined/8.jpeg', x: '10%', y: '-15%', depth: -1200, size: '28vw' },   // top deep
        { src: '/home/1 creation reimagined/6.jpeg', x: '50%', y: '95%', depth: -700, size: '18vw' },     // bottom middle deep
    ];

    const floatingImagesV5 = [
        { src: '/home/1 creation reimagined/4.jpeg', x: '10%', y: '-10%', depth: -400, size: '35vw' },   // top-left
        { src: '/home/1 creation reimagined/2.jpeg', x: '60%', y: '5%', depth: -600, size: '30vw' },    // top-right
        { src: '/home/1 creation reimagined/10.jpeg', x: '5%', y: '90%', depth: -200, size: '32vw' },    // bottom-left
        { src: '/home/1 creation reimagined/7.jpeg', x: '70%', y: '85%', depth: -800, size: '38vw' },   // bottom-right
        { src: '/home/1 creation reimagined/9.jpeg', x: '35%', y: '105%', depth: -350, size: '20vw' },   // bottom-center peek
        { src: '/home/1 creation reimagined/3.jpeg', x: '80%', y: '-20%', depth: -1100, size: '28vw' },  // top-far-right deep
        { src: '/home/1 creation reimagined/8.jpeg', x: '-15%', y: '0%', depth: -1300, size: '24vw' },   // top-far-left deep
        { src: '/home/1 creation reimagined/6.jpeg', x: '50%', y: '-15%', depth: -900, size: '18vw' },   // top-center deep
    ];

    const floatingImagesV6 = [
        { src: '/home/1 creation reimagined/4.jpeg', x: '50%', y: '10%', depth: -200, size: '25vw' },    // top-center
        { src: '/home/1 creation reimagined/2.jpeg', x: '82%', y: '28%', depth: -450, size: '28vw' },    // top-right
        { src: '/home/1 creation reimagined/10.jpeg', x: '88%', y: '72%', depth: -700, size: '32vw' },   // bottom-right
        { src: '/home/1 creation reimagined/7.jpeg', x: '52%', y: '92%', depth: -950, size: '36vw' },    // bottom-center
        { src: '/home/1 creation reimagined/9.jpeg', x: '12%', y: '78%', depth: -1200, size: '30vw' },   // bottom-left
        { src: '/home/1 creation reimagined/3.jpeg', x: '8%', y: '32%', depth: -1450, size: '26vw' },    // top-left
        { src: '/home/1 creation reimagined/8.jpeg', x: '28%', y: '52%', depth: -1700, size: '22vw' },   // inner-left deep
        { src: '/home/1 creation reimagined/6.jpeg', x: '72%', y: '48%', depth: -850, size: '20vw' },    // inner-right mid
    ];

    const floatingImagesV7 = [
        { src: '/home/1 creation reimagined/4.jpeg', x: '-10%', y: '5%', depth: -150, size: '48vw' },    // huge, top-left, very close
        { src: '/home/1 creation reimagined/2.jpeg', x: '75%', y: '15%', depth: -800, size: '22vw' },    // small, top-right, mid-deep
        { src: '/home/1 creation reimagined/10.jpeg', x: '45%', y: '85%', depth: -300, size: '30vw' },   // mid, bottom-center, close
        { src: '/home/1 creation reimagined/7.jpeg', x: '82%', y: '65%', depth: -1200, size: '42vw' },   // large, bottom-right, deep
        { src: '/home/1 creation reimagined/9.jpeg', x: '5%', y: '92%', depth: -500, size: '18vw' },     // small, bottom-left, mid-close
        { src: '/home/1 creation reimagined/3.jpeg', x: '15%', y: '-15%', depth: -1800, size: '35vw' },  // mid, far-top-left, very deep
        { src: '/home/1 creation reimagined/8.jpeg', x: '95%', y: '35%', depth: -400, size: '26vw' },    // mid, far-right-center, close
        { src: '/home/1 creation reimagined/6.jpeg', x: '-20%', y: '55%', depth: -1500, size: '20vw' },  // small, far-left-center, very deep
    ];

    const floatingImagesV8 = [
        { src: '/home/1 creation reimagined/4.jpeg', x: '-25%', y: '-10%', depth: -50, size: '55vw' },    // ultra-close, top-left
        { src: '/home/1 creation reimagined/2.jpeg', x: '85%', y: '85%', depth: -1800, size: '45vw' },   // ultra-deep, bottom-right
        { src: '/home/1 creation reimagined/10.jpeg', x: '15%', y: '105%', depth: -300, size: '25vw' },  // close, bottom-left
        { src: '/home/1 creation reimagined/7.jpeg', x: '65%', y: '-25%', depth: -1200, size: '60vw' },  // very deep, top-right huge
        { src: '/home/1 creation reimagined/9.jpeg', x: '45%', y: '50%', depth: -2200, size: '15vw' },   // ultra-deep, center tiny
        { src: '/home/1 creation reimagined/3.jpeg', x: '-15%', y: '45%', depth: -900, size: '20vw' },   // mid-deep, left
        { src: '/home/1 creation reimagined/8.jpeg', x: '95%', y: '10%', depth: -150, size: '35vw' },    // close, right
        { src: '/home/1 creation reimagined/6.jpeg', x: '20%', y: '15%', depth: -2500, size: '40vw' },   // deepest, top-left
    ];

    const floatingImagesV9 = [
        { src: '/home/1 creation reimagined/4.jpeg', x: '-30%', y: '-20%', depth: -100, size: '65vw' },    // Massive, very close, top-left
        { src: '/home/1 creation reimagined/2.jpeg', x: '90%', y: '90%', depth: -2500, size: '50vw' },    // Large, very deep, bottom-right
        { src: '/home/1 creation reimagined/10.jpeg', x: '10%', y: '110%', depth: -500, size: '20vw' },   // Small, bottom-left, mid-close
        { src: '/home/1 creation reimagined/7.jpeg', x: '70%', y: '-30%', depth: -1500, size: '55vw' },   // Large, far-top-right, deep
        { src: '/home/1 creation reimagined/9.jpeg', x: '50%', y: '50%', depth: -1000, size: '12vw' },    // Tiny, center, deep
        { src: '/home/1 creation reimagined/3.jpeg', x: '-25%', y: '55%', depth: -3000, size: '42vw' },   // Large, far-left, deepest
        { src: '/home/1 creation reimagined/8.jpeg', x: '105%', y: '20%', depth: -200, size: '38vw' },    // Mid-large, far-right, close
        { src: '/home/1 creation reimagined/6.jpeg', x: '0%', y: '0%', depth: -400, size: '15vw' },       // Small, top-left, close
    ];

    const floatingImagesV10 = [
        { src: '/home/1 creation reimagined/4.jpeg', x: '5%', y: '10%', depth: -300, size: '38vw' },     // top-left
        { src: '/home/1 creation reimagined/2.jpeg', x: '72%', y: '12%', depth: -600, size: '32vw' },    // top-right
        { src: '/home/1 creation reimagined/10.jpeg', x: '78%', y: '78%', depth: -200, size: '35vw' },   // bottom-right
        { src: '/home/1 creation reimagined/7.jpeg', x: '10%', y: '82%', depth: -900, size: '42vw' },    // bottom-left
        { src: '/home/1 creation reimagined/9.jpeg', x: '45%', y: '5%', depth: -1200, size: '20vw' },    // top-center deep
        { src: '/home/1 creation reimagined/3.jpeg', x: '88%', y: '45%', depth: -500, size: '26vw' },    // mid-right
        { src: '/home/1 creation reimagined/8.jpeg', x: '-12%', y: '48%', depth: -1400, size: '24vw' },   // mid-left deep
        { src: '/home/1 creation reimagined/6.jpeg', x: '48%', y: '92%', depth: -750, size: '18vw' },    // bottom-center
    ];

    const floatingImagesV11 = [
        { src: '/home/1 creation reimagined/4.jpeg', x: '-15%', y: '10%', depth: -150, size: '45vw' },    // Layer 1 (close)
        { src: '/home/1 creation reimagined/10.jpeg', x: '82%', y: '80%', depth: -250, size: '32vw' },    // Layer 1
        { src: '/home/1 creation reimagined/2.jpeg', x: '10%', y: '90%', depth: -800, size: '25vw' },     // Layer 2 (mid)
        { src: '/home/1 creation reimagined/7.jpeg', x: '75%', y: '15%', depth: -950, size: '40vw' },     // Layer 2
        { src: '/home/1 creation reimagined/9.jpeg', x: '45%', y: '50%', depth: -1900, size: '20vw' },    // Layer 3 (far)
        { src: '/home/1 creation reimagined/3.jpeg', x: '0%', y: '-10%', depth: -2100, size: '35vw' },    // Layer 3
        { src: '/home/1 creation reimagined/8.jpeg', x: '95%', y: '45%', depth: -500, size: '28vw' },     // Mid-layer
        { src: '/home/1 creation reimagined/6.jpeg', x: '35%', y: '105%', depth: -1400, size: '15vw' },   // Mid-deep
    ];

    const floatingImagesV12 = [
        { src: '/home/1 creation reimagined/10.jpeg', x: '-12%', y: '78%', depth: -300, size: '38vw' },   // wide landscape, bottom-left (was 4)
        { src: '/home/1 creation reimagined/7.jpeg', x: '78%', y: '2%', depth: -500, size: '30vw' },     // tall portrait, top-right (was 2)
        { src: '/home/1 creation reimagined/6.jpeg', x: '42%', y: '92%', depth: -150, size: '19vw' },    // wide, bottom-center peek (was 9)
        { src: '/home/1 creation reimagined/2.jpeg', x: '-18%', y: '-5%', depth: -950, size: '46vw' },   // wide landscape, top-left deep (was 7)
        { src: '/home/1 creation reimagined/4.jpeg', x: '88%', y: '82%', depth: -400, size: '28vw' },    // square, bottom-right (was 10)
        { src: '/home/1 creation reimagined/9.jpeg', x: '32%', y: '-8%', depth: -600, size: '24vw' },    // square-ish, top-center (was 3)
        { src: '/home/1 creation reimagined/3.jpeg', x: '12%', y: '82%', depth: -1150, size: '24vw' },   // wide, bottom-left very deep (was 8)
        { src: '/home/1 creation reimagined/8.jpeg', x: '55%', y: '60%', depth: -700, size: '20vw' },    // wide landscape, center-right (was 6)
    ];

    const floatingImages = floatingImagesV1;

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
                @media (max-width: 1023px) {
                    .hero-floating-image { --img-scale: 0.55; --y-scale: 0.7; }
                    .hero-headline-container { width: 85% !important; }
                    .hero-headline { font-size: clamp(4.5rem, 15.6vw, 10rem) !important; }
                }
                @media (min-width: 1024px) {
                    .hero-floating-image { --img-scale: 1; }
                }
            `}</style>
            

            <div className="w-full h-full" style={{ perspective: '1000px' }}>
                <div
                    className="relative w-full h-full preserve-3d"
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
});
