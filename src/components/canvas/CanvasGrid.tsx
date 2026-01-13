
import React, { useEffect, useState } from 'react';

interface CanvasGridProps {
    zoom: number;
    containerRef?: React.RefObject<HTMLDivElement>;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({ zoom, containerRef }) => {
    const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!containerRef?.current) return;
        const container = containerRef.current;

        const handleScroll = () => {
            setScrollPos({
                x: container.scrollLeft,
                y: container.scrollTop
            });
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => container.removeEventListener('scroll', handleScroll);
    }, [containerRef]);

    // Calculate grid visual size based on zoom (20% tighter: 32 * 0.8 = 25.6)
    const gridSize = 25.5 * zoom;

    // Position dots based on scroll
    const bgPositionX = -scrollPos.x;
    const bgPositionY = -scrollPos.y;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[1]"
            style={{
                backgroundImage: `radial-gradient(circle, var(--grid-dot) 1px, transparent 1px)`,
                backgroundSize: `${gridSize}px ${gridSize}px`,
                backgroundPosition: `${bgPositionX}px ${bgPositionY}px`,
                opacity: 0.22,
                willChange: 'background-position'
            }}
        />
    );
};
