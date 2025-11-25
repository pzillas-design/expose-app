
import React, { memo, useEffect, useState } from 'react';
import { CanvasImage, AnnotationObject } from '../types';
import { ArrowLeft, Plus, Download } from 'lucide-react';
import { EditorCanvas } from './EditorCanvas';

interface ImageItemProps {
  image: CanvasImage;
  isSelected: boolean;
  zoom: number;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onRetry?: (id: string) => void;
  onChangePrompt?: (id: string) => void;
  // New props for Editor
  editorState?: {
      activeTab: 'prompt' | 'brush' | 'objects';
      brushSize: number;
  };
  onUpdateAnnotations?: (id: string, anns: AnnotationObject[]) => void;
}

const ESTIMATED_DURATION = 14000; 

const ProcessingOverlay: React.FC<{ startTime?: number }> = ({ startTime }) => {
    const [progress, setProgress] = useState(0);
    
    useEffect(() => {
        const start = startTime || Date.now();
        const update = () => {
            const now = Date.now();
            const elapsed = now - start;
            let p = (elapsed / ESTIMATED_DURATION) * 100;
            if (p > 95) p = 95 + (1 - Math.exp(-(elapsed - ESTIMATED_DURATION) / 8000)) * 4.9;
            setProgress(Math.min(p, 99.9));
        };
        const interval = setInterval(update, 30);
        update();
        return () => clearInterval(interval);
    }, [startTime]);

    return (
        <div className="absolute inset-0 bg-[#09090b]/80 flex flex-col items-center justify-center text-white p-6 z-50 overflow-hidden">
            <div className="w-full max-w-[160px] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-500 relative z-10">
                <div className="flex items-end justify-between text-[10px] font-medium tracking-[0.2em] text-zinc-400 uppercase">
                    <span className="text-zinc-300 shadow-black drop-shadow-md">Generating</span>
                </div>
                <div className="h-0.5 w-full bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                    <div className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)] transition-all duration-75 ease-linear" style={{ width: `${progress}%` }} />
                </div>
            </div>
        </div>
    );
}

export const ImageItem: React.FC<ImageItemProps> = memo(({ 
    image, 
    isSelected, 
    zoom, 
    onMouseDown, 
    onRetry, 
    onChangePrompt,
    editorState,
    onUpdateAnnotations
}) => {
  const handleDownload = (e: React.MouseEvent) => {
      e.stopPropagation();
      const link = document.createElement('a');
      link.href = image.src;
      link.download = `${image.title}.png`;
      link.click();
  };

  return (
    <div
      data-image-id={image.id}
      className={`relative shrink-0 select-none group transition-opacity duration-200 snap-center will-change-transform ${
        isSelected 
          ? 'z-20 ring-1 ring-white opacity-100' 
          : 'z-0 opacity-70 hover:opacity-100'
      }`}
      style={{
        width: image.width * zoom,
        height: image.height * zoom,
        scrollSnapStop: 'always',
      }}
      onMouseDown={(e) => onMouseDown(e, image.id)}
    >
      <div className="w-full h-full relative bg-[#1a1a1a] overflow-hidden">
        <img
          src={image.maskSrc || image.src}
          alt={image.title}
          className="w-full h-full object-cover pointer-events-none block"
        />
        
        {/* Editor Overlay - In Place */}
        {isSelected && !image.isGenerating && onUpdateAnnotations && editorState && (
            <div className="absolute inset-0 z-10">
                <EditorCanvas 
                    width={image.width}
                    height={image.height}
                    imageSrc={image.src}
                    annotations={image.annotations || []}
                    onChange={(anns) => onUpdateAnnotations(image.id, anns)}
                    brushSize={editorState.brushSize}
                    activeTab={editorState.activeTab}
                    isActive={isSelected}
                />
            </div>
        )}
        
        {image.isGenerating && (
           <ProcessingOverlay startTime={image.generationStartTime} />
        )}
      </div>

      {isSelected && image.parentId && (
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex flex-row items-center gap-2 z-50 whitespace-nowrap animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-row items-center p-1 bg-[#111]/90 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl shrink-0">
                <button 
                    onClick={(e) => { e.stopPropagation(); onChangePrompt?.(image.id); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
                    title="Go Back to Original"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Back</span>
                </button>
                <div className="w-px h-4 bg-zinc-800 mx-1 shrink-0" />
                <button 
                    onClick={(e) => { e.stopPropagation(); onRetry?.(image.id); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
                    title="Generate More Variations"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">More</span>
                </button>
                {!image.isGenerating && (
                    <>
                        <div className="w-px h-4 bg-zinc-800 mx-1 shrink-0" />
                        <button 
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
                            title="Download Image"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-medium uppercase tracking-wider">Save</span>
                        </button>
                    </>
                )}
            </div>
        </div>
      )}
    </div>
  );
});

ImageItem.displayName = 'ImageItem';
