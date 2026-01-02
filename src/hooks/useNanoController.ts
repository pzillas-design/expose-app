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

export const useNanoController = () => {
    const { showToast } = useToast();
    const { confirm } = useItemDialog();

    // --- Data State ---
    const [rows, setRows] = useState<ImageRow[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);

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
        userLibrary, globalLibrary, fullLibrary,
        addUserCategory, deleteUserCategory,
        addUserItem, deleteUserItem
    } = useLibrary({ lang, currentLang });

    const {
        sideSheetMode, setSideSheetMode,
        brushSize, setBrushSize,
        maskTool, setMaskTool,
        isDragOver, setIsDragOver,
        isSettingsOpen, setIsSettingsOpen,
        isAdminOpen, setIsAdminOpen
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
        isZoomingRef, isAutoScrollingRef, getMostVisibleItem
    } = canvasNav;
    const isZooming = isZoomingRef.current;
    const isAutoScrolling = isAutoScrollingRef.current;

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
        boards, isLoading: isBoardsLoading, fetchBoards, createBoard, initializeNewBoard, deleteBoard, updateBoard, resolveBoardIdentifier
    } = useBoards(user?.id);

    // --- Board Image Loading ---
    React.useEffect(() => {
        if (user && currentBoardId) {
            imageService.loadUserImages(user.id, currentBoardId).then(loadedRows => {
                setRows(loadedRows);
                if (loadedRows.length > 0) {
                    const lastRow = loadedRows[loadedRows.length - 1];
                    if (lastRow.items.length > 0) {
                        const lastItem = lastRow.items[lastRow.items.length - 1];
                        selectAndSnap(lastItem.id);
                    }
                }
            });
        } else {
            setRows([]);
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

    const { handleUpdateAnnotations, handleUpdatePrompt } = usePersistence({
        user, isAuthDisabled, setRows
    });

    const { onAddReference } = useAnnotationHandler({
        selectedImage, handleUpdateAnnotations, showToast, t
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
        setSideSheetMode(newMode);
        if (newMode === 'brush' || newMode === 'objects') {
            if (selectedImage) {
                const sidebarWidth = 360;
                const fitZoom = Math.min((window.innerWidth - sidebarWidth) / selectedImage.width, window.innerHeight / selectedImage.height) * 0.9;
                smoothZoomTo(fitZoom);
            } else {
                smoothZoomTo(1.0);
            }
        } else if (newMode === 'prompt') {
            smoothZoomTo(1.0);
        }
    }, [selectedImage, smoothZoomTo, setSideSheetMode]);

    const handleGenerate = useCallback(() => {
        if (selectedImage) performGeneration(selectedImage, selectedImage.userDraftPrompt || '');
    }, [selectedImage, performGeneration]);

    const handleGenerateMore = useCallback((idOrImg: string | CanvasImage) => {
        let img: CanvasImage | undefined;
        if (typeof idOrImg === 'string') {
            img = allImages.find(i => i.id === idOrImg);
        } else {
            img = idOrImg;
        }

        if (img) {
            performGeneration(img, img.generationPrompt || img.userDraftPrompt || '');
        }
    }, [allImages, performGeneration]);

    const handleCreateNew = useCallback((prompt: string, model: string, ratio: string) => {
        performNewGeneration(prompt, model, ratio);
    }, [performNewGeneration]);

    const handleNavigateParent = useCallback((parentId: string) => {
        const parent = allImages.find(i => i.id === parentId);
        if (parent) selectAndSnap(parentId);
    }, [allImages, selectAndSnap]);

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
            maskTool,
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
            isBoardsLoading
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
            setMaskTool,
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
            handleCreateNew
        },
        refs: {
            scrollContainerRef
        },
        t
    };
};
