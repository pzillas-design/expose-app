import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { imageService } from '../services/imageService';
import { CanvasImage, ImageRow, AnnotationObject } from '../types';
import { generateId } from '../utils/ids';
import { downloadImage } from '../utils/imageUtils';
// useCanvasNavigation.ts import removed - free canvas is no longer used
import { useToast } from '../components/ui/Toast';
import { useItemDialog } from '../components/ui/Dialog';

import { useAuth } from './useAuth';
import { useLibrary } from './useLibrary';
import { useConfig } from './useConfig';
import { useSelection } from './useSelection';
import { useUIState } from './useUIState';
import { useFileHandler } from './useFileHandler';
import { useGeneration } from './useGeneration';
import { usePersistence } from './usePersistence';
import { usePresets } from './usePresets';
import { useAutoSave } from './useAutoSave';
import { useMobile } from './useMobile';

export const useNanoController = () => {
    const { showToast } = useToast();
    const { confirm } = useItemDialog();

    // --- Data State ---
    const [rows, setRows] = useState<ImageRow[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null); // viewed/focused image
    const [isCanvasLoading, setIsCanvasLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const offsetRef = useRef(0);
    const PAGE_SIZE = 50;

    // @ts-ignore
    const isAuthDisabled = import.meta.env.VITE_DISABLE_AUTH === 'true' ||
        (typeof window !== 'undefined' && window.location.hostname === 'beta.expose.ae');


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
        user, userProfile, credits, setCredits,
        authModalMode, setAuthModalMode,
        isAuthModalOpen, setIsAuthModalOpen,
        authEmail, setAuthEmail,
        authError, setAuthError,
        isAuthLoading,
        handleAddFunds, handleSignOut, updateProfile, deleteAccount,
        ensureValidSession
    } = useAuth({
        isAuthDisabled,
        getResolvedLang,
        t
    });

    const {
        userLibrary, globalLibrary, fullLibrary,
        addUserCategory, deleteUserCategory,
        addUserItem, deleteUserItem, syncGlobalItems
    } = useLibrary({ lang, currentLang, user });

    const {
        sideSheetMode, setSideSheetMode,
        brushSize, setBrushSize,
        maskTool, setMaskTool,
        activeShape, setActiveShape,
        isDragOver, setIsDragOver,
        isSettingsOpen, setIsSettingsOpen,
        isAdminOpen, setIsAdminOpen,
        isBrushResizing, setIsBrushResizing,
        previousNav, setPreviousNav,
        isSelectMode, setIsSelectMode
    } = useUIState();


    const isMobile = useMobile();

    const {
        primarySelectedId,
        selectedImage,
        selectedImages,
        selectAndSnap,
        selectMultiple,
        deselectAll,
        handleSelection,
        moveSelection,
        moveRowSelection,
    } = useSelection({
        rows,
        selectedIds,
        setSelectedIds,
        activeId,
        setActiveId,
    });


    const { templates, refreshTemplates, saveTemplate, deleteTemplate, recordPresetUsage } = usePresets(user?.id);

    const loadFeed = useCallback(async (isInitial = false) => {
        if (!user) return;

        if (isInitial) {
            setIsCanvasLoading(true);
            setLoadingProgress(10);
            offsetRef.current = 0;
            setHasMore(true);
        }

        const currentOffset = offsetRef.current;
        const progressInterval = isInitial ? setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 90) return 90;
                return prev + (90 - prev) * 0.1;
            });
        }, 200) : null;

        try {
            const loadedRows = await imageService.loadUserImages(user.id, PAGE_SIZE, currentOffset);
            console.log(`[DEBUG] loadUserImages result: ${loadedRows.length} rows found for offset ${currentOffset}`);

            if (progressInterval) clearInterval(progressInterval);
            if (isInitial) {
                setLoadingProgress(100);
                setTimeout(() => setLoadingProgress(0), 500);
            }

            if (loadedRows.length < PAGE_SIZE) {
                setHasMore(false);
            }

            setRows(prev => isInitial ? loadedRows : [...prev, ...loadedRows]);
            offsetRef.current += PAGE_SIZE;

            if (isInitial && selectedIds.length === 0) {
                const allLoaded = loadedRows.flatMap(r => r.items);
                if (allLoaded.length > 0) {
                    const newest = [...allLoaded].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
                    if (newest) requestAnimationFrame(() => setActiveId(newest.id));
                }
            }
        } catch (err) {
            console.error("Failed to load feed:", err);
            if (progressInterval) clearInterval(progressInterval);
        } finally {
            if (isInitial) setIsCanvasLoading(false);
        }
    }, [user, selectedIds.length, setActiveId, setRows]);

    React.useEffect(() => {
        if (user) {
            loadFeed(true);
        } else {
            setRows([]);
            setIsCanvasLoading(false);
            setHasMore(false);
            offsetRef.current = 0;
        }
    }, [user, loadFeed]);

    const handleLoadMore = useCallback(() => {
        if (!isCanvasLoading && hasMore) {
            loadFeed(false);
        }
    }, [isCanvasLoading, hasMore, loadFeed]);

    const ensureImageLoaded = useCallback(async (id: string) => {
        if (!user || allImages.some(img => img.id === id)) return;

        console.log(`[useNanoController] ensuring image ${id} is loaded...`);
        try {
            const extraRows = await imageService.loadImageById(id);
            if (extraRows.length > 0) {
                setRows(prev => {
                    // Avoid duplicates
                    const existingRowIds = new Set(prev.map(r => r.id));
                    const newRows = extraRows.filter(r => !existingRowIds.has(r.id));
                    return [...prev, ...newRows];
                });
            }
        } catch (err) {
            console.error("Failed to ensure image loaded:", err);
        }
    }, [user, allImages, setRows]);

    // --- File & Generation Hooks ---
    const { processFiles, processFile } = useFileHandler({
        user, isAuthDisabled, setRows, selectMultiple, showToast, setIsSettingsOpen, t
    });

    const { performGeneration, performNewGeneration } = useGeneration({
        rows, setRows, user, userProfile, credits, setCredits,
        qualityMode, isAuthDisabled, selectAndSnap, setIsSettingsOpen, showToast, t, confirm
    });

    const { handleUpdateAnnotations, handleUpdatePrompt, handleUpdateVariables } = usePersistence({
        user, isAuthDisabled, setRows
    });

    // Auto-Save: Background persistence every 30s
    useAutoSave(rows, user, isAuthDisabled);

    // --- Actions --- (Integrated via Hooks above)


    const handleFileDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;
        processFiles(files);
    }, [processFiles, setIsDragOver]);

    const handleDeleteImage = useCallback((id: string) => {
        if (!user) {
            showToast(currentLang === 'de' ? 'Bitte logge dich ein' : 'Please log in', 'error');
            return;
        }

        setRows(prev => {
            return prev.map(row => {
                if (row.items.some(i => i.id === id)) {
                    return { ...row, items: row.items.filter(i => i.id !== id) };
                }
                return row;
            }).filter(row => row.items.length > 0);
        });

        if (activeId === id) {
            setActiveId(null);
        }

        const imageToDelete = rows.flatMap(r => r.items).find(i => i.id === id);
        if (imageToDelete) {
            imageService.deleteImage(imageToDelete, user.id).catch(err => {
                console.error("Delete failed:", err);
                showToast(currentLang === 'de' ? 'Löschen fehlgeschlagen' : 'Delete failed', 'error');
            });
        }
    }, [user, rows, activeId, primarySelectedId, setRows, setActiveId, showToast, currentLang]);

    const handleDownload = useCallback(async (idOrIds: string | string[]) => {
        const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
        const imagesToDownload = allImages.filter(img => ids.includes(img.id));

        for (const img of imagesToDownload) {
            const urlToDownload = img.storage_path || img.src || img.originalSrc;
            if (urlToDownload && !img.isGenerating) {
                const title = img.title || 'image';
                await downloadImage(urlToDownload, `${title}`);
            }
        }
    }, [allImages]);

    const handleModeChange = useCallback((newMode: 'prompt' | 'brush' | 'objects') => {
        if ((newMode === 'brush' || newMode === 'objects') && !selectedImage) {
            // If switching to brush/objects with no selection, select the first image
            if (allImages.length > 0) selectAndSnap(allImages[0].id);
        }
        setSideSheetMode(newMode);
        if (newMode === 'brush' || newMode === 'objects') syncGlobalItems();
    }, [sideSheetMode, selectedImage, allImages, selectAndSnap, setSideSheetMode, syncGlobalItems]);

    const handleGenerate = useCallback(async (
        prompt?: string,
        draftPrompt?: string,
        activeTemplateId?: string,
        variableValues?: Record<string, string[]>
    ) => {
        if (activeTemplateId) {
            recordPresetUsage(activeTemplateId);
        }

        if (selectedImages.length > 1) {
            const result = await confirm({
                title: t('generate_multiple_title').replace('{{count}}', selectedImages.length.toString()),
                confirmLabel: t('generate'),
                variant: 'primary'
            });

            if (!result) return;

            selectedImages.forEach((img, index) => {
                const finalPrompt = typeof prompt === 'string' ? prompt : (img.userDraftPrompt || '');
                // Snap only to the first generated image in the batch
                performGeneration(img, finalPrompt, 1, index === 0, draftPrompt, activeTemplateId, variableValues);
            });
        } else if (selectedImage) {
            const finalPrompt = typeof prompt === 'string' ? prompt : (selectedImage.userDraftPrompt || '');
            performGeneration(selectedImage, finalPrompt, 1, true, draftPrompt, activeTemplateId, variableValues);
        }
    }, [selectedImage, selectedImages, performGeneration, recordPresetUsage, confirm, t]);

    const handleGenerateMore = useCallback((idOrImg: string | CanvasImage) => {
        let img: CanvasImage | undefined;
        if (typeof idOrImg === 'string') {
            img = allImages.find(i => i.id === idOrImg);
        } else {
            img = idOrImg;
        }

        if (img) {
            // If it's a versioned image, we want to regenerate from its parent using the same prompt
            if (img.parentId) {
                const parent = allImages.find(p => p.id === img!.parentId);
                if (parent) {
                    performGeneration(parent, img.generationPrompt || img.userDraftPrompt || '', 1, true);
                    return;
                } else {
                    // Parent not found - show error instead of falling back
                    const errorMsg = currentLang === 'de'
                        ? 'Das Originalbild wurde nicht gefunden. "Mehr generieren" ist nur für Bilder mit verfügbarem Original möglich.'
                        : 'Original image not found. "Generate more" is only available for images with an accessible original.';
                    showToast(errorMsg, 'error', 5000);
                    return;
                }
            } else {
                // Image has no parentId - strictly "More" is not allowed for originals
                const errorMsg = currentLang === 'de'
                    ? '"Mehr generieren" ist nur für Versionen verfügbar, um den ursprünglichen Prompt zu wiederholen.'
                    : '"Generate more" is only available for versions to repeat the original prompt.';
                showToast(errorMsg, 'error', 5000);
            }
        }
    }, [allImages, performGeneration, currentLang, showToast]);

    const handleCreateNew = useCallback((prompt: string, model: string, ratio: string, attachments: string[] = []) => {
        performNewGeneration(prompt, model, ratio, attachments);
    }, [performNewGeneration]);

    const handleNavigateParent = useCallback((parentId: string) => {
        const parent = allImages.find(i => i.id === parentId);
        if (parent) selectAndSnap(parentId);
    }, [allImages, selectAndSnap]);

    const state = React.useMemo(() => ({
        rows,
        selectedIds,
        activeId,
        primarySelectedId,
        selectedImage,
        selectedImages,
        allImages,
        qualityMode,
        themeMode,
        // NOTE: lang (raw setting) intentionally NOT in state — use currentLang everywhere.
        // Access raw lang via the top-level langSetting export (for Settings modal only).
        currentLang,
        sideSheetMode,
        isCanvasLoading,
        loadingProgress,
        brushSize,
        maskTool,
        activeShape,
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
        isAdminOpen,
        isAuthLoading,
        isBrushResizing,
        isMobile,
        templates,
        hasMore,
        isSelectMode
    }), [
        rows, selectedIds, activeId, primarySelectedId, selectedImage, selectedImages, allImages,
        qualityMode, themeMode, currentLang, sideSheetMode, isCanvasLoading, loadingProgress,
        brushSize, maskTool, activeShape, userLibrary, globalLibrary, fullLibrary, user, userProfile, credits,
        authModalMode, isAuthModalOpen, authEmail, authError, isDragOver, isSettingsOpen, isAdminOpen,
        isAuthLoading, isBrushResizing, isMobile, templates, hasMore, isSelectMode
    ]);

    const actions = React.useMemo(() => ({
        setRows,
        setQualityMode,
        setThemeMode,
        setLang,
        handleModeChange,
        setSideSheetMode,
        setBrushSize,
        setMaskTool,
        setActiveShape,
        addUserCategory,
        deleteUserCategory,
        addUserItem,
        deleteUserItem,
        selectAndSnap,
        selectMultiple,
        deselectAll,
        handleSelection,
        moveSelection,
        moveRowSelection,
        setAuthModalMode,
        setIsAuthModalOpen,
        setAuthEmail,
        setAuthError,
        handleAddFunds,
        handleSignOut,
        handleDeleteAccount: deleteAccount,
        updateProfile,
        setIsDragOver,
        handleFileDrop,
        setIsSettingsOpen,
        setIsAdminOpen,
        setIsSelectMode,
        processFile,
        handleDeleteImage,
        handleDownload,
        handleUpdateAnnotations,
        handleUpdatePrompt,
        handleUpdateVariables,
        performGeneration,
        handleGenerate,
        handleGenerateMore,
        handleNavigateParent,
        setIsBrushResizing,
        handleCreateNew,
        recordPresetUsage,
        refreshTemplates,
        savePreset: saveTemplate,
        setIsCanvasLoading,
        deletePreset: deleteTemplate,
        ensureValidSession,
        handleLoadMore,
        ensureImageLoaded
    }), [
        setRows, setQualityMode, setThemeMode, setLang, handleModeChange, setSideSheetMode,
        setBrushSize, setMaskTool, setActiveShape,
        addUserCategory, deleteUserCategory, addUserItem, deleteUserItem, selectAndSnap, selectMultiple,
        handleSelection, moveSelection, moveRowSelection, setAuthModalMode, setIsAuthModalOpen, setAuthEmail,
        setAuthError, handleAddFunds, handleSignOut, deleteAccount, updateProfile, setIsDragOver, handleFileDrop,
        setIsSettingsOpen, setIsAdminOpen, setIsSelectMode, processFile, handleDeleteImage, handleDownload,
        handleUpdateAnnotations, handleUpdatePrompt, handleUpdateVariables, performGeneration, handleGenerate,
        handleGenerateMore, handleNavigateParent, setIsBrushResizing, handleCreateNew,
        refreshTemplates, saveTemplate, deleteTemplate, setIsCanvasLoading,
        ensureValidSession, handleLoadMore, ensureImageLoaded
    ]);

    return React.useMemo(() => ({
        state,
        actions,
        langSetting: lang, // Raw 'auto'|'de'|'en' — only use for Settings modal dropdown
        t
    }), [state, actions, lang, t]);
};
