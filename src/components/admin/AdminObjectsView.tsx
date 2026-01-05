import React, { useState, useEffect } from 'react';
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
    };

    const gridTemplate = "grid-cols-[40px_60px_1fr_1fr_80px]";
    const minWidth = "800px";

    return (
        <div className="flex flex-col h-[700px]">
            <div className="p-8 pb-6 flex items-center justify-between shrink-0">
                <div>
                    <h2 className={Typo.H1}>{t('admin_objects')}</h2>
                    <p className={Typo.Micro}>Verwalte die Sticker und Symbole für das Anmerkungs-Werkzeug.</p>
                </div>
                <Button onClick={handleAddItem} icon={<Plus className="w-4 h-4" />} className="shrink-0 whitespace-nowrap px-4">
                    Stempel hinzufügen
                </Button>
            </div>

            {/* Horizontal and Vertical Scroll Container */}
            <div className="flex-1 overflow-auto border-t border-zinc-100 dark:border-zinc-800">
                <div style={{ minWidth }} className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <div className={`sticky top-0 z-20 grid ${gridTemplate} bg-zinc-50/80 dark:bg-zinc-800/80 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider`}>
                        <div className="p-4 text-center"></div>
                        <div className="p-4 flex items-center justify-center">{t('icon_label')}</div>
                        <div className="p-4 border-r border-zinc-100 dark:border-zinc-800 flex items-center gap-2">Name (DE)</div>
                        <div className="p-4 border-r border-zinc-100 dark:border-zinc-800 flex items-center gap-2">Name (EN)</div>
                        <div className="p-4 text-center">Aktionen</div>
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
                                    icon={<Trash2 className="w-4 h-4" />}
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="hover:text-red-500 p-2"
                                />
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
        </div>
    );
};
