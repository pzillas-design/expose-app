import React, { useState, useEffect } from 'react';
import { Plus, Trash, GripVertical, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { Button, TableInput, IconButton } from '@/components/ui/DesignSystem';
import { AdminViewHeader } from './AdminViewHeader';
import { adminService } from '@/services/adminService';
import { generateId } from '@/utils/ids';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

interface AdminObjectsViewProps {
    t: TranslationFunction;
}

export const AdminObjectsView: React.FC<AdminObjectsViewProps> = ({ t }) => {
    const [items, setItems] = useState<any[]>([]);
    const [originalItems, setOriginalItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const { showToast } = useToast();

    // Delete Confirmation State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; targetId?: string }>({
        isOpen: false,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const rawItems = await adminService.getObjectItems();
            setItems(rawItems);
            setOriginalItems(JSON.parse(JSON.stringify(rawItems)));
        } catch (error) {
            console.error('Failed to fetch objects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        try {
            const newItem = {
                id: generateId(),
                label_de: 'Neuer Stempel',
                label_en: 'New Stamp',
                icon: '📦',
                order: items.length
            };
            await adminService.updateObjectItem(newItem);
            await fetchData();
        } catch (error) {
            console.error('Add failed:', error);
        }
    };

    const performDelete = async () => {
        if (!deleteModal.targetId) return;
        try {
            await adminService.deleteObjectItem(deleteModal.targetId);
            setItems(prev => prev.filter(i => i.id !== deleteModal.targetId));
        } catch (error) {
            console.error('Delete failed:', error);
        } finally {
            setDeleteModal({ isOpen: false });
        }
    };

    const handleUpdateItem = (itemId: string, updates: any) => {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updates } : i));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const original = originalItems.find(oi => oi.id === item.id);
                const updatedItem = { ...item, order: i };
                if (!original || JSON.stringify(updatedItem) !== JSON.stringify(original)) {
                    await adminService.updateObjectItem(updatedItem);
                }
            }
            setOriginalItems(JSON.parse(JSON.stringify(items)));
            showToast('Änderungen erfolgreich gespeichert!', 'success');
        } catch (error) {
            console.error('Failed to save changes:', error);
            showToast(t('save_error'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = JSON.stringify(items) !== JSON.stringify(originalItems);

    const onDragStart = (e: React.DragEvent, id: string) => {
        setDraggedItemId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedItemId || draggedItemId === targetId) return;

        const fromIdx = items.findIndex(i => i.id === draggedItemId);
        const toIdx = items.findIndex(i => i.id === targetId);
        if (fromIdx < 0 || toIdx < 0) return;

        const newItems = [...items];
        const [moved] = newItems.splice(fromIdx, 1);
        newItems.splice(toIdx, 0, moved);
        setItems(newItems);
    };

    const gridTemplate = "grid-cols-[40px_60px_1fr_1fr_48px]";
    const minWidth = "600px";

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <AdminViewHeader
                title={t('admin_objects')}
                description={t('admin_objects_desc')}
                actions={
                    <>
                        <Button onClick={handleSave} disabled={!hasChanges || saving} variant={hasChanges ? 'primary' : 'secondary'} icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}>
                            {saving ? t('saving') : t('save')}
                        </Button>
                        <Button onClick={handleAddItem} icon={<Plus className="w-4 h-4" />}>
                            {t('add_stamp')}
                        </Button>
                    </>
                }
            />

            <div className="overflow-x-auto">
                <div style={{ minWidth }} className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <div className={`sticky top-0 z-20 grid ${gridTemplate} bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800/60 text-xs font-medium text-zinc-400`}>
                        <div className="p-4 text-center"></div>
                        <div className="p-4 flex items-center justify-center">{t('icon_label')}</div>
                        <div className="p-4 border-r border-zinc-100 dark:border-zinc-800 flex items-center gap-2">{t('name_de')}</div>
                        <div className="p-4 flex items-center gap-2">{t('name_en')}</div>
                        <div className="p-4"></div>
                    </div>

                    {loading && items.length === 0 && (
                        <div className="py-20 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-300" />
                        </div>
                    )}

                    {items.map((item) => (
                        <div
                            key={item.id}
                            className={`grid ${gridTemplate} hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors items-center h-[52px] group ${draggedItemId === item.id ? 'opacity-50' : ''}`}
                            draggable
                            onDragStart={(e) => onDragStart(e, item.id)}
                            onDragOver={(e) => onDragOver(e, item.id)}
                            onDragEnd={() => setDraggedItemId(null)}
                        >
                            <div className="flex items-center justify-center cursor-move text-zinc-300 hover:text-zinc-500">
                                <GripVertical className="w-4 h-4" />
                            </div>

                            <div className="px-2 flex items-center justify-center">
                                <TableInput
                                    value={item.icon || '📦'}
                                    onChange={e => handleUpdateItem(item.id, { icon: e.target.value })}
                                    className="text-center text-xl w-full p-0 border-none bg-transparent"
                                    placeholder="📦"
                                />
                            </div>

                            <div className="px-5 border-r border-zinc-100 dark:border-zinc-800/50 h-full flex items-center">
                                <TableInput
                                    value={item.label_de || ''}
                                    onChange={e => handleUpdateItem(item.id, { label_de: e.target.value })}
                                    className="font-medium text-sm border-none bg-transparent w-full"
                                    placeholder="Name (DE)"
                                />
                            </div>

                            <div className="px-5 h-full flex items-center">
                                <TableInput
                                    value={item.label_en || ''}
                                    onChange={e => handleUpdateItem(item.id, { label_en: e.target.value })}
                                    className="text-zinc-500 text-sm border-none bg-transparent w-full"
                                    placeholder="Name (EN)"
                                />
                            </div>

                            <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <IconButton
                                    icon={<Trash className="w-4 h-4" />}
                                    onClick={() => setDeleteModal({ isOpen: true, targetId: item.id })}
                                    className="hover:text-red-500 p-2"
                                />
                            </div>
                        </div>
                    ))}

                    {!loading && items.length === 0 && (
                        <div className="py-20 text-center text-zinc-400 flex flex-col items-center gap-3">
                            <ImageIcon className="w-10 h-10 opacity-20" />
                            <span className="text-sm">{t('no_entries_found')}</span>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={deleteModal.isOpen}
                title={t('delete')}
                description={t('delete_confirm_single')}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                onConfirm={performDelete}
                onCancel={() => setDeleteModal({ isOpen: false })}
                variant="danger"
            />
        </div>
    );
};
