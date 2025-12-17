
import { useState, useEffect } from 'react';

type Direction = 'width' | 'height';

interface UseResizableProps {
  initialSize: number;
  min: number;
  max: number;
  direction: Direction;
  reverse?: boolean; // For resizing from right-to-left or bottom-to-top
}

export const useResizable = ({ initialSize, min, max, direction, reverse = false }: UseResizableProps) => {
  const [size, setSize] = useState(initialSize);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      let newSize = size;
      
      if (direction === 'width') {
         // If reverse (e.g. right sidebar), resizing moves left, so we subtract from window width
         newSize = reverse ? window.innerWidth - e.clientX : e.clientX;
      } else {
         // If reverse (e.g. bottom sheet), resizing moves up
         newSize = reverse ? window.innerHeight - e.clientY : e.clientY;
      }

      if (newSize > min && newSize < max) {
        setSize(newSize);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = direction === 'width' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, direction, reverse, min, max, size]);

  const startResizing = () => setIsResizing(true);

  return { size, setSize, isResizing, startResizing };
};
