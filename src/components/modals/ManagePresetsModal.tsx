import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PromptTemplate, PresetControl, TranslationFunction } from '@/types';
import { Button, Input, Theme, Typo, RoundIconButton, TextArea, ModalHeader, ModalFooter } from '@/components/ui/DesignSystem';
import { Trash, Plus, Share, X, ChevronLeft } from 'lucide-react';
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

    // Section labels (Title / Prompt / Variables) — clearly readable
    const fieldLabel = `${Typo.H5} text-zinc-700 dark:text-zinc-300`;

    return (
        <div className="flex flex-col gap-0 h-full">
            {showHeader && (
                <div className={`px-6 py-2 border-b ${Theme.Colors.Border} ${Theme.Colors.SurfaceSunken} flex justify-between items-center sticky top-0 z-10`}>
                    <span className="text-xs font-medium text-zinc-500">{lang === 'de' ? t('version_de') : t('version_en')}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${lang === 'de' ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'}`}>{lang.toUpperCase()}</span>
                </div>
            )}

            <div className={`px-6 pb-32 space-y-7 ${!showHeader ? 'pt-6' : 'pt-6'}`}>
                {/* Title */}
                <div className="flex flex-col gap-2">
                    <label className={fieldLabel}>{t('title_label')}</label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('title_placeholder')} className="text-sm" />
                </div>

                {/* Prompt */}
                <div className="flex flex-col gap-2">
                    <label className={fieldLabel}>{t('prompt_label_editor')}</label>
                    <TextArea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={t('prompt_placeholder')} className={`${Typo.Prompt} min-h-[120px] no-scrollbar`} />
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-3">
                    <label className={fieldLabel}>{t('variables_label')}</label>
                    {/* Der Knopf steht zwischen Ueberschrift und erster Gruppe.
                        Am Listenende war er bei einer Vorlage mit sechs Gruppen
                        weggescrollt — gesucht wird er aber dort, wo die Liste
                        anfaengt, nicht dort, wo sie aufhoert. */}
                    {!isAddingControl && !editingControlId && (
                        <Button variant="secondary" onClick={() => setIsAddingControl(true)} className="w-full gap-2">
                            <Plus className="w-4 h-4" /> {t('add_variable')}
                        </Button>
                    )}
                    <div>
                        {controls.map((ctrl) => (
                            <React.Fragment key={ctrl.id}>
                                {editingControlId === ctrl.id ? (
                                    <div
                                        ref={editFormRef}
                                        className="my-3 p-5 bg-black/[0.04] dark:bg-white/[0.05] rounded-2xl space-y-4 relative overflow-hidden"
                                    >
                                        <div className="flex flex-col gap-1.5">
                                            <label className={fieldLabel}>{t('title_label')}</label>
                                            <Input value={newControlLabel} onChange={e => setNewControlLabel(e.target.value)} placeholder={t('var_name_placeholder')} className="text-sm !bg-white dark:!bg-black/25" autoFocus />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className={fieldLabel}>{t('options')}</label>
                                            <Input value={newControlOptions} onChange={e => setNewControlOptions(e.target.value)} placeholder={t('var_options_placeholder')} className="text-sm !bg-white dark:!bg-black/25" />
                                        </div>
                                        <div className="flex items-center gap-2 pt-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteControl(editingControlId); }}
                                                className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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
                                        className="flex flex-col py-3 cursor-pointer group transition-all active:scale-[0.98]"
                                    >
                                        <div className="text-xs font-normal text-zinc-400 dark:text-zinc-500 mb-2 truncate">{ctrl.label}</div>
                                        {/* Kein Stift mehr daneben: Die ganze Zeile
                                            oeffnet die Gruppe schon, und ein Symbol,
                                            das dasselbe tut wie die Flaeche, auf der
                                            es liegt, ist nur ein zweiter Weg zum
                                            gleichen Ziel. */}
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            {ctrl.options.map(o => (
                                                <span key={o.id} className="text-[12px] px-3 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.07] text-zinc-700 dark:text-zinc-200">
                                                    {o.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}

                        {isAddingControl && !editingControlId ? (
                            <div className="p-5 bg-black/[0.04] dark:bg-white/[0.05] rounded-2xl space-y-4 relative overflow-hidden">
                                <div className="flex flex-col gap-1.5">
                                    <label className={fieldLabel}>{t('title_label')}</label>
                                    <Input value={newControlLabel} onChange={e => setNewControlLabel(e.target.value)} placeholder={t('var_name_placeholder')} className="text-sm !bg-white dark:!bg-black/25" autoFocus />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className={fieldLabel}>{t('options')}</label>
                                    <Input value={newControlOptions} onChange={e => setNewControlOptions(e.target.value)} placeholder={t('var_options_placeholder')} className="text-sm !bg-white dark:!bg-black/25" />
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
                        ) : null}
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

        // Ohne Vorgabe die erste Vorlage vorauswählen — sonst öffnete sich der
        // Editor mit einem leeren Bereich und man musste erst blind klicken.
        const initialSelected = initialTemplateId || templates[0]?.id || null;
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
        const results: { id?: string; user_id?: string; title: string; prompt: string; tags: string[]; controls: PresetControl[]; lang: 'de' | 'en' }[] = [];

        if (currentLang === 'de') {
            if (promptDe.trim()) {
                results.push({ id: selectedId !== 'new' && selectedId ? selectedId : undefined, user_id: activeTemplate?.user_id, title: titleDe.trim() || 'Untitled', prompt: promptDe, tags: [], controls: controlsDe, lang: 'de' });
            }
        } else {
            if (promptEn.trim()) {
                results.push({ id: selectedId !== 'new' && selectedId ? selectedId : undefined, user_id: activeTemplate?.user_id, title: titleEn.trim() || 'Untitled', prompt: promptEn, tags: [], controls: controlsEn, lang: 'en' });
            }
        }

        try {
            const saved = await onSave(results, { closeOnSuccess: false });
            if (saved) {
                setSelectedId(saved.id);
                showToast(t('save_success'), 'success');
                if (isMobile) setMobileView('list');
            } else {
                showToast(t('save_error'), 'error');
            }
        } catch (err) {
            showToast(currentLang === 'de' ? 'Fehler beim Speichern' : 'Failed to save', 'error');
        }
    };

    const isSaveDisabled = () => {
        return currentLang === 'de' ? !promptDe.trim() : !promptEn.trim();
    };

    const handleShareClick = async () => {
        // Only save if unsaved (new preset) — avoid duplicating already-saved presets
        if (selectedId === 'new') {
            const results: { id?: string; title: string; prompt: string; tags: string[]; controls: PresetControl[]; lang: 'de' | 'en' }[] = [];
            if (currentLang === 'de') {
                if (promptDe.trim()) results.push({ title: titleDe.trim() || 'Untitled', prompt: promptDe, tags: [], controls: controlsDe, lang: 'de' });
            } else {
                if (promptEn.trim()) results.push({ title: titleEn.trim() || 'Untitled', prompt: promptEn, tags: [], controls: controlsEn, lang: 'en' });
            }
            try {
                const saved = await onSave(results, { closeOnSuccess: false });
                if (saved) {
                    setSelectedId(saved.id);
                    setSavedTemplateForShare(saved);
                } else {
                    setSavedTemplateForShare(activeTemplate);
                }
            } catch {
                setSavedTemplateForShare(activeTemplate);
            }
        } else {
            setSavedTemplateForShare(activeTemplate);
        }
        setIsShareModalOpen(true);
    };

    if (!isOpen) return null;

    const renderEditor = () => (
        <div className={`flex flex-col h-full ${Theme.Colors.PanelBg} max-h-[90vh]`}>
            <div className={`px-6 pt-5 pb-3 flex items-center justify-between shrink-0`}>
                <div className="flex items-center gap-3">
                    {isMobile && (
                        <button onClick={() => setMobileView('list')} className="p-1 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {selectedId !== 'new' && selectedId && (
                        <>
                            <RoundIconButton
                                icon={<Share className="w-4 h-4" />}
                                onClick={handleShareClick}
                                tooltip={t('share_btn')}
                                variant="ghost"
                            />
                            <RoundIconButton
                                icon={<Trash className="w-4 h-4" />}
                                onClick={() => setIsDeleteDialogOpen(true)}
                                tooltip={t('delete')}
                                variant="ghost"
                            />
                        </>
                    )}
                    {/* Auf dem Handy schliesst der Editor selbst; am Schreibtisch
                        sitzt das Kreuz einmal oben rechts am Fenster, egal welche
                        Spalte gerade etwas zeigt. Vorher gab es gar keines,
                        solange keine Vorlage gewaehlt war. */}
                    {isMobile && (
                        <RoundIconButton icon={<X className="w-[18px] h-[18px]" />} onClick={onClose} tooltip={t('close')} variant="ghost" />
                    )}
                </div>
            </div>

            <div className={`flex-1 overflow-y-auto min-h-0 pt-2 no-scrollbar ${Theme.Colors.PanelBg}`}>
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
            <div className={`px-6 pt-5 pb-3 flex items-center justify-between shrink-0`}>
                <span className={Typo.H1}>{t('presets_header')}</span>
                {isMobile && (
                    <RoundIconButton icon={<X className="w-[18px] h-[18px]" />} onClick={onClose} tooltip={t('close')} variant="ghost" />
                )}
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
                            className={`w-full text-left px-3 h-11 rounded-xl transition-colors duration-150 flex items-center gap-2.5 ${selectedId === tmpl.id ? 'bg-black/[0.05] dark:bg-white/[0.08] text-zinc-900 dark:text-zinc-100' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-zinc-700 dark:text-zinc-300'}`}
                        >
                            {/* Das Zeichen der Vorlage steht wieder davor.
                                Im Blatt traegt jede Vorlage ihres; hier fehlte
                                es, und dieselbe Liste sah an zwei Stellen
                                verschieden aus. Eine Vorlage ohne Zeichen
                                bekommt denselben Platz, damit die Titel in
                                einer Flucht stehen. */}
                            <span className="w-5 shrink-0 text-center text-sm leading-none">{tmpl.emoji || ''}</span>
                            <span className="text-[13px] font-medium truncate">{tmpl.title}</span>
                        </button>
                    ))}
                    {selectedId === 'new' && (
                        <button
                            className="w-full text-left px-3 h-11 rounded-xl flex items-center gap-2.5 bg-black/[0.05] dark:bg-white/[0.08]"
                        >
                            <span className="w-5 shrink-0" />
                            <span className="text-[13px] font-medium truncate text-zinc-400 dark:text-zinc-500">{t('create_preset')}</span>
                        </button>
                    )}
                </div>
                <div className="shrink-0 p-6">
                    <Button variant="secondary" onClick={() => { setSelectedId('new'); if (isMobile) setMobileView('editor'); }} className="w-full gap-2">
                        <Plus className="w-4 h-4" /> {t('create_preset')}
                    </Button>
                </div>
            </div>
        </div>
    );

    // In den Body gehaengt: Ein Vorfahr mit Transformation (das Blatt der
    // Detailansicht waehrend seiner Einblendung) macht `fixed` sonst relativ
    // zu sich — das Fenster sass dann in der Panelbreite statt im Bildschirm.
    return createPortal(
        <div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`
                    relative w-full ${isMobile ? 'max-w-md' : 'max-w-4xl h-[70vh] min-h-[500px]'}
                    ${Theme.Colors.PanelBg} ${Theme.Geometry.RadiusXl}
                    flex overflow-hidden ${Theme.Effects.ShadowLg}
                    animate-[view-in_240ms_cubic-bezier(0.16,1,0.3,1)_backwards]
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {!isMobile && (
                    <div className="absolute top-4 right-4 z-20">
                        <RoundIconButton icon={<X className="w-[18px] h-[18px]" />} onClick={onClose} tooltip={t('close')} variant="ghost" />
                    </div>
                )}
                {isMobile ? (
                    <div className="flex-1 w-full min-h-0">
                        {mobileView === 'list' ? renderList() : renderEditor()}
                    </div>
                ) : (
                    <>
                        {/* Die Liste liegt tiefer als der Editor daneben.
                            Das trennt die beiden Spalten, ohne eine Linie zu
                            ziehen — dieselbe Regel wie zwischen Grund, Blatt
                            und Eingabe. */}
                        <div className={`w-[300px] shrink-0 ${Theme.Colors.SurfaceSunken}`}>
                            {renderList()}
                        </div>
                        <div className={`flex-1 min-w-0 ${Theme.Colors.PanelBg}`}>
                            {selectedId ? renderEditor() : (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                                    <span className="text-sm">{t('preset_select_placeholder')}</span>
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
                    variant="danger"
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
                t={t}
            />
        </div>,
        document.body
    );
};
