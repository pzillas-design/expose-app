import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { imageService } from '../services/imageService';
import { CanvasImage, ImageRow, AnnotationObject } from '../types';
import { generateId } from '../utils/ids';
import { useCanvasNavigation } from './useCanvasNavigation';
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
import { useAnnotationHandler } from './useAnnotationHandler';
import { useBoards } from './useBoards';
import { usePresets } from './usePresets';

export const useNanoController = () => {
    const { showToast } = useToast();
    const { confirm } = useItemDialog();

    // --- Data State ---
    const [rows, setRows] = useState<ImageRow[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
    const [resolvingBoardId, setResolvingBoardId] = useState<string | null>(null);
    const [isCanvasLoading, setIsCanvasLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // @ts-ignore
    const isAuthDisabled = import.meta.env.VITE_DISABLE_AUTH === 'true';

    // Refs
    const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        handleAddFunds, handleSignOut, updateProfile
    } = useAuth({
        isAuthDisabled,
        getResolvedLang,
        t
    });

    const {
        userLibrary, globalLibrary, fullLibrary,
        addUserCategory, deleteUserCategory,
        addUserItem, deleteUserItem
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
        previousNav, setPreviousNav
    } = useUIState();

    // --- Navigation ---
    const canvasNav = useCanvasNavigation({
        scrollContainerRef,
        selectedIds,
        allImages,
        primarySelectedId: selectedIds[selectedIds.length - 1] || null
    });

    const {
        zoom, setZoom, smoothZoomTo, fitSelectionToView, snapToItem,
        isZooming, isAutoScrolling,
        isZoomingRef, isAutoScrollingRef, getMostVisibleItem, zoomToItem
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


    const {
        boards, isLoading: isBoardsLoading, fetchBoards, createBoard, initializeNewBoard, deleteBoard, updateBoard, resolveBoardIdentifier
    } = useBoards(user?.id);

    const { templates, refreshTemplates } = usePresets();

    // --- Board Image Loading ---
    React.useEffect(() => {
        if (user && currentBoardId) {
            setIsCanvasLoading(true);
            setLoadingProgress(10);

            const progressInterval = setInterval(() => {
                setLoadingProgress(prev => {
                    if (prev >= 90) return 90;
                    return prev + (90 - prev) * 0.1;
                });
            }, 200);

            imageService.loadUserImages(user.id, currentBoardId).then(loadedRows => {
                clearInterval(progressInterval);
                setLoadingProgress(100);
                setTimeout(() => setLoadingProgress(0), 500);

                setRows(loadedRows);
                setIsCanvasLoading(false);

                // Auto-select newest image if nothing is selected
                const allLoaded = loadedRows.flatMap(r => r.items);
                if (allLoaded.length > 0 && selectedIds.length === 0) {
                    // Sort to find newest
                    const newest = [...allLoaded].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
                    if (newest) {
                        // Small delay to ensure canvas items are rendered before snapping
                        setTimeout(() => {
                            selectAndSnap(newest.id, true);
                        }, 500);
                    }
                }
            });
        } else {
            setRows([]);
            setIsCanvasLoading(false);
        }
    }, [user, currentBoardId, selectAndSnap]);

    // --- File & Generation Hooks ---
    const { processFiles, processFile } = useFileHandler({
        user, isAuthDisabled, setRows, selectMultiple, snapToItem, showToast, currentBoardId, setIsSettingsOpen, t
    });

    const { performGeneration, performNewGeneration } = useGeneration({
        rows, setRows, user, userProfile, credits, setCredits,
        qualityMode, isAuthDisabled, selectAndSnap, setIsSettingsOpen, showToast, currentBoardId, t
    });

    const { handleUpdateAnnotations, handleUpdatePrompt, handleUpdateVariables } = usePersistence({
        user, isAuthDisabled, setRows
    });

    const { onAddReference } = useAnnotationHandler({
        selectedImage, handleUpdateAnnotations, showToast, t, user
    });

    // --- Actions --- (Integrated via Hooks above)

    const handleFileDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;
        processFiles(files);
    }, [processFiles, setIsDragOver]);

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
                showToast(`${t('delete_failed')}: ${err.message}`, "error");
            });
        }
    }, [user, isAuthDisabled, showToast]);

    const handleModeChange = useCallback((newMode: 'prompt' | 'brush' | 'objects') => {
        const oldMode = sideSheetMode;

        let targetImg = selectedImage;
        if (!targetImg && (newMode === 'brush' || newMode === 'objects')) {
            const mostVisibleId = getMostVisibleItem();
            if (mostVisibleId) {
                targetImg = allImages.find(i => i.id === mostVisibleId) || null;
                if (targetImg) {
                    selectAndSnap(targetImg.id, true);
                }
            }
        }

        setSideSheetMode(newMode);

        if ((newMode === 'brush' || newMode === 'objects') && oldMode === 'prompt') {
            // Entering annotation mode: Store current state
            const container = scrollContainerRef.current;
            if (container) {
                setPreviousNav({
                    zoom: zoom,
                    scroll: { x: container.scrollLeft, y: container.scrollTop }
                });
            }

            if (targetImg) {
                // Smooth zoom into the image (sidebar width 360)
                zoomToItem(targetImg.id, 0.9, 360);
            }
        } else if (newMode === 'prompt' && (oldMode === 'brush' || oldMode === 'objects')) {
            // Leaving annotation mode: Restore previous state
            if (previousNav) {
                smoothZoomTo(previousNav.zoom, previousNav.scroll, 300);
                setPreviousNav(null);
            } else {
                smoothZoomTo(1.0, undefined, 300);
            }
        }
    }, [sideSheetMode, selectedImage, zoom, scrollContainerRef, smoothZoomTo, zoomToItem, setSideSheetMode, previousNav, setPreviousNav, getMostVisibleItem, selectAndSnap, allImages]);

    const handleGenerate = useCallback((
        prompt?: string,
        draftPrompt?: string,
        activeTemplateId?: string,
        variableValues?: Record<string, string[]>
    ) => {
        if (selectedImages.length > 1) {
            selectedImages.forEach((img, index) => {
                const finalPrompt = typeof prompt === 'string' ? prompt : (img.userDraftPrompt || '');
                // Snap only to the first generated image in the batch
                performGeneration(img, finalPrompt, 1, index === 0, draftPrompt, activeTemplateId, variableValues);
            });
        } else if (selectedImage) {
            const finalPrompt = typeof prompt === 'string' ? prompt : (selectedImage.userDraftPrompt || '');
            performGeneration(selectedImage, finalPrompt, 1, true, draftPrompt, activeTemplateId, variableValues);
        }
    }, [selectedImage, selectedImages, performGeneration]);

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
                    performGeneration(parent, img.generationPrompt || img.userDraftPrompt || '');
                    return;
                }
            }
            // Fallback: regenerate from current
            performGeneration(img, img.generationPrompt || img.userDraftPrompt || '');
        }
    }, [allImages, performGeneration]);

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
        isCanvasLoading,
        resolvingBoardId,
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
        currentBoardId,
        boards,
        isBoardsLoading,
        isBrushResizing,
        templates
    }), [
        rows, selectedIds, primarySelectedId, selectedImage, selectedImages, allImages, zoom, isZooming, isAutoScrolling,
        qualityMode, themeMode, lang, currentLang, sideSheetMode, isCanvasLoading, resolvingBoardId, loadingProgress,
        brushSize, maskTool, activeShape, userLibrary, globalLibrary, fullLibrary, user, userProfile, credits,
        authModalMode, isAuthModalOpen, authEmail, authError, isDragOver, isSettingsOpen, isAdminOpen, currentBoardId,
        boards, isBoardsLoading, isBrushResizing, templates
    ]);

    const actions = React.useMemo(() => ({
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
        setMaskTool,
        setActiveShape,
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
        updateProfile,
        setIsDragOver,
        handleFileDrop,
        setIsSettingsOpen,
        setIsAdminOpen,
        processFile,
        handleDeleteImage,
        handleUpdateAnnotations,
        handleUpdatePrompt,
        handleUpdateVariables,
        onAddReference,
        performGeneration,
        handleGenerate,
        handleGenerateMore,
        handleNavigateParent,
        setSnapEnabled,
        setCurrentBoardId,
        createBoard,
        initializeNewBoard,
        deleteBoard,
        updateBoard,
        fetchBoards,
        resolveBoardIdentifier,
        setResolvingBoardId,
        setIsBrushResizing,
        handleCreateNew,
        refreshTemplates
    }), [
        setRows, setZoom, smoothZoomTo, fitSelectionToView, snapToItem, handleScroll, getMostVisibleItem, setQualityMode,
        setThemeMode, setLang, handleModeChange, setSideSheetMode, setBrushSize, setMaskTool, setActiveShape,
        addUserCategory, deleteUserCategory, addUserItem, deleteUserItem, selectAndSnap, selectMultiple,
        handleSelection, moveSelection, moveRowSelection, setAuthModalMode, setIsAuthModalOpen, setAuthEmail,
        setAuthError, handleAddFunds, handleSignOut, updateProfile, setIsDragOver, handleFileDrop, setIsSettingsOpen,
        setIsAdminOpen, processFile, handleDeleteImage, handleUpdateAnnotations, handleUpdatePrompt,
        handleUpdateVariables, onAddReference, performGeneration, handleGenerate, handleGenerateMore,
        handleNavigateParent, setSnapEnabled, setCurrentBoardId, createBoard, initializeNewBoard, deleteBoard,
        updateBoard, fetchBoards, resolveBoardIdentifier, setResolvingBoardId, setIsBrushResizing, handleCreateNew,
        refreshTemplates
    ]);

    return React.useMemo(() => ({
        state,
        actions,
        refs: {
            scrollContainerRef
        },
        t
    }), [state, actions, scrollContainerRef, t]);
};
