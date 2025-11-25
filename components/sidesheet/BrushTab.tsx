
import React from 'react';

interface BrushTabProps {
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
}

export const BrushTab: React.FC<BrushTabProps> = ({ brushSize, onBrushSizeChange }) => {
  return (
      <div className="px-6 py-6 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
           <div className="space-y-4">
               <div className="flex items-center justify-between">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Brush Size</label>
                   <span className="text-[10px] font-mono text-zinc-600">{brushSize}px</span>
               </div>
               <div className="relative h-6 flex items-center">
                   <input 
                        type="range" 
                        min="20" max="600" 
                        value={brushSize}
                        onChange={(e) => onBrushSizeChange(Number(e.target.value))}
                        className="w-full accent-white h-0.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer hover:bg-zinc-700 z-10 relative" 
                   />
               </div>
           </div>
           <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg text-[10px] text-zinc-500 text-center leading-relaxed">
               Use the brush to mask areas. <br/>These areas will be targeted by your prompt.
           </div>
      </div>
  );
};
