
import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { imageService } from '../services/imageService';
import { CanvasImage, ImageRow, AnnotationObject } from '../types';
import { generateMaskFromAnnotations } from '../utils/maskGenerator';
import { generateId } from '../utils/ids';
import { useCanvasNavigation } from './useCanvasNavigation';
import { useToast } from '../components/ui/Toast';
import { useItemDialog } from '../components/ui/Dialog';
import { generateThumbnail } from '../utils/imageUtils';

import { useAuth } from './useAuth';
import { useLibrary } from './useLibrary';
import { useConfig } from './useConfig';
import { useSelection } from './useSelection';

// Cost mapping
const COSTS: Record<string, number> = {
    'fast': 0.00,
    'pro-1k': 0.50,
    'pro-2k': 1.00,
    'pro-4k': 2.00
};

// Base duration estimates (in ms)
const ESTIMATED_DURATIONS: Record<string, number> = {
    'fast': 12000,
    'pro-1k': 23000,
    'pro-2k': 36000,
    'pro-4k': 60000
};

export const useNanoController = () => {
    const { showToast } = useToast();
    const { confirm } = useItemDialog();

    // --- Data State ---
    const [rows, setRows] = useState<ImageRow[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // @ts-ignore
    const isAuthDisabled = import.meta.env.VITE_DISABLE_AUTH === 'true';

    // Refs
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const promptSaveTimeoutRef = useRef<any>(null);

    // Derived
    const allImages = rows.flatMap(r => r.items);

    // --- Modular Hooks ---
    const {
        qualityMode, setQualityMode,
        themeMode, setThemeMode,
        lang, setLang,
        currentLang, t,
        getResolvedLang
    } = useConfig();

    const {
        userLibrary, globalLibrary, fullLibrary,
        addUserCategory, deleteUserCategory,
        addUserItem, deleteUserItem
    } = useLibrary({ lang, currentLang });

    // --- Navigation ---
    const canvasNav = useCanvasNavigation({
        scrollContainerRef,
        selectedIds,
        allImages,
        primarySelectedId: selectedIds[selectedIds.length - 1] || null
    });

    const {
        zoom, setZoom, smoothZoomTo, fitSelectionToView, snapToItem,
        isZoomingRef, isAutoScrollingRef, getMostVisibleItem,
        isZooming, isAutoScrolling
    } = canvasNav;

    // --- Selection ---
    const {
        primarySelectedId,
        selectedImage,
        selectedImages,
        selectAndSnap,
        selectMultiple,
        handleSelection,
        moveSelection,
        moveRowSelection,
        handleScroll,
        setSnapEnabled
    } = useSelection({
        rows,
        snapToItem,
        fitSelectionToView,
        scrollContainerRef,
        zoom,
        isAutoScrollingRef,
        isZoomingRef,
        selectedIds,
        setSelectedIds,
        getMostVisibleItem
    });

    // --- Auth ---
    const {
        user, userProfile, credits, setCredits,
        authModalMode, setAuthModalMode,
        isAuthModalOpen, setIsAuthModalOpen,
        authEmail, setAuthEmail,
        authError, setAuthError,
        handleAddFunds, handleSignOut
    } = useAuth({
        isAuthDisabled,
        getResolvedLang,
        setRows,
        selectAndSnap
    });

    // --- UI State ---
    const [sideSheetMode, setSideSheetMode] = useState<'prompt' | 'brush' | 'objects'>('prompt');
    const [brushSize, setBrushSize] = useState(150);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAdminOpen, setIsAdminOpen] = useState(false);

    // --- Helpers & Actions ---

    // Helper for Files
    const onAddReference = (file: File, annotationId?: string) => {
        if (!selectedImage) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            if (typeof event.target?.result === 'string') {
                const src = event.target.result;
                if (annotationId) {
                    const newAnns = (selectedImage.annotations || []).map(ann =>
                        ann.id === annotationId ? { ...ann, referenceImage: src } : ann
                    );
                    handleUpdateAnnotations(selectedImage.id, newAnns);
                    showToast(t('image_ref') + " " + t('added'), "success");
                } else {
                    const newId = generateId();
                    const newRef: AnnotationObject = {
                        id: newId,
                        type: 'reference_image',
                        points: [],
                        strokeWidth: 0,
                        color: '#fff',
                        referenceImage: src,
                        createdAt: Date.now()
                    };
                    const newAnns = [...(selectedImage.annotations || []), newRef];
                    handleUpdateAnnotations(selectedImage.id, newAnns);
                }
            }
        };
        reader.readAsDataURL(file);
    };

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

                        // Generate thumbnail
                        generateThumbnail(event.target!.result as string).then(thumbSrc => {
                            const newImage: CanvasImage = {
                                id: newId,
                                src: event.target!.result as string,
                                thumbSrc: thumbSrc,
                                width: w, height: h,
                                realWidth: img.width, realHeight: img.height,
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

                            if (processedCount === files.length) {
                                selectMultiple(newImageIds);
                                snapToItem(newId);
                            }

                            if (user && !isAuthDisabled) {
                                imageService.persistImage(newImage, user.id).then(result => {
                                    if (!result.success) showToast(`Save Failed: ${result.error}`, "error");
                                });
                            }
                        });
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

        if (user && !isAuthDisabled) {
            imageService.deleteImages(idsToDelete, user.id).catch(err => {
                showToast(`Delete failed: ${err.message}`, "error");
            });
        }
    }, [user, isAuthDisabled, t]);

    const handleUpdateAnnotations = (id: string, newAnnotations: AnnotationObject[]) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, annotations: newAnnotations, updatedAt: Date.now() } : item)
        })));

        if (user && !isAuthDisabled) {
            imageService.updateImage(id, { annotations: newAnnotations }, user.id)
                .catch(err => console.error("Failed to save annotations", err));
        }
    };

    const handleUpdatePrompt = (id: string, text: string) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, userDraftPrompt: text, updatedAt: Date.now() } : item)
        })));

        if (promptSaveTimeoutRef.current) clearTimeout(promptSaveTimeoutRef.current);
        promptSaveTimeoutRef.current = setTimeout(() => {
            if (user && !isAuthDisabled) {
                imageService.updateImage(id, { userDraftPrompt: text }, user.id)
                    .catch(err => console.error("Failed to save prompt", err));
            }
        }, 1000);
    };

    // --- Mode Change ---
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

    // --- Generation ---
    const performGeneration = async (sourceImage: CanvasImage, prompt: string, batchSize: number = 1) => {
        const cost = COSTS[qualityMode];
        const isPro = userProfile?.role === 'pro';

        if (!isPro && credits < cost) { setIsSettingsOpen(true); return; }

        const rowIndex = rows.findIndex(row => row.items.some(item => item.id === sourceImage.id));
        if (rowIndex === -1) return;
        const row = rows[rowIndex];

        // Debit Credits
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && !isPro) {
            await supabase.from('profiles').update({ credits: credits - cost }).eq('id', currentUser.id);
        }
        if (!isPro) {
            setCredits(prev => prev - cost);
        }

        const maskDataUrl = await generateMaskFromAnnotations(sourceImage);
        const baseName = sourceImage.baseName || sourceImage.title;

        const siblings = row.items.filter(i => (i.baseName || i.title).startsWith(baseName));
        const maxVersion = siblings.reduce((max, item) => Math.max(max, item.version || 1), 0);
        const newVersion = maxVersion + 1;
        const newId = generateId();

        const activeCount = rows.flatMap(r => r.items).filter(i => i.isGenerating).length;
        const currentConcurrency = activeCount + batchSize;
        const baseDuration = ESTIMATED_DURATIONS[qualityMode] || 23000;
        const estimatedDuration = Math.round(baseDuration * (1 + (currentConcurrency - 1) * 0.3));

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
            quality: qualityMode,
            estimatedDuration,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        if (currentUser && !isAuthDisabled) {
            try {
                await supabase.from('generation_jobs').insert({
                    id: newId,
                    user_id: currentUser.id,
                    user_name: currentUser.email,
                    type: maskDataUrl ? 'Inpaint' : 'Style',
                    model: qualityMode,
                    status: 'processing',
                    cost: cost,
                    prompt: prompt,
                    concurrent_jobs: currentConcurrency
                }).select().single();
            } catch (dbErr) {
                console.warn("Failed to log generation job:", dbErr);
            }
        }

        setRows(prev => {
            const newRows = [...prev];
            const correctRowIndex = newRows.findIndex(r => r.items.some(i => i.id === sourceImage.id));
            if (correctRowIndex === -1) return prev;
            const currentRow = newRows[correctRowIndex];
            const newItems = [...currentRow.items, placeholder];
            newRows[correctRowIndex] = { ...currentRow, items: newItems };
            return newRows;
        });

        // Snap to new placeholder immediately
        setTimeout(() => selectAndSnap(newId), 50);

        try {
            const finalImage = await imageService.processGeneration({
                sourceImage,
                prompt,
                qualityMode,
                maskDataUrl: maskDataUrl || undefined,
                newId,
                modelName: qualityMode
            });

            if (finalImage) {
                setRows(prev => {
                    const newRows = [...prev];
                    const rIdx = newRows.findIndex(r => r.items.some(i => i.id === newId));
                    if (rIdx !== -1) {
                        const r = newRows[rIdx];
                        const updatedItems = r.items.map(i => i.id === newId ? finalImage : i);
                        newRows[rIdx] = { ...r, items: updatedItems };
                    }
                    return newRows;
                });

                if (currentUser && !isAuthDisabled) {
                    await imageService.persistImage(finalImage, currentUser.id);
                }
            } else {
                throw new Error("Generation returned no image");
            }
        } catch (error: any) {
            console.error("Generation failed:", error);
            showToast(`Generation failed: ${error.message}`, "error");

            // Remove placeholder
            setRows(prev => {
                const newRows = prev.map(r => ({
                    ...r,
                    items: r.items.filter(i => i.id !== newId)
                })).filter(r => r.items.length > 0);
                return newRows;
            });

            // Refund
            if (!isPro) {
                setCredits(prev => prev + cost);
                try {
                    const { data: { user: refundUser } } = await supabase.auth.getUser();
                    if (refundUser) {
                        await supabase.from('profiles').update({ credits: credits }).eq('id', refundUser.id);
                    }
                } catch (e) { console.error("Refund failed", e); }
            }
        }
    };

    const handleGenerate = () => {
        if (selectedImage) performGeneration(selectedImage, selectedImage.userDraftPrompt || '');
    };

    const handleGenerateMore = (img: CanvasImage) => {
        performGeneration(img, img.generationPrompt || img.userDraftPrompt || '');
    };

    const handleNavigateParent = (parentId: string) => {
        const parent = allImages.find(i => i.id === parentId);
        if (parent) selectAndSnap(parentId);
    };

    return {
        state: {
            rows,
            selectedIds,
            primarySelectedId,
            selectedImage,
            selectedImages,
            allImages,
            zoom,
            isZooming,
            isAutoScrolling,
            qualityMode,
            themeMode,
            lang,
            currentLang,
            sideSheetMode,
            brushSize,
            userLibrary,
            globalLibrary,
            fullLibrary,
            user,
            userProfile,
            credits,
            authModalMode,
            isAuthModalOpen,
            authEmail,
            authError,
            isDragOver,
            isSettingsOpen,
            isAdminOpen
        },
        actions: {
            setRows,
            setZoom,
            smoothZoomTo,
            fitSelectionToView,
            snapToItem,
            handleScroll,
            getMostVisibleItem,
            setQualityMode,
            setThemeMode,
            setLang,
            handleModeChange,
            setSideSheetMode,
            setBrushSize,
            addUserCategory,
            deleteUserCategory,
            addUserItem,
            deleteUserItem,
            selectAndSnap,
            selectMultiple,
            handleSelection,
            moveSelection,
            moveRowSelection,
            setAuthModalMode,
            setIsAuthModalOpen,
            setAuthEmail,
            setAuthError,
            handleAddFunds,
            handleSignOut,
            setIsDragOver,
            handleFileDrop,
            setIsSettingsOpen,
            setIsAdminOpen,
            processFile,
            handleDeleteImage,
            handleUpdateAnnotations,
            handleUpdatePrompt,
            onAddReference,
            performGeneration,
            handleGenerate,
            handleGenerateMore,
            handleNavigateParent,
            setSnapEnabled
        },
        refs: {
            scrollContainerRef
        },
        t
    };
};
