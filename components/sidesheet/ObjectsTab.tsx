
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { STAMP_LIBRARY } from '../../data/constants';

interface ObjectsTabProps {
  openCategory: string;
  setOpenCategory: (id: string) => void;
  sidebarVariants: Record<string, number>;
  setSidebarVariants: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export const ObjectsTab: React.FC<ObjectsTabProps> = ({
  openCategory,
  setOpenCategory,
  sidebarVariants,
  setSidebarVariants
}) => {
  
  const handleDragStart = (e: React.DragEvent, text: string, itemId: string, variantIndex: number) => {
      const payload = JSON.stringify({ text, itemId, variantIndex });
      e.dataTransfer.setData('application/x-nano-stamp', payload);
      e.dataTransfer.effectAllowed = 'copy';
  };

  const cycleVariant = (e: React.MouseEvent, itemId: string, count: number, dir: number) => {
      e.stopPropagation();
      setSidebarVariants(prev => {
          const curr = prev[itemId] || 0;
          let next = curr + dir;
          if (next < 0) next = count - 1;
          if (next >= count) next = 0;
          return { ...prev, [itemId]: next };
      });
  };

  return (
      <div className="px-6 py-4 space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="space-y-1 -mx-2">
              {STAMP_LIBRARY.map((category) => {
                  const isExpanded = openCategory === category.id;
                  return (
                      <div key={category.id} className="border-b border-zinc-900/50 last:border-0">
                          <button 
                            onClick={() => setOpenCategory(isExpanded ? '' : category.id)}
                            className={`w-full flex items-center justify-between px-3 py-4 text-left transition-colors group ${isExpanded ? 'bg-transparent' : 'hover:bg-zinc-900/30'}`}
                          >
                              <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isExpanded ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                                  {category.label}
                              </span>
                              <ChevronRight className={`w-3 h-3 text-zinc-600 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-zinc-400' : ''}`} />
                          </button>
                          {isExpanded && (
                              <div className="pb-4 px-3 flex flex-col gap-2">
                                  {category.items.map((item) => {
                                      const currIdx = sidebarVariants[item.id] || 0;
                                      const variant = item.variants[currIdx];
                                      return (
                                        <div key={item.id} className="relative group">
                                            <div 
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, variant.label, item.id, currIdx)}
                                                className="flex items-center w-full p-2 bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600 transition-all rounded-lg cursor-grab active:cursor-grabbing select-none"
                                            >
                                                <div className="flex-1 flex items-center justify-between pl-2 pr-1">
                                                    <button 
                                                        onClick={(e) => cycleVariant(e, item.id, item.variants.length, -1)}
                                                        disabled={item.variants.length <= 1}
                                                        className="p-2 text-zinc-500 hover:text-white"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 text-center truncate flex-1 px-2">
                                                        {variant.icon} {variant.label}
                                                    </span>
                                                    <button 
                                                        onClick={(e) => cycleVariant(e, item.id, item.variants.length, 1)}
                                                        disabled={item.variants.length <= 1}
                                                        className="p-2 text-zinc-500 hover:text-white"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                  );
              })}
          </div>
      </div>
  );
};
