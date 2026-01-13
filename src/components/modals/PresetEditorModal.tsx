import React, { useState, useEffect } from 'react';
import { PromptTemplate, PresetControl, TranslationFunction } from '@/types';
import { IconButton, Button, Input, TextArea, Theme, Typo } from '@/components/ui/DesignSystem';
import { Plus, Trash, Check, X, Pencil } from 'lucide-react';
import { generateId } from '@/utils/ids';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';

interface PresetEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    scope: 'admin' | 'user';
    currentLang?: 'de' | 'en';
    initialTemplate?: PromptTemplate | null;
    existingTemplates?: PromptTemplate[]; // Kept for interface compatibility
    onSave: (templates: { title: string; prompt: string; tags: string[]; controls: PresetControl[]; lang: 'de' | 'en' }[]) => void;
    onDelete?: (id: string) => void;
    t: TranslationFunction;
}

const LanguageForm = ({
    lang,
    title, setTitle,
    prompt, setPrompt,
    controls, setControls,
    showHeader,
    t
}: {
    lang: 'de' | 'en';
    title: string; setTitle: (s: string) => void;
    prompt: string; setPrompt: (s: string) => void;
    controls: PresetControl[]; setControls: React.Dispatch<React.SetStateAction<PresetControl[]>>;
    showHeader: boolean;
    t: TranslationFunction;
}) => {
    const [isAddingControl, setIsAddingControl] = useState(false);
    const [editingControlId, setEditingControlId] = useState<string | null>(null);
    const [newControlLabel, setNewControlLabel] = useState('');
    const [newControlOptions, setNewControlOptions] = useState('');

    const handleSaveControl = () => {
        if (!newControlLabel.trim()) return;
        const opts = newControlOptions.split(',').map(s => s.trim()).filter(s => s);
        const controlData = {
            label: newControlLabel.trim(),
            options: opts.map(o => ({ id: generateId(), label: o, value: o }))
        };

        if (editingControlId) {
            setControls(prev => prev.map(c => c.id === editingControlId ? { ...c, ...controlData } : c));
        } else {
            setControls(prev => [...prev, { id: generateId(), ...controlData }]);
        }

        resetForm();
    };

    const resetForm = () => {
        setIsAddingControl(false);
        setEditingControlId(null);
        setNewControlLabel('');
        setNewControlOptions('');
    };

    const startEditing = (ctrl: PresetControl) => {
        setEditingControlId(ctrl.id);
        setNewControlLabel(ctrl.label);
        setNewControlOptions(ctrl.options.map(o => o.label).join(', '));
        setIsAddingControl(true);
    };

    const handleDeleteControl = (id: string) => {
        setControls(prev => prev.filter(c => c.id !== id));
        if (editingControlId === id) resetForm();
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            {showHeader && (
                <div className={`px-6 py-2 border-b ${Theme.Colors.Border} ${Theme.Colors.SurfaceSubtle} flex justify-between items-center sticky top-0 z-10`}>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{lang === 'de' ? t('version_de') : t('version_en')}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${lang === 'de' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>{lang}</span>
                </div>
            )}

            <div className={`px-6 pb-6 space-y-6 ${!showHeader ? 'pt-2' : 'pt-6'}`}>
                {/* Title */}
                <div className="flex flex-col gap-2">
                    <label className={`${Typo.Label} text-zinc-500 dark:text-zinc-400 uppercase tracking-wider`}>
                        {t('title_label')}
                    </label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('title_placeholder')} />
                </div>

                {/* Prompt */}
                <div className="flex flex-col gap-2">
                    <label className={`${Typo.Label} text-zinc-500 dark:text-zinc-400 uppercase tracking-wider`}>
                        {t('prompt_label_editor')}
                    </label>
                    <TextArea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={t('prompt_placeholder')} className="h-32 font-mono scrollbar-hide" />
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-2">
                    <label className={`${Typo.Label} text-zinc-500 dark:text-zinc-400 uppercase tracking-wider`}>
                        {t('variables_label')}
                    </label>
                    <div className="space-y-3">
                        {controls.map((ctrl) => (
                            <React.Fragment key={ctrl.id}>
                                {editingControlId === ctrl.id ? (
                                    <div className={`p-4 border ${Theme.Colors.Border} ${Theme.Colors.SurfaceSubtle} ${Theme.Geometry.Radius} space-y-4 shadow-sm relative`}>
                                        <div className="flex flex-col gap-1.5">
                                            <label className={`${Typo.Label} text-zinc-500 dark:text-zinc-400 font-black`}>
                                                Titel
                                            </label>
                                            <Input value={newControlLabel} onChange={e => setNewControlLabel(e.target.value)} placeholder={t('var_name_placeholder')} className="py-2.5" autoFocus />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className={`${Typo.Label} text-zinc-500 dark:text-zinc-400 font-black`}>
                                                Optionen
                                            </label>
                                            <Input value={newControlOptions} onChange={e => setNewControlOptions(e.target.value)} placeholder={t('var_options_placeholder')} className="py-2.5" />
                                        </div>
                                        <div className="flex items-center gap-2 pt-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteControl(editingControlId); }}
                                                className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                                title={t('delete')}
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                            <div className="flex-1" />
                                            <Button variant="secondary" onClick={resetForm} className="h-10 px-6">
                                                {t('cancel')}
                                            </Button>
                                            <Button variant="primary" onClick={handleSaveControl} disabled={!newControlLabel} className="h-10 px-8">
                                                {t('save')}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => startEditing(ctrl)}
                                        className={`flex items-start justify-between p-3 border ${Theme.Colors.Border} ${Theme.Colors.SurfaceSubtle} ${Theme.Geometry.Radius} cursor-pointer group transition-all hover:bg-zinc-100 dark:hover:bg-white/5 active:scale-[0.99]`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className={`text-sm font-medium ${Theme.Colors.TextHighlight} mb-1 truncate`}>{ctrl.label}</div>
                                            <div className="flex flex-wrap gap-1">
                                                {ctrl.options.map(o => (
                                                    <span key={o.id} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                                        {o.label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-all p-2 shrink-0">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}

                        {isAddingControl && !editingControlId ? (
                            <div className={`p-4 border ${Theme.Colors.Border} ${Theme.Colors.SurfaceSubtle} ${Theme.Geometry.Radius} space-y-4 shadow-sm relative`}>
                                <div className="flex flex-col gap-1.5">
                                    <label className={`${Typo.Label} text-zinc-500 dark:text-zinc-400 font-black`}>
                                        Titel
                                    </label>
                                    <Input value={newControlLabel} onChange={e => setNewControlLabel(e.target.value)} placeholder={t('var_name_placeholder')} className="py-2.5" autoFocus />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className={`${Typo.Label} text-zinc-500 dark:text-zinc-400 font-black`}>
                                        Optionen
                                    </label>
                                    <Input value={newControlOptions} onChange={e => setNewControlOptions(e.target.value)} placeholder={t('var_options_placeholder')} className="py-2.5" />
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <div className="flex-1" />
                                    <Button variant="secondary" onClick={resetForm} className="h-10 px-6">
                                        {t('cancel')}
                                    </Button>
                                    <Button variant="primary" onClick={handleSaveControl} disabled={!newControlLabel} className="h-10 px-8">
                                        {t('add_btn')}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            !editingControlId && (
                                <button onClick={() => setIsAddingControl(true)} className={`w-full py-2 flex items-center justify-center gap-2 border border-dashed border-zinc-300 dark:border-zinc-700 ${Theme.Geometry.Radius} text-zinc-500 text-xs ${Theme.Colors.SurfaceHover} transition-colors`}>
                                    <Plus className="w-3.5 h-3.5" /> {t('add_variable')}
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export const PresetEditorModal: React.FC<PresetEditorModalProps> = ({
    isOpen,
    onClose,
    mode,
    scope,
    currentLang = 'en',
    initialTemplate,
    onSave,
    onDelete,
    t
}) => {
    const [titleDe, setTitleDe] = useState('');
    const [promptDe, setPromptDe] = useState('');
    const [controlsDe, setControlsDe] = useState<PresetControl[]>([]);

    const [titleEn, setTitleEn] = useState('');
    const [promptEn, setPromptEn] = useState('');
    const [controlsEn, setControlsEn] = useState<PresetControl[]>([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTitleDe(''); setPromptDe(''); setControlsDe([]);
            setTitleEn(''); setPromptEn(''); setControlsEn([]);

            if (mode === 'edit' && initialTemplate) {
                const isEn = initialTemplate.lang === 'en';
                if (isEn) {
                    setTitleEn(initialTemplate.title);
                    setPromptEn(initialTemplate.prompt);
                    setControlsEn(initialTemplate.controls || []);
                } else {
                    setTitleDe(initialTemplate.title);
                    setPromptDe(initialTemplate.prompt);
                    setControlsDe(initialTemplate.controls || []);
                }
            }
        }
    }, [isOpen, mode, initialTemplate]);

    const handleSave = () => {
        const results: { title: string; prompt: string; tags: string[]; controls: PresetControl[]; lang: 'de' | 'en' }[] = [];

        if (scope === 'user') {
            if (currentLang === 'de') {
                if (promptDe.trim()) {
                    results.push({ title: titleDe.trim() || 'Untitled', prompt: promptDe, tags: [], controls: controlsDe, lang: 'de' });
                }
            } else {
                if (promptEn.trim()) {
                    results.push({ title: titleEn.trim() || 'Untitled', prompt: promptEn, tags: [], controls: controlsEn, lang: 'en' });
                }
            }
        } else {
            if (promptDe.trim()) {
                results.push({ title: titleDe.trim() || 'Untitled', prompt: promptDe, tags: [], controls: controlsDe, lang: 'de' });
            }
            if (promptEn.trim()) {
                results.push({ title: titleEn.trim() || 'Untitled', prompt: promptEn, tags: [], controls: controlsEn, lang: 'en' });
            }
        }
        onSave(results);
    };

    const isSaveDisabled = () => {
        if (scope === 'user') {
            return currentLang === 'de' ? !promptDe.trim() : !promptEn.trim();
        }
        return !promptDe.trim() && !promptEn.trim();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] bg-zinc-950/60 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`
                    w-full ${scope === 'admin' ? 'max-w-4xl' : 'max-w-lg'} 
                    ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} 
                    shadow-2xl flex flex-col max-h-[90vh]
                    animate-in zoom-in-95 duration-200
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-2 shrink-0">
                    <div className="flex flex-col gap-1">
                        <h2 className={`${Typo.H2} text-xl ${Theme.Colors.TextHighlight}`}>
                            {mode === 'create' ? t('new_preset_title') : t('edit_preset_title')}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {mode === 'edit' && onDelete && initialTemplate && (
                            <IconButton
                                icon={<Trash className="w-5 h-5" />}
                                onClick={() => setIsDeleteDialogOpen(true)}
                                tooltip={t('delete')}
                            />
                        )}
                        <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
                    </div>
                </div>

                <div className={`flex-1 overflow-hidden ${scope === 'admin' ? 'grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800' : 'flex flex-col'}`}>
                    {/* German Form */}
                    {(scope === 'admin' || currentLang === 'de') && (
                        <div className="overflow-y-auto no-scrollbar pt-4">
                            <LanguageForm
                                lang="de"
                                title={titleDe} setTitle={setTitleDe}
                                prompt={promptDe} setPrompt={setPromptDe}
                                controls={controlsDe} setControls={setControlsDe}
                                showHeader={scope === 'admin'}
                                t={t}
                            />
                        </div>
                    )}

                    {/* English Form */}
                    {(scope === 'admin' || currentLang === 'en') && (
                        <div className={`overflow-y-auto no-scrollbar pt-4 ${scope === 'admin' ? 'bg-zinc-50/50 dark:bg-zinc-900/10' : ''}`}>
                            <LanguageForm
                                lang="en"
                                title={titleEn} setTitle={setTitleEn}
                                prompt={promptEn} setPrompt={setPromptEn}
                                controls={controlsEn} setControls={setControlsEn}
                                showHeader={scope === 'admin'}
                                t={t}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 flex items-center shrink-0 border-t border-zinc-100 dark:border-zinc-800">
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={isSaveDisabled()}
                        className="w-full h-12 text-xs font-bold"
                        icon={<Check className="w-4 h-4" />}
                    >
                        {t('save')}
                    </Button>
                </div>

                <ConfirmDialog
                    isOpen={isDeleteDialogOpen}
                    title={t('confirm_delete_preset')}
                    description={initialTemplate?.title || ''}
                    confirmLabel={t('delete')}
                    cancelLabel={t('cancel')}
                    onConfirm={() => {
                        if (initialTemplate) onDelete?.(initialTemplate.id);
                        setIsDeleteDialogOpen(false);
                        onClose();
                    }}
                    onCancel={() => setIsDeleteDialogOpen(false)}
                    variant="danger"
                />
            </div>
        </div>
    );
};
