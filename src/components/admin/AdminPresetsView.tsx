import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, Loader2, Bookmark, Check, ArrowRight, GripVertical } from 'lucide-react';
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
                                    : 'border-transparent hover:bg-zinc-100/30 dark:hover:bg-zinc-800/20'}`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className={`text-[13px] font-bold truncate ${selectedId === group.baseId ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                        {group.de?.title || group.baseId}
                                    </div>
                                    <div className="text-[9px] text-zinc-400 truncate font-medium opacity-60">
                                        ID: {group.baseId}
                                    </div>
                                </div>
                                <ArrowRight className={`w-3 h-3 transition-transform ${selectedId === group.baseId ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:opacity-40'}`} />
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT SIDE: Editor */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950">
                {!selectedId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-300 gap-4">
                        <Bookmark className="w-12 h-12 opacity-10" strokeWidth={1} />
                        <p className="text-xs font-medium opacity-40">Wähle eine Vorlage aus</p>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto p-8 lg:p-10 max-w-6xl w-full mx-auto space-y-12 no-scrollbar">

                            {/* Header Info */}
                            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-8">
                                <div className="space-y-1">
                                    <span className="text-[9px] uppercase tracking-widest font-black text-zinc-300 dark:text-zinc-600">ID: {selectedId}</span>
                                    <h1 className={`${Typo.H1} text-2xl font-black`}>{formState.de.title || 'Neuer Preset'}</h1>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(true)} className="text-zinc-400 hover:text-red-500 h-9 px-3">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                    <Button onClick={handleSave} disabled={isSaving} className="h-9 px-8 shadow-sm" icon={isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}>
                                        {isSaving ? 'Speichert...' : t('save')}
                                    </Button>
                                </div>
                            </div>

                            {/* Dual Language Form */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                                {/* DE Column */}
                                <div className="space-y-8">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black border border-amber-200 text-amber-600 px-2 py-0.5 rounded uppercase tracking-widest">Deutsch</span>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <SectionHeader className="mb-1 text-[9px]">Titel (DE)</SectionHeader>
                                            <TableInput className="text-lg font-black h-10 px-0 bg-transparent" value={formState.de.title} onChange={e => setFormState(s => ({ ...s, de: { ...s.de, title: e.target.value } }))} placeholder="z.B. Fotos weichzeichnen" />
                                        </div>

                                        <div className="space-y-2">
                                            <SectionHeader className="mb-1 text-[9px]">Prompt (DE)</SectionHeader>
                                            <TextArea className="min-h-[180px] text-[13px] leading-relaxed p-4 bg-zinc-50 dark:bg-zinc-900/30 border-none text-zinc-700 dark:text-zinc-300 font-mono focus:bg-white dark:focus:bg-zinc-900 rounded-2xl" value={formState.de.prompt} onChange={e => setFormState(s => ({ ...s, de: { ...s.de, prompt: e.target.value } }))} placeholder="Prompt-Text hier..." />
                                        </div>

                                        <div className="pt-4">
                                            <SectionHeader className="mb-4 text-[9px]">Variablen (DE)</SectionHeader>
                                            <ControlsEditor
                                                controls={formState.de.controls}
                                                onChange={(ctrls) => setFormState(s => ({ ...s, de: { ...s.de, controls: ctrls } }))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* EN Column */}
                                <div className="space-y-8">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black border border-blue-200 text-blue-600 px-2 py-0.5 rounded uppercase tracking-widest">English</span>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <SectionHeader className="mb-1 text-[9px]">Title (EN)</SectionHeader>
                                            <TableInput className="text-lg font-black h-10 px-0 bg-transparent" value={formState.en.title} onChange={e => setFormState(s => ({ ...s, en: { ...s.en, title: e.target.value } }))} placeholder="e.g. Blur Photos" />
                                        </div>

                                        <div className="space-y-2">
                                            <SectionHeader className="mb-1 text-[9px]">Prompt (EN)</SectionHeader>
                                            <TextArea className="min-h-[180px] text-[13px] leading-relaxed p-4 bg-zinc-50 dark:bg-zinc-900/30 border-none text-zinc-700 dark:text-zinc-300 font-mono focus:bg-white dark:focus:bg-zinc-900 rounded-2xl" value={formState.en.prompt} onChange={e => setFormState(s => ({ ...s, en: { ...s.en, prompt: e.target.value } }))} placeholder="Prompt text here..." />
                                        </div>

                                        <div className="pt-4">
                                            <SectionHeader className="mb-4 text-[9px]">Variables (EN)</SectionHeader>
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
                title="Vorlage löschen?"
                description="Möchtest du diese Vorlage wirklich dauerhaft entfernen?"
                confirmLabel="Löschen"
                cancelLabel="Abbrechen"
                onConfirm={handleDelete}
                onCancel={() => setIsDeleteDialogOpen(false)}
                variant="danger"
            />
        </div>
    );
};

// --- TABLE STYLE CONTROLS EDITOR ---
const ControlsEditor = ({ controls, onChange }: { controls: PresetControl[], onChange: (c: PresetControl[]) => void }) => {

    const handleUpdate = (id: string, updates: Partial<PresetControl>) => {
        onChange(controls.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const handleOptionsChange = (id: string, val: string) => {
        const labels = val.split(',').map(s => s.trim()).filter(s => s);
        const options = labels.map(l => ({ id: generateId(), label: l, value: l }));
        handleUpdate(id, { options });
    };

    const addRow = () => {
        const newCtrl: PresetControl = {
            id: generateId(),
            label: 'Neue Variable',
            options: []
        };
        onChange([...controls, newCtrl]);
    };

    const removeRow = (id: string) => {
        onChange(controls.filter(c => c.id !== id));
    };

    const grid = "grid-cols-[1fr_2fr_32px]";

    return (
        <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden bg-zinc-50/30 dark:bg-zinc-900/10">
            {/* Header */}
            <div className={`grid ${grid} bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 text-[9px] font-black uppercase tracking-wider text-zinc-400`}>
                <div className="p-2 pl-4">Label</div>
                <div className="p-2 border-l border-zinc-100 dark:border-zinc-800">Optionen (kommagetrennt)</div>
                <div className="p-2"></div>
            </div>

            {/* Content */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {controls.map((ctrl) => (
                    <div key={ctrl.id} className={`grid ${grid} items-center group hover:bg-white dark:hover:bg-zinc-900 transition-colors`}>
                        <div className="p-0.5 pl-3">
                            <TableInput
                                value={ctrl.label}
                                onChange={e => handleUpdate(ctrl.id, { label: e.target.value })}
                                className="text-[11px] font-bold border-none h-8"
                                placeholder="z.B. Intensität"
                            />
                        </div>
                        <div className="p-0.5 border-l border-zinc-100 dark:border-zinc-800">
                            <TableInput
                                value={ctrl.options.map(o => o.label).join(', ')}
                                onChange={e => handleOptionsChange(ctrl.id, e.target.value)}
                                className="text-[11px] text-zinc-500 border-none h-8"
                                placeholder="leicht, mittel, stark"
                            />
                        </div>
                        <div className="p-1 flex items-center justify-center">
                            <button
                                onClick={() => removeRow(ctrl.id)}
                                className="text-zinc-200 hover:text-red-500 transition-colors p-1"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Add Row Button */}
                <button
                    onClick={addRow}
                    className="w-full py-2.5 flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-900 transition-all"
                >
                    <Plus className="w-3.5 h-3.5" /> Variable hinzufügen
                </button>
            </div>
        </div>
    );
};
