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
    // Stage Transitions mapping global [0, 1] to specific active sections
    // 0.00 - 0.20: Hero
    // 0.20 - 0.45: Iterative & Parallel
    // 0.45 - 0.70: Templates
    // 0.70 - 0.95: Visual Prompting
    // 0.95 - 1.00: Exit

    const [progress, setProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                // Find the parent track section (h-[1800vh])
                const track = document.querySelector('[data-hero-scroll-track]');
                if (track) {
                    const rect = track.getBoundingClientRect();
                    const windowHeight = window.innerHeight;
                    const travelDistance = rect.height - windowHeight;
                    const p = Math.min(Math.max(-rect.top / travelDistance, 0), 1);
                    
                    // Throttled React state update for structural stage changes
                    const threshold = window.innerWidth < 1024 ? 0.008 : 0.003;
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
            {/* Render stages conditionally based on throttled progress state */}
            {progress <= 0.35 && (
                <HeroStage
                    progress={progress}
                    scrollActive={progress <= 0.28}
                />
            )}

            {progress > 0.1 && progress <= 0.55 && (
                <IterativeParallelStage
                    progress={ipProgress}
                    scrollActive={progress > 0.15 && progress <= 0.5}
                    exitProgress={transition23}
                    t={t}
                    lang={lang}
                />
            )}

            {progress > 0.35 && progress <= 0.85 && (
                <TemplatesStage
                    progress={templateProgress}
                    scrollActive={progress > 0.4 && progress <= 0.8}
                    enterProgress={transition23}
                    exitProgress={transition34}
                    t={t}
                />
            )}

            {progress > 0.65 && (
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
