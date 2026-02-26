import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
    CanvasImage, PromptTemplate, AnnotationObject, TranslationFunction,
    LibraryCategory, GenerationQuality
} from '@/types';
import {
    Pen, Camera, X, ChevronRight, ChevronLeft, ChevronDown, Send, Plus, Check,
    Undo2, Redo2, Layers, MoreHorizontal
} from 'lucide-react';
import { useMobile } from '@/hooks/useMobile';
import { CropModal } from '@/components/modals/CropModal';
import { generateId } from '@/utils/ids';
import { Theme, Typo, Tooltip, RoundIconButton, Button } from '@/components/ui/DesignSystem';
import { useItemDialog } from '@/components/ui/Dialog';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { PresetEditorModal } from '@/components/modals/PresetEditorModal';
import { ManagePresetsModal } from '@/components/modals/ManagePresetsModal';

// ─── Prop Types ───────────────────────────────────────────────────────────────

interface SideSheetProps {
    selectedImage: CanvasImage | null;
    selectedImages?: CanvasImage[];
    sideSheetMode: 'prompt' | 'brush' | 'objects';
    onModeChange: (mode: 'prompt' | 'brush' | 'objects') => void;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    onBrushResizeStart?: () => void;
    onBrushResizeEnd?: () => void;
    onGenerate: (prompt: string, draftPrompt?: string, templateId?: string, vars?: Record<string, string[]>) => void;
    onUpdateAnnotations: (id: string, anns: any[]) => void;
    onUpdatePrompt: (id: string, text: string) => void;
    onUpdateVariables: (id: string, templateId: string | undefined, vars: Record<string, string[]>) => void;
    onDeleteImage: (id: string | string[]) => void;
    onDeselectAll?: () => void;
    onGenerateMore: (id: string) => void;
    onNavigateParent: (id: string) => void;
    onDownload?: (id: string | string[]) => void;
    // Allow state spread: isDragOver maps to isGlobalDragOver
    isGlobalDragOver?: boolean;
    isDragOver?: boolean;
    onGlobalDragLeave: () => void;
    t: TranslationFunction;
    lang: 'de' | 'en';
    fullLibrary: LibraryCategory[];
    onAddUserCategory: (label: string) => void;
    onDeleteUserCategory: (id: string) => void;
    onAddUserItem: (catId: string, label: string, icon?: string) => Promise<void>;
    onDeleteUserItem: (catId: string, itemId: string) => void;
    maskTool: 'brush' | 'text' | 'shape' | 'select';
    onMaskToolChange: (tool: 'brush' | 'text' | 'shape' | 'select') => void;
    activeShape: 'rect' | 'circle' | 'line';
    onActiveShapeChange: (shape: 'rect' | 'circle' | 'line') => void;
    onActiveAnnotationChange?: (id: string | null) => void;
    onInteractionStart: () => void;
    onInteractionEnd: () => void;
    onAddReference?: (file: File, annotationId?: string) => void;
    onUpload?: () => void;
    onCreateNew?: () => void;
    qualityMode: GenerationQuality;
    onQualityModeChange: (mode: GenerationQuality) => void;
    templates: PromptTemplate[];
    onRefreshTemplates?: () => void;
    onSaveTemplate?: (template: any) => Promise<any>;
    onEditTemplate?: (template: PromptTemplate) => void;
    onDeleteTemplate?: (id: string) => Promise<void>;
    onSaveRecentPrompt?: (prompt: string) => Promise<void>;
    onUpdateImageTitle?: (id: string, title: string) => void;
    onShowInfo?: (id: string) => void;
    userProfile: any;
    width?: string;
}

// ─── Helper: Eyebrow Label ────────────────────────────────────────────────────

const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <span className={`text-[11px] font-medium text-zinc-400 dark:text-zinc-500 ${className}`}>
        {children}
    </span>
);

// ─── Main SideSheet ───────────────────────────────────────────────────────────

