import React, { useRef, useCallback, useEffect } from 'react';
import { useMobile } from './useMobile';
import { ImageRow } from '../types';

interface UseSelectionProps {
    rows: ImageRow[];
    snapToItem: (id: string, instant?: boolean) => void;
    fitSelectionToView: () => void;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    zoom: number;
    isAutoScrollingRef: React.MutableRefObject<boolean>;
    isZoomingRef: React.MutableRefObject<boolean>;

    // External State
    selectedIds: string[];
    setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
    activeId: string | null;
    setActiveId: React.Dispatch<React.SetStateAction<string | null>>;
    getMostVisibleItem: () => string | null;
}

export const useSelection = ({
    rows,
    snapToItem,
    fitSelectionToView,
    scrollContainerRef,
    zoom,
    isAutoScrollingRef,
    isZoomingRef,
    selectedIds,
    setSelectedIds,
    activeId,
    setActiveId,
    getMostVisibleItem
}: UseSelectionProps) => {
    const isMobile = useMobile();

    // Refs
    const isSnapEnabledRef = useRef(true);
    const lastSelectedIdRef = useRef<string | null>(null);
    const focusCheckRafRef = useRef<number | null>(null);

    // Derived
    const allImages = rows.flatMap(r => r.items);
    const primarySelectedId = activeId;
    const selectedImage = allImages.find(img => img.id === primarySelectedId) || null;
    const selectedImages = allImages.filter(img => selectedIds.includes(img.id));

    // --- Selection Logic ---

    const selectAndSnap = useCallback((id: string, instant = false) => {
        if (focusCheckRafRef.current) cancelAnimationFrame(focusCheckRafRef.current);
        isSnapEnabledRef.current = true;
        lastSelectedIdRef.current = id;
        setSelectedIds(isMobile ? [] : [id]); // Clear marks on mobile, or just use activeId
        setActiveId(id);
        snapToItem(id, instant);
    }, [snapToItem, setActiveId, setSelectedIds, isMobile]);

    const selectMultiple = useCallback((ids: string[]) => {
        if (isMobile && ids.length > 0) return;
        setSelectedIds(ids);
        if (ids.length > 0) {
            lastSelectedIdRef.current = ids[ids.length - 1];
        }
    }, [setSelectedIds, isMobile]);

    const deselectAll = useCallback(() => {
        setSelectedIds([]);
        setActiveId(null);
        lastSelectedIdRef.current = null;
    }, [setSelectedIds, setActiveId]);

    const handleSelection = useCallback((id: string, multi: boolean, range: boolean) => {
        if (isMobile) {
            // Mobile: Only single selection (active focus)
            isSnapEnabledRef.current = true;
            lastSelectedIdRef.current = id;
            setActiveId(id);
            snapToItem(id);
            setSelectedIds([]); // Ensure no multi-select residues
            return;
        }

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
                const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
                if (next.length > 1) {
                    isSnapEnabledRef.current = false;
                }
                return next;
            });
            lastSelectedIdRef.current = id;
            // Also set as active when marking via checkbox
            setActiveId(id);
        } else {
            // Single Click on Image - Only change active selection (temporary focus)
            // Do NOT clear marked images (selectedIds)
            isSnapEnabledRef.current = true;
            lastSelectedIdRef.current = id;
            setActiveId(id);
            snapToItem(id);
        }
    }, [allImages, setSelectedIds, setActiveId, snapToItem, isMobile]);

    // fitSelectionToView removed to allow free movement during multi-select as requested

    // --- Scroll Logic (Focus Tracking) ---
    const lastZoomFinishedRef = useRef<number>(0);

    const handleScroll = useCallback(() => {
        // Skip if not ready
        if (!scrollContainerRef.current || isAutoScrollingRef.current || isZoomingRef.current) return;

        // Skip if we just finished zooming to let the browser snap settle
        if (Date.now() - lastZoomFinishedRef.current < 500) return;

        const container = scrollContainerRef.current;
        if (focusCheckRafRef.current) cancelAnimationFrame(focusCheckRafRef.current);

        focusCheckRafRef.current = requestAnimationFrame(() => {
            if (isZoomingRef.current || isAutoScrollingRef.current) return;

            const containerRect = container.getBoundingClientRect();

            // 1. DESELECT IF ACTIVE ITEM LEAVES VIEWPORT
            // This should happen on BOTH desktop and mobile if we have a focus.
            // On Mobile, the "middle-focus" logic below might re-select another one,
            // but on Desktop it will just clear the side panel.
            if (primarySelectedId) {
                const activeEl = container.querySelector(`[data-image-id="${primarySelectedId}"]`) as HTMLElement;
                if (activeEl) {
                    const rect = activeEl.getBoundingClientRect();
                    // Check if there is NO overlap between the image and the container viewport
                    const isVisible = (
                        rect.right > containerRect.left &&
                        rect.left < containerRect.right &&
                        rect.bottom > containerRect.top &&
                        rect.top < containerRect.bottom
                    );

                    if (!isVisible) {
                        deselectAll();
                        return; // Stop here
                    }
                }
            }

            // 2. AUTO-SELECT CENTER ITEM (Mobile Only, when Snapping is enabled)
            if (isMobile && isSnapEnabledRef.current && selectedIds.length <= 1) {

                const viewportCenterX = containerRect.left + (containerRect.width / 2);
                const viewportCenterY = containerRect.top + (containerRect.height / 2);

                const rowElements = Array.from(container.querySelectorAll('[data-row-id]')) as HTMLElement[];
                let closestRow: HTMLElement | null = null;
                let minRowDist = Infinity;

                for (const rowEl of rowElements) {
                    const rect = rowEl.getBoundingClientRect();
                    const dist = Math.abs((rect.top + rect.height / 2) - viewportCenterY);
                    if (dist < minRowDist) {
                        minRowDist = dist;
                        closestRow = rowEl;
                    }
                }

                if (!closestRow) return;

                const imagesInRow = Array.from(closestRow.querySelectorAll('[data-image-id]')) as HTMLElement[];
                let closestImageId: string | null = null;
                let minImgDist = Infinity;

                for (const img of imagesInRow) {
                    const rect = img.getBoundingClientRect();
                    const dist = Math.abs((rect.left + rect.width / 2) - viewportCenterX);

                    if (dist < minImgDist) {
                        minImgDist = dist;
                        closestImageId = img.getAttribute('data-image-id');
                    }
                }

                if (closestImageId && primarySelectedId !== closestImageId) {
                    setActiveId(closestImageId);
                }
            }
        });
    }, [primarySelectedId, selectedIds.length, scrollContainerRef, isAutoScrollingRef, isZoomingRef, setActiveId, zoom, isMobile, deselectAll]);

    useEffect(() => {
        if (isZoomingRef.current) {
            lastZoomFinishedRef.current = Date.now();
        }
    }, [zoom, isZoomingRef]);

    // Keyboard Navigation
    const moveSelection = useCallback((direction: -1 | 1, fromId?: string) => {
        if (allImages.length === 0) return;
        const currentId = fromId || lastSelectedIdRef.current || primarySelectedId;

        let nextIndex = 0;
        if (currentId) {
            const currentIndex = allImages.findIndex(img => img.id === currentId);
            if (currentIndex !== -1) {
                nextIndex = currentIndex + direction;
            }
        }

        if (nextIndex < 0) nextIndex = 0;
        if (nextIndex >= allImages.length) nextIndex = allImages.length - 1;

        const nextId = allImages[nextIndex].id;
        lastSelectedIdRef.current = nextId;
        setActiveId(nextId);
        snapToItem(nextId);
    }, [allImages, setActiveId, snapToItem, primarySelectedId]);

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
            const nextId = targetRow.items[targetColIndex].id;
            lastSelectedIdRef.current = nextId;
            setActiveId(nextId);
            snapToItem(nextId);
        }
    }, [rows, primarySelectedId, setActiveId, snapToItem]);

    const setSnapEnabled = useCallback((enabled: boolean) => {
        isSnapEnabledRef.current = enabled;
    }, []);

    return {
        // Return derived state, logic, and refs
        primarySelectedId,
        selectedImage,
        selectedImages,
        selectAndSnap,
        selectMultiple,
        deselectAll,
        handleSelection,
        moveSelection,
        moveRowSelection,
        handleScroll,
        setSnapEnabled,
        isSnapEnabledRef,
        focusCheckRafRef,
        lastSelectedIdRef
    };
};
