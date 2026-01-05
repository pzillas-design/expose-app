import React, { useRef, useCallback, useEffect, useState } from 'react';
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
    const zoomAnimFrameRef = useRef<number | null>(null);
    const isZoomingRef = useRef(false);
    const [isZooming, setIsZoomingState] = useState(false);
    const zoomTimeoutRef = useRef<number | null>(null);
    const isAutoScrollingRef = useRef(false);
    const [isAutoScrolling, setIsAutoScrollingState] = useState(false);
    const autoScrollTimeoutRef = useRef<number | null>(null);

    const setIsZooming = useCallback((val: boolean) => {
        isZoomingRef.current = val;
        setIsZoomingState(val);
    }, []);

    const setIsAutoScrolling = useCallback((val: boolean) => {
        isAutoScrollingRef.current = val;
        setIsAutoScrollingState(val);
    }, []);

    // --- Zoom Logic (Synchronized) ---
    const smoothZoomTo = useCallback((targetZoom: number, targetScroll?: { x: number, y: number }, duration = 300) => {
        setIsZooming(true);
        const clampedTargetZoom = Math.min(Math.max(targetZoom, MIN_ZOOM), MAX_ZOOM);
        const startZoom = zoom;

        const container = scrollContainerRef.current;
        const startScrollX = container?.scrollLeft || 0;
        const startScrollY = container?.scrollTop || 0;

        let finalTargetScroll = targetScroll;

        if (!finalTargetScroll && container) {
            // Zoom to viewport center if no target provided
            const rect = container.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const padX = window.innerWidth / 2;
            const padY = window.innerHeight / 2;

            // Content Point at viewport center (unscaled)
            const contentX = (startScrollX + centerX - padX) / zoom;
            const contentY = (startScrollY + centerY - padY) / zoom;

            finalTargetScroll = {
                x: (padX + (contentX * clampedTargetZoom)) - centerX,
                y: (padY + (contentY * clampedTargetZoom)) - centerY
            };
        }

        const startTime = performance.now();

        if (zoomAnimFrameRef.current) cancelAnimationFrame(zoomAnimFrameRef.current);

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = duration === 0 ? 1 : Math.min(elapsed / duration, 1);
            // Ease Out Quad
            const ease = progress * (2 - progress);

            // Interpolate Zoom
            const nextZoom = startZoom + (clampedTargetZoom - startZoom) * ease;
            setZoom(nextZoom);

            // Interpolate Scroll synchronously
            if (finalTargetScroll && container) {
                const nextScrollX = startScrollX + (finalTargetScroll.x - startScrollX) * ease;
                const nextScrollY = startScrollY + (finalTargetScroll.y - startScrollY) * ease;
                container.scrollLeft = nextScrollX;
                container.scrollTop = nextScrollY;
            }

            if (progress < 1) {
                zoomAnimFrameRef.current = requestAnimationFrame(animate);
            } else {
                setZoom(clampedTargetZoom);
                // Ensure final position is exact
                if (finalTargetScroll && container) {
                    container.scrollLeft = finalTargetScroll.x;
                    container.scrollTop = finalTargetScroll.y;
                }
                zoomAnimFrameRef.current = null;
                setIsZooming(false);
            }
        };
        zoomAnimFrameRef.current = requestAnimationFrame(animate);
    }, [zoom, scrollContainerRef, setIsZooming]);

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

    const zoomToItem = useCallback((id: string, paddingPercentage = 0.9, sidebarWidth = 0) => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const el = container.querySelector(`[data-image-id="${id}"]`);
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const currentScrollLeft = container.scrollLeft;
        const currentScrollTop = container.scrollTop;

        // Convert viewport-relative rect to absolute scroll coordinates (current zoom)
        const absLeft = rect.left + currentScrollLeft - containerRect.left;
        const absTop = rect.top + currentScrollTop - containerRect.top;

        const itemWidth = rect.width / zoom;
        const itemHeight = rect.height / zoom;

        // Calculate Ideal Zoom
        const availableWidth = (containerRect.width - sidebarWidth) * paddingPercentage;
        const availableHeight = containerRect.height * paddingPercentage;

        const targetZoom = Math.min(availableWidth / itemWidth, availableHeight / itemHeight);
        const clampedTargetZoom = Math.min(Math.max(targetZoom, MIN_ZOOM), MAX_ZOOM);

        // Center item in the visible area (viewport minus sidebar)
        const centerX = absLeft + (rect.width / 2);
        const centerY = absTop + (rect.height / 2);

        const padX = window.innerWidth / 2;
        const padY = window.innerHeight / 2;

        // Point on canvas (unscaled)
        const contentX = (centerX - padX) / zoom;
        const contentY = (centerY - padY) / zoom;

        const viewportCenterX = (containerRect.width - sidebarWidth) / 2;
        const viewportCenterY = containerRect.height / 2;

        const targetScrollLeft = (padX + (contentX * clampedTargetZoom)) - viewportCenterX;
        const targetScrollTop = (padY + (contentY * clampedTargetZoom)) - viewportCenterY;

        smoothZoomTo(clampedTargetZoom, { x: targetScrollLeft, y: targetScrollTop }, 400);
    }, [zoom, smoothZoomTo, scrollContainerRef]);

    // Snap to single item logic
    const snapToItem = useCallback((id: string) => {
        setIsAutoScrolling(true);
        if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
        autoScrollTimeoutRef.current = window.setTimeout(() => { setIsAutoScrolling(false); }, 800);

        // Simple scroll into view
        setTimeout(() => {
            const el = document.querySelector(`[data-image-id="${id}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
        }, 50);
    }, [setIsAutoScrolling]);

    // Wheel Zoom Listener
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();

                setIsZooming(true);
                if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
                zoomTimeoutRef.current = window.setTimeout(() => {
                    setIsZooming(false);
                }, 600);

                if (zoomAnimFrameRef.current) { cancelAnimationFrame(zoomAnimFrameRef.current); zoomAnimFrameRef.current = null; }

                // Calculate new zoom
                const delta = -e.deltaY;
                const factor = Math.exp(delta * 0.008);
                const targetZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));

                // Zoom-to-Cursor Logic (Stable Centering)
                const rect = container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const scrollLeft = container.scrollLeft;
                const scrollTop = container.scrollTop;

                const padX = window.innerWidth / 2;
                const padY = window.innerHeight / 2;

                // Point on canvas under the mouse
                const contentX = (scrollLeft + mouseX - padX) / zoom;
                const contentY = (scrollTop + mouseY - padY) / zoom;

                try {
                    flushSync(() => {
                        setZoom(targetZoom);
                    });
                } catch (e) {
                    setZoom(targetZoom);
                }

                container.scrollLeft = (padX + (contentX * targetZoom)) - mouseX;
                container.scrollTop = (padY + (contentY * targetZoom)) - mouseY;
            }
        };
        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, [scrollContainerRef, zoom, selectedIds, setIsZooming]);

    // Logic to find the most centered item in the viewport (Added for Staging Compatibility)
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
        setZoom,
        smoothZoomTo,
        fitSelectionToView,
        snapToItem,
        isZooming,
        isAutoScrolling,
        isZoomingRef,
        isAutoScrollingRef,
        getMostVisibleItem,
        zoomToItem
    };
};
