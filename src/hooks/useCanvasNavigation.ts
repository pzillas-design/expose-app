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
    const zoomRef = useRef(zoom);
    useEffect(() => { zoomRef.current = zoom; }, [zoom]);
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
    const smoothZoomTo = useCallback((targetZoom: number, targetScroll?: { x: number, y: number }, duration = 400) => {
        const container = scrollContainerRef.current;
        if (!container) return; // Guard

        isZoomingRef.current = true;
        setIsZoomingState(true); // Sync state

        const clampedTargetZoom = Math.min(Math.max(targetZoom, MIN_ZOOM), MAX_ZOOM);
        const startZoom = zoomRef.current;

        const startScrollX = container.scrollLeft;
        const startScrollY = container.scrollTop;

        const startTime = performance.now();
        if (zoomAnimFrameRef.current) cancelAnimationFrame(zoomAnimFrameRef.current);

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = duration === 0 ? 1 : Math.min(elapsed / duration, 1);

            // Ease Out Quart (Matching Main Branch)
            const ease = 1 - Math.pow(1 - progress, 4);

            const nextZoom = startZoom + (clampedTargetZoom - startZoom) * ease;
            setZoom(nextZoom);

            // Only interpolate scroll if a target is explicitly provided (e.g. Fit to View)
            // Or if no target is provided, scale scroll proportionally to keep center (Zoom to Center)
            if (targetScroll) {
                const nextScrollX = startScrollX + (targetScroll.x - startScrollX) * ease;
                const nextScrollY = startScrollY + (targetScroll.y - startScrollY) * ease;
                container.scrollLeft = nextScrollX;
                container.scrollTop = nextScrollY;
            } else {
                // Proportional Scroll Scaling (Zoom to Center)
                if (startZoom > 0.001) {
                    const ratio = nextZoom / startZoom;
                    container.scrollLeft = startScrollX * ratio;
                    container.scrollTop = startScrollY * ratio;
                }
            }

            if (progress < 1) {
                zoomAnimFrameRef.current = requestAnimationFrame(animate);
            } else {
                setZoom(clampedTargetZoom);
                if (targetScroll) {
                    container.scrollLeft = targetScroll.x;
                    container.scrollTop = targetScroll.y;
                } else {
                    // Final snap for proportional zoom
                    if (startZoom > 0.001) {
                        const ratio = clampedTargetZoom / startZoom;
                        container.scrollLeft = startScrollX * ratio;
                        container.scrollTop = startScrollY * ratio;
                    }
                }
                zoomAnimFrameRef.current = null;
                isZoomingRef.current = false;
                setIsZoomingState(false);
            }
        };
        zoomAnimFrameRef.current = requestAnimationFrame(animate);
    }, [scrollContainerRef, setIsZooming]);

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
            const baseBoxWidth = currentBoxWidth / zoomRef.current;
            const baseBoxHeight = currentBoxHeight / zoomRef.current;

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
            const ratio = targetZoom / zoomRef.current;
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

    }, [selectedIds, smoothZoomTo, scrollContainerRef]);

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

        const itemWidth = rect.width / zoomRef.current;
        const itemHeight = rect.height / zoomRef.current;

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
        const contentX = (centerX - padX) / zoomRef.current;
        const contentY = (centerY - padY) / zoomRef.current;

        const viewportCenterX = (containerRect.width - sidebarWidth) / 2;
        const viewportCenterY = containerRect.height / 2;

        const targetScrollLeft = (padX + (contentX * clampedTargetZoom)) - viewportCenterX;
        const targetScrollTop = (padY + (contentY * clampedTargetZoom)) - viewportCenterY;

        smoothZoomTo(clampedTargetZoom, { x: targetScrollLeft, y: targetScrollTop }, 300);
    }, [smoothZoomTo, scrollContainerRef]);

    // Snap to single item logic
    const snapToItem = useCallback((id: string, instant = false) => {
        setIsAutoScrolling(true);
        if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
        autoScrollTimeoutRef.current = window.setTimeout(() => { setIsAutoScrolling(false); }, instant ? 200 : 800);

        const executeSnap = () => {
            const container = scrollContainerRef.current;
            const el = document.querySelector(`[data-image-id="${id}"]`);
            if (!el || !container) return;

            const containerRect = container.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();

            // Calculate center position
            const targetScrollLeft = container.scrollLeft + (elRect.left - containerRect.left) - (containerRect.width / 2) + (elRect.width / 2);
            const targetScrollTop = container.scrollTop + (elRect.top - containerRect.top) - (containerRect.height / 2) + (elRect.height / 2);

            container.scrollTo({
                left: targetScrollLeft,
                top: targetScrollTop,
                behavior: instant ? 'auto' : 'smooth'
            });
        };

        if (instant) {
            requestAnimationFrame(executeSnap);
        } else {
            setTimeout(executeSnap, 50);
        }
    }, [setIsAutoScrolling, scrollContainerRef]);

    // Wheel Zoom Listener
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        let lastWheelTime = 0;
        let wheelEventCount = 0;

        const onWheel = (e: WheelEvent) => {
            const now = performance.now();
            const timeSinceLastWheel = now - lastWheelTime;
            lastWheelTime = now;

            // Detect rapid wheel events (likely pinch gesture)
            if (timeSinceLastWheel < 50) {
                wheelEventCount++;
            } else {
                wheelEventCount = 0;
            }

            // Pinch-to-zoom detection:
            // 1. Explicit ctrl/meta key (standard)
            // 2. Rapid wheel events (trackpad pinch often sends multiple events quickly)
            const isPinchGesture = e.ctrlKey || e.metaKey || wheelEventCount > 2;

            if (isPinchGesture) {
                e.preventDefault();
                e.stopPropagation();

                isZoomingRef.current = true;
                setIsZoomingState(true);

                // Extended timeout to prevent navigation during zoom
                if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
                zoomTimeoutRef.current = window.setTimeout(() => {
                    isZoomingRef.current = false;
                    setIsZoomingState(false);
                }, 600); // Increased from 400ms to 600ms

                if (zoomAnimFrameRef.current) {
                    cancelAnimationFrame(zoomAnimFrameRef.current);
                    zoomAnimFrameRef.current = null;
                }

                const delta = -e.deltaY;
                // Match main branch factor (0.008) instead of 0.006
                setZoom(z => Math.min(Math.max(z * Math.exp(delta * 0.008), MIN_ZOOM), MAX_ZOOM));
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
