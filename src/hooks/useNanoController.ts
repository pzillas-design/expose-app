import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { imageService } from '../services/imageService';
import { CanvasImage, ImageRow, AnnotationObject } from '../types';
import { generateId } from '../utils/ids';
import { downloadImage, downloadImagesAsZip } from '../utils/imageUtils';
import { storageService } from '../services/storageService';
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
    const [totalImageCount, setTotalImageCount] = useState(0);
    // Keep a ref so loadFeed can read current selection without it being a dependency
    const selectedIdsRef = useRef<string[]>([]);
    React.useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
    const [activeId, setActiveId] = useState<string | null>(null); // viewed/focused image
    const [unseenIds, setUnseenIds] = useState<Set<string>>(() => {
        try { return new Set(JSON.parse(localStorage.getItem('expose_unseen_ids') || '[]')); }
        catch { return new Set(); }
    });
    // Mark as seen when user opens image in detail
    React.useEffect(() => {
        if (!activeId) return;
        setUnseenIds(prev => {
            if (!prev.has(activeId)) return prev;
            const next = new Set(prev);
            next.delete(activeId);
            localStorage.setItem('expose_unseen_ids', JSON.stringify([...next]));
            return next;
        });
    }, [activeId]);
    const [isCanvasLoading, setIsCanvasLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const offsetRef = useRef(0);
    const PAGE_SIZE = 50;

    // --- Storage Limits ---
    const IMAGE_LIMIT = 150;
    const IMAGE_WARNING_THRESHOLD = 130;
    const [storageAutoDelete, setStorageAutoDelete] = useState(() =>
        localStorage.getItem('expose_storage_auto_delete') === 'true'
    );
    const storageWarnedRef = useRef(false);
    const storageAutoDeleteSyncedRef = useRef(false);

    // @ts-ignore
    const isAuthDisabled = import.meta.env.VITE_DISABLE_AUTH === 'true' ||
        (typeof window !== 'undefined' && window.location.hostname === 'beta.expose.ae');


    // Derived — deduplicate by ID in case the same image ends up in two rows due to timing
    const allImages = React.useMemo(() => {
        const seen = new Set<string>();
        return rows.flatMap(r => r.items).filter(i => {
            if (seen.has(i.id)) return false;
            seen.add(i.id);
            return true;
        });
    }, [rows]);

    // Called directly by useGeneration on completion — more reliable than transition detection
    const handleGenerationComplete = useCallback((id: string) => {
        setUnseenIds(prev => {
            const next = new Set(prev);
            next.add(id);
            localStorage.setItem('expose_unseen_ids', JSON.stringify([...next]));
            return next;
        });
    }, []);

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

    // Sync storageAutoDelete from DB profile on first load (persists across devices)
    React.useEffect(() => {
        if (!userProfile || storageAutoDeleteSyncedRef.current) return;
        storageAutoDeleteSyncedRef.current = true;
        const dbValue = userProfile.storage_auto_delete === true;
        setStorageAutoDelete(dbValue);
        localStorage.setItem('expose_storage_auto_delete', dbValue ? 'true' : 'false');
    }, [userProfile]);

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

        // Beta/local mode: restore from localStorage instead of Supabase.
        // This matches useAutoSave() behavior when auth is disabled.
        if (isAuthDisabled) {
            try {
                const stored = localStorage.getItem('beta_canvas_state');
                const parsedRows: ImageRow[] = stored ? JSON.parse(stored) : [];
                setRows(parsedRows);
                setHasMore(false);

                if (isInitial && selectedIdsRef.current.length === 0) {
                    const allLoaded = parsedRows.flatMap(r => r.items);
                    if (allLoaded.length > 0) {
                        const newest = [...allLoaded].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
                        if (newest) requestAnimationFrame(() => setActiveId(newest.id));
                    }
                }
            } catch (err) {
                console.error('[useNanoController] Failed to restore beta canvas state:', err);
                setRows([]);
                setHasMore(false);
            } finally {
                if (isInitial) {
                    setLoadingProgress(100);
                    setTimeout(() => setLoadingProgress(0), 300);
                    setIsCanvasLoading(false);
                }
            }
            return;
        }

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
            const { rows: loadedRows, rawCount } = await imageService.loadUserImages(user.id, PAGE_SIZE, currentOffset);
            console.log(`[DEBUG] loadUserImages result: ${loadedRows.length} rows (${rawCount} images) for offset ${currentOffset}`);

            if (progressInterval) clearInterval(progressInterval);
            if (isInitial) {
                setLoadingProgress(100);
                setTimeout(() => setLoadingProgress(0), 500);
            }

            if (rawCount < PAGE_SIZE) {
                setHasMore(false);
            }

            setRows(prev => {
                if (isInitial) return loadedRows;
                // Merge load-more rows into existing rows, deduplicating by image ID.
                // Pagination offset can shift (new images inserted between pages) causing
                // the same group to appear in both pages — this prevents double tiles.
                const rowMap = new Map<string, import('@/types').ImageRow>(prev.map(r => [r.id, r]));
                loadedRows.forEach(newRow => {
                    const existing = rowMap.get(newRow.id);
                    if (existing) {
                        // Merge: add only images not already in the existing row
                        const existingIds = new Set(existing.items.map(i => i.id));
                        const addItems = newRow.items.filter(i => !existingIds.has(i.id));
                        if (addItems.length > 0) {
                            const merged = {
                                ...existing,
                                items: [...existing.items, ...addItems].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
                            };
                            rowMap.set(newRow.id, merged);
                        }
                    } else {
                        rowMap.set(newRow.id, newRow);
                    }
                });
                return Array.from(rowMap.values());
            });
            offsetRef.current += PAGE_SIZE;

            if (isInitial && selectedIdsRef.current.length === 0) {
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
    }, [user, isAuthDisabled, setActiveId, setRows]);

    React.useEffect(() => {
        if (user) {
            loadFeed(true);
            // Fetch total image count from DB (accurate even with pagination)
            imageService.countUserImages(user.id).then(setTotalImageCount);
        } else {
            setRows([]);
            setIsCanvasLoading(false);
            setHasMore(false);
            setTotalImageCount(0);
            offsetRef.current = 0;
        }
    }, [user, loadFeed]);

    const handleLoadMore = useCallback(() => {
        if (!isCanvasLoading && hasMore) {
            loadFeed(false);
        }
    }, [isCanvasLoading, hasMore, loadFeed]);

    const ensureImageLoaded = useCallback(async (id: string) => {
        if (!user) return;
        // Use latest rows state (not stale closure) to decide if we need to fetch
        let alreadyLoaded = false;
        setRows(prev => {
            alreadyLoaded = prev.some(r => r.items.some(i => i.id === id));
            return prev;
        });
        if (alreadyLoaded) return;

        console.log(`[useNanoController] ensuring image ${id} is loaded...`);
        try {
            const extraRows = await imageService.loadImageById(id);
            if (extraRows.length > 0) {
                setRows(prev => {
                    // Deduplicate by both row ID and image ID to prevent double rows
                    const existingRowIds = new Set(prev.map(r => r.id));
                    const existingImageIds = new Set(prev.flatMap(r => r.items).map(i => i.id));
                    if (existingImageIds.has(id)) return prev; // Image arrived in the meantime
                    const newRows = extraRows.filter(r => !existingRowIds.has(r.id));
                    return [...prev, ...newRows];
                });
            }
        } catch (err) {
            console.error("Failed to ensure image loaded:", err);
        }
    }, [user, setRows]);

    const refreshImageCount = useCallback(async () => {
        if (user) {
            const count = await imageService.countUserImages(user.id);
            setTotalImageCount(count);
        }
    }, [user]);

    // --- File & Generation Hooks ---
    const { processFiles, processFile } = useFileHandler({
        user, isAuthDisabled, setRows, selectMultiple, showToast, setIsSettingsOpen, t
    });

    // Always-current ref to activeId — passed to useGeneration so completion callbacks
    // can check whether the user is still in detail view on the source image.
    const activeIdRef = React.useRef<string | null>(activeId);
    React.useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

    const { performGeneration, performNewGeneration } = useGeneration({
        rows, setRows, user, userProfile, credits, setCredits,
        qualityMode, isAuthDisabled, selectAndSnap, activeIdRef, setIsSettingsOpen, setIsAuthModalOpen, showToast, t, confirm,
        onImageSaved: () => setTotalImageCount(prev => prev + 1),
        onGenerationComplete: handleGenerationComplete,
    });

    const { handleUpdateAnnotations, handleUpdatePrompt, handleUpdateVariables, handleUpdateImageTitle } = usePersistence({
        user, isAuthDisabled, setRows
    });

    // Auto-Save: Background persistence every 30s
    useAutoSave(rows, user, isAuthDisabled);

    // Reactive storage enforcement: if images somehow exceed the limit (e.g. parallel
    // generations that all passed the preemptive check before any of them added rows),
    // trim back down automatically whenever auto-delete is enabled.
    React.useEffect(() => {
        if (!storageAutoDelete) return;
        const nonGenerating = allImages.filter(i => !i.isGenerating);
        if (nonGenerating.length > IMAGE_LIMIT) {
            deleteOldestToMakeRoom();
        }
    }, [allImages.length, storageAutoDelete]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Actions --- (Integrated via Hooks above)

    const handleDeleteImage = useCallback(async (id: string, skipConfirm = false, onBeforeDelete?: () => void): Promise<boolean> => {
        if (!user) {
            showToast(currentLang === 'de' ? 'Bitte logge dich ein' : 'Please log in', 'error');
            return false;
        }

        if (!skipConfirm) {
            const confirmed = await confirm({
                title: currentLang === 'de' ? 'Bild löschen' : 'Delete image',
                description: currentLang === 'de' ? 'Möchtest du dieses Bild wirklich löschen?' : 'Do you really want to delete this image?',
                confirmLabel: currentLang === 'de' ? 'LÖSCHEN' : 'DELETE',
                cancelLabel: currentLang === 'de' ? 'ABBRECHEN' : 'CANCEL',
                variant: 'danger'
            });
            if (!confirmed) return false;
        }

        // Navigate away BEFORE removing the image from rows.
        // This prevents DetailPage's `!img → onBack()` from firing and sending
        // the user to grid instead of the next image.
        onBeforeDelete?.();

        setRows(prev => {
            return prev.map(row => {
                if (row.items.some(i => i.id === id)) {
                    return { ...row, items: row.items.filter(i => i.id !== id) };
                }
                return row;
            }).filter(row => row.items.length > 0);
        });

        if (activeId === id) {
            // Use rows directly (it's in deps) to build a flat list and find the adjacent image
            const flat = rows.flatMap(r => r.items);
            const currentIdx = flat.findIndex(i => i.id === id);
            const nextImg = flat[currentIdx + 1] || flat[currentIdx - 1];
            if (nextImg) {
                selectAndSnap(nextImg.id, true);
            } else {
                setActiveId(null);
            }
        }

        const imageToDelete = rows.flatMap(r => r.items).find(i => i.id === id);
        if (imageToDelete) {
            // Only decrement for saved images (generating ones aren't in DB yet)
            if (!imageToDelete.isGenerating) {
                setTotalImageCount(prev => Math.max(0, prev - 1));
            }
            imageService.deleteImage(imageToDelete, user.id).catch(err => {
                console.error("Delete failed:", err);
                showToast(currentLang === 'de' ? 'Löschen fehlgeschlagen' : 'Delete failed', 'error');
            });
        }
        return true;
    }, [user, rows, activeId, setRows, setActiveId, selectAndSnap, showToast, currentLang, confirm]);

    const handleStorageAutoDeleteChange = useCallback((val: boolean) => {
        setStorageAutoDelete(val);
        localStorage.setItem('expose_storage_auto_delete', val ? 'true' : 'false');
        if (user && !isAuthDisabled) {
            supabase.from('profiles').update({ storage_auto_delete: val }).eq('id', user.id);
        }
    }, [user, isAuthDisabled]);

    const deleteOldestToMakeRoom = useCallback(() => {
        const imageMap = new Map(allImages.map(img => [img.id, img]));

        const getRootId = (id: string): string => {
            let current = imageMap.get(id);
            let depth = 0;
            while (current?.parentId && imageMap.has(current.parentId) && depth < 50) {
                current = imageMap.get(current.parentId)!;
                depth++;
            }
            return current?.parentId || current?.id || id;
        };

        // Find oldest non-generating image
        const candidates = [...allImages]
            .filter(img => !img.isGenerating)
            .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        if (!candidates[0]) return;

        // Collect entire stack belonging to the oldest image
        const oldestRootId = getRootId(candidates[0].id);
        const stackToDelete = allImages.filter(img => !img.isGenerating && getRootId(img.id) === oldestRootId);
        const idsToDelete = new Set(stackToDelete.map(img => img.id));

        // Remove from UI
        setRows(prev =>
            prev.map(row => ({ ...row, items: row.items.filter(i => !idsToDelete.has(i.id)) }))
                .filter(row => row.items.length > 0)
        );

        // Navigate away if the active image is being deleted
        if (activeId && idsToDelete.has(activeId)) setActiveId(null);

        // Update total count and delete from DB
        setTotalImageCount(prev => Math.max(0, prev - stackToDelete.length));
        if (user) {
            imageService.deleteImages(stackToDelete.map(i => i.id), user.id).catch(err => {
                console.error('Auto-delete stack failed:', err);
            });
        }
    }, [allImages, activeId, setRows, setActiveId, setTotalImageCount, user]);

    const checkStorageLimit = useCallback(async (): Promise<boolean> => {
        const count = allImages.length;

        if (count >= IMAGE_LIMIT) {
            if (storageAutoDelete) {
                deleteOldestToMakeRoom();
                return true;
            }
            const pct = Math.min((count / IMAGE_LIMIT) * 100, 100);
            const confirmed = await confirm({
                title: currentLang === 'de' ? 'Speicherlimit erreicht' : 'Storage limit reached',
                description: currentLang === 'de'
                    ? `Du hast ${count} von ${IMAGE_LIMIT} Bildern. Mit Auto-Löschen wird automatisch der älteste Stapel (alle Versionen) gelöscht – bei Generierung und Upload.`
                    : `You have ${count} of ${IMAGE_LIMIT} images. With auto-delete, the oldest stack (all versions) is removed automatically on every generation or upload.`,
                content: React.createElement('div', { className: 'flex flex-col gap-1.5' },
                    React.createElement('div', { className: 'flex items-center justify-between' },
                        React.createElement('span', { className: 'text-xs text-zinc-500 dark:text-zinc-400' },
                            `${count} / ${IMAGE_LIMIT}`),
                        React.createElement('span', { className: 'text-xs text-zinc-500 dark:text-zinc-400' },
                            `${Math.round(pct)}%`),
                    ),
                    React.createElement('div', { className: 'h-1 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden' },
                        React.createElement('div', {
                            className: `h-full rounded-full transition-all duration-500 ${
                                count >= IMAGE_LIMIT            ? 'bg-red-500'    :
                                count >= IMAGE_LIMIT * 0.8      ? 'bg-orange-400' :
                                'bg-zinc-400 dark:bg-zinc-500'
                            }`,
                            style: { width: `${pct}%` },
                        }),
                    ),
                ),
                confirmLabel: currentLang === 'de' ? 'AUTO-LÖSCHEN & WEITER' : 'AUTO-DELETE & CONTINUE',
                cancelLabel: currentLang === 'de' ? 'ABBRECHEN' : 'CANCEL',
                variant: 'primary',
            });
            if (confirmed) {
                handleStorageAutoDeleteChange(true);
                deleteOldestToMakeRoom();
                return true;
            }
            return false;
        }

        if (count >= IMAGE_WARNING_THRESHOLD && !storageWarnedRef.current) {
            storageWarnedRef.current = true;
            showToast(
                currentLang === 'de'
                    ? `${count} von ${IMAGE_LIMIT} Bildern – Limit fast erreicht.`
                    : `${count} of ${IMAGE_LIMIT} images – limit almost reached.`,
                'warning',
                5000
            );
        }

        return true;
    }, [allImages, storageAutoDelete, deleteOldestToMakeRoom, handleStorageAutoDeleteChange, confirm, showToast, currentLang]);

    const handleFileDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;
        const canProceed = await checkStorageLimit();
        if (!canProceed) return;
        processFiles(files);
    }, [processFiles, setIsDragOver, checkStorageLimit]);

    const handleDownload = useCallback(async (idOrIds: string | string[]) => {
        const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
        const imagesToDownload = allImages.filter(img => ids.includes(img.id) && !img.isGenerating);

        // Resolve URLs (sign storage paths where needed)
        const resolved = await Promise.all(imagesToDownload.map(async img => {
            let url = img.src || img.originalSrc || '';
            if ((!url || url.startsWith('blob:')) && img.storage_path) {
                url = await storageService.getSignedUrl(img.storage_path) || url;
            }
            return { src: url, filename: img.title || 'image' };
        }));

        const valid = resolved.filter(r => !!r.src);
        if (valid.length === 0) return;

        if (valid.length === 1) {
            // Single file — direct download, no ZIP needed
            await downloadImage(valid[0].src, valid[0].filename);
        } else {
            // Multiple files — bundle into one ZIP to avoid browser confirmation dialogs
            const ensureExt = (filename: string, src: string) => {
                if (/\.(jpg|jpeg|png|webp)$/i.test(filename)) return filename;
                const ext = src.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
                return `${filename}.${ext}`;
            };
            await downloadImagesAsZip(
                valid.map(r => ({ src: r.src, filename: ensureExt(r.filename, r.src) })),
                'expose-images.zip'
            );
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
        const canProceed = await checkStorageLimit();
        if (!canProceed) return;

        if (activeTemplateId) {
            recordPresetUsage(activeTemplateId);
        }

        if (isSelectMode && selectedImages.length > 1) {
            const result = await confirm({
                title: t('generate_multiple_title').replace('{{count}}', selectedImages.length.toString()),
                confirmLabel: t('generate'),
                variant: 'primary'
            });

            if (!result) return;

            // Stagger batch requests by 200ms each to avoid connection flooding
            // (simultaneous requests can cause one to be silently dropped by the Supabase client)
            let snapIndex = 0;
            selectedImages.forEach((img, batchIdx) => {
                // Block images whose signed URL isn't ready yet (still blob: or empty)
                if (!img.src || img.src.startsWith('blob:')) {
                    showToast(
                        currentLang === 'de'
                            ? 'Ein Bild wird noch hochgeladen – bitte kurz warten'
                            : 'An image is still uploading – please wait a moment',
                        'error'
                    );
                    return;
                }
                const finalPrompt = typeof prompt === 'string' ? prompt : (img.userDraftPrompt || '');
                const isFirst = snapIndex === 0;
                snapIndex++;
                setTimeout(() => {
                    performGeneration(img, finalPrompt, 1, isFirst, draftPrompt, activeTemplateId, variableValues);
                }, batchIdx * 200);
            });
            // Exit multiselect after confirming batch generation
            setSelectedIds([]);
            setIsSelectMode(false);
        } else if (selectedImage) {
            if (!selectedImage.src || selectedImage.src.startsWith('blob:')) {
                showToast(
                    currentLang === 'de'
                        ? 'Bild wird noch hochgeladen – bitte kurz warten'
                        : 'Image is still uploading – please wait a moment',
                    'error'
                );
                return;
            }
            const finalPrompt = typeof prompt === 'string' ? prompt : (selectedImage.userDraftPrompt || '');
            performGeneration(selectedImage, finalPrompt, 1, true, draftPrompt, activeTemplateId, variableValues);
        }
    }, [selectedImage, selectedImages, performGeneration, recordPresetUsage, confirm, t, checkStorageLimit, showToast, currentLang]);

    const handleGenerateMore = useCallback(async (idOrImg: string | CanvasImage) => {
        const canProceed = await checkStorageLimit();
        if (!canProceed) return;

        let img: CanvasImage | undefined;
        if (typeof idOrImg === 'string') {
            img = allImages.find(i => i.id === idOrImg);
        } else {
            img = idOrImg;
        }
        if (!img) return;

        // Walk the full ancestry chain to find the root original for grouping.
        // We use img as the actual source for the API (preserves annotations/edits),
        // but store groupParentId = root.id so the result lands in the original source's stack.
        let root: CanvasImage = img;
        let depth = 0;
        while (root.parentId && depth < 50) {
            const parent = allImages.find(p => p.id === root.parentId);
            if (!parent) break;
            root = parent;
            depth++;
        }

        // Full request body is stored on the image (generationPrompt + variableValues + activeTemplateId).
        // "Mehr" simply replays it. userDraftPrompt is '' for children (clean SideSheet), so fall back to generationPrompt.
        const prompt = img.generationPrompt || img.userDraftPrompt || '';
        if (!prompt) return;

        // Always use the ROOT image as the API source so the original uploaded image
        // is sent to the AI — not a generated result. Annotations (reference images)
        // come from the stored request on img.
        const groupParentId = root.id !== img.id ? root.id : undefined;
        const sourceForApi = root.id !== img.id
            ? { ...root, annotations: img.annotations || [] }
            : img;
        performGeneration(sourceForApi, prompt, 1, true, img.userDraftPrompt, img.activeTemplateId, img.variableValues, undefined, groupParentId);
    }, [allImages, performGeneration, checkStorageLimit]);

    const handleCreateNew = useCallback(async (prompt: string, model: string, ratio: string, attachments: string[] = []) => {
        const canProceed = await checkStorageLimit();
        if (!canProceed) return;
        performNewGeneration(prompt, model, ratio, attachments);
    }, [performNewGeneration, checkStorageLimit]);

    const handleProcessFile = useCallback(async (file: File): Promise<string | undefined> => {
        const canProceed = await checkStorageLimit();
        if (!canProceed) return undefined;
        return processFile(file);
    }, [processFile, checkStorageLimit]);

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
        isSelectMode,
        storageAutoDelete,
        unseenIds,
        imageLimit: IMAGE_LIMIT,
        imageWarningThreshold: IMAGE_WARNING_THRESHOLD,
        // Accurate count: when all pages are loaded use local length, otherwise use DB count
        imageCount: !hasMore
            ? allImages.filter(i => !i.isGenerating).length
            : totalImageCount,
    }), [
        rows, selectedIds, activeId, primarySelectedId, selectedImage, selectedImages, allImages,
        qualityMode, themeMode, currentLang, sideSheetMode, isCanvasLoading, loadingProgress,
        brushSize, maskTool, activeShape, userLibrary, globalLibrary, fullLibrary, user, userProfile, credits,
        authModalMode, isAuthModalOpen, authEmail, authError, isDragOver, isSettingsOpen, isAdminOpen,
        isAuthLoading, isBrushResizing, isMobile, templates, hasMore, isSelectMode, storageAutoDelete,
        totalImageCount, unseenIds
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
        processFile: handleProcessFile,
        handleDeleteImage,
        handleStorageAutoDeleteChange,
        handleDownload,
        handleUpdateAnnotations,
        handleUpdatePrompt,
        handleUpdateVariables,
        handleUpdateImageTitle,
        performGeneration,
        handleGenerate,
        handleGenerateMore,
        markGroupSeen: (ids: string[]) => setUnseenIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => next.delete(id));
            localStorage.setItem('expose_unseen_ids', JSON.stringify([...next]));
            return next;
        }),
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
        ensureImageLoaded,
        refreshImageCount,
    }), [
        setRows, setQualityMode, setThemeMode, setLang, handleModeChange, setSideSheetMode,
        setBrushSize, setMaskTool, setActiveShape,
        addUserCategory, deleteUserCategory, addUserItem, deleteUserItem, selectAndSnap, selectMultiple,
        handleSelection, moveSelection, moveRowSelection, setAuthModalMode, setIsAuthModalOpen, setAuthEmail,
        setAuthError, handleAddFunds, handleSignOut, deleteAccount, updateProfile, setIsDragOver, handleFileDrop,
        setIsSettingsOpen, setIsAdminOpen, setIsSelectMode, handleProcessFile, handleDeleteImage, handleStorageAutoDeleteChange, handleDownload,
        handleUpdateAnnotations, handleUpdatePrompt, handleUpdateVariables, handleUpdateImageTitle, performGeneration, handleGenerate,
        handleGenerateMore, handleNavigateParent, setIsBrushResizing, handleCreateNew,
        refreshTemplates, saveTemplate, deleteTemplate, setIsCanvasLoading,
        ensureValidSession, handleLoadMore, ensureImageLoaded, refreshImageCount
    ]);

    return React.useMemo(() => ({
        state,
        actions,
        langSetting: lang, // Raw 'auto'|'de'|'en' — only use for Settings modal dropdown
        t
    }), [state, actions, lang, t]);
};
