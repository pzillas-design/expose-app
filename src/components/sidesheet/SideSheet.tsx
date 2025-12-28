import React, { useState, useEffect } from 'react';
import { CanvasImage, PromptTemplate, AnnotationObject, TranslationFunction, LibraryCategory, LibraryItem } from '@/types';
import { Trash2, Download, ArrowLeft, Check, Layers } from 'lucide-react';
import { DEFAULT_TEMPLATES } from '@/data/promptTemplates';
import { IconButton, Button, Typo, Theme } from '@/components/ui/DesignSystem';
import { useResizable } from '@/hooks/useResizable';
import { CropModal } from '@/components/modals/CropModal';
import { generateId } from '@/utils/ids';
import { downloadImage } from '@/utils/imageUtils';

// Sub Components
import { PromptTab } from './PromptTab';
import { BrushTab } from './BrushTab';
import { ObjectsTab } from './ObjectsTab';

interface SideSheetProps {
    selectedImage: CanvasImage | null;
    selectedImages?: CanvasImage[]; // New: support for multi selection
    sideSheetMode: 'prompt' | 'brush' | 'objects';
    onModeChange: (mode: 'prompt' | 'brush' | 'objects') => void;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    onGenerate: (prompt: string) => void;
    onUpdateAnnotations: (id: string, anns: any[]) => void;
    onUpdatePrompt: (id: string, text: string) => void;
    onDeleteImage: (id: string | string[]) => void;
    onDeselectAllButOne?: () => void;
    onGenerateMore: (id: string) => void;
    onNavigateParent: (id: string) => void;
    // Drag & Drop props
    isGlobalDragOver: boolean;
    onGlobalDragLeave: () => void;
    t: TranslationFunction;
    lang: 'de' | 'en';
    // User Library Props
    fullLibrary: LibraryCategory[];
    onAddUserCategory: (label: string) => void;
    onDeleteUserCategory: (id: string) => void;
    onAddUserItem: (catId: string, label: string) => void;
    onDeleteUserItem: (catId: string, itemId: string) => void;
}

