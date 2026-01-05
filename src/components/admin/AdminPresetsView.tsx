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
            data.forEach(p => (p.tags || []).forEach(t => tags.add(t)));
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
                        isDefault: false,
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

    const handleToggleDefault = async (id: string) => {
        const preset = globalPresets.find(p => p.id === id);
        if (!preset) return;

        try {
            const updated = { ...preset, isDefault: !preset.isDefault };
            await adminService.updateGlobalPreset(updated);
            setGlobalPresets(prev => prev.map(p => p.id === id ? updated : p));
        } catch (error) {
            alert('Failed to update default bookmark status');
        }
    };

    // --- Tag Management Handlers ---
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    const handleRenameCategory = async (oldDe: string, oldEn: string, newDe: string, newEn: string) => {
        setLoading(true);
        try {
            const updatedPresets = [...globalPresets];
            let changedCount = 0;

            for (let i = 0; i < updatedPresets.length; i++) {
                const p = updatedPresets[i];
                let hasChanged = false;
                const newTags = p.tags.map(tag => {
                    if (tag === oldDe) { hasChanged = true; return newDe; }
                    if (tag === oldEn) { hasChanged = true; return newEn; }
                    return tag;
                });

                if (hasChanged) {
                    const updated = { ...p, tags: newTags };
                    await adminService.updateGlobalPreset(updated);
                    updatedPresets[i] = updated;
                    changedCount++;
                }
            }

            if (changedCount > 0) {
                setGlobalPresets(updatedPresets);
                // Refresh categories
                const tagsSet = new Set<string>();
                updatedPresets.forEach(p => p.tags.forEach(t => tagsSet.add(t)));
                setAvailableTags(Array.from(tagsSet).map(t => ({ id: t, de: t, en: t })));
            }
        } catch (error) {
            console.error('Failed to rename categories in presets:', error);
            alert('Fehler beim Aktualisieren der Presets');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTag = () => {
        const newTag: PresetTag = { id: generateId(), de: 'Neue Kategorie', en: 'New Category' };
        setAvailableTags(prev => [...prev, newTag]);
    };

    const handleUpdateTag = (id: string, field: 'de' | 'en', value: string) => {
        const oldTag = availableTags.find(t => t.id === id);
        if (!oldTag) return;
        setAvailableTags(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleDeleteTag = (id: string) => {
        const tag = availableTags.find(t => t.id === id);
        if (!tag) return;

        if (confirm(t('admin_confirm_delete_category'))) {
            setAvailableTags(prev => prev.filter(t => t.id !== id));
            if (selectedTagId === id) setSelectedTagId(null);

            // Removing tag from presets locally
            const updatedPresets = globalPresets.map(p => ({
                ...p,
                tags: p.tags.filter(t => t !== tag.de && t !== tag.en)
            }));
            setGlobalPresets(updatedPresets);
        }
    };

    // --- Drag & Drop Handlers ---
    const onDragStart = (e: React.DragEvent, id: string) => {
        if (presetSearch) {
            e.preventDefault();
            return;
        }
        setDraggedPresetId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedPresetId || draggedPresetId === targetId) return;

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
            (p.tags || []).some(t => t.toLowerCase().includes(presetSearch.toLowerCase()));

        let matchesCategory = true;
        if (selectedTagId) {
            const tag = availableTags.find(t => t.id === selectedTagId);
            if (tag) {
                const labelToMatch = activeLang === 'de' ? tag.de : tag.en;
                matchesCategory = (p.tags || []).includes(labelToMatch);
            }
        }

        return matchesSearch && matchesCategory;
    });

    return (
        <div className="h-full flex flex-col min-h-0 bg-zinc-50/50 dark:bg-zinc-950/50">

            {/* Main Content Area */}
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
                                variant="secondary"
                                onClick={() => setIsCategoryModalOpen(true)}
                                icon={<Tag className="w-4 h-4" />}
                                className="shrink-0"
                            >
                                {t('manage_categories')}
                            </Button>

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

                {/* Categories Tab Row */}
                <div className="px-6 py-4 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto no-scrollbar scroll-smooth">
                    <button
                        onClick={() => setSelectedTagId(null)}
                        className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedTagId === null ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    >
                        {t('all_presets')}
                    </button>
                    {availableTags.map(tag => {
                        const isActive = selectedTagId === tag.id;
                        return (
                            <button
                                key={tag.id}
                                onClick={() => setSelectedTagId(tag.id)}
                                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                            >
                                {activeLang === 'de' ? tag.de : tag.en}
                            </button>
                        );
                    })}
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                                <tr>
                                    <th className="px-2 py-3 w-10 text-center"></th> {/* Grip */}
                                    <th className="px-4 py-3 font-medium">{t('admin_preset_title')}</th>
                                    <th className="px-4 py-3 font-medium">{t('admin_preset_prompt')}</th>
                                    <th className="px-4 py-3 font-medium">{t('variables_label')}</th>
                                    <th className="px-4 py-3 font-medium text-center">{t('tags_label')}</th>
                                    <th className="px-4 py-3 font-medium text-right">{t('admin_preset_usage')}</th>
                                    <th className="px-4 py-3 font-medium w-32 text-right">{t('actions_label')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {loading && globalPresets.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-300" />
                                        </td>
                                    </tr>
                                ) : filteredPresets.map(preset => (
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
                                        <td className="px-4 py-3 font-medium text-black dark:text-white whitespace-nowrap">
                                            {preset.title}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 max-w-xs truncate" title={preset.prompt}>
                                            {preset.prompt}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs text-center">
                                            {preset.controls && preset.controls.length > 0
                                                ? preset.controls.length
                                                : <span className="text-zinc-300 dark:text-zinc-700">-</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap items-center justify-center gap-1 min-w-[120px]">
                                                {preset.tags.slice(0, 4).map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded text-[10px] uppercase font-medium">
                                                        {tag}
                                                    </span>
                                                ))}
                                                {preset.tags.length > 4 && (
                                                    <span className="text-[10px] text-zinc-400 font-medium px-1">
                                                        +{preset.tags.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-zinc-500 font-mono text-xs">
                                            {preset.usageCount || 0}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <IconButton
                                                    icon={<Bookmark className={`w-3.5 h-3.5 ${preset.isDefault ? 'fill-blue-500 text-blue-500' : ''}`} />}
                                                    onClick={(e) => { e.stopPropagation(); handleToggleDefault(preset.id); }}
                                                    className={`${preset.isDefault ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity hover:text-blue-500`}
                                                    tooltip="System Standard Bookmark"
                                                />
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <IconButton
                                                        icon={<Pen className="w-3.5 h-3.5" />}
                                                        onClick={() => { setEditingPreset(preset); setIsPresetModalOpen(true); }}
                                                        tooltip={t('edit')}
                                                    />
                                                    <IconButton
                                                        icon={<Trash2 className="w-3.5 h-3.5" />}
                                                        className="hover:text-red-500"
                                                        onClick={() => handleDeletePreset(preset.id)}
                                                        tooltip={t('delete')}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredPresets.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                                            {t('no_objects')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <PresetEditorModal
                isOpen={isPresetModalOpen}
                mode={editingPreset ? 'edit' : 'create'}
                scope="admin"
                initialTemplate={editingPreset}
                existingTemplates={globalPresets}
                onClose={() => setIsPresetModalOpen(false)}
                onSave={(data) => handleSavePresets(data)}
                t={t}
            />

            <ManageCategoriesModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                availableTags={availableTags}
                onUpdate={handleUpdateTag}
                onAdd={handleAddTag}
                onDelete={handleDeleteTag}
                onRenameInPresets={handleRenameCategory}
                t={t}
            />
        </div>
    );
};

// --- Separate Modal Component ---
import { X } from 'lucide-react';
import { Theme } from '@/components/ui/DesignSystem';

const ManageCategoriesModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    availableTags: PresetTag[];
    onUpdate: (id: string, field: 'de' | 'en', value: string) => void;
    onAdd: () => void;
    onDelete: (id: string) => void;
    onRenameInPresets: (oldDe: string, oldEn: string, newDe: string, newEn: string) => Promise<void>;
    t: any;
}> = ({ isOpen, onClose, availableTags, onUpdate, onAdd, onDelete, onRenameInPresets, t }) => {
    if (!isOpen) return null;

    const [localTags, setLocalTags] = useState(availableTags);
    const [renaming, setRenaming] = useState<string | null>(null);

    useEffect(() => {
        setLocalTags(availableTags);
    }, [availableTags]);

    const handleApplyRename = async (tag: PresetTag) => {
        const original = availableTags.find(t => t.id === tag.id);
        if (!original) return;

        if (original.de !== tag.de || original.en !== tag.en) {
            setRenaming(tag.id);
            await onRenameInPresets(original.de, original.en, tag.de, tag.en);
            onUpdate(tag.id, 'de', tag.de);
            onUpdate(tag.id, 'en', tag.en);
            setRenaming(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-2xl bg-white dark:bg-zinc-900 ${Theme.Geometry.RadiusLg} shadow-2xl flex flex-col max-h-[80vh] overflow-hidden`}>
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                        <h2 className={Typo.H1}>{t('manage_categories')}</h2>
                        <p className={Typo.Micro}>Änderungen werden automatisch auf alle Presets angewendet.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={onAdd} icon={<Plus className="w-4 h-4" />}>
                            Neu
                        </Button>
                        <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <table className="w-full text-left text-sm">
                        <thead className="text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                            <tr>
                                <th className="pb-3 font-medium px-2">{t('name_de')}</th>
                                <th className="pb-3 font-medium px-2">{t('name_en')}</th>
                                <th className="pb-3 font-medium w-32 text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                            {localTags.map(tag => (
                                <tr key={tag.id} className="group">
                                    <td className="py-2 px-2">
                                        <TableInput
                                            value={tag.de}
                                            onChange={(e) => setLocalTags(prev => prev.map(lt => lt.id === tag.id ? { ...lt, de: e.target.value } : lt))}
                                            onBlur={() => handleApplyRename(tag)}
                                            className="font-medium"
                                        />
                                    </td>
                                    <td className="py-2 px-2">
                                        <TableInput
                                            value={tag.en}
                                            onChange={(e) => setLocalTags(prev => prev.map(lt => lt.id === tag.id ? { ...lt, en: e.target.value } : lt))}
                                            onBlur={() => handleApplyRename(tag)}
                                            className="text-zinc-500"
                                        />
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {renaming === tag.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
                                            <IconButton
                                                icon={<Trash2 className="w-3.5 h-3.5" />}
                                                className="text-zinc-400 hover:text-red-500"
                                                onClick={() => onDelete(tag.id)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {localTags.length === 0 && (
                        <div className="py-12 text-center text-zinc-400">
                            Keine Kategorien vorhanden.
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                    <Button onClick={onClose}>Fertig</Button>
                </div>
            </div>
        </div>
    );
};
