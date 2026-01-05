
import { useState, useEffect, useCallback, useMemo } from 'react';
import { LibraryCategory, LibraryItem } from '../types';
import { adminService } from '../services/adminService';
import { userService } from '../services/userService';
import { LIBRARY_CATEGORIES } from '../data/libraryItems';
import { generateId } from '../utils/ids';

interface UseLibraryProps {
    lang: 'de' | 'en' | 'auto';
    currentLang: 'de' | 'en';
    user?: any;
}

export const useLibrary = ({ lang, currentLang, user }: UseLibraryProps) => {
    // --- User Library State ---
    const [userLibrary, setUserLibrary] = useState<LibraryCategory[]>([]);
    const [globalLibrary, setGlobalLibrary] = useState<LibraryCategory[]>([]);

    // Combine System + Global + User Library
    const fullLibrary = useMemo(() => {
        const merged: Record<string, LibraryCategory> = {};

        // 1. System Categories (Base)
        LIBRARY_CATEGORIES.forEach(c => {
            if (c.lang === currentLang) {
                merged[c.id] = { ...c, items: [...c.items] };
            }
        });

        // 2. Global Categories (from admin)
        globalLibrary.forEach(c => {
            if (merged[c.id]) {
                merged[c.id].items = [...merged[c.id].items, ...c.items];
            } else {
                merged[c.id] = { ...c };
            }
        });

        // 3. User Categories (Custom items)
        userLibrary.forEach(c => {
            if (merged[c.id]) {
                merged[c.id].items = [...merged[c.id].items, ...c.items];
                merged[c.id].isUserCreated = merged[c.id].isUserCreated || c.isUserCreated;
            } else {
                merged[c.id] = { ...c };
            }
        });

        return Object.values(merged);
    }, [globalLibrary, userLibrary, currentLang]);

    // Load User Library (Supabase first, then local fallback)
    useEffect(() => {
        const loadUserLibrary = async () => {
            if (user && user.id !== 'guest') {
                try {
                    const items = await userService.getUserObjects(user.id);
                    if (items.length > 0) {
                        setUserLibrary([{
                            id: 'basics',
                            label: 'Custom',
                            items,
                            isUserCreated: true
                        }]);
                        return;
                    }
                } catch (err) {
                    console.error("Failed to load user objects from DB", err);
                }
            }

            // Fallback to local storage for guests or if DB is empty
            const saved = localStorage.getItem('nano_user_library');
            if (saved) {
                setUserLibrary(JSON.parse(saved));
            }
        };

        loadUserLibrary();
    }, [user]);

    // Persist User Library (Local fallback only)
    useEffect(() => {
        if (!user || user.id === 'guest') {
            localStorage.setItem('nano_user_library', JSON.stringify(userLibrary));
        }
    }, [userLibrary, user]);

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

    const addUserItem = async (catId: string, label: string, icon: string = '📦') => {
        let newItem: LibraryItem;

        if (user && user.id !== 'guest') {
            const saved = await userService.addUserObject(user.id, label, icon);
            if (saved) {
                newItem = saved;
            } else {
                throw new Error("Failed to save to database");
            }
        } else {
            newItem = {
                id: generateId(),
                label,
                icon,
                isUserCreated: true
            };
        }

        setUserLibrary(prev => {
            const existingCat = prev.find(c => c.id === catId);
            if (existingCat) {
                return prev.map(c => c.id === catId
                    ? { ...c, items: [...c.items, newItem] }
                    : c
                );
            } else {
                return [...prev, {
                    id: catId,
                    label: 'Custom',
                    items: [newItem],
                    lang: currentLang,
                    isUserCreated: true
                }];
            }
        });
    };

    const deleteUserItem = async (catId: string, itemId: string) => {
        if (user && user.id !== 'guest') {
            try {
                await userService.deleteUserObject(user.id, itemId);
            } catch (err) {
                console.error("Failed to delete user object from DB", err);
            }
        }

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
