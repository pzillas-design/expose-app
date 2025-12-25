import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { imageService } from '../services/imageService';
import { CanvasImage, ImageRow, AnnotationObject, GenerationQuality, TranslationKey } from '../types';
import { editImageWithGemini } from '../services/geminiService';
import { generateMaskFromAnnotations } from '../utils/maskGenerator';
import { generateId } from '../utils/ids';
import { useCanvasNavigation } from './useCanvasNavigation';
import { useToast } from '../components/ui/Toast';
import { useItemDialog } from '../components/ui/Dialog';
import { generateThumbnail } from '../utils/imageUtils';
import { useConfig } from './useConfig';
import { useLibrary } from './useLibrary';
import { useAuth } from './useAuth';

// Cost mapping
const COSTS: Record<GenerationQuality, number> = {
    'fast': 0.00,
    'pro-1k': 0.50,
    'pro-2k': 1.00,
    'pro-4k': 2.00
};

// Base duration estimates (in ms)
const ESTIMATED_DURATIONS: Record<GenerationQuality, number> = {
    'fast': 12000,
    'pro-1k': 23000,
    'pro-2k': 36000,
    'pro-4k': 60000
};

export const useNanoController = () => {
    const { showToast } = useToast();
    const { confirm } = useItemDialog();

    // --- Core State ---
    const [rows, setRows] = useState<ImageRow[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sideSheetMode, setSideSheetMode] = useState<'prompt' | 'brush' | 'objects'>('prompt');
    const [brushSize, setBrushSize] = useState(150);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAdminOpen, setIsAdminOpen] = useState(false);

    // Refs
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastSelectedIdRef = useRef<string | null>(null);
    const focusCheckRafRef = useRef<number | null>(null);
    const promptSaveTimeoutRef = useRef<any>(null);
    const isSnapEnabledRef = useRef(true);

    // @ts-ignore
    const isAuthDisabled = import.meta.env.VITE_DISABLE_AUTH === 'true';

    // --- Domain Hooks ---
    const config = useConfig();
    const { lang, currentLang, qualityMode, t, getResolvedLang } = config;

    const auth = useAuth({
        isAuthDisabled,
        getResolvedLang,
        setRows,
        selectAndSnap: (id) => selectAndSnap(id)
    });
    const { user, userProfile, credits, setCredits } = auth;

    const library = useLibrary({ lang, currentLang });
    const { fullLibrary, userLibrary, globalLibrary } = library;

    // --- Derived ---
    const allImages = rows.flatMap(r => r.items);
    const primarySelectedId = selectedIds[selectedIds.length - 1] || null;
    const selectedImage = allImages.find(img => img.id === primarySelectedId) || null;
    const selectedImages = allImages.filter(img => selectedIds.includes(img.id));

    // --- Navigation ---
    const {
        zoom, isZooming, isAutoScrolling, setZoom, smoothZoomTo, fitSelectionToView, snapToItem,
        isZoomingRef, isAutoScrollingRef
    } = useCanvasNavigation({
        scrollContainerRef,
        selectedIds,
        allImages,
        primarySelectedId
    });

    // --- Selection Logic ---
    const selectAndSnap = useCallback((id: string) => {
        if (focusCheckRafRef.current) cancelAnimationFrame(focusCheckRafRef.current);
        isSnapEnabledRef.current = true;
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
            const lastIdx = allImages.findIndex(i => i.id === lastSelectedIdRef.current);
            const currIdx = allImages.findIndex(i => i.id === id);
            if (lastIdx !== -1 && currIdx !== -1) {
                const start = Math.min(lastIdx, currIdx);
                const end = Math.max(lastIdx, currIdx);
                const rangeIds = allImages.slice(start, end + 1).map(i => i.id);
                setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])));
            }
        } else if (multi) {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
            lastSelectedIdRef.current = id;
        } else {
            isSnapEnabledRef.current = true;
            selectAndSnap(id);
        }
    }, [allImages, selectAndSnap]);

    useEffect(() => {
        if (selectedIds.length > 1) fitSelectionToView();
    }, [selectedIds.length, fitSelectionToView]);

    useLayoutEffect(() => {
        if (selectedIds.length === 1 && primarySelectedId && scrollContainerRef.current && !isZooming && !isAutoScrolling) {
            const el = scrollContainerRef.current.querySelector(`[data-image-id="${primarySelectedId}"]`);
            if (el) el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
        }
    }, [zoom, isZooming, isAutoScrolling]);

    // --- Mode Change ---
    const handleModeChange = (newMode: 'prompt' | 'brush' | 'objects') => {
        setSideSheetMode(newMode);
        if (newMode === 'brush' || newMode === 'objects') {
            if (selectedImage) {
                const sidebarWidth = 360;
                const fitZoom = Math.min(
                    (window.innerWidth - sidebarWidth) / selectedImage.width,
                    window.innerHeight / selectedImage.height
                ) * 0.9;
                smoothZoomTo(fitZoom);
            } else {
                smoothZoomTo(1.0);
            }
        } else {
            smoothZoomTo(1.0);
        }
    };

    // --- Scroll Logic ---
    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current || isAutoScrollingRef.current || isZoomingRef.current || selectedIds.length > 1 || !isSnapEnabledRef.current) return;
        const container = scrollContainerRef.current;
        if (focusCheckRafRef.current) cancelAnimationFrame(focusCheckRafRef.current);
        focusCheckRafRef.current = requestAnimationFrame(() => {
            if (isZoomingRef.current || isAutoScrollingRef.current) return;
            const rowElements = container.querySelectorAll('[data-row-id]');
            let closestRow: Element | null = null;
            let minRowDist = Infinity;
            rowElements.forEach(rowEl => {
                const dist = Math.abs((rowEl.getBoundingClientRect().top + rowEl.getBoundingClientRect().height / 2) - (container.getBoundingClientRect().top + container.getBoundingClientRect().height / 2));
                if (dist < minRowDist) { minRowDist = dist; closestRow = rowEl; }
            });
            if (!closestRow) return;
            const imagesInRow = closestRow.querySelectorAll('[data-image-id]');
            let closestImageId: string | null = null;
            let minImgDist = Infinity;
            imagesInRow.forEach(img => {
                const dist = Math.abs((img.getBoundingClientRect().left + img.getBoundingClientRect().width / 2) - (container.getBoundingClientRect().left + container.getBoundingClientRect().width / 2));
                if (dist < minImgDist) { minImgDist = dist; closestImageId = img.getAttribute('data-image-id'); }
            });
            if (closestImageId && primarySelectedId !== closestImageId) setSelectedIds([closestImageId]);
        });
    }, [primarySelectedId, selectedIds.length]);

    // --- Image Processing ---
    const processFiles = (files: File[]) => {
        const newImageIds: string[] = [];
        let processedCount = 0;
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (typeof event.target?.result !== 'string') return;
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const maxDim = 500;
                    let w = img.width, h = img.height;
                    if (w > maxDim || h > maxDim) {
                        const ratio = w / h;
                        if (w > h) { w = maxDim; h = maxDim / ratio; }
                        else { h = maxDim; w = maxDim * ratio; }
                    }
                    generateThumbnail(img.src).then(thumbSrc => {
                        const newId = generateId();
                        const baseName = file.name.replace(/\.[^/.]+$/, "");
                        const newImage: CanvasImage = {
                            id: newId, src: img.src, thumbSrc, width: w, height: h, realWidth: img.width, realHeight: img.height,
                            title: baseName, baseName, version: 1, isGenerating: false, originalSrc: img.src, userDraftPrompt: '',
                            createdAt: Date.now(), updatedAt: Date.now()
                        };
                        setRows(prev => [...prev, { id: generateId(), title: baseName, items: [newImage], createdAt: Date.now() }]);
                        newImageIds.push(newId);
                        if (++processedCount === files.length) {
                            selectMultiple(newImageIds);
                            lastSelectedIdRef.current = newId;
                            snapToItem(newId);
                        }
                        if (user && !isAuthDisabled) imageService.persistImage(newImage, user.id);
                    });
                };
            };
            reader.readAsDataURL(file);
        });
    };

    const handleDeleteImage = useCallback((idOrIds: string | string[]) => {
        const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
        setRows(prev => prev.map(r => ({ ...r, items: r.items.filter(i => !ids.includes(i.id)) })).filter(r => r.items.length > 0));
        setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
        if (user && !isAuthDisabled) imageService.deleteImages(ids, user.id).catch(err => showToast(`Delete failed: ${err.message}`, "error"));
    }, [user, isAuthDisabled]);

    const handleUpdateAnnotations = (id: string, anns: AnnotationObject[]) => {
        setRows(prev => prev.map(r => ({ ...r, items: r.items.map(i => i.id === id ? { ...i, annotations: anns, updatedAt: Date.now() } : i) })));
        if (user && !isAuthDisabled) imageService.updateImage(id, { annotations: anns }, user.id);
    };

    const handleUpdatePrompt = (id: string, text: string) => {
        setRows(prev => prev.map(r => ({ ...r, items: r.items.map(i => i.id === id ? { ...i, userDraftPrompt: text, updatedAt: Date.now() } : i) })));
        if (promptSaveTimeoutRef.current) clearTimeout(promptSaveTimeoutRef.current);
        promptSaveTimeoutRef.current = setTimeout(() => {
            if (user && !isAuthDisabled) imageService.updateImage(id, { userDraftPrompt: text }, user.id);
        }, 1000);
    };

    const performGeneration = async (source: CanvasImage, prompt: string, batchSize: number = 1) => {
        const cost = COSTS[qualityMode];
        if (userProfile?.role !== 'pro' && credits < cost) { setIsSettingsOpen(true); return; }

        const rowIndex = rows.findIndex(r => r.items.some(i => i.id === source.id));
        if (rowIndex === -1) return;

        if (user && !isAuthDisabled && userProfile?.role !== 'pro') {
            await supabase.from('profiles').update({ credits: credits - cost }).eq('id', user.id);
            setCredits(prev => prev - cost);
        }

        const maskSrc = await generateMaskFromAnnotations(source);
        const newId = generateId();
        const baseName = source.baseName || source.title;
        const siblings = rows[rowIndex].items.filter(i => (i.baseName || i.title).startsWith(baseName));
        const newVer = Math.max(...siblings.map(s => s.version || 1)) + 1;
        const currentConcurrency = rows.flatMap(r => r.items).filter(i => i.isGenerating).length + batchSize;
        const estimatedDuration = Math.round((ESTIMATED_DURATIONS[qualityMode] || 23000) * (1 + (currentConcurrency - 1) * 0.3));

        const placeholder: CanvasImage = {
            ...source, id: newId, title: `${baseName}_v${newVer}`, version: newVer, isGenerating: true,
            generationStartTime: Date.now(), annotations: [], parentId: source.id, generationPrompt: prompt,
            userDraftPrompt: '', quality: qualityMode, estimatedDuration, createdAt: Date.now(), updatedAt: Date.now()
        };

        if (user && !isAuthDisabled) {
            void supabase.from('generation_jobs').insert({
                id: newId, user_id: user.id, user_name: user.email, type: maskSrc ? 'Inpaint' : 'Style',
                model: qualityMode, status: 'processing', cost, prompt, concurrent_jobs: currentConcurrency
            });
        }

        setRows(prev => prev.map((r, i) => i === rowIndex ? { ...r, items: [...r.items, placeholder] } : r));
        if (selectedIds.length <= 1) selectAndSnap(newId);

        try {
            const { imageBase64: newSrc, usageMetadata, modelVersion } = await editImageWithGemini(source.src, prompt, maskSrc || undefined, qualityMode, source.annotations || []);
            let apiCost = 0;
            if (usageMetadata) apiCost = (usageMetadata.promptTokenCount || 0) / 1000000 * 3.50 + (usageMetadata.candidatesTokenCount || 0) / 1000000 * 10.50;
            if (user && !isAuthDisabled) void supabase.from('generation_jobs').update({ status: 'completed', api_cost: apiCost }).eq('id', newId);

            const mImg = new Image(); mImg.src = newSrc; await new Promise(res => mImg.onload = res);
            const thumbSrc = await generateThumbnail(newSrc);

            const completed: CanvasImage = { ...placeholder, src: newSrc, thumbSrc, realWidth: mImg.width, realHeight: mImg.height, modelVersion, isGenerating: false, updatedAt: Date.now() };
            setRows(prev => prev.map(r => ({ ...r, items: r.items.map(i => i.id === newId ? completed : i) })));
            if (user && !isAuthDisabled) imageService.persistImage(completed, user.id);
        } catch (err) {
            if (user && !isAuthDisabled && userProfile?.role !== 'pro') {
                await supabase.from('profiles').update({ credits: credits + cost }).eq('id', user.id);
                setCredits(prev => prev + cost);
            }
            showToast(t('generation_failed'), 'error');
            setRows(prev => prev.map(r => ({ ...r, items: r.items.filter(i => i.id !== newId) })));
            if (selectedIds.length <= 1) selectAndSnap(source.id);
        }
    };

    const handleGenerate = (p: string) => selectedImages.forEach(img => performGeneration(img, p, selectedImages.length));
    const handleGenerateMore = (id: string) => {
        const item = allImages.find(i => i.id === id);
        if (item?.parentId) {
            const parent = allImages.find(i => i.id === item.parentId);
            if (parent) performGeneration(parent, item.generationPrompt || "");
        }
    };

    // --- Keyboard ---
    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
            const moveSelection = (d: -1 | 1) => {
                const cur = lastSelectedIdRef.current || primarySelectedId;
                const idx = cur ? allImages.findIndex(i => i.id === cur) : -1;
                const next = Math.max(0, Math.min(allImages.length - 1, (idx === -1 ? 0 : idx + d)));
                if (allImages[next]) selectAndSnap(allImages[next].id);
            };
            const moveRow = (d: -1 | 1) => {
                const cur = lastSelectedIdRef.current || primarySelectedId;
                const rIdx = rows.findIndex(r => r.items.some(i => i.id === cur));
                const cIdx = rIdx !== -1 ? rows[rIdx].items.findIndex(i => i.id === cur) : -1;
                const nextR = Math.max(0, Math.min(rows.length - 1, rIdx + d));
                if (rows[nextR]?.items.length) selectAndSnap(rows[nextR].items[Math.min(cIdx, rows[nextR].items.length - 1)].id);
            };

            if (e.key === 'ArrowLeft') { e.preventDefault(); moveSelection(-1); }
            if (e.key === 'ArrowRight') { e.preventDefault(); moveSelection(1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); moveRow(-1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); moveRow(1); }
            if (['=', '+'].includes(e.key)) { e.preventDefault(); smoothZoomTo(zoom * 1.2); }
            if (['-', '_'].includes(e.key)) { e.preventDefault(); smoothZoomTo(zoom / 1.2); }
            if (e.key === '0') { e.preventDefault(); smoothZoomTo(1); }
            if (['Delete', 'Backspace'].includes(e.key) && selectedIds.length) {
                confirm({ title: t('delete'), description: selectedIds.length > 1 ? (currentLang === 'de' ? `Löschen?` : `Delete?`) : t('delete_confirm_single'), confirmLabel: t('delete'), variant: 'danger' })
                    .then(ok => ok && handleDeleteImage(selectedIds));
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'a') { e.preventDefault(); setSelectedIds(allImages.map(i => i.id)); }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [allImages, rows, zoom, selectedIds, smoothZoomTo, selectAndSnap, primarySelectedId, handleDeleteImage, confirm, t, currentLang]);

    return {
        state: {
            rows, setRows, selectedIds, primarySelectedId, zoom, isZooming, isAutoScrolling, sideSheetMode, brushSize,
            isDragOver, isSettingsOpen, selectedImage, selectedImages, allImages, isAdminOpen, currentLang, ...auth, ...config, ...library
        },
        actions: {
            setZoom, smoothZoomTo, handleScroll, selectAndSnap, handleSelection, selectMultiple, setBrushSize, setSideSheetMode: handleModeChange,
            handleGenerate, handleGenerateMore, handleNavigateParent: (id: string) => { const i = allImages.find(x => x.id === id); if (i?.parentId) selectAndSnap(i.parentId); },
            handleUpdateAnnotations, handleUpdatePrompt, handleDeleteImage, setIsSettingsOpen, setIsDragOver, setIsAdminOpen,
            moveSelection: (d: -1 | 1, fromId?: string) => {
                const cur = fromId || lastSelectedIdRef.current || primarySelectedId;
                const idx = cur ? allImages.findIndex(i => i.id === cur) : -1;
                const next = Math.max(0, Math.min(allImages.length - 1, (idx === -1 ? 0 : idx + d)));
                if (allImages[next]) selectAndSnap(allImages[next].id);
            },
            moveRowSelection: (d: -1 | 1) => {
                const cur = lastSelectedIdRef.current || primarySelectedId;
                const rIdx = rows.findIndex(r => r.items.some(i => i.id === cur));
                const cIdx = rIdx !== -1 ? rows[rIdx].items.findIndex(i => i.id === cur) : -1;
                const nextR = Math.max(0, Math.min(rows.length - 1, rIdx + d));
                if (rows[nextR]?.items.length) selectAndSnap(rows[nextR].items[Math.min(cIdx, rows[nextR].items.length - 1)].id);
            },
            onAddReference: (file: File, annId?: string) => {
                if (!selectedImage) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const src = ev.target?.result as string;
                    const anns = (selectedImage.annotations || []);
                    const nextAnns = annId ? anns.map(a => a.id === annId ? { ...a, referenceImage: src } : a) : [...anns, { id: generateId(), type: 'reference_image', points: [], strokeWidth: 0, color: '#fff', referenceImage: src, createdAt: Date.now() }];
                    handleUpdateAnnotations(selectedImage.id, nextAnns);
                };
                reader.readAsDataURL(file);
            },
            handleFileDrop: (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/')); if (files.length) processFiles(files); },
            processFile: (file: File) => processFiles([file]),
            setSnapEnabled: (bv: boolean) => { isSnapEnabledRef.current = bv; },
            ...auth, ...config, ...library
        },
        refs: { scrollContainerRef },
        t
    };
};
