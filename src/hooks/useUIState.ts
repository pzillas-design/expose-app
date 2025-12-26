import { useState } from 'react';

export const useUIState = () => {
    const [sideSheetMode, setSideSheetMode] = useState<'prompt' | 'brush' | 'objects'>('prompt');
    const [brushSize, setBrushSize] = useState(150);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAdminOpen, setIsAdminOpen] = useState(false);

    return {
        sideSheetMode,
        setSideSheetMode,
        brushSize,
        setBrushSize,
        isDragOver,
        setIsDragOver,
        isSettingsOpen,
        setIsSettingsOpen,
        isAdminOpen,
        setIsAdminOpen
    };
};
