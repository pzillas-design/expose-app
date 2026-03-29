import React from 'react';

export type VoiceUiState = 'off' | 'starting' | 'greeting' | 'listening' | 'thinking' | 'speaking' | 'error';

interface VoiceModeIndicatorProps {
    active: boolean;
    state: VoiceUiState;
    level: number;
}

export const VoiceModeIndicator: React.FC<VoiceModeIndicatorProps> = ({ active, state, level }) => {
    const normalizedLevel = Math.max(0, Math.min(1, level));

    const isAgentActive = state === 'speaking' || state === 'thinking' || state === 'greeting';

    const spread = (() => {
        if (state === 'speaking') return 80 + normalizedLevel * 160;
        if (state === 'thinking') return 60;
        if (state === 'greeting') return 100;
        return 0;
    })();

    const glowOpacity = (() => {
        if (state === 'speaking') return 0.3 + normalizedLevel * 0.4;
        if (state === 'thinking') return 0.2;
        if (state === 'greeting') return 0.35;
        return 0;
    })();

    return (
        <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 top-0 overflow-hidden flex justify-center transition-opacity duration-700 ${active && isAgentActive ? 'opacity-100' : 'opacity-0'}`}
            style={{ height: '320px' }} // Large enough to never clip the blur
        >
            {/* Multi-layered glow for depth */}
            <div
                className={`absolute left-1/2 -translate-x-1/2 transition-all duration-300 ${state === 'thinking' ? 'animate-pulse' : ''}`}
                style={{
                    top: `${-spread * 0.4}px`,
                    width: `${spread * 3.5}px`,
                    height: `${spread * 0.8}px`,
                    borderRadius: '50%',
                    background: `radial-gradient(ellipse at center, 
                        rgba(251, 146, 60, ${glowOpacity}) 0%, 
                        rgba(249, 115, 22, ${glowOpacity * 0.7}) 25%, 
                        rgba(234, 88, 12, ${glowOpacity * 0.3}) 50%, 
                        rgba(220, 38, 38, ${glowOpacity * 0.1}) 75%, 
                        transparent 100%)`,
                    filter: `blur(${Math.max(12, spread * 0.15)}px)`,
                    opacity: active && isAgentActive ? 1 : 0,
                    transform: `translateX(-50%) scale(${state === 'speaking' ? 1 + normalizedLevel * 0.1 : 1})`,
                }}
            />

            {/* Core highlight line */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[1.5px] rounded-full blur-[0.5px]"
                style={{
                    width: `${Math.min(spread * 2.2, 600)}px`,
                    background: `linear-gradient(90deg, 
                        transparent 0%, 
                        rgba(220, 38, 38, 0) 10%, 
                        rgba(220, 38, 38, ${glowOpacity * 0.4}) 30%, 
                        rgba(251, 146, 60, ${glowOpacity * 0.9}) 50%, 
                        rgba(220, 38, 38, ${glowOpacity * 0.4}) 70%, 
                        rgba(220, 38, 38, 0) 90%, 
                        transparent 100%)`,
                    transition: 'width 0.3s cubic-bezier(0.2, 0, 0, 1), background 0.3s',
                    opacity: active && isAgentActive ? 1 : 0,
                }}
            />
        </div>
    );
};
