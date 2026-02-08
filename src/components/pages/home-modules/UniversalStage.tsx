import React from 'react';
import { HeroStage } from './HeroStage';
import { IterativeParallelStage } from './IterativeParallelStage';
import { TemplatesStage } from './TemplatesStage';
import { VisualPromptingStage } from './VisualPromptingStage';

export interface UniversalStageProps {
    progress: number; // Global progress [0, 1]
}

export const UniversalStage: React.FC<UniversalStageProps> = ({ progress }) => {
    // Stage Transitions mapping global [0, 1] to specific active sections
    // 0.00 - 0.20: Hero
    // 0.20 - 0.45: Iterative & Parallel
    // 0.45 - 0.70: Templates
    // 0.70 - 0.95: Visual Prompting
    // 0.95 - 1.00: Exit

    const getLocalProgress = (range: [number, number]) => {
        const [start, end] = range;
        return Math.min(Math.max((progress - start) / (end - start), 0), 1);
    };

    const heroProgress = getLocalProgress([0, 0.2]);
    const ipProgress = getLocalProgress([0.2, 0.45]);
    const templateProgress = getLocalProgress([0.45, 0.7]);
    const vpProgress = getLocalProgress([0.8, 1.0]);

    // Transition overlap for Sec 2 -> Sec 3
    const transition23 = getLocalProgress([0.4, 0.5]);
    // Transition overlap for Sec 3 -> Sec 4 (slightly later to allow generation to finish)
    const transition34 = getLocalProgress([0.7, 0.8]);

    return (
        <div className="sticky top-0 h-screen w-full overflow-hidden bg-white dark:bg-zinc-950">
            {/* Render stages conditionally to reduce DOM size and improve mobile performance */}

            {progress <= 0.3 && (
                <HeroStage
                    progress={progress}
                    scrollActive={progress <= 0.25}
                />
            )}

            {progress > 0.1 && progress <= 0.55 && (
                <IterativeParallelStage
                    progress={ipProgress}
                    scrollActive={progress > 0.15 && progress <= 0.5}
                    exitProgress={transition23}
                />
            )}

            {progress > 0.35 && progress <= 0.85 && (
                <TemplatesStage
                    progress={templateProgress}
                    scrollActive={progress > 0.4 && progress <= 0.8}
                    enterProgress={transition23}
                    exitProgress={transition34}
                />
            )}

            {progress > 0.65 && (
                <VisualPromptingStage
                    progress={vpProgress}
                    scrollActive={progress > 0.7}
                    enterProgress={transition34}
                />
            )}
        </div>
    );
};
