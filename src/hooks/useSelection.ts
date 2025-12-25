
import { useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { ImageRow } from '../types';

interface UseSelectionProps {
    rows: ImageRow[];
    snapToItem: (id: string) => void;
    fitSelectionToView: () => void;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    zoom: number;
    isAutoScrollingRef: React.MutableRefObject<boolean>;
    isZoomingRef: React.MutableRefObject<boolean>;

    // External State
    selectedIds: string[];
    setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
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
    setSelectedIds
}: UseSelectionProps) => {

    // Refs
    const isSnapEnabledRef = useRef(true);
    const lastSelectedIdRef = useRef<string | null>(null);
    const focusCheckRafRef = useRef<number | null>(null);

    // Derived
    const allImages = rows.flatMap(r => r.items);
    const primarySelectedId = selectedIds[selectedIds.length - 1] || null;
    const selectedImage = allImages.find(img => img.id === primarySelectedId) || null;
    const selectedImages = allImages.filter(img => selectedIds.includes(img.id));

    // --- Selection Logic ---

    const selectAndSnap = useCallback((id: string) => {
        if (focusCheckRafRef.current) cancelAnimationFrame(focusCheckRafRef.current);
        isSnapEnabledRef.current = true;
        lastSelectedIdRef.current = id;
        setSelectedIds([id]);
        snapToItem(id);
    }, [snapToItem, setSelectedIds]);

    const selectMultiple = useCallback((ids: string[]) => {
        setSelectedIds(ids);
        if (ids.length > 0) {
            lastSelectedIdRef.current = ids[ids.length - 1];
        }
    }, [setSelectedIds]);

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
            isSnapEnabledRef.current = true;
            selectAndSnap(id);
        }
    }, [allImages, selectAndSnap, setSelectedIds]);

    // Trigger fit when multi-selection changes
    useEffect(() => {
        if (selectedIds.length > 1) {
            fitSelectionToView();
        }
    }, [selectedIds.length, fitSelectionToView]);

    // --- Anchor Selection on Zoom (Single Item) ---
    useLayoutEffect(() => {
        if (selectedIds.length === 1 && primarySelectedId && scrollContainerRef.current) {
            const el = scrollContainerRef.current.querySelector(`[data-image-id="${primarySelectedId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
            }
        }
    }, [zoom, selectedIds.length, primarySelectedId, scrollContainerRef]);

    // --- Scroll Logic (Focus Tracking) ---
    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current || isAutoScrollingRef.current || isZoomingRef.current || selectedIds.length > 1 || !isSnapEnabledRef.current) return;

        const container = scrollContainerRef.current;
        if (focusCheckRafRef.current) cancelAnimationFrame(focusCheckRafRef.current);

        focusCheckRafRef.current = requestAnimationFrame(() => {
            if (isZoomingRef.current || isAutoScrollingRef.current) return;

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
                // Important: Only update selection, do NOT snap/scroll (the user is already scrolling)
                setSelectedIds([closestImageId]);
            }
        });
    }, [primarySelectedId, selectedIds.length, scrollContainerRef, isAutoScrollingRef, isZoomingRef, setSelectedIds]);

    // Keyboard Navigation
    const moveSelection = useCallback((direction: -1 | 1, fromId?: string) => {
        if (allImages.length === 0) return;
        const currentId = fromId || lastSelectedIdRef.current || primarySelectedId;
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

    return {
        // Return derived state, logic, and refs
        primarySelectedId,
        selectedImage,
        selectedImages,
        selectAndSnap,
        selectMultiple,
        handleSelection,
        moveSelection,
        moveRowSelection,
        handleScroll,
        isSnapEnabledRef,
        focusCheckRafRef,
        lastSelectedIdRef
    };
};
