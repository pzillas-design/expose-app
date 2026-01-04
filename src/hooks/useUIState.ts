import { useState } from 'react';

export const useUIState = () => {
    const [sideSheetMode, setSideSheetMode] = useState<'prompt' | 'brush' | 'objects'>('prompt');
    const [brushSize, setBrushSize] = useState(150);
    const [maskTool, setMaskTool] = useState<'brush' | 'text' | 'shape'>('brush');
    const [activeShape, setActiveShape] = useState<'rect' | 'circle' | 'line'>('rect');
    const [isDragOver, setIsDragOver] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAdminOpen, setIsAdminOpen] = useState(false);

    return {
        sideSheetMode,
        setSideSheetMode,
        brushSize,
        setBrushSize,
        maskTool,
        setMaskTool,
        activeShape,
        setActiveShape,
        isDragOver,
        setIsDragOver,
        isSettingsOpen,
        setIsSettingsOpen,
        isAdminOpen,
        setIsAdminOpen
    };
};
