import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { CanvasImage, PromptTemplate, AnnotationObject, TranslationFunction, PresetControl, GenerationQuality } from '@/types';
import { PresetLibrary } from '@/components/library/PresetLibrary';
import { PresetEditorModal } from '@/components/modals/PresetEditorModal';
import { Pen, Camera, X, Copy, ArrowLeft, Plus, RotateCcw, Eye, ChevronDown, Check, Settings2, Square, Circle, Minus, Type } from 'lucide-react';
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
        if (selectedImage.isGenerating) {
            setActiveInternalTab('info');
        }

        if (lastIdRef.current !== selectedImage.id) {
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
            const newHeight = Math.max(textAreaRef.current.scrollHeight, 100);
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
            if (editValue.trim() !== undefined) updates.text = editValue;
            if (editEmojiValue.trim()) updates.emoji = editEmojiValue;

            onUpdateAnnotation(editingId, updates);
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
        setHiddenControlIds([]);

        if (t.controls && t.controls.length > 0) {
            setActiveTemplate(t);
            setControlValues({});
            onUpdateVariables(selectedImage.id, t.id, {});
        } else {
            setActiveTemplate(null);
            setControlValues({});
            onUpdateVariables(selectedImage.id, undefined, {});
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
                        appendedParts.push(`${c.label}: ${vals.join(", ")}`);
                    } else {
                        appendedParts.push(...vals);
                    }
                }
            });
            if (appendedParts.length > 0) {
                if (final) {
                    const needsComma = !final.endsWith(',') && !final.endsWith(':');
                    final += (needsComma ? ", " : " ") + appendedParts.join(", ");
                } else {
                    final = appendedParts.join(", ");
                }
            }
        }
        return final;
    };

    const handleDoGenerate = () => {
        onGenerate(getFinalPrompt());
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

    const AnnotationChip: React.FC<{ ann: AnnotationObject }> = ({ ann }) => {
        const isRefType = ann.type === 'reference_image';
        const refIndex = annotations.filter(a => a.type === 'reference_image').indexOf(ann);
        const defaultLabel = isRefType ? `${t('image_ref') || 'Ref'} ${refIndex + 1}` : '';
        const displayText = ann.text || defaultLabel || t('untitled') || 'Untitled';
        const isEditing = editingId === ann.id;

        return (
            <div
                className={`
                    group/chip flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] transition-all
                    ${isEditing
                        ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100'
                        : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}
                `}
            >
                <div className="shrink-0 flex items-center justify-center text-zinc-400">
                    {isRefType && ann.referenceImage ? (
                        <div className="w-3.5 h-3.5 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700">
                            <img src={ann.referenceImage} className="w-full h-full object-cover" alt="ref" />
                        </div>
                    ) : (
                        ann.type === 'stamp' ? <Type className="w-3 h-3" /> :
                            ann.type === 'shape' ? (
                                ann.shapeType === 'circle' ? <Circle className="w-3 h-3" /> :
                                    ann.shapeType === 'line' ? <Minus className="w-3 h-3" /> :
                                        <Square className="w-3 h-3" />
                            ) : <Pen className="w-3 h-3" />
                    )}
                </div>

                <div className="flex-1 min-w-0 max-w-[100px]">
                    {isEditing ? (
                        <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEditing}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-transparent border-none outline-none p-0 text-black dark:text-white"
                        />
                    ) : (
                        <span
                            onClick={(e) => { e.stopPropagation(); startEditing(ann, defaultLabel); }}
                            className={`truncate cursor-text ${!ann.text && !defaultLabel ? 'italic opacity-60' : ''}`}
                        >
                            {displayText}
                        </span>
                    )}
                </div>

                {!isEditing && (
                    <div className="flex items-center gap-1 px-1 opacity-0 group-hover/chip:opacity-100 transition-opacity">
                        {!isRefType && (
                            <button
                                onClick={(e) => { e.stopPropagation(); triggerAnnFile(ann.id); }}
                                className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-orange-500 transition-colors"
                            >
                                <Camera className="w-3 h-3" />
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
                            className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full relative flex flex-col overflow-hidden">
            {!isMulti && (
                <div className={`flex border-b ${Theme.Colors.Border} shrink-0 ${Theme.Colors.PanelBg} relative`}>
                    <button onClick={() => setActiveInternalTab('prompt')} className={`flex-1 py-3 ${Typo.Label} transition-colors relative ${activeInternalTab === 'prompt' ? Theme.Colors.TextPrimary : 'text-zinc-400 hover:text-zinc-600'}`}>{t('tab_edit')}</button>
                    <button onClick={() => setActiveInternalTab('info')} className={`flex-1 py-3 ${Typo.Label} transition-colors relative ${activeInternalTab === 'info' ? Theme.Colors.TextPrimary : 'text-zinc-400 hover:text-zinc-600'}`}>{t('tab_info') || 'Info'}</button>
                    <div className="absolute bottom-[-1px] h-[2px] bg-zinc-800 dark:bg-zinc-200 transition-all duration-300" style={{ width: '50%', left: activeInternalTab === 'prompt' ? '0%' : '50%' }} />
                </div>
            )}

            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="min-h-full flex flex-col px-6 py-8">
                    {activeInternalTab === 'prompt' || isMulti ? (
                        <>
                            {/* Unified Modular Input Box */}
                            <div className={`
                                flex flex-col mb-8 ${Theme.Colors.PanelBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} shadow-sm 
                                transition-all focus-within:ring-2 focus-within:ring-zinc-500/10 focus-within:border-zinc-400 dark:focus-within:border-zinc-500
                            `}>
                                <textarea
                                    ref={textAreaRef}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={t('describe_changes')}
                                    className={`w-full bg-transparent border-none outline-none p-4 ${Typo.Body} leading-relaxed resize-none min-h-[100px]`}
                                    disabled={selectedImage.isGenerating}
                                />

                                {(annotations.length > 0 || (activeTemplate && Object.keys(controlValues).length > 0)) && (
                                    <div className="px-4 pb-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                        {/* Variable Chips */}
                                        {activeTemplate && activeTemplate.controls && activeTemplate.controls.map(ctrl => {
                                            const selectedOpts = controlValues[ctrl.id];
                                            if (!selectedOpts || selectedOpts.length === 0 || hiddenControlIds.includes(ctrl.id)) return null;
                                            return selectedOpts.map(val => (
                                                <div
                                                    key={`${ctrl.id}-${val}`}
                                                    className="group/var flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-[10px] font-mono transition-all"
                                                >
                                                    <span className="opacity-60">{ctrl.label}:</span>
                                                    <span>{val}</span>
                                                    <button
                                                        onClick={() => handleToggleControlOption(ctrl.id, val)}
                                                        className="opacity-0 group-hover/var:opacity-100 transition-opacity ml-0.5"
                                                    >
                                                        <X className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            ));
                                        })}

                                        {/* Annotation Chips */}
                                        {!isMulti && annotations.map((ann) => (
                                            <AnnotationChip key={ann.id} ann={ann} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Options Area (Inactive items from preset) */}
                            {activeTemplate && activeTemplate.controls && activeTemplate.controls.length > 0 && (
                                <div className="flex flex-col gap-6 mb-8">
                                    {activeTemplate.controls
                                        .filter(c => !hiddenControlIds.includes(c.id))
                                        .map((ctrl) => (
                                            <div key={ctrl.id} className="flex flex-col gap-2.5">
                                                <div className="flex items-center justify-between">
                                                    <span className={`${Typo.Label} opacity-40`}>{ctrl.label}</span>
                                                    <IconButton icon={<X className="w-3 h-3" />} onClick={() => handleClearControl(ctrl.id)} className="h-6 w-6 opacity-30 hover:opacity-100" />
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {ctrl.options.map((opt) => {
                                                        const isSelected = (controlValues[ctrl.id] || []).includes(opt.value);
                                                        return (
                                                            <button
                                                                key={opt.id}
                                                                onClick={() => handleToggleControlOption(ctrl.id, opt.value)}
                                                                className={`
                                                                    px-3 py-1.5 rounded-full text-[10px] font-medium transition-all font-mono
                                                                    ${isSelected
                                                                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black'
                                                                        : 'bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-500 hover:text-black dark:hover:text-white border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'}
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

                            {/* Interaction Tools */}
                            <div className="flex items-center justify-center gap-6 mb-6">
                                <button onClick={onAddBrush} disabled={selectedImage.isGenerating || isMulti} className="flex items-center gap-2 text-zinc-500 hover:text-black dark:hover:text-white transition-colors disabled:opacity-30">
                                    <Pen className="w-4 h-4" />
                                    <span className={Typo.ButtonLabel}>{t('annotate') || 'Annotate'}</span>
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} disabled={selectedImage.isGenerating} className="flex items-center gap-2 text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                                    <Camera className="w-4 h-4" />
                                    <span className={Typo.ButtonLabel}>{currentLang === 'de' ? 'Referenz' : 'Reference'}</span>
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>

                            {/* Generate Button Wrapper */}
                            <div className="mb-8 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border ${Theme.Colors.Border}">
                                <div className="relative">
                                    <button
                                        onClick={handleDoGenerate}
                                        disabled={selectedImage.isGenerating}
                                        className={`
                                            w-full flex items-center justify-center py-4 rounded-lg transition-all shadow-md
                                            ${selectedImage.isGenerating
                                                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                                                : 'bg-black dark:bg-white text-white dark:text-black hover:scale-[1.01] active:scale-[0.99]'}
                                        `}
                                    >
                                        <span className={`${Typo.Label} tracking-[0.15em]`}>
                                            {selectedImage.isGenerating ? t('processing') : (isMulti ? `${t('generate_multi')} (${selectedImages.length})` : t('generate'))}
                                        </span>
                                    </button>

                                    {!selectedImage.isGenerating && (
                                        <div className="absolute right-2 top-2 bottom-2 aspect-square">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsModelDropdownOpen(!isModelDropdownOpen); }}
                                                className="w-full h-full flex items-center justify-center rounded-md hover:bg-white/10 dark:hover:bg-black/5 text-white/50 dark:text-black/50 hover:text-white dark:hover:text-black transition-all"
                                            >
                                                <Settings2 className="w-4 h-4" />
                                            </button>

                                            {isModelDropdownOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-30" onClick={() => setIsModelDropdownOpen(false)} />
                                                    <div className="absolute bottom-full right-0 mb-4 w-72 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4">
                                                        {MODES.map((m) => (
                                                            <button
                                                                key={m.id}
                                                                onClick={() => { onQualityModeChange(m.id); setIsModelDropdownOpen(false); }}
                                                                className={`
                                                                    w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all
                                                                    ${qualityMode === m.id ? 'bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-zinc-700' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
                                                                `}
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className={`${Typo.Body} font-semibold ${qualityMode === m.id ? 'text-black dark:text-white' : 'text-zinc-500'}`}>{m.label}</span>
                                                                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest mt-0.5">{m.price} • {m.desc}</span>
                                                                </div>
                                                                {qualityMode === m.id && <Check className="w-4 h-4" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isMulti && (
                                <button onClick={onDeselect} className="w-full py-3 text-zinc-400 hover:text-black dark:hover:text-white transition-colors font-medium text-xs">
                                    {t('ctx_deselect')}
                                </button>
                            )}

                            <div className="mt-12 opacity-80 border-t border-zinc-100 dark:border-zinc-800 pt-8">
                                <input type="file" ref={annFileInputRef} className="hidden" accept="image/*" onChange={handleAnnFileChange} />
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
                        </>
                    ) : (
                        /* Info Tab Content */
                        <div className="flex-1 flex flex-col gap-10">
                            {selectedImage.generationPrompt && (
                                <div className="group flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className={Typo.Label}>Prompt</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(selectedImage.generationPrompt || '');
                                                showToast(t('copied_to_clipboard') || 'Copied', 'success');
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <p className="font-mono text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                                        {selectedImage.generationPrompt}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                                <div className="flex flex-col gap-2">
                                    <span className={Typo.Label}>{t('resolution')}</span>
                                    <span className={Typo.Mono}>{selectedImage.realWidth && selectedImage.realHeight ? `${selectedImage.realWidth} × ${selectedImage.realHeight}` : '1024 × 1024'}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <span className={Typo.Label}>{t('created_at')}</span>
                                    <span className={Typo.Mono}>{selectedImage.createdAt ? new Date(selectedImage.createdAt).toLocaleDateString(currentLang, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <span className={Typo.Label}>{t('model')}</span>
                                    <span className={Typo.Body}>{selectedImage.quality || 'Standard'}</span>
                                </div>
                            </div>

                            {selectedImage.annotations?.some(ann => ann.referenceImage) && (
                                <div className="flex flex-col gap-4 pt-4">
                                    <span className={Typo.Label}>{t('reference_images')}</span>
                                    <div className="grid grid-cols-4 gap-3">
                                        {selectedImage.annotations.filter(ann => ann.referenceImage).map((ann, idx) => (
                                            <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 grayscale hover:grayscale-0 transition-all duration-500 scale-95 hover:scale-100">
                                                <img src={ann.referenceImage} className="w-full h-full object-cover" alt="Ref" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 mt-4">
                                <Button variant="secondary" onClick={() => onGenerateMore(selectedImage.id)} className="h-14 font-bold border-none bg-zinc-100 dark:bg-zinc-800">
                                    <RotateCcw className="w-4 h-4" />
                                    {t('ctx_create_variations')}
                                </Button>
                                {selectedImage.parentId && (
                                    <Button variant="ghost" onClick={() => onNavigateParent(selectedImage.parentId!)}>
                                        <ArrowLeft className="w-4 h-4" />
                                        {currentLang === 'de' ? 'Original anzeigen' : 'View Original'}
                                    </Button>
                                )}
                            </div>
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

            <DebugModal
                isOpen={isDebugOpen}
                onClose={() => setIsDebugOpen(false)}
                image={selectedImage}
                prompt={getFinalPrompt()}
                t={t}
            />
        </div>
    );
};
