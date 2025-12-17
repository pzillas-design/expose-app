
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical, CornerDownRight } from 'lucide-react';
import { TranslationFunction, LibraryCategory, LibraryItem } from '../../types';
import { Typo, Button, TableInput, IconButton } from '../ui/DesignSystem';
import { LIBRARY_CATEGORIES } from '../../data/libraryItems';
import { generateId } from '../../utils/ids';

interface AdminObjectsViewProps {
  t: TranslationFunction;
}

// Helper to group categories by ID
interface PairedCategory {
    id: string;
    de?: LibraryCategory;
    en?: LibraryCategory;
    items: {
        id: string; // Item ID
        de?: LibraryItem;
        en?: LibraryItem;
    }[];
}

export const AdminObjectsView: React.FC<AdminObjectsViewProps> = ({ t }) => {
  const [categories, setCategories] = useState<LibraryCategory[]>(LIBRARY_CATEGORIES);
  const [expandedCats, setExpandedCats] = useState<string[]>([]);
  
  // Drag State
  const [draggedCatId, setDraggedCatId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<{ catId: string, itemId: string } | null>(null);

  // --- Grouping Logic ---
  const pairedCategories: PairedCategory[] = useMemo(() => {
      const map = new Map<string, PairedCategory>();
      
      const orderedIds: string[] = [];
      categories.forEach(c => {
          if (!orderedIds.includes(c.id)) orderedIds.push(c.id);
      });

      categories.forEach(cat => {
          if (!map.has(cat.id)) {
              map.set(cat.id, { id: cat.id, items: [] });
          }
          const entry = map.get(cat.id)!;
          if (cat.lang === 'en') entry.en = cat;
          else entry.de = cat;
      });

      Array.from(map.values()).forEach(catPair => {
          const itemMap = new Map<string, { id: string, de?: LibraryItem, en?: LibraryItem }>();
          const orderedItemIds: string[] = [];
          
          if (catPair.de) {
              catPair.de.items.forEach(i => {
                  if (!itemMap.has(i.id)) {
                      itemMap.set(i.id, { id: i.id });
                      orderedItemIds.push(i.id);
                  }
                  itemMap.get(i.id)!.de = i;
              });
          }
          if (catPair.en) {
              catPair.en.items.forEach(i => {
                   if (!itemMap.has(i.id)) {
                       itemMap.set(i.id, { id: i.id });
                       orderedItemIds.push(i.id);
                   }
                   itemMap.get(i.id)!.en = i;
              });
          }
          catPair.items = orderedItemIds.map(id => itemMap.get(id)!);
      });

      return orderedIds.map(id => map.get(id)!).filter(Boolean);
  }, [categories]);


  // --- Actions ---
  const handleAddCategory = () => {
      const newId = generateId();
      const newDe: LibraryCategory = { id: newId, label: 'Neue Kategorie', icon: '', lang: 'de', items: [] };
      const newEn: LibraryCategory = { id: newId, label: 'New Category', icon: '', lang: 'en', items: [] };
      setCategories(prev => [newDe, newEn, ...prev]);
      setExpandedCats(prev => [...prev, newId]);
  };

  const handleDeleteCategory = (id: string) => {
      if (confirm("Delete category in both languages?")) {
          setCategories(prev => prev.filter(c => c.id !== id));
      }
  };

  const handleUpdateCategoryLabel = (id: string, lang: 'de' | 'en', label: string) => {
      setCategories(prev => prev.map(c => (c.id === id && (c.lang || 'de') === lang) ? { ...c, label } : c));
  };

  const handleAddItem = (catId: string) => {
      const newItemId = generateId();
      const newItemDe: LibraryItem = { id: newItemId, label: 'Neues Item', icon: '📦' };
      const newItemEn: LibraryItem = { id: newItemId, label: 'New Item', icon: '📦' };

      setCategories(prev => prev.map(c => {
          if (c.id === catId) {
              const item = (c.lang === 'en') ? newItemEn : newItemDe;
              return { ...c, items: [item, ...c.items] };
          }
          return c;
      }));
  };

  const handleDeleteItem = (catId: string, itemId: string) => {
       setCategories(prev => prev.map(c => {
           if (c.id === catId) {
               return { ...c, items: c.items.filter(i => i.id !== itemId) };
           }
           return c;
       }));
  };

  const handleUpdateItem = (catId: string, itemId: string, lang: 'de' | 'en', updates: Partial<LibraryItem>) => {
      setCategories(prev => prev.map(c => {
          if (c.id === catId && (c.lang || 'de') === lang) {
              return { 
                  ...c, 
                  items: c.items.map(i => i.id === itemId ? { ...i, ...updates } : i)
              };
          }
          return c;
      }));
  };

  const handleUpdateItemIcon = (catId: string, itemId: string, icon: string) => {
      setCategories(prev => prev.map(c => {
          if (c.id === catId) {
              return { 
                  ...c, 
                  items: c.items.map(i => i.id === itemId ? { ...i, icon } : i)
              };
          }
          return c;
      }));
  };

  const toggleExpand = (id: string) => {
      setExpandedCats(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // --- Drag & Drop ---
  const onDragStartCat = (e: React.DragEvent, id: string) => {
      setDraggedCatId(id);
      e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOverCat = (e: React.DragEvent, targetId: string) => {
      e.preventDefault(); 
      if (!draggedCatId || draggedCatId === targetId) return;
      
      const fromIndex = pairedCategories.findIndex(p => p.id === draggedCatId);
      const toIndex = pairedCategories.findIndex(p => p.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return;

      const newPaired = [...pairedCategories];
      const [movedPair] = newPaired.splice(fromIndex, 1);
      newPaired.splice(toIndex, 0, movedPair);

      const newCategories: LibraryCategory[] = [];
      newPaired.forEach(pair => {
          if (pair.de) newCategories.push(pair.de);
          if (pair.en) newCategories.push(pair.en);
      });
      setCategories(newCategories);
  };

  const onDragStartItem = (e: React.DragEvent, catId: string, itemId: string) => {
      e.stopPropagation();
      setDraggedItemId({ catId, itemId });
      e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOverItem = (e: React.DragEvent, targetCatId: string, targetItemId: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (!draggedItemId || draggedItemId.catId !== targetCatId || draggedItemId.itemId === targetItemId) return;

      setCategories(prev => {
          const newCats = [...prev];
          const reorderInCat = (c: LibraryCategory) => {
              const items = [...c.items];
              const fromIdx = items.findIndex(i => i.id === draggedItemId.itemId);
              const toIdx = items.findIndex(i => i.id === targetItemId);
              if (fromIdx >= 0 && toIdx >= 0) {
                  const [moved] = items.splice(fromIdx, 1);
                  items.splice(toIdx, 0, moved);
                  return { ...c, items };
              }
              return c;
          };
          return newCats.map(c => {
              if (c.id === targetCatId) return reorderInCat(c);
              return c;
          });
      });
  };

  // Fixed Grid Template for consistency
  const gridTemplate = "grid-cols-[30px_30px_40px_1fr_1fr_70px]";

  return (
    <div className="p-6 h-full flex flex-col min-h-0 bg-zinc-50/50 dark:bg-zinc-950/50">
        <div className="flex items-center justify-between mb-6 shrink-0">
            <div>
                <h2 className={Typo.H1}>{t('admin_objects')}</h2>
                <p className={Typo.Micro}>{t('admin_objects_desc')}</p>
            </div>
            <Button onClick={handleAddCategory} icon={<Plus className="w-4 h-4"/>} className="shrink-0 whitespace-nowrap px-4">
                {t('add_category')}
            </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
            
            {/* Header */}
            <div className={`sticky top-0 z-10 grid ${gridTemplate} bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider`}>
                <div className="p-2 text-center"></div>
                <div className="p-2 text-center"></div>
                <div className="p-2 flex items-center justify-center">Icon</div>
                <div className="p-2 border-r border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-800 px-1 rounded text-[9px]">DE</span>
                    German
                </div>
                <div className="p-2 border-r border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-1 rounded text-[9px]">EN</span>
                    English
                </div>
                <div className="p-2 text-center">Actions</div>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pairedCategories.map(pair => {
                    const isExpanded = expandedCats.includes(pair.id);
                    const isDraggingThis = draggedCatId === pair.id;
                    
                    return (
                        <div 
                            key={pair.id} 
                            className={`group/cat ${isDraggingThis ? 'opacity-50 bg-zinc-50' : ''}`}
                            draggable
                            onDragStart={(e) => onDragStartCat(e, pair.id)}
                            onDragOver={(e) => onDragOverCat(e, pair.id)}
                            onDragEnd={() => setDraggedCatId(null)}
                        >
                            {/* Category Row */}
                            <div className={`grid ${gridTemplate} bg-zinc-50/50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors items-center py-1`}>
                                <div className="flex items-center justify-center cursor-move text-zinc-300 hover:text-zinc-500">
                                    <GripVertical className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex items-center justify-center cursor-pointer" onClick={() => toggleExpand(pair.id)}>
                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400"/> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400"/>}
                                </div>
                                {/* Empty Icon Col for Category */}
                                <div></div>
                                
                                <div className="px-2 border-r border-zinc-100 dark:border-zinc-800/50">
                                    <TableInput 
                                        value={pair.de?.label || ''} 
                                        onChange={e => handleUpdateCategoryLabel(pair.id, 'de', e.target.value)}
                                        className="font-bold text-xs"
                                        placeholder="Name (DE)"
                                    />
                                </div>
                                <div className="px-2 border-r border-zinc-100 dark:border-zinc-800/50">
                                    <TableInput 
                                        value={pair.en?.label || ''} 
                                        onChange={e => handleUpdateCategoryLabel(pair.id, 'en', e.target.value)}
                                        className="font-bold text-xs"
                                        placeholder="Name (EN)"
                                    />
                                </div>
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                                    <IconButton icon={<Plus className="w-3 h-3"/>} onClick={() => handleAddItem(pair.id)} tooltip={t('add_item')} className="w-6 h-6 p-0" />
                                    <IconButton icon={<Trash2 className="w-3 h-3"/>} onClick={() => handleDeleteCategory(pair.id)} className="hover:text-red-500 w-6 h-6 p-0" />
                                </div>
                            </div>

                            {/* Items Rows */}
                            {isExpanded && (
                                <div className="bg-white dark:bg-zinc-950/30 border-t border-zinc-100 dark:border-zinc-800">
                                    {pair.items.map(itemPair => (
                                        <div 
                                            key={itemPair.id} 
                                            className={`grid ${gridTemplate} group/item hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors items-center py-0.5 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0`}
                                            draggable
                                            onDragStart={(e) => onDragStartItem(e, pair.id, itemPair.id)}
                                            onDragOver={(e) => onDragOverItem(e, pair.id, itemPair.id)}
                                            onDragEnd={() => setDraggedItemId(null)}
                                        >
                                            {/* Empty under drag */}
                                            <div></div> 
                                            {/* Indent Visual */}
                                            <div className="flex items-center justify-center text-zinc-200 dark:text-zinc-700">
                                                <CornerDownRight className="w-3 h-3 stroke-[1.5]" />
                                            </div>
                                            
                                            <div className="px-1 flex items-center justify-center text-zinc-500">
                                                <TableInput 
                                                    value={itemPair.de?.icon || itemPair.en?.icon || ''}
                                                    onChange={e => handleUpdateItemIcon(pair.id, itemPair.id, e.target.value)}
                                                    className="text-center w-full p-0 text-sm"
                                                    placeholder="Icon"
                                                />
                                            </div>
                                            <div className="px-2 border-r border-zinc-50 dark:border-zinc-800/50">
                                                <TableInput 
                                                    value={itemPair.de?.label || ''}
                                                    onChange={e => handleUpdateItem(pair.id, itemPair.id, 'de', { label: e.target.value })}
                                                    className="text-xs text-zinc-600 dark:text-zinc-400"
                                                    placeholder="Item (DE)"
                                                />
                                            </div>
                                            <div className="px-2 border-r border-zinc-50 dark:border-zinc-800/50">
                                                <TableInput 
                                                    value={itemPair.en?.label || ''}
                                                    onChange={e => handleUpdateItem(pair.id, itemPair.id, 'en', { label: e.target.value })}
                                                    className="text-xs text-zinc-600 dark:text-zinc-400"
                                                    placeholder="Item (EN)"
                                                />
                                            </div>
                                            <div className="flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                <IconButton 
                                                    icon={<Trash2 className="w-3 h-3"/>} 
                                                    onClick={() => handleDeleteItem(pair.id, itemPair.id)} 
                                                    className="hover:text-red-500 w-6 h-6 p-0 text-zinc-300"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {pair.items.length === 0 && (
                                        <div className="p-3 text-center text-[10px] text-zinc-400 italic">
                                            Empty category.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};
