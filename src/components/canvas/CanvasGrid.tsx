
import React, { useEffect, useState } from 'react';

interface CanvasGridProps {
    zoom: number;
    containerRef: React.RefObject<HTMLDivElement>;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({ zoom, containerRef }) => {
    const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            setScrollPos({
                x: container.scrollLeft,
                y: container.scrollTop
            });
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        // Initial sync
        handleScroll();

        return () => container.removeEventListener('scroll', handleScroll);
    }, [containerRef]);

    // Calculate grid visual size based on zoom
    const gridSize = 32 * zoom; // Slightly larger grid for better aesthetics

    // Position dots based on scroll
    const bgPositionX = -scrollPos.x;
    const bgPositionY = -scrollPos.y;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[1]"
            style={{
                backgroundImage: `radial-gradient(circle, var(--grid-dot) 1.5px, transparent 1.5px)`,
                backgroundSize: `${gridSize}px ${gridSize}px`,
                backgroundPosition: `${bgPositionX}px ${bgPositionY}px`,
                opacity: 0.25,
                willChange: 'background-position'
            }}
        />
    );
};
