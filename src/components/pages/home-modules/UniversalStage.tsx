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

    useEffect(() => {
        let ticking = false;
        trackRef.current = document.querySelector('[data-hero-scroll-track]') as HTMLElement;

        const handleScroll = () => {
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                const track = trackRef.current;
                if (track) {
                    const rect = track.getBoundingClientRect();
                    const travelDistance = rect.height - window.innerHeight;
                    const p = Math.min(Math.max(-rect.top / travelDistance, 0), 1);

                    const threshold = window.innerWidth < 1024 ? 0.007 : 0.0015;
                    setProgress(prev => Math.abs(p - prev) > threshold ? p : prev);
                }
                ticking = false;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
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
