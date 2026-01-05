import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, Loader2, Bookmark, Check, ArrowRight } from 'lucide-react';
import { TranslationFunction, PromptTemplate, PresetControl } from '@/types';
import { Typo, Button, Input, TextArea, SectionHeader, Theme, IconButton } from '@/components/ui/DesignSystem';
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
            const data = await adminService.getGlobalPresets();
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
                    isPinned: true, isCustom: false, isDefault: false, usageCount: 0
                });
            }

            // Save EN if provided
            if (hasEn) {
                await adminService.updateGlobalPreset({
                    id: selectedId + '-en',
                    lang: 'en',
                    ...formState.en,
                    isPinned: true, isCustom: false, isDefault: false, usageCount: 0
                });
            }

            await fetchPresets();
            showToast('Erfolgreich gespeichert', 'success');
        } catch (error: any) {
            console.error('Save failed:', error);
            showToast(error.message || 'Fehler beim Speichern', 'error');
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
            showToast('Vorlage gelöscht', 'success');
        } catch (error) {
            showToast('Fehler beim Löschen', 'error');
        } finally {
            setIsDeleteDialogOpen(false);
        }
    };

    return (
        <div className="flex flex-1 min-h-0 overflow-hidden bg-white dark:bg-zinc-950">
            {/* LEFT SIDEBAR: List */}
            <div className="w-[320px] flex flex-col border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
                <div className="p-6 pb-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className={`${Typo.H2} font-bold`}>{t('admin_presets')}</h2>
                        <IconButton icon={<Plus className="w-4 h-4" />} onClick={handleNew} className="bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700" />
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <Input
                            className="pl-9 bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 h-9 text-xs"
                            placeholder={t('search_presets')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                    {loading && allPresets.length === 0 ? (
                        <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-300" /></div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="p-10 text-center text-xs text-zinc-400">{t('no_entries_found')}</div>
                    ) : (
                        filteredGroups.map(group => (
                            <button
                                key={group.baseId}
                                onClick={() => handleSelect(group.baseId)}
                                className={`w-full text-left px-6 py-3.5 flex items-center justify-between group transition-all border-l-2 ${selectedId === group.baseId
                                    ? 'bg-zinc-100 dark:bg-zinc-800/50 border-zinc-900 dark:border-white'
                                    : 'border-transparent hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30'}`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-semibold truncate ${selectedId === group.baseId ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                        {group.de?.title || group.baseId}
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium opacity-60">
                                        ID: {group.baseId}
                                    </div>
                                </div>
                                <ArrowRight className={`w-3.5 h-3.5 transition-transform ${selectedId === group.baseId ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:opacity-40'}`} />
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT SIDE: Editor */}
            <div className="flex-1 flex flex-col min-w-0">
                {!selectedId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-300 gap-4">
                        <Bookmark className="w-16 h-16 opacity-10" strokeWidth={1} />
                        <p className="text-sm font-medium opacity-40">Wähle eine Vorlage zum Bearbeiten</p>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto p-12 lg:p-16 max-w-5xl w-full mx-auto space-y-16 no-scrollbar">

                            {/* Header Info */}
                            <div className="flex items-end justify-between border-b border-zinc-100 dark:border-zinc-800 pb-10">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Vorlage bearbeiten</span>
                                    <h1 className={`${Typo.H1} text-3xl font-black`}>{formState.de.title || 'Ohne Titel'}</h1>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="danger" onClick={() => setIsDeleteDialogOpen(true)} className="bg-transparent text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 h-10 border-none">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                    <Button onClick={handleSave} disabled={isSaving} className="h-10 px-10 shadow-lg shadow-zinc-200 dark:shadow-black/20" icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}>
                                        {isSaving ? 'Speichert...' : t('save')}
                                    </Button>
                                </div>
                            </div>

                            {/* Dual Language Form */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

                                {/* DE Column */}
                                <div className="space-y-12">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-3 py-1 rounded-full uppercase tracking-wider">Deutsch</span>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <SectionHeader>Titel (DE)</SectionHeader>
                                            <Input className="text-xl font-bold h-14 bg-zinc-50 dark:bg-zinc-900/40 border-none shadow-none focus:bg-white dark:focus:bg-zinc-900" value={formState.de.title} onChange={e => setFormState(s => ({ ...s, de: { ...s.de, title: e.target.value } }))} placeholder="Name der Vorlage..." />
                                        </div>

                                        <div className="space-y-3">
                                            <SectionHeader>Prompt (DE)</SectionHeader>
                                            <TextArea className="min-h-[250px] text-[13px] leading-relaxed p-6 bg-zinc-50 dark:bg-zinc-900/40 border-none text-zinc-700 dark:text-zinc-300 font-mono focus:bg-white dark:focus:bg-zinc-900" value={formState.de.prompt} onChange={e => setFormState(s => ({ ...s, de: { ...s.de, prompt: e.target.value } }))} placeholder="Der Prompt für die Generierung..." />
                                        </div>

                                        <div className="space-y-4 pt-4">
                                            <SectionHeader>Variablen (DE)</SectionHeader>
                                            <ControlsEditor
                                                controls={formState.de.controls}
                                                onChange={(ctrls) => setFormState(s => ({ ...s, de: { ...s.de, controls: ctrls } }))}
                                                t={t}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* EN Column */}
                                <div className="space-y-12">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-[10px] font-black bg-blue-100 text-blue-900 px-3 py-1 rounded-full uppercase tracking-wider">English</span>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <SectionHeader>Title (EN)</SectionHeader>
                                            <Input className="text-xl font-bold h-14 bg-zinc-50 dark:bg-zinc-900/40 border-none shadow-none focus:bg-white dark:focus:bg-zinc-900" value={formState.en.title} onChange={e => setFormState(s => ({ ...s, en: { ...s.en, title: e.target.value } }))} placeholder="Template name..." />
                                        </div>

                                        <div className="space-y-3">
                                            <SectionHeader>Prompt (EN)</SectionHeader>
                                            <TextArea className="min-h-[250px] text-[13px] leading-relaxed p-6 bg-zinc-50 dark:bg-zinc-900/40 border-none text-zinc-700 dark:text-zinc-300 font-mono focus:bg-white dark:focus:bg-zinc-900" value={formState.en.prompt} onChange={e => setFormState(s => ({ ...s, en: { ...s.en, prompt: e.target.value } }))} placeholder="The generation prompt..." />
                                        </div>

                                        <div className="space-y-4 pt-4">
                                            <SectionHeader>Variables (EN)</SectionHeader>
                                            <ControlsEditor
                                                controls={formState.en.controls}
                                                onChange={(ctrls) => setFormState(s => ({ ...s, en: { ...s.en, controls: ctrls } }))}
                                                t={t}
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
                title="Vorlage löschen?"
                description="Möchtest du diese Vorlage und ihre englische Übersetzung wirklich dauerhaft entfernen?"
                confirmLabel="Löschen"
                cancelLabel="Abbrechen"
                onConfirm={handleDelete}
                onCancel={() => setIsDeleteDialogOpen(false)}
                variant="danger"
            />
        </div>
    );
};

// --- Sub-Component for Controls Editor ---
const ControlsEditor = ({ controls, onChange, t }: { controls: PresetControl[], onChange: (c: PresetControl[]) => void, t: TranslationFunction }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [newOptions, setNewOptions] = useState('');

    const addControl = () => {
        if (!newLabel) return;
        const optionsArray = newOptions.split(',').map(s => s.trim()).filter(s => s);
        const newCtrl: PresetControl = {
            id: generateId(),
            label: newLabel,
            options: optionsArray.map(o => ({ id: generateId(), label: o, value: o }))
        };
        onChange([...controls, newCtrl]);
        setIsAdding(false); setNewLabel(''); setNewOptions('');
    };

    const removeControl = (id: string) => {
        onChange(controls.filter(c => c.id !== id));
    };

    return (
        <div className="space-y-4">
            {controls.map((ctrl) => (
                <div key={ctrl.id} className="relative group p-5 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                    <button onClick={() => removeControl(ctrl.id)} className="absolute top-4 right-4 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2">{ctrl.label}</div>
                    <div className="flex flex-wrap gap-1.5">
                        {ctrl.options.map(o => (
                            <span key={o.id} className="text-[10px] px-2 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-zinc-500 rounded-md">
                                {o.label}
                            </span>
                        ))}
                    </div>
                </div>
            ))}

            {isAdding ? (
                <div className="p-6 bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4">
                    <Input className="h-10 text-xs" label="Angezeigter Name" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="z.B. Wetter" autoFocus />
                    <Input className="h-10 text-xs" label="Optionen (mit Komma getrennt)" value={newOptions} onChange={e => setNewOptions(e.target.value)} placeholder="sonnig, bewölkt, Regen" />
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setIsAdding(false)} className="text-xs font-bold text-zinc-400">Abbrechen</button>
                        <Button onClick={addControl} className="h-8 px-4 text-xs font-bold">Variable hinzufügen</Button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full py-4 flex items-center justify-center gap-2 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all text-xs font-bold"
                >
                    <Plus className="w-4 h-4" /> Variable hinzufügen
                </button>
            )}
        </div>
    );
};
