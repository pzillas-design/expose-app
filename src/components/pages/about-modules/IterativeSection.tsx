import React from 'react';

interface IterativeProps {
    scrollY: number;
    progress: number;
    t: any;
}

const images = ['41.jpg', '42.jpg', '44.jpg', '45.jpg', '11.jpg', '13.jpg', '14.jpg', '21.jpg'];

const CanvasMockup = ({ isVisible, progress }: { isVisible: boolean, progress: number }) => {
    // Exact row configuration from commit 5383817
    const imageRows = [
        ['41.jpg', '42.jpg', '44.jpg', '45.jpg'],
        ['11.jpg', '13.jpg', '14.jpg'],
        ['21.jpg', '24.jpg'],
        ['31.jpg', '32.jpg', '33.jpg']
    ];

    return (
        <div className="w-full flex flex-col gap-4 md:gap-8 transition-transform duration-[1200ms] cubic-bezier(0.16, 1, 0.3, 1)"
            style={{ transform: `translateY(${(1 - progress) * 50}px)` }}>
            {imageRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-4 md:gap-8 items-end justify-start">
                    {row.map((imageName, imgIndex) => {
                        const delay = (rowIndex * 0.1) + (imgIndex * 0.05);
                        const targetOpacity = Math.max(0.1, (1 - (row.length - 1 - imgIndex) * 0.15) * (isVisible ? 1 : 0));

                        return (
                            <div
                                key={imageName}
                                className="flex-1 min-w-0 max-w-[400px] transition-all duration-[1200ms] cubic-bezier(0.16, 1, 0.3, 1)"
                                style={{
                                    transitionDelay: `${delay}s`,
                                    opacity: isVisible ? targetOpacity : 0,
                                    transform: isVisible ? `scale(${0.98 + progress * 0.02})` : 'scale(0.95)'
                                }}
                            >
                                <img
                                    src={`/about/iterativ arbeiten img/${imageName}`}
                                    alt={`Iteration ${imageName}`}
                                    className="w-full h-auto block border-0 rounded-none shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
                                />
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export const IterativeOriginal = ({ progress }: IterativeProps) => (
    <section className="relative min-h-screen py-24 md:py-32 flex flex-col items-center justify-center bg-white dark:bg-[#050505] overflow-hidden">
        <div className="w-full max-w-[1700px] mx-auto flex flex-col lg:flex-row items-center relative z-10 px-6 lg:px-12">
            <div className="w-full lg:w-3/5 order-2 lg:order-1 flex-none" style={{ opacity: progress }}>
                <CanvasMockup isVisible={progress > 0.05} progress={progress} />
            </div>
            <div className="flex-1 order-1 lg:order-2 lg:pl-20 flex flex-col justify-center transition-all duration-1000"
                style={{ opacity: progress, transform: `translateX(${(1 - progress) * 40}px)` }}>
                <h2 className="text-6xl sm:text-7xl lg:text-9xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-8 leading-[0.8] italic_off uppercase">
                    <span className="text-orange-500">Iterativ</span> <br />+ parallel arbeiten.
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-xl lg:text-2xl leading-relaxed max-w-lg font-bold tracking-tight">
                    Ganze Variantenreihen gleichzeitig generieren. Vergleichen, verwerfen, veredeln – in Echtzeit.
                </p>
                <div className="mt-12 pt-8 border-t border-zinc-100 dark:border-white/10 flex gap-12">
                    <div>
                        <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Scale</div>
                        <div className="text-2xl font-black">Unlimited</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Speed</div>
                        <div className="text-2xl font-black">Instant</div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

export const IterativeRefined = ({ progress }: IterativeProps) => {
    const imageRows = [
        ['41.jpg', '42.jpg', '44.jpg', '45.jpg'],
        ['11.jpg', '13.jpg', '14.jpg'],
        ['21.jpg', '24.jpg'],
        ['31.jpg', '32.jpg', '33.jpg']
    ];

    return (
        <section className="relative min-h-screen py-24 flex flex-col items-center justify-center bg-white dark:bg-[#050505] overflow-hidden">
            <div className="w-full max-w-[1800px] mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center gap-12 lg:gap-24 relative z-10">
                {/* Responsive & Fluid Grid */}
                <div className="w-full lg:w-3/5 order-2 lg:order-1">
                    <div className="flex flex-col gap-4 md:gap-8 transition-transform duration-1000 ease-out"
                        style={{ transform: `translateY(${(1 - progress) * 50}px)` }}>
                        {imageRows.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex gap-4 md:gap-8 items-end justify-start">
                                {row.map((imageName, imgIndex) => {
                                    const delay = (rowIndex * 0.1) + (imgIndex * 0.05);
                                    const staggerOpacity = Math.max(0.15, progress * 1.5 - delay);

                                    return (
                                        <div
                                            key={imageName}
                                            className="flex-1 min-w-0 transition-all duration-[1200ms] "
                                            style={{
                                                opacity: staggerOpacity,
                                                transform: `translateY(${(1 - progress) * (20 + rowIndex * 10)}px) scale(${0.95 + progress * 0.05})`,
                                                transitionDelay: `${delay}s`
                                            }}
                                        >
                                            <div className="group relative overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                                                <img
                                                    src={`/about/iterativ arbeiten img/${imageName}`}
                                                    alt={`Refined Iteration ${imageName}`}
                                                    className="w-full h-auto block grayscale hover:grayscale-0 transition-all duration-700"
                                                />
                                                <div className="absolute inset-0 border border-white/5 pointer-events-none" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Side */}
                <div className="w-full lg:w-2/5 order-1 lg:order-2 space-y-8"
                    style={{ opacity: progress, transform: `translateX(${(1 - progress) * 40}px)` }}>
                    <div className="space-y-4">
                        <div className="inline-block px-3 py-1 bg-orange-500 text-black text-[10px] font-black tracking-widest uppercase">Process_v5.0</div>
                        <h2 className="text-6xl sm:text-7xl xl:text-8xl font-black tracking-tighter text-zinc-900 dark:text-white leading-[0.8] uppercase italic_off">
                            Everything <br /><span className="text-orange-500">at once.</span>
                        </h2>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xl xl:text-2xl leading-relaxed font-bold tracking-tight max-w-md">
                        Parallel workflows allow you to see the big picture while refining every detail. No more sequential bottlenecks.
                    </p>
                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-zinc-200 dark:border-white/10">
                        <div>
                            <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-2">Simultaneity</div>
                            <div className="text-2xl font-black">12+ Paths</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-2">Efficiency</div>
                            <div className="text-2xl font-black">300% Boost</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export const IterativeGrid = ({ progress }: IterativeProps) => (
    <div className="w-full bg-white dark:bg-zinc-950 py-32 px-6">
        <div className="max-w-7xl mx-auto">
            <h2 className="text-6xl font-black tracking-tighter uppercase mb-16 underline decoration-orange-500 decoration-8 underline-offset-[10px]">
                Iterativ + Parallel.
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((img, i) => (
                    <div
                        key={i}
                        className="aspect-[3/4] bg-zinc-100 dark:bg-zinc-900 overflow-hidden rounded-none border border-zinc-200 dark:border-zinc-800 transition-all hover:scale-[1.02]"
                        style={{ opacity: progress * 1.5, transform: `translateY(${(1 - progress) * (50 + i * 20)}px)` }}
                    >
                        <img src={`/about/iterativ arbeiten img/${img}`} className="w-full h-full object-cover" alt="Iteration" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const IterativeCanvas = ({ progress }: IterativeProps) => {
    const rowImages = [
        ['41.jpg', '42.jpg'],
        ['44.jpg', '45.jpg'],
        ['11.jpg', '13.jpg'],
        ['14.jpg', '21.jpg']
    ];

    return (
        <div className="relative h-screen w-full bg-zinc-50 dark:bg-zinc-900/50 flex flex-col justify-center overflow-hidden">
            <div className="absolute top-20 left-20 z-10 transition-all duration-700" style={{ transform: `translateY(${(1 - progress) * 50}px)`, opacity: progress }}>
                <h2 className="text-7xl font-black tracking-tighter uppercase leading-none">
                    Ordered <br /><span className="text-orange-500">Flow.</span>
                </h2>
            </div>

            <div className="relative w-full h-[60vh] mt-20">
                {rowImages.map((row, rowIndex) => (
                    <div
                        key={rowIndex}
                        className="flex gap-12 absolute w-full px-12"
                        style={{
                            top: `${rowIndex * 25}%`,
                            transform: `translateX(${(1 - progress) * (rowIndex % 2 === 0 ? 100 : -100)}px)`,
                            opacity: progress
                        }}
                    >
                        {row.map((img, imgIndex) => {
                            const delay = (rowIndex * 0.2) + (imgIndex * 0.1);
                            const floatDuration = 4 + Math.random() * 2;
                            return (
                                <div
                                    key={imgIndex}
                                    className="relative shadow-2xl rounded-none border border-white/10 transition-all duration-700 hover:scale-105"
                                    style={{
                                        width: `${300 + Math.random() * 100}px`,
                                        marginLeft: `${Math.random() * 10}%`,
                                        animation: `float ${floatDuration}s ease-in-out infinite alternate`,
                                        animationDelay: `${delay}s`,
                                        transform: `scale(${0.8 + progress * 0.2})`,
                                    }}
                                >
                                    <img src={`/about/iterativ arbeiten img/${img}`} className="w-full h-auto" alt="Canvas item" />
                                    <div className="absolute -top-4 -left-4 bg-orange-500 text-black text-[10px] font-black px-2 py-1">ROW_0{rowIndex + 1}</div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes float {
                    0% { transform: translateY(0) rotate(0deg); }
                    100% { transform: translateY(-20px) rotate(1deg); }
                }
            `}</style>
        </div>
    );
};

// --- NEW FULLSCREEN VARIANTS ---

export const IterativeModern = ({ progress }: IterativeProps) => (
    <div className="relative h-screen w-full bg-zinc-950 overflow-hidden flex items-center justify-center p-20">
        <div className="absolute top-10 left-20">
            <h2 className="text-[10vw] font-black tracking-tighter uppercase leading-[0.7] opacity-10">Modern.</h2>
        </div>
        <div className="grid grid-cols-3 gap-8 w-full max-w-7xl transition-all duration-1000" style={{ transform: `scale(${0.9 + progress * 0.1}) rotateX(${10 - progress * 10}deg)`, opacity: progress }}>
            {images.slice(0, 3).map((img, i) => (
                <div key={i} className="relative group overflow-hidden bg-black border border-white/5 shadow-2xl transition-all hover:scale-[1.05]">
                    <img src={`/about/iterativ arbeiten img/${img}`} className="w-full aspect-[4/5] object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Modern grid item" />
                    <div className="absolute bottom-6 left-6 text-white z-10 transition-transform translate-y-10 group-hover:translate-y-0 duration-500">
                        <div className="text-[10px] font-mono tracking-widest text-orange-500 mb-2">ITERATION_V.0{i + 1}</div>
                        <div className="text-2xl font-black uppercase">Refined Result</div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent opacity-60" />
                </div>
            ))}
        </div>
        <div className="absolute bottom-10 right-20 text-right">
            <h3 className="text-4xl font-black uppercase tracking-tighter mb-4"><span className="text-orange-500">Iterativ</span> arbeiten.</h3>
            <p className="text-zinc-500 max-w-sm font-medium tracking-tight">Smarte Workflows führen zu präzisen Ergebnissen unter maximaler Kontrolle.</p>
        </div>
    </div>
);

export const IterativeCinematic = ({ progress }: IterativeProps) => (
    <div className="relative h-screen w-full bg-black overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0">
            <img src="/about/iterativ arbeiten img/41.jpg" className="w-full h-full object-cover blur-[100px] opacity-30 scale-150 animate-pulse" alt="Ambient" />
        </div>
        <div className="relative z-10 w-full max-w-[90vw] transition-all duration-1000 flex items-center gap-20" style={{ opacity: progress, transform: `translateY(${(1 - progress) * 100}px)` }}>
            <div className="flex-1 space-y-8">
                <div className="text-orange-500 text-xs font-mono tracking-[0.5em] uppercase">Cinematic Sequence</div>
                <h2 className="text-[8vw] font-black tracking-tighter uppercase leading-[0.8]">The <br />Foundry <br /><span className="text-orange-500 text-stroke-white opacity-40">Parallel.</span></h2>
                <p className="text-xl text-white/50 max-w-md leading-relaxed">Wir denken nicht in Einzelbildern, sondern in gesamten Design-Universen, die gleichzeitig entstehen.</p>
            </div>
            <div className="flex-1 relative aspect-video bg-zinc-900 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,1)] border border-white/5 group">
                <img src="/about/iterativ arbeiten img/11.jpg" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[20s] linear" alt="Cinematic hero" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-scan" style={{ top: `${progress * 100}%` }} />
            </div>
        </div>
    </div>
);

export const IterativeMinimalistic = ({ progress }: IterativeProps) => (
    <div className="relative h-screen w-full bg-white dark:bg-black overflow-hidden flex flex-col items-center justify-center p-20">
        <div className="max-w-7xl w-full flex flex-col md:flex-row items-end justify-between transition-all duration-1000" style={{ opacity: progress, transform: `scale(${0.95 + progress * 0.05})` }}>
            <div className="space-y-12">
                <div className="w-24 h-1 bg-orange-500" />
                <h2 className="text-8xl font-black tracking-tighter uppercase leading-none italic_off">Parallel <br /><span className="text-zinc-300 dark:text-zinc-800">Processing.</span></h2>
            </div>
            <p className="text-2xl text-zinc-500 dark:text-zinc-400 font-medium max-w-sm lowercase tracking-tighter text-right">
                infinite variations, one vision. scaled for impact, delivered with precision.
            </p>
        </div>
        <div className="grid grid-cols-4 gap-4 w-full max-w-7xl mt-20 h-1/3">
            {images.slice(4, 8).map((img, i) => (
                <div key={i} className="bg-zinc-100 dark:bg-zinc-900 h-full overflow-hidden transition-all duration-700" style={{ transform: `translateY(${(1 - progress) * (50 + i * 30)}px)`, opacity: progress }}>
                    <img src={`/about/iterativ arbeiten img/${img}`} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" alt="Minimal item" />
                </div>
            ))}
        </div>
    </div>
);

export const IterativeHorizon = ({ progress }: IterativeProps) => {
    const horizonX = progress * -150;
    return (
        <div className="relative h-[80vh] w-full bg-zinc-950 flex flex-col justify-center overflow-hidden border-y border-white/5">
            <div className="px-20 mb-12">
                <h2 className="text-7xl font-black tracking-tighter uppercase italic_off">Parallel Horizon.</h2>
            </div>
            <div
                className="flex gap-8 px-20 transition-transform duration-300 ease-out"
                style={{ transform: `translateX(${horizonX}vw)` }}
            >
                {images.map((img, i) => (
                    <div key={i} className="min-w-[400px] aspect-[4/5] bg-zinc-900 rounded-none overflow-hidden border border-white/10 shrink-0">
                        <img src={`/about/iterativ arbeiten img/${img}`} className="w-full h-full object-cover" alt="Horizontal variant" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const IterativeDualTrack = ({ progress }: IterativeProps) => {
    const track1X = progress * -120;
    const track2X = (progress * 80) - 80;
    return (
        <div className="relative h-screen w-full bg-black flex flex-col justify-center gap-12 overflow-hidden">
            <div className="px-20 mb-8">
                <h2 className="text-8xl font-black tracking-tighter uppercase leading-[0.8]">
                    Dual Track <br /><span className="text-orange-500">Processing.</span>
                </h2>
            </div>
            <div className="flex gap-8 px-20 transition-transform duration-500 ease-out" style={{ transform: `translateX(${track1X}vw)` }}>
                {images.slice(0, 5).map((img, i) => (
                    <div key={i} className="min-w-[500px] aspect-video bg-zinc-900 rounded-none overflow-hidden border border-white/10 shadow-2xl flex-shrink-0">
                        <img src={`/about/iterativ arbeiten img/${img}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="Track 1" />
                    </div>
                ))}
            </div>
            <div className="flex gap-8 px-20 transition-transform duration-500 ease-out" style={{ transform: `translateX(${track2X}vw)` }}>
                {images.slice(3, 8).map((img, i) => (
                    <div key={i} className="min-w-[500px] aspect-video bg-zinc-900 rounded-none overflow-hidden border border-white/10 shadow-2xl flex-shrink-0">
                        <img src={`/about/iterativ arbeiten img/${img}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="Track 2" />
                    </div>
                ))}
            </div>
        </div>
    );
};
