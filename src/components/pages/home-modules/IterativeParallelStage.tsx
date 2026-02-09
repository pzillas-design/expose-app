import React, { useRef, useMemo } from 'react';

export interface IterativeParallelStageProps {
    progress: number; // Global progress [0, 1]
    scrollActive: boolean;
    exitProgress?: number; // 0 -> 1 (0% -> -100% translateY)
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
                        const delay = Math.abs(index - 6) * 0.05;
                        const normalizedProgress = progress > delay
                            ? Math.min((progress - delay) / (1 - delay - 0.1), 1)
                            : 0;

                        const opacity = Math.min(normalizedProgress * 1.5, 1);
                        const currentZ = 400 - (normalizedProgress * 400);

                        return (
                            <div
                                key={index}
                                className="flex-1 basis-0 min-w-0 aspect-[4/3] rounded-sm overflow-hidden bg-zinc-100 dark:bg-zinc-800 will-change-transform"
                                style={{
                                    opacity: opacity,
                                    transform: `translateZ(${currentZ}px)`
                                }}
                            >
                                <img
                                    src={`/home/2 iterativ/${img}`}
                                    className="w-full h-full object-cover"
                                    alt=""
                                />
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export const IterativeParallelStage: React.FC<IterativeParallelStageProps> = ({ progress, scrollActive, exitProgress = 0 }) => {
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
            <div className="w-full lg:w-3/5 h-[65vh] lg:h-full flex items-center justify-start px-6 lg:pl-0 lg:pr-6 pointer-events-none overflow-visible pt-[20vh] lg:pt-0">
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
            <div className="w-full lg:w-2/5 h-[35vh] lg:h-full flex items-start lg:items-center justify-start px-6 lg:px-12 xl:px-24 py-8 lg:py-0 text-left relative z-10">
                <div className="flex flex-col max-w-2xl will-change-transform">
                    <h2 className="text-3xl sm:text-5xl lg:text-7xl xl:text-8xl font-kumbh font-semibold tracking-tighter mb-4 lg:mb-8 leading-[1.1] lg:leading-[1.1]">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Iterativ</span> <br className="hidden lg:block" />
                        & parallel arbeiten
                    </h2>
                    <p className="text-base sm:text-xl lg:text-2xl text-zinc-500 leading-relaxed font-light">
                        Ganze Bildstrecken gleichzeitig generieren, vergleichen und perfektionieren.
                    </p>
                </div>
            </div>
        </div>
    );
};
