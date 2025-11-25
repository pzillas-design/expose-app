import React from 'react';

interface CanvasGridProps {
  zoom: number;
  scrollPos: { x: number; y: number };
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({ zoom, scrollPos }) => {
  // Calculate grid visual size based on zoom
  const gridSize = 24 * zoom; // Smaller grid size for dots
  
  const bgPositionX = -scrollPos.x;
  const bgPositionY = -scrollPos.y;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        backgroundImage: `radial-gradient(#444 1.5px, transparent 1.5px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${bgPositionX}px ${bgPositionY}px`,
        opacity: 0.15, // Very subtle
      }}
    />
  );
};