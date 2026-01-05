import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, Loader2, Bookmark, Check, ArrowRight } from 'lucide-react';
import { TranslationFunction, PromptTemplate, PresetControl } from '@/types';
import { Typo, Button, Input, TextArea, SectionHeader, Theme, IconButton } from '@/components/ui/DesignSystem';
import { adminService } from '@/services/adminService';
import { generateId } from '@/utils/ids';

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
        setIsSaving(true);
        try {
            // Update DE
            await adminService.updateGlobalPreset({
                id: selectedId,
                lang: 'de',
                ...formState.de,
                isPinned: true, isCustom: false, isDefault: false, usageCount: 0
            });
            // Update EN
            await adminService.updateGlobalPreset({
                id: selectedId + '-en',
                lang: 'en',
                ...formState.en,
                isPinned: true, isCustom: false, isDefault: false, usageCount: 0
            });
            await fetchPresets();
        } catch (error) {
            alert('Fehler beim Speichern');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedId || !window.confirm(t('admin_delete_preset_desc'))) return;
        try {
            await adminService.deleteGlobalPreset(selectedId);
            await adminService.deleteGlobalPreset(selectedId + '-en');
            await fetchPresets();
            setSelectedId(null);
        } catch (error) {
            alert('Fehler beim Löschen');
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
                                    <Button variant="danger" onClick={handleDelete} className="bg-transparent text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 h-10 border-none">
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
                                <div className="space-y-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded uppercase tracking-wider">Deutsch</span>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <SectionHeader>Titel (DE)</SectionHeader>
                                            <Input className="text-lg font-bold h-12" value={formState.de.title} onChange={e => setFormState(s => ({ ...s, de: { ...s.de, title: e.target.value } }))} placeholder="Name der Vorlage..." />
                                        </div>

                                        <div className="space-y-3">
                                            <SectionHeader>Prompt (DE)</SectionHeader>
                                            <TextArea className="min-h-[220px] text-sm leading-relaxed p-5 bg-zinc-50 dark:bg-zinc-900/50 border-none text-zinc-700 dark:text-zinc-300 font-mono" value={formState.de.prompt} onChange={e => setFormState(s => ({ ...s, de: { ...s.de, prompt: e.target.value } }))} placeholder="Der Prompt für die Generierung..." />
                                        </div>
                                    </div>
                                </div>

                                {/* EN Column */}
                                <div className="space-y-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-[10px] font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded uppercase tracking-wider">English</span>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <SectionHeader>Title (EN)</SectionHeader>
                                            <Input className="text-lg font-bold h-12" value={formState.en.title} onChange={e => setFormState(s => ({ ...s, en: { ...s.en, title: e.target.value } }))} placeholder="Template name..." />
                                        </div>

                                        <div className="space-y-3">
                                            <SectionHeader>Prompt (EN)</SectionHeader>
                                            <TextArea className="min-h-[220px] text-sm leading-relaxed p-5 bg-zinc-50 dark:bg-zinc-900/50 border-none text-zinc-700 dark:text-zinc-300 font-mono" value={formState.en.prompt} onChange={e => setFormState(s => ({ ...s, en: { ...s.en, prompt: e.target.value } }))} placeholder="The generation prompt..." />
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Controls Section (Common for now) */}
                            <div className="pt-10 border-t border-zinc-100 dark:border-zinc-800">
                                <SectionHeader className="mb-6">Variablen & Controls (DE Context)</SectionHeader>
                                <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-3xl p-8 border border-zinc-100 dark:border-zinc-800 text-center">
                                    <p className="text-xs text-zinc-500">Variablen-Editor wird in Kürze in dieses Layout integriert. Aktuell werden die existierenden Controls beibehalten.</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
