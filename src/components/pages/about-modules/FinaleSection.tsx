import React from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';

interface FinaleProps {
    progress: number;
    onCreateBoard: () => void;
}

export const FinaleSimple = ({ onCreateBoard }: FinaleProps) => (
    <div className="w-full bg-zinc-50 dark:bg-zinc-950 py-48 px-6 text-center border-t border-zinc-200 dark:border-zinc-900">
        <blockquote className="text-4xl md:text-6xl font-black tracking-tighter uppercase max-w-5xl mx-auto mb-16 leading-tight">
            "Hinter jedem Bild steckt eine Geschichte, die darauf wartet, erzählt zu werden."
        </blockquote>
        <button
            onClick={onCreateBoard}
            className="px-12 py-6 bg-orange-500 text-white font-black uppercase tracking-widest text-lg hover:bg-orange-600 transition-all rounded-none"
        >
            Start Creating <ArrowRight className="inline-block ml-3" />
        </button>
        <p className="mt-12 text-zinc-500 font-mono text-[10px] tracking-[0.4em] uppercase">— Michael Pzillas</p>
    </div>
);

export const FinaleCinematic = ({ progress, onCreateBoard }: FinaleProps) => (
    <div className="relative h-screen w-full bg-black flex flex-col items-center justify-center px-10 overflow-hidden">
        <div className="absolute inset-0 bg-orange-500/5 blur-[150px]" />
        <div className="relative z-10 text-center space-y-20">
            <h2 className="text-5xl md:text-[8vw] font-black tracking-tighter leading-none uppercase drop-shadow-2xl">
                Ready to <br /><span className="text-orange-500">Create?</span>
            </h2>
            <button
                onClick={onCreateBoard}
                className="px-16 py-8 bg-white text-black font-black uppercase text-2xl hover:bg-orange-500 hover:text-white transition-all scale-100 hover:scale-110 rounded-none shadow-[0_20px_100px_rgba(255,255,255,0.1)]"
            >
                Launch App <ChevronRight className="inline-block ml-3 w-8 h-8" />
            </button>
        </div>
    </div>
);

export const FinaleRefined = ({ progress, onCreateBoard }: FinaleProps) => (
    <div className="relative h-screen w-full bg-[#050505] flex flex-col items-center justify-center p-20 text-center">
        <div
            className="max-w-7xl transition-all duration-1000"
            style={{ opacity: progress, transform: `scale(${0.9 + progress * 0.1})` }}
        >
            <h2 className="text-5xl md:text-[7vw] font-black tracking-tighter leading-none mb-20 uppercase">
                Behind every <span className="text-orange-500">Image</span> is a <span className="text-zinc-600">Story.</span>
            </h2>
            <div className="flex flex-col items-center gap-12">
                <div className="w-1 h-32 bg-gradient-to-b from-orange-500 to-transparent" />
                <button
                    onClick={onCreateBoard}
                    className="px-20 py-8 bg-white text-black font-black uppercase text-xl hover:bg-orange-500 hover:text-white transition-all rounded-none shadow-2xl flex items-center gap-4 group"
                >
                    Exposé Foundry <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform" />
                </button>
            </div>
        </div>
    </div>
);
