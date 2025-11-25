
import React from 'react';
import { ChevronLeft, ChevronRight, ZoomOut, ZoomIn, Menu, Plus } from 'lucide-react';

interface CommandDockProps {
  zoom: number;
  credits: number;
  onZoomChange: (targetZoom: number) => void;
  onNavigate: (direction: -1 | 1) => void;
  onOpenSettings: () => void;
  onOpenCreditModal: () => void;
}

export const CommandDock: React.FC<CommandDockProps> = ({
  zoom,
  credits,
  onZoomChange,
  onNavigate,
  onOpenSettings,
  onOpenCreditModal
}) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-[#111]/90 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl">
      
      {/* Menu / Settings */}
      <div className="flex items-center gap-1 px-1">
        <button 
            onClick={onOpenSettings}
            className="p-2 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Menu"
        >
            <Menu className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-4 bg-zinc-800 mx-1" />

      {/* Navigation */}
      <div className="flex items-center gap-1 px-1">
          <button onClick={() => onNavigate(-1)} className="p-2 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
              <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => onNavigate(1)} className="p-2 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
              <ChevronRight className="w-4 h-4" />
          </button>
      </div>

      <div className="w-px h-4 bg-zinc-800 mx-1" />

      {/* Zoom */}
      <div className="flex items-center gap-1 px-2 min-w-[110px] justify-center">
          <button onClick={() => onZoomChange(zoom / 1.2)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          
          {/* Clickable Percentage to Reset */}
          <button 
            onClick={() => onZoomChange(1)}
            className="px-1 text-[10px] font-mono text-zinc-400 hover:text-white min-w-[2.5rem] text-center select-none transition-colors cursor-pointer"
            title="Reset to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button onClick={() => onZoomChange(zoom * 1.2)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
      </div>

      <div className="w-px h-4 bg-zinc-800 mx-1" />

      {/* Credits Display */}
      <div className="flex items-center gap-1 pl-2 pr-1">
         <button 
            onClick={onOpenCreditModal}
            className="px-1 text-[10px] font-mono text-zinc-400 hover:text-white min-w-[3rem] text-center select-none transition-colors cursor-pointer"
            title="Add Funds"
         >
             {credits.toFixed(2)} €
         </button>
         <button 
            onClick={onOpenCreditModal}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
            title="Add Funds"
         >
             <Plus className="w-3.5 h-3.5" />
         </button>
      </div>

    </div>
  );
};
