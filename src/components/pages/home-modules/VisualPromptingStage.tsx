import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

const AnnotationChip = ({ label, position, opacity }: {
    label: string;
    position: { top?: string; bottom?: string; left?: string; right?: string };
    opacity: number;
}) => (
    <div
        className="absolute z-60 will-change-transform"
        style={{
            ...position,
            opacity,
            transform: `scale(${opacity > 0 ? 1 : 0.8})`,
        }}
    >
        <div className="relative flex flex-col items-center">

            <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 flex items-center gap-3">
                <span className="text-base font-medium text-white">{label}</span>
                <X className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="w-3 h-3 bg-zinc-900 rotate-45 -mt-[6px] border-r border-b border-white/10" />
        </div>
    </div>
);

export interface VisualPromptingStageProps {
    progress: number; // Local progress [0, 1]
    scrollActive: boolean;
    enterProgress?: number; // 0 -> 1 (100% -> 0% translateY)
}

export const VisualPromptingStage: React.FC<VisualPromptingStageProps> = ({ progress, scrollActive, enterProgress = 1 }) => {
    // Refs for internal animations
    const image2Ref = useRef<HTMLImageElement>(null);
    const lampRef = useRef<SVGSVGElement>(null);
    const lampPath1Ref = useRef<SVGPathElement>(null);
    const lampPath2Ref = useRef<SVGPathElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    // Standardize easing to remove wobble: Exact match with TemplatesStage
    const easedEnter = enterProgress < 0.5 ? 2 * enterProgress * enterProgress : 1 - Math.pow(-2 * enterProgress + 2, 2) / 2;

    // 1. Scroll-Driven Intro (Chips & Lamp) - Replaces Auto-Play
    const introProgress = Math.min(Math.max(progress / 0.25, 0), 1);

    // Zoom Effect: 1.05 -> 1.0 (Zoom Out) over the course of the section
    const zoomScale = 1.05 - Math.max(0, progress * 0.05);

    // 2. Fixed-Timing Progress Bar & Auto-Fade
    const [barProgress, setBarProgress] = React.useState(0);
    const [imageFade, setImageFade] = React.useState(0);
    const sequenceStartedRef = useRef(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        let animationFrameId: number;

        if (introProgress < 0.5 && sequenceStartedRef.current) {
            sequenceStartedRef.current = false;
            setBarProgress(0);
            setImageFade(0);
            return;
        }

        if (introProgress >= 1 && !sequenceStartedRef.current) {
            sequenceStartedRef.current = true;

            timer = setTimeout(() => {
                const startTime = Date.now();
                const barDuration = 1500;
                const fadeDuration = 800;

                const animateSequence = () => {
                    const elapsed = Date.now() - startTime;

                    if (elapsed < barDuration) {
                        const p = elapsed / barDuration;
                        setBarProgress(Math.pow(p, 2));
                    } else {
                        setBarProgress(1);
                        const fadeElapsed = elapsed - barDuration;
                        const fp = Math.min(fadeElapsed / fadeDuration, 1);
                        setImageFade(fp);
                    }

                    if (elapsed < barDuration + fadeDuration) {
                        animationFrameId = requestAnimationFrame(animateSequence);
                    }
                };
                animationFrameId = requestAnimationFrame(animateSequence);
            }, 500);
        }

        return () => {
            clearTimeout(timer);
            cancelAnimationFrame(animationFrameId);
        };
    }, [introProgress]);


    // 3. Scroll-Driven Outro: Image & Fades (Reversible)
    const outroProgress = Math.min(Math.max((progress - 0.75) / 0.25, 0), 1);

    useEffect(() => {
        const drawProgress = Math.min(Math.max((introProgress - 0.4) / 0.6, 0), 1);
        const stemProgress = Math.min(drawProgress / 0.4, 1);
        const easedStem = stemProgress < 0.5 ? 2 * stemProgress * stemProgress : 1 - Math.pow(-2 * stemProgress + 2, 2) / 2;

        const shadeProgress = Math.max((drawProgress - 0.2) / 0.8, 0);
        const easedShade = shadeProgress < 0.5 ? 2 * shadeProgress * shadeProgress : 1 - Math.pow(-2 * shadeProgress + 2, 2) / 2;

        const resultFade = Math.min(Math.max(outroProgress / 0.3, 0), 1);
        const lampFadeOut = Math.min(Math.max((outroProgress - 0.3) / 0.3, 0), 1);

        if (lampRef.current) {
            const baseOpacity = drawProgress > 0 ? 1 : 0;
            const effectiveFadeOut = Math.max(lampFadeOut, imageFade);
            const finalOpacity = Math.max(baseOpacity - effectiveFadeOut, 0);
            lampRef.current.style.opacity = finalOpacity.toString();
        }

        if (lampPath1Ref.current) {
            const length = 400;
            lampPath1Ref.current.style.strokeDasharray = `${length}`;
            lampPath1Ref.current.style.strokeDashoffset = `${length * (1 - easedStem)}`;
        }
        if (lampPath2Ref.current) {
            const length = 1000;
            lampPath2Ref.current.style.strokeDasharray = `${length}`;
            lampPath2Ref.current.style.strokeDashoffset = `${length * (1 - easedShade)}`;
        }

        if (progressBarRef.current) {
            progressBarRef.current.style.width = `${barProgress * 100}%`;
            progressBarRef.current.style.opacity = (barProgress > 0 && imageFade < 1 && outroProgress < 0.1) ? '1' : '0';
        }

        if (image2Ref.current) {
            const finalImageOpacity = Math.max(resultFade, imageFade);
            image2Ref.current.style.opacity = finalImageOpacity.toString();
        }

    }, [introProgress, outroProgress, barProgress, imageFade]);

    const labelOpacity = (appearTime: number, fadeOutTime: number) => {
        if (introProgress < appearTime) return 0;
        if (imageFade > 0) return 1 - imageFade;
        if (introProgress < 0.4) {
            if (introProgress >= appearTime) return Math.min((introProgress - appearTime) / 0.1, 1);
        }
        if (outroProgress > fadeOutTime) return Math.max(1 - (outroProgress - fadeOutTime) / 0.1, 0);
        return 1;
    };

    const typoOpacity = (typeof window !== 'undefined' && window.innerWidth < 1024)
        ? 1
        : Math.max(0, 1 - Math.max(outroProgress / 0.3, imageFade));

    return (
        <div
            className="absolute inset-0 flex flex-col lg:items-center lg:justify-center transition-opacity duration-700"
            style={{
                opacity: scrollActive ? 1 : 0,
                pointerEvents: scrollActive ? 'auto' : 'none',
                transform: `translateY(${(1 - easedEnter) * 100}vh)`
            }}
        >
            <div
                className="relative h-[45vh] lg:h-full w-full lg:absolute lg:inset-0 z-0 overflow-hidden will-change-transform pt-40 lg:pt-0"
                style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center', transition: 'transform 0.1s linear' }}
            >
                <div className="absolute inset-0">
                    <img src="/home/4 visual promting/1.jpg" className="absolute inset-0 w-full h-full object-cover opacity-50" alt="" />
                    <img ref={image2Ref} src="/home/4 visual promting/2.jpg" className="absolute inset-0 w-full h-full object-cover opacity-0 z-10" alt="" />
                </div>

                <div className="absolute inset-0 pointer-events-none z-[110] flex items-center justify-center overflow-hidden">
                    <div className="relative aspect-[3/2] min-w-full min-h-full flex-none scale-[0.8] lg:scale-100">
                        <AnnotationChip label="Küche" position={{ top: '45%', left: '27%' }} opacity={labelOpacity(0.02, 0.6)} />
                        <AnnotationChip label="Esstisch" position={{ bottom: '25%', left: '20%' }} opacity={labelOpacity(0.14, 0.7)} />
                        <AnnotationChip label="Sofa" position={{ bottom: '20%', right: '20%' }} opacity={labelOpacity(0.26, 0.8)} />

                        <svg ref={lampRef} viewBox="0 0 1700 1141" fill="none" className="absolute inset-0 w-full h-full opacity-0 z-10 lg:transition-all lg:duration-500">
                            <path ref={lampPath1Ref} d="M449.761 177.57C445.213 305 444.653 357.523 449.761 393.07" stroke="#ED693D" strokeWidth="8" strokeLinecap="round" />
                            <path ref={lampPath2Ref} d="M536.84 384.305C529.849 377.695 497.722 364.971 425.139 366.954C334.411 369.433 232.284 421.484 390.489 437.347C548.694 453.211 674.528 379.843 476.202 353.57" stroke="#ED693D" strokeWidth="8" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
            </div>

            <div ref={progressBarRef} className="absolute top-0 left-0 h-[3px] bg-orange-500 z-[120] transition-all duration-300" style={{ width: '0%' }} />

            <div
                className="relative h-[35vh] lg:h-full lg:absolute lg:inset-0 lg:z-[5] z-[100] container mx-auto px-6 lg:px-12 2xl:px-16 flex flex-col items-center justify-center text-center pointer-events-none bg-white dark:bg-zinc-950 lg:bg-transparent lg:dark:bg-transparent transition-opacity duration-500 py-8 lg:py-0"
                style={{ opacity: typoOpacity }}
            >
                <div className="flex flex-col max-w-xl lg:max-w-4xl pointer-events-auto">
                    <h2 className="text-3xl sm:text-5xl lg:text-7xl xl:text-8xl font-kumbh font-semibold tracking-tighter text-zinc-900 dark:text-white mb-4 lg:mb-8 leading-[1.1] lg:leading-[1.1]">
                        Visual <br className="hidden lg:block" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Prompting</span>
                    </h2>
                    <p className="text-base sm:text-xl lg:text-2xl text-zinc-500 dark:text-zinc-400 leading-relaxed font-light">
                        Sagen Sie der KI nicht nur was, sondern zeigen Sie ihr exakt wo.
                    </p>
                </div>
            </div>
        </div>
    );
};
