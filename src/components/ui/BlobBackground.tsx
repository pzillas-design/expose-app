import React from 'react';

/**
 * BlobBackground — Minimal fallback for generating placeholders when no
 * parent image is available. A single very slow diagonal sheen sweeps across
 * a neutral tile (the outer container provides the base grey). 6-second cycle,
 * low opacity — deliberately hard to notice so it doesn't compete with the
 * centered progress bar or distract across many parallel placeholders.
 */

const STYLES = `
@keyframes blob-sheen-slide {
    0%   { background-position: 200% 0; }
    100% { background-position: -100% 0; }
}
@keyframes blob-fadein {
    from { opacity: 0; }
    to   { opacity: 1; }
}
.blob-sheen-layer {
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg,
        transparent 0%,
        transparent 30%,
        rgba(0, 0, 0, 0.05) 50%,
        transparent 70%,
        transparent 100%);
    background-size: 300% 100%;
    animation: blob-sheen-slide 6s linear infinite;
}
.dark .blob-sheen-layer {
    background: linear-gradient(100deg,
        transparent 0%,
        transparent 30%,
        rgba(255, 255, 255, 0.07) 50%,
        transparent 70%,
        transparent 100%);
    background-size: 300% 100%;
}
`;

export const BlobBackground: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div
            className={`absolute inset-0 overflow-hidden${className ? ` ${className}` : ''}`}
            style={{ animation: 'blob-fadein 0.6s ease-out both' }}
        >
            <style>{STYLES}</style>
            <div className="blob-sheen-layer" />
        </div>
    );
};
