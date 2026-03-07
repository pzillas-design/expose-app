import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Trash, Loader2, Bookmark, Check, ArrowRight, GripVertical } from 'lucide-react';
import { TranslationFunction, PromptTemplate, PresetControl } from '@/types';
import { Typo, Button, Input, TextArea, SectionHeader, Theme, IconButton, TableInput } from '@/components/ui/DesignSystem';
import { adminService } from '@/services/adminService';
import { generateId } from '@/utils/ids';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';

interface AdminPresetsViewProps {
    t: TranslationFunction;
}

interface PresetGroup {
    baseId: string;
    de?: PromptTemplate;
    en?: PromptTemplate;
}

export const AdminPresetsView: React.FC<AdminPresetsViewProps> = ({ t }) => {
    const [allPresets, setAllPresets] = useState<PromptTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    // Dialog State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Form State (Combined DE & EN)
    const [formState, setFormState] = useState<{
        de: { title: string, prompt: string, controls: PresetControl[] },
        en: { title: string, prompt: string, controls: PresetControl[] }
    }>({
        de: { title: '', prompt: '', controls: [] },
        en: { title: '', prompt: '', controls: [] }
    });

    useEffect(() => {
        fetchPresets();
    }, []);

    const fetchPresets = async () => {
        setLoading(true);
        try {
            const data = await adminService.getGlobalPresets(undefined, true);
            setAllPresets(data);

            // Auto-select first if nothing selected
            if (data.length > 0 && !selectedId) {
                const firstDe = data.find(p => (p.lang || 'de') === 'de');
                if (firstDe) handleSelect(firstDe.id, data);
            }
        } catch (error) {
            console.error('Failed to fetch presets:', error);
        } finally {
            setLoading(false);
        }
    };

    // Grouping Logic: Link '-en' IDs to their base IDs
    const groupedPresets = useMemo(() => {
        const groups: Record<string, PresetGroup> = {};
        allPresets.forEach(p => {
            const isEn = p.id.endsWith('-en');
            const baseId = isEn ? p.id.slice(0, -3) : p.id;
            if (!groups[baseId]) groups[baseId] = { baseId };
            if (isEn) groups[baseId].en = p;
            else groups[baseId].de = p;
        });
        return Object.values(groups).sort((a, b) =>
            (a.de?.title || '').localeCompare(b.de?.title || '')
        );
    }, [allPresets]);

    const filteredGroups = groupedPresets.filter(g =>
        (g.de?.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (g.de?.prompt || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (deId: string, currentPresets = allPresets) => {
        const baseId = deId.endsWith('-en') ? deId.slice(0, -3) : deId;
        const de = currentPresets.find(p => p.id === baseId);
        const en = currentPresets.find(p => p.id === baseId + '-en');

        setSelectedId(baseId);
        setFormState({
            de: { title: de?.title || '', prompt: de?.prompt || '', controls: de?.controls || [] },
            en: { title: en?.title || '', prompt: en?.prompt || '', controls: en?.controls || [] }
        });
    };

    const handleNew = () => {
        const newId = generateId();
        setSelectedId(newId);
        setFormState({
            de: { title: 'Neue Vorlage', prompt: '', controls: [] },
            en: { title: 'New Template', prompt: '', controls: [] }
        });
    };

    const handleSave = async () => {
        if (!selectedId || isSaving) return;

        const hasDe = formState.de.prompt.trim().length > 0;
        const hasEn = formState.en.prompt.trim().length > 0;

        if (!hasDe && !hasEn) {
            showToast('Mindestens ein Prompt (DE oder EN) muss ausgefüllt sein', 'error');
            return;
        }

        setIsSaving(true);
        try {
            // Save DE if provided
            if (hasDe) {
                await adminService.updateGlobalPreset({
                    id: selectedId,
                    lang: 'de',
                    ...formState.de,
                    isPinned: true, isCustom: false, usageCount: 0
                });
            }

            // Save EN if provided
            if (hasEn) {
                await adminService.updateGlobalPreset({
                    id: selectedId + '-en',
                    lang: 'en',
                    ...formState.en,
                    isPinned: true, isCustom: false, usageCount: 0
                });
            }

            await fetchPresets();
            showToast(t('save_success'), 'success');
        } catch (error: any) {
            console.error('Save failed:', error);
            showToast(error.message || t('save_error'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedId) return;
        try {
            await adminService.deleteGlobalPreset(selectedId);
            await adminService.deleteGlobalPreset(selectedId + '-en');
            await fetchPresets();
            setSelectedId(null);
            showToast(t('delete_success'), 'success');
        } catch (error) {
            showToast(t('delete_error'), 'error');
        } finally {
            setIsDeleteDialogOpen(false);
        }
    };

    return (
        <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* LEFT SIDEBAR: List */}
            <div className="w-[300px] flex flex-col border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
                <div className="p-5 pb-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Vorlagen</span>
                        <IconButton icon={<Plus className="w-4 h-4" />} onClick={handleNew} className="hover:bg-zinc-200 dark:hover:bg-zinc-800" />
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <Input
                            className="pl-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                            placeholder={t('search_presets')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {loading && allPresets.length === 0 ? (
                        <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-300" /></div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="p-10 text-center text-xs text-zinc-400">{t('no_entries_found')}</div>
                    ) : (
                        filteredGroups.map(group => (
                            <button
                                key={group.baseId}
                                onClick={() => handleSelect(group.baseId)}
                                className={`w-full text-left px-5 py-3 flex items-center justify-between group transition-all border-l-2 ${selectedId === group.baseId
                                    ? 'bg-zinc-100/80 dark:bg-zinc-800/50 border-zinc-900 dark:border-white'
                                    : 'border-transparent hover:bg-zinc-100/30 dark:hover:bg-zinc-800/20'
                                    } `}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className={`text-[13px] font-bold truncate ${selectedId === group.baseId ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'} `}>
                                        {group.de?.title || group.baseId}
                                    </div>
                                    <div className="text-[9px] text-zinc-400 truncate font-medium opacity-60">
                                        ID: {group.baseId}
                                    </div>
                                </div>
                                <ArrowRight className={`w-3 h-3 transition-transform ${selectedId === group.baseId ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:opacity-40'} `} />
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT SIDE: Editor */}
            <div className="flex-1 flex flex-col min-w-0">
                {!selectedId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-300 gap-4">
                        <Bookmark className="w-12 h-12 opacity-10" strokeWidth={1} />
                        <p className="text-xs font-medium opacity-40">Wähle eine Vorlage aus</p>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 lg:p-8 w-full mx-auto space-y-10 no-scrollbar bg-white dark:bg-zinc-950">

                            {/* Compact Sticky Header */}
                            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10 pt-2">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white" />
                                        <span className="text-[10px] uppercase tracking-widest font-black text-zinc-400 dark:text-zinc-500">ID: {selectedId}</span>
                                    </div>
                                    <h1 className={`${Typo.H1} text-xl font-black tracking-tight`}>{formState.de.title || 'Neue Vorlage'}</h1>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(true)} className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 h-9 w-9 p-0 flex items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 transition-all">
                                        <Trash className="w-5 h-5" />
                                    </Button>
                                    <Button onClick={handleSave} disabled={isSaving} className="h-8 px-5 rounded-md font-bold text-[11px]" icon={isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}>
                                        {isSaving ? 'Speichert...' : t('save').toUpperCase()}
                                    </Button>
                                </div>
                            </div>

                            {/* Refined Form Sections with Vertical Divider */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative">

                                {/* Vertical Divider (visible on desktop) */}
                                <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-zinc-100 dark:bg-zinc-800 -translate-x-1/2" />

                                {/* DE Column */}
                                <div className="space-y-10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-3 w-1 rounded-full bg-amber-500" />
                                        <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-[0.2em]">DEUTSCH</span>
                                    </div>

                                    <div className="space-y-8 pr-2">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-0.5">Titel der Vorlage</label>
                                            <Input
                                                className="text-lg font-bold h-11 px-0 bg-transparent border-none border-b border-zinc-100 dark:border-zinc-800 focus:border-zinc-300 dark:focus:border-zinc-600 rounded-none transition-all"
                                                value={formState.de.title}
                                                onChange={e => setFormState(s => ({ ...s, de: { ...s.de, title: e.target.value } }))}
                                                placeholder="z.B. Fotos weichzeichnen"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-0.5">Prompt Instruktion</label>
                                            <TextArea
                                                className="min-h-[220px] text-[13px] leading-relaxed p-4 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-300 dark:focus:border-zinc-600 rounded-xl transition-all resize-none"
                                                value={formState.de.prompt}
                                                onChange={e => setFormState(s => ({ ...s, de: { ...s.de, prompt: e.target.value } }))}
                                                placeholder="Prompt-Text hier..."
                                            />
                                        </div>

                                        <div className="pt-4 border-t border-zinc-50 dark:border-zinc-900">
                                            <div className="flex items-center justify-between mb-4">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Variablen Management</label>
                                            </div>
                                            <ControlsEditor
                                                controls={formState.de.controls}
                                                onChange={(ctrls) => setFormState(s => ({ ...s, de: { ...s.de, controls: ctrls } }))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* EN Column */}
                                <div className="space-y-10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-3 w-1 rounded-full bg-orange-500" />
                                        <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-[0.2em]">ENGLISH</span>
                                    </div>

                                    <div className="space-y-8 pl-2">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-0.5">Template Title</label>
                                            <Input
                                                className="text-lg font-bold h-11 px-0 bg-transparent border-none border-b border-zinc-100 dark:border-zinc-800 focus:border-zinc-300 dark:focus:border-zinc-600 rounded-none transition-all"
                                                value={formState.en.title}
                                                onChange={e => setFormState(s => ({ ...s, en: { ...s.en, title: e.target.value } }))}
                                                placeholder="e.g. Blur Photos"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-0.5">Prompt Instruction</label>
                                            <TextArea
                                                className="min-h-[220px] text-[13px] leading-relaxed p-4 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-300 dark:focus:border-zinc-600 rounded-xl transition-all resize-none"
                                                value={formState.en.prompt}
                                                onChange={e => setFormState(s => ({ ...s, en: { ...s.en, prompt: e.target.value } }))}
                                                placeholder="Prompt text here..."
                                            />
                                        </div>

                                        <div className="pt-4 border-t border-zinc-50 dark:border-zinc-900">
                                            <div className="flex items-center justify-between mb-4">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Variables Management</label>
                                            </div>
                                            <ControlsEditor
                                                controls={formState.en.controls}
                                                onChange={(ctrls) => setFormState(s => ({ ...s, en: { ...s.en, controls: ctrls } }))}
                                            />
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Dialogs */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                title={t('delete_preset')}
                description={t('confirm_delete_preset')}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                onConfirm={handleDelete}
                onCancel={() => setIsDeleteDialogOpen(false)}
                variant="danger"
            />
        </div>
    );
};

// --- TABLE STYLE CONTROLS EDITOR ---
const ControlsEditor = ({ controls, onChange }: { controls: PresetControl[], onChange: (c: PresetControl[]) => void }) => {
    // Local state to hold the raw string values for each input to prevent "vanishing spaces" while typing
    const [localValues, setLocalValues] = useState<Record<string, { label: string, options: string }>>({});
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            const textareas = containerRef.current.querySelectorAll('textarea');
            textareas.forEach(ta => {
                ta.style.height = 'auto';
                ta.style.height = `${ta.scrollHeight}px`;
            });
        }
    }, [controls]);

    const handleUpdate = (id: string, updates: Partial<PresetControl>) => {
        onChange(controls.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const handleOptionsChange = (id: string, val: string) => {
        // 1. Update local string value immediately (so cursor/spaces stay)
        setLocalValues(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || { label: controls.find(c => c.id === id)?.label || '' }),
                options: val
            }
        }));

        // 2. Map to data structure for persistence (only filter/trim for data, not for the display value)
        const labels = val.split(',').map(s => s.trim()).filter(s => s);
        const options = labels.map(l => ({ id: generateId(), label: l, value: l }));
        handleUpdate(id, { options });
    };

    const handleLabelChange = (id: string, val: string) => {
        setLocalValues(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || { options: controls.find(c => c.id === id)?.options.map(o => o.label).join(', ') || '' }),
                label: val
            }
        }));
        handleUpdate(id, { label: val });
    };

    const addRow = () => {
        const newId = generateId();
        const newCtrl: PresetControl = {
            id: newId,
            label: 'Neue Variable',
            options: []
        };
        onChange([...controls, newCtrl]);
    };

    const removeRow = (id: string) => {
        onChange(controls.filter(c => c.id !== id));
        setLocalValues(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const grid = "grid-cols-[1fr_2fr_32px]";

    return (
        <div ref={containerRef} className="border border-zinc-100 dark:border-zinc-800/50 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 transition-all dark:">
            {/* Header */}
            <div className={`grid ${grid} bg-zinc-50/50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500`}>
                <div className="p-2.5 pl-4">Label</div>
                <div className="p-2.5 border-l border-zinc-100 dark:border-zinc-800">Optionen (kommagetrennt)</div>
                <div className="p-2.5"></div>
            </div>

            {/* Content */}
            <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                {controls.map((ctrl) => (
                    <div key={ctrl.id} className={`grid ${grid} items-start group hover:bg-zinc-50/30 dark:hover:bg-zinc-900/30 transition-all duration-200`}>
                        <div className="p-0.5">
                            <TableInput
                                value={localValues[ctrl.id]?.label ?? ctrl.label}
                                onChange={e => handleLabelChange(ctrl.id, e.target.value)}
                                className="text-[12px] font-bold border-none h-9 bg-transparent focus:bg-white dark:focus:bg-zinc-900 rounded-lg px-2 transition-all placeholder:font-normal placeholder:opacity-30"
                                placeholder="z.B. Intensität"
                            />
                        </div>
                        <div className="p-0.5 border-l border-zinc-50 dark:border-zinc-800/50">
                            <textarea
                                value={localValues[ctrl.id]?.options ?? ctrl.options.map(o => o.label).join(', ')}
                                onChange={e => handleOptionsChange(ctrl.id, e.target.value)}
                                className="w-full text-[12px] text-zinc-500 dark:text-zinc-500 border-none min-h-[36px] bg-transparent focus:bg-white dark:focus:bg-zinc-900 rounded-lg px-2 py-2 transition-all placeholder:font-normal placeholder:opacity-30 resize-none overflow-hidden leading-relaxed"
                                placeholder="leicht, mittel, stark"
                                rows={1}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${target.scrollHeight}px`;
                                }}
                            />
                        </div>
                        <div className="p-0.5 pt-1.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                            <button
                                onClick={() => removeRow(ctrl.id)}
                                className="text-zinc-300 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                                <Trash className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Add Row Button */}
                <button
                    onClick={addRow}
                    className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all active:scale-[0.99]"
                >
                    <Plus className="w-3.5 h-3.5" /> Variable hinzufügen
                </button>
            </div>
        </div>
    );
};
