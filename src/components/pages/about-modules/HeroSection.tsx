import React from 'react';

interface HeroProps {
    scrollY: number;
    progress: number;
    t: any;
}

export const HeroDive = ({ scrollY }: HeroProps) => {
    const diveDepth = scrollY * 1.5; // Increased slightly for more impact

    return (
        <div
            className="relative h-screen flex items-center justify-center overflow-hidden bg-black text-white"
            style={{ perspective: '1000px' }}
        >
            <div
                className="relative flex items-center justify-center preserve-3d w-full h-full transition-transform duration-100 ease-out"
                style={{ transform: `translate3d(0, 0, ${diveDepth}px)` }}
            >
                {/* Hero Text - Restored Headline & Balanced Size */}
                <div className="text-center z-10" style={{ transform: 'translateZ(300px)' }}>
                    <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter uppercase leading-[0.8] drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        Creation <br /><span className="text-orange-500">Reimagined.</span>
                    </h1>
                    <p className="mt-6 text-lg md:text-xl text-white/40 font-bold tracking-[0.2em] uppercase">Der Wendepunkt in deinem kreativen Prozess.</p>
                </div>

                {/* Floating Images (Exact Initial "Hammer" Layout) */}
                <div className="absolute inset-0 pointer-events-none preserve-3d">
                    {/* Layer 1 - Nearest */}
                    <div className="absolute left-[75%] top-[15%] w-[350px] shadow-[0_30px_60px_rgba(0,0,0,0.8)]" style={{ transform: 'translateZ(-100px)' }}>
                        <img src="/about/iterativ arbeiten img/41.jpg" className="w-full h-auto rounded-none border border-white/5" alt="Layer 1" />
                    </div>

                    {/* Layer 2 */}
                    <div className="absolute left-[5%] top-[55%] w-[500px] shadow-[0_40px_80px_rgba(0,0,0,0.8)]" style={{ transform: 'translateZ(-600px)' }}>
                        <img src="/about/iterativ arbeiten img/11.jpg" className="w-full h-auto rounded-none border border-white/5" alt="Layer 2" />
                    </div>

                    {/* Layer 3 */}
                    <div className="absolute left-[65%] top-[65%] w-[450px] shadow-[0_50px_100px_rgba(0,0,0,0.8)]" style={{ transform: 'translateZ(-1200px)' }}>
                        <img src="/about/iterativ arbeiten img/21.jpg" className="w-full h-auto rounded-none border border-white/5" alt="Layer 3" />
                    </div>

                    {/* Layer 4 - Deepest */}
                    <div className="absolute left-[15%] top-[10%] w-[400px] shadow-[0_60px_120px_rgba(0,0,0,0.8)]" style={{ transform: 'translateZ(-1800px)' }}>
                        <img src="/about/iterativ arbeiten img/31.jpg" className="w-full h-auto rounded-none border border-white/5" alt="Layer 4" />
                    </div>
                </div>
            </div>

            {/* Scrolling Indicator */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/10">
                <div className="w-[2px] h-20 bg-gradient-to-b from-orange-500 to-transparent mx-auto" />
                <div className="mt-4 text-[10px] font-black tracking-[0.5em] uppercase text-orange-500/50">Scroll</div>
            </div>
        </div>
    );
};
