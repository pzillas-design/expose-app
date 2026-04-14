import React, { useEffect, useRef } from 'react';

interface PixelRevealProps {
    src: string;
    isActive: boolean;
    /** Duration of the pixelation→sharp animation in ms (default 1000) */
    duration?: number;
}

/**
 * PixelReveal — overlays a canvas on top of the image that starts
 * heavily pixelated and progressively sharpens to reveal the crisp image.
 * Uses a single rAF loop only during the active animation, then stops.
 */
// Discrete steps: big → medium → small → sharp (fewer intermediate frames)
const PIXEL_STEPS = [80, 40, 16, 6, 1];

export const PixelReveal: React.FC<PixelRevealProps> = ({ src, isActive, duration = 1000 }) => {
    const canvasRef  = useRef<HTMLCanvasElement>(null);
    const rafRef     = useRef<number>(0);
    const imgRef     = useRef<HTMLImageElement | null>(null);
    const startRef   = useRef<number | null>(null);

    // Preload image
    useEffect(() => {
        const img = new Image();
        img.src = src;
        imgRef.current = img;
    }, [src]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        cancelAnimationFrame(rafRef.current);
        startRef.current = null;

        if (!isActive) {
            // Just clear — parent div handles fade-out, no pixelated jump
            const W = canvas.offsetWidth || canvas.width;
            const H = canvas.offsetHeight || canvas.height;
            ctx.clearRect(0, 0, W, H);
            return;
        }

        // Active: step through PIXEL_STEPS discretely — no continuous rAF loop
        // Each step gets equal time, last step = sharp
        const stepDuration = duration / (PIXEL_STEPS.length - 1);

        const drawStep = (stepIdx: number) => {
            const img = imgRef.current;
            if (!img) return;

            const W = canvas.offsetWidth;
            const H = canvas.offsetHeight;
            canvas.width  = W;
            canvas.height = H;

            const block = PIXEL_STEPS[stepIdx];

            if (block <= 1) {
                // Full resolution — single draw, stop
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, W, H);
                return;
            }

            ctx.imageSmoothingEnabled = false;
            const sw = Math.max(1, Math.floor(W / block));
            const sh = Math.max(1, Math.floor(H / block));
            ctx.drawImage(img, 0, 0, sw, sh);
            ctx.drawImage(canvas, 0, 0, sw, sh, 0, 0, W, H);

            if (stepIdx + 1 < PIXEL_STEPS.length) {
                rafRef.current = setTimeout(() => drawStep(stepIdx + 1), stepDuration) as unknown as number;
            }
        };

        const animate = () => {
            const img = imgRef.current;
            if (!img || !img.complete) { rafRef.current = requestAnimationFrame(animate); return; }
            drawStep(0);
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => { cancelAnimationFrame(rafRef.current); clearTimeout(rafRef.current); };
    }, [isActive, duration]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full rounded-2xl"
            style={{ imageRendering: 'pixelated' }}
        />
    );
};
