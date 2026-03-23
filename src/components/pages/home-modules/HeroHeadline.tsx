import React, { useRef, useEffect, memo } from 'react';

const ANIMATED_WORDS = ['more', 'faster', 'better'] as const;

interface HeroHeadlineProps {
    /** Local scroll progress 0–1 within the hero section */
    progress: number;
}

export const HeroHeadline: React.FC<HeroHeadlineProps> = memo(({ progress }) => {
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
            className="hero-headline font-kumbh font-bold tracking-tighter select-none w-full text-center"
            style={{
                fontSize: 'clamp(4.55rem, 14.3vw, 10.4rem)',
                lineHeight: 1.1,
                ...(isFadingOut ? {
                    opacity: 1 - fadeOutProgress,
                    transform: `translateY(${-fadeOutProgress * 60}px)`,
                    filter: `blur(${fadeOutProgress * 12}px)`,
                    transition: 'none',
                } : {}),
            }}
        >
            {/*
             * CENTERING FIX:
             * On mobile we render "create" and the animated word as two separate block lines,
             * both inside a w-full text-center parent. This guarantees the browser centres
             * each line independently with no flex/inline quirks.
             * On desktop (md+) we use inline-block for both so they flow on one line.
             */}

            {/* Static "create" */}
            <span className="text-zinc-900 dark:text-white block md:inline-block md:mr-[0.18em]">create</span>

            {/* Animated word slot — block on mobile (full-width, text-center inherited), inline-block on desktop */}
            <span
                className="relative block md:inline-block overflow-hidden"
                style={{
                    height: '1.25em',
                    verticalAlign: 'bottom',
                }}
            >
                {ANIMATED_WORDS.map((word, i) => {
                    const isActive = i === wordIndex;
                    const isPast = i < wordIndex;

                    return (
                        <span
                            key={word}
                            aria-hidden={!isActive}
                            style={{
                                position: 'absolute',
                                // Center each word within the slot on both mobile and desktop
                                left: '50%',
                                transform: isActive
                                    ? 'translateX(-50%) translateY(0) scale(1)'
                                    : isPast
                                        ? 'translateX(-50%) translateY(-110%) scale(0.7)'
                                        : 'translateX(-50%) translateY(110%) scale(0.7)',
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                                padding: '0 0.08em',
                                opacity: isActive ? 1 : 0,
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
});
