import React from 'react';
import { Sparkles } from 'lucide-react';

interface HeroProps {
    scrollY: number;
    progress: number;
    t: any;
}

export const HeroClassic = ({ t }: HeroProps) => (
    <div className="relative h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-6">
        <div className="max-w-4xl text-center">
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase mb-8 leading-[0.8]">
                Creation <br /><span className="text-orange-500">Reimagined.</span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-500 font-medium max-w-2xl mx-auto">
                Der Wendepunkt in deinem kreativen Prozess. Visionär, präzise und grenzenlos.
            </p>
        </div>
    </div>
);

export const HeroDive = ({ scrollY, progress }: HeroProps) => {
    const diveDepth = scrollY * 1.2;
    return (
        <div
            className="relative h-screen flex items-center justify-center overflow-hidden bg-black text-white"
            style={{ perspective: '1200px' }}
        >
            <div
                className="relative transition-transform duration-300 ease-out"
                style={{ transform: `translateZ(${diveDepth}px)` }}
            >
                <h1 className="text-8xl md:text-[14rem] font-black tracking-tighter uppercase leading-[0.7] text-center">
                    Dive <br /><span className="text-orange-500">Deep.</span>
                </h1>
            </div>
            {/* Background images could be added here if needed, keeping it focused for now */}
        </div>
    );
};

export const HeroAtmospheric = ({ progress }: HeroProps) => (
    <div className="relative h-screen flex items-center justify-center bg-zinc-900 overflow-hidden">
        <div className="absolute inset-0 opacity-40">
            <img src="/about/iterativ arbeiten img/41.jpg" className="w-full h-full object-cover blur-3xl scale-110" alt="Atmospheric" />
        </div>
        <div className="relative z-10 text-center px-10">
            <h1
                className="text-7xl md:text-[12rem] font-black tracking-tighter uppercase leading-[0.8] mb-12 drop-shadow-2xl transition-all duration-1000"
                style={{ opacity: progress * 1.5, transform: `translateY(${(1 - progress) * 50}px)` }}
            >
                Unleash <br /><span className="text-orange-500">Vision.</span>
            </h1>
        </div>
    </div>
);

export const HeroCinematic = ({ progress }: HeroProps) => (
    <div className="relative h-screen flex items-center justify-center bg-black overflow-hidden">
        <div className="absolute inset-0">
            <img
                src="/about/iterativ arbeiten img/41.jpg"
                className="w-full h-full object-cover transition-opacity duration-1000"
                style={{
                    opacity: 0.3 + progress * 0.4,
                    filter: `blur(${(1 - progress) * 40}px)`,
                    transform: `scale(${1.2 - progress * 0.1})`
                }}
                alt="Background"
            />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
        <h1 className="relative z-10 text-8xl md:text-[15rem] font-black tracking-[ -0.05em] uppercase leading-[0.7] text-center drop-shadow-2xl">
            Exposé <br /><span className="text-orange-500">Foundry.</span>
        </h1>
    </div>
);
