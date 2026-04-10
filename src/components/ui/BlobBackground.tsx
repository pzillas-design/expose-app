import React from 'react';

/**
 * BlobBackground — Simple CSS-only animated background for generation placeholders.
 * Three soft gradient circles drift slowly to show activity.
 * Replaces the complex canvas-based renderer.
 */

const BLOB_KEYFRAMES = `
@keyframes blob-drift-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(8%, -6%) scale(1.05); }
  66% { transform: translate(-5%, 8%) scale(0.95); }
}
@keyframes blob-drift-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-7%, 5%) scale(0.95); }
  66% { transform: translate(6%, -4%) scale(1.05); }
}
@keyframes blob-drift-3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(5%, 7%) scale(1.03); }
  66% { transform: translate(-8%, -5%) scale(0.97); }
}
@keyframes blob-fadein {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

export const BlobBackground: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div
            className={`absolute inset-0 overflow-hidden${className ? ` ${className}` : ''}`}
            style={{ animation: 'blob-fadein 1s ease-out both' }}
        >
            <style>{BLOB_KEYFRAMES}</style>
            {/* Zinc blob 1 */}
            <div
                className="absolute rounded-full"
                style={{
                    width: '60%', height: '60%',
                    top: '20%', left: '10%',
                    background: 'radial-gradient(circle, rgba(161,161,170,0.14) 0%, rgba(161,161,170,0) 70%)',
                    animation: 'blob-drift-1 8s ease-in-out infinite',
                }}
            />
            {/* Zinc blob 2 */}
            <div
                className="absolute rounded-full"
                style={{
                    width: '55%', height: '55%',
                    top: '30%', right: '5%',
                    background: 'radial-gradient(circle, rgba(161,161,170,0.10) 0%, rgba(161,161,170,0) 70%)',
                    animation: 'blob-drift-2 10s ease-in-out infinite',
                }}
            />
            {/* Zinc blob 3 */}
            <div
                className="absolute rounded-full"
                style={{
                    width: '45%', height: '45%',
                    bottom: '15%', left: '25%',
                    background: 'radial-gradient(circle, rgba(161,161,170,0.10) 0%, rgba(161,161,170,0) 70%)',
                    animation: 'blob-drift-3 12s ease-in-out infinite',
                }}
            />
        </div>
    );
};
