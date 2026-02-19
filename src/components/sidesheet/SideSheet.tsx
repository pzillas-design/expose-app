import React, { useState, useEffect, useRef } from 'react';
import { CanvasImage, PromptTemplate, AnnotationObject, TranslationFunction, LibraryCategory, LibraryItem, GenerationQuality } from '@/types';
import { Trash, Download, ArrowLeft, Check, Layers, ChevronLeft, Upload, Plus, Info, Undo2, Redo2, MousePointer2, Pen, Shapes, Type, Package, X } from 'lucide-react';
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
import { useMobile } from '@/hooks/useMobile';

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
    onDownload?: (id: string | string[]) => void;
    // Drag & Drop props
    isGlobalDragOver: boolean;
    onGlobalDragLeave: () => void;
    t: TranslationFunction;
    lang: 'de' | 'en';
    // User Library Props
    fullLibrary: LibraryCategory[];
    onAddUserCategory: (label: string) => void;
    onDeleteUserCategory: (id: string) => void;
    onAddUserItem: (catId: string, item: LibraryItem) => void;
    onDeleteUserItem: (catId: string, itemId: string) => void;
    maskTool: 'brush' | 'text' | 'shape' | 'select';
    onMaskToolChange: (tool: 'brush' | 'text' | 'shape' | 'select') => void;
    activeShape: 'rect' | 'circle' | 'line';
    onActiveShapeChange: (shape: 'rect' | 'circle' | 'line') => void;
    onActiveAnnotationChange?: (id: string | null) => void;
    onInteractionStart: () => void; // New
    onInteractionEnd: () => void;   // New
    onAddReference?: (file: File, annotationId?: string) => void;
    onUpload?: () => void;
    onCreateNew?: () => void;
    isBoardEmpty?: boolean;
    qualityMode: GenerationQuality;
    onQualityModeChange: (mode: GenerationQuality) => void;
    templates: PromptTemplate[];
    onRefreshTemplates?: () => void;
    onSaveTemplate?: (template: any) => Promise<any>;
    onDeleteTemplate?: (id: string) => Promise<void>;
    onSaveRecentPrompt?: (prompt: string) => Promise<void>;
    onUpdateImageTitle?: (id: string, title: string) => void;
    onShowInfo?: (id: string) => void;
    userProfile: any;
}

