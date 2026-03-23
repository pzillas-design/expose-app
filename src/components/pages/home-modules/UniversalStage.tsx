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
        let snapTimeout: NodeJS.Timeout;
        let isUserScrolling = false;

        const handleScroll = () => {
            isUserScrolling = true;
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                const track = document.querySelector('[data-hero-scroll-track]') as HTMLElement;
                if (track) {
                    const rect = track.getBoundingClientRect();
                    const windowHeight = window.innerHeight;
                    const travelDistance = rect.height - windowHeight;
                    const p = Math.min(Math.max(-rect.top / travelDistance, 0), 1);
                    
                    const threshold = window.innerWidth < 1024 ? 0.007 : 0.0015;
                    setProgress(prev => {
                        const newP = Math.abs(p - prev) > threshold ? p : prev;
                        
                        // Handle Snapping after scroll stops
                        clearTimeout(snapTimeout);
                        snapTimeout = setTimeout(() => {
                            isUserScrolling = false;
                            // Targets for snapping (Hero, S2, S3, S4)
                            const snapPoints = [0, 0.22, 0.45, 0.85];
                            const currentP = p;
                            
                            // Find nearest snap point if we're close enough (within 0.08 range)
                            let nearest = snapPoints[0];
                            let minDistance = 1;
                            snapPoints.forEach(sp => {
                                const dist = Math.abs(currentP - sp);
                                if (dist < minDistance) {
                                    minDistance = dist;
                                    nearest = sp;
                                }
                            });

                            // Only snap if we are "close but not quite there" (between 0.015 and 0.08 distance)
                            if (minDistance > 0.015 && minDistance < 0.08) {
                                const targetScrollTop = rect.height * nearest;
                                // Smooth scroll to target
                                window.scrollTo({
                                    top: track.offsetTop + (nearest * (rect.height - windowHeight)),
                                    behavior: 'smooth'
                                });
                            }
                        }, 400); // 400ms after last scroll event

                        return newP;
                    });
                }
                ticking = false;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(snapTimeout);
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
