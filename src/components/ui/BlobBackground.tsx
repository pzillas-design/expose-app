import React from 'react';

/**
 * BlobBackground — Diagonal swoosh lines sweep across the placeholder
 * to indicate generation activity. Clean, minimal, non-distracting.
 */

const SWIPE_KEYFRAMES = `
@keyframes swipe-across {
  0%   { transform: translateX(-160%) skewX(-20deg); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateX(260%) skewX(-20deg); opacity: 0; }
}
@keyframes swoosh-fadein {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`;

export const BlobBackground: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div
            className={`absolute inset-0 overflow-hidden${className ? ` ${className}` : ''}`}
            style={{ animation: 'swoosh-fadein 0.6s ease-out both' }}
        >
            <style>{SWIPE_KEYFRAMES}</style>

            {/* Line 1 — primary */}
            <div
                className="absolute inset-y-0"
                style={{
                    left: 0, right: 0,
                    animation: 'swipe-across 2.4s ease-in-out infinite',
                    animationDelay: '0s',
                }}
            >
                <div style={{
                    position: 'absolute',
                    top: 0, bottom: 0,
                    left: '48%', width: '4%',
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.10) 70%, transparent 100%)',
                }} />
            </div>

            {/* Line 2 — slightly offset, thinner */}
            <div
                className="absolute inset-y-0"
                style={{
                    left: 0, right: 0,
                    animation: 'swipe-across 2.4s ease-in-out infinite',
                    animationDelay: '0.18s',
                }}
            >
                <div style={{
                    position: 'absolute',
                    top: 0, bottom: 0,
                    left: '50%', width: '2%',
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 70%, transparent 100%)',
                }} />
            </div>

            {/* Repeat with longer delay */}
            <div
                className="absolute inset-y-0"
                style={{
                    left: 0, right: 0,
                    animation: 'swipe-across 2.4s ease-in-out infinite',
                    animationDelay: '1.4s',
                }}
            >
                <div style={{
                    position: 'absolute',
                    top: 0, bottom: 0,
                    left: '48%', width: '4%',
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.08) 70%, transparent 100%)',
                }} />
            </div>
        </div>
    );
};
