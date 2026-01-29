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
            style={{ perspective: '1000px' }}
        >
            <div
                className="relative flex items-center justify-center preserve-3d w-full h-full transition-transform duration-100 ease-out"
                style={{ transform: `translate3d(0, 0, ${diveDepth}px)` }}
            >
                {/* Hero Text */}
                <div className="text-center z-10" style={{ transform: 'translateZ(200px)' }}>
                    <h1 className="text-8xl md:text-[14rem] font-black tracking-tighter uppercase leading-[0.7]">
                        Dive <br /><span className="text-orange-500">Deep.</span>
                    </h1>
                    <p className="mt-8 text-xl text-white/40 font-bold tracking-[0.2em] uppercase">Entdecke die Tiefe deiner Kreativität.</p>
                </div>

                {/* Floating Images (Original "Hammer" Design) */}
                <div className="absolute inset-0 pointer-events-none preserve-3d">
                    <div className="absolute left-[75%] top-[15%] w-[300px] shadow-2xl transition-all" style={{ transform: 'translateZ(-200px)' }}>
                        <img src="/about/iterativ arbeiten img/41.jpg" className="w-full h-auto rounded-none border border-white/10" alt="Dive 1" />
                    </div>
                    <div className="absolute left-[10%] top-[60%] w-[450px] shadow-2xl transition-all" style={{ transform: 'translateZ(-600px)' }}>
                        <img src="/about/iterativ arbeiten img/11.jpg" className="w-full h-auto rounded-none border border-white/10" alt="Dive 2" />
                    </div>
                    <div className="absolute left-[60%] top-[70%] w-[400px] shadow-2xl transition-all" style={{ transform: 'translateZ(-1200px)' }}>
                        <img src="/about/iterativ arbeiten img/21.jpg" className="w-full h-auto rounded-none border border-white/10" alt="Dive 3" />
                    </div>
                    <div className="absolute left-[20%] top-[10%] w-[350px] shadow-2xl transition-all" style={{ transform: 'translateZ(-1800px)' }}>
                        <img src="/about/iterativ arbeiten img/31.jpg" className="w-full h-auto rounded-none border border-white/10" alt="Dive 4" />
                    </div>
                </div>
            </div>

            {/* Scrolling Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/20 animate-bounce">
                <div className="w-px h-16 bg-gradient-to-b from-white to-transparent mx-auto" />
            </div>
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
