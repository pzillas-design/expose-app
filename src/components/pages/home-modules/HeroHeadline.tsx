import React, { useRef, useEffect } from 'react';

const ANIMATED_WORDS = ['more', 'faster', 'better'] as const;

interface HeroHeadlineProps {
    /** Local scroll progress 0–1 within the hero section */
    progress: number;
}

export const HeroHeadline: React.FC<HeroHeadlineProps> = ({ progress }) => {
    // more → faster → better, all early in the scroll
    const wordIndex = progress < 0.12 ? 0 : progress < 0.28 ? 1 : 2;
    const prevIndexRef = useRef(wordIndex);

    useEffect(() => {
        prevIndexRef.current = wordIndex;
    }, [wordIndex]);

    const gradientStyle = {
        background: 'linear-gradient(90deg, #f97316, #dc2626)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
    } as React.CSSProperties;

    const transition = 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s cubic-bezier(0.16, 1, 0.3, 1)';

    // Fade out the headline at the very end of the hero section with a swoosh up
    const isFadingOut = progress > 0.85;
    const fadeOutProgress = isFadingOut ? (progress - 0.85) / 0.15 : 0; // 0→1

    return (
        <div
            className="hero-headline font-kumbh font-bold tracking-tighter text-center select-none flex flex-col md:block items-center"
            style={{
                fontSize: 'clamp(4.55rem, 14.3vw, 10.4rem)',
                lineHeight: 1,
                // Swoosh up + fade out at end of hero section
                ...(isFadingOut ? {
                    opacity: 1 - fadeOutProgress,
                    transform: `translateY(${-fadeOutProgress * 60}px)`,
                    filter: `blur(${fadeOutProgress * 12}px)`,
                    transition: 'none',
                } : {}),
            }}
        >
            {/* Static "create" */}
            <span className="text-zinc-900 dark:text-white">create </span>

            {/* Animated word slot */}
            <span className="relative flex md:inline-flex overflow-hidden align-baseline" style={{ height: '1.2em' }}>
                {ANIMATED_WORDS.map((word, i) => {
                    const isActive = i === wordIndex;
                    const isPast = i < wordIndex;

                    return (
                        <span
                            key={word}
                            aria-hidden={!isActive}
                            style={{
                                position: isActive ? 'relative' : 'absolute',
                                left: 0,
                                display: 'inline-block',
                                opacity: isActive ? 1 : 0,
                                transform: isActive
                                    ? 'translateY(0) scale(1)'
                                    : isPast
                                        ? 'translateY(-110%) scale(0.7)'
                                        : 'translateY(110%) scale(0.7)',
                                filter: isActive ? 'blur(0px)' : 'blur(8px)',
                                transition,
                                willChange: 'transform, opacity, filter',
                                ...gradientStyle,
                            }}
                        >
                            {word}
                        </span>
                    );
                })}
            </span>
        </div>
    );
};
