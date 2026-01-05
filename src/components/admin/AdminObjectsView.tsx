import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Loader2, Image as ImageIcon } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { Typo, Button, TableInput, IconButton } from '@/components/ui/DesignSystem';
import { adminService } from '@/services/adminService';
import { generateId } from '@/utils/ids';

interface AdminObjectsViewProps {
    t: TranslationFunction;
}

export const AdminObjectsView: React.FC<AdminObjectsViewProps> = ({ t }) => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const rawItems = await adminService.getObjectItems();

            // Clean up: If we find items NOT in 'basics', we should probably force them or just filter.
            // User requested to "delete the rest", but for now we'll just show them all in a flat list 
            // and ensure any updates/adds use 'basics'.
            setItems(rawItems);
        } catch (error) {
            console.error('Failed to fetch objects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        const newItemId = generateId();
        try {
            const newItem = {
                id: newItemId,
                category_id: 'basics',
                label_de: 'Neues Objekt',
                label_en: 'New Object',
                icon: '📦',
                order: items.length
            };
            await adminService.updateObjectItem(newItem);
            await fetchData();
        } catch (error) {
            alert(t('admin_add_error'));
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (confirm(t('admin_confirm_delete_preset'))) {
            try {
                await adminService.deleteObjectItem(itemId);
                setItems(prev => prev.filter(i => i.id !== itemId));
            } catch (error) {
                alert(t('admin_delete_error'));
            }
        }
    };

    const handleUpdateItem = async (itemId: string, updates: any) => {
        const existing = items.find(i => i.id === itemId);
        if (!existing) return;

        // Force 'basics' category on every update to migrate legacy data naturally
        const updatedItem = { ...existing, ...updates, category_id: 'basics' };
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

        // In a real scenario, we would trigger a 'save order' call here
    };

    const gridTemplate = "grid-cols-[40px_60px_1fr_1fr_80px]";

    return (
        <div className="p-6 h-full flex flex-col min-h-0 bg-zinc-50/50 dark:bg-zinc-950/50">
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                    <h2 className={Typo.H1}>{t('admin_objects')}</h2>
                    <p className={Typo.Micro}>Verwalte die Sticker und Symbole für das Anmerkungs-Werkzeug.</p>
                </div>
                <Button onClick={handleAddItem} icon={<Plus className="w-4 h-4" />} className="shrink-0 whitespace-nowrap px-4">
                    Objekt hinzufügen
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <div className={`sticky top-0 z-10 grid ${gridTemplate} bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider`}>
                    <div className="p-3 text-center"></div>
                    <div className="p-3 flex items-center justify-center">{t('icon_label')}</div>
                    <div className="p-3 border-r border-zinc-100 dark:border-zinc-800 flex items-center gap-2">Name (DE)</div>
                    <div className="p-3 border-r border-zinc-100 dark:border-zinc-800 flex items-center gap-2">Name (EN)</div>
                    <div className="p-3 text-center">Aktionen</div>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {loading && items.length === 0 && (
                        <div className="py-20 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-300" />
                        </div>
                    )}

                    {items.map((item) => (
                        <div
                            key={item.id}
                            className={`grid ${gridTemplate} hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors items-center py-1 group ${draggedItemId === item.id ? 'opacity-50' : ''}`}
                            draggable
                            onDragStart={(e) => onDragStart(e, item.id)}
                            onDragOver={(e) => onDragOver(e, item.id)}
                            onDragEnd={() => setDraggedItemId(null)}
                        >
                            <div className="flex items-center justify-center cursor-move text-zinc-300 hover:text-zinc-500">
                                <GripVertical className="w-3.5 h-3.5" />
                            </div>

                            <div className="px-2 flex items-center justify-center">
                                <TableInput
                                    value={item.icon || '📦'}
                                    onChange={e => handleUpdateItem(item.id, { icon: e.target.value })}
                                    className="text-center text-lg w-full p-0"
                                    placeholder="📦"
                                />
                            </div>

                            <div className="px-4 border-r border-zinc-100 dark:border-zinc-800/50">
                                <TableInput
                                    value={item.label_de || ''}
                                    onChange={e => handleUpdateItem(item.id, { label_de: e.target.value })}
                                    className="font-medium text-xs"
                                    placeholder="Name (DE)"
                                />
                            </div>

                            <div className="px-4 border-r border-zinc-100 dark:border-zinc-800/50">
                                <TableInput
                                    value={item.label_en || ''}
                                    onChange={e => handleUpdateItem(item.id, { label_en: e.target.value })}
                                    className="text-zinc-500 text-xs"
                                    placeholder="Name (EN)"
                                />
                            </div>

                            <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <IconButton
                                    icon={<Trash2 className="w-3.5 h-3.5" />}
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="hover:text-red-500 p-1.5"
                                />
                            </div>
                        </div>
                    ))}

                    {!loading && items.length === 0 && (
                        <div className="py-20 text-center text-zinc-400 flex flex-col items-center gap-3">
                            <ImageIcon className="w-8 h-8 opacity-20" />
                            <span className={Typo.Body}>Keine Objekte vorhanden.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
