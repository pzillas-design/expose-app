import React from 'react';
import { Square, RotateCcw } from 'lucide-react';

export type VoiceUiState = 'off' | 'starting' | 'greeting' | 'listening' | 'thinking' | 'speaking' | 'error';

interface VoiceModeIndicatorProps {
    active: boolean;
    state: VoiceUiState;
    level: number;
    error?: string | null;
    onStop?: () => void;
    onRetry?: () => void;
    /** Match hero header sizing when not scrolled */
    large?: boolean;
}

const BAR_COUNT = 5;

export const VoiceModeIndicator: React.FC<VoiceModeIndicatorProps> = ({ active, state, level, error, onStop, onRetry, large = false }) => {
    if (!active || state === 'off') return null;

    const isError = state === 'error';
    const isSpeaking = state === 'speaking';
    const isThinking = state === 'thinking' || state === 'greeting' || state === 'starting';
    const isListening = state === 'listening';

    // Generate bar heights based on state and level
    const getBarHeight = (index: number): number => {
        if (isSpeaking) {
            // Responsive to voice level — each bar has a slightly different base
            const offsets = [0.3, 0.7, 1.0, 0.6, 0.4];
            return 0.2 + (level * 0.8 * offsets[index]);
        }
        if (isListening) {
            // Low idle shimmer
            return 0.15 + 0.1 * Math.abs(Math.sin((index / BAR_COUNT) * Math.PI));
        }
        if (isThinking) {
            // Medium animated pulse (CSS animation handles it)
            return 0.4;
        }
        return 0.2;
    };

    const h = large ? 'h-10' : 'h-9';
    const btnSize = large ? 'h-10 w-10' : 'h-9 w-9';
    const barH = large ? 16 : 14;

    // Error state: red pill with retry button
    if (isError) {
        return (
            <div className={`flex items-center gap-1.5 bg-red-500 text-white rounded-full pl-3 pr-0 ${h} text-xs font-medium animate-[pill-in_0.28s_cubic-bezier(0.34,1.3,0.64,1)_forwards] origin-right shrink-0`}>
                <span className="truncate max-w-[140px]">{error || 'Verbindungsfehler'}</span>
                {onRetry && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRetry(); }}
                        className={`${btnSize} flex items-center justify-center rounded-full hover:bg-red-600 transition-colors shrink-0`}
                        aria-label="Retry voice mode"
                    >
                        <RotateCcw className="w-3 h-3" />
                    </button>
                )}
                {onStop && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onStop(); }}
                        className={`${btnSize} flex items-center justify-center rounded-full hover:bg-red-600 transition-colors shrink-0`}
                        aria-label="Stop voice mode"
                    >
                        <Square className="w-2.5 h-2.5 fill-current" />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-1.5 bg-orange-500 text-white rounded-full pl-3 pr-0 ${h} text-xs font-medium animate-[pill-in_0.28s_cubic-bezier(0.34,1.3,0.64,1)_forwards] origin-right shrink-0`}>
            {/* Waveform bars */}
            <div className="flex items-center gap-[3px]" style={{ height: barH }}>
                {Array.from({ length: BAR_COUNT }).map((_, i) => {
                    const fraction = getBarHeight(i);
                    const barPx = Math.max(2, Math.round(fraction * barH));

                    return (
                        <div
                            key={i}
                            className={`w-[2.5px] rounded-full bg-white/90 transition-all ${
                                isThinking ? 'animate-voice-bar' : 'duration-100'
                            }`}
                            style={{
                                height: isThinking ? undefined : barPx,
                                animationDelay: isThinking ? `${i * 120}ms` : undefined,
                            }}
                        />
                    );
                })}
            </div>

            {/* Stop button — full pill height for easy tapping */}
            {onStop && (
                <button
                    onClick={(e) => { e.stopPropagation(); onStop(); }}
                    className={`${btnSize} flex items-center justify-center rounded-full hover:bg-orange-600 transition-colors shrink-0`}
                    aria-label="Stop voice mode"
                >
                    <Square className="w-2.5 h-2.5 fill-current" />
                </button>
            )}
        </div>
    );
};
