import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from its previous value to the new value
 * @param value The target value to animate to
 * @param duration Animation duration in milliseconds
 * @returns The current animated value
 */
export function useAnimatedCounter(value: number, duration: number = 800): number {
    const [displayValue, setDisplayValue] = useState(value);
    const prevValueRef = useRef(value);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        const startValue = prevValueRef.current;
        const endValue = value;
        const startTime = performance.now();

        // Only animate if value actually changed
        if (startValue === endValue) return;

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out-cubic for smooth deceleration)
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);

            const current = startValue + (endValue - startValue) * easeOutCubic;
            setDisplayValue(current);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                prevValueRef.current = endValue;
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [value, duration]);

    return displayValue;
}