export const SideSheet = React.forwardRef<any, SideSheetProps>((props, ref) => {
    const {
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
        onActiveAnnotationChange,
        onInteractionStart: onInteractionStartExternal, // Rename to avoid conflict
        onInteractionEnd: onInteractionEndExternal,     // Rename to avoid conflict
        onUpload,
        onCreateNew,
        isBoardEmpty,
        qualityMode,
        onQualityModeChange,
        templates: globalTemplates,
        onRefreshTemplates,
        onSaveTemplate,
        onDeleteTemplate,
        onSaveRecentPrompt,
        onUpdateImageTitle,
        onShowInfo,
        onDownload,
        onAddReference: onAddReferenceExternal, // Rename to avoid conflict
        userProfile
    } = props;

    const [prompt, setPrompt] = useState('');
    const templates = globalTemplates;

    // Crop Modal State
    const [isCropOpen, setIsCropOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<string | null>(null);
    const [pendingFileName, setPendingFileName] = useState<string>('');
    const [pendingAnnotationId, setPendingAnnotationId] = useState<string | null>(null);
    const [isSideZoneActive, setIsSideZoneActive] = useState(false);

    const [historyMap, setHistoryMap] = useState<Map<string, AnnotationObject[][]>>(new Map());
    const [historyIndexMap, setHistoryIndexMap] = useState<Map<string, number>>(new Map());
    const [initialAnns, setInitialAnns] = useState<AnnotationObject[]>([]);
    const [activeAnnotationId, setActiveAnnotationIdInternal] = useState<string | null>(null);
    const { confirm } = useItemDialog();
    const lastAutoOpenedId = useRef<string | null>(null);
    const isInteracting = useRef(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Mobile Bottom Sheet Logic
    const isMobile = useMobile();
    const [sheetVisibleHeight, setSheetVisibleHeight] = useState(112);
    const isDragging = useRef(false);
    const shouldDragSheet = useRef(false);
    const startY = useRef(0);
    const startHeightRef = useRef(112);

    // Levels in pixels from bottom
    // Small peek state: show only handle + header area.
    const getPeekHeight = () => 112;
    const getExpandedHeight = () => window.innerHeight * 0.94;
    const isSheetExpanded = sheetVisibleHeight >= getExpandedHeight() - 1;

    // We'll use a CSS variable for the full height to handle mobile bars correctly
    useEffect(() => {
        const updateHeight = () => {
            const vh = window.innerHeight;
            document.documentElement.style.setProperty('--expanded-height', `${getExpandedHeight()}px`);
            document.documentElement.style.setProperty('--full-vh', `${vh}px`);
        };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    // Sync sheet state with selection
    useEffect(() => {
        if (selectedImage || (selectedImages && selectedImages.length > 0)) {
            setSheetVisibleHeight((prev) => prev <= 0 ? getPeekHeight() : prev);
        } else {
            setSheetVisibleHeight(0);
        }
    }, [selectedImage, selectedImages]);

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isMobile) return;

        isDragging.current = true;
        shouldDragSheet.current = !isSheetExpanded;
        const cy = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        startY.current = cy;
        startHeightRef.current = sheetVisibleHeight;
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDragging.current || !isMobile) return;
        const cy = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const delta = cy - startY.current;

        // Unified behavior: in expanded mode, content scroll is primary.
        // Switch to sheet-drag only when user pulls down from top (collapse gesture).
        if (!shouldDragSheet.current) {
            const content = contentRef.current;
            const atTop = !!content && content.scrollTop <= 0;
            const pullingDown = delta > 0;
            if (atTop && pullingDown) {
                shouldDragSheet.current = true;
            } else {
                return;
            }
        }

        const hasSelection = !!selectedImage || !!(selectedImages && selectedImages.length > 0);
        const minHeight = hasSelection ? getPeekHeight() : 0;
        const maxHeight = getExpandedHeight();
        const nextHeight = Math.max(minHeight, Math.min(maxHeight, startHeightRef.current - delta));

        // Seamless transition: same gesture first expands the sheet, then continues as content scroll.
        if (nextHeight >= maxHeight - 0.5 && delta < 0) {
            setSheetVisibleHeight(maxHeight);
            shouldDragSheet.current = false;
            startY.current = cy;
            startHeightRef.current = maxHeight;
            return;
        }

        // While dragging the sheet itself, keep inner content pinned.
        if (contentRef.current) contentRef.current.scrollTop = 0;

        if ('touches' in e && e.cancelable) {
            e.preventDefault();
        }
        setSheetVisibleHeight(nextHeight);
    };

    const handleTouchEnd = () => {
        if (!isDragging.current || !isMobile) return;
        isDragging.current = false;
        shouldDragSheet.current = false;
    };

    const setActiveAnnotationId = (id: string | null) => {
        setActiveAnnotationIdInternal(id);
        onActiveAnnotationChange?.(id);
    };

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

    // Listen for external annotation changes (e.g. Brush strokes from Canvas)
    useEffect(() => {
        if (!selectedImage?.id) return;

        const currentHistory = historyMap.get(selectedImage.id);
        if (!currentHistory) return; // Not initialized yet

        const currentIndex = historyIndexMap.get(selectedImage.id) ?? -1;
        const historyAnns = currentHistory[currentIndex];
        const currentAnns = selectedImage.annotations || [];

        // If annotations changed externally (not from our actions), record it
        if (historyAnns !== currentAnns) {
            const newHistory = currentHistory.slice(0, currentIndex + 1);
            newHistory.push(currentAnns);
            if (newHistory.length > 50) newHistory.shift();

            const newHistoryMap = new Map(historyMap);
            const newIndexMap = new Map(historyIndexMap);
            newHistoryMap.set(selectedImage.id, newHistory);
            newIndexMap.set(selectedImage.id, newHistory.length - 1);

            setHistoryMap(newHistoryMap);
            setHistoryIndexMap(newIndexMap);
        }
    }, [selectedImage?.annotations, selectedImage?.id, historyMap, historyIndexMap]);

    const updateAnnotationsWithHistory = (newAnns: AnnotationObject[], forceHistory: boolean = false) => {
        if (!selectedImage) return;

        if (isInteracting.current && !forceHistory) {
            // Just update live without pushing to history stack
            onUpdateAnnotations(selectedImage.id, newAnns);
            return;
        }

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

    const handleInteractionStart = () => {
        isInteracting.current = true;
        onInteractionStartExternal?.();
    };

    const handleInteractionEnd = () => {
        if (!selectedImage || !isInteracting.current) return;
        isInteracting.current = false;
        // Push the FINAL state to history
        const currentAnns = selectedImage.annotations || [];
        updateAnnotationsWithHistory(currentAnns, true);
        onInteractionEndExternal?.();
    };

    React.useImperativeHandle(ref, () => ({
        handleInteractionStart,
        handleInteractionEnd
    }));

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

    const lastIsMultiRef = useRef(isMulti);

    const lastSelectedIdRef = useRef<string | null>(null);
    const lastIsGeneratingRef = useRef(false);

    useEffect(() => {
        if (selectedImage && !isMulti) {
            const isNewSelection = selectedImage.id !== lastSelectedIdRef.current;
            const isGenerating = selectedImage.isGenerating;
            const wasGenerating = lastIsGeneratingRef.current;

            // 1. Handle New Selection
            if (isNewSelection) {
                setPrompt(selectedImage.userDraftPrompt || '');
                // Default to prompt mode on NEW selection, unless it's generating
                if (sideSheetMode !== 'prompt' && !isGenerating) {
                    onModeChange('prompt');
                }
                lastSelectedIdRef.current = selectedImage.id;
            } else {
                // 2. Handle Identity Update (same ID)
                // Just sync the prompt if it's not being edited? 
                // Actually, if we're merging correctly in the controller, it should be fine.
                // But let's at least ensure we don't overwrite if user is typing.
                // For now, identity updates (like sync) should NOT trigger mode changes.
            }

            // 3. Handle Generation Status Transition (within same ID or across selection)
            if (wasGenerating && !isGenerating) {
                // Generation FINISHED: Auto-linking or mode switching can happen here,
                // but we disabled the automatic onShowInfo modal popup.
                lastAutoOpenedId.current = selectedImage.id;
            }

            // Update ref for next run
            lastIsGeneratingRef.current = isGenerating;
        } else if (isMulti && !lastIsMultiRef.current) {
            // Reset prompt when entering multi-select mode
            setPrompt('');
            if (sideSheetMode !== 'prompt') onModeChange('prompt');
            lastSelectedIdRef.current = null;
            lastIsGeneratingRef.current = false;
        }

        lastIsMultiRef.current = isMulti;
    }, [selectedImage?.id, selectedImage?.isGenerating, isMulti, sideSheetMode, onModeChange]);



    const handlePromptChange = (val: string) => {
        setPrompt(val);
        if (selectedImage && selectedImage.id && !isMulti) {
            onUpdatePrompt(selectedImage.id, val);
        }
    };

    const handleDownload = async () => {
        if (onDownload) {
            if (isMulti && selectedImages) {
                onDownload(selectedImages.map(img => img.id));
            } else if (selectedImage) {
                onDownload(selectedImage.id);
            }
            return;
        }

        if (isMulti && selectedImages) {
            for (const img of selectedImages) {
                if (img.src) {
                    await downloadImage(img.src, img.title || 'image');
                    // Small delay to prevent browser blocking multiple downloads
                    await new Promise(r => setTimeout(r, 300));
                }
            }
        } else if (selectedImage && selectedImage.src) {
            await downloadImage(selectedImage.src, selectedImage?.title || 'image');
        }
    };

    const handleDelete = () => {
        if (isMulti && selectedImages) {
            const ids = selectedImages.map(i => i.id);
            onDeleteImage(ids);
        } else if (selectedImage && selectedImage.id) {
            onDeleteImage(selectedImage.id);
        }
    }

    const handleDeselectPreservingPrompt = () => {
        if (selectedImage && selectedImage.id && prompt) {
            onUpdatePrompt(selectedImage.id, prompt);
        }
        onDeselectAll();
    };

    const deleteAnnotation = (annId: string) => {
        if (!selectedImage || !selectedImage.id || !selectedImage.annotations) return;
        const newAnns = selectedImage.annotations.filter(a => a.id !== annId);
        updateAnnotationsWithHistory(newAnns);
    };

    const updateAnnotation = (annId: string, patch: Partial<AnnotationObject>) => {
        if (!selectedImage || !selectedImage.annotations) return;
        const newAnns = selectedImage.annotations.map(a => a.id === annId ? { ...a, ...patch } : a);
        updateAnnotationsWithHistory(newAnns);
    };

    const clearAllBrushStrokes = () => {
        if (!selectedImage || !selectedImage.annotations) return;
        const newAnns = selectedImage.annotations.filter(a => a.type !== 'mask_path');
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
            // Create new global reference
            const newRef: AnnotationObject = {
                id: generateId(),
                type: 'reference_image',
                points: [],
                strokeWidth: 0,
                color: '#fff',
                text: '', // Empty text implies using the default placeholder in prompt logic
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
        } else if (shape === 'circle') {
            const half = size / 2;
            const x = cx - half;
            const y = cy - half;
            newShape = {
                id: generateId(),
                type: 'shape',
                shapeType: 'circle',
                x, y,
                width: size,
                height: size,
                points: [], // Not used for circles in this renderer
                strokeWidth: 4,
                color: '#fff',
                createdAt: Date.now()
            };
        } else {
            return; // Safety fallback
        }

        if (newShape) {
            updateAnnotationsWithHistory([...currentAnns, newShape]);
            setActiveAnnotationId(newShape.id);
            onMaskToolChange('select');
        }
    };

    const handleGenerateWrapper = (p?: string, dp?: string, tid?: string, vars?: Record<string, string[]>) => {
        // Save recent prompt for history
        if (dp && onSaveRecentPrompt) {
            onSaveRecentPrompt(dp).catch(err => console.warn('Failed to save recent prompt:', err));
        }
        onGenerate(p || prompt, dp, tid, vars);
    };

    const handleTogglePin = (id: string) => {
        onDeleteTemplate?.(id);
    };

    const handleDeleteTemplate = (id: string) => {
        onDeleteTemplate?.(id);
    };

    const handleUpdateTemplate = async (id: string, updates: Partial<PromptTemplate>) => {
        const existing = templates.find(t => t.id === id);
        if (existing) {
            return await onSaveTemplate?.({ ...existing, ...updates });
        }
        return null;
    };

    const handleCreateTemplate = async (newT: Omit<PromptTemplate, 'id' | 'isPinned' | 'usageCount' | 'isCustom' | 'lastUsed'>) => {
        return await onSaveTemplate?.({ ...newT, category: 'user', isPinned: true });
    };

    const handleExitBrushMode = async (forceSave: boolean = false) => {
        if (!selectedImage) {
            onModeChange('prompt');
            return;
        }

        const currentAnns = selectedImage.annotations || [];
        // Basic comparison
        const hasChanges = JSON.stringify(currentAnns) !== JSON.stringify(initialAnns);

        if (hasChanges && !forceSave) {
            const result = await confirm({
                title: t('save_annotations'),
                description: t('save_discard_changes'),
                confirmLabel: t('save'),
                cancelLabel: t('discard'),
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
        <div className={`h-14 flex items-center gap-1 px-6 shrink-0 ${Theme.Colors.PanelBg} border-b ${Theme.Colors.Border}`}>
            <IconButton icon={<ChevronLeft className="w-4 h-4" />} onClick={onBack || (() => onModeChange('prompt'))} tooltip={t('back')} />
            <span className={`${Typo.Label} ${Theme.Colors.TextPrimary} font-bold`}>{title}</span>
            <div className="flex-1" />
            <div className="flex items-center gap-0.5">
                <IconButton
                    icon={<Undo2 className="w-3.5 h-3.5" />}
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    tooltip={t('tt_undo')}
                />
                <IconButton
                    icon={<Redo2 className="w-3.5 h-3.5" />}
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    tooltip={t('tt_redo')}
                />
            </div>
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
                    <div className={`flex flex-col h-full ${Theme.Colors.PanelBg}`} style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
                        {/* Drag Handle - only this area responds to sheet drag gestures */}
                        {isMobile && (
                            <div
                                className="shrink-0 touch-none"
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                            >
                                <div className="h-8 flex items-center justify-center">
                                    <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                                </div>
                            </div>
                        )}

                        {/* Header */}
                        <div className={`h-14 flex items-center justify-between px-6 shrink-0 ${Theme.Colors.PanelBg} relative z-40`}>
                            <div className="flex items-center gap-2 flex-1 mr-2 overflow-hidden">
                                {isMulti && selectedImages ? (
                                    <span className={`${Typo.Label} text-zinc-900 dark:text-zinc-100 truncate`}>
                                        {selectedImages.length} {t('images_selected')}
                                    </span>
                                ) : (
                                    <span className={`${Typo.Label} truncate underline underline-offset-4 decoration-zinc-200 dark:decoration-zinc-800`}>
                                        {selectedImage?.title || 'Untitled'}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                <IconButton
                                    id="header-info-button"
                                    icon={<Info className="w-[18px] h-[18px]" />}
                                    onClick={() => selectedImage && onShowInfo?.(selectedImage.id)}
                                    className="transition-colors z-50 text-zinc-400"
                                    tooltip="Info"
                                />
                                {!isMobile && (
                                    <IconButton
                                        icon={<X className="w-[18px] h-[18px]" />}
                                        onClick={() => onDeselectAll?.()}
                                        className="transition-colors z-50 text-zinc-400"
                                        tooltip={t('tt_deselect') || 'Auswahl aufheben'}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Scrollable Content - pure native scroll, no drag handlers */}
                        <div
                            ref={contentRef}
                            className={`flex-1 min-h-0 overflow-y-auto no-scrollbar ${Theme.Colors.PanelBg}`}
                            style={{
                                WebkitOverflowScrolling: 'touch',
                                overscrollBehaviorY: 'contain',
                                willChange: 'scroll-position',
                            }}
                        >
                            <PromptTab
                                prompt={prompt}
                                setPrompt={handlePromptChange}
                                selectedImage={selectedImage}
                                selectedImages={selectedImages}
                                onGenerate={handleGenerateWrapper}
                                onDeselect={handleDeselectPreservingPrompt}
                                templates={templates}
                                onSelectTemplate={(t) => handlePromptChange(t.prompt)}
                                onAddBrush={() => {
                                    // Auto-select shape tool if shapes exist
                                    const hasShapes = (selectedImage.annotations || []).some(a => a.type === 'shape');
                                    if (hasShapes) {
                                        onMaskToolChange('shape');
                                    }
                                    onModeChange('brush');
                                }}
                                onAddObject={() => onModeChange('brush')}
                                onAddReference={handleAddReferenceImage}
                                annotations={selectedImage.annotations || []}
                                onDeleteAnnotation={deleteAnnotation}
                                onClearAnnotations={(ids) => {
                                    if (!selectedImage || !selectedImage.annotations) return;
                                    const newAnns = selectedImage.annotations.filter(a => !ids.includes(a.id));
                                    updateAnnotationsWithHistory(newAnns);
                                }}
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
                                onUpdateImageTitle={onUpdateImageTitle}
                                t={t}
                                currentLang={lang}
                                userProfile={userProfile}
                            />
                        </div>
                    </div>
                );
            case 'brush':
                if (isMulti) return null;
                return (
                    <div className="flex flex-col h-full overflow-hidden">
                        <SubHeader title={t('annotate')} onBack={() => handleExitBrushMode(false)} />
                        <div
                            ref={contentRef}
                            className={`flex-1 min-h-0 overflow-y-auto no-scrollbar ${Theme.Colors.PanelBg}`}
                            style={{ touchAction: 'pan-y', overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }}
                            onTouchStart={handleTouchStart}
                            onMouseDown={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onMouseMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onMouseUp={handleTouchEnd}
                        >
                            <BrushTab
                                brushSize={brushSize}
                                onBrushSizeChange={onBrushSizeChange}
                                onBrushResizeStart={onBrushResizeStart}
                                onBrushResizeEnd={onBrushResizeEnd}
                                maskTool={maskTool}
                                onMaskToolChange={onMaskToolChange}
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
                                onClearBrushStrokes={clearAllBrushStrokes}
                            />
                        </div>
                        <div className={`p-6 border-t ${Theme.Colors.Border} ${Theme.Colors.PanelBg} shrink-0`}>
                            <Button
                                variant="primary"
                                onClick={() => handleExitBrushMode(true)}
                                className="w-full"
                                icon={<Check className="w-4 h-4" />}
                            >
                                {t('done')}
                            </Button>
                        </div>
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

    const currentTranslate = isMobile ? (getExpandedHeight() - sheetVisibleHeight) : 0;
    const transform = isMobile ? `translateY(${currentTranslate}px)` : 'none';
    return (
        <>
            <div
                data-mobile-sheet={isMobile ? 'true' : 'false'}
                className={`
                    ${Theme.Colors.PanelBg} flex flex-col z-[100] transition-colors duration-200
                    ${isMobile
                        ? `fixed bottom-0 left-0 right-0 z-[100] transition-transform duration-200 ease-out pointer-events-auto overflow-hidden`
                        : `h-full border-l relative`
                    }
                    ${Theme.Colors.Border}
                `}
                style={{
                    width: isMobile ? '100%' : width,
                    height: isMobile ? 'var(--expanded-height)' : '100%',
                    transform: transform,
                    transitionProperty: isDragging.current ? 'none' : 'transform, background-color',
                    borderTopLeftRadius: isMobile ? '24px' : '0',
                    borderTopRightRadius: isMobile ? '24px' : '0',
                    boxShadow: isMobile ? '0 -2px 8px rgba(0,0,0,0.03)' : 'none',
                    borderTop: isMobile ? '1px solid rgba(0,0,0,0.1)' : 'none',
                    paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : '0'
                }}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={handleDrop}
                onContextMenu={(e) => e.stopPropagation()}
            >
                {isGlobalDragOver && (
                    <div
                        onClick={onGlobalDragLeave}
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

                {renderSelectedContent()}
            </div>

            <CropModal
                isOpen={isCropOpen}
                imageSrc={pendingFile || ''}
                onClose={() => {
                    setIsCropOpen(false);
                    setPendingFile(null);
                }}
                onCropComplete={handleCropComplete}
                t={t}
            />
        </>
    );
});
