
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { CanvasImage, PromptTemplate, AnnotationObject, TranslationFunction, PresetControl } from '../../types';
import { PresetLibrary } from '../PresetLibrary';
import { PresetEditorModal } from '../PresetEditorModal';
import { Pen, Armchair, Paperclip, X, Copy } from 'lucide-react';
import { Button, SectionHeader, Theme, Typo, IconButton } from '../ui/DesignSystem';

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
    onAddReference: (file: File) => void;
    annotations: AnnotationObject[];
    onDeleteAnnotation: (id: string) => void;
    onUpdateAnnotation: (id: string, patch: Partial<AnnotationObject>) => void;
    onTogglePin?: (id: string) => void;
    onDeleteTemplate?: (id: string) => void;
    onCreateTemplate?: (t: Omit<PromptTemplate, 'id' | 'isPinned' | 'usageCount' | 'isCustom' | 'lastUsed'>) => void;
    onUpdateTemplate?: (id: string, updates: Partial<PromptTemplate>) => void;
    t: TranslationFunction;
    currentLang: 'de' | 'en';
}

export const PromptTab: React.FC<PromptTabProps> = ({
    prompt, setPrompt, selectedImage, selectedImages, onGenerate, onDeselect, templates, onSelectTemplate,
    onAddBrush, onAddObject, onAddReference, annotations, onDeleteAnnotation,
    onUpdateAnnotation, onTogglePin, onDeleteTemplate, onCreateTemplate, onUpdateTemplate, t, currentLang
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const [activeTemplate, setActiveTemplate] = useState<PromptTemplate | null>(null);
    const [controlValues, setControlValues] = useState<Record<string, string>>({});

    const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
    const [presetModalMode, setPresetModalMode] = useState<'create' | 'edit'>('create');
    const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    const isMulti = selectedImages && selectedImages.length > 1;

    useLayoutEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = `${Math.max(textAreaRef.current.scrollHeight, 120)}px`;
        }
    }, [prompt, activeTemplate]);

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
        setPrompt('');
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
        <div className="h-full relative overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-right-2 duration-300">

            <div className="min-h-full flex flex-col">

                <div className="flex-1 flex flex-col gap-6 px-6 pt-10 pb-6">

                    <div className="flex flex-col gap-1.5">
                        {/* Generation Prompt History */}
                        {selectedImage.generationPrompt && (
                            <div className="group relative mb-4">
                                <div className={`relative group/tooltip flex items-start justify-between gap-2 p-3 rounded-lg ${Theme.Colors.SurfaceSubtle}`}>
                                    <p
                                        className={`${Typo.Body} font-mono text-zinc-500 dark:text-zinc-600 text-xs line-clamp-2 select-none`}
                                    >
                                        "{selectedImage.generationPrompt}"
                                    </p>

                                    <IconButton
                                        icon={<Copy className="w-3 h-3" />}
                                        onClick={() => navigator.clipboard.writeText(selectedImage.generationPrompt || '')}
                                        tooltip={t('copy')}
                                        className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    />

                                    {/* Tooltip on hover (simple version) */}
                                    {selectedImage.generationPrompt.length > 60 && (
                                        <div className="absolute left-0 bottom-full mb-2 w-64 p-3 rounded-lg bg-zinc-900 text-white text-xs z-50 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all shadow-xl pointer-events-none">
                                            {selectedImage.generationPrompt}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center min-h-[24px]">
                            <span className={Typo.Label}>{t('prompt_label')}</span>
                        </div>

                        <div className={`relative flex flex-col ${Theme.Colors.PanelBg} ${Theme.Colors.Border} border ${Theme.Geometry.Radius} focus-within:border-zinc-400 dark:focus-within:border-zinc-500 transition-colors overflow-hidden`}>
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
                                            <div className="flex items-center justify-between px-3 py-2">
                                                <span className={`${Typo.Mono} text-[10px] tracking-wider text-zinc-400 dark:text-zinc-500`}>
                                                    {ctrl.label}
                                                </span>
                                                {/* Only show Reset/Close button in the first row */}
                                                {idx === 0 && (
                                                    <IconButton
                                                        icon={<X className="w-3.5 h-3.5" />}
                                                        onClick={handleReset}
                                                        tooltip={t('reset_tooltip')}
                                                        className="!h-6 !w-6 hover:bg-zinc-200 dark:hover:bg-zinc-700"
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

                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center min-h-[24px]">
                            <span className={Typo.Label}>{t('context_label')}</span>
                        </div>

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

                                            <button
                                                onClick={() => onDeleteAnnotation(ann.id)}
                                                className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
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

                <div className={`mt-auto border-t ${Theme.Colors.Border} ${Theme.Colors.PanelBg} w-full`}>
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
        </div>
    );
};
