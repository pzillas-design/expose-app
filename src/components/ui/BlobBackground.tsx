import React, { useEffect, useRef } from 'react';

/**
 * HaloBackground — Soft glowing orbs à la Framer "Halo Effect".
 * Replaces the pixel-by-pixel wave renderer with a handful of radial-gradient
 * circles drawn each frame. ~20× less CPU, GPU-composited, looks great.
 *
 * Dark mode:  'screen' blend  → luminous glow on near-black
 * Light mode: 'multiply' blend → subtle warm tints on white
 */

interface OrbDef {
    bx: number; by: number;          // base position 0..1
    r: number;                        // radius as fraction of min(w,h)
    cd: [number, number, number];     // color dark mode  (RGB 0-255)
    cl: [number, number, number];     // color light mode (RGB 0-255)
    ad: number; al: number;           // alpha dark / light
    sx: number; sy: number;           // speed X / Y  (radians per ms)
    px: number; py: number;           // phase offset X / Y
    dx: number; dy: number;           // drift amplitude X / Y  (0..1)
}

const ORBS: OrbDef[] = [
    // warm orange — primary accent
    { bx: 0.35, by: 0.45, r: 0.60, cd: [234, 88,  12], cl: [234, 88,  12], ad: 0.55, al: 0.18, sx: 7e-5, sy: 5e-5, px: 0.0, py: 1.2, dx: 0.20, dy: 0.16 },
    // zinc grey — neutral mass
    { bx: 0.70, by: 0.55, r: 0.55, cd: [161,161, 170], cl: [113,113, 122], ad: 0.45, al: 0.12, sx: 5e-5, sy: 8e-5, px: 2.1, py: 0.5, dx: 0.18, dy: 0.22 },
    // amber-orange — secondary warm
    { bx: 0.55, by: 0.25, r: 0.45, cd: [251,146,  60], cl: [251,146,  60], ad: 0.38, al: 0.10, sx: 9e-5, sy: 6e-5, px: 4.2, py: 2.8, dx: 0.14, dy: 0.19 },
    // dark zinc — cool shadow mass
    { bx: 0.20, by: 0.72, r: 0.40, cd: [ 82, 82,  91], cl: [ 82, 82,  91], ad: 0.30, al: 0.07, sx: 6e-5, sy: 4e-5, px: 1.0, py: 3.5, dx: 0.12, dy: 0.24 },
    // deep terracotta — bottom-right warmth
    { bx: 0.82, by: 0.22, r: 0.42, cd: [194, 65,  12], cl: [194, 65,  12], ad: 0.32, al: 0.09, sx: 8e-5, sy: 7e-5, px: 3.3, py: 1.8, dx: 0.16, dy: 0.14 },
];

export const BlobBackground: React.FC<{ className?: string; orbScale?: number; speedScale?: number }> = ({ className, orbScale = 1, speedScale = 1 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0, height = 0;
        let rafId: number;

        const resizeCanvas = () => {
            width  = canvas.offsetWidth  || 400;
            height = canvas.offsetHeight || 300;
            canvas.width  = width;
            canvas.height = height;
        };

        const ro = new ResizeObserver(resizeCanvas);
        ro.observe(canvas);
        resizeCanvas();

        const TARGET_FPS = 30;
        const FRAME_MS   = 1000 / TARGET_FPS;
        let lastFrameTime = 0;

        const render = (now: number) => {
            rafId = requestAnimationFrame(render);
            if (document.hidden || now - lastFrameTime < FRAME_MS) return;
            lastFrameTime = now;
            if (!width || !height) return;

            const isDark = document.documentElement.classList.contains('dark');
            const minDim = Math.min(width, height);

            // Background fill
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = isDark ? '#0d0d0f' : '#ffffff';
            ctx.fillRect(0, 0, width, height);

            // Orbs: 'screen' in dark → additive glow; 'multiply' in light → colour tint
            ctx.globalCompositeOperation = isDark ? 'screen' : 'multiply';

            const SPEED = 1.15 * speedScale;
            for (const o of ORBS) {
                const cx = (o.bx + Math.sin(now * o.sx * SPEED + o.px) * o.dx) * width;
                const cy = (o.by + Math.cos(now * o.sy * SPEED + o.py) * o.dy) * height;
                const r  = o.r * minDim * orbScale;
                const [rr, gg, bb] = isDark ? o.cd : o.cl;
                const alpha = isDark ? o.ad : o.al;

                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                grad.addColorStop(0,   `rgba(${rr},${gg},${bb},${alpha})`);
                grad.addColorStop(0.5, `rgba(${rr},${gg},${bb},${alpha * 0.4})`);
                grad.addColorStop(1,   `rgba(${rr},${gg},${bb},0)`);

                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
            }

            ctx.globalCompositeOperation = 'source-over';
        };

        rafId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(rafId);
            ro.disconnect();
        };
    }, []);

    return (
        <>
            <style>{`@keyframes halo-fadein { from { opacity:0 } to { opacity:1 } }`}</style>
            <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full${className ? ` ${className}` : ''}`}
                style={{
                    animation: 'halo-fadein 1.4s ease-out both',
                    filter: 'blur(32px)',
                    transform: 'scale(1.45)',
                }}
            />
        </>
    );
};
