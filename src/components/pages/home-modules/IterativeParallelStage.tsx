import React, { useRef, useMemo } from 'react';
import { Check } from 'lucide-react';

export interface IterativeParallelStageProps {
    progress: number; // Global progress [0, 1]
    scrollActive: boolean;
    exitProgress?: number; // 0 -> 1 (0% -> -100% translateY)
    t: (key: string) => string;
    lang?: string;
}

const CanvasMockup = ({ progress }: { progress: number }) => {
    const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Irregular grid logic
    const imageRows = [
        ['11.jpg', '12.jpg', '14.jpg', '13.jpg'],
        ['21.jpg', '22.jpg', '23.jpg', null],
        ['31.jpg', '32.jpg', null, null],
        ['41.jpg', '42.jpg', '43.jpg', '44.jpg']
    ];

    // Effect for animations based on progress prop
    // We use useMemo to avoid recalculating on every render if not needed, 
    // but styles need to be updated. We'll use the progress directly in the render or via refs.
    // For "absolute stillness" and performance, we can apply transforms in a render phase or useEffect.
    // Since progress changes frequently, we'll use it in the render with style property.

    const flatIndices = useMemo(() => {
        let count = 0;
        return imageRows.map(row => row.map(img => img === null ? -1 : count++));
    }, []);

    return (
        <div className="w-full flex flex-col gap-4 sm:gap-6 lg:gap-8" style={{ transformStyle: 'preserve-3d' }}>
            {imageRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2 sm:gap-3 lg:gap-4 justify-start" style={{ transformStyle: 'preserve-3d' }}>
                    {row.map((img, imgIndex) => {
                        const index = flatIndices[rowIndex][imgIndex];
                        if (img === null || index === -1) {
                            return <div key={`dummy-${rowIndex}-${imgIndex}`} className="flex-1 basis-0 min-w-0" />;
                        }

                        // Animation logic same as before but driven by prop
                        const delay = Math.abs(index - 6) * 0.04;
                        const zoomDuration = 0.45; // Finish all zooms early to allow pause
                        const normalizedProgress = progress > delay
                            ? Math.min((progress - delay) / Math.max(0.01, zoomDuration - delay), 1)
                            : 0;

                        const opacity = Math.min(normalizedProgress * 1.5, 1);
                        const currentZ = 400 - (normalizedProgress * 400);

                        // Checkmark animation: Appears sequentially after zoom phase
                        const checkmarkedIndices = [1, 6, 8, 12];
                        const checkmarkOrder = checkmarkedIndices.indexOf(index);
                        const isCheckmarked = checkmarkOrder !== -1;
                        
                        const checkmarkPhaseStart = 0.45 + checkmarkOrder * 0.06;
                        const checkmarkProgress = isCheckmarked && progress > checkmarkPhaseStart
                            ? Math.min((progress - checkmarkPhaseStart) / 0.05, 1)
                            : 0;

                        return (
                            <div
                                key={index}
                                className="relative flex-1 basis-0 min-w-0 aspect-[4/3] rounded-sm overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                                style={{
                                    opacity: opacity,
                                    transform: `translate3d(0, 0, ${currentZ}px)`,
                                    willChange: opacity > 0 && opacity < 1 ? 'opacity, transform' : 'auto'
                                }}
                            >
                                <img
                                    src={`/home/2 iterativ/${img}`}
                                    className="w-full h-full object-cover"
                                    alt=""
                                />
                                {isCheckmarked && (
                                    <div 
                                        className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-orange-500 flex items-center justify-center shadow-lg"
                                        style={{ 
                                            opacity: checkmarkProgress,
                                            transform: `scale(${0.5 + checkmarkProgress * 0.5})`
                                        }}
                                    >
                                        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export const IterativeParallelStage: React.FC<IterativeParallelStageProps> = ({ progress, scrollActive, exitProgress = 0, t, lang = 'en' }) => {
    // Map global progress for this section (e.g. 0.2 to 0.5)

    // Smooth exit easing
    const easedExit = exitProgress < 0.5 ? 2 * exitProgress * exitProgress : 1 - Math.pow(-2 * exitProgress + 2, 2) / 2;

    return (
        <div
            className="absolute inset-0 flex flex-col lg:flex-row transition-opacity duration-700"
            style={{
                opacity: scrollActive ? 1 : 0,
                pointerEvents: scrollActive ? 'auto' : 'none',
                transform: `translateY(${-easedExit * 100}vh)`
            }}
        >
            <style>{`
                #desktop-cluster-container { 
                    width: 100%; 
                    min-width: 100%;
                }
                @media (min-width: 1024px) {
                    #desktop-cluster-container { 
                        width: 125% !important; 
                        min-width: 125% !important; 
                    }
                }
            `}</style>

            {/* Left: Image Cluster */}
            <div className="w-full lg:w-3/5 h-[50vh] lg:h-full flex items-center justify-start px-6 lg:pl-0 lg:pr-6 pointer-events-none overflow-visible pt-[20vh] lg:pt-0">
                <div
                    id="desktop-cluster-container"
                    style={{
                        perspective: '1200px',
                        perspectiveOrigin: 'center center',
                        transform: 'scale(0.85)',
                        transformOrigin: 'center left'
                    }}
                >
                    <CanvasMockup progress={progress} />
                </div>
            </div>

            {/* Right: Text */}
            <div className="w-full lg:w-2/5 h-[50vh] lg:h-full flex items-center lg:items-center justify-start px-6 lg:px-12 xl:px-24 py-8 lg:py-0 text-left relative z-10">
                <div className="flex flex-col max-w-2xl will-change-transform">
                    <h2 className="text-3xl sm:text-5xl lg:text-7xl xl:text-8xl font-kumbh font-semibold tracking-tighter mb-4 lg:mb-8 leading-[1.2] lg:leading-[1.2] lowercase text-zinc-900 dark:text-white">
                        {lang === 'de' ? (
                            <>
                                iterativ und parallel
                                <br className="hidden lg:block" />
                                arbeiten
                            </>
                        ) : (
                            t('home_section_iterative_title')
                        )}
                    </h2>
                    <p className="text-base sm:text-xl lg:text-2xl text-zinc-500 leading-relaxed font-light">
                        {t('home_section_iterative_desc')}
                    </p>
                </div>
            </div>
        </div>
    );
};
