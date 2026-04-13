import React, { useState, useEffect, useRef } from 'react';
import { HeroStage } from './HeroStage';
import { IterativeParallelStage } from './IterativeParallelStage';
import { TemplatesStage } from './TemplatesStage';
import { VisualPromptingStage } from './VisualPromptingStage';

export interface UniversalStageProps {
    t: (key: string) => string;
    lang?: string;
}

export const UniversalStage: React.FC<UniversalStageProps> = ({ t, lang }) => {
    const [progress, setProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLElement | null>(null);

    const targetP = useRef(0);
    const currentP = useRef(0);
    // Cache track geometry to avoid getBoundingClientRect() on every scroll event
    const trackTopCached = useRef(0);
    const travelDistanceCached = useRef(1);

    const cacheTrackGeometry = () => {
        const track = trackRef.current;
        if (track) {
            const rect = track.getBoundingClientRect();
            trackTopCached.current = rect.top + window.scrollY;
            travelDistanceCached.current = Math.max(rect.height - window.innerHeight, 1);
        }
    };

    useEffect(() => {
        let active = true;
        let animationFrameId: number;
        trackRef.current = document.querySelector('[data-hero-scroll-track]') as HTMLElement;
        cacheTrackGeometry();

        const updateLoop = () => {
            if (!active) return;
            const delta = targetP.current - currentP.current;

            if (Math.abs(delta) > 0.0001) {
                currentP.current += delta * 0.15; // Smoothing factor
                setProgress(currentP.current);
                animationFrameId = requestAnimationFrame(updateLoop);
            } else {
                currentP.current = targetP.current;
                setProgress(currentP.current);
            }
        };

        const handleScroll = () => {
            const p = Math.min(Math.max(
                (window.scrollY - trackTopCached.current) / travelDistanceCached.current,
                0), 1);
            targetP.current = p;
            cancelAnimationFrame(animationFrameId);
            animationFrameId = requestAnimationFrame(updateLoop);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', cacheTrackGeometry, { passive: true });
        handleScroll();
        return () => {
            active = false;
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', cacheTrackGeometry);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const getLocalProgress = (range: [number, number]) => {
        const [start, end] = range;
        return Math.min(Math.max((progress - start) / (end - start), 0), 1);
    };

    const heroProgress = getLocalProgress([0, 0.22]);
    const ipProgress = getLocalProgress([0.22, 0.45]);
    const templateProgress = getLocalProgress([0.45, 0.70]);
    const vpProgress = getLocalProgress([0.8, 1.0]);

    // Transition overlap for Sec 2 -> Sec 3
    const transition23 = getLocalProgress([0.4, 0.5]);
    // Transition overlap for Sec 3 -> Sec 4 (slightly later to allow generation to finish)
    const transition34 = getLocalProgress([0.7, 0.8]);

    return (
        <div ref={containerRef} className="sticky top-0 h-screen w-full overflow-hidden bg-white dark:bg-zinc-950">
            {/* Hero is always mounted — no unmount/remount flicker. Visibility via opacity.
                Clean cut at 0.20: Hero fully owns 0-0.20, Section 2 starts at 0.20. No overlap. */}
            <HeroStage
                progress={progress}
                scrollActive={progress <= 0.20}
            />

            {progress > 0.18 && progress <= 0.58 && (
                <IterativeParallelStage
                    progress={ipProgress}
                    scrollActive={progress > 0.20 && progress <= 0.5}
                    exitProgress={transition23}
                    t={t}
                    lang={lang}
                />
            )}

            {progress > 0.32 && progress <= 0.88 && (
                <TemplatesStage
                    progress={templateProgress}
                    scrollActive={progress > 0.4 && progress <= 0.8}
                    enterProgress={transition23}
                    exitProgress={transition34}
                    t={t}
                />
            )}

            {progress > 0.62 && (
                <VisualPromptingStage
                    progress={vpProgress}
                    scrollActive={progress > 0.7}
                    enterProgress={transition34}
                    t={t}
                />
            )}
        </div>
    );
};
