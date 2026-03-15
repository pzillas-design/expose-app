import React, { useState, useEffect, useRef } from 'react';
import { PromptTemplate, PresetControl, TranslationFunction } from '@/types';
import { Button, Input, Theme, Typo, RoundIconButton, TextArea, ModalHeader, ModalFooter } from '@/components/ui/DesignSystem';
import { Trash, Plus, Minus, Settings2, Share, Pencil, Link as LinkIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ShareTemplateModal } from './ShareTemplateModal';
import { useToast } from '@/components/ui/Toast';
import { generateId } from '@/utils/ids';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { useMobile } from '@/hooks/useMobile';

interface ManagePresetsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLang?: 'de' | 'en';
    templates: PromptTemplate[];
    initialTemplateId?: string | null;
    onSave: (
        templates: { title: string; prompt: string; tags: string[]; controls: PresetControl[]; lang: 'de' | 'en' }[],
        options?: { closeOnSuccess?: boolean }
    ) => Promise<PromptTemplate | null>;
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
    const editFormRef = useRef<HTMLDivElement>(null);

    // Auto-scroll when editing or adding
    useEffect(() => {
        if (isAddingControl || editingControlId) {
            setTimeout(() => {
                editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }, [isAddingControl, editingControlId]);

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
        // Note: isAddingControl stays false to prevent the bottom "Add" box from showing
    };

    const handleDeleteControl = (id: string) => {
        setControls(prev => prev.filter(c => c.id !== id));
        if (editingControlId === id) resetForm();
    };

    return (
        <div className="flex flex-col gap-0 h-full">
            {showHeader && (
                <div className={`px-6 py-2 border-b ${Theme.Colors.Border} ${Theme.Colors.SurfaceSubtle} flex justify-between items-center sticky top-0 z-10`}>
                    <span className="text-xs font-medium text-zinc-500">{lang === 'de' ? t('version_de') : t('version_en')}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${lang === 'de' ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'}`}>{lang.toUpperCase()}</span>
                </div>
            )}

            <div className={`px-6 pb-32 space-y-6 ${!showHeader ? 'pt-6' : 'pt-6'}`}>
                {/* Title */}
                <div className="flex flex-col gap-2">
                    <label className={`text-sm font-medium text-zinc-700 dark:text-zinc-300`}>
                        {t('title_label')}
                    </label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('title_placeholder')} className="text-sm bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-400/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600" />
                </div>

                {/* Prompt */}
                <div className="flex flex-col gap-2">
                    <label className={`text-sm font-medium text-zinc-700 dark:text-zinc-300`}>
                        {t('prompt_label_editor')}
                    </label>
                    <TextArea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={t('prompt_placeholder')} className="text-sm min-h-[120px] font-normal scrollbar-hide bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-zinc-400/30 resize-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600" />
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-2">
                    <label className={`text-sm font-medium text-zinc-700 dark:text-zinc-300`}>
                        {t('variables_label')}
                    </label>
                    <div className="space-y-3">
                        {controls.map((ctrl) => (
                            <React.Fragment key={ctrl.id}>
                                {editingControlId === ctrl.id ? (
                                    <div
                                        ref={editFormRef}
                                        className={`p-5 bg-zinc-100/50 dark:bg-zinc-900/40 rounded-xl space-y-4 relative overflow-hidden`}
                                    >
                                        <div className="flex flex-col gap-2">
                                            <label className={`text-sm font-medium text-zinc-700 dark:text-zinc-300`}>
                                                Titel
                                            </label>
                                            <Input value={newControlLabel} onChange={e => setNewControlLabel(e.target.value)} placeholder={t('var_name_placeholder')} className="text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 px-0" autoFocus />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className={`text-sm font-medium text-zinc-700 dark:text-zinc-300`}>
                                                Optionen
                                            </label>
                                            <Input value={newControlOptions} onChange={e => setNewControlOptions(e.target.value)} placeholder={t('var_options_placeholder')} className="text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 px-0" />
                                        </div>
                                        <div className="flex items-center gap-2 pt-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteControl(editingControlId); }}
                                                className="p-2 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                title={t('delete')}
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                            <div className="flex-1" />
                                            <Button variant="secondary" onClick={resetForm}>
                                                {t('cancel')}
                                            </Button>
                                            <Button variant="primary" onClick={handleSaveControl} disabled={!newControlLabel}>
                                                {t('save')}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => startEditing(ctrl)}
                                        className={`flex items-start justify-between p-4 bg-zinc-100/50 dark:bg-zinc-900/40 rounded-xl cursor-pointer group transition-all hover:bg-zinc-100/70 dark:hover:bg-zinc-900/60 active:scale-[0.98]`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className={`text-sm font-medium ${Theme.Colors.TextHighlight} mb-1.5 truncate`}>{ctrl.label}</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {ctrl.options.map(o => (
                                                    <span key={o.id} className="text-[11px] px-2.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-800 dark:text-zinc-100">
                                                        {o.label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-all p-2 shrink-0">
                                            <Pencil className="w-4 h-4" />
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}

                        {isAddingControl && !editingControlId ? (
                            <div className={`p-5 bg-zinc-100/50 dark:bg-zinc-900/40 rounded-xl space-y-4 relative overflow-hidden`}>
                                <div className="flex flex-col gap-2">
                                    <label className={`text-sm font-medium text-zinc-700 dark:text-zinc-300`}>
                                        Titel
                                    </label>
                                    <Input value={newControlLabel} onChange={e => setNewControlLabel(e.target.value)} placeholder={t('var_name_placeholder')} className="text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 px-0" autoFocus />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className={`text-sm font-medium text-zinc-700 dark:text-zinc-300`}>
                                        Optionen
                                    </label>
                                    <Input value={newControlOptions} onChange={e => setNewControlOptions(e.target.value)} placeholder={t('var_options_placeholder')} className="text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 px-0" />
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <div className="flex-1" />
                                    <Button variant="secondary" onClick={resetForm}>
                                        {t('cancel')}
                                    </Button>
                                    <Button variant="primary" onClick={handleSaveControl} disabled={!newControlLabel}>
                                        {t('add_btn')}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            !editingControlId && (
                                <Button variant="secondary" onClick={() => setIsAddingControl(true)} className="w-full gap-2">
                                    <Plus className="w-4 h-4" /> {t('add_variable')}
                                </Button>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export const ManagePresetsModal: React.FC<ManagePresetsModalProps> = ({
    isOpen,
    onClose,
    currentLang = 'en',
    templates,
    initialTemplateId,
    onSave,
    onDelete,
    t
}) => {
    const isMobile = useMobile();
    const { showToast } = useToast();
    const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
    const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');

    const [titleDe, setTitleDe] = useState('');
    const [promptDe, setPromptDe] = useState('');
    const [controlsDe, setControlsDe] = useState<PresetControl[]>([]);

    const [titleEn, setTitleEn] = useState('');
    const [promptEn, setPromptEn] = useState('');
    const [controlsEn, setControlsEn] = useState<PresetControl[]>([]);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [savedTemplateForShare, setSavedTemplateForShare] = useState<PromptTemplate | null>(null);

    const activeTemplate = templates.find(t => t.id === selectedId) || null;

    useEffect(() => {
        if (!isOpen) {
            setSelectedId(null);
            setMobileView('list');
            return;
        }

        const initialSelected = initialTemplateId || null;
        setSelectedId(initialSelected);
        if (isMobile && initialSelected) {
            setMobileView('editor');
        } else if (isMobile) {
            setMobileView('list');
        }

        setTitleDe(''); setPromptDe(''); setControlsDe([]);
        setTitleEn(''); setPromptEn(''); setControlsEn([]);
        setSavedTemplateForShare(null);

        if (initialSelected && initialSelected !== 'new') {
            const tmpl = templates.find(t => t.id === initialSelected);
            if (tmpl) {
                if (currentLang === 'en') {
                    setTitleEn(tmpl.title);
                    setPromptEn(tmpl.prompt);
                    setControlsEn(tmpl.controls || []);
                } else {
                    setTitleDe(tmpl.title);
                    setPromptDe(tmpl.prompt);
                    setControlsDe(tmpl.controls || []);
                }
            }
        }
    }, [isOpen, initialTemplateId, currentLang, templates]);

    // Load template when selectedId changes (e.g., clicking in list)
    useEffect(() => {
        if (!selectedId) return;
        if (selectedId === 'new') {
            setTitleDe(''); setPromptDe(''); setControlsDe([]);
            setTitleEn(''); setPromptEn(''); setControlsEn([]);
            return;
        }
        const tmpl = templates.find(t => t.id === selectedId);
        if (tmpl) {
            if (currentLang === 'en') {
                setTitleEn(tmpl.title);
                setPromptEn(tmpl.prompt);
                setControlsEn(tmpl.controls || []);
            } else {
                setTitleDe(tmpl.title);
                setPromptDe(tmpl.prompt);
                setControlsDe(tmpl.controls || []);
            }
        }
    }, [selectedId, currentLang, templates]);

    const handleSave = async () => {
        const results: { id?: string; title: string; prompt: string; tags: string[]; controls: PresetControl[]; lang: 'de' | 'en' }[] = [];

        if (currentLang === 'de') {
            if (promptDe.trim()) {
                results.push({ id: selectedId !== 'new' && selectedId ? selectedId : undefined, title: titleDe.trim() || 'Untitled', prompt: promptDe, tags: [], controls: controlsDe, lang: 'de' });
            }
        } else {
            if (promptEn.trim()) {
                results.push({ id: selectedId !== 'new' && selectedId ? selectedId : undefined, title: titleEn.trim() || 'Untitled', prompt: promptEn, tags: [], controls: controlsEn, lang: 'en' });
            }
        }

        try {
            const saved = await onSave(results, { closeOnSuccess: false });
            if (saved) {
                setSelectedId(saved.id);
                showToast(currentLang === 'de' ? 'Vorlage gespeichert' : 'Preset saved', 'success');
                if (isMobile) setMobileView('list');
            } else {
                showToast(currentLang === 'de' ? 'Fehler beim Speichern' : 'Failed to save', 'error');
            }
        } catch (err) {
            showToast(currentLang === 'de' ? 'Fehler beim Speichern' : 'Failed to save', 'error');
        }
    };

    const isSaveDisabled = () => {
        return currentLang === 'de' ? !promptDe.trim() : !promptEn.trim();
    };

    if (!isOpen) return null;

    const renderEditor = () => (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900/95 max-h-[90vh]">
            <div className={`p-6 flex items-center justify-between shrink-0 border-b border-zinc-200/50 dark:border-zinc-800/50`}>
                <div className="flex items-center gap-3">
                    {isMobile && (
                        <button onClick={() => setMobileView('list')} className="p-1 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    <span className={Typo.H3}>{selectedId === 'new' ? t('new_preset_title') : t('edit_preset_title')}</span>
                </div>
                <div className="flex items-center gap-2">
                    {selectedId !== 'new' && selectedId && (
                        <>
                            <RoundIconButton
                                icon={<Share className="w-4 h-4" />}
                                onClick={() => {
                                    setSavedTemplateForShare(activeTemplate);
                                    setIsShareModalOpen(true);
                                }}
                                tooltip="Teilen"
                                variant="ghost"
                            />
                            <RoundIconButton
                                icon={<Trash className="w-4 h-4" />}
                                onClick={() => setIsDeleteDialogOpen(true)}
                                tooltip={t('delete')}
                                variant="danger"
                            />
                        </>
                    )}
                    <RoundIconButton icon={<X className="w-5 h-5" />} onClick={onClose} tooltip={t('close')} variant="ghost" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pt-4 scrollbar-hide bg-white dark:bg-zinc-900">
                <LanguageForm
                    lang={currentLang as 'de' | 'en'}
                    title={currentLang === 'de' ? titleDe : titleEn}
                    setTitle={currentLang === 'de' ? setTitleDe : setTitleEn}
                    prompt={currentLang === 'de' ? promptDe : promptEn}
                    setPrompt={currentLang === 'de' ? setPromptDe : setPromptEn}
                    controls={currentLang === 'de' ? controlsDe : controlsEn}
                    setControls={currentLang === 'de' ? setControlsDe : setControlsEn}
                    showHeader={false}
                    t={t}
                />
            </div>

            <ModalFooter>
                <Button variant="primary" onClick={() => handleSave()} disabled={isSaveDisabled()} className="w-full">
                    {t('save')}
                </Button>
            </ModalFooter>
        </div>
    );

    const renderList = () => (
        <div className="flex flex-col h-full overflow-hidden max-h-[90vh]">
            <div className={`p-6 flex items-center justify-between shrink-0 border-b border-zinc-200/50 dark:border-zinc-800/50`}>
                <span className={Typo.H3}>{currentLang === 'de' ? 'Vorlagen' : 'Presets'}</span>
                <RoundIconButton icon={<X className="w-5 h-5" />} onClick={onClose} tooltip={t('close')} variant="ghost" className={isMobile ? '' : 'opacity-0 pointer-events-none'} />
            </div>
            <div className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {templates.filter(t => t.isCustom || !t.lang || t.lang === currentLang).map(tmpl => (
                        <button
                            key={tmpl.id}
                            onClick={() => {
                                setSelectedId(tmpl.id);
                                if (isMobile) setMobileView('editor');
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors duration-150 flex items-center justify-between group ${selectedId === tmpl.id ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-transparent' : 'bg-transparent border border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}
                        >
                            <span className="text-[13px] font-medium truncate pr-2">{tmpl.title}</span>
                            <ChevronRight className={`w-4 h-4 text-zinc-400 transition-opacity ${selectedId !== tmpl.id ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`} />
                        </button>
                    ))}
                    {selectedId === 'new' && (
                        <button
                            className="w-full text-left px-3 py-2.5 rounded-xl transition-colors duration-150 flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-transparent"
                        >
                            <span className="text-[13px] font-medium truncate pr-2 text-zinc-400 dark:text-zinc-500">{currentLang === 'de' ? 'Neue Vorlage' : 'New Preset'}</span>
                            <ChevronRight className="w-4 h-4 text-zinc-400 opacity-100" />
                        </button>
                    )}
                </div>
                <div className="shrink-0 p-6">
                    <Button variant="secondary" onClick={() => { setSelectedId('new'); if (isMobile) setMobileView('editor'); }} className="w-full gap-2">
                        <Plus className="w-4 h-4" /> {currentLang === 'de' ? 'Neue Vorlage' : 'New preset'}
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-[100] bg-zinc-950/60 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`
                    w-full ${isMobile ? 'max-w-md' : 'max-w-4xl h-[70vh] min-h-[500px]'}
                    bg-white dark:bg-zinc-900 backdrop-blur-2xl ${Theme.Geometry.RadiusXl}
                    flex overflow-hidden ${Theme.Effects.ShadowLg}
                    animate-in zoom-in-95 duration-200
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {isMobile ? (
                    <div className="flex-1 w-full min-h-0">
                        {mobileView === 'list' ? renderList() : renderEditor()}
                    </div>
                ) : (
                    <>
                        <div className="w-[300px] border-r border-zinc-200/50 dark:border-zinc-800/50 shrink-0 bg-white dark:bg-zinc-900">
                            {renderList()}
                        </div>
                        <div className="flex-1 min-w-0 bg-white dark:bg-zinc-900">
                            {selectedId ? renderEditor() : (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                                    <span className="text-sm">Bitte wähle links eine Vorlage aus oder erstelle eine neue.</span>
                                </div>
                            )}
                        </div>
                    </>
                )}

                <ConfirmDialog
                    isOpen={isDeleteDialogOpen}
                    title={t('confirm_delete_preset')}
                    description={activeTemplate?.title || ''}
                    confirmLabel={t('delete')}
                    cancelLabel={t('cancel')}
                    onConfirm={() => {
                        if (selectedId && selectedId !== 'new') onDelete?.(selectedId);
                        setIsDeleteDialogOpen(false);
                        setSelectedId(null);
                        if (isMobile) setMobileView('list');
                    }}
                    onCancel={() => setIsDeleteDialogOpen(false)}
                />

            </div>

            <ShareTemplateModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                templateName={savedTemplateForShare?.title || activeTemplate?.title || titleDe || titleEn || 'Unbenannt'}
                slug={savedTemplateForShare?.slug || activeTemplate?.slug}
            />
        </div>
    );
};
