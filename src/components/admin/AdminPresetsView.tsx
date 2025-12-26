import React, { useState, useEffect } from 'react';
import { Search, Plus, Pen, Trash2, Tag, ChevronRight, Bookmark, GripVertical, Loader2 } from 'lucide-react';
import { TranslationFunction, PromptTemplate, PresetControl, PresetTag } from '@/types';
import { Typo, Button, Input, IconButton, Tooltip, TableInput } from '@/components/ui/DesignSystem';
import { adminService } from '@/services/adminService';
import { PresetEditorModal } from '@/components/modals/PresetEditorModal';
import { generateId } from '@/utils/ids';

interface AdminPresetsViewProps {
    t: TranslationFunction;
}

export const AdminPresetsView: React.FC<AdminPresetsViewProps> = ({ t }) => {
    const [globalPresets, setGlobalPresets] = useState<PromptTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [presetSearch, setPresetSearch] = useState('');
    const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
    const [editingPreset, setEditingPreset] = useState<PromptTemplate | null>(null);

    // Language & Category State
    const [activeLang, setActiveLang] = useState<'de' | 'en'>('de');

    // Tag Management State (Keep local for now, can be synced later if needed)
    const [availableTags, setAvailableTags] = useState<PresetTag[]>([]);
    const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

    // Drag State
    const [draggedPresetId, setDraggedPresetId] = useState<string | null>(null);

    useEffect(() => {
        fetchPresets();
    }, []);

    const fetchPresets = async () => {
        setLoading(true);
        try {
            const data = await adminService.getGlobalPresets();
            setGlobalPresets(data);

            // Extract unique tags for the sidebar
            const tags = new Set<string>();
            data.forEach(p => p.tags.forEach(t => tags.add(t)));
            setAvailableTags(Array.from(tags).map(t => ({ id: t, de: t, en: t })));
        } catch (error) {
            console.error('Failed to fetch presets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePresets = async (data: { title: string; prompt: string; tags: string[]; controls: PresetControl[]; lang: 'de' | 'en' }[]) => {
        try {
            for (const item of data) {
                const presetToSave = editingPreset
                    ? { ...editingPreset, ...item }
                    : {
                        id: generateId(),
                        ...item,
                        isPinned: false,
                        isCustom: false,
                        usageCount: 0,
                        createdAt: Date.now()
                    };

                await adminService.updateGlobalPreset(presetToSave);
            }
            await fetchPresets();
            setIsPresetModalOpen(false);
            setEditingPreset(null);
        } catch (error) {
            alert(t('admin_save_error') || 'Failed to save preset');
        }
    };

    const handleDeletePreset = async (id: string) => {
        if (confirm(t('admin_confirm_delete_preset'))) {
            try {
                await adminService.deleteGlobalPreset(id);
                setGlobalPresets(prev => prev.filter(p => p.id !== id));
            } catch (error) {
                alert(t('admin_delete_error') || 'Failed to delete preset');
            }
        }
    };

    const handleTogglePin = async (id: string) => {
        const preset = globalPresets.find(p => p.id === id);
        if (!preset) return;

        try {
            const updated = { ...preset, isPinned: !preset.isPinned };
            await adminService.updateGlobalPreset(updated);
            setGlobalPresets(prev => prev.map(p => p.id === id ? updated : p));
        } catch (error) {
            alert(t('admin_pin_error') || 'Failed to toggle pin');
        }
    };

    // --- Tag Management Handlers ---
    const handleAddTag = () => {
        const newTag: PresetTag = { id: generateId(), de: 'Neue Kategorie', en: 'New Category' };
        setAvailableTags(prev => [...prev, newTag]);
    };

    const handleUpdateTag = (id: string, field: 'de' | 'en', value: string) => {
        setAvailableTags(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleDeleteTag = (id: string) => {
        if (confirm(t('admin_confirm_delete_category'))) {
            setAvailableTags(prev => prev.filter(t => t.id !== id));
            if (selectedTagId === id) setSelectedTagId(null);
        }
    };

    // --- Drag & Drop Handlers ---
    const onDragStart = (e: React.DragEvent, id: string) => {
        if (presetSearch) {
            e.preventDefault(); // Disable drag when searching to avoid index confusion
            return;
        }
        setDraggedPresetId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedPresetId || draggedPresetId === targetId) return;

        // Reorder logic: We reorder globalPresets directly. 
        // Note: This only works visually well if we are viewing the full list or a clean subset.
        // Since we filter by language, we must find the indices in the main array.

        const fromIndex = globalPresets.findIndex(p => p.id === draggedPresetId);
        const toIndex = globalPresets.findIndex(p => p.id === targetId);

        if (fromIndex < 0 || toIndex < 0) return;

        const newPresets = [...globalPresets];
        const [moved] = newPresets.splice(fromIndex, 1);
        newPresets.splice(toIndex, 0, moved);
        setGlobalPresets(newPresets);
    };

    const filteredPresets = globalPresets.filter(p => {
        const langMatch = (p.lang || 'de') === activeLang;
        if (!langMatch) return false;

        const matchesSearch =
            p.title.toLowerCase().includes(presetSearch.toLowerCase()) ||
            p.prompt.toLowerCase().includes(presetSearch.toLowerCase()) ||
            p.tags.some(t => t.toLowerCase().includes(presetSearch.toLowerCase()));

        let matchesCategory = true;
        if (selectedTagId) {
            const tag = availableTags.find(t => t.id === selectedTagId);
            if (tag) {
                const labelToMatch = activeLang === 'de' ? tag.de : tag.en;
                matchesCategory = p.tags.includes(labelToMatch);
            }
        }

        return matchesSearch && matchesCategory;
    });

    return (
        <div className="h-full flex flex-col md:flex-row min-h-0 bg-zinc-50/50 dark:bg-zinc-950/50">

            {/* LEFT COLUMN: Categories */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-900 shrink-0">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                    <h3 className={Typo.H2}>{t('categories')}</h3>
                    <Button variant="ghost" onClick={handleAddTag} icon={<Plus className="w-4 h-4" />} className="h-8 w-8 p-0" />
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    <div className="space-y-1">
                        <button
                            onClick={() => setSelectedTagId(null)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedTagId === null ? 'bg-zinc-100 dark:bg-zinc-800 font-medium' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                        >
                            <span>{t('all_presets')}</span>
                            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                        </button>

                        {availableTags.map(tag => {
                            const isActive = selectedTagId === tag.id;
                            return (
                                <div
                                    key={tag.id}
                                    className={`
                                    group relative flex flex-col gap-1 px-3 py-2 rounded-lg border transition-all cursor-pointer
                                    ${isActive ? 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 shadow-sm' : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}
                                `}
                                    onClick={() => setSelectedTagId(tag.id)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Tag className={`w-3.5 h-3.5 ${isActive ? 'text-black dark:text-white' : 'text-zinc-400'}`} />
                                        <TableInput
                                            value={tag.de}
                                            onChange={(e) => handleUpdateTag(tag.id, 'de', e.target.value)}
                                            className={`font-medium w-full ${isActive ? 'text-black dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}
                                            placeholder={t('name_de')}
                                        />
                                        <IconButton
                                            icon={<Trash2 className="w-3.5 h-3.5" />}
                                            onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag.id); }}
                                            className="opacity-0 group-hover:opacity-100 hover:text-red-500"
                                        />
                                    </div>
                                    <TableInput
                                        value={tag.en}
                                        onChange={(e) => handleUpdateTag(tag.id, 'en', e.target.value)}
                                        className="text-[10px] text-zinc-400 ml-2 w-full"
                                        placeholder={t('name_en')}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Presets List */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header / Toolbar */}
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div>
                            <h2 className={Typo.H1}>{t('admin_presets')}</h2>
                            <p className={Typo.Micro}>{t('admin_presets_desc')}</p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Lang Toggle */}
                            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg shrink-0">
                                {(['de', 'en'] as const).map(l => (
                                    <button
                                        key={l}
                                        onClick={() => setActiveLang(l)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeLang === l ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'}`}
                                    >
                                        {t(l === 'de' ? 'lang_de' : 'lang_en')}
                                    </button>
                                ))}
                            </div>

                            {/* Search */}
                            <div className="relative w-full md:w-56">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <Input
                                    className="pl-9 py-2 text-xs bg-white dark:bg-zinc-900"
                                    placeholder={t('search_presets')}
                                    value={presetSearch}
                                    onChange={(e) => setPresetSearch(e.target.value)}
                                />
                            </div>

                            <Button
                                onClick={() => { setEditingPreset(null); setIsPresetModalOpen(true); }}
                                icon={<Plus className="w-4 h-4" />}
                                className="shrink-0 whitespace-nowrap px-4"
                            >
                                {t('new_preset')}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                                <tr>
                                    <th className="px-2 py-3 w-10 text-center"></th> {/* Grip */}
                                    <th className="px-2 py-3 w-10 text-center"><Bookmark className="w-3.5 h-3.5 mx-auto opacity-50" /></th>
                                    <th className="px-4 py-3 font-medium">{t('admin_preset_title')}</th>
                                    <th className="px-4 py-3 font-medium">{t('admin_preset_prompt')}</th>
                                    <th className="px-4 py-3 font-medium">{t('variables_label')}</th>
                                    <th className="px-4 py-3 font-medium">{t('tags_label')}</th>
                                    <th className="px-4 py-3 font-medium text-right">{t('admin_preset_usage')}</th>
                                    <th className="px-4 py-3 font-medium w-24 text-right">{t('actions_label')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {filteredPresets.map(preset => (
                                    <tr
                                        key={preset.id}
                                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group"
                                        draggable={!presetSearch}
                                        onDragStart={(e) => onDragStart(e, preset.id)}
                                        onDragOver={(e) => onDragOver(e, preset.id)}
                                        onDragEnd={() => setDraggedPresetId(null)}
                                    >
                                        <td className="px-2 py-3 text-center cursor-move text-zinc-300 hover:text-zinc-500">
                                            {!presetSearch && <GripVertical className="w-3.5 h-3.5 mx-auto" />}
                                        </td>
                                        <td className="px-2 py-3 text-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleTogglePin(preset.id); }}
                                                className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-amber-500"
                                            >
                                                <Bookmark className={`w-3.5 h-3.5 ${preset.isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-black dark:text-white whitespace-nowrap">
                                            {preset.title}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 max-w-xs truncate" title={preset.prompt}>
                                            {preset.prompt}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">
                                            {preset.controls && preset.controls.length > 0
                                                ? preset.controls.map(c => c.label).join(', ')
                                                : <span className="text-zinc-300 dark:text-zinc-700">-</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {preset.tags.slice(0, 2).map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                                                        {tag}
                                                    </span>
                                                ))}
                                                {preset.tags.length > 2 && (
                                                    <span className="text-[10px] text-zinc-400 px-1">+{preset.tags.length - 2}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-zinc-500">{preset.usageCount}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip text={t('edit')}>
                                                    <IconButton
                                                        icon={<Pen className="w-3.5 h-3.5" />}
                                                        onClick={() => { setEditingPreset(preset); setIsPresetModalOpen(true); }}
                                                    />
                                                </Tooltip>
                                                <Tooltip text={t('delete')}>
                                                    <IconButton
                                                        icon={<Trash2 className="w-3.5 h-3.5" />}
                                                        onClick={() => handleDeletePreset(preset.id)}
                                                        className="hover:text-red-500"
                                                    />
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredPresets.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                                            {t('no_objects')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isPresetModalOpen && (
                <PresetEditorModal
                    isOpen={isPresetModalOpen}
                    onClose={() => setIsPresetModalOpen(false)}
                    mode={editingPreset ? 'edit' : 'create'}
                    scope="admin"
                    initialTemplate={editingPreset}
                    existingTemplates={globalPresets}
                    onSave={handleSavePresets}
                    onDelete={handleDeletePreset}
                    t={t}
                />
            )}
        </div>
    );
};
