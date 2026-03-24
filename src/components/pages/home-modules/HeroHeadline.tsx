import React, { useRef, useEffect, memo } from 'react';

const ANIMATED_WORDS = ['more', 'faster', 'better'] as const;

const GRADIENT_STYLE: React.CSSProperties = {
    background: 'linear-gradient(90deg, #f97316, #dc2626)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
};

const WORD_TRANSITION = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';

interface HeroHeadlineProps {
    progress: number;
    wordIndex: number;
}

export const HeroHeadline: React.FC<HeroHeadlineProps> = memo(({ progress, wordIndex }) => {

    const isFadingOut = progress > 0.85;
    const fadeOutProgress = isFadingOut ? (progress - 0.85) / 0.15 : 0;

    return (
        <div
            className="hero-headline font-kumbh font-bold tracking-tighter select-none antialiased subpixel-antialiased"
            style={{
                lineHeight: 1.1,
                // These help prevent "shattered" font during flythrough
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transformStyle: 'preserve-3d',
                ...(isFadingOut ? {
                    opacity: 1 - fadeOutProgress,
                    transform: `translateY(${-fadeOutProgress * 60}px)`,
                    transition: 'none',
                } : {}),
            }}
        >
            {/*
             * CSS override: on desktop (md+) words are LEFT-aligned within the slot
             * so that ALL words have the same left-edge distance from "create".
             * On mobile they stay centered via translateX(-50%).
             */}
            <span className="flex flex-col items-center md:flex-row md:justify-center md:items-baseline">

                {/* Static "create" */}
                <span className="text-zinc-900 dark:text-white md:mr-[0.15em]">create</span>

                {/* Animated word slot — invisible "better" sizer sets container width */}
                <span
                    className="relative inline-block overflow-visible"
                    style={{ height: '1.2em', verticalAlign: 'bottom' }}
                >
                    <span className="invisible" aria-hidden>more&nbsp;</span>

                    {ANIMATED_WORDS.map((word, i) => {
                        const isActive = i === wordIndex;
                        const isPast = i < wordIndex;
                        const stateClass = isActive ? 'hero-word-active' : isPast ? 'hero-word-past' : 'hero-word-future';

                        return (
                            <span
                                key={word}
                                aria-hidden={!isActive}
                                className={`hero-word ${stateClass}`}
                                style={{
                                    position: 'absolute',
                                    // Mobile: center within full-width block. Desktop: overridden to left:0 via CSS above.
                                    left: '50%',
                                    top: '0',
                                    transform: isActive
                                        ? 'translateX(-50%) translateY(0) scale(1)'
                                        : isPast
                                            ? 'translateX(-50%) translateY(-110%) scale(0.7)'
                                            : 'translateX(-50%) translateY(110%) scale(0.7)',
                                    display: 'inline-block',
                                    whiteSpace: 'nowrap',
                                    opacity: isActive ? 1 : 0,
                                    transition: WORD_TRANSITION,
                                    willChange: 'transform, opacity',
                                    ...GRADIENT_STYLE,
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
