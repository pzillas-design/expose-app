import React, { useRef, useCallback, useEffect, useState } from 'react';
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
    const zoomTimeoutRef = useRef<number | null>(null);
    const isAutoScrollingRef = useRef(false);
    const autoScrollTimeoutRef = useRef<number | null>(null);

    // --- Zoom Logic (Synchronized) ---
    const smoothZoomTo = useCallback((targetZoom: number, targetScroll?: { x: number, y: number }) => {
        isZoomingRef.current = true;
        const clampedTargetZoom = Math.min(Math.max(targetZoom, MIN_ZOOM), MAX_ZOOM);
        const startZoom = zoom;

        const container = scrollContainerRef.current;
        const startScrollX = container?.scrollLeft || 0;
        const startScrollY = container?.scrollTop || 0;

        const startTime = performance.now();
        const duration = 400; // Smoother transition

        if (zoomAnimFrameRef.current) cancelAnimationFrame(zoomAnimFrameRef.current);

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease Out Quart
            const ease = 1 - Math.pow(1 - progress, 4);

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

    // Wheel Zoom & Gesture Listener
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // --- Gesture Handling (Safari Trackpad) ---
        // Helps prevent native browser zoom and handle smooth pinch
        const onGestureStart = (e: any) => {
            e.preventDefault();
            isZoomingRef.current = true;
        };

        const onGestureChange = (e: any) => {
            e.preventDefault();
            // Safari provides e.scale (1 = neutral). >1 = zoom in, <1 = zoom out.
            // This is a "step" scale for the event, but often cumulative for the gesture.
            // However, a simple relative adjustment works well for smooth feel:
            const scaleChange = e.scale;
            // We dampen it slightly or use it directly depending on feel. 
            // e.scale is cumulative in 'gesturechange' from the start? 
            // Actually, in many implementations, simple fractional application works best:
            // But to be safe and stateless:
            const delta = scaleChange - 1;
            setZoom(z => Math.min(Math.max(z * (1 + delta * 0.5), MIN_ZOOM), MAX_ZOOM));
        };

        const onGestureEnd = (e: any) => {
            e.preventDefault();
            isZoomingRef.current = false;
        };

        // --- Wheel Handling (Chrome/Edge/Firefox) ---
        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();

                isZoomingRef.current = true;
                if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
                zoomTimeoutRef.current = window.setTimeout(() => {
                    isZoomingRef.current = false;
                }, 400);

                if (zoomAnimFrameRef.current) { cancelAnimationFrame(zoomAnimFrameRef.current); zoomAnimFrameRef.current = null; }

                // Calculate new zoom
                // Trackpads often send very small deltas (e.g. -1, -5). Mice send -100.
                // We clamp the delta impact for smoother trackpad feel.
                const delta = -e.deltaY;

                // Adaptive factor: smaller for trackpads (small delta), larger for ratchet wheels
                // Small delta (< 50) -> Trackpad likely.
                const isTrackpad = Math.abs(delta) < 50;
                const factor = isTrackpad
                    ? Math.exp(delta * 0.01)  // More sensitive for trackpad small movements
                    : Math.exp(delta * 0.002); // Less sensitive for mouse wheel big jumps

                const targetZoom = Math.min(Math.max(zoom * factor, MIN_ZOOM), MAX_ZOOM);

                // For trackpad pinch, we usually want simpler center-zoom or cursor-zoom.
                // The current logic forces cursor-zoom if nothing selected, which is good.

                if (selectedIds.length > 0) {
                    setZoom(targetZoom);
                } else {
                    // Zoom-to-Cursor Logic
                    const rect = container.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;
                    const currentScrollLeft = container.scrollLeft;
                    const currentScrollTop = container.scrollTop;

                    // Calculate content coordinates under the mouse before zoom
                    const contentMouseX = (currentScrollLeft + mouseX) / zoom;
                    const contentMouseY = (currentScrollTop + mouseY) / zoom;

                    try {
                        flushSync(() => setZoom(targetZoom));
                    } catch (err) {
                        setZoom(targetZoom);
                    }

                    // Calculate new scroll position to keep content under mouse
                    container.scrollLeft = (contentMouseX * targetZoom) - mouseX;
                    container.scrollTop = (contentMouseY * targetZoom) - mouseY;
                }
            }
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        // @ts-ignore
        container.addEventListener('gesturestart', onGestureStart, { passive: false });
        // @ts-ignore
        container.addEventListener('gesturechange', onGestureChange, { passive: false });
        // @ts-ignore
        container.addEventListener('gestureend', onGestureEnd, { passive: false });

        return () => {
            container.removeEventListener('wheel', onWheel);
            // @ts-ignore
            container.removeEventListener('gesturestart', onGestureStart);
            // @ts-ignore
            container.removeEventListener('gesturechange', onGestureChange);
            // @ts-ignore
            container.removeEventListener('gestureend', onGestureEnd);
        };
    }, [scrollContainerRef, zoom, selectedIds]);

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
        isZoomingRef,
        isAutoScrollingRef,
        getMostVisibleItem
    };
};
