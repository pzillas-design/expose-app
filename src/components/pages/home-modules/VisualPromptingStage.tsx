import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

const AnnotationChip = React.forwardRef(({ label, position }: {
    label: string;
    position: { top?: string; bottom?: string; left?: string; right?: string };
}, ref: React.Ref<HTMLDivElement>) => (
    <div
        ref={ref}
        className="absolute z-60 will-change-transform opacity-0 scale-90"
        style={position}
    >
        <div className="relative flex flex-col items-center">
            <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 flex items-center gap-3">
                <span className="text-base font-medium text-white">{label}</span>
                <X className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="w-3 h-3 bg-zinc-900 rotate-45 -mt-[6px] border-r border-b border-white/10" />
        </div>
    </div>
));
AnnotationChip.displayName = 'AnnotationChip';

export interface VisualPromptingStageProps {
    progress: number; // Local progress [0, 1]
    scrollActive: boolean;
    enterProgress?: number; // 0 -> 1 (100% -> 0% translateY)
    t: (key: string) => string;
}

export const VisualPromptingStage: React.FC<VisualPromptingStageProps> = ({ progress, scrollActive, enterProgress = 1, t }) => {
    // Refs for internal animations
    const image2Ref = useRef<HTMLImageElement>(null);
    const lampRef = useRef<SVGSVGElement>(null);
    const lampPath1Ref = useRef<SVGPathElement>(null);
    const lampPath2Ref = useRef<SVGPathElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    // Standardize easing to remove wobble: Exact match with TemplatesStage
    const easedEnter = enterProgress < 0.5 ? 2 * enterProgress * enterProgress : 1 - Math.pow(-2 * enterProgress + 2, 2) / 2;

    const chip1Ref = useRef<HTMLDivElement>(null);
    const chip2Ref = useRef<HTMLDivElement>(null);
    const zoomContainerRef = useRef<HTMLDivElement>(null);
    const currentP = useRef(0);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    const outroProgress = Math.min(Math.max((progress - 0.75) / 0.25, 0), 1);
    const isExiting = outroProgress > 0.05;
    const typoOpacity = isExiting ? 0 : 1;

    // Lerp-smoothed scroll animation — same technique as Section 2
    // Reads scroll position directly from DOM, interpolates with delta * 0.15
    // = buttery smooth with "floating" inertia when user stops scrolling
    //
    // Timeline (local progress 0-1):
    //   0.05-0.15  chip1 fade in
    //   0.12-0.22  chip2 fade in
    //   0.22-0.55  lamp draw
    //   0.50-0.65  bar fills
    //   0.55-0.68  chips + lamp fade out
    //   0.65-0.78  image swap
    //   0.78-1.00  final image stays, zoom continues = breathing room
    useEffect(() => {
        let active = true;
        let animationFrameId: number;
        const track = document.querySelector('[data-hero-scroll-track]') as HTMLElement | null;
        if (!track) return;

        const updateLoop = () => {
            if (!active) return;
            const rect = track.getBoundingClientRect();
            const targetP = Math.min(Math.max(-rect.top / (rect.height - window.innerHeight), 0), 1);
            const delta = targetP - currentP.current;

            if (Math.abs(delta) > 0.00001) {
                currentP.current += delta * 0.15;
            } else {
                currentP.current = targetP;
            }

            // Map global progress to Section 4 local progress [0,1]
            const sp = Math.min(Math.max((currentP.current - 0.8) / 0.2, 0), 1);

            // Sub-progressions
            const chip1In = Math.min(Math.max((sp - 0.05) / 0.10, 0), 1);
            const chip2In = Math.min(Math.max((sp - 0.12) / 0.10, 0), 1);
            const chipFadeOut = 1 - Math.min(Math.max((sp - 0.55) / 0.13, 0), 1);
            const lampDrawP = Math.min(Math.max((sp - 0.22) / 0.33, 0), 1);
            const lampFadeOut = 1 - Math.min(Math.max((sp - 0.55) / 0.13, 0), 1);
            const barP = Math.min(Math.max((sp - 0.50) / 0.15, 0), 1);
            const fadeP = Math.min(Math.max((sp - 0.65) / 0.13, 0), 1);

            // Zoom
            if (zoomContainerRef.current && !isMobile) {
                zoomContainerRef.current.style.transform = `scale(${1.05 - sp * 0.05})`;
            }
            // Chips — fade in AND out
            if (chip1Ref.current) {
                chip1Ref.current.style.opacity = (chip1In * chipFadeOut).toString();
                chip1Ref.current.style.transform = `scale(${0.9 + chip1In * 0.1})`;
            }
            if (chip2Ref.current) {
                chip2Ref.current.style.opacity = (chip2In * chipFadeOut).toString();
                chip2Ref.current.style.transform = `scale(${0.9 + chip2In * 0.1})`;
            }
            // Lamp — draws then fades out with chips
            if (lampRef.current) {
                lampRef.current.style.opacity = ((lampDrawP > 0 ? 1 : 0) * lampFadeOut).toString();
            }
            const stemP = Math.min(lampDrawP / 0.4, 1);
            const easedStem = stemP < 0.5 ? 2 * stemP * stemP : 1 - Math.pow(-2 * stemP + 2, 2) / 2;
            const shadeP = Math.max((lampDrawP - 0.2) / 0.8, 0);
            const easedShade = shadeP < 0.5 ? 2 * shadeP * shadeP : 1 - Math.pow(-2 * shadeP + 2, 2) / 2;

            if (lampPath1Ref.current) {
                lampPath1Ref.current.style.strokeDashoffset = (400 * (1 - easedStem)).toString();
            }
            if (lampPath2Ref.current) {
                lampPath2Ref.current.style.strokeDashoffset = (1000 * (1 - easedShade)).toString();
            }
            // Progress Bar
            if (progressBarRef.current) {
                progressBarRef.current.style.width = `${barP * 100}%`;
                progressBarRef.current.style.opacity = (barP > 0 && fadeP < 1) ? '1' : '0';
            }
            // Image Swap
            if (image2Ref.current) {
                image2Ref.current.style.opacity = fadeP.toString();
            }

            animationFrameId = requestAnimationFrame(updateLoop);
        };

        animationFrameId = requestAnimationFrame(updateLoop);
        return () => {
            active = false;
            cancelAnimationFrame(animationFrameId);
        };
    }, [isMobile]);

    return (
        <div
            className="absolute inset-0 flex flex-col lg:items-center lg:justify-center"
            style={{
                opacity: scrollActive ? 1 : 0,
                pointerEvents: (scrollActive && !isExiting) ? 'auto' : 'none',
                transform: `translateY(${(1 - easedEnter) * 100}vh)`
            }}
        >
            <div
                className="relative h-[50vh] lg:h-full w-full lg:absolute lg:inset-0 z-0 overflow-hidden will-change-transform"
            >
                <div 
                    ref={zoomContainerRef}
                    className="absolute inset-0" 
                    style={{ transform: 'scale(1.05)', transformOrigin: 'center center', transition: 'transform 0.1s linear' }}
                >
                    <img src="/home/4 visual promting/1.jpg" className="absolute inset-0 w-full h-full object-cover opacity-50" alt="" />
                    <img ref={image2Ref} src="/home/4 visual promting/2.jpg" className="absolute inset-0 w-full h-full object-cover opacity-0 z-10" alt="" />
                </div>

                <div className="absolute inset-0 pointer-events-none z-[110] flex items-center justify-center overflow-hidden">
                    <div className="relative aspect-[3/2] min-w-full min-h-full flex-none scale-[0.8] lg:scale-100">
                        <AnnotationChip ref={chip1Ref} label={t('home_table')} position={{ bottom: '25%', left: '20%' }} />
                        <AnnotationChip ref={chip2Ref} label={t('home_sofa')} position={{ bottom: '20%', right: '20%' }} />

                        <svg ref={lampRef} viewBox="0 0 1700 1141" fill="none" className="absolute inset-0 w-full h-full opacity-0 z-10 lg:transition-all lg:duration-500">
                            <path ref={lampPath1Ref} d="M449.761 177.57C445.213 305 444.653 357.523 449.761 393.07" stroke="#ED693D" strokeWidth="8" strokeLinecap="round" strokeDasharray="400" strokeDashoffset="400" />
                            <path ref={lampPath2Ref} d="M536.84 384.305C529.849 377.695 497.722 364.971 425.139 366.954C334.411 369.433 232.284 421.484 390.489 437.347C548.694 453.211 674.528 379.843 476.202 353.57" stroke="#ED693D" strokeWidth="8" strokeLinecap="round" strokeDasharray="1000" strokeDashoffset="1000" />
                        </svg>
                    </div>
                </div>
            </div>

            <div ref={progressBarRef} className="absolute top-[50vh] lg:top-0 left-0 h-[3px] bg-orange-500 z-[120] transition-all duration-300" style={{ width: '0%' }} />

            <div
                className="relative h-[50vh] lg:h-full lg:absolute lg:inset-0 lg:z-[5] z-[100] container mx-auto px-6 lg:px-12 2xl:px-16 flex flex-col items-center justify-center text-center pointer-events-none bg-white dark:bg-zinc-950 lg:bg-transparent lg:dark:bg-transparent transition-opacity duration-500"
                style={{ opacity: typoOpacity }}
            >
                <div className="flex flex-col max-w-xl lg:max-w-4xl pointer-events-auto">
                    <h2
                        className="text-3xl sm:text-5xl lg:text-7xl xl:text-8xl font-kumbh font-semibold tracking-tighter mb-4 lg:mb-8 leading-[1.2] lg:leading-[1.2] lowercase text-zinc-900 dark:text-white"
                    >
                        visual prompting
                    </h2>
                    <p className="text-base sm:text-xl lg:text-2xl text-zinc-900 dark:text-white leading-relaxed font-light">
                        {t('home_section_visual_desc')}
                    </p>
                </div>
            </div>
        </div>
    );
};
