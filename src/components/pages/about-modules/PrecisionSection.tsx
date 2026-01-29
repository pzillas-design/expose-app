import React from 'react';
import { Cpu, Maximize2, Crosshair, Sparkles, Sliders } from 'lucide-react';

interface PrecisionProps {
    progress: number;
    t: any;
}

export const PrecisionSidepanel = ({ progress }: PrecisionProps) => (
    <div className="w-full bg-zinc-50 dark:bg-zinc-950 py-32 px-6 border-y border-zinc-200 dark:border-zinc-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-20">
            <div className="flex-1">
                <h2 className="text-6xl font-black tracking-tighter uppercase mb-8 leading-none">
                    Präzise <br /><span className="text-orange-500">Steuerung.</span>
                </h2>
                <p className="text-xl text-zinc-500 max-w-md leading-relaxed">
                    Variablen und Presets geben Ihnen die Kontrolle zurück. Wir strukturieren den kreativen Workflow.
                </p>
            </div>
            <div className="flex-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-none p-10 shadow-2xl">
                <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-none flex items-center justify-between border border-zinc-100 dark:border-zinc-700">
                            <Sliders className="w-6 h-6 text-orange-500" />
                            <div className="flex-1 ml-6 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-none overflow-hidden">
                                <div className="h-full bg-orange-500 w-2/3" />
                            </div>
                            <span className="ml-6 font-mono font-bold text-orange-500">67%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

export const PrecisionBlueprint = ({ progress }: PrecisionProps) => (
    <div className="relative h-[80vh] w-full bg-zinc-900 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div
            className="relative w-[90%] max-w-6xl h-2/3 border border-orange-500/30 rounded-none bg-black/40 backdrop-blur-xl p-20 flex flex-col justify-between transition-transform duration-700"
            style={{ transform: `scale(${0.9 + progress * 0.1})` }}
        >
            <div className="flex justify-between">
                <div>
                    <div className="text-[10px] font-mono tracking-[0.5em] text-orange-500 mb-4 uppercase">System Control V.5</div>
                    <h3 className="text-7xl font-black tracking-tighter uppercase leading-none">Logic-Driven <br />Quality.</h3>
                </div>
                <div className="w-16 h-16 border-t-2 border-r-2 border-orange-500" />
            </div>
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 border border-white/5 bg-white/5 flex flex-col justify-center px-6">
                        <div className="text-[10px] font-mono text-white/30 mb-2">PARAM_0{i}</div>
                        <div className="w-full h-0.5 bg-orange-500/20"><div className="w-3/4 h-full bg-orange-500" /></div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const PrecisionScanner = ({ progress }: PrecisionProps) => {
    const scannerPos = progress * 100;
    return (
        <div className="w-full h-screen bg-black flex items-center justify-center p-10 overflow-hidden">
            <div className="relative w-full max-w-6xl aspect-video rounded-none overflow-hidden border border-white/10 group">
                <img src="/about/iterativ arbeiten img/41.jpg" className="w-full h-full object-cover opacity-60" alt="Base" />
                <div className="absolute inset-0 bg-orange-500/10 pointer-events-none" style={{ clipPath: `inset(0 ${100 - scannerPos}% 0 0)` }} />
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,1)]"
                    style={{ left: `${scannerPos}%` }}
                >
                    <div className="absolute top-10 left-4 whitespace-nowrap text-[8px] font-mono font-bold text-orange-500">ANALYZING_SURFACE...</div>
                </div>
                <div className="absolute inset-x-0 bottom-10 px-10 z-10">
                    <h2 className="text-6xl font-black tracking-tighter uppercase text-white drop-shadow-2xl">Scanner Precision.</h2>
                </div>
            </div>
        </div>
    );
};

export const PrecisionMagnifier = ({ progress }: PrecisionProps) => {
    const magnifierPos = progress * 100;
    return (
        <div className="relative h-screen w-full bg-[#050505] flex items-center justify-center p-10 overflow-hidden">
            <div className="absolute top-20 left-20">
                <h2 className="text-8xl font-black tracking-tighter uppercase">Magnification.</h2>
            </div>
            <div className="relative w-full max-w-5xl aspect-video rounded-none overflow-hidden bg-black border border-white/5 shadow-2xl">
                <img src="/about/iterativ arbeiten img/41.jpg" className="w-full h-full object-cover opacity-40" alt="Base" />
                <div
                    className="absolute inset-0 transition-all duration-200 pointer-events-none"
                    style={{ clipPath: `circle(150px at ${magnifierPos}% 50%)` }}
                >
                    <img
                        src="/about/iterativ arbeiten img/41.jpg"
                        className="w-full h-full object-cover scale-[1.5]"
                        style={{ transform: `translate(${(50 - magnifierPos) * 0.5}%, 0) scale(1.5)` }}
                        alt="Zoomed"
                    />
                </div>
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-orange-500 rounded-none z-20 pointer-events-none"
                    style={{ left: `calc(${magnifierPos}% - 150px)` }}
                >
                    <div className="absolute top-4 left-4 text-[10px] font-mono font-bold text-orange-500 bg-black/80 px-2 py-1">LENS_FX</div>
                    <Crosshair className="w-6 h-6 text-orange-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
            </div>
        </div>
    );
};
