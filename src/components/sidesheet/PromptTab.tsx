import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { CanvasImage, PromptTemplate, AnnotationObject, TranslationFunction, PresetControl, GenerationQuality } from '@/types';
import { PresetLibrary } from '@/components/library/PresetLibrary';
import { PresetEditorModal } from '@/components/modals/PresetEditorModal';
import { Pen, Camera, X, Copy, ArrowLeft, Plus, RotateCcw, Eye, ChevronDown, Check, Settings2, Square, Circle, Minus, Type, MoreHorizontal, MoreVertical, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button, SectionHeader, Theme, Typo, IconButton, Tooltip } from '@/components/ui/DesignSystem';
import { TwoDotsVertical } from '@/components/ui/CustomIcons';
import { useToast } from '@/components/ui/Toast';
import { DebugModal } from '@/components/modals/DebugModal';
import { Bug } from 'lucide-react';

interface PromptTabProps {
    prompt: string;
    setPrompt: (s: string) => void;
    selectedImage: CanvasImage;
    selectedImages?: CanvasImage[];
    onGenerate: (prompt: string) => void;
    onDeselect?: () => void;
    templates: PromptTemplate[];
    onSelectTemplate: (t: PromptTemplate) => void;
    onAddBrush: () => void;
    onAddObject: () => void;
    onDeleteAnnotation: (id: string) => void;
    onUpdateAnnotation: (id: string, patch: Partial<AnnotationObject>) => void;
    annotations: AnnotationObject[];
    onUpdateVariables: (id: string, templateId: string | undefined, vars: Record<string, string[]>) => void;
    onAddReference: (file: File, annotationId?: string) => void;
    onTogglePin?: (id: string) => void;
    onDeleteTemplate?: (id: string) => void;
    onCreateTemplate?: (t: Omit<PromptTemplate, 'id' | 'isPinned' | 'usageCount' | 'isCustom' | 'lastUsed'>) => void;
    onUpdateTemplate?: (id: string, updates: Partial<PromptTemplate>) => void;
    onGenerateMore: (id: string) => void;
    onNavigateParent: (id: string) => void;
    qualityMode: GenerationQuality;
    onQualityModeChange: (mode: GenerationQuality) => void;
    t: TranslationFunction;
    currentLang: 'de' | 'en';
    userProfile: any;
    showInfo?: boolean;
}

