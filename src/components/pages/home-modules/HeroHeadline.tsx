import React, { useRef, useEffect } from 'react';

const WORDS = ['create', 'more', 'faster', 'better'] as const;

interface HeroHeadlineProps {
    /** Local scroll progress 0–1 within the hero section */
    progress: number;
}

export const HeroHeadline: React.FC<HeroHeadlineProps> = ({ progress }) => {
    // create → more → faster → better, all early in the scroll
    const wordIndex = progress < 0.06 ? 0 : progress < 0.14 ? 1 : progress < 0.22 ? 2 : 3;
    const prevIndexRef = useRef(wordIndex);

    const direction = wordIndex > prevIndexRef.current ? 1 : wordIndex < prevIndexRef.current ? -1 : 0;

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

    return (
        <div
            className="hero-headline font-kumbh font-bold tracking-tighter text-center select-none whitespace-nowrap"
            style={{ fontSize: 'clamp(3.5rem, 11vw, 8rem)', lineHeight: 1 }}
        >
            <span className="relative inline-flex overflow-hidden align-bottom" style={{ height: '1.05em' }}>
                {WORDS.map((word, i) => {
                    const isActive = i === wordIndex;
                    const isFirst = i === 0;

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
                                    : `translateY(${direction >= 0 ? 110 : -110}%) scale(0.7)`,
                                filter: isActive ? 'blur(0px)' : 'blur(8px)',
                                transition,
                                willChange: 'transform, opacity, filter',
                                ...(isFirst
                                    ? { color: undefined }
                                    : gradientStyle),
                            }}
                            className={isFirst ? 'text-zinc-900 dark:text-white' : undefined}
                        >
                            {word}
                        </span>
                    );
                })}
            </span>
        </div>
    );
};
