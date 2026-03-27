import React, { useState, useEffect, useRef } from 'react';
import { HeroStage } from './HeroStage';
import { IterativeParallelStage } from './IterativeParallelStage';
import { EditorialTilesStage } from './EditorialTilesStage';
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

    useEffect(() => {
        let active = true;
        let animationFrameId: number;
        trackRef.current = document.querySelector('[data-hero-scroll-track]') as HTMLElement;

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
            const track = trackRef.current;
            if (track) {
                const rect = track.getBoundingClientRect();
                const travelDistance = rect.height - window.innerHeight;
                const p = Math.min(Math.max(-rect.top / travelDistance, 0), 1);
                targetP.current = p;
                cancelAnimationFrame(animationFrameId);
                animationFrameId = requestAnimationFrame(updateLoop);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => {
            active = false;
            window.removeEventListener('scroll', handleScroll);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const getLocalProgress = (range: [number, number]) => {
        const [start, end] = range;
        return Math.min(Math.max((progress - start) / (end - start), 0), 1);
    };

    const heroProgress = getLocalProgress([0, 0.18]);
    const ipProgress = getLocalProgress([0.18, 0.38]);
    const editorialProgress = getLocalProgress([0.38, 0.58]);
    const templateProgress = getLocalProgress([0.58, 0.80]);
    const vpProgress = getLocalProgress([0.84, 1.0]);

    const transition12 = getLocalProgress([0.16, 0.24]);
    const transition23 = getLocalProgress([0.36, 0.44]);
    const transition34 = getLocalProgress([0.56, 0.64]);
    const transition45 = getLocalProgress([0.78, 0.86]);

    return (
        <div ref={containerRef} className="sticky top-0 h-screen w-full overflow-hidden bg-white dark:bg-zinc-950">
            {/* Hero is always mounted — no unmount/remount flicker. Visibility via opacity.
                Clean cut at 0.20: Hero fully owns 0-0.20, Section 2 starts at 0.20. No overlap. */}
            <HeroStage
                progress={progress}
                scrollActive={progress <= 0.16}
            />

            {progress > 0.14 && progress <= 0.44 && (
                <IterativeParallelStage
                    progress={ipProgress}
                    scrollActive={progress > 0.16 && progress <= 0.40}
                    exitProgress={transition12}
                    t={t}
                    lang={lang}
                />
            )}

            {progress > 0.34 && progress <= 0.66 && (
                <EditorialTilesStage
                    progress={editorialProgress}
                    scrollActive={progress > 0.40 && progress <= 0.60}
                    enterProgress={transition23}
                    exitProgress={transition34}
                    t={t}
                    lang={lang}
                />
            )}

            {progress > 0.52 && progress <= 0.90 && (
                <TemplatesStage
                    progress={templateProgress}
                    scrollActive={progress > 0.60 && progress <= 0.82}
                    enterProgress={transition34}
                    exitProgress={transition45}
                    t={t}
                />
            )}

            {progress > 0.76 && (
                <VisualPromptingStage
                    progress={vpProgress}
                    scrollActive={progress > 0.82}
                    enterProgress={transition45}
                    t={t}
                />
            )}
        </div>
    );
};
