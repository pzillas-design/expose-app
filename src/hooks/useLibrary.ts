import { useState, useEffect, useCallback, useMemo } from 'react';
import { LibraryCategory, LibraryItem } from '../types';
import { adminService } from '../services/adminService';
import { LIBRARY_CATEGORIES } from '../data/libraryItems';
import { generateId } from '../utils/ids';

interface UseLibraryProps {
    lang: 'de' | 'en' | 'auto';
    currentLang: 'de' | 'en';
}

export const useLibrary = ({ lang, currentLang }: UseLibraryProps) => {
    // --- User Library State (Persisted) ---
    const [userLibrary, setUserLibrary] = useState<LibraryCategory[]>(() => {
        const saved = localStorage.getItem('nano_user_library');
        return saved ? JSON.parse(saved) : [];
    });
    const [globalLibrary, setGlobalLibrary] = useState<LibraryCategory[]>([]);

    // Combine System + Global + User Library
    // We merge them by ID so that user items can be added to system categories
    const fullLibrary = useMemo(() => {
        const merged: Record<string, LibraryCategory> = {};

        // 1. System Categories (Base)
        LIBRARY_CATEGORIES.forEach(c => {
            if (c.lang === currentLang) {
                merged[c.id] = { ...c, items: [...c.items] };
            }
        });

        // 2. Global Categories (overwrite/merge)
        globalLibrary.forEach(c => {
            if (merged[c.id]) {
                merged[c.id].items = [...merged[c.id].items, ...c.items];
            } else {
                merged[c.id] = { ...c };
            }
        });

        // 3. User Categories (merge items into existing or add new)
        userLibrary.forEach(c => {
            if (merged[c.id]) {
                // If it's a known category, merge the items
                merged[c.id].items = [...merged[c.id].items, ...c.items];
                // Mark as having user items for UI if needed
                merged[c.id].isUserCreated = merged[c.id].isUserCreated || c.isUserCreated;
            } else {
                merged[c.id] = { ...c };
            }
        });

        return Object.values(merged);
    }, [globalLibrary, userLibrary, currentLang]);

    // Persist User Library
    useEffect(() => {
        localStorage.setItem('nano_user_library', JSON.stringify(userLibrary));
    }, [userLibrary]);

    // Sync Global Objects
    const syncGlobalItems = useCallback(async () => {
        try {
            const [cats, items] = await Promise.all([
                adminService.getObjectCategories(),
                adminService.getObjectItems()
            ]);

            const resolvedLang = lang === 'auto'
                ? (navigator.language.split('-')[0] === 'de' ? 'de' : 'en')
                : lang;

            const grouped: LibraryCategory[] = cats.map(c => ({
                id: c.id,
                label: resolvedLang === 'de' ? c.label_de : c.label_en,
                icon: '📦',
                lang: resolvedLang as 'de' | 'en',
                items: items.filter(i => i.category_id === c.id).map(i => ({
                    id: i.id,
                    label: resolvedLang === 'de' ? i.label_de : i.label_en,
                    icon: i.icon || '📦'
                }))
            }));
            setGlobalLibrary(grouped);
        } catch (err) {
            console.error("Failed to fetch global library:", err);
        }
    }, [lang]);

    const addUserCategory = (label: string) => {
        const newCat: LibraryCategory = {
            id: generateId(),
            label,
            icon: '📁',
            items: [],
            lang: currentLang,
            isUserCreated: true
        };
        setUserLibrary(prev => [newCat, ...prev]);
    };

    const deleteUserCategory = (id: string) => {
        setUserLibrary(prev => prev.filter(c => c.id !== id));
    };

    const addUserItem = (catId: string, label: string, icon: string = '') => {
        const newItem: LibraryItem = {
            id: generateId(),
            label,
            icon,
            isUserCreated: true
        };

        setUserLibrary(prev => {
            const existingCat = prev.find(c => c.id === catId);
            if (existingCat) {
                return prev.map(c => c.id === catId
                    ? { ...c, items: [...c.items, newItem] }
                    : c
                );
            } else {
                // Find category label from fullLibrary to keep it consistent
                const sourceCat = fullLibrary.find(c => c.id === catId);
                const newCat: LibraryCategory = {
                    id: catId,
                    label: sourceCat?.label || label,
                    icon: sourceCat?.icon || '📁',
                    items: [newItem],
                    lang: currentLang,
                    isUserCreated: false // It's a shadow of a system/global cat
                };
                return [...prev, newCat];
            }
        });
    };

    const deleteUserItem = (catId: string, itemId: string) => {
        setUserLibrary(prev => prev.map(cat => {
            if (cat.id === catId) {
                return { ...cat, items: cat.items.filter(i => i.id !== itemId) };
            }
            return cat;
        }));
    };

    return {
        userLibrary,
        globalLibrary,
        fullLibrary,
        syncGlobalItems,
        addUserCategory,
        deleteUserCategory,
        addUserItem,
        deleteUserItem
    };
};