export const SideSheet = React.forwardRef<any, SideSheetProps>((props, ref) => {
    const {
        selectedImage, selectedImages, sideSheetMode, onModeChange,
        brushSize, onBrushSizeChange, onBrushResizeStart, onBrushResizeEnd,
        onGenerate, onUpdateAnnotations, onUpdatePrompt, onUpdateVariables,
        onDeleteImage, onDeselectAll,
        onGlobalDragLeave,
        t, lang, fullLibrary, onAddUserCategory, onDeleteUserCategory,
        onAddUserItem, onDeleteUserItem, maskTool, onMaskToolChange,
        activeShape, onActiveShapeChange, onActiveAnnotationChange,
        onInteractionStart: onInteractionStartExt, onInteractionEnd: onInteractionEndExt,
        qualityMode, onQualityModeChange, templates, onSaveTemplate, onEditTemplate,
        onDeleteTemplate, onSaveRecentPrompt, onUpdateImageTitle, onDownload,
        onGenerateMore, onNavigateParent, userProfile, width
    } = props;
    // Support both isDragOver (from state spread) and isGlobalDragOver (explicit)
    const isGlobalDragOver = props.isGlobalDragOver ?? props.isDragOver ?? false;

    // ── State ──
    const [prompt, setPrompt] = useState('');
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
    const [controlValues, setControlValues] = useState<Record<string, string[]>>({});
    const [showPromptForm, setShowPromptForm] = useState(false);
    const [isSideZoneActive, setIsSideZoneActive] = useState(false);
    const [isQualityOpen, setIsQualityOpen] = useState(false);

    // Preset Menu State
    const [isPresetsMenuOpen, setIsPresetsMenuOpen] = useState(false);
    const [showRecentPresets, setShowRecentPresets] = useState(false);
    const presetsMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isPresetsMenuOpen && presetsMenuRef.current && !presetsMenuRef.current.contains(e.target as Node)) {
                setIsPresetsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isPresetsMenuOpen]);

    // Preset Editor State
    const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | undefined>();

    // Variable Controls State
    const [hiddenControlIds, setHiddenControlIds] = useState<string[]>([]);
    const [editingControlId, setEditingControlId] = useState<string | null>(null);
    const [editControlValue, setEditControlValue] = useState('');
    const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({});

    // Reset hidden controls when template changes
    useEffect(() => {
        setHiddenControlIds([]);
        setLabelOverrides({});
        setEditingControlId(null);
    }, [activeTemplateId]);

    // Annotation History
    const [historyMap, setHistoryMap] = useState<Map<string, AnnotationObject[][]>>(new Map());
    const [historyIndexMap, setHistoryIndexMap] = useState<Map<string, number>>(new Map());
    const [initialAnns, setInitialAnns] = useState<AnnotationObject[]>([]);
    const isInteracting = useRef(false);
    const lastSelectedIdRef = useRef<string | null>(null);
    const { confirm } = useItemDialog();

    // Crop / Reference Image
    const [isCropOpen, setIsCropOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<string | null>(null);
    const [pendingAnnotationId, setPendingAnnotationId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Mobile Sheet
    const isMobile = useMobile();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const sheetRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStartY = useRef(0);
    const dragCurrentY = useRef(0);

    // ── Computed ──
    const isMulti = !!selectedImages && selectedImages.length > 1;
    const annotations = selectedImage?.annotations || [];
    const activeTemplate = templates?.find(t => t.id === activeTemplateId) || null;
    const history = selectedImage?.id ? (historyMap.get(selectedImage.id) || []) : [];
    const historyIndex = selectedImage?.id ? (historyIndexMap.get(selectedImage.id) ?? -1) : -1;

    const displayTemplates = React.useMemo(() => {
        if (!templates) return [];
        // User-created presets are always shown regardless of lang (DB may have saved them as 'en' by default).
        // System presets are filtered by the current language.
        const filtered = templates.filter(t => t.isCustom || !t.lang || t.lang === lang);
        if (showRecentPresets) {
            return [...filtered]
                .filter(t => t.lastUsed)
                .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
                .slice(0, 12);
        }
        return filtered.slice(0, 12);
    }, [templates, lang, showRecentPresets]);


    // ── Prompt auto-resize ──
    useLayoutEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 80)}px`;
        }
    }, [prompt]);

    // ── Sync prompt on image change ──
    useEffect(() => {
        if (!selectedImage) return;
        if (selectedImage.id !== lastSelectedIdRef.current) {
            setPrompt(selectedImage.userDraftPrompt || '');
            setActiveTemplateId(selectedImage.activeTemplateId || null);
            setControlValues(selectedImage.variableValues || {});
            setShowPromptForm(false);
            lastSelectedIdRef.current = selectedImage.id;
        }
    }, [selectedImage?.id]);

    // ── History initialization ──
    useEffect(() => {
        if (selectedImage?.id && !historyMap.has(selectedImage.id)) {
            const anns = selectedImage.annotations || [];
            setHistoryMap(prev => new Map(prev).set(selectedImage.id, [anns]));
            setHistoryIndexMap(prev => new Map(prev).set(selectedImage.id, 0));
        }
        if (selectedImage?.id && sideSheetMode === 'brush') {
            setInitialAnns(selectedImage.annotations || []);
        }
    }, [selectedImage?.id, sideSheetMode]);

    // ── Sync external annotation changes to history ──
    useEffect(() => {
        if (!selectedImage?.id) return;
        const currentHistory = historyMap.get(selectedImage.id);
        if (!currentHistory) return;
        const currentIndex = historyIndexMap.get(selectedImage.id) ?? -1;
        const historyAnns = currentHistory[currentIndex];
        const currentAnns = selectedImage.annotations || [];
        if (historyAnns !== currentAnns) {
            const newHistory = [...currentHistory.slice(0, currentIndex + 1), currentAnns];
            setHistoryMap(prev => new Map(prev).set(selectedImage.id, newHistory.slice(-50)));
            setHistoryIndexMap(prev => new Map(prev).set(selectedImage.id, newHistory.length - 1));
        }
    }, [selectedImage?.annotations]);

    // ── Annotation helpers ──
    const updateAnnotationsWithHistory = (newAnns: AnnotationObject[], force = false) => {
        if (!selectedImage) return;
        if (isInteracting.current && !force) {
            onUpdateAnnotations(selectedImage.id, newAnns);
            return;
        }
        const currentHistory = historyMap.get(selectedImage.id) || [];
        const currentIndex = historyIndexMap.get(selectedImage.id) ?? -1;
        const newHistory = [...currentHistory.slice(0, currentIndex + 1), newAnns].slice(-50);
        setHistoryMap(prev => new Map(prev).set(selectedImage.id, newHistory));
        setHistoryIndexMap(prev => new Map(prev).set(selectedImage.id, newHistory.length - 1));
        onUpdateAnnotations(selectedImage.id, newAnns);
    };

    const setActiveAnnotationId = (id: string | null) => {
        onActiveAnnotationChange?.(id);
    };

    const handleUndo = () => {
        if (!selectedImage || historyIndex <= 0) return;
        const h = historyMap.get(selectedImage.id) || [];
        const idx = historyIndex - 1;
        setHistoryIndexMap(prev => new Map(prev).set(selectedImage.id, idx));
        onUpdateAnnotations(selectedImage.id, h[idx]);
    };

    const handleRedo = () => {
        if (!selectedImage || historyIndex >= history.length - 1) return;
        const h = historyMap.get(selectedImage.id) || [];
        const idx = historyIndex + 1;
        setHistoryIndexMap(prev => new Map(prev).set(selectedImage.id, idx));
        onUpdateAnnotations(selectedImage.id, h[idx]);
    };

    React.useImperativeHandle(ref, () => ({
        handleInteractionStart: () => { isInteracting.current = true; onInteractionStartExt?.(); },
        handleInteractionEnd: () => {
            if (!selectedImage || !isInteracting.current) return;
            isInteracting.current = false;
            updateAnnotationsWithHistory(selectedImage.annotations || [], true);
            onInteractionEndExt?.();
        }
    }));

    const deleteAnnotation = (annId: string) => {
        if (!selectedImage?.annotations) return;
        updateAnnotationsWithHistory(selectedImage.annotations.filter(a => a.id !== annId));
    };

    const clearAllBrushStrokes = () => {
        if (!selectedImage?.annotations) return;
        updateAnnotationsWithHistory(selectedImage.annotations.filter(a => a.type !== 'mask_path'));
    };

    const handleAddShape = (shape: 'rect' | 'circle' | 'line') => {
        if (!selectedImage) return;
        const cx = selectedImage.width / 2;
        const cy = selectedImage.height / 2;
        const size = Math.min(selectedImage.width, selectedImage.height) * 0.3;
        const half = size / 2;
        let newShape: AnnotationObject;
        if (shape === 'line') {
            newShape = { id: generateId(), type: 'shape', shapeType: 'line', points: [{ x: cx - half, y: cy }, { x: cx + half, y: cy }], strokeWidth: 4, color: '#fff', createdAt: Date.now() };
        } else if (shape === 'rect') {
            const x = cx - half, y = cy - half;
            newShape = { id: generateId(), type: 'shape', shapeType: 'rect', points: [{ x, y }, { x: x + size, y }, { x: x + size, y: y + size }, { x, y: y + size }], strokeWidth: 4, color: '#fff', createdAt: Date.now() };
        } else {
            newShape = { id: generateId(), type: 'shape', shapeType: 'circle', x: cx - half, y: cy - half, width: size, height: size, points: [], strokeWidth: 4, color: '#fff', createdAt: Date.now() };
        }
        updateAnnotationsWithHistory([...(selectedImage.annotations || []), newShape]);
        setActiveAnnotationId(newShape.id);
        onMaskToolChange('select');
    };

    const handleClearControl = (controlId: string) => {
        setControlValues(prev => {
            const newState = { ...prev };
            delete newState[controlId];
            onUpdateVariables?.(selectedImage?.id || '', activeTemplate?.id, newState);
            return newState;
        });
        setHiddenControlIds(prev => [...prev, controlId]);
    };


    const startEditingControl = (id: string, currentLabel: string) => {
        setEditingControlId(id);
        setEditControlValue(labelOverrides[id] || currentLabel);
    };

    const saveControlLabel = () => {
        if (editingControlId) {
            setLabelOverrides(prev => ({ ...prev, [editingControlId]: editControlValue }));
        }
        setEditingControlId(null);
        setEditControlValue('');
    };

    const handleAddObjectCenter = (label: string, itemId: string, icon?: string) => {
        if (!selectedImage) return;
        const cx = selectedImage.width / 2;
        const cy = selectedImage.height / 2;
        if (itemId === 'util:clear_masks') {
            updateAnnotationsWithHistory((selectedImage.annotations || []).filter(a => a.type !== 'mask_path'));
            return;
        }
        const newAnn: AnnotationObject = { id: generateId(), type: itemId === 'util:remove' ? 'stamp' : 'stamp', x: cx, y: cy, text: label, itemId, emoji: icon, color: itemId === 'util:remove' ? '#ef4444' : '#fff', strokeWidth: 0, points: [], createdAt: Date.now() };
        updateAnnotationsWithHistory([...(selectedImage.annotations || []), newAnn]);
        onMaskToolChange('select');
    };

    const handleAddText = () => {
        if (!selectedImage) return;
        const newText: AnnotationObject = { id: generateId(), type: 'stamp', x: selectedImage.width / 2, y: selectedImage.height / 2, text: '', color: '#fff', strokeWidth: 4, points: [], createdAt: Date.now() };
        updateAnnotationsWithHistory([...(selectedImage.annotations || []), newText]);
    };

    // ── Prompt helpers ──
    const handlePromptChange = (val: string) => {
        setPrompt(val);
        if (selectedImage?.id && !isMulti) onUpdatePrompt(selectedImage.id, val);
    };

    const handleGenerate = () => {
        const finalPrompt = prompt.trim();
        if (onSaveRecentPrompt && finalPrompt) onSaveRecentPrompt(finalPrompt).catch(() => { });
        onGenerate(finalPrompt, prompt, activeTemplate?.id, controlValues);
    };

    const handleSelectTemplate = (tpl: PromptTemplate) => {
        // Append text
        const newText = prompt ? `${prompt}\n${tpl.prompt}` : tpl.prompt;
        setPrompt(newText);
        if (selectedImage && !isMulti) onUpdatePrompt(selectedImage.id, newText);

        // Merge controls if activeTemplate is a custom "merged" template or just replace activeTemplateId
        // but the prompt asked specifically to just paste the content.
        // If we set activeTemplateId = tpl.id, it will load its variables, but it won't show as active if we removed the check.
        setActiveTemplateId(tpl.id);
        if (tpl.controls?.length) {
            setControlValues(prev => ({ ...prev }));
            if (selectedImage) onUpdateVariables(selectedImage.id, tpl.id, controlValues);
        }
        textareaRef.current?.focus();
    };

    const toggleControlOption = (controlId: string, value: string) => {
        setControlValues(prev => {
            const cur = prev[controlId] || [];
            const isSingle = activeTemplate?.controls?.find(c => c.id === controlId)?.type === 'single';

            let updated: string[];
            if (isSingle) {
                updated = cur.includes(value) ? [] : [value];
            } else {
                updated = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
            }

            const next = { ...prev, [controlId]: updated };
            if (selectedImage) onUpdateVariables(selectedImage.id, activeTemplate?.id, next);
            return next;
        });
    };

    // ── Reference Image ──
    const handleAddReferenceImage = (file: File, annotationId?: string) => {
        setPendingAnnotationId(annotationId || null);
        const reader = new FileReader();
        reader.onload = e => {
            if (typeof e.target?.result === 'string') {
                setPendingFile(e.target.result);
                setIsCropOpen(true);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = (croppedBase64: string) => {
        if (!selectedImage) return;
        const currentAnns = selectedImage.annotations || [];
        if (pendingAnnotationId) {
            updateAnnotationsWithHistory(currentAnns.map(a => a.id === pendingAnnotationId ? { ...a, referenceImage: croppedBase64 } : a));
        } else {
            const newRef: AnnotationObject = { id: generateId(), type: 'reference_image', points: [], strokeWidth: 0, color: '#fff', text: '', referenceImage: croppedBase64, createdAt: Date.now() };
            updateAnnotationsWithHistory([...currentAnns, newRef]);
        }
        setPendingFile(null);
        setPendingAnnotationId(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onGlobalDragLeave();
        setIsSideZoneActive(false);
        if (!selectedImage) return;
        const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) handleAddReferenceImage(files[0]);
    };

    const handleExitBrushMode = async (forceSave = false) => {
        if (!selectedImage) { onModeChange('prompt'); return; }
        const currentAnns = selectedImage.annotations || [];
        const hasChanges = JSON.stringify(currentAnns) !== JSON.stringify(initialAnns);
        if (hasChanges && !forceSave) {
            const result = await confirm({ title: t('save_annotations'), description: t('save_discard_changes'), confirmLabel: t('save'), cancelLabel: t('discard'), variant: 'primary' });
            if (result === false) onUpdateAnnotations(selectedImage.id, initialAnns);
        }
        onModeChange('prompt');
    };

    // ── Mobile Sheet ──
    const handleSheetTouchStart = (e: React.TouchEvent) => {
        isDragging.current = true;
        dragStartY.current = e.touches[0].clientY;
        dragCurrentY.current = 0;
        if (sheetRef.current) sheetRef.current.style.transition = 'none';
    };

    const handleSheetTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current || !sheetRef.current) return;
        const delta = e.touches[0].clientY - dragStartY.current;
        dragCurrentY.current = delta;
        if (isSheetOpen) {
            sheetRef.current.style.transform = `translateY(${Math.max(0, delta)}px)`;
        } else {
            sheetRef.current.style.transform = `translateY(calc(100% - 10vh - ${-Math.min(0, delta)}px))`;
        }
    };

    const handleSheetTouchEnd = () => {
        if (!isDragging.current || !sheetRef.current) return;
        isDragging.current = false;
        sheetRef.current.style.transition = '';
        sheetRef.current.style.transform = '';
        if (isSheetOpen && dragCurrentY.current > 60) setIsSheetOpen(false);
        else if (!isSheetOpen && dragCurrentY.current < -60) setIsSheetOpen(true);
    };

    // ── Count of active visual annotations ──
    const visibleAnns = annotations.filter(a => ['mask_path', 'stamp', 'shape'].includes(a.type));
    const referenceAnns = annotations.filter(a => a.type === 'reference_image');

    // ─── PROMPT MODE (Main View) ───────────────────────────────────────────────
    const isMobileSheet = isMobile;

    const sheetContent = (
        <>
            <CropModal
                isOpen={isCropOpen}
                imageSrc={pendingFile || ''}
                onClose={() => { setIsCropOpen(false); setPendingFile(null); }}
                onCropComplete={handleCropComplete}
                t={t}
            />
            {/* Drag overlay for file drop */}
            {isGlobalDragOver && (
                <div
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                    onDragEnter={() => setIsSideZoneActive(true)}
                    onDragLeave={() => setIsSideZoneActive(false)}
                    onDrop={handleDrop}
                    onClick={onGlobalDragLeave}
                    className={`absolute inset-3 z-50 rounded-2xl flex items-center justify-center border pointer-events-auto transition-all duration-200 ${isSideZoneActive ? 'bg-zinc-800/90 border-zinc-600' : 'bg-white/80 dark:bg-zinc-950/80 border-zinc-200 dark:border-zinc-800'}`}
                >
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                        <Layers className={`w-7 h-7 ${isSideZoneActive ? 'text-white' : 'text-zinc-400'}`} strokeWidth={1.5} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Drop Image</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col h-full overflow-hidden text-zinc-900 dark:text-zinc-100">
                {/* ── Mobile drag handle ── */}
                {isMobileSheet && (
                    <div
                        className="h-10 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing"
                        style={{ touchAction: 'none' }}
                        onTouchStart={handleSheetTouchStart}
                        onTouchMove={handleSheetTouchMove}
                        onTouchEnd={handleSheetTouchEnd}
                        onClick={() => { if (Math.abs(dragCurrentY.current) <= 10) setIsSheetOpen(p => !p); }}
                    >
                        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-6 pb-6 space-y-8">

                    {selectedImage?.parentId && !showPromptForm ? (
                        <div className="flex flex-col gap-3 mt-4 relative">
                            <button
                                onClick={() => {
                                    if (selectedImage.parentId) onNavigateParent(selectedImage.parentId);
                                }}
                                className="absolute -top-8 -right-2 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <Button
                                onClick={() => handleGenerate()}
                                variant="secondary"
                                size="l"
                                className="w-full justify-center"
                            >
                                {lang === 'de' ? 'Erneut generieren' : 'Generate again'}
                            </Button>
                            <Button
                                onClick={() => setShowPromptForm(true)}
                                variant="secondary"
                                size="l"
                                className="w-full justify-center"
                            >
                                {lang === 'de' ? 'Weiterbearbeiten' : 'Continue editing'}
                            </Button>
                            <Button
                                onClick={() => onDownload?.(selectedImage.id)}
                                variant="primary"
                                size="l"
                                className="w-full justify-center mt-4"
                            >
                                {lang === 'de' ? 'Herunterladen' : 'Download'}
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* ── REFINE Section ── */}
                            <section className="space-y-3">
                                {/* Prompt Header outside the box */}
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 tracking-wide">
                                        {t('prompt') || 'Prompt'}
                                    </span>
                                </div>

                                <div className={`bg-zinc-100/80 dark:bg-zinc-900/80 ${Theme.Geometry.RadiusXl} border border-zinc-200/80 dark:border-zinc-800/50 p-5 space-y-5 transition-all`}>
                                    {/* Prompt Textarea */}
                                    <div>
                                        <textarea
                                            ref={textareaRef}
                                            value={prompt}
                                            onChange={e => handlePromptChange(e.target.value)}
                                            placeholder={t('describe_changes') || 'Describe your changes…'}
                                            disabled={selectedImage?.isGenerating}
                                            className="w-full bg-transparent outline-none text-[13px] leading-relaxed resize-none min-h-[80px] overflow-hidden text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                                        />
                                    </div>

                                    {/* Reference images tray */}
                                    {referenceAnns.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {referenceAnns.map(ann => (
                                                <div key={ann.id} className="group relative w-11 h-11 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">
                                                    <img src={ann.referenceImage} className="w-full h-full object-cover" alt="ref" />
                                                    <button
                                                        onClick={() => deleteAnnotation(ann.id)}
                                                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-zinc-950/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Active Template Variable Chips */}
                                    {activeTemplate?.controls?.filter(c => !hiddenControlIds.includes(c.id)).map(ctrl => {
                                        const displayLabel = labelOverrides[ctrl.id] || ctrl.label;
                                        const isEditing = editingControlId === ctrl.id;

                                        return (
                                            <div key={ctrl.id} className="space-y-2.5 pt-1 relative group">
                                                <div className="flex items-center gap-2">
                                                    {isEditing ? (
                                                        <input
                                                            autoFocus
                                                            value={editControlValue}
                                                            onChange={e => setEditControlValue(e.target.value)}
                                                            onBlur={saveControlLabel}
                                                            onKeyDown={e => { if (e.key === 'Enter') saveControlLabel(); }}
                                                            className="bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-900 dark:text-zinc-100 m-0 p-0"
                                                        />
                                                    ) : (
                                                        <Eyebrow>{displayLabel}</Eyebrow>
                                                    )}
                                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleClearControl(ctrl.id)}
                                                            className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {ctrl.options.map(opt => {
                                                        const isActive = (controlValues[ctrl.id] || []).includes(opt.value);
                                                        return (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    toggleControlOption(ctrl.id, opt.value);
                                                                }}
                                                                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${isActive ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border border-zinc-900 dark:border-zinc-100 shadow-sm' : 'bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {/* Annotations Chip */}
                                    {!isMulti && visibleAnns.length > 0 && (
                                        <div className="pt-1 border-t border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between">
                                            <button
                                                onClick={() => onModeChange('brush')}
                                                className="flex items-center gap-2 text-[12px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                            >
                                                <div className="w-5 h-5 rounded-md bg-orange-500/10 flex items-center justify-center">
                                                    <Pen className="w-3 h-3 text-orange-500" />
                                                </div>
                                                {visibleAnns.length} {lang === 'de' ? 'Anmerkungen' : 'Annotations'}
                                                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Bottom Controls + Generate */}
                                    <div className="flex items-center justify-between gap-3 pt-2">
                                        <div className="flex items-center gap-2">
                                            <Tooltip text={lang === 'de' ? 'Referenzbild' : 'Add Reference'}>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={selectedImage?.isGenerating}
                                                    className="relative w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors disabled:opacity-40"
                                                >
                                                    <Camera className="w-4 h-4" />
                                                    {referenceAnns.length > 0 && (
                                                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-zinc-950">
                                                            {referenceAnns.length}
                                                        </span>
                                                    )}
                                                </button>
                                            </Tooltip>
                                            <Tooltip text={t('tt_annotate')}>
                                                <button
                                                    onClick={() => onModeChange(sideSheetMode === 'brush' ? 'prompt' : 'brush')}
                                                    disabled={selectedImage?.isGenerating || isMulti}
                                                    className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors disabled:opacity-40 ${sideSheetMode === 'brush' ? 'bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white' : 'bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'}`}
                                                >
                                                    <Pen className="w-4 h-4" />
                                                    {visibleAnns.length > 0 && (
                                                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-zinc-950">
                                                            {visibleAnns.length}
                                                        </span>
                                                    )}
                                                </button>
                                            </Tooltip>

                                            {/* Quality Dropdown */}
                                            <div className="relative shrink-0">
                                                <button
                                                    onClick={() => setIsQualityOpen(p => !p)}
                                                    className="h-10 flex items-center gap-1.5 px-3 rounded-full text-[12px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100 bg-black/5 dark:bg-white/5 transition-colors"
                                                >
                                                    {qualityMode === 'pro-1k' ? '1K' : qualityMode === 'pro-2k' ? '2K' : '4K'}
                                                    <ChevronDown className={`w-4 h-4 transition-transform ${isQualityOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {isQualityOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setIsQualityOpen(false)} />
                                                        <div className="absolute bottom-full mb-2 right-0 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 min-w-[120px] animate-in fade-in slide-in-from-bottom-2 duration-150">
                                                            {(['pro-1k', 'pro-2k', 'pro-4k'] as const).map(q => (
                                                                <button
                                                                    key={q}
                                                                    onClick={() => { onQualityModeChange(q); setIsQualityOpen(false); }}
                                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] transition-colors ${qualityMode === q ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'}`}
                                                                >
                                                                    {q === 'pro-1k' ? 'Pro 1K' : q === 'pro-2k' ? 'Pro 2K' : 'Pro 4K'}
                                                                    {qualityMode === q && <Check className="w-3 h-3 text-orange-500" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={e => { if (e.target.files?.[0]) { handleAddReferenceImage(e.target.files[0]); e.target.value = ''; } }}
                                        />

                                        {/* Generate Button */}
                                        <Button
                                            onClick={handleGenerate}
                                            disabled={selectedImage?.isGenerating}
                                            variant="primary"
                                            size="m"
                                            className="px-5 shrink-0"
                                        >
                                            {selectedImage?.isGenerating ? (
                                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />{t('processing')}</span>
                                            ) : (
                                                t('generate')
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* ── PRESETS Section ── */}
                                <div className="mt-5 text-zinc-800 dark:text-zinc-200">
                                    <div className="flex items-center justify-between mb-3.5 relative" ref={presetsMenuRef}>
                                        <div className="flex items-center gap-1.5">
                                            <Eyebrow>{showRecentPresets ? (lang === 'de' ? 'Zuletzt verwendet' : 'Recently used') : (lang === 'de' ? 'Vorlagen' : 'Presets')}</Eyebrow>
                                            <Tooltip text={lang === 'de' ? 'Optionen' : 'Options'}>
                                                <button
                                                    onClick={() => setIsPresetsMenuOpen(p => !p)}
                                                    className="p-1 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-1"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </Tooltip>
                                        </div>

                                        {isPresetsMenuOpen && (
                                            <div className="absolute top-10 right-0 z-[60]">
                                                <DropdownMenu
                                                    items={[
                                                        {
                                                            label: lang === 'de' ? 'Vorlagen' : 'Presets',
                                                            icon: !showRecentPresets ? <Check className="w-4 h-4" /> : <div className="w-4 h-4" />,
                                                            onClick: () => { setShowRecentPresets(false); setIsPresetsMenuOpen(false); }
                                                        },
                                                        {
                                                            label: lang === 'de' ? 'Zuletzt verwendet' : 'Recently used',
                                                            icon: showRecentPresets ? <Check className="w-4 h-4" /> : <div className="w-4 h-4" />,
                                                            onClick: () => { setShowRecentPresets(true); setIsPresetsMenuOpen(false); }
                                                        },
                                                        {
                                                            label: lang === 'de' ? 'Vorlagen bearbeiten' : 'Edit Presets',
                                                            onClick: () => {
                                                                setIsPresetsMenuOpen(false);
                                                                setEditingTemplate(null);
                                                                setIsPresetModalOpen(true);
                                                            },
                                                            separator: true
                                                        }
                                                    ]}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                                        {displayTemplates.length === 0 && (
                                            <div className="py-2 px-4 text-[12px] text-zinc-400">{lang === 'de' ? 'Keine Einträge' : 'No entries'}</div>
                                        )}
                                        {displayTemplates.map(tpl => {
                                            return (
                                                <Tooltip text={lang === 'de' ? 'Vorlage anwenden' : 'Apply Preset'}>
                                                    <button
                                                        key={tpl.id}
                                                        onClick={() => handleSelectTemplate(tpl)}
                                                        className="flex items-center justify-between w-full px-4 py-3 rounded-[16px] transition-all duration-150 group bg-zinc-100/70 dark:bg-zinc-900/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-800/80 border border-transparent"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {tpl.emoji && <span className="text-sm">{tpl.emoji}</span>}
                                                            <span className="text-[12.5px] font-medium truncate max-w-[180px] text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                                                                {tpl.title}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingTemplate(tpl);
                                                                    setIsPresetModalOpen(true);
                                                                }}
                                                                className={`p-1.5 rounded-full text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                                            >
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </button>
                                                </Tooltip>
                                            );
                                        })}
                                    </div>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </>
    );

    // ── Mobile Bottom Sheet Wrapper ──
    if (isMobileSheet) {
        return (
            <>
                <div className="lg:hidden fixed inset-0 z-[100] pointer-events-none">
                    <div
                        ref={sheetRef}
                        className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-900 rounded-t-[28px] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-auto shadow-2xl ${isSheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-10vh)]'}`}
                        style={{ maxHeight: '90vh', overflow: 'hidden', paddingBottom: 'env(safe-area-inset-bottom)' }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        {sheetContent}
                    </div>
                </div>
                <CropModal
                    isOpen={isCropOpen}
                    imageSrc={pendingFile || ''}
                    onClose={() => { setIsCropOpen(false); setPendingFile(null); }}
                    onCropComplete={handleCropComplete}
                    t={t}
                />
                <ManagePresetsModal
                    isOpen={isPresetModalOpen}
                    onClose={() => setIsPresetModalOpen(false)}
                    currentLang={lang}
                    initialTemplateId={editingTemplate ? editingTemplate.id : null}
                    templates={templates || []}
                    onSave={onSaveTemplate}
                    onDelete={onDeleteTemplate}
                    t={t as any}
                />
            </>
        );
    }

    // ── Desktop ──
    return (
        <>
            <div
                className="relative flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950"
                style={{ width }}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onContextMenu={e => e.stopPropagation()}
            >
                {sheetContent}
            </div>
            {/* Modals */}
            <CropModal
                isOpen={isCropOpen}
                imageSrc={pendingFile || ''}
                onClose={() => { setIsCropOpen(false); setPendingFile(null); }}
                onCropComplete={handleCropComplete}
                t={t}
            />

            <ManagePresetsModal
                isOpen={isPresetModalOpen}
                onClose={() => setIsPresetModalOpen(false)}
                currentLang={lang}
                initialTemplateId={editingTemplate ? editingTemplate.id : null}
                templates={templates || []}
                onSave={onSaveTemplate}
                onDelete={onDeleteTemplate}
                t={t as any}
            />
        </>
    );
});

SideSheet.displayName = 'SideSheet';
