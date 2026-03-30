import React from 'react';
import { Square } from 'lucide-react';

export type VoiceUiState = 'off' | 'starting' | 'greeting' | 'listening' | 'thinking' | 'speaking' | 'error';

interface VoiceModeIndicatorProps {
    active: boolean;
    state: VoiceUiState;
    level: number;
    onStop?: () => void;
}

export const VoiceModeIndicator: React.FC<VoiceModeIndicatorProps> = ({ active, state, onStop }) => {
    if (!active || state === 'off') return null;

    const isPulsing = state === 'speaking' || state === 'thinking' || state === 'greeting';

    return (
        <div className="flex items-center gap-1.5 bg-orange-500 text-white rounded-full pl-2.5 pr-1.5 py-1 text-xs font-medium animate-in fade-in duration-200 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full bg-white shrink-0 ${isPulsing ? 'animate-pulse' : ''}`} />
            <span className="leading-none">Live</span>
            {onStop && (
                <button
                    onClick={(e) => { e.stopPropagation(); onStop(); }}
                    className="ml-0.5 p-0.5 rounded-full hover:bg-orange-600 transition-colors"
                    aria-label="Stop voice mode"
                >
                    <Square className="w-2.5 h-2.5 fill-current" />
                </button>
            )}
        </div>
    );
};
