import React, { useState, useEffect } from 'react';
import { Search, Plus, Pen, Trash2, Tag, ChevronRight, Bookmark, GripVertical, Loader2 } from 'lucide-react';
import { TranslationFunction, PromptTemplate, PresetControl, PresetTag } from '@/types';
import { Typo, Button, Input, IconButton, Tooltip, TableInput } from '@/components/ui/DesignSystem';
import { adminService } from '@/services/adminService';
import { PresetEditorModal } from '@/components/modals/PresetEditorModal';
import { generateId } from '@/utils/ids';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';

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

    // Tag Management State
    const [availableTags, setAvailableTags] = useState<PresetTag[]>([]);
    const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

    // Drag State
    const [draggedPresetId, setDraggedPresetId] = useState<string | null>(null);

    // Modal/Select State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [presetToDelete, setPresetToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchPresets();
    }, []);

    const fetchPresets = async () => {
        setLoading(true);
        try {
            const data = await adminService.getGlobalPresets();
            setGlobalPresets(data);

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

    const handleDeletePreset = async () => {
        if (!presetToDelete) return;
        try {
            await adminService.deleteGlobalPreset(presetToDelete);
            setGlobalPresets(prev => prev.filter(p => p.id !== presetToDelete));
        } catch (error) {
            alert(t('admin_delete_error') || 'Failed to delete preset');
        } finally {
            setIsDeleteModalOpen(false);
            setPresetToDelete(null);
        }
    };

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

    const filteredPresets = (globalPresets || []).filter(p => {
        if (!p) return false;
        const langMatch = (p.lang || 'de') === activeLang;
        if (!langMatch) return false;

        const pTags = Array.isArray(p.tags) ? p.tags : [];
        const matchesSearch =
            (p.title || "").toLowerCase().includes((presetSearch || "").toLowerCase()) ||
            (p.prompt || "").toLowerCase().includes((presetSearch || "").toLowerCase()) ||
            pTags.some(t => t && typeof t === 'string' && t.toLowerCase().includes((presetSearch || "").toLowerCase()));

        let matchesCategory = true;
        if (selectedTagId) {
            const tag = availableTags.find(t => t.id === selectedTagId);
            if (tag) {
                const labelToMatch = activeLang === 'de' ? tag.de : tag.en;
                matchesCategory = pTags.includes(labelToMatch);
            }
        }

        return matchesSearch && matchesCategory;
    });

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <div className="p-8 pb-6 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    <div>
                        <h2 className={Typo.H1}>{t('admin_presets')}</h2>
                        <p className={Typo.Micro}>{t('admin_presets_desc')}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-zinc-50 dark:bg-zinc-800/50 p-1 rounded-xl shrink-0">
                            {(['de', 'en'] as const).map(l => (
                                <button
                                    key={l}
                                    onClick={() => setActiveLang(l)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeLang === l ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white' : 'text-zinc-500 hover:text-black dark:hover:text-white'}`}
                                >
                                    {t(l === 'de' ? 'lang_de' : 'lang_en')}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <Input
                                className="pl-9 bg-zinc-50 dark:bg-zinc-800/50 border-none h-9"
                                placeholder={t('search_presets')}
                                value={presetSearch}
                                onChange={(e) => setPresetSearch(e.target.value)}
                            />
                        </div>

                        <Button
                            onClick={() => { setEditingPreset(null); setIsPresetModalOpen(true); }}
                            icon={<Plus className="w-4 h-4" />}
                            className="h-9 px-4"
                        >
                            {t('new_preset')}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Tags Sidebar */}
                <div className="w-64 border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30 flex flex-col shrink-0">
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/10">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Filter Tags</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                        <button
                            onClick={() => setSelectedTagId(null)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedTagId ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white' : 'text-zinc-500 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Bookmark className="w-4 h-4" />
                                <span>Alle Presets</span>
                            </div>
                            <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 rounded text-zinc-500">{globalPresets.filter(p => (p.lang || 'de') === activeLang).length}</span>
                        </button>

                        {availableTags.map(tag => {
                            if (!tag) return null;
                            const labelToMatch = activeLang === 'de' ? tag.de : tag.en;
                            if (!labelToMatch) return null;

                            const count = globalPresets.filter(p =>
                                p &&
                                (p.lang || 'de') === activeLang &&
                                (p.tags || []).includes(labelToMatch)
                            ).length;

                            if (count === 0) return null;
                            return (
                                <button
                                    key={tag.id}
                                    onClick={() => setSelectedTagId(tag.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selectedTagId === tag.id ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white' : 'text-zinc-500 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4 opacity-40" />
                                        <span>{activeLang === 'de' ? tag.de : tag.en}</span>
                                    </div>
                                    <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 rounded text-zinc-500">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Presets Grid/List */}
                <div className="flex-1 overflow-y-auto p-8 pt-6">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-zinc-200" />
                        </div>
                    ) : filteredPresets.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-3">
                            <Bookmark className="w-12 h-12 opacity-10" />
                            <span className="text-sm">Keine Presets gefunden.</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                            {filteredPresets.map(preset => (
                                <div
                                    key={preset.id}
                                    className="group relative flex items-center gap-4 p-5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm"
                                    draggable
                                    onDragStart={(e) => onDragStart(e, preset.id)}
                                    onDragOver={(e) => onDragOver(e, preset.id)}
                                >
                                    <div className="cursor-move text-zinc-200 hover:text-zinc-400 transition-colors">
                                        <GripVertical className="w-4 h-4" />
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-sm tracking-tight truncate">{preset.title}</h3>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <IconButton
                                                    icon={<Pen className="w-3.5 h-3.5" />}
                                                    onClick={() => { setEditingPreset(preset); setIsPresetModalOpen(true); }}
                                                    className="hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                />
                                                <IconButton
                                                    icon={<Trash2 className="w-3.5 h-3.5" />}
                                                    onClick={() => { setPresetToDelete(preset.id); setIsDeleteModalOpen(true); }}
                                                    className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                                                />
                                            </div>
                                        </div>

                                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed font-medium">
                                            {preset.prompt}
                                        </p>

                                        <div className="flex flex-wrap gap-1.5">
                                            {(preset.tags || []).map(tag => (
                                                <span key={tag} className="px-2 py-0.5 rounded-full bg-zinc-50 dark:bg-zinc-800 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <PresetEditorModal
                isOpen={isPresetModalOpen}
                onClose={() => setIsPresetModalOpen(false)}
                onSave={handleSavePresets}
                preset={editingPreset}
                availableTags={availableTags}
                t={t}
            />

            <ConfirmDialog
                isOpen={isDeleteModalOpen}
                title={t('admin_confirm_delete_preset') || "Preset löschen"}
                description={t('admin_delete_preset_desc') || "Möchtest du dieses Preset wirklich unwiderruflich löschen?"}
                confirmLabel={t('delete') || "Löschen"}
                cancelLabel={t('cancel') || "Abbrechen"}
                onConfirm={handleDeletePreset}
                onCancel={() => { setIsDeleteModalOpen(false); setPresetToDelete(null); }}
                variant="danger"
            />
        </div>
    );
};
