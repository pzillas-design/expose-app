import React from 'react';

interface IterativeProps {
    scrollY: number;
    progress: number;
    t: any;
}

const images = ['41.jpg', '42.jpg', '44.jpg', '45.jpg', '11.jpg', '13.jpg', '14.jpg', '21.jpg'];

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
                        <img src={`/about/iterativ arbeiten img/${img}`} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" alt="Track 1" />
                    </div>
                ))}
            </div>
            <div className="flex gap-8 px-20 transition-transform duration-500 ease-out" style={{ transform: `translateX(${track2X}vw)` }}>
                {images.slice(3, 8).map((img, i) => (
                    <div key={i} className="min-w-[500px] aspect-video bg-zinc-900 rounded-none overflow-hidden border border-white/10 shadow-2xl flex-shrink-0">
                        <img src={`/about/iterativ arbeiten img/${img}`} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" alt="Track 2" />
                    </div>
                ))}
            </div>
        </div>
    );
};
