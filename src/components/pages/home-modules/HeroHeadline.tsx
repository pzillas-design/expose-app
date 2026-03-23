import React, { useRef, useEffect, memo } from 'react';

const ANIMATED_WORDS = ['more', 'faster', 'better'] as const;

interface HeroHeadlineProps {
    progress: number;
}

export const HeroHeadline: React.FC<HeroHeadlineProps> = memo(({ progress }) => {
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

    const isFadingOut = progress > 0.85;
    const fadeOutProgress = isFadingOut ? (progress - 0.85) / 0.15 : 0;

    return (
        <div
            className="hero-headline font-kumbh font-bold tracking-tighter select-none w-full"
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
             * Mobile: flex column, each row is text-center + w-full
             * Desktop: flex row, baseline-aligned
             */}
            <span className="flex flex-col items-center md:flex-row md:justify-center md:items-baseline">

                {/* Static "create" */}
                <span className="text-zinc-900 dark:text-white md:mr-[0.18em]">create</span>

                {/*
                 * Animated word slot.
                 * The invisible "better" (longest word) gives the container its natural width
                 * so inline-block works on desktop. All animated words are absolute within it.
                 */}
                <span
                    className="relative inline-block overflow-hidden"
                    style={{ height: '1.2em', verticalAlign: 'bottom' }}
                >
                    {/* Invisible sizer: takes up max word width */}
                    <span className="invisible px-[0.08em]" aria-hidden>better</span>

                    {ANIMATED_WORDS.map((word, i) => {
                        const isActive = i === wordIndex;
                        const isPast = i < wordIndex;

                        return (
                            <span
                                key={word}
                                aria-hidden={!isActive}
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '0',
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
            </span>
        </div>
    );
});
