import React, { useRef, useCallback } from 'react';
import { useMobile } from './useMobile';
import { ImageRow } from '../types';

interface UseSelectionProps {
    rows: ImageRow[];
    // External State
    selectedIds: string[];
    setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
    activeId: string | null;
    setActiveId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useSelection = ({
    rows,
    selectedIds,
    setSelectedIds,
    activeId,
    setActiveId,
}: UseSelectionProps) => {
    const isMobile = useMobile();
    const lastSelectedIdRef = useRef<string | null>(null);

    // Derived
    const allImages = rows.flatMap(r => r.items);
    const primarySelectedId = activeId;
    const selectedImage = allImages.find(img => img.id === primarySelectedId) || null;
    const selectedImages = allImages.filter(img => selectedIds.includes(img.id));

    // --- Selection Logic ---

    // selectAndSnap: previously scrolled the canvas to the item. Now just selects it.
    const selectAndSnap = useCallback((id: string, _instant = false) => {
        lastSelectedIdRef.current = id;
        setSelectedIds(isMobile ? [] : [id]);
        setActiveId(id);
    }, [setActiveId, setSelectedIds, isMobile]);

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
            lastSelectedIdRef.current = id;
            setActiveId(id);
            setSelectedIds([]);
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
            // Cmd/Ctrl Click — toggle mark
            setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
            lastSelectedIdRef.current = id;
            setActiveId(id);
        } else {
            // Single click — set active focus only, don't clear marks
            lastSelectedIdRef.current = id;
            setActiveId(id);
        }
    }, [allImages, setSelectedIds, setActiveId, isMobile]);

    // Keyboard: move left/right through flat image list
    const moveSelection = useCallback((direction: -1 | 1, fromId?: string) => {
        if (allImages.length === 0) return;
        const currentId = fromId || lastSelectedIdRef.current || primarySelectedId;

        let nextIndex = 0;
        if (currentId) {
            const currentIndex = allImages.findIndex(img => img.id === currentId);
            if (currentIndex !== -1) {
                nextIndex = Math.max(0, Math.min(allImages.length - 1, currentIndex + direction));
            }
        }

        const nextId = allImages[nextIndex].id;
        lastSelectedIdRef.current = nextId;
        setActiveId(nextId);
    }, [allImages, setActiveId, primarySelectedId]);

    // Keyboard: move up/down through rows
    const moveRowSelection = useCallback((direction: -1 | 1) => {
        const currentId = lastSelectedIdRef.current || primarySelectedId;
        if (!currentId) {
            if (rows.length > 0 && rows[0].items.length > 0) selectAndSnap(rows[0].items[0].id);
            return;
        }
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
            const nextId = targetRow.items[Math.min(colIndex, targetRow.items.length - 1)].id;
            lastSelectedIdRef.current = nextId;
            setActiveId(nextId);
        }
    }, [rows, primarySelectedId, setActiveId, selectAndSnap]);

    return {
        primarySelectedId,
        selectedImage,
        selectedImages,
        selectAndSnap,
        selectMultiple,
        deselectAll,
        handleSelection,
        moveSelection,
        moveRowSelection,
        lastSelectedIdRef
    };
};