export const PromptTab: React.FC<PromptTabProps> = ({
    prompt, setPrompt, selectedImage, selectedImages, onGenerate, onDeselect, templates, onSelectTemplate,
    onAddBrush, onAddObject, onAddReference, annotations, onDeleteAnnotation,
    onUpdateAnnotation, onUpdateVariables, onTogglePin, onDeleteTemplate, onCreateTemplate, onUpdateTemplate,
    onGenerateMore, onNavigateParent, qualityMode, onQualityModeChange, t, currentLang, userProfile,
    showInfo = false
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editEmojiValue, setEditEmojiValue] = useState('');
    const { showToast } = useToast();
    const [menuId, setMenuId] = useState<string | null>(null);
    const [activeTemplate, setActiveTemplate] = useState<PromptTemplate | null>(null);
    const [controlValues, setControlValues] = useState<Record<string, string[]>>({});
    const [hiddenControlIds, setHiddenControlIds] = useState<string[]>([]);

    const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
    const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({});
    const [editingControlId, setEditingControlId] = useState<string | null>(null);
    const [editControlValue, setEditControlValue] = useState("");
    const [presetModalMode, setPresetModalMode] = useState<'create' | 'edit'>('create');
    const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const [isDebugOpen, setIsDebugOpen] = useState(false);

    const MODES: { id: GenerationQuality, label: string, desc: string, price: string }[] = [
        { id: 'fast', label: 'Nano Banana', desc: '1024 px', price: t('price_free') },
        { id: 'pro-1k', label: 'Nano Banana Pro 1K', desc: '1024 px', price: '0.10 €' },
        { id: 'pro-2k', label: 'Nano Banana Pro 2K', desc: '2048 px', price: '0.25 €' },
        { id: 'pro-4k', label: 'Nano Banana Pro 4K', desc: '4096 px', price: '0.50 €' },
    ];

    const currentModel = MODES.find(m => m.id === qualityMode) || MODES[0];

    const isMulti = selectedImages && selectedImages.length > 1;

    const lastIdRef = useRef<string>(selectedImage.id);

    useEffect(() => {
        const idChanged = lastIdRef.current !== selectedImage.id;

        if (idChanged) {
            // Sync state for templates/controls
            if (selectedImage.activeTemplateId) {
                const found = templates.find(t => t.id === selectedImage.activeTemplateId);
                setActiveTemplate(found || null);
            } else {
                setActiveTemplate(null);
            }
            setControlValues(selectedImage.variableValues || {});
            setHiddenControlIds([]);
            lastIdRef.current = selectedImage.id;
        }
    }, [selectedImage.id, selectedImage.activeTemplateId, selectedImage.variableValues, templates]);

    useLayoutEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            const newHeight = Math.max(textAreaRef.current.scrollHeight, 120);
            textAreaRef.current.style.height = `${newHeight}px`;
        }
    }, [prompt, activeTemplate, showInfo]);

    const startEditing = (ann: AnnotationObject, defaultText: string) => {
        setEditingId(ann.id);
        setEditValue(ann.text || defaultText);
        setEditEmojiValue(ann.emoji || '🏷️');
    };

    const saveEditing = () => {
        if (editingId) {
            const updates: Partial<AnnotationObject> = {};
            if (editValue.trim()) updates.text = editValue;
            if (editEmojiValue.trim()) updates.emoji = editEmojiValue;

            if (Object.keys(updates).length > 0) {
                onUpdateAnnotation(editingId, updates);
            }
            setEditingId(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (editingControlId) saveControlLabel();
            else saveEditing();
        }
        if (e.key === 'Escape') {
            setEditingId(null);
            setEditingControlId(null);
        }
    };

    const startEditingControl = (id: string, currentLabel: string) => {
        setEditingControlId(id);
        setEditControlValue(labelOverrides[id] || currentLabel);
    };

    const saveControlLabel = () => {
        if (editingControlId) {
            setLabelOverrides(prev => ({ ...prev, [editingControlId]: editControlValue }));
            setEditingControlId(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onAddReference(e.target.files[0]);
        }
        e.target.value = '';
    };



    const handleSelectPreset = (t: PromptTemplate) => {
        onSelectTemplate(t);
        setPrompt(t.prompt);
        setHiddenControlIds([]); // Reset hidden controls when selecting new preset

        if (t.controls && t.controls.length > 0) {
            setActiveTemplate(t);
            setControlValues({});
            onUpdateVariables(selectedImage.id, t.id, {});
        } else {
            setActiveTemplate(null);
            setControlValues({});
            onUpdateVariables(selectedImage.id, undefined, {});
        }
        if (textAreaRef.current) {
            textAreaRef.current.focus();
        }
    };

    const handleToggleControlOption = (controlId: string, value: string) => {
        setControlValues(prev => {
            const current = prev[controlId] || [];
            let updatedValues: Record<string, string[]> = {};

            if (current.includes(value)) {
                const updated = current.filter(v => v !== value);
                const newState = { ...prev };
                if (updated.length === 0) {
                    delete newState[controlId];
                } else {
                    newState[controlId] = updated;
                }
                updatedValues = newState;
            } else {
                updatedValues = { ...prev, [controlId]: [...current, value] };
            }

            onUpdateVariables(selectedImage.id, activeTemplate?.id, updatedValues);
            return updatedValues;
        });
    };

    const handleReset = () => {
        setControlValues({});
        setActiveTemplate(null);
        setHiddenControlIds([]);
        onUpdateVariables(selectedImage.id, undefined, {});
    };

    const handleClearControl = (controlId: string) => {
        setControlValues(prev => {
            const newState = { ...prev };
            delete newState[controlId];
            onUpdateVariables(selectedImage.id, activeTemplate?.id, newState);
            return newState;
        });
        setHiddenControlIds(prev => [...prev, controlId]);
    };

    const getFinalPrompt = () => {
        const trimmedPrompt = prompt.trim();
        const refs = annotations.filter(a => a.type === 'reference_image');
        const hasAnnotations = annotations.some(a => ['mask_path', 'stamp', 'shape'].includes(a.type));

        // 1. Annotation Guide (Technical Label for the AI)
        let annotationGuide = "";
        if (hasAnnotations) {
            annotationGuide = "Image 2: The Annotation Image (Muted original + overlays showing where and what to change).";
        }

        // 2. Reference Image Contexts
        const refParts: string[] = [];
        // If we have an annotation image, it is Image 2, so references start at Image 3
        const refStartIndex = hasAnnotations ? 3 : 2;

        refs.forEach((ann, index) => {
            const userText = ann.text?.trim();
            const fallback = currentLang === 'de'
                ? "Nutze dieses Bild als Inspiration für ..."
                : "Use this image as inspiration for ...";

            const content = userText || fallback;
            refParts.push(`Image ${refStartIndex + index}: ${content}`);
        });

        // 3. Template Controls
        const varParts: string[] = [];
        if (activeTemplate && activeTemplate.controls) {
            activeTemplate.controls.forEach(c => {
                const vals = controlValues[c.id];
                if (vals && vals.length > 0) {
                    const displayLabel = labelOverrides[c.id] || c.label;
                    if (displayLabel) {
                        try {
                            const label = displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1).toLowerCase();
                            varParts.push(`${label}: ${vals.join(", ")}`);
                        } catch (e) {
                            varParts.push(...vals);
                        }
                    } else {
                        varParts.push(...vals);
                    }
                }
            });
        }

        // Assemble with clear semantic markers
        let finalOutput = "";

        if (trimmedPrompt) {
            const label = currentLang === 'de' ? "HAUPT-ANWEISUNG" : "MAIN INSTRUCTION";
            finalOutput += `${label}: ${trimmedPrompt}`;
        }

        if (annotationGuide) {
            if (finalOutput) finalOutput += "\n\n";
            finalOutput += `ANNOTATION GUIDE: ${annotationGuide}`;
        }

        if (refParts.length > 0) {
            if (finalOutput) finalOutput += "\n\n";
            const label = currentLang === 'de'
                ? "KONTEXT / REFERENZEN (Nur als Inspiration nutzen, das Hauptbild NICHT ersetzen):"
                : "CONTEXT / REFERENCES (Use for inspiration only, DO NOT replace the main image):";
            finalOutput += `${label}\n${refParts.join("\n")}`;
        }

        if (varParts.length > 0) {
            if (finalOutput) finalOutput += "\n\n";
            const label = currentLang === 'de' ? "STIL-PARAMETER:" : "STYLE PARAMETERS:";
            finalOutput += `${label}\n${varParts.join(". ")}`;
        }

        // If for some reason the structure is empty, return the raw prompt
        return finalOutput.trim() || trimmedPrompt;
    };

    const handleDoGenerate = () => {
        onGenerate(getFinalPrompt(), prompt, activeTemplate?.id, controlValues);
    };

    const openCreatePreset = () => {
        setPresetModalMode('create');
        setEditingTemplate(null);
        setIsPresetModalOpen(true);
    };

    const openEditPreset = (template: PromptTemplate) => {
        setPresetModalMode('edit');
        setEditingTemplate(template);
        setIsPresetModalOpen(true);
    };

    const handleSavePreset = (items: { title: string; prompt: string; tags: string[]; controls: PresetControl[]; lang: 'de' | 'en' }[]) => {
        items.forEach(item => {
            if (presetModalMode === 'edit' && editingTemplate && editingTemplate.lang === item.lang && onUpdateTemplate) {
                onUpdateTemplate(editingTemplate.id, item);
            } else if (onCreateTemplate) {
                onCreateTemplate(item);
            }
        });
        setIsPresetModalOpen(false);
    };

    return (
        <div className="h-full relative flex flex-col overflow-hidden">
            {/* Hidden file input for annotation reference images */}


            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="min-h-full flex flex-col">
                    {!showInfo || isMulti ? (
                        <div className="flex-1 flex flex-col px-6 pt-6 pb-6 gap-3">
                            <div className="flex flex-col gap-3">
                                {/* 1. MAIN PROMPT BLOCK (Always Visible) */}
                                <div className={`flex flex-col border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} ${Theme.Colors.PanelBg} shadow-sm transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/10 focus-within:!bg-transparent focus-within:border-zinc-300 dark:focus-within:border-zinc-700`}>
                                    <textarea
                                        ref={textAreaRef}
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder={t('describe_changes')}
                                        className={`w-full bg-transparent border-none outline-none px-4 py-4 pb-3 ${Typo.Body} font-mono leading-relaxed resize-none min-h-[80px] overflow-hidden`}
                                        disabled={selectedImage.isGenerating}
                                    />
                                </div>

                                {/* 2. VARIABLE BLOCKS (Optional) */}
                                {activeTemplate && activeTemplate.controls && activeTemplate.controls
                                    .filter(c => !hiddenControlIds.includes(c.id))
                                    .map((ctrl) => {
                                        const displayLabel = labelOverrides[ctrl.id] || ctrl.label;
                                        const isEditing = editingControlId === ctrl.id;

                                        return (
                                            <div key={ctrl.id} className={`flex flex-col border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} ${Theme.Colors.PanelBg} shadow-sm p-4 pt-4 gap-3 relative group`}>
                                                <div className="absolute top-2 right-2">
                                                    <button
                                                        onClick={() => handleClearControl(ctrl.id)}
                                                        className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                        title="Remove"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <div className="relative w-full pr-8">
                                                        {isEditing ? (
                                                            <textarea
                                                                autoFocus
                                                                value={editControlValue}
                                                                onChange={(e) => setEditControlValue(e.target.value)}
                                                                onBlur={saveControlLabel}
                                                                onKeyDown={handleKeyDown}
                                                                className={`w-full bg-transparent border-none outline-none p-0 ${Typo.Body} font-mono opacity-70 leading-relaxed resize-none overflow-hidden block`}
                                                                style={{ minHeight: '1.2em' }}
                                                            />
                                                        ) : (
                                                            <div
                                                                onClick={() => startEditingControl(ctrl.id, ctrl.label)}
                                                                className={`w-full ${Typo.Body} font-mono opacity-30 group-hover:opacity-60 transition-opacity cursor-text break-words whitespace-pre-wrap`}
                                                            >
                                                                {displayLabel}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5">
                                                        {ctrl.options.map((opt) => {
                                                            const isSelected = (controlValues[ctrl.id] || []).includes(opt.value);
                                                            return (
                                                                <button
                                                                    key={opt.id}
                                                                    onClick={() => handleToggleControlOption(ctrl.id, opt.value)}
                                                                    className={`
                                                                        px-3 py-1.5 rounded-full text-[12px] transition-all
                                                                        ${isSelected
                                                                            ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium'
                                                                            : 'bg-zinc-100/50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/10'}
                                                                    `}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                }

                                {/* 3. ANNOTATIONS BLOCK (Optional) */}
                                {annotations.some(a => ['mask_path', 'stamp', 'shape'].includes(a.type)) && (
                                    <div className={`flex flex-col border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} ${Theme.Colors.PanelBg} shadow-sm p-4 pt-4 gap-3 relative group`}>
                                        <div className="absolute top-2 right-2">
                                            <button
                                                onClick={() => {
                                                    annotations.filter(a => ['mask_path', 'stamp', 'shape'].includes(a.type)).forEach(a => onDeleteAnnotation(a.id));
                                                }}
                                                className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                title="Clear All"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="h-6 min-w-[24px] px-2 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full text-[11px] font-mono font-bold border border-zinc-200 dark:border-zinc-700">
                                                {annotations.filter(a => ['mask_path', 'stamp', 'shape'].includes(a.type)).length}
                                            </span>
                                            <span className={`${Typo.Body} opacity-60`}>
                                                {currentLang === 'de' ? "Markierte Bereiche auf dem Bild" : "Marked areas on the image"}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* 4. REFERENCE IMAGE BLOCKS (Optional) */}
                                {annotations.filter(a => a.type === 'reference_image').map((ann, index) => {
                                    const defaultText = currentLang === 'de' ? "Nutze dieses Bild als Inspiration für ..." : "Use this image as inspiration for ...";
                                    const hasText = ann.text && ann.text.trim().length > 0;
                                    const textValue = hasText ? ann.text : defaultText;
                                    const isEditing = editingId === ann.id;

                                    return (
                                        <div key={ann.id} className={`flex flex-col border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} ${Theme.Colors.PanelBg} shadow-sm p-4 pt-4 gap-3 relative group`}>
                                            <div className="absolute top-2 right-2">
                                                <button
                                                    onClick={() => onDeleteAnnotation(ann.id)}
                                                    className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                    title="Remove"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                <div className="relative w-full pr-8">
                                                    {isEditing ? (
                                                        <textarea
                                                            autoFocus
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={saveEditing}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    saveEditing();
                                                                }
                                                                handleKeyDown(e);
                                                            }}
                                                            className={`w-full bg-transparent border-none outline-none p-0 ${Typo.Body} font-mono leading-relaxed resize-none overflow-hidden block`}
                                                            style={{ minHeight: '1.5em' }}
                                                            onInput={(e) => {
                                                                const target = e.target as HTMLTextAreaElement;
                                                                target.style.height = 'auto';
                                                                target.style.height = target.scrollHeight + 'px';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div
                                                            onClick={() => startEditing(ann, defaultText)}
                                                            className={`w-full ${Typo.Body} font-mono leading-relaxed cursor-text break-words whitespace-pre-wrap ${!hasText ? 'text-zinc-400 opacity-80' : 'text-zinc-900 dark:text-zinc-100'}`}
                                                        >
                                                            {textValue}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="w-16 h-16 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 shadow-sm shrink-0">
                                                    <img src={ann.referenceImage} className="w-full h-full object-cover" alt="ref" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex flex-col">
                                {/* Tools Buttons */}
                                <div className="grid grid-cols-2 gap-2 py-4">
                                    <Button
                                        variant="secondary"
                                        onClick={onAddBrush}
                                        disabled={selectedImage.isGenerating || isMulti}
                                        icon={<Pen className={`w-3.5 h-3.5 ${isMulti ? 'text-zinc-300' : 'text-blue-500'}`} />}
                                        className="w-full !normal-case !font-normal !tracking-normal !text-xs"
                                        tooltip={isMulti ? t('tool_disabled_multi') : t('tt_annotate')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{t('annotate') || 'Annotate'}</span>
                                            {annotations.filter(a => a.type !== 'reference_image').length > 0 && (
                                                <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full text-[10px] font-mono leading-none">
                                                    {annotations.filter(a => a.type !== 'reference_image').length}
                                                </span>
                                            )}
                                        </div>
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={selectedImage.isGenerating}
                                        icon={<Camera className="w-3.5 h-3.5 text-orange-500" />}
                                        className="w-full !normal-case !font-normal !tracking-normal !text-xs"
                                        tooltip={t('tt_upload_ref')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{currentLang === 'de' ? 'Referenzbild' : 'Reference Image'}</span>
                                            {annotations.filter(a => a.type === 'reference_image').length > 0 && (
                                                <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full text-[10px] font-mono leading-none">
                                                    {annotations.filter(a => a.type === 'reference_image').length}
                                                </span>
                                            )}
                                        </div>
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>

                                {/* Generate Button with Integrated Settings */}
                                <div className="mt-3 relative z-20">
                                    <div className="flex w-full">
                                        <button
                                            onClick={handleDoGenerate}
                                            disabled={selectedImage.isGenerating || (!prompt?.trim() && annotations.length === 0)}
                                            className={`
                                                relative flex-1 flex items-center justify-center py-3.5 rounded-lg transition-all shadow-sm
                                                ${(selectedImage.isGenerating || (!prompt?.trim() && annotations.length === 0))
                                                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed opacity-50'
                                                    : `${Theme.Colors.AccentBg} ${Theme.Colors.AccentFg} hover:opacity-90`}
                                            `}
                                        >
                                            <span className={`flex items-center gap-2 ${Typo.ButtonLabel}`}>
                                                {selectedImage.isGenerating
                                                    ? t('processing')
                                                    : isMulti && selectedImages
                                                        ? `${t('generate_multi')} (${selectedImages.length})`
                                                        : t('generate')}
                                            </span>

                                            {/* ABSOLUTE SETTINGS BUTTON INSIDE GENERATE */}
                                            {!selectedImage.isGenerating && (
                                                <div className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center z-20">
                                                    <Tooltip text={currentLang === 'de' ? 'Modell auswählen' : 'Select model'} side="bottom">
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsModelDropdownOpen(!isModelDropdownOpen);
                                                            }}
                                                            className={`
                                                                w-full h-full flex items-center justify-center rounded
                                                                hover:bg-black/10 transition-colors cursor-pointer
                                                                ${isModelDropdownOpen ? 'bg-black/10' : ''}
                                                            `}
                                                        >
                                                            <TwoDotsVertical className="w-4 h-4" />
                                                        </div>
                                                    </Tooltip>
                                                </div>
                                            )}
                                        </button>
                                    </div>

                                    {/* DROPDOWN MENU - Positioned relative to the container */}
                                    {isModelDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setIsModelDropdownOpen(false)} />
                                            <div className={`
                                                absolute top-full right-0 mt-2 w-64 p-1.5
                                                ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg}
                                                shadow-xl flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200 z-50
                                            `}>
                                                {MODES.map((m) => (
                                                    <button
                                                        key={m.id}
                                                        onClick={() => { onQualityModeChange(m.id); setIsModelDropdownOpen(false); }}
                                                        className={`
                                                            flex items-center justify-between px-3 py-2 ${Theme.Geometry.Radius} text-left transition-colors
                                                            ${qualityMode === m.id ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
                                                        `}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className={`${Typo.Body} font-medium ${qualityMode === m.id ? Theme.Colors.TextHighlight : Theme.Colors.TextPrimary}`}>
                                                                {m.label}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`${Typo.Micro} text-zinc-400 dark:text-zinc-500`}>{m.price}</span>
                                                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                                                <span className={`${Typo.Micro} text-zinc-400 dark:text-zinc-500`}>{m.desc}</span>
                                                            </div>
                                                        </div>
                                                        {qualityMode === m.id && <Check className="w-4 h-4 text-black dark:text-white" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {isMulti && (
                                    <Button
                                        variant="secondary"
                                        onClick={onDeselect}
                                        className="w-full"
                                    >
                                        {t('ctx_deselect')}
                                    </Button>
                                )}
                            </div>
                        </div >
                    ) : (
                        /* Info Tab Content */
                        <div className="flex-1 flex flex-col gap-8 px-6 pt-8 pb-6">
                            {/* Prompt Section */}
                            {selectedImage.generationPrompt && (
                                <div className="flex flex-col gap-3 group relative">
                                    <div className="flex items-center justify-between">
                                        <span className={`${Typo.Label} text-zinc-400 text-[10px] uppercase tracking-widest`}>
                                            Prompt
                                        </span>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <IconButton
                                                icon={<Copy className="w-3.5 h-3.5" />}
                                                tooltip={t('copy')}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (selectedImage.generationPrompt) {
                                                        navigator.clipboard.writeText(selectedImage.generationPrompt);
                                                        showToast(t('copied_to_clipboard') || 'Copied to clipboard', 'success');
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <p className={`font-mono text-zinc-600 dark:text-zinc-300 text-xs leading-relaxed`}>
                                        {selectedImage.generationPrompt}
                                    </p>
                                </div>
                            )}

                            {/* Metadata Grid (No border, 2 columns) - Hide while generating placeholder */}
                            {!selectedImage.isGenerating && (
                                <div className="flex flex-col gap-8">
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                        {/* Resolution */}
                                        <div className="flex flex-col gap-1.5">
                                            <span className={`${Typo.Body} text-zinc-400 text-xs`}>
                                                {t('resolution')}
                                            </span>
                                            <span className={`${Typo.Mono} text-xs text-zinc-500 dark:text-zinc-400`}>
                                                {(() => {
                                                    if (selectedImage.realWidth && selectedImage.realHeight) {
                                                        return `${selectedImage.realWidth} × ${selectedImage.realHeight}px`;
                                                    }
                                                    // Fallbacks based on quality if real dims are missing
                                                    if (selectedImage.quality === 'pro-4k') return '4096 × 4096px';
                                                    if (selectedImage.quality === 'pro-2k') return '2048 × 2048px';
                                                    return '1024 × 1024px';
                                                })()}
                                            </span>
                                        </div>

                                        {/* Created At */}
                                        <div className="flex flex-col gap-1.5">
                                            <span className={`${Typo.Body} text-zinc-400 text-xs`}>
                                                {t('created_at')}
                                            </span>
                                            <span className={`${Typo.Mono} text-xs text-zinc-500 dark:text-zinc-400`}>
                                                {selectedImage.createdAt ? (() => {
                                                    const d = new Date(selectedImage.createdAt);
                                                    const day = String(d.getDate()).padStart(2, '0');
                                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                                    const hours = String(d.getHours()).padStart(2, '0');
                                                    const minutes = String(d.getMinutes()).padStart(2, '0');
                                                    return `${day}.${month}. ${hours}:${minutes}`;
                                                })() : '-'}
                                            </span>
                                        </div>

                                        {/* Model */}
                                        {selectedImage.quality && (
                                            <div className="flex flex-col gap-1.5">
                                                <span className={`${Typo.Body} text-zinc-400 text-xs`}>
                                                    {t('model')}
                                                </span>
                                                <span className={`${Typo.Body} text-xs text-zinc-500 dark:text-zinc-400 capitalize`}>
                                                    {(() => {
                                                        // 1. Map to friendly branded names based on recorded quality
                                                        const q = selectedImage.quality;
                                                        if (q) {
                                                            switch (q) {
                                                                case 'pro-4k': return 'Nano Banana Pro 4K';
                                                                case 'pro-2k': return 'Nano Banana Pro 2K';
                                                                case 'pro-1k': return 'Nano Banana Pro 1K';
                                                                case 'fast': return 'Nano Banana (Fast)';
                                                            }
                                                        }

                                                        // 2. Fallback to API-reported model version
                                                        return selectedImage.modelVersion || 'Nano Banana';
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Reference Images Section - Only in Info tab now */}
                                    {selectedImage.annotations?.some(ann => ann.referenceImage) && (
                                        <div className="flex flex-col gap-3">
                                            <span className={`${Typo.Label} text-zinc-400 text-[10px] uppercase tracking-widest`}>
                                                {t('reference_images')}
                                            </span>
                                            <div className="grid grid-cols-4 gap-2">
                                                {selectedImage.annotations
                                                    .filter(ann => ann.referenceImage)
                                                    .map((ann, idx) => (
                                                        <div
                                                            key={ann.id || idx}
                                                            className="aspect-square rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
                                                        >
                                                            <img
                                                                src={ann.referenceImage}
                                                                alt={`Ref ${idx + 1}`}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions Container (No Header) */}
                            <div className="flex flex-col gap-2">

                                <Button
                                    variant="secondary"
                                    onClick={() => onGenerateMore(selectedImage.id)}
                                    disabled={selectedImage.isGenerating}
                                    className="justify-start px-4 h-11 gap-2"
                                >
                                    <RotateCcw className="w-4 h-4 text-zinc-400" />
                                    <span className={`${Typo.Label} uppercase tracking-wider text-zinc-600 dark:text-zinc-300`}>
                                        {t('ctx_create_variations')}
                                    </span>
                                </Button>

                                {selectedImage.parentId && (
                                    <Button
                                        variant="secondary"
                                        onClick={() => selectedImage.parentId && onNavigateParent(selectedImage.parentId)}
                                        disabled={selectedImage.isGenerating}
                                        className="justify-start px-4 h-11 gap-2"
                                    >
                                        <ArrowLeft className="w-4 h-4 text-zinc-400" />
                                        <span className={`${Typo.Label} uppercase tracking-wider text-zinc-600 dark:text-zinc-300`}>
                                            {currentLang === 'de' ? 'Zum Original' : 'Top Parent'}
                                        </span>
                                    </Button>
                                )}

                                {userProfile?.role === 'admin' && (
                                    <div className="w-full flex justify-center py-4 bg-transparent outline-none">
                                        <button
                                            onClick={() => setIsDebugOpen(true)}
                                            className="text-zinc-300 dark:text-zinc-600 hover:text-blue-500 text-[10px] font-mono tracking-widest uppercase transition-colors"
                                        >
                                            Debug
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                </div >
            </div >

            {/* PRESET LIBRARY - At the absolute bottom of the side sheet, full width */}
            {
                (!showInfo || isMulti) && (
                    <div className={`mt-auto ${Theme.Colors.PanelBg} w-full border-t border-zinc-200 dark:border-zinc-800 shrink-0`}>
                        <PresetLibrary
                            templates={templates}
                            onSelect={handleSelectPreset}
                            onTogglePin={onDeleteTemplate || (() => { })}
                            onRequestCreate={openCreatePreset}
                            onRequestEdit={openEditPreset}
                            t={t}
                            currentLang={currentLang}
                        />
                    </div>
                )
            }

            <PresetEditorModal
                isOpen={isPresetModalOpen}
                onClose={() => setIsPresetModalOpen(false)}
                mode={presetModalMode}
                scope="user"
                currentLang={currentLang}
                initialTemplate={editingTemplate}
                existingTemplates={templates}
                onSave={handleSavePreset}
                onDelete={onDeleteTemplate}
                t={t}
            />
            <DebugModal
                isOpen={isDebugOpen}
                onClose={() => setIsDebugOpen(false)}
                image={selectedImage}
                prompt={getFinalPrompt()}
                t={t}
            />
        </div >
    );
};
