
import React, { useRef, useCallback, useEffect, useState, useLayoutEffect } from 'react';
import { CanvasImage } from '../types';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

interface UseCanvasNavigationProps {
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    selectedIds: string[];
    allImages: CanvasImage[];
    primarySelectedId: string | null;
    currentBoardId: string | null;
}

export const useCanvasNavigation = ({
    scrollContainerRef,
    selectedIds,
    allImages,
    primarySelectedId,
    currentBoardId
}: UseCanvasNavigationProps) => {

    const [zoom, setZoom] = useState(1.25);
    const zoomRef = useRef(zoom);
    useEffect(() => { zoomRef.current = zoom; }, [zoom]);

    const isZoomingRef = useRef(false);
    const [isZooming, setIsZoomingState] = useState(false);
    const zoomTimeoutRef = useRef<number | null>(null);
    const isAutoScrollingRef = useRef(false);
    const [isAutoScrolling, setIsAutoScrollingState] = useState(false);
    const autoScrollTimeoutRef = useRef<number | null>(null);

    // Zoom focal point tracking
    const focalPointRef = useRef<{
        contentX: number,
        contentY: number,
        screenX: number,
        screenY: number
    } | null>(null);
    const zoomAnimFrameRef = useRef<number | null>(null);

    const setIsZooming = useCallback((val: boolean) => {
        isZoomingRef.current = val;
        setIsZoomingState(val);
    }, []);

    const setIsAutoScrolling = useCallback((val: boolean) => {
        isAutoScrollingRef.current = val;
        setIsAutoScrollingState(val);
    }, []);

    // Sync scroll after zoom changes to prevent flicker
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !focalPointRef.current) return;

        const { contentX, contentY, screenX, screenY } = focalPointRef.current;
        const padX = window.innerWidth * 2.0;
        const padY = window.innerHeight * 2.0;

        // Position on screen where the focal point was, adjusting for non-scaling padding
        container.scrollLeft = (contentX * zoom) + padX - screenX;
        container.scrollTop = (contentY * zoom) + padY - screenY;
    }, [zoom, scrollContainerRef]);

    // --- Zoom Logic (Synchronized) ---
    const smoothZoomTo = useCallback((targetZoom: number, targetScroll?: { x: number, y: number }, duration = 400) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        isZoomingRef.current = true;
        setIsZoomingState(true);

        const clampedTargetZoom = Math.min(Math.max(targetZoom, MIN_ZOOM), MAX_ZOOM);
        const startZoom = zoomRef.current;
        const startScrollX = container.scrollLeft;
        const startScrollY = container.scrollTop;

        // If targetScroll is provided, we don't use focalPointRef pinning
        if (targetScroll) {
            focalPointRef.current = null;
        } else {
            // Pin the current viewport center
            const containerRect = container.getBoundingClientRect();
            const screenX = containerRect.width / 2;
            const screenY = containerRect.height / 2;
            const padX = window.innerWidth * 0.5;
            const padY = window.innerHeight * 0.5;

            focalPointRef.current = {
                contentX: (container.scrollLeft + screenX - padX) / startZoom,
                contentY: (container.scrollTop + screenY - padY) / startZoom,
                screenX,
                screenY
            };
        }

        const startTime = performance.now();
        if (zoomAnimFrameRef.current) cancelAnimationFrame(zoomAnimFrameRef.current);

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = duration === 0 ? 1 : Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);

            const nextZoom = startZoom + (clampedTargetZoom - startZoom) * ease;
            setZoom(nextZoom);

            if (targetScroll && container) {
                const nextScrollX = startScrollX + (targetScroll.x - startScrollX) * ease;
                const nextScrollY = startScrollY + (targetScroll.y - startScrollY) * ease;
                container.scrollLeft = nextScrollX;
                container.scrollTop = nextScrollY;
            }

            if (progress < 1) {
                zoomAnimFrameRef.current = requestAnimationFrame(animate);
            } else {
                setZoom(clampedTargetZoom);
                if (targetScroll && container) {
                    container.scrollLeft = targetScroll.x;
                    container.scrollTop = targetScroll.y;
                }
                zoomAnimFrameRef.current = null;
                isZoomingRef.current = false;
                setIsZoomingState(false);
                focalPointRef.current = null;
            }
        };
        zoomAnimFrameRef.current = requestAnimationFrame(animate);
    }, [scrollContainerRef]);

    // --- Viewport Fitting (Magnetic Group) ---
    const fitSelectionToView = useCallback(() => {
        if (selectedIds.length < 2 || !scrollContainerRef.current) return;

        // Wrap in requestAnimationFrame to ensure we measure correctly
        requestAnimationFrame(() => {
            if (!scrollContainerRef.current) return;

            const container = scrollContainerRef.current;
            const containerRect = container.getBoundingClientRect();

            // Current scroll position
            const currentScrollLeft = container.scrollLeft;
            const currentScrollTop = container.scrollTop;

            let minLeft = Infinity;
            let minTop = Infinity;
            let maxRight = -Infinity;
            let maxBottom = -Infinity;
            let valid = false;

            selectedIds.forEach(id => {
                const el = container.querySelector(`[data-image-id="${id}"]`);
                if (el) {
                    const rect = el.getBoundingClientRect();

                    // Convert viewport-relative rect to absolute scroll coordinates (current zoom)
                    const absLeft = rect.left + currentScrollLeft - containerRect.left;
                    const absTop = rect.top + currentScrollTop - containerRect.top;

                    if (absLeft < minLeft) minLeft = absLeft;
                    if (absTop < minTop) minTop = absTop;
                    if (absLeft + rect.width > maxRight) maxRight = absLeft + rect.width;
                    if (absTop + rect.height > maxBottom) maxBottom = absTop + rect.height;

                    valid = true;
                }
            });

            if (!valid) return;

            // 1. Current Box Geometry
            const currentBoxWidth = maxRight - minLeft;
            const currentBoxHeight = maxBottom - minTop;

            const currentCenterX = minLeft + currentBoxWidth / 2;
            const currentCenterY = minTop + currentBoxHeight / 2;

            // 2. Base Dimensions (Un-zoomed)
            const baseBoxWidth = currentBoxWidth / zoom;
            const baseBoxHeight = currentBoxHeight / zoom;

            // 3. Calculate Ideal Zoom
            const padding = 120; // Extra breathing room
            const availableWidth = containerRect.width - (padding * 2);
            const availableHeight = containerRect.height - (padding * 2);

            const scaleX = availableWidth / baseBoxWidth;
            const scaleY = availableHeight / baseBoxHeight;

            // Cap zoom to prevent extreme closeups on small groups
            const targetZoom = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_ZOOM), 1.2);

            // 4. Calculate Target Scroll Position
            const padLeft = window.innerWidth / 2; // 50vw
            const padTop = window.innerHeight / 2; // 50vh

            // Relative to content origin
            const contentX = currentCenterX - padLeft;
            const contentY = currentCenterY - padTop;

            // Scale
            const ratio = targetZoom / zoom;
            const newContentX = contentX * ratio;
            const newContentY = contentY * ratio;

            // Absolute scroll coords
            const newCenterX = newContentX + padLeft;
            const newCenterY = newContentY + padTop;

            // Center in viewport
            const targetScrollLeft = newCenterX - (containerRect.width / 2);
            const targetScrollTop = newCenterY - (containerRect.height / 2);

            // 5. Execute Synchronized Move
            smoothZoomTo(targetZoom, { x: targetScrollLeft, y: targetScrollTop });
        });

    }, [selectedIds, zoom, smoothZoomTo, scrollContainerRef]);

    // Snap to single item logic
    const snapToItem = useCallback((id: string) => {
        isAutoScrollingRef.current = true;
        if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
        autoScrollTimeoutRef.current = window.setTimeout(() => { isAutoScrollingRef.current = false; }, 800);

        // Simple scroll into view
        setTimeout(() => {
            const el = document.querySelector(`[data-image-id="${id}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
        }, 50);
    }, []);

    // Wheel Zoom Listener
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();

                const currentZoom = zoom;
                const containerRect = container.getBoundingClientRect();

                // Always use viewport (container) center
                const focalX = container.clientWidth / 2;
                const focalY = container.clientHeight / 2;

                const padX = window.innerWidth * 2.0;
                const padY = window.innerHeight * 2.0;

                // Sync focal point state
                focalPointRef.current = {
                    contentX: (container.scrollLeft + focalX - padX) / currentZoom,
                    contentY: (container.scrollTop + focalY - padY) / currentZoom,
                    screenX: focalX,
                    screenY: focalY
                };

                const delta = -e.deltaY;
                const zoomFactor = Math.exp(delta * 0.008);
                const nextZoom = Math.min(Math.max(zoom * zoomFactor, MIN_ZOOM), MAX_ZOOM);

                // Use the state update for wheel zoom to keep it extremely responsive 
                // but we could also pipe it through smoothZoomTo if we want it "buttery"
                setZoom(nextZoom);
            }
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, [zoom, scrollContainerRef, currentBoardId]);

    return {
        zoom,
        setZoom,
        smoothZoomTo,
        fitSelectionToView,
        snapToItem,
        isZoomingRef,
        isAutoScrollingRef
    };
};
