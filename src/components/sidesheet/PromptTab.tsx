
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { CanvasImage, PromptTemplate, AnnotationObject, TranslationFunction, PresetControl, GenerationQuality } from '@/types';
import { PresetLibrary } from '@/components/library/PresetLibrary';
import { PresetEditorModal } from '@/components/modals/PresetEditorModal';
import { Pen, Armchair, Paperclip, X, Copy, ArrowLeft, Plus, RotateCcw, Eye, ChevronDown, Check } from 'lucide-react';
import { Button, SectionHeader, Theme, Typo, IconButton } from '@/components/ui/DesignSystem';
import { useToast } from '@/components/ui/Toast';

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
}

export const PromptTab: React.FC<PromptTabProps> = ({
    prompt, setPrompt, selectedImage, selectedImages, onGenerate, onDeselect, templates, onSelectTemplate,
    onAddBrush, onAddObject, onAddReference, annotations, onDeleteAnnotation,
    onUpdateAnnotation, onTogglePin, onDeleteTemplate, onCreateTemplate, onUpdateTemplate,
    onGenerateMore, onNavigateParent, qualityMode, onQualityModeChange, t, currentLang
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const { showToast } = useToast();

    const [activeTemplate, setActiveTemplate] = useState<PromptTemplate | null>(null);
    const [controlValues, setControlValues] = useState<Record<string, string>>({});

    const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
    const [presetModalMode, setPresetModalMode] = useState<'create' | 'edit'>('create');
    const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
    const [activeInternalTab, setActiveInternalTab] = useState<'prompt' | 'info'>('prompt');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const annFileInputRef = useRef<HTMLInputElement>(null);
    const targetAnnIdRef = useRef<string | null>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

    const MODES: { id: GenerationQuality, label: string, desc: string, price: string }[] = [
        { id: 'fast', label: 'Nano Banana', desc: '1024 px', price: t('price_free') },
        { id: 'pro-1k', label: 'Nano Banana Pro 1K', desc: '1024 px', price: '0.10 €' },
        { id: 'pro-2k', label: 'Nano Banana Pro 2K', desc: '2048 px', price: '0.25 €' },
        { id: 'pro-4k', label: 'Nano Banana Pro 4K', desc: '4096 px', price: '0.50 €' },
    ];

    const currentModel = MODES.find(m => m.id === qualityMode) || MODES[0];

    const isMulti = selectedImages && selectedImages.length > 1;

    useEffect(() => {
        if (selectedImage.isGenerating) {
            setActiveInternalTab('info');
        }
    }, [selectedImage.id, selectedImage.isGenerating]);

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
    };

    const saveEditing = () => {
        if (editingId) {
            if (editValue.trim()) {
                onUpdateAnnotation(editingId, { text: editValue });
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

        if (t.controls && t.controls.length > 0) {
            setActiveTemplate(t);
            setControlValues({});
        } else {
            setActiveTemplate(null);
            setControlValues({});
        }
    };

    const handleToggleControlOption = (controlId: string, value: string) => {
        setControlValues(prev => {
            const current = prev[controlId];
            if (current === value) {
                const newState = { ...prev };
                delete newState[controlId];
                return newState;
            }
            return { ...prev, [controlId]: value };
        });
    };

    const handleReset = () => {
        // setPrompt(''); 
        setActiveTemplate(null);
        setControlValues({});
    };

    const handleDoGenerate = () => {
        let finalPrompt = prompt;
        if (activeTemplate && activeTemplate.controls) {
            const appendedParts: string[] = [];
            activeTemplate.controls.forEach(c => {
                const val = controlValues[c.id];
                if (val) appendedParts.push(val);
            });
            if (appendedParts.length > 0) {
                finalPrompt += " " + appendedParts.join(", ");
            }
        }
        onGenerate(finalPrompt);
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
        <div className="h-full relative flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-2 duration-300">
            {/* Tab Header - Only show if not multiple selection (Info tab only makes sense for single image) */}
            {!isMulti && (
                <div className={`flex border-b ${Theme.Colors.Border} shrink-0 ${Theme.Colors.PanelBg}`}>
                    <button
                        onClick={() => setActiveInternalTab('prompt')}
                        className={`flex-1 py-3 ${Typo.Label} transition-colors relative ${activeInternalTab === 'prompt' ? Theme.Colors.TextPrimary : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
                    >
                        {t('tab_edit')}
                        {activeInternalTab === 'prompt' && (
                            <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-zinc-800 dark:bg-zinc-200" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveInternalTab('info')}
                        className={`flex-1 py-3 ${Typo.Label} transition-colors relative ${activeInternalTab === 'info' ? Theme.Colors.TextPrimary : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
                    >
                        {currentLang === 'de' ? 'Info' : 'Info'}
                        {activeInternalTab === 'info' && (
                            <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-zinc-800 dark:bg-zinc-200" />
                        )}
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="min-h-full flex flex-col">
                    {activeInternalTab === 'prompt' || isMulti ? (
                        <div className="flex-1 flex flex-col gap-6 px-6 pt-8 pb-6">
                            <div className="flex flex-col gap-1.5">
                                <div className={`relative flex flex-col ${Theme.Colors.PanelBg} ${Theme.Colors.Border} border ${Theme.Geometry.Radius} hover:border-zinc-300 dark:hover:border-zinc-600 focus-within:!border-zinc-400 dark:focus-within:!border-zinc-500 transition-colors overflow-hidden`}>
                                    <textarea
                                        ref={textAreaRef}
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder={t('describe_changes')}
                                        className={`w-full bg-transparent border-none outline-none p-4 ${Typo.Body} font-mono leading-relaxed resize-none min-h-[120px] overflow-hidden`}
                                        disabled={selectedImage.isGenerating}
                                    />

                                    {/* Active Variables Section */}
                                    {activeTemplate && activeTemplate.controls && activeTemplate.controls.length > 0 && (
                                        <div className={`flex flex-col border-t ${Theme.Colors.BorderSubtle} bg-zinc-50 dark:bg-zinc-900/50`}>
                                            {activeTemplate.controls.map((ctrl, idx) => (
                                                <div key={ctrl.id} className={`${idx > 0 ? `border-t ${Theme.Colors.BorderSubtle}` : ''}`}>
                                                    <div className="flex items-center justify-between px-3 py-2 min-h-[40px]">
                                                        <span className={`${Typo.Mono} text-[10px] tracking-wider text-zinc-400 dark:text-zinc-500`}>
                                                            {ctrl.label}
                                                        </span>
                                                        {idx === 0 && (
                                                            <IconButton
                                                                icon={<X className="w-3.5 h-3.5" />}
                                                                onClick={handleReset}
                                                                tooltip="Variablen entfernen"
                                                                className="hover:bg-zinc-200 dark:hover:bg-zinc-700 -mr-1"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                                                        {ctrl.options.map((opt) => {
                                                            const isSelected = controlValues[ctrl.id] === opt.value;
                                                            return (
                                                                <button
                                                                    key={opt.id}
                                                                    onClick={() => handleToggleControlOption(ctrl.id, opt.value)}
                                                                    className={`
                                                                        px-2.5 py-1 rounded-md text-[10px] font-medium transition-all font-mono shadow-sm
                                                                        ${isSelected
                                                                            ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 border text-black dark:text-white'
                                                                            : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-black dark:hover:text-white'}
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
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        variant="secondary"
                                        onClick={onAddBrush}
                                        disabled={selectedImage.isGenerating || isMulti}
                                        icon={<Pen className={`w-3.5 h-3.5 ${isMulti ? 'text-zinc-400' : 'text-blue-500 dark:text-blue-400'}`} />}
                                        className="px-2"
                                        tooltip={isMulti ? t('tool_disabled_multi') : t('mask_btn')}
                                    >
                                        {t('mask_btn')}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={onAddObject}
                                        disabled={selectedImage.isGenerating || isMulti}
                                        icon={<Armchair className={`w-3.5 h-3.5 ${isMulti ? 'text-zinc-400' : 'text-purple-500 dark:text-purple-400'}`} />}
                                        className="px-2"
                                        tooltip={isMulti ? t('tool_disabled_multi') : t('object_btn')}
                                    >
                                        {t('object_btn')}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={selectedImage.isGenerating}
                                        icon={<Paperclip className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />}
                                        className="px-2"
                                        tooltip={t('upload_ref')}
                                    >
                                        {t('image_btn')}
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>

                                {/* Model Selection Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                        className={`
                                            flex items-center gap-1.5 py-1 px-2.5 ${Theme.Geometry.Radius} transition-all text-left
                                            hover:bg-zinc-100 dark:hover:bg-zinc-800 group
                                        `}
                                    >
                                        <span className={`${Typo.Body} font-medium text-zinc-400 dark:text-zinc-500 truncate`}>
                                            {currentModel.label}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isModelDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsModelDropdownOpen(false)} />
                                            <div className={`absolute top-full left-0 right-0 mt-2 p-1.5 ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} shadow-xl flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200 z-50`}>
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

                                {annotations.length > 0 && !isMulti && (
                                    <div className="flex flex-col gap-2 pt-1">
                                        {annotations.map((ann) => {
                                            const isRefType = ann.type === 'reference_image';
                                            const refIndex = annotations.filter(a => a.type === 'reference_image').indexOf(ann);
                                            const defaultLabel = isRefType ? `${t('image_ref')} ${refIndex + 1}` : '';
                                            const displayText = ann.text || defaultLabel || t('untitled');
                                            const isEditing = editingId === ann.id;

                                            return (
                                                <div
                                                    key={ann.id}
                                                    className={`
                                                    group relative flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all
                                                    ${isEditing ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}
                                                `}
                                                >
                                                    {isRefType && ann.referenceImage && (
                                                        <div className="shrink-0 w-8 h-8 rounded overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                                            <img src={ann.referenceImage} className="w-full h-full object-cover" alt="ref" />
                                                        </div>
                                                    )}

                                                    {!isRefType && (
                                                        <div className={`shrink-0 flex items-center justify-center text-zinc-500 dark:text-zinc-400`}>
                                                            {ann.type === 'stamp' ? <Armchair className="w-4 h-4 text-purple-500 dark:text-purple-400" /> : <Pen className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
                                                        </div>
                                                    )}

                                                    <div className="flex-1 min-w-0 flex items-center h-8">
                                                        {isEditing ? (
                                                            <input
                                                                autoFocus
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                onBlur={saveEditing}
                                                                onKeyDown={handleKeyDown}
                                                                className={`w-full bg-transparent border-none outline-none ${Typo.Body} text-black dark:text-white placeholder-zinc-400`}
                                                                placeholder={isRefType ? t('describe_style') : t('what_is_this')}
                                                            />
                                                        ) : (
                                                            <span
                                                                onClick={() => startEditing(ann, defaultLabel)}
                                                                className={`
                                                                ${Typo.Body} truncate cursor-text w-full block
                                                                ${!ann.text && !defaultLabel ? 'text-zinc-400 italic' : Theme.Colors.TextPrimary}
                                                                `}
                                                            >
                                                                {displayText}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {!isRefType && (
                                                            <button
                                                                onClick={() => triggerAnnFile(ann.id)}
                                                                className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-orange-500 dark:text-zinc-500 dark:hover:text-orange-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                                                                title={t('upload_ref')}
                                                            >
                                                                <Paperclip className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => onDeleteAnnotation(ann.id)}
                                                            className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div>
                                {isMulti && (
                                    <Button
                                        variant="secondary"
                                        onClick={onDeselect}
                                        className="w-full mb-4"
                                    >
                                        {t('ctx_deselect')}
                                    </Button>
                                )}

                                <Button
                                    onClick={handleDoGenerate}
                                    disabled={selectedImage.isGenerating}
                                    className="w-full"
                                    tooltip="Run Generation"
                                >
                                    {selectedImage.isGenerating
                                        ? t('processing')
                                        : isMulti && selectedImages
                                            ? `${t('generate_multi')} (${selectedImages.length})`
                                            : t('generate')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* Info Tab Content */
                        <div className="flex-1 flex flex-col gap-8 px-6 pt-8 pb-6 animate-in fade-in slide-in-from-left-2 duration-300">
                            {/* Prompt Section */}
                            {selectedImage.generationPrompt && (
                                <div className="flex flex-col gap-2 group relative">
                                    <span className={`${Typo.Body} text-zinc-400 text-xs`}>
                                        Prompt
                                    </span>
                                    <p className={`font-mono text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed pr-10`}>
                                        "{selectedImage.generationPrompt}"
                                    </p>
                                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            )}

                            {/* Metadata Grid (No border, 2 columns) - Hide while generating placeholder */}
                            {!selectedImage.isGenerating && (
                                <div className="grid grid-cols-2 gap-x-8 gap-y-6 animate-in fade-in duration-500">
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
                                                    // 1. Prefer exact API-reported model version
                                                    if (selectedImage.modelVersion) return selectedImage.modelVersion;

                                                    // 2. Fallback to mapped friendly names based on requested quality
                                                    const q = selectedImage.quality;
                                                    switch (q) {
                                                        case 'pro-4k': return 'Nano Banana Pro 4K';
                                                        case 'pro-2k': return 'Nano Banana Pro 2K';
                                                        case 'pro-1k': return 'Nano Banana Pro 1K';
                                                        case 'fast': default: return 'Nano Banana';
                                                    }
                                                })()}
                                            </span>
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
                                {selectedImage.parentId && (
                                    <Button
                                        variant="secondary"
                                        onClick={async () => {
                                            const { storageService } = await import('@/services/storageService');
                                            const { supabase } = await import('@/services/supabaseClient');
                                            const { data: { user } } = await supabase.auth.getUser();
                                            if (user) {
                                                const maskUrl = await storageService.getSignedUrl(`${user.id}/${selectedImage.id}_mask.png`);
                                                if (maskUrl) {
                                                    window.open(maskUrl, '_blank');
                                                } else {
                                                    showToast(t('no_mask_found'), 'error');
                                                }
                                            }
                                        }}
                                        disabled={selectedImage.isGenerating}
                                        className="justify-start px-4 h-11 gap-2 border-dashed opacity-60 hover:opacity-100"
                                    >
                                        <Eye className="w-4 h-4 text-zinc-400" />
                                        <span className={`${Typo.Label} uppercase tracking-wider text-zinc-600 dark:text-zinc-300`}>
                                            {t('debug_mask')}
                                        </span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Preset Library - Now part of the main scroll flow */}
                    {(activeInternalTab === 'prompt' || isMulti) && (
                        <div className={`mt-auto border-t ${Theme.Colors.Border} ${Theme.Colors.PanelBg} w-full pt-2`}>
                            <input
                                type="file"
                                ref={annFileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleAnnFileChange}
                            />
                            <PresetLibrary
                                templates={templates}
                                onSelect={handleSelectPreset}
                                onTogglePin={onTogglePin || (() => { })}
                                onRequestCreate={openCreatePreset}
                                onRequestEdit={openEditPreset}
                                t={t}
                                currentLang={currentLang}
                            />
                        </div>
                    )}
                </div>
            </div>



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
        </div >
    );
};
