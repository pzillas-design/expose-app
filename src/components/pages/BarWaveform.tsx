import React, { useEffect, useRef } from 'react';

interface BarWaveformProps {
    isActive: boolean;
}

/**
 * BarWaveform — vertical bar equalizer style.
 * Each bar animates independently with randomised height and speed.
 */
export const BarWaveform: React.FC<BarWaveformProps> = ({ isActive }) => {
    const canvasRef   = useRef<HTMLCanvasElement>(null);
    const rafRef      = useRef<number>(0);
    const t0Ref       = useRef<number>(Date.now());
    const isActiveRef = useRef(isActive);
    isActiveRef.current = isActive;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const dpr  = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width  = rect.width  * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
        };
        window.addEventListener('resize', resize);
        resize();

        // Each bar has its own phase and speed so they move independently
        const BAR_COUNT = 60;
        const bars = Array.from({ length: BAR_COUNT }, (_, i) => ({
            phase:  Math.random() * Math.PI * 2,
            speed:  3.5 + Math.random() * 6.5,   // how fast it oscillates
            amp:    0.45 + Math.random() * 0.55,  // max fraction of half-height
        }));

        const draw = () => {
            const W  = canvas.width  / (window.devicePixelRatio || 1);
            const H  = canvas.height / (window.devicePixelRatio || 1);
            const cy = H / 2;
            ctx.clearRect(0, 0, W, H);

            const t          = (Date.now() - t0Ref.current) * 0.001;
            const active     = isActiveRef.current;

            const barW       = 6;
            const gap        = W / BAR_COUNT;  // full width, edge-to-edge
            const startX     = gap / 2;
            // Global envelope — center bars tall, edges visibly small but not zero
            const envelope   = (i: number) => Math.pow(Math.sin((i / (BAR_COUNT - 1)) * Math.PI), 2.2);

            bars.forEach((bar, i) => {
                const env       = envelope(i);
                const maxH      = H * 0.44 * bar.amp * env;

                let barH: number;
                if (active) {
                    // Speech-like: gentle volume swell, never silent (range ~0.4–1.0)
                    const speechEnv = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.4 + 0.3))
                                        * (0.6 + 0.4 * Math.sin(t * 0.7 + 1.8));
                    // Per-bar oscillation
                    const osc1  = Math.abs(Math.sin(t * bar.speed + bar.phase));
                    const osc2  = Math.abs(Math.sin(t * bar.speed * 0.61 + bar.phase + 1.3));
                    const pulse = Math.pow((osc1 * 0.7 + osc2 * 0.3), 0.55);
                    barH        = Math.max(2, maxH * pulse * speechEnv);
                } else {
                    // Standby: small frozen bars
                    barH = maxH * 0.12;
                }

                const x = startX + i * gap;
                ctx.fillStyle = active
                    ? `rgba(249, 115, 22, ${0.75 + 0.25 * (barH / (H * 0.44))})`
                    : 'rgba(249, 115, 22, 0.28)';

                // Draw bar symmetrically above and below center
                ctx.fillRect(x - barW / 2, cy - barH, barW, barH * 2);
            });

            rafRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full pointer-events-none"
        />
    );
};
