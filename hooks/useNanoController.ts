
import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { supabase } from '../services/supabase';
import { adminService } from '../services/adminService';
import { CanvasImage, ImageRow, AnnotationObject, GenerationQuality, TranslationKey, LibraryCategory, LibraryItem } from '../types';
import { editImageWithGemini } from '../services/geminiService';
import { generateMaskFromAnnotations } from '../utils/maskGenerator';
import { generateId } from '../utils/ids';
import { translations, LocaleKey } from '../data/locales';
import { useCanvasNavigation } from './useCanvasNavigation';
import { LIBRARY_CATEGORIES } from '../data/libraryItems';

// Cost mapping
const COSTS: Record<GenerationQuality, number> = {
    'fast': 0.00,
    'pro-1k': 0.50,
    'pro-2k': 1.00,
    'pro-4k': 2.00
};

export const useNanoController = () => {
    // --- Data State ---
    const [rows, setRows] = useState<ImageRow[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // --- User Library State (Persisted) ---
    const [userLibrary, setUserLibrary] = useState<LibraryCategory[]>(() => {
        const saved = localStorage.getItem('nano_user_library');
        return saved ? JSON.parse(saved) : [];
    });
    const [globalLibrary, setGlobalLibrary] = useState<LibraryCategory[]>([]);

    const [credits, setCredits] = useState<number>(10.00);
    const [user, setUser] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);

    // --- Theme & Language ---
    const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>(() => {
        return (localStorage.getItem('theme_mode') as 'light' | 'dark' | 'auto') || 'auto';
    });

    const [lang, setLang] = useState<LocaleKey | 'auto'>(() => {
        return (localStorage.getItem('app_lang') as LocaleKey | 'auto') || 'auto';
    });

    // --- Editor State ---
    const [sideSheetMode, setSideSheetMode] = useState<'prompt' | 'brush' | 'objects'>('prompt');
    const [brushSize, setBrushSize] = useState(150);

    // Quality Settings
    const [qualityMode, setQualityMode] = useState<GenerationQuality>(() => {
        return (localStorage.getItem('nano_quality') as GenerationQuality) || 'pro-1k';
    });

    // --- UI State ---
    const [isDragOver, setIsDragOver] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAdminOpen, setIsAdminOpen] = useState(false);

    // Refs
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastSelectedIdRef = useRef<string | null>(null);
    const focusCheckRafRef = useRef<number | null>(null);

    // Derived
    const allImages = rows.flatMap(r => r.items);
    const primarySelectedId = selectedIds[selectedIds.length - 1] || null;
    const selectedImage = allImages.find(img => img.id === primarySelectedId) || null;
    const selectedImages = allImages.filter(img => selectedIds.includes(img.id));

    // Combine System + Global + User Library
    const fullLibrary = [...globalLibrary, ...userLibrary, ...LIBRARY_CATEGORIES];

    // --- Navigation Hook Integration ---
    const {
        zoom,
        setZoom,
        smoothZoomTo,
        fitSelectionToView,
        snapToItem,
        isZoomingRef,
        isAutoScrollingRef
    } = useCanvasNavigation({
        scrollContainerRef,
        selectedIds,
        allImages,
        primarySelectedId
    });

    // Sync with Supabase on mount
    useEffect(() => {
        const syncProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                // Update last_active_at
                await supabase.from('profiles').update({
                    last_active_at: new Date().toISOString()
                }).eq('id', user.id);

                // Fetch full profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setCredits(profile.credits);
                    setUserProfile(profile);
                }
            } else {
                setUser(null);
                setUserProfile(null);
            }

            // Sync Global Objects
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
        };
        syncProfile();
    }, [lang]);

    // Persist Quality & Library
    useEffect(() => { localStorage.setItem('nano_quality', qualityMode); }, [qualityMode]);
    useEffect(() => { localStorage.setItem('nano_user_library', JSON.stringify(userLibrary)); }, [userLibrary]);

    // Theme Logic
    useEffect(() => {
        localStorage.setItem('theme_mode', themeMode);
        const root = document.documentElement;
        const isDark = themeMode === 'dark' || (themeMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) root.classList.add('dark');
        else root.classList.remove('dark');
    }, [themeMode]);

    // Language Logic
    useEffect(() => {
        localStorage.setItem('app_lang', lang);
    }, [lang]);

    // Resolve Auto Language
    const getResolvedLang = useCallback((): LocaleKey => {
        if (lang === 'auto') {
            const browserLang = navigator.language.split('-')[0];
            return (browserLang === 'de') ? 'de' : 'en';
        }
        return lang;
    }, [lang]);

    const currentLang = getResolvedLang();

    // Translation Function
    const t = useCallback((key: TranslationKey): string => {
        return translations[currentLang][key] || key;
    }, [currentLang]);

    const handleAddFunds = (amount: number) => setCredits(prev => prev + amount);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.reload(); // Hard reload to clear all states
    };

    // --- Library Actions ---
    const addUserCategory = (label: string) => {
        const newCat: LibraryCategory = {
            id: generateId(),
            label,
            icon: '📁',
            items: [],
            lang: currentLang, // Bind to current lang or 'auto'
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
                return { ...cat, items: [newItem, ...cat.items] };
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

    // --- Selection Logic ---

    const selectAndSnap = useCallback((id: string) => {
        lastSelectedIdRef.current = id;
        setSelectedIds([id]);
        snapToItem(id);
    }, [snapToItem]);

    const selectMultiple = useCallback((ids: string[]) => {
        setSelectedIds(ids);
        if (ids.length > 0) {
            lastSelectedIdRef.current = ids[ids.length - 1];
        }
    }, []);

    const handleSelection = useCallback((id: string, multi: boolean, range: boolean) => {
        if (range && lastSelectedIdRef.current) {
            // Shift Click
            const lastIdx = allImages.findIndex(i => i.id === lastSelectedIdRef.current);
            const currIdx = allImages.findIndex(i => i.id === id);
            if (lastIdx !== -1 && currIdx !== -1) {
                const start = Math.min(lastIdx, currIdx);
                const end = Math.max(lastIdx, currIdx);
                const rangeIds = allImages.slice(start, end + 1).map(i => i.id);
                setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])));
            }
        } else if (multi) {
            // Cmd/Ctrl Click
            setSelectedIds(prev => {
                if (prev.includes(id)) return prev.filter(x => x !== id);
                return [...prev, id];
            });
            lastSelectedIdRef.current = id;
        } else {
            // Single Click
            selectAndSnap(id);
        }
    }, [allImages, selectAndSnap]);

    // Trigger fit when multi-selection changes
    useEffect(() => {
        if (selectedIds.length > 1) {
            fitSelectionToView();
        }
    }, [selectedIds.length, fitSelectionToView]);

    // --- Anchor Selection on Zoom (Single Item) ---
    useLayoutEffect(() => {
        // Only snap to single item if 1 selected. If multi, the group zoom logic handles it.
        if (selectedIds.length === 1 && primarySelectedId && scrollContainerRef.current) {
            const el = scrollContainerRef.current.querySelector(`[data-image-id="${primarySelectedId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
            }
        }
    }, [zoom]);

    const handleModeChange = (newMode: 'prompt' | 'brush' | 'objects') => {
        setSideSheetMode(newMode);

        if (newMode === 'brush' || newMode === 'objects') {
            if (selectedImage) {
                const sidebarWidth = 360;
                const availableWidth = Math.max(window.innerWidth - sidebarWidth, 100);
                const availableHeight = Math.max(window.innerHeight, 100);
                const scaleX = availableWidth / selectedImage.width;
                const scaleY = availableHeight / selectedImage.height;
                const fitZoom = Math.min(scaleX, scaleY) * 0.9;
                smoothZoomTo(fitZoom);
            } else {
                smoothZoomTo(1.0);
            }
        } else if (newMode === 'prompt') {
            smoothZoomTo(1.0);
        }
    };

    // --- Scroll Logic (Focus Tracking) ---
    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current || isAutoScrollingRef.current || isZoomingRef.current || selectedIds.length > 1) return;

        const container = scrollContainerRef.current;
        if (focusCheckRafRef.current) cancelAnimationFrame(focusCheckRafRef.current);

        focusCheckRafRef.current = requestAnimationFrame(() => {
            if (isZoomingRef.current) return;

            const containerRect = container.getBoundingClientRect();
            const viewportCenterX = containerRect.left + (containerRect.width / 2);
            const viewportCenterY = containerRect.top + (containerRect.height / 2);
            const rowElements = container.querySelectorAll('[data-row-id]');
            let closestRow: Element | null = null;
            let minRowDist = Infinity;
            rowElements.forEach((rowEl) => {
                const rect = rowEl.getBoundingClientRect();
                const dist = Math.abs((rect.top + rect.height / 2) - viewportCenterY);
                if (dist < minRowDist) { minRowDist = dist; closestRow = rowEl; }
            });
            if (!closestRow) return;
            const imagesInRow = closestRow.querySelectorAll('[data-image-id]');
            let closestImageId: string | null = null;
            let minImgDist = Infinity;
            imagesInRow.forEach((img) => {
                const rect = img.getBoundingClientRect();
                const dist = Math.abs((rect.left + rect.width / 2) - viewportCenterX);
                if (dist < minImgDist) { minImgDist = dist; closestImageId = img.getAttribute('data-image-id'); }
            });

            if (closestImageId && primarySelectedId !== closestImageId) {
                setSelectedIds([closestImageId]);
            }
        });
    }, [primarySelectedId, selectedIds.length]);

    // Keyboard Navigation
    const moveSelection = useCallback((direction: -1 | 1) => {
        if (allImages.length === 0) return;
        const currentId = lastSelectedIdRef.current || primarySelectedId;
        let nextIndex = 0;
        if (currentId) {
            const currentIndex = allImages.findIndex(img => img.id === currentId);
            if (currentIndex !== -1) nextIndex = currentIndex + direction;
        }
        if (nextIndex < 0) nextIndex = 0;
        if (nextIndex >= allImages.length) nextIndex = allImages.length - 1;
        selectAndSnap(allImages[nextIndex].id);
    }, [allImages, primarySelectedId, selectAndSnap]);

    const moveRowSelection = useCallback((direction: -1 | 1) => {
        const currentId = lastSelectedIdRef.current || primarySelectedId;
        if (!currentId) { if (rows.length > 0 && rows[0].items.length > 0) selectAndSnap(rows[0].items[0].id); return; }
        let rowIndex = -1, colIndex = -1;
        for (let r = 0; r < rows.length; r++) {
            const index = rows[r].items.findIndex(item => item.id === currentId);
            if (index !== -1) { rowIndex = r; colIndex = index; break; }
        }
        if (rowIndex === -1) return;
        const targetRowIndex = rowIndex + direction;
        if (targetRowIndex >= 0 && targetRowIndex < rows.length) {
            const targetRow = rows[targetRowIndex];
            if (targetRow.items.length === 0) return;
            const targetColIndex = Math.min(colIndex, targetRow.items.length - 1);
            selectAndSnap(targetRow.items[targetColIndex].id);
        }
    }, [rows, primarySelectedId, selectAndSnap]);

    // Handle multiple files
    const processFiles = (files: File[]) => {
        const newImageIds: string[] = [];
        let processedCount = 0;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (typeof event.target?.result === 'string') {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        let w = img.width, h = img.height;
                        const maxDim = 500;
                        if (w > maxDim || h > maxDim) { const ratio = w / h; if (w > h) { w = maxDim; h = maxDim / ratio; } else { h = maxDim; w = maxDim * ratio; } }
                        const baseName = file.name.replace(/\.[^/.]+$/, "");
                        const newId = generateId();

                        const newImage: CanvasImage = {
                            id: newId,
                            src: event.target!.result as string,
                            width: w, height: h,
                            title: baseName, baseName: baseName,
                            version: 1, isGenerating: false, originalSrc: event.target!.result as string,
                            userDraftPrompt: '',
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        };

                        setRows(prev => [...prev, {
                            id: generateId(),
                            title: baseName,
                            items: [newImage],
                            createdAt: Date.now()
                        }]);

                        newImageIds.push(newId);
                        processedCount++;

                        // Once all files processed, select them all
                        if (processedCount === files.length) {
                            selectMultiple(newImageIds);
                            // Snap to the last one
                            lastSelectedIdRef.current = newId;
                            snapToItem(newId);
                        }
                    };
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const processFile = (file: File) => processFiles([file]);

    const handleFileDrop = async (e: React.DragEvent) => {
        e.preventDefault(); setIsDragOver(false);
        const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;
        processFiles(files);
    };

    const handleDeleteImage = useCallback((idOrIds: string | string[]) => {
        const idsToDelete = Array.isArray(idOrIds) ? idOrIds : [idOrIds];

        setRows(prev => {
            const newRows = prev.map(row => ({
                ...row,
                items: row.items.filter(item => !idsToDelete.includes(item.id))
            })).filter(row => row.items.length > 0);

            return newRows;
        });
        setSelectedIds(prev => prev.filter(id => !idsToDelete.includes(id)));
    }, []);

    const handleUpdateAnnotations = (id: string, newAnnotations: AnnotationObject[]) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, annotations: newAnnotations, updatedAt: Date.now() } : item)
        })));
    };

    const handleUpdatePrompt = (id: string, text: string) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, userDraftPrompt: text, updatedAt: Date.now() } : item)
        })));
    };

    // --- Core Generation Logic ---
    const performGeneration = async (sourceImage: CanvasImage, prompt: string) => {
        const cost = COSTS[qualityMode];
        if (credits < cost) { setIsSettingsOpen(true); return; }

        const rowIndex = rows.findIndex(row => row.items.some(item => item.id === sourceImage.id));
        if (rowIndex === -1) return;

        const row = rows[rowIndex];
        const sourceIndex = row.items.findIndex(item => item.id === sourceImage.id);

        // Update Supabase Credits
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').update({ credits: credits - cost }).eq('id', user.id);
        }
        setCredits(prev => prev - cost);

        const maskDataUrl = await generateMaskFromAnnotations(sourceImage);
        const baseName = sourceImage.baseName || sourceImage.title;
        const newVersion = (sourceImage.version || 1) + 1;
        const newId = generateId();

        const placeholder: CanvasImage = {
            ...sourceImage,
            id: newId,
            title: `${baseName}_v${newVersion}`,
            version: newVersion,
            isGenerating: true,
            generationStartTime: Date.now(),
            maskSrc: undefined,
            annotations: [],
            parentId: sourceImage.id,
            generationPrompt: prompt,
            userDraftPrompt: '',
            quality: qualityMode, // Store quality for duration estimation
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Record Job Start
        if (user) {
            await supabase.from('generation_jobs').insert({
                id: newId,
                user_id: user.id,
                user_name: user.email,
                type: maskDataUrl ? 'Inpaint' : 'Style',
                model: qualityMode,
                status: 'processing',
                cost: cost,
                prompt: prompt
            }).select().single();
        }

        setRows(prev => {
            const newRows = [...prev];
            const currentRow = newRows[rowIndex];
            const newItems = [...currentRow.items];
            newItems.splice(sourceIndex + 1, 0, placeholder);
            newRows[rowIndex] = { ...currentRow, items: newItems };
            return newRows;
        });

        if (selectedIds.length <= 1) selectAndSnap(newId);

        try {
            const newSrc = await editImageWithGemini(
                sourceImage.src,
                prompt,
                maskDataUrl || undefined,
                qualityMode,
                sourceImage.annotations || []
            );

            // Update Job Success
            if (user) {
                await supabase.from('generation_jobs').update({ status: 'completed' }).eq('id', newId);
            }

            setRows(prev => {
                const newRows = [...prev];
                const currentRow = newRows[rowIndex];
                const updated = currentRow.items.map(i => i.id === newId ? { ...i, src: newSrc, isGenerating: false, updatedAt: Date.now() } : i);
                newRows[rowIndex] = { ...currentRow, items: updated };
                return newRows;
            });
        } catch (error) {
            console.error("Generation failed:", error);
            // Update Job Failure
            if (user) {
                await supabase.from('generation_jobs').update({ status: 'failed' }).eq('id', newId);
            }
            if (selectedIds.length === 1) alert("Generation failed.");
            setRows(prev => {
                const newRows = [...prev];
                newRows[rowIndex] = { ...newRows[rowIndex], items: newRows[rowIndex].items.filter(i => i.id !== newId) };
                return newRows;
            });
            // Refund Supabase Credits
            if (user) {
                await supabase.from('profiles').update({ credits: credits + cost }).eq('id', user.id);
            }
            setCredits(prev => prev + cost);
            if (selectedIds.length <= 1) selectAndSnap(sourceImage.id);
        }
    };

    const handleGenerate = (prompt: string) => {
        selectedImages.forEach((img) => {
            performGeneration(img, prompt);
        });
    };

    const handleGenerateMore = (id: string) => {
        const item = allImages.find(i => i.id === id);
        if (!item || !item.parentId) return;
        const parent = allImages.find(i => i.id === item.parentId);
        if (!parent) return;
        performGeneration(parent, item.generationPrompt || "");
    };

    const handleNavigateParent = (id: string) => {
        const item = allImages.find(i => i.id === id);
        if (item && item.parentId) selectAndSnap(item.parentId);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            if (e.key === 'ArrowLeft') { e.preventDefault(); moveSelection(-1); }
            if (e.key === 'ArrowRight') { e.preventDefault(); moveSelection(1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); moveRowSelection(-1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); moveRowSelection(1); }
            if (e.key === '=' || e.key === '+') { e.preventDefault(); smoothZoomTo(zoom * 1.2); }
            if (e.key === '-' || e.key === '_') { e.preventDefault(); smoothZoomTo(zoom / 1.2); }
            if (e.key === '0') { e.preventDefault(); smoothZoomTo(1); }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedIds.length > 0) {
                    if (confirm(selectedIds.length > 1 ? t('delete_confirm_multi') : t('delete_confirm_single'))) {
                        handleDeleteImage(selectedIds);
                    }
                }
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                e.preventDefault();
                setSelectedIds(allImages.map(i => i.id));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveSelection, moveRowSelection, smoothZoomTo, zoom, selectedIds, handleDeleteImage, allImages, t]);

    return {
        state: {
            rows, setRows, selectedIds, zoom, credits, sideSheetMode, brushSize,
            isDragOver, isSettingsOpen, selectedImage, selectedImages, allImages, qualityMode,
            themeMode, lang, isAdminOpen, currentLang, fullLibrary, user, userProfile
        },
        actions: {
            setZoom, smoothZoomTo, handleScroll, handleFileDrop, processFile, selectAndSnap,
            moveSelection, handleAddFunds, setBrushSize, setSideSheetMode: handleModeChange,
            handleGenerate, handleGenerateMore, handleNavigateParent, handleUpdateAnnotations,
            handleUpdatePrompt, handleDeleteImage, setIsSettingsOpen, setIsDragOver, setQualityMode,
            setThemeMode, setLang, setIsAdminOpen, handleSelection, selectMultiple,
            addUserCategory, deleteUserCategory, addUserItem, deleteUserItem, handleSignOut
        },
        refs: { scrollContainerRef },
        t
    };
};
