import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash, Loader2, Bookmark, Check } from 'lucide-react';
import { TranslationFunction, PromptTemplate, PresetControl } from '@/types';
import { Button, Input, TextArea, IconButton, TableInput } from '@/components/ui/DesignSystem';
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
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    // Dialog State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Form State (Combined DE & EN + shared emoji)
    const [formState, setFormState] = useState<{
        emoji: string;
        de: { title: string, prompt: string, controls: PresetControl[] },
        en: { title: string, prompt: string, controls: PresetControl[] }
    }>({
        emoji: '',
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
        return Object.values(groups).sort((a, b) => {
            // Oldest first (matches user-facing preset order)
            const aTime = (a.de as any)?.createdAt ?? (a.de as any)?.created_at ?? 0;
            const bTime = (b.de as any)?.createdAt ?? (b.de as any)?.created_at ?? 0;
            const aMs = typeof aTime === 'string' ? new Date(aTime).getTime() : aTime;
            const bMs = typeof bTime === 'string' ? new Date(bTime).getTime() : bTime;
            return aMs - bMs;
        });
    }, [allPresets]);

    const filteredGroups = groupedPresets;

    const handleSelect = (deId: string, currentPresets = allPresets) => {
        const baseId = deId.endsWith('-en') ? deId.slice(0, -3) : deId;
        const de = currentPresets.find(p => p.id === baseId);
        const en = currentPresets.find(p => p.id === baseId + '-en');

        setSelectedId(baseId);
        setFormState({
            emoji: de?.emoji || '',
            de: { title: de?.title || '', prompt: de?.prompt || '', controls: de?.controls || [] },
            en: { title: en?.title || '', prompt: en?.prompt || '', controls: en?.controls || [] }
        });
    };

    const handleNew = () => {
        const newId = generateId();
        setSelectedId(newId);
        setFormState({
            emoji: '',
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
            if (hasDe) {
                await adminService.updateGlobalPreset({
                    id: selectedId,
                    lang: 'de',
                    emoji: formState.emoji || undefined,
                    ...formState.de,
                    isPinned: true, isCustom: false, usageCount: 0
                });
            }

            if (hasEn) {
                await adminService.updateGlobalPreset({
                    id: selectedId + '-en',
                    lang: 'en',
                    emoji: formState.emoji || undefined,
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
            <div className="w-[260px] shrink-0 flex flex-col border-r border-zinc-100 dark:border-zinc-800">
                <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Vorlagen</span>
                    <IconButton icon={<Plus className="w-4 h-4" />} onClick={handleNew} />
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar py-1">
                    {loading && allPresets.length === 0 ? (
                        <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-300" /></div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="p-10 text-center text-xs text-zinc-400">{t('no_entries_found')}</div>
                    ) : (
                        filteredGroups.map(group => (
                            <button
                                key={group.baseId}
                                onClick={() => handleSelect(group.baseId)}
                                className={`w-full text-left px-5 py-2.5 transition-colors border-l-2 flex items-center gap-2.5 ${selectedId === group.baseId
                                    ? 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-900 dark:border-white'
                                    : 'border-transparent hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20'
                                }`}
                            >
                                {group.de?.emoji && <span className="text-base leading-none">{group.de.emoji}</span>}
                                <span className={`text-[13px] font-medium truncate ${selectedId === group.baseId ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                    {group.de?.title || 'Neue Vorlage'}
                                </span>
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
                        {/* Sticky header — full width, flush border */}
                        <div className="shrink-0 flex items-center justify-between px-6 lg:px-8 py-3 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-black z-10">
                            <div className="flex items-center gap-3 min-w-0">
                                {/* Emoji picker */}
                                <input
                                    type="text"
                                    value={formState.emoji}
                                    onChange={e => setFormState(s => ({ ...s, emoji: e.target.value }))}
                                    className="w-10 h-10 text-xl text-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
                                    placeholder="✨"
                                    maxLength={2}
                                />
                                <h1 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight truncate">{formState.de.title || 'Neue Vorlage'}</h1>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                                <IconButton
                                    icon={<Trash className="w-4 h-4" />}
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    className="hover:text-red-500"
                                />
                                <Button onClick={handleSave} disabled={isSaving} icon={isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}>
                                    {isSaving ? t('saving') : t('save')}
                                </Button>
                            </div>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-black">
                            <div className="p-6 lg:p-8 space-y-10">

                                {/* DE / EN Columns */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative">

                                    {/* Vertical Divider */}
                                    <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-zinc-100 dark:bg-zinc-800 -translate-x-1/2" />

                                    {/* DE Column */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Deutsch</span>
                                        </div>

                                        <div className="space-y-5 pr-0 lg:pr-6">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Titel</label>
                                                <Input
                                                    value={formState.de.title}
                                                    onChange={e => setFormState(s => ({ ...s, de: { ...s.de, title: e.target.value } }))}
                                                    placeholder="z.B. Fotos weichzeichnen"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Prompt</label>
                                                <TextArea
                                                    className="min-h-[180px] text-[13px] leading-relaxed font-mono resize-none"
                                                    value={formState.de.prompt}
                                                    onChange={e => setFormState(s => ({ ...s, de: { ...s.de, prompt: e.target.value } }))}
                                                    placeholder="Prompt-Text hier..."
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Variablen</label>
                                                <ControlsEditor
                                                    controls={formState.de.controls}
                                                    onChange={(ctrls) => setFormState(s => ({ ...s, de: { ...s.de, controls: ctrls } }))}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* EN Column */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">English</span>
                                        </div>

                                        <div className="space-y-5 pl-0 lg:pl-6">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Title</label>
                                                <Input
                                                    value={formState.en.title}
                                                    onChange={e => setFormState(s => ({ ...s, en: { ...s.en, title: e.target.value } }))}
                                                    placeholder="e.g. Blur Photos"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Prompt</label>
                                                <TextArea
                                                    className="min-h-[180px] text-[13px] leading-relaxed font-mono resize-none"
                                                    value={formState.en.prompt}
                                                    onChange={e => setFormState(s => ({ ...s, en: { ...s.en, prompt: e.target.value } }))}
                                                    placeholder="Prompt text here..."
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Variables</label>
                                                <ControlsEditor
                                                    controls={formState.en.controls}
                                                    onChange={(ctrls) => setFormState(s => ({ ...s, en: { ...s.en, controls: ctrls } }))}
                                                />
                                            </div>
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
        setLocalValues(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || { label: controls.find(c => c.id === id)?.label || '' }),
                options: val
            }
        }));
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
        const newCtrl: PresetControl = { id: newId, label: 'Neue Variable', options: [] };
        onChange([...controls, newCtrl]);
    };

    const removeRow = (id: string) => {
        onChange(controls.filter(c => c.id !== id));
        setLocalValues(prev => { const next = { ...prev }; delete next[id]; return next; });
    };

    const grid = "grid-cols-[1fr_2fr_32px]";

    return (
        <div ref={containerRef} className="border border-zinc-100 dark:border-zinc-800/50 rounded-xl overflow-hidden bg-white dark:bg-black">
            <div className={`grid ${grid} bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 text-xs font-medium text-zinc-400 dark:text-zinc-500`}>
                <div className="p-2.5 pl-4">Label</div>
                <div className="p-2.5 border-l border-zinc-100 dark:border-zinc-800">Optionen (kommagetrennt)</div>
                <div className="p-2.5"></div>
            </div>

            <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                {controls.map((ctrl) => (
                    <div key={ctrl.id} className={`grid ${grid} items-start group hover:bg-zinc-50/30 dark:hover:bg-zinc-900/30 transition-colors`}>
                        <div className="p-0.5">
                            <TableInput
                                value={localValues[ctrl.id]?.label ?? ctrl.label}
                                onChange={e => handleLabelChange(ctrl.id, e.target.value)}
                                className="text-[12px] font-medium border-none h-9 bg-transparent focus:bg-white dark:focus:bg-zinc-900 rounded-lg px-2 transition-all"
                                placeholder="z.B. Intensität"
                            />
                        </div>
                        <div className="p-0.5 border-l border-zinc-50 dark:border-zinc-800/50">
                            <textarea
                                value={localValues[ctrl.id]?.options ?? ctrl.options.map(o => o.label).join(', ')}
                                onChange={e => handleOptionsChange(ctrl.id, e.target.value)}
                                className="w-full text-[12px] text-zinc-500 border-none min-h-[36px] bg-transparent focus:bg-white dark:focus:bg-zinc-900 rounded-lg px-2 py-2 transition-all resize-none overflow-hidden leading-relaxed"
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
                            <button onClick={() => removeRow(ctrl.id)} className="text-zinc-300 hover:text-red-500 transition-colors p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20">
                                <Trash className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={addRow}
                    className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" /> Variable hinzufügen
                </button>
            </div>
        </div>
    );
};
