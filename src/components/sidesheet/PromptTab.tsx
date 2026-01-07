import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { CanvasImage, PromptTemplate, AnnotationObject, TranslationFunction, PresetControl, GenerationQuality } from '@/types';
import { PresetLibrary } from '@/components/library/PresetLibrary';
import { PresetEditorModal } from '@/components/modals/PresetEditorModal';
import { Pen, Camera, X, Copy, ArrowLeft, Plus, RotateCcw, Eye, ChevronDown, Check, Settings2, Square, Circle, Minus, Type, MoreHorizontal, MoreVertical, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button, SectionHeader, Theme, Typo, IconButton, Tooltip } from '@/components/ui/DesignSystem';
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
}

export const PromptTab: React.FC<PromptTabProps> = ({
    prompt, setPrompt, selectedImage, selectedImages, onGenerate, onDeselect, templates, onSelectTemplate,
    onAddBrush, onAddObject, onAddReference, annotations, onDeleteAnnotation,
    onUpdateAnnotation, onUpdateVariables, onTogglePin, onDeleteTemplate, onCreateTemplate, onUpdateTemplate,
    onGenerateMore, onNavigateParent, qualityMode, onQualityModeChange, t, currentLang, userProfile
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
    const [presetModalMode, setPresetModalMode] = useState<'create' | 'edit'>('create');
    const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
    const [activeInternalTab, setActiveInternalTab] = useState<'prompt' | 'info'>('prompt');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const annFileInputRef = useRef<HTMLInputElement>(null);
    const targetAnnIdRef = useRef<string | null>(null);
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
            // NEW SELECTION
            if (selectedImage.isGenerating) {
                // If it's a new generation (skeleton), switch to info
                setActiveInternalTab('info');
            } else {
                // Otherwise, default to Edit tab exactly as requested
                setActiveInternalTab('prompt');
            }

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
        } else if (selectedImage.isGenerating) {
            // SAME IMAGE, BUT STARTED GENERATING
            setActiveInternalTab('info');
        }
        // Note: We don't have an 'else' for isGenerating becoming false 
        // because the user wants to keep the Info tab visible once generation is finished.
    }, [selectedImage.id, selectedImage.isGenerating, selectedImage.activeTemplateId, selectedImage.variableValues, templates]);

    useLayoutEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            const newHeight = Math.max(textAreaRef.current.scrollHeight, 120);
            textAreaRef.current.style.height = `${newHeight}px`;
        }
    }, [prompt, activeTemplate, activeInternalTab]);

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
            saveEditing();
        }
        if (e.key === 'Escape') {
            setEditingId(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onAddReference(e.target.files[0]);
        }
        e.target.value = '';
    };

    const handleAnnFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && targetAnnIdRef.current) {
            onAddReference(e.target.files[0], targetAnnIdRef.current);
            targetAnnIdRef.current = null;
        }
        e.target.value = '';
    };

    const triggerAnnFile = (annId: string) => {
        targetAnnIdRef.current = annId;
        annFileInputRef.current?.click();
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
        let final = prompt.trim();
        if (activeTemplate && activeTemplate.controls) {
            const appendedParts: string[] = [];
            activeTemplate.controls.forEach(c => {
                const vals = controlValues[c.id];
                if (vals && vals.length > 0) {
                    if (c.label) {
                        // Title Case for label: SAISON -> Saison, MOOD -> Mood
                        const label = c.label.charAt(0).toUpperCase() + c.label.slice(1).toLowerCase();
                        appendedParts.push(`${label}: ${vals.join(", ")}`);
                    } else {
                        appendedParts.push(...vals);
                    }
                }
            });
            if (appendedParts.length > 0) {
                if (final) {
                    // Start with a period if missing
                    if (!final.endsWith('.') && !final.endsWith('!') && !final.endsWith('?')) {
                        final += '.';
                    }
                    final += " " + appendedParts.join(". ");
                } else {
                    final = appendedParts.join(". ");
                }
            }
        }
        return final;
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
            <input
                type="file"
                ref={annFileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAnnFileChange}
            />

            {/* Tab Header - Only show if not multiple selection (Info tab only makes sense for single image) */}
            {!isMulti && (
                <div className={`flex border-b ${Theme.Colors.Border} shrink-0 ${Theme.Colors.PanelBg} relative`}>
                    <button
                        onClick={() => setActiveInternalTab('prompt')}
                        className={`flex-1 py-3 ${Typo.Label} transition-colors relative ${activeInternalTab === 'prompt' ? Theme.Colors.TextPrimary : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
                    >
                        {t('tab_edit')}
                    </button>
                    <button
                        onClick={() => setActiveInternalTab('info')}
                        className={`flex-1 py-3 ${Typo.Label} transition-colors relative ${activeInternalTab === 'info' ? Theme.Colors.TextPrimary : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
                    >
                        {t('tab_info') || 'Info'}
                    </button>

                    {/* Animated Underline */}
                    <div
                        className="absolute bottom-[-1px] h-[2px] bg-zinc-800 dark:bg-zinc-200 transition-all duration-300 ease-in-out"
                        style={{
                            width: '50%',
                            left: activeInternalTab === 'prompt' ? '0%' : '50%'
                        }}
                    />
                </div>
            )}

            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="min-h-full flex flex-col">
                    {activeInternalTab === 'prompt' || isMulti ? (
                        <div className="flex-1 flex flex-col px-6 pt-6 pb-6">
                            <div className="flex flex-col gap-0">
                                {/* UNIFIED BOX: Prompt + Chips */}
                                <div className={`flex flex-col border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} ${Theme.Colors.PanelBg} shadow-sm transition-all focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-600`}>
                                    <Tooltip text={t('tt_prompt')} side="top">
                                        <textarea
                                            ref={textAreaRef}
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder={t('describe_changes')}
                                            className={`w-full bg-transparent border-none outline-none p-4 pb-0 ${Typo.Body} font-mono leading-relaxed resize-none min-h-[100px] overflow-hidden`}
                                            disabled={selectedImage.isGenerating}
                                        />
                                    </Tooltip>

                                    {/* SECTIONS CONTAINER */}
                                    <div className="p-3 pt-4 flex flex-col gap-2">
                                        {/* VARIABLE OPTIONS */}
                                        {activeTemplate && activeTemplate.controls && activeTemplate.controls.length > 0 && (
                                            <div className="flex flex-col gap-4">
                                                {activeTemplate.controls
                                                    .filter(c => !hiddenControlIds.includes(c.id))
                                                    .map((ctrl) => (
                                                        <div key={ctrl.id} className="flex flex-col gap-2 group">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[10px] tracking-tight text-zinc-400 dark:text-zinc-500 uppercase font-sans font-medium">
                                                                    {ctrl.label}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleClearControl(ctrl.id)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                                                                    title="Reset"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
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
                                                                                    : 'bg-zinc-100/50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/80'}
                                                                            `}
                                                                        >
                                                                            {opt.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}

                                        {/* REFERENCE IMAGES SECTION */}
                                        {annotations.filter(a => a.type === 'reference_image').length > 0 && (
                                            <div className="flex flex-col gap-2 group/ref">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] tracking-tight text-zinc-400 dark:text-zinc-500 uppercase font-sans font-medium">
                                                        {t('reference_images')}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1.5 pb-2">
                                                    {annotations.filter(a => a.type === 'reference_image').map((ann) => {
                                                        const displayText = ann.text || `${t('image_ref')}`;
                                                        const isEditing = editingId === ann.id;

                                                        return (
                                                            <div key={ann.id} className="relative group/chip-container">
                                                                <div
                                                                    className={`
                                                                        flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] transition-all w-full
                                                                        ${isEditing ? 'bg-white dark:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-zinc-700' : 'bg-zinc-100/50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/80'}
                                                                    `}
                                                                >
                                                                    {ann.referenceImage && (
                                                                        <div className="shrink-0 w-6 h-6 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                                                            <img src={ann.referenceImage} className="w-full h-full object-cover" alt="ref" />
                                                                        </div>
                                                                    )}

                                                                    {isEditing ? (
                                                                        <input
                                                                            autoFocus
                                                                            value={editValue}
                                                                            onChange={(e) => setEditValue(e.target.value)}
                                                                            onBlur={saveEditing}
                                                                            onKeyDown={handleKeyDown}
                                                                            className="bg-transparent border-none outline-none text-[12px] text-zinc-900 dark:text-white p-0 flex-1"
                                                                        />
                                                                    ) : (
                                                                        <span
                                                                            onClick={() => startEditing(ann, `${t('image_ref')}`)}
                                                                            className={`flex-1 truncate cursor-text ${!ann.text ? 'text-zinc-400 italic' : ''}`}
                                                                        >
                                                                            {displayText}
                                                                        </span>
                                                                    )}

                                                                    {!isEditing && (
                                                                        <div className="flex items-center gap-1">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
                                                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all opacity-0 group-hover/chip-container:opacity-100"
                                                                            >
                                                                                <X className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* ANNOTATIONS SECTION (Non-Reference) */}
                                        {annotations.filter(a => a.type !== 'reference_image').length > 0 && (
                                            <div className="flex flex-col gap-2 group/ann">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] tracking-tight text-zinc-400 dark:text-zinc-500 uppercase font-sans font-medium">
                                                        {t('annotations')}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1.5 pb-2">
                                                    {annotations.filter(a => a.type !== 'reference_image').map((ann) => {
                                                        const displayText = ann.text || t('untitled');
                                                        const isEditing = editingId === ann.id;

                                                        return (
                                                            <div key={ann.id} className="relative group/chip-container">
                                                                <div
                                                                    className={`
                                                                        flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] transition-all w-full
                                                                        ${isEditing ? 'bg-white dark:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-zinc-700' : 'bg-zinc-100/50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/80'}
                                                                    `}
                                                                >
                                                                    {ann.referenceImage ? (
                                                                        <div className="shrink-0 w-6 h-6 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700 relative">
                                                                            <img src={ann.referenceImage} className="w-full h-full object-cover" alt="ref" />
                                                                            <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
                                                                                <Camera className="w-3 h-3 text-white drop-shadow-sm" />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="shrink-0 flex items-center justify-center text-zinc-400">
                                                                            {ann.type === 'stamp' ? (
                                                                                <span className="text-sm leading-none">{ann.emoji || '🏷️'}</span>
                                                                            ) : ann.type === 'shape' ? (
                                                                                ann.shapeType === 'circle' ? <Circle className="w-4 h-4" /> :
                                                                                    ann.shapeType === 'line' ? <Minus className="w-4 h-4" /> :
                                                                                        <Square className="w-4 h-4" />
                                                                            ) : (
                                                                                <Pen className="w-4 h-4" />
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {isEditing ? (
                                                                        <input
                                                                            autoFocus
                                                                            value={editValue}
                                                                            onChange={(e) => setEditValue(e.target.value)}
                                                                            onBlur={saveEditing}
                                                                            onKeyDown={handleKeyDown}
                                                                            className="bg-transparent border-none outline-none text-[12px] text-zinc-900 dark:text-white p-0 flex-1"
                                                                        />
                                                                    ) : (
                                                                        <span
                                                                            onClick={() => startEditing(ann, '')}
                                                                            className={`flex-1 truncate cursor-text ${!ann.text ? 'text-zinc-400 italic' : ''}`}
                                                                        >
                                                                            {displayText}
                                                                        </span>
                                                                    )}

                                                                    {!isEditing && (
                                                                        <div className="flex items-center gap-1">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); triggerAnnFile(ann.id); }}
                                                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all opacity-0 group-hover/chip-container:opacity-100"
                                                                            >
                                                                                <Camera className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
                                                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all opacity-0 group-hover/chip-container:opacity-100"
                                                                            >
                                                                                <X className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
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
                                        tooltip={isMulti ? t('tool_disabled_multi') : t('annotate') || 'Annotate'}
                                    >
                                        {t('annotate') || 'Annotate'}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={selectedImage.isGenerating}
                                        icon={<Camera className="w-3.5 h-3.5 text-orange-500" />}
                                        className="w-full !normal-case !font-normal !tracking-normal !text-xs"
                                        tooltip={t('upload_ref')}
                                    >
                                        {currentLang === 'de' ? 'Referenzbild' : 'Reference Image'}
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
                                            disabled={selectedImage.isGenerating}
                                            className={`
                                                relative flex-1 flex items-center justify-center py-3 rounded-lg transition-all shadow-sm
                                                ${selectedImage.isGenerating
                                                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
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
                                                    <Tooltip text={t('tt_model')} side="top">
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
                                                            <MoreVertical className="w-4 h-4" />
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
                        </div>
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


                </div>
            </div>

            {/* PRESET LIBRARY - At the absolute bottom of the side sheet, full width */}
            {(activeInternalTab === 'prompt' || isMulti) && (
                <div className={`mt-auto ${Theme.Colors.PanelBg} w-full border-t border-zinc-100 dark:border-zinc-800/10`}>
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
            )}

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
