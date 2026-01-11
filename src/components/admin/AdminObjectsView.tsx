import React, { useState, useEffect } from 'react';
import { Plus, Trash, GripVertical, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { Typo, Button, TableInput, IconButton } from '@/components/ui/DesignSystem';
import { adminService } from '@/services/adminService';
import { generateId } from '@/utils/ids';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';

interface AdminObjectsViewProps {
    t: TranslationFunction;
}

export const AdminObjectsView: React.FC<AdminObjectsViewProps> = ({ t }) => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Delete Confirmation State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; targetId?: string; isBulk: boolean }>({
        isOpen: false,
        isBulk: false
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const rawItems = await adminService.getObjectItems();
            setItems(rawItems);
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
        try {
            if (deleteModal.isBulk) {
                const idsToDelete = Array.from(selectedIds) as string[];
                // Perform sequential deletes for now or add bulk delete to service
                for (const id of idsToDelete) {
                    await adminService.deleteObjectItem(id);
                }
                setItems(prev => prev.filter(i => !selectedIds.has(i.id)));
                setSelectedIds(new Set());
            } else if (deleteModal.targetId) {
                await adminService.deleteObjectItem(deleteModal.targetId);
                setItems(prev => prev.filter(i => i.id !== deleteModal.targetId));
                if (selectedIds.has(deleteModal.targetId)) {
                    const newSelected = new Set(selectedIds);
                    newSelected.delete(deleteModal.targetId);
                    setSelectedIds(newSelected);
                }
            }
        } catch (error) {
            console.error('Delete failed:', error);
        } finally {
            setDeleteModal({ isOpen: false, isBulk: false });
        }
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === items.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(items.map(i => i.id)));
    };

    const handleUpdateItem = async (itemId: string, updates: any) => {
        const existing = items.find(i => i.id === itemId);
        if (!existing) return;

        const updatedItem = { ...existing, ...updates };
        setItems(prev => prev.map(i => i.id === itemId ? updatedItem : i));

        try {
            await adminService.updateObjectItem(updatedItem);
        } catch (error) {
            console.error('Failed to update item:', error);
        }
    };

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

    const gridTemplate = "grid-cols-[40px_60px_1fr_1fr_80px_60px]";
    const minWidth = "950px";

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <div className="p-8 pb-6 flex items-center justify-between shrink-0">
                <div>
                    <h2 className={Typo.H1}>{t('admin_objects')}</h2>
                    <p className={Typo.Micro}>{t('admin_objects_desc')}</p>
                </div>
                <div className="flex items-center gap-4">
                    {selectedIds.size > 0 && (
                        <Button
                            variant="danger"
                            onClick={() => setDeleteModal({ isOpen: true, isBulk: true })}
                            icon={<Trash className="w-4 h-4" />}
                            className="px-4"
                        >
                            {t('delete_selected', { count: selectedIds.size })}
                        </Button>
                    )}
                    <Button onClick={handleAddItem} icon={<Plus className="w-4 h-4" />} className="shrink-0 whitespace-nowrap px-4">
                        {t('add_stamp')}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <div style={{ minWidth }} className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <div className={`sticky top-0 z-20 grid ${gridTemplate} bg-zinc-50/80 dark:bg-zinc-800/80 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider`}>
                        <div className="p-4 text-center"></div>
                        <div className="p-4 flex items-center justify-center">{t('icon_label')}</div>
                        <div className="p-4 border-r border-zinc-100 dark:border-zinc-800 flex items-center gap-2">{t('name_de')}</div>
                        <div className="p-4 border-r border-zinc-100 dark:border-zinc-800 flex items-center gap-2">{t('name_en')}</div>
                        <div className="p-4 text-center">{t('actions')}</div>
                        <div className="p-4 flex items-center justify-center">
                            <button
                                onClick={toggleSelectAll}
                                className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${selectedIds.size === items.length && items.length > 0 ? 'bg-black dark:bg-white border-black dark:border-white' : 'border-zinc-300 dark:border-zinc-600'}`}
                            >
                                {selectedIds.size === items.length && items.length > 0 && <Check className="w-3 h-3 text-white dark:text-black" />}
                            </button>
                        </div>
                    </div>

                    {loading && items.length === 0 && (
                        <div className="py-20 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-300" />
                        </div>
                    )}

                    {items.map((item) => (
                        <div
                            key={item.id}
                            className={`grid ${gridTemplate} hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors items-center h-[52px] group ${draggedItemId === item.id ? 'opacity-50' : ''} ${selectedIds.has(item.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
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

                            <div className="px-5 border-r border-zinc-100 dark:border-zinc-800/50 h-full flex items-center">
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
                                    onClick={() => setDeleteModal({ isOpen: true, targetId: item.id, isBulk: false })}
                                    className="hover:text-red-500 p-2"
                                />
                            </div>

                            <div className="flex items-center justify-center">
                                <button
                                    onClick={() => toggleSelection(item.id)}
                                    className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${selectedIds.has(item.id) ? 'bg-black dark:bg-white border-black dark:border-white' : 'border-zinc-300 dark:border-zinc-600'}`}
                                >
                                    {selectedIds.has(item.id) && <Check className="w-3 h-3 text-white dark:text-black" />}
                                </button>
                            </div>
                        </div>
                    ))}

                    {!loading && items.length === 0 && (
                        <div className="py-20 text-center text-zinc-400 flex flex-col items-center gap-3">
                            <ImageIcon className="w-10 h-10 opacity-20" />
                            <span className={Typo.Body}>Keine Objekte vorhanden.</span>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={deleteModal.isOpen}
                title={deleteModal.isBulk ? "Auswahl löschen" : "Objekt löschen"}
                description={deleteModal.isBulk
                    ? `Möchtest du wirklich ${selectedIds.size} Objekte unwiderruflich löschen?`
                    : "Möchtest du dieses Objekt wirklich unwiderruflich löschen?"}
                confirmLabel="Löschen"
                cancelLabel="Abbrechen"
                onConfirm={performDelete}
                onCancel={() => setDeleteModal({ isOpen: false, isBulk: false })}
                variant="danger"
            />
        </div>
    );
};
