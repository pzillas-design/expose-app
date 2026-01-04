import React from 'react';
import { TranslationFunction, LibraryCategory } from '@/types';
import { ObjectsTab } from './ObjectsTab';

interface BrushTabProps {
    brushSize?: number;
    onBrushSizeChange?: (size: number) => void;
    maskTool?: 'brush' | 'text' | 'shape';
    onMaskToolChange?: (tool: 'brush' | 'text' | 'shape') => void;
    activeShape?: 'rect' | 'circle' | 'line';
    onActiveShapeChange?: (shape: 'rect' | 'circle' | 'line') => void;
    t: TranslationFunction;

    // Objects Props
    currentLang: 'de' | 'en';
    library: LibraryCategory[];
    onAddUserCategory: (label: string) => void;
    onDeleteUserCategory: (id: string) => void;
    onAddUserItem: (catId: string, label: string) => void;
    onDeleteUserItem: (catId: string, itemId: string) => void;
    onAddObject: (label: string, itemId: string) => void;
    onBack?: () => void;
}

export const BrushTab: React.FC<BrushTabProps> = ({
    t, currentLang, library, onAddUserCategory, onDeleteUserCategory, onAddUserItem, onDeleteUserItem, onAddObject, onBack
}) => {
    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
            {/* Objects Library (Takes remaining space) */}
            <div className="flex-1 min-h-0 px-4 py-4">
                <ObjectsTab
                    t={t}
                    currentLang={currentLang}
                    library={library}
                    onAddUserCategory={onAddUserCategory}
                    onDeleteUserCategory={onDeleteUserCategory}
                    onAddUserItem={onAddUserItem}
                    onDeleteUserItem={onDeleteUserItem}
                    onAddObject={onAddObject}
                    onBack={onBack}
                />
            </div>
        </div>
    );
};
