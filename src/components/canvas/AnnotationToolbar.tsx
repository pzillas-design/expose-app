import React from 'react';
import { Type, Brush, Shapes, Minus, Circle, Square, Plus } from 'lucide-react';
import { Theme, Button, Tooltip } from '@/components/ui/DesignSystem';

interface AnnotationToolbarProps {
    maskTool: 'brush' | 'text' | 'shape';
    setMaskTool: (t: 'brush' | 'text' | 'shape') => void;
    brushSize: number;
    setBrushSize: (s: number) => void;
    activeShape: 'rect' | 'circle' | 'line';
    setActiveShape: (s: 'rect' | 'circle' | 'line') => void;
    onAddShape: (type: 'rect' | 'circle' | 'line') => void;
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
    maskTool, setMaskTool,
    brushSize, setBrushSize,
    activeShape, setActiveShape,
    onAddShape
}) => {
    return (
        <div className={`
            absolute bottom-6 left-1/2 -translate-x-1/2 z-50
            flex flex-col items-center gap-2
            animate-in slide-in-from-bottom-4 duration-200
        `}>
            {/* Sub-Toolbar for Options */}
            {maskTool === 'brush' && (
                <div className={`
                    flex items-center gap-3 px-3 py-2 rounded-full
                    bg-black/80 backdrop-blur-md border border-white/10 shadow-xl mb-1
                `}>
                    <div className="w-2 h-2 rounded-full bg-white" />
                    <input
                        type="range"
                        min={5}
                        max={100}
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                    <div className="w-5 h-5 rounded-full bg-white" />
                </div>
            )}

            {maskTool === 'shape' && (
                <div className={`
                    flex items-center gap-1 px-2 py-1.5 rounded-full
                    bg-black/80 backdrop-blur-md border border-white/10 shadow-xl mb-1
                `}>
                    <Tooltip text="Rechteck">
                        <button
                            onClick={() => onAddShape('rect')}
                            className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <Square className="w-5 h-5" />
                        </button>
                    </Tooltip>
                    <Tooltip text="Kreis">
                        <button
                            onClick={() => onAddShape('circle')}
                            className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <Circle className="w-5 h-5" />
                        </button>
                    </Tooltip>
                    <Tooltip text="Linie">
                        <button
                            onClick={() => onAddShape('line')}
                            className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <Minus className="w-5 h-5" />
                        </button>
                    </Tooltip>
                </div>
            )}

            {/* Main Tools */}
            <div className={`
                flex items-center gap-1 p-1.5 rounded-full
                bg-zinc-900 border border-zinc-800 shadow-2xl
            `}>
                <Tooltip text="Text">
                    <button
                        onClick={() => setMaskTool('text')}
                        className={`
                            p-2.5 rounded-full transition-all
                            ${maskTool === 'text' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/10'}
                        `}
                    >
                        <Type className="w-5 h-5" />
                    </button>
                </Tooltip>

                <div className="w-px h-4 bg-white/10 mx-0.5" />

                <Tooltip text="Pinsel">
                    <button
                        onClick={() => setMaskTool('brush')}
                        className={`
                            p-2.5 rounded-full transition-all
                            ${maskTool === 'brush' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/10'}
                        `}
                    >
                        <Brush className="w-5 h-5" />
                    </button>
                </Tooltip>

                <div className="w-px h-4 bg-white/10 mx-0.5" />


                <Tooltip text="Formen">
                    <button
                        onClick={() => setMaskTool('shape')}
                        className={`
                            p-2.5 rounded-full transition-all
                            ${maskTool === 'shape' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/10'}
                        `}
                    >
                        <Shapes className="w-5 h-5" />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};
