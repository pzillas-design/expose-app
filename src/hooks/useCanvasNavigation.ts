import React, { useRef, useCallback, useEffect, useState, useLayoutEffect } from 'react';
import { flushSync } from 'react-dom';
import { CanvasImage } from '../types';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

interface UseCanvasNavigationProps {
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    selectedIds: string[];
    allImages: CanvasImage[];
    primarySelectedId: string | null;
}

export const useCanvasNavigation = ({
    scrollContainerRef,
    selectedIds,
    allImages,
    primarySelectedId
}: UseCanvasNavigationProps) => {

    const [zoom, setZoom] = useState(1.25);
    const [isZooming, setIsZooming] = useState(false);
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);

    const zoomAnimFrameRef = useRef<number | null>(null);
    const zoomRef = useRef(zoom);
    useEffect(() => { zoomRef.current = zoom; }, [zoom]);

    const isZoomingRef = useRef(false);
    const isAutoScrollingRef = useRef(false);
    const zoomTimeoutRef = useRef<number | null>(null);
    const autoScrollTimeoutRef = useRef<number | null>(null);
    const lastZoomSourceRef = useRef<'wheel' | 'button' | null>(null);

    // --- Zoom Logic (Synchronized) ---
    const smoothZoomTo = useCallback((targetZoom: number, targetScroll?: { x: number, y: number }, duration: number = 400, source: 'wheel' | 'button' = 'button') => {
        isZoomingRef.current = true;
        setIsZooming(true);
        lastZoomSourceRef.current = source;
        const clampedTargetZoom = Math.min(Math.max(targetZoom, MIN_ZOOM), MAX_ZOOM);
        const startZoom = zoom;

        const container = scrollContainerRef.current;
        const startScrollX = container?.scrollLeft || 0;
        const startScrollY = container?.scrollTop || 0;

        const startTime = performance.now();

        if (zoomAnimFrameRef.current) cancelAnimationFrame(zoomAnimFrameRef.current);

        // Instant snap if duration is 0
        if (duration === 0) {
            setZoom(clampedTargetZoom);
            if (targetScroll && container) {
                container.scrollLeft = targetScroll.x;
                container.scrollTop = targetScroll.y;
            }
            isZoomingRef.current = false;
            setIsZooming(false);
            return;
        }

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease In Out Cubic
            const ease = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            // Interpolate Zoom
            const nextZoom = startZoom + (clampedTargetZoom - startZoom) * ease;
            setZoom(nextZoom);

            // Interpolate Scroll synchronously
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
                // Ensure final position is exact
                if (targetScroll && container) {
                    container.scrollLeft = targetScroll.x;
                    container.scrollTop = targetScroll.y;
                }
                zoomAnimFrameRef.current = null;
                isZoomingRef.current = false;
                setIsZooming(false);
            }
        };
        zoomAnimFrameRef.current = requestAnimationFrame(animate);
    }, [zoom, scrollContainerRef]);

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

            // 5. Execute Synchronized Move - INSTANT to avoid jitter ("Zappeln")
            smoothZoomTo(targetZoom, { x: targetScrollLeft, y: targetScrollTop }, 0);
        });

    }, [selectedIds, zoom, smoothZoomTo, scrollContainerRef]);

    // Snap to single item logic
    const snapToItem = useCallback((id: string) => {
        isAutoScrollingRef.current = true;
        setIsAutoScrolling(true);
        if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
        autoScrollTimeoutRef.current = window.setTimeout(() => {
            isAutoScrollingRef.current = false;
            setIsAutoScrolling(false);
        }, 600); // Tightened from 1200ms

        const el = document.querySelector(`[data-image-id="${id}"]`);
        if (el && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const containerRect = container.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();

            // Calculate where it should be centered
            const targetScrollLeft = container.scrollLeft + (elRect.left + elRect.width / 2) - (containerRect.left + containerRect.width / 2);
            const targetScrollTop = container.scrollTop + (elRect.top + elRect.height / 2) - (containerRect.top + containerRect.height / 2);

            smoothZoomTo(zoom, { x: targetScrollLeft, y: targetScrollTop }, 300, 'button'); // Snappier 300ms
        }
    }, [zoom, smoothZoomTo, scrollContainerRef]);

    // Wheel Zoom Listener
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();

                const currentZoom = zoomRef.current;
                isZoomingRef.current = true;
                lastZoomSourceRef.current = 'wheel';

                try {
                    flushSync(() => {
                        setIsZooming(true);
                    });
                } catch (e) {
                    setIsZooming(true);
                }

                if (zoomTimeoutRef.current) window.clearTimeout(zoomTimeoutRef.current);
                zoomTimeoutRef.current = window.setTimeout(() => {
                    isZoomingRef.current = false;
                    setIsZooming(false);
                }, 500); // Increased from 400ms to allow settling

                if (zoomAnimFrameRef.current) {
                    cancelAnimationFrame(zoomAnimFrameRef.current);
                    zoomAnimFrameRef.current = null;
                }

                // Calculate new zoom
                const delta = -e.deltaY;
                const factor = Math.exp(delta * 0.008);
                const targetZoom = Math.min(Math.max(currentZoom * factor, MIN_ZOOM), MAX_ZOOM);

                // We want to update the state but use the new value immediately for scroll calculation
                if (selectedIds.length === 1 && primarySelectedId) {
                    const el = container.querySelector(`[data-image-id="${primarySelectedId}"]`);
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        const containerRect = container.getBoundingClientRect();
                        const anchorX = rect.left + rect.width / 2 - containerRect.left;
                        const anchorY = rect.top + rect.height / 2 - containerRect.top;

                        const scrollLeft = container.scrollLeft;
                        const scrollTop = container.scrollTop;
                        const padX = window.innerWidth / 2;
                        const padY = window.innerHeight / 2;

                        // Reference point in un-scaled space
                        const contentX = (scrollLeft + anchorX - padX) / currentZoom;
                        const contentY = (scrollTop + anchorY - padY) / currentZoom;

                        setZoom(targetZoom);

                        // Immediate scroll update to match the new zoom pivot
                        container.scrollLeft = (padX + (contentX * targetZoom)) - anchorX;
                        container.scrollTop = (padY + (contentY * targetZoom)) - anchorY;
                    } else {
                        setZoom(targetZoom);
                    }
                } else {
                    const rect = container.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;
                    const scrollLeft = container.scrollLeft;
                    const scrollTop = container.scrollTop;
                    const padX = window.innerWidth / 2;
                    const padY = window.innerHeight / 2;

                    const contentX = (scrollLeft + mouseX - padX) / currentZoom;
                    const contentY = (scrollTop + mouseY - padY) / currentZoom;

                    setZoom(targetZoom);

                    container.scrollLeft = (padX + (contentX * targetZoom)) - mouseX;
                    container.scrollTop = (padY + (contentY * targetZoom)) - mouseY;
                }
            }
        };
        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, [scrollContainerRef, selectedIds, primarySelectedId]);

    // Logic to find the most centered item in the viewport
    const getMostVisibleItem = useCallback(() => {
        if (!scrollContainerRef.current) return null;
        const container = scrollContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const viewportCenterX = containerRect.left + (containerRect.width / 2);
        const viewportCenterY = containerRect.top + (containerRect.height / 2);

        const images = container.querySelectorAll('[data-image-id]');
        let closestId: string | null = null;
        let minDistance = Infinity;

        images.forEach((img) => {
            const rect = img.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const distance = Math.sqrt(Math.pow(centerX - viewportCenterX, 2) + Math.pow(centerY - viewportCenterY, 2));

            if (distance < minDistance) {
                minDistance = distance;
                closestId = img.getAttribute('data-image-id');
            }
        });

        return closestId;
    }, [scrollContainerRef]);

    return {
        zoom,
        isZooming,
        isAutoScrolling,
        setZoom,
        smoothZoomTo,
        fitSelectionToView,
        snapToItem,
        isZoomingRef,
        isAutoScrollingRef,
        getMostVisibleItem
    };
};
