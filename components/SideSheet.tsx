
import React, { useState, useEffect } from 'react';
import { CanvasImage, PromptTemplate } from '../types';
import { Undo, Trash2, Check, Download } from 'lucide-react';
import { DEFAULT_TEMPLATES } from '../data/constants';

// Sub Components
import { PromptTab } from './sidesheet/PromptTab';
import { BrushTab } from './sidesheet/BrushTab';
import { ObjectsTab } from './sidesheet/ObjectsTab';

interface SideSheetProps {
    selectedImage: CanvasImage | null;
    activeTab: 'prompt' | 'brush' | 'objects';
    onTabChange: (tab: 'prompt' | 'brush' | 'objects') => void;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;

    onGenerate: (prompt: string) => void;
    onUpdateAnnotations: (id: string, anns: any[]) => void;
    onDeleteImage: (id: string) => void;
}

const MASK_INSTRUCTION = "Apply the edits as instructed by the text engraved directly on the mask image.";

export const SideSheet: React.FC<SideSheetProps> = ({
    selectedImage,
    activeTab,
    onTabChange,
    brushSize,
    onBrushSizeChange,
    onGenerate,
    onUpdateAnnotations,
    onDeleteImage
}) => {
    const [prompt, setPrompt] = useState('');
    const [openCategory, setOpenCategory] = useState<string>('living');
    const [sidebarVariants, setSidebarVariants] = useState<Record<string, number>>({});
    const [templates, setTemplates] = useState<PromptTemplate[]>(DEFAULT_TEMPLATES);

    // Resizing State
    const [width, setWidth] = useState(360);
    const [isResizing, setIsResizing] = useState(false);

    // AUTO-INJECT PROMPT TEXT when annotations exist
    useEffect(() => {
        if (selectedImage?.annotations && selectedImage.annotations.length > 0) {
            if (!prompt.includes(MASK_INSTRUCTION)) {
                setPrompt(prev => {
                    const prefix = prev.trim() ? prev.trim() + "\n\n" : "";
                    return prefix + MASK_INSTRUCTION;
                });
            }
        }
    }, [selectedImage?.annotations, prompt]);

    // Resizing Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;

            // Calculate new width based on mouse position from right edge of screen
            // Since SideSheet is on the right, width = window.innerWidth - mouseX
            const newWidth = window.innerWidth - e.clientX;

            // Clamp width between min and max
            if (newWidth >= 300 && newWidth <= 800) {
                setWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = ''; // Re-enable text selection
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none'; // Disable text selection while resizing
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    const handleDownload = () => {
        if (!selectedImage) return;
        const link = document.createElement('a');
        link.href = selectedImage.src;
        link.download = `${selectedImage.title}.png`;
        link.click();
    };

    if (!selectedImage) {
        return (
            <div
                style={{ width: width }}
                className="bg-[#111] border-l border-zinc-900 flex items-center justify-center text-zinc-600 text-xs tracking-widest uppercase relative shrink-0"
            >
                {/* Resize Handle - Hit Area */}
                <div
                    className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-50 flex items-center justify-center group"
                    onMouseDown={() => setIsResizing(true)}
                >
                    {/* Visual Line */}
                    <div className={`w-[3px] h-full transition-colors ${isResizing ? 'bg-zinc-600' : 'bg-transparent group-hover:bg-zinc-600'}`} />
                </div>
                No Image Selected
            </div>
        );
    }

    const annotations = selectedImage.annotations || [];

    return (
        <div
            style={{ width: width }}
            className="bg-[#111] border-l border-zinc-900 flex flex-col h-full shadow-2xl z-20 relative shrink-0"
        >
            {/* Resize Handle - Hit Area */}
            <div
                className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-50 flex items-center justify-center group"
                onMouseDown={() => setIsResizing(true)}
            >
                {/* Visual Line */}
                <div className={`w-[3px] h-full transition-colors ${isResizing ? 'bg-zinc-600' : 'bg-transparent group-hover:bg-zinc-600'}`} />
            </div>

            {/* Header */}
            <div className="h-14 flex items-center justify-between px-6 shrink-0 bg-[#111]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 truncate max-w-[180px]">
                    {selectedImage.title}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleDownload}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                        title="Download Image"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDeleteImage(selectedImage.id)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
                        title="Delete Image"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-900 shrink-0">
                {(['prompt', 'brush', 'objects'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === tab
                            ? 'border-white text-white bg-zinc-900/20'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/10'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto relative no-scrollbar flex flex-col bg-[#111]">
                {activeTab === 'prompt' && (
                    <PromptTab
                        prompt={prompt}
                        setPrompt={setPrompt}
                        selectedImage={selectedImage}
                        onGenerate={onGenerate}
                        templates={templates}
                        onSelectTemplate={(t) => setPrompt(t.prompt)}
                    />
                )}

                {activeTab === 'brush' && (
                    <BrushTab
                        brushSize={brushSize}
                        onBrushSizeChange={onBrushSizeChange}
                    />
                )}

                {activeTab === 'objects' && (
                    <ObjectsTab
                        openCategory={openCategory}
                        setOpenCategory={setOpenCategory}
                        sidebarVariants={sidebarVariants}
                        setSidebarVariants={setSidebarVariants}
                    />
                )}
            </div>

            {/* Global Actions - ONLY visible for Brush or Objects tabs */}
            {activeTab !== 'prompt' && (
                <div className="p-6 border-t border-zinc-900 bg-[#111] space-y-3 animate-in slide-in-from-bottom-2">
                    {/* Primary Save Action */}
                    <button
                        onClick={() => onTabChange('prompt')}
                        className="w-full py-3.5 bg-white hover:bg-zinc-200 text-black rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:translate-y-px"
                    >
                        <Check className="w-4 h-4" />
                        Save / Done
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onUpdateAnnotations(selectedImage.id, annotations.slice(0, -1))}
                            disabled={annotations.length === 0}
                            className="flex-1 py-3 rounded bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-30 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                            <Undo className="w-3.5 h-3.5" /> Undo Last
                        </button>
                        <button
                            onClick={() => onUpdateAnnotations(selectedImage.id, [])}
                            disabled={annotations.length === 0}
                            className="px-4 py-3 rounded bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-900/10 transition-all disabled:opacity-30"
                            title="Clear All Annotations"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};
