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
        let lastScrollTop = window.scrollY;

        const handleScroll = () => {
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
                    const direction = window.scrollY > lastScrollTop ? 'down' : 'up';
                    lastScrollTop = window.scrollY;

                    setProgress(prev => {
                        const newP = Math.abs(p - prev) > threshold ? p : prev;
                        
                        clearTimeout(snapTimeout);
                        snapTimeout = setTimeout(() => {
                            const snapPoints = [0, 0.22, 0.45, 0.85];
                            
                            // Find nearest snap point
                            let nearest = 0;
                            let minDistance = 1;
                            snapPoints.forEach(sp => {
                                const dist = Math.abs(p - sp);
                                if (dist < minDistance) {
                                    minDistance = dist;
                                    nearest = sp;
                                }
                            });

                            // SMART DIRECTIONAL OVERRIDE: 
                            // If user is between two sections and scrolling UP, prefer the earlier section
                            if (direction === 'up') {
                                if (p > 0.1 && p < 0.2) nearest = 0;
                                else if (p > 0.3 && p < 0.44) nearest = 0.22;
                                else if (p > 0.6 && p < 0.84) nearest = 0.45;
                            } else {
                                // If scrolling DOWN, prefer the next section
                                if (p > 0.12 && p < 0.25) nearest = 0.22;
                                else if (p > 0.35 && p < 0.5) nearest = 0.45;
                                else if (p > 0.7 && p < 0.9) nearest = 0.85;
                            }

                            const finalDistance = Math.abs(p - nearest);
                            // Magnetic zone: 0.015 to 0.12 (increased from 0.08 for better sensitivity)
                            if (finalDistance > 0.015 && finalDistance < 0.12) {
                                window.scrollTo({
                                    top: track.offsetTop + (nearest * travelDistance),
                                    behavior: 'smooth'
                                });
                            }
                        }, 350); 

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