export const SideSheet: React.FC<SideSheetProps> = ({
    selectedImage,
    selectedImages,
    sideSheetMode,
    onModeChange,
    brushSize,
    onBrushSizeChange,
    onGenerate,
    onUpdateAnnotations,
    onUpdatePrompt,
    onDeleteImage,
    onDeselectAllButOne,
    onGenerateMore,
    onNavigateParent,
    isGlobalDragOver,
    onGlobalDragLeave,
    t,
    lang,
    fullLibrary,
    onAddUserCategory,
    onDeleteUserCategory,
    onAddUserItem,
    onDeleteUserItem
}) => {
    const [prompt, setPrompt] = useState('');
    const [templates, setTemplates] = useState<PromptTemplate[]>(DEFAULT_TEMPLATES);

    // Crop Modal State
    const [isCropOpen, setIsCropOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<string | null>(null);
    const [pendingFileName, setPendingFileName] = useState<string>('');
    const [isSideZoneActive, setIsSideZoneActive] = useState(false);

    const { size: width, startResizing } = useResizable({
        initialSize: 360,
        min: 300,
        max: 800,
        direction: 'width',
        reverse: true
    });

    const isMulti = selectedImages && selectedImages.length > 1;

    useEffect(() => {
        if (selectedImage && !isMulti) {
            setPrompt(selectedImage.userDraftPrompt || '');
        } else if (isMulti) {
            if (!prompt) setPrompt('');
        }
    }, [selectedImage?.id, selectedImage?.userDraftPrompt, isMulti]);

    const handlePromptChange = (val: string) => {
        setPrompt(val);
        if (selectedImage && !isMulti) {
            onUpdatePrompt(selectedImage.id, val);
        }
    };

    const handleDownload = async () => {
        if (isMulti && selectedImages) {
            for (const img of selectedImages) {
                if (img.src) {
                    await downloadImage(img.src, img.title);
                    // Small delay to prevent browser blocking multiple downloads
                    await new Promise(r => setTimeout(r, 300));
                }
            }
        } else if (selectedImage && selectedImage.src) {
            await downloadImage(selectedImage.src, selectedImage.title);
        }
    };

    const handleDelete = () => {
        if (isMulti && selectedImages) {
            const ids = selectedImages.map(i => i.id);
            onDeleteImage(ids);
        } else if (selectedImage) {
            onDeleteImage(selectedImage.id);
        }
    }

    const handleDeselectPreservingPrompt = () => {
        if (selectedImage && prompt) {
            onUpdatePrompt(selectedImage.id, prompt);
        }
        onDeselectAllButOne?.();
    };

    const deleteAnnotation = (annId: string) => {
        if (!selectedImage || !selectedImage.annotations) return;
        const newAnns = selectedImage.annotations.filter(a => a.id !== annId);
        onUpdateAnnotations(selectedImage.id, newAnns);
    };

    const updateAnnotation = (annId: string, patch: Partial<AnnotationObject>) => {
        if (!selectedImage || !selectedImage.annotations) return;
        const newAnns = selectedImage.annotations.map(a => a.id === annId ? { ...a, ...patch } : a);
        onUpdateAnnotations(selectedImage.id, newAnns);
    };

    const handleAddReferenceImage = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (typeof e.target?.result === 'string') {
                setPendingFile(e.target.result);
                setPendingFileName(file.name);
                setIsCropOpen(true);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onGlobalDragLeave();
        setIsSideZoneActive(false);

        if (!selectedImage) return;

        const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            if (sideSheetMode !== 'prompt') onModeChange('prompt');
            handleAddReferenceImage(files[0]);
        }
    };

    const handleCropComplete = (croppedBase64: string) => {
        if (!selectedImage) return;
        const currentAnns = selectedImage.annotations || [];
        const refCount = currentAnns.filter(a => a.type === 'reference_image').length;

        const labelText = pendingFileName || `${t('image_ref')} ${refCount + 1}`;

        const newRef: AnnotationObject = {
            id: generateId(),
            type: 'reference_image',
            points: [],
            strokeWidth: 0,
            color: '#fff',
            text: labelText,
            referenceImage: croppedBase64,
            createdAt: Date.now()
        };

        onUpdateAnnotations(selectedImage.id, [...currentAnns, newRef]);
        setPendingFile(null);
        setPendingFileName('');
    };

    const handleAddObjectCenter = (label: string, itemId: string) => {
        if (!selectedImage) return;
        const currentAnns = selectedImage.annotations || [];

        const newStamp: AnnotationObject = {
            id: generateId(),
            type: 'stamp',
            points: [],
            x: selectedImage.width / 2,
            y: selectedImage.height / 2,
            strokeWidth: 0,
            color: '#fff',
            text: label,
            itemId: itemId,
            variantIndex: 0,
            createdAt: Date.now()
        };

        onUpdateAnnotations(selectedImage.id, [...currentAnns, newStamp]);
    };

    const handleGenerateWrapper = (p: string) => {
        onGenerate(p);
        if (!p.trim()) return;
        setTemplates(prev => {
            const existing = prev.find(t => t.prompt === p);
            if (existing) {
                return prev.map(t => t.id === existing.id ? { ...t, lastUsed: Date.now(), usageCount: t.usageCount + 1 } : t);
            }
            const newHistoryItem: PromptTemplate = {
                id: generateId(),
                title: p.length > 20 ? p.substring(0, 20) + '...' : p,
                prompt: p,
                tags: [],
                isPinned: false,
                isCustom: false,
                usageCount: 1,
                lastUsed: Date.now(),
                createdAt: Date.now(),
                lang: lang
            };
            return [...prev, newHistoryItem];
        });
    };

    const handleTogglePin = (id: string) => {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t));
    };

    const handleDeleteTemplate = (id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
    };

    const handleUpdateTemplate = (id: string, updates: Partial<PromptTemplate>) => {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const handleCreateTemplate = (newT: Omit<PromptTemplate, 'id' | 'isPinned' | 'usageCount' | 'isCustom' | 'lastUsed'>) => {
        const template: PromptTemplate = {
            ...newT,
            id: generateId(),
            isPinned: true,
            isCustom: true,
            usageCount: 0,
            lastUsed: Date.now(),
            createdAt: Date.now()
        };
        setTemplates(prev => [...prev, template]);
    };

    if (!selectedImage) {
        return (
            <div
                className={`w-[360px] ${Theme.Colors.PanelBg} border-l ${Theme.Colors.Border} flex items-center justify-center relative`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); onGlobalDragLeave(); }}
            >
                <div className={Typo.Label}>{t('no_image')}</div>
            </div>
        );
    }

    const SubHeader = ({ title }: { title: string }) => (
        <div className={`h-14 flex items-center gap-2 px-4 shrink-0 ${Theme.Colors.PanelBg} border-b ${Theme.Colors.Border}`}>
            <IconButton icon={<ArrowLeft className="w-4 h-4" />} onClick={() => onModeChange('prompt')} tooltip={t('back')} />
            <span className={`${Typo.Label} ${Theme.Colors.TextPrimary}`}>{title}</span>
        </div>
    );

    const DoneButton = () => (
        <div className={`p-6 border-t ${Theme.Colors.Border} ${Theme.Colors.PanelBg}`}>
            <Button
                variant="primary"
                onClick={() => onModeChange('prompt')}
                className="w-full"
                icon={<Check className="w-4 h-4" />}
            >
                {t('done')}
            </Button>
        </div>
    );

    const renderContent = () => {
        switch (sideSheetMode) {
            case 'prompt':
                return (
                    <>
                        <div className={`h-14 flex items-center justify-between px-6 shrink-0 ${Theme.Colors.PanelBg} ${Theme.Colors.Border}`}>
                            {isMulti && selectedImages ? (
                                <span className={`${Typo.Label} text-zinc-900 dark:text-zinc-100`}>
                                    {selectedImages.length} {t('images_selected')}
                                </span>
                            ) : (
                                <span className={`${Typo.Label} truncate max-w-[180px]`}>
                                    {selectedImage.title}
                                </span>
                            )}

                            <div className="flex items-center gap-1">
                                <IconButton icon={<Download className="w-4 h-4" />} onClick={handleDownload} tooltip={isMulti ? t('download_all') : "Download"} />
                                <IconButton icon={<Trash2 className="w-4 h-4" />} onClick={handleDelete} className="hover:text-red-400" tooltip={isMulti ? t('delete_all') : t('delete')} />
                            </div>
                        </div>
                        <div className={`flex-1 overflow-hidden flex flex-col relative ${Theme.Colors.PanelBg}`}>
                            <PromptTab
                                prompt={prompt}
                                setPrompt={handlePromptChange}
                                selectedImage={selectedImage}
                                selectedImages={selectedImages}
                                onGenerate={handleGenerateWrapper}
                                onDeselect={handleDeselectPreservingPrompt}
                                templates={templates}
                                onSelectTemplate={(t) => handlePromptChange(t.prompt)}
                                onAddBrush={() => onModeChange('brush')}
                                onAddObject={() => onModeChange('objects')}
                                onAddReference={handleAddReferenceImage}
                                annotations={selectedImage.annotations || []}
                                onDeleteAnnotation={deleteAnnotation}
                                onUpdateAnnotation={updateAnnotation}
                                onTogglePin={handleTogglePin}
                                onDeleteTemplate={handleDeleteTemplate}
                                onCreateTemplate={handleCreateTemplate}
                                onUpdateTemplate={handleUpdateTemplate}
                                onGenerateMore={onGenerateMore}
                                onNavigateParent={onNavigateParent}
                                t={t}
                                currentLang={lang}
                            />
                        </div>
                    </>
                );
            case 'brush':
                if (isMulti) return null;
                return (
                    <div className="flex flex-col h-full">
                        <SubHeader title={t('back')} />
                        <div className={`flex-1 overflow-y-auto ${Theme.Colors.PanelBg}`}>
                            <BrushTab brushSize={brushSize} onBrushSizeChange={onBrushSizeChange} t={t} />
                        </div>
                        <DoneButton />
                    </div>
                );
            case 'objects':
                if (isMulti) return null;
                return (
                    <div className="flex flex-col h-full">
                        <div className={`flex-1 overflow-hidden flex flex-col ${Theme.Colors.PanelBg}`}>
                            <ObjectsTab
                                onAddObject={handleAddObjectCenter}
                                onBack={() => onModeChange('prompt')}
                                t={t}
                                currentLang={lang}
                                library={fullLibrary}
                                onAddUserCategory={onAddUserCategory}
                                onDeleteUserCategory={onDeleteUserCategory}
                                onAddUserItem={onAddUserItem}
                                onDeleteUserItem={onDeleteUserItem}
                            />
                        </div>
                        <DoneButton />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <div
                className={`${Theme.Colors.PanelBg} border-l ${Theme.Colors.Border} flex flex-col h-full z-20 relative transition-colors duration-200`}
                style={{ width: width }}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={handleDrop}
            >
                {isGlobalDragOver && (
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDragEnter={() => setIsSideZoneActive(true)}
                        onDragLeave={() => setIsSideZoneActive(false)}
                        className={`
                        absolute inset-4 z-50 ${Theme.Geometry.RadiusLg} flex items-center justify-center transition-all duration-200 pointer-events-auto
                        ${isSideZoneActive ? 'bg-zinc-800/90 border-zinc-600 scale-[1.01]' : 'bg-white/90 dark:bg-zinc-950/80 border-zinc-200 dark:border-zinc-800 scale-100'}
                        border
                    `}
                    >
                        <div className="flex flex-col items-center gap-3 pointer-events-none">
                            <Layers className={`w-8 h-8 ${isSideZoneActive ? 'text-white' : 'text-zinc-500'}`} strokeWidth={1.5} />
                            <span className={`${Typo.Label} ${isSideZoneActive ? 'text-white' : 'text-zinc-500'} tracking-widest`}>Add Context</span>
                        </div>
                    </div>
                )}

                <div
                    className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-zinc-400 dark:hover:bg-zinc-700 transition-colors z-50"
                    onMouseDown={startResizing}
                />

                {renderContent()}
            </div>

            <CropModal
                isOpen={isCropOpen}
                onClose={() => setIsCropOpen(false)}
                imageSrc={pendingFile}
                onCropComplete={handleCropComplete}
            />
        </>
    );
};
