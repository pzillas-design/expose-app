import { useState, useEffect, useCallback } from 'react';
import { LibraryCategory, LibraryItem, LocaleKey } from '../types';
import { adminService } from '../services/adminService';
import { LIBRARY_CATEGORIES } from '../data/libraryItems';
import { generateId } from '../utils/ids';

interface UseLibraryProps {
    lang: LocaleKey | 'auto';
    currentLang: LocaleKey;
}

export const useLibrary = ({ lang, currentLang }: UseLibraryProps) => {
    // --- User Library State (Persisted) ---
    const [userLibrary, setUserLibrary] = useState<LibraryCategory[]>(() => {
        const saved = localStorage.getItem('nano_user_library');
        return saved ? JSON.parse(saved) : [];
    });
    const [globalLibrary, setGlobalLibrary] = useState<LibraryCategory[]>([]);

    // Combine System + Global + User Library
    const fullLibrary = [...globalLibrary, ...userLibrary, ...LIBRARY_CATEGORIES];

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
        setUserLibrary(prev => prev.map(cat => {
            if (cat.id === catId) {
                const newItem: LibraryItem = {
                    id: generateId(),
                    label,
                    icon,
                    isUserCreated: true
                };
                return { ...cat, items: [...cat.items, newItem] };
            }
            return cat;
        }));
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
