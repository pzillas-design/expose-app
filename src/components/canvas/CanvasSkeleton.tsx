
import React from 'react';
import { Theme, Typo } from '../ui/DesignSystem';

interface CanvasSkeletonProps {
    zoom: number;
}

export const CanvasSkeleton: React.FC<CanvasSkeletonProps> = ({ zoom }) => {
    // Generate some mock rows and items
    const skeletonRows = [1, 2, 3];
    const itemsPerRow = [3, 2, 4];

    return (
        <div
            className="min-w-full min-h-full w-max h-max flex flex-col items-start z-10 relative pointer-events-none"
            style={{
                padding: '50vh 50vw',
                gap: `${12 * zoom}rem`
            }}
        >
            {skeletonRows.map((rowIdx, i) => (
                <div key={rowIdx} className="flex flex-col shrink-0">
                    {/* Mock Title */}
                    <div className="h-7 mb-2 w-32 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />

                    <div className="flex items-center" style={{ gap: `${3 * zoom}rem` }}>
                        {Array.from({ length: itemsPerRow[i % itemsPerRow.length] }).map((_, j) => {
                            const width = (400 + (j % 3) * 100) * zoom;
                            const height = 512 * zoom;
                            const isActiveRow = i === 0 && j === 0; // Mock first item as active

                            return (
                                <div key={j} className="relative flex flex-col items-center">
                                    <div
                                        className={`relative shrink-0 overflow-hidden ${Theme.Colors.PanelBg} rounded-md border border-zinc-100 dark:border-zinc-800`}
                                        style={{ width, height }}
                                    >
                                        <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800/50 animate-pulse">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 animate-[shimmer_2s_infinite] -translate-x-full" />
                                        </div>
                                    </div>

                                    {/* Mock Navigation Buttons for Active Skeleton Item */}
                                    {isActiveRow && zoom > 0.4 && (
                                        <div className="absolute -bottom-14 flex items-center justify-center gap-2 px-0.5 animate-pulse">
                                            <div className={`h-9 w-9 bg-zinc-100 dark:bg-zinc-800 rounded-lg border ${Theme.Colors.Border}`} />
                                            <div className={`h-9 w-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg border ${Theme.Colors.Border}`} />
                                            <div className={`h-9 w-9 bg-zinc-100 dark:bg-zinc-800 rounded-lg border ${Theme.Colors.Border}`} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
