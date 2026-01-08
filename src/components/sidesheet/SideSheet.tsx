import React, { useState, useEffect } from 'react';
import { CanvasImage, PromptTemplate, AnnotationObject, TranslationFunction, LibraryCategory, LibraryItem, GenerationQuality } from '@/types';
import { Trash2, Download, ArrowLeft, Check, Layers, ChevronLeft, Upload, Plus, Info, Undo2, Redo2, MousePointer2, Pen, Shapes, Type, Package } from 'lucide-react';
import { DEFAULT_TEMPLATES } from '@/data/promptTemplates';
import { IconButton, Button, Typo, Theme } from '@/components/ui/DesignSystem';
import { InfoFilled } from '@/components/ui/CustomIcons';
import { Logo } from '@/components/ui/Logo';
import { Wordmark } from '@/components/ui/Wordmark';
import { useResizable } from '@/hooks/useResizable';
import { CropModal } from '@/components/modals/CropModal';
import { generateId } from '@/utils/ids';
import { downloadImage } from '@/utils/imageUtils';
import { CreationModal } from '@/components/modals/CreationModal';
import { useItemDialog } from '@/components/ui/Dialog';

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
    onBrushResizeStart?: () => void;
    onBrushResizeEnd?: () => void;
    onGenerate: (prompt: string) => void;
    onUpdateAnnotations: (id: string, anns: any[]) => void;
    onUpdatePrompt: (id: string, text: string) => void;
    onUpdateVariables: (id: string, templateId: string | undefined, vars: Record<string, string[]>) => void;
    onDeleteImage: (id: string | string[]) => void;
    onDeselectAllButOne?: () => void;
    onDeselectAll?: () => void;
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
    onDeleteUserItem: (catId: string, itemId: string) => void;
    maskTool: 'brush' | 'text' | 'shape' | 'select';
    onMaskToolChange: (tool: 'brush' | 'text' | 'shape' | 'select') => void;
    activeShape: 'rect' | 'circle' | 'line';
    onActiveShapeChange: (shape: 'rect' | 'circle' | 'line') => void;
    onUpload?: () => void;
    onCreateNew?: () => void;
    isBoardEmpty?: boolean;
    qualityMode: GenerationQuality;
    onQualityModeChange: (mode: GenerationQuality) => void;
    templates: PromptTemplate[];
    onRefreshTemplates?: () => void;
    onSaveTemplate?: (template: any) => Promise<void>;
    onDeleteTemplate?: (id: string) => Promise<void>;
    userProfile: any;
}

