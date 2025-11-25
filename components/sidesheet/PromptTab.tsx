
import React from 'react';
import { CanvasImage, PromptTemplate } from '../../types';
import { PresetLibrary } from '../TemplateModal';

interface PromptTabProps {
  prompt: string;
  setPrompt: (s: string) => void;
  selectedImage: CanvasImage;
  onGenerate: (prompt: string) => void;
  templates: PromptTemplate[];
  onSelectTemplate: (t: PromptTemplate) => void;
}

export const PromptTab: React.FC<PromptTabProps> = ({
  prompt,
  setPrompt,
  selectedImage,
  onGenerate,
  templates,
  onSelectTemplate
}) => {
  return (
    <div className="flex flex-col min-h-full animate-in fade-in slide-in-from-right-2 duration-300">
      <div className="px-6 py-6 space-y-4 flex-1">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe changes..."
          className="w-full bg-[#161616] rounded border border-zinc-800/50 focus:border-zinc-700 p-4 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:bg-[#1a1a1a] transition-all resize-none h-40 font-mono leading-relaxed"
          disabled={selectedImage.isGenerating}
        />
        <button
          onClick={() => onGenerate(prompt)}
          disabled={!prompt.trim() || selectedImage.isGenerating}
          className="w-full py-3 bg-white hover:bg-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed text-black rounded font-medium text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:translate-y-px"
        >
          {selectedImage.isGenerating ? 'Processing...' : 'Generate'}
        </button>
      </div>
      <div className="border-t border-zinc-900 mt-auto">
        <PresetLibrary
          templates={templates}
          onSelect={onSelectTemplate}
          onTogglePin={() => { }}
          onDelete={() => { }}
          onCreate={() => { }}
        />
      </div>
    </div>
  );
};
