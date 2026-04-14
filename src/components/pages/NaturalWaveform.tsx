import React, { useEffect, useRef } from 'react';

interface NaturalWaveformProps {
    isActive: boolean;
}

export const NaturalWaveform: React.FC<NaturalWaveformProps> = ({ isActive }) => {
    const canvasRef  = useRef<HTMLCanvasElement>(null);
    const rafRef     = useRef<number>(0);
    const t0Ref      = useRef<number>(Date.now());
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

        const drawWave = (t: number, alpha: number, ampScale: number) => {
            const W  = canvas.width  / (window.devicePixelRatio || 1);
            const H  = canvas.height / (window.devicePixelRatio || 1);
            const cy = H / 2;

            // Amplitude = fraction of half-height so peaks reach ~40% of canvas height
            const maxAmp = H * 0.40;

            // pow(abs(sin)) → spends most time near peak, dips briefly — more dynamic moments
            const breath = 0.55 + 0.45 * Math.pow(Math.abs(Math.sin(t * 7.5)), 0.35);

            // 6 waves — irrational speed ratios, never repeats
            const freq1 = 0.030, speed1 =  5.50;
            const freq2 = 0.071, speed2 =  8.91;
            const freq3 = 0.051, speed3 = 13.70;
            const freq4 = 0.019, speed4 =  9.43;
            const freq5 = 0.041, speed5 = 11.23;
            const freq6 = 0.088, speed6 =  6.77;

            ctx.beginPath();
            ctx.lineWidth   = 6.5;
            ctx.lineCap     = 'square';
            ctx.lineJoin    = 'miter';
            ctx.strokeStyle = `rgba(249, 115, 22, ${alpha})`;

            const step = 5;
            for (let x = 0; x <= W; x += step) {
                const taper = Math.pow(Math.sin((x / W) * Math.PI), 5);
                // Two independent amplitude modulators at different rates → complex envelope
                const mod1  = 0.75 + 0.25 * Math.pow(Math.abs(Math.sin(x * 0.011 + t * 4.80)), 0.4);
                const mod2  = 0.80 + 0.20 * Math.sin(x * 0.005 - t * 6.30);
                const y1    = Math.sin(x * freq1 + t * speed1) * maxAmp * 0.38;
                const y2    = Math.sin(x * freq2 - t * speed2) * maxAmp * 0.32;
                const y3    = Math.sin(x * freq3 + t * speed3) * maxAmp * 0.28;
                const y4    = Math.sin(x * freq4 - t * speed4) * maxAmp * 0.24;
                const y5    = Math.sin(x * freq5 + t * speed5) * maxAmp * 0.20;
                const y6    = Math.sin(x * freq6 - t * speed6) * maxAmp * 0.16;
                const y     = (y1 + y2 + y3 + y4 + y5 + y6) * taper * breath * mod1 * mod2 * ampScale;

                if (x === 0) ctx.moveTo(x, cy + y);
                else         ctx.lineTo(x, cy + y);
            }
            ctx.stroke();
        };

        const draw = () => {
            const W = canvas.width  / (window.devicePixelRatio || 1);
            const H = canvas.height / (window.devicePixelRatio || 1);
            ctx.clearRect(0, 0, W, H);

            if (isActiveRef.current) {
                // Live animated waveform
                const t = (Date.now() - t0Ref.current) * 0.001;
                drawWave(t, 0.92, 1.0);
            } else {
                // Standby: frozen snapshot at a fixed t with reduced amplitude + opacity
                drawWave(3.6, 0.28, 0.45);
            }

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