export const SideSheet: React.FC<SideSheetProps> = ({
    selectedImage,
    selectedImages,
    sideSheetMode,
    onModeChange,
    brushSize,
    onBrushSizeChange,
    onBrushResizeStart,
    onBrushResizeEnd,
    onGenerate,
    onUpdateAnnotations,
    onUpdatePrompt,
    onUpdateVariables,
    onDeleteImage,
    onDeselectAllButOne,
    onDeselectAll,
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
    onDeleteUserItem,
    maskTool,
    onMaskToolChange,
    activeShape,
    onActiveShapeChange,
    onUpload,
    onCreateNew,
    isBoardEmpty,
    qualityMode,
    onQualityModeChange,
    templates: globalTemplates,
    onRefreshTemplates,
    onSaveTemplate,
    onDeleteTemplate,
    userProfile
}) => {
    const [prompt, setPrompt] = useState('');
    const templates = globalTemplates;

    // Crop Modal State
    const [isCropOpen, setIsCropOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<string | null>(null);
    const [pendingFileName, setPendingFileName] = useState<string>('');
    const [pendingAnnotationId, setPendingAnnotationId] = useState<string | null>(null);
    const [isSideZoneActive, setIsSideZoneActive] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [historyMap, setHistoryMap] = useState<Map<string, AnnotationObject[][]>>(new Map());
    const [historyIndexMap, setHistoryIndexMap] = useState<Map<string, number>>(new Map());
    const [initialAnns, setInitialAnns] = useState<AnnotationObject[]>([]);
    const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
    const { confirm } = useItemDialog();

    // Get current image's history
    const history = selectedImage?.id ? (historyMap.get(selectedImage.id) || []) : [];
    const historyIndex = selectedImage?.id ? (historyIndexMap.get(selectedImage.id) ?? -1) : -1;

    // Initialize history when image changes or enters brush mode
    useEffect(() => {
        if (selectedImage?.id) {
            const currentAnns = selectedImage.annotations || [];

            // Only initialize if this image doesn't have history yet
            if (!historyMap.has(selectedImage.id)) {
                const newHistoryMap = new Map(historyMap);
                const newIndexMap = new Map(historyIndexMap);
                newHistoryMap.set(selectedImage.id, [currentAnns]);
                newIndexMap.set(selectedImage.id, 0);
                setHistoryMap(newHistoryMap);
                setHistoryIndexMap(newIndexMap);
            }

            // Set initial annotations when entering brush mode
            if (sideSheetMode === 'brush') {
                setInitialAnns(currentAnns);
            }
        }
    }, [selectedImage?.id, sideSheetMode]);

    const updateAnnotationsWithHistory = (newAnns: AnnotationObject[]) => {
        if (!selectedImage) return;

        const currentHistory = historyMap.get(selectedImage.id) || [];
        const currentIndex = historyIndexMap.get(selectedImage.id) ?? -1;

        // Push to undo stack
        const newHistory = currentHistory.slice(0, currentIndex + 1);
        newHistory.push(newAnns);
        if (newHistory.length > 50) newHistory.shift();

        const newHistoryMap = new Map(historyMap);
        const newIndexMap = new Map(historyIndexMap);
        newHistoryMap.set(selectedImage.id, newHistory);
        newIndexMap.set(selectedImage.id, newHistory.length - 1);

        setHistoryMap(newHistoryMap);
        setHistoryIndexMap(newIndexMap);

        onUpdateAnnotations(selectedImage.id, newAnns);
    };

    const handleUndo = () => {
        if (!selectedImage) return;
        const currentHistory = historyMap.get(selectedImage.id) || [];
        const currentIndex = historyIndexMap.get(selectedImage.id) ?? -1;

        if (currentIndex <= 0) return;

        const prevIndex = currentIndex - 1;
        const newIndexMap = new Map(historyIndexMap);
        newIndexMap.set(selectedImage.id, prevIndex);
        setHistoryIndexMap(newIndexMap);

        onUpdateAnnotations(selectedImage.id, currentHistory[prevIndex]);
    };

    const handleRedo = () => {
        if (!selectedImage) return;
        const currentHistory = historyMap.get(selectedImage.id) || [];
        const currentIndex = historyIndexMap.get(selectedImage.id) ?? -1;

        if (currentIndex >= currentHistory.length - 1) return;

        const nextIndex = currentIndex + 1;
        const newIndexMap = new Map(historyIndexMap);
        newIndexMap.set(selectedImage.id, nextIndex);
        setHistoryIndexMap(newIndexMap);

        onUpdateAnnotations(selectedImage.id, currentHistory[nextIndex]);
    };

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

            // When a new image is selected, default to prompt (edit) mode
            // EXCEPT if it's currently generating (we stay in whatever mode we were in)
            if (sideSheetMode !== 'prompt' && !selectedImage.isGenerating) {
                onModeChange('prompt');
            }
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
        onDeselectAll();
    };

    const deleteAnnotation = (annId: string) => {
        if (!selectedImage || !selectedImage.annotations) return;
        const newAnns = selectedImage.annotations.filter(a => a.id !== annId);
        updateAnnotationsWithHistory(newAnns);
    };

    const updateAnnotation = (annId: string, patch: Partial<AnnotationObject>) => {
        if (!selectedImage || !selectedImage.annotations) return;
        const newAnns = selectedImage.annotations.map(a => a.id === annId ? { ...a, ...patch } : a);
        updateAnnotationsWithHistory(newAnns);
    };

    const handleAddReferenceImage = (file: File, annotationId?: string) => {
        setPendingAnnotationId(annotationId || null);
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

        if (pendingAnnotationId) {
            // Update existing annotation
            const updatedAnns = currentAnns.map(ann =>
                ann.id === pendingAnnotationId ? { ...ann, referenceImage: croppedBase64 } : ann
            );
            updateAnnotationsWithHistory(updatedAnns);
        } else {
            // Create new global reference
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

            updateAnnotationsWithHistory([...currentAnns, newRef]);
        }

        setPendingFile(null);
        setPendingFileName('');
        setPendingAnnotationId(null);
    };

    const handleAddObjectCenter = (label: string, itemId: string, icon?: string) => {
        if (!selectedImage) return;
        const currentAnns = selectedImage.annotations || [];
        const cx = selectedImage.width / 2;
        const cy = selectedImage.height / 2;

        // Handle REMOVE stamp
        if (itemId === 'util:remove') {
            const newStamp: AnnotationObject = {
                id: generateId(),
                type: 'stamp',
                points: [],
                x: cx,
                y: cy,
                strokeWidth: 0,
                color: '#ef4444',
                text: 'Remove',
                emoji: '🗑️',
                itemId: itemId,
                createdAt: Date.now()
            };
            updateAnnotationsWithHistory([...currentAnns, newStamp]);
            setActiveAnnotationId(newStamp.id);
            onMaskToolChange('select');
            return;
        }

        // Handle CLEAR ALL MASKS
        if (itemId === 'util:clear_masks') {
            const nonMaskAnns = currentAnns.filter(a => a.type !== 'mask_path');
            updateAnnotationsWithHistory(nonMaskAnns);
            return;
        }

        const newAnn: AnnotationObject = {
            id: generateId(),
            type: 'stamp',
            x: cx,
            y: cy,
            text: label,
            itemId,
            emoji: icon,
            color: '#fff',
            strokeWidth: 4,
            points: [],
            createdAt: Date.now()
        };

        updateAnnotationsWithHistory([...currentAnns, newAnn]);
        setActiveAnnotationId(newAnn.id);
        onMaskToolChange('select');
    };

    const handleAddText = () => {
        if (!selectedImage) return;
        const currentAnns = selectedImage.annotations || [];
        const cx = selectedImage.width / 2;
        const cy = selectedImage.height / 2;

        const newText: AnnotationObject = {
            id: generateId(),
            type: 'stamp',
            x: cx,
            y: cy,
            text: '',
            color: '#fff',
            strokeWidth: 4,
            points: [],
            createdAt: Date.now()
        };

        updateAnnotationsWithHistory([...currentAnns, newText]);
        setActiveAnnotationId(newText.id);
    };

    const handleAddShape = (shape: 'rect' | 'circle' | 'line') => {
        if (!selectedImage) return;
        const currentAnns = selectedImage.annotations || [];
        const cx = selectedImage.width / 2;
        const cy = selectedImage.height / 2;
        const size = Math.min(selectedImage.width, selectedImage.height) * 0.3;

        let newShape: AnnotationObject;

        if (shape === 'line') {
            const half = size / 2;
            newShape = {
                id: generateId(),
                type: 'shape',
                shapeType: 'line',
                points: [
                    { x: cx - half, y: cy },
                    { x: cx + half, y: cy }
                ],
                strokeWidth: 4,
                color: '#fff',
                createdAt: Date.now()
            };
        } else if (shape === 'rect') {
            const half = size / 2;
            const x = cx - half;
            const y = cy - half;
            newShape = {
                id: generateId(),
                type: 'shape',
                shapeType: 'rect',
                points: [
                    { x, y },
                    { x: x + size, y },
                    { x: x + size, y: y + size },
                    { x, y: y + size }
                ],
                strokeWidth: 4,
                color: '#fff',
                createdAt: Date.now()
            };
        } else {
            // Circle
            const half = size / 2;
            newShape = {
                id: generateId(),
                type: 'shape',
                shapeType: 'circle',
                x: cx - half, y: cy - half, width: size, height: size,
                rotation: 0,
                points: [],
                strokeWidth: 4,
                color: '#fff',
                createdAt: Date.now()
            };
        }

        updateAnnotationsWithHistory([...currentAnns, newShape]);
        setActiveAnnotationId(newShape.id);
        onMaskToolChange('select');
    };

    const handleGenerateWrapper = (p: string) => {
        onGenerate(p);
    };

    const handleTogglePin = (id: string) => {
        // In the new logic, TogglePin on a system preset means Hiding it
        // and on a user preset it might mean deleting or actual pinning.
        // For now, let's wire it to onDeleteTemplate which handles the logic.
        onDeleteTemplate?.(id);
    };

    const handleDeleteTemplate = (id: string) => {
        onDeleteTemplate?.(id);
    };

    const handleUpdateTemplate = (id: string, updates: Partial<PromptTemplate>) => {
        const existing = templates.find(t => t.id === id);
        if (existing) {
            onSaveTemplate?.({ ...existing, ...updates });
        }
    };

    const handleCreateTemplate = (newT: Omit<PromptTemplate, 'id' | 'isPinned' | 'usageCount' | 'isCustom' | 'lastUsed'>) => {
        onSaveTemplate?.(newT);
    };

    const handleExitBrushMode = async () => {
        if (!selectedImage) {
            onModeChange('prompt');
            return;
        }

        const currentAnns = selectedImage.annotations || [];
        // Basic comparison
        const hasChanges = JSON.stringify(currentAnns) !== JSON.stringify(initialAnns);

        if (hasChanges) {
            const result = await confirm({
                title: lang === 'de' ? 'Änderungen speichern?' : 'Save changes?',
                description: lang === 'de'
                    ? 'Möchten Sie Ihre Änderungen an den Anmerkungen speichern oder verwerfen?'
                    : 'Do you want to save or discard your changes to the annotations?',
                confirmLabel: lang === 'de' ? 'Speichern' : 'Save',
                cancelLabel: lang === 'de' ? 'Verwerfen' : 'Discard',
                variant: 'primary'
            });

            if (result === true) {
                // Save is already real-time, just go back
                onModeChange('prompt');
            } else if (result === false) {
                // Discard: Revert to initial
                onUpdateAnnotations(selectedImage.id, initialAnns);
                onModeChange('prompt');
            }
        } else {
            onModeChange('prompt');
        }
    };

    // --- RENDER CONTENT ---


    const SubHeader = ({ title, onBack }: { title: string, onBack?: () => void }) => (
        <div className={`h-14 flex items-center gap-1 px-4 shrink-0 ${Theme.Colors.PanelBg} border-b ${Theme.Colors.Border}`}>
            <IconButton icon={<ChevronLeft className="w-4 h-4" />} onClick={onBack || (() => onModeChange('prompt'))} tooltip={t('back')} />
            <span className={`${Typo.Label} ${Theme.Colors.TextPrimary} font-bold`}>{title}</span>
            <div className="flex-1" />
            <div className="flex items-center gap-0.5">
                <IconButton
                    icon={<Undo2 className="w-3.5 h-3.5" />}
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    tooltip="Undo"
                />
                <IconButton
                    icon={<Redo2 className="w-3.5 h-3.5" />}
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    tooltip="Redo"
                />
            </div>
        </div>
    );

    const DoneButton = () => (
        <div className={`p-6 border-t ${Theme.Colors.Border} ${Theme.Colors.PanelBg} mt-auto`}>
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

    const ToolSwitcherItem = ({ icon: Icon, active, onClick, tooltip }: { icon: any, active: boolean, onClick: () => void, tooltip?: string }) => (
        <IconButton
            icon={<Icon className={`w-4 h-4 ${active ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`} />}
            onClick={onClick}
            active={active}
            tooltip={tooltip}
            className={`flex-1 !rounded-xl h-10 ${active ? 'bg-zinc-100 dark:bg-zinc-800 shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/10'}`}
        />
    );

    const renderSelectedContent = () => {
        switch (sideSheetMode) {
            case 'prompt':
                return (
                    <>
                        <div className={`h-14 flex items-center justify-between px-4 shrink-0 ${Theme.Colors.PanelBg} border-b ${Theme.Colors.Border}`}>
                            <div className="flex items-center gap-2 flex-1 mr-2 overflow-hidden">
                                <IconButton
                                    icon={<ChevronLeft className="w-4 h-4" />}
                                    onClick={() => onDeselectAll?.()}
                                    tooltip={t('tt_deselect')}
                                />
                                {isMulti && selectedImages ? (
                                    <span className={`${Typo.Label} text-zinc-900 dark:text-zinc-100 truncate`}>
                                        {selectedImages.length} {t('images_selected')}
                                    </span>
                                ) : (
                                    <span className={`${Typo.Label} truncate underline underline-offset-4 decoration-zinc-200 dark:decoration-zinc-800`}>
                                        {selectedImage.title}
                                    </span>
                                )}
                            </div>

                            {!isMulti && (
                                <IconButton
                                    icon={<InfoFilled className="w-4 h-4" />}
                                    active={showInfo}
                                    onClick={() => setShowInfo(!showInfo)}
                                    className="text-zinc-400"
                                    tooltip="Info"
                                />
                            )}
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
                                onAddObject={() => onModeChange('brush')}
                                onAddReference={handleAddReferenceImage}
                                annotations={selectedImage.annotations || []}
                                onDeleteAnnotation={deleteAnnotation}
                                onUpdateAnnotation={updateAnnotation}
                                onUpdateVariables={onUpdateVariables}
                                onTogglePin={handleTogglePin}
                                onDeleteTemplate={handleDeleteTemplate}
                                onCreateTemplate={handleCreateTemplate}
                                onUpdateTemplate={handleUpdateTemplate}
                                onGenerateMore={onGenerateMore}
                                onNavigateParent={onNavigateParent}
                                qualityMode={qualityMode}
                                onQualityModeChange={onQualityModeChange}
                                t={t}
                                currentLang={lang}
                                userProfile={userProfile}
                                showInfo={showInfo}
                            />
                        </div>
                    </>
                );
            case 'brush':
                if (isMulti) return null;
                return (
                    <div className="flex flex-col h-full overflow-hidden">
                        <SubHeader title={t('annotate')} onBack={handleExitBrushMode} />
                        <div className={`flex-1 overflow-y-auto no-scrollbar ${Theme.Colors.PanelBg}`}>
                            <BrushTab
                                brushSize={brushSize}
                                onBrushSizeChange={onBrushSizeChange}
                                onBrushResizeStart={onBrushResizeStart}
                                onBrushResizeEnd={onBrushResizeEnd}
                                maskTool={maskTool}
                                activeShape={activeShape}
                                isActive={true}
                                activeAnnotationId={activeAnnotationId}
                                onActiveAnnotationChange={setActiveAnnotationId}
                                onEditStart={() => { }}
                                t={t}
                                currentLang={lang}
                                library={fullLibrary}
                                onAddUserCategory={onAddUserCategory}
                                onDeleteUserCategory={onDeleteUserCategory}
                                onAddUserItem={onAddUserItem}
                                onDeleteUserItem={onDeleteUserItem}
                                onAddObject={handleAddObjectCenter}
                                onAddShape={handleAddShape}
                                onAddText={handleAddText}
                            />
                        </div>
                        <DoneButton />
                    </div>
                );
            case 'objects':
                // Deprecated: Objects tool is now inside 'brush' tab
                // Redirect to brush just in case
                if (sideSheetMode === 'objects') onModeChange('brush');
                return null;
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
                onContextMenu={(e) => e.stopPropagation()}
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

                {renderSelectedContent()}
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
