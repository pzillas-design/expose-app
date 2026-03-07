import { useEffect, useState, useCallback } from 'react';

interface UseKeyboardGridNavigationProps {
    itemCount: number;
    columns: number;
    isActive: boolean;
    onEnter?: (index: number) => void;
    onDelete?: (index: number) => void;
    onEscape?: () => void;
}

export function useKeyboardGridNavigation({
    itemCount,
    columns,
    isActive,
    onEnter,
    onDelete,
    onEscape,
}: UseKeyboardGridNavigationProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    // Reset focus when not active or items change drastically
    useEffect(() => {
        if (!isActive || itemCount === 0) {
            setActiveIndex(null);
        }
    }, [isActive, itemCount]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!isActive || itemCount === 0) return;

            switch (e.key) {
                case 'ArrowRight':
                    e.preventDefault();
                    setActiveIndex((prev) => (prev === null ? 0 : Math.min(prev + 1, itemCount - 1)));
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    setActiveIndex((prev) => (prev === null ? 0 : Math.max(prev - 1, 0)));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setActiveIndex((prev) => {
                        if (prev === null) return 0;
                        const next = prev + columns;
                        return next < itemCount ? next : prev;
                    });
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setActiveIndex((prev) => {
                        if (prev === null) return 0;
                        const next = prev - columns;
                        return next >= 0 ? next : prev;
                    });
                    break;
                case 'Enter':
                    if (activeIndex !== null && onEnter) {
                        e.preventDefault();
                        onEnter(activeIndex);
                    }
                    break;
                case 'Backspace':
                case 'Delete':
                    if (activeIndex !== null && onDelete) {
                        e.preventDefault();
                        onDelete(activeIndex);
                    }
                    break;
                case 'Escape':
                    if (onEscape) {
                        e.preventDefault();
                        onEscape();
                        setActiveIndex(null);
                    }
                    break;
            }
        },
        [isActive, itemCount, columns, activeIndex, onEnter, onDelete, onEscape]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return { activeIndex, setActiveIndex };
}
