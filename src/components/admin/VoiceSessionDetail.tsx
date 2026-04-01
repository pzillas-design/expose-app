import React from 'react';
import { X, Mic, MessageSquare, Wrench } from 'lucide-react';

// ─── Tool summary helpers (shared with AdminVoiceView) ──────────────────────

function toolSummary(name: string, args: Record<string, any> | null, message: string): string {
    if (!args) return message || name;
    switch (name) {
        case 'select_variable_option': return `${args.label} → ${args.option}`;
        case 'create_variables': {
            const labels = (args.controls as any[])?.map(c => c.label).join(', ');
            return labels ? `Variablen: ${labels}` : 'Variablen erstellt';
        }
        case 'set_prompt_text': {
            const text = String(args.text || '').slice(0, 60);
            return text ? `"${text}${String(args.text || '').length > 60 ? '…' : ''}"` : 'Prompt gesetzt';
        }
        case 'select_image_by_index': return `Bild #${args.index}`;
        case 'select_image_by_position': return `Reihe ${args.row}, Spalte ${args.column}`;
        case 'set_aspect_ratio': return args.ratio || '';
        case 'set_quality': return args.quality?.toUpperCase() || '';
        case 'apply_preset': return args.title || '';
        default: return message || '';
    }
}

function toolIcon(name: string): string {
    if (name.startsWith('select_variable') || name === 'create_variables') return '⚙';
    if (name === 'set_prompt_text') return '✏️';
    if (name === 'trigger_generation') return '▶';
    if (name.includes('image') || name.includes('stack') || name === 'go_back') return '↔';
    if (name.includes('visual_context')) return '📷';
    if (name === 'get_app_context') return '🔍';
    return '⚡';
}

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Tool chip (inline, expandable) ─────────────────────────────────────────

const ToolChip: React.FC<{ entry: any }> = ({ entry }) => {
    const [open, setOpen] = React.useState(false);
    let args: Record<string, any> | null = null;
    try { args = entry.args_summary && entry.args_summary !== '{}' ? JSON.parse(entry.args_summary) : null; } catch { /* raw */ }

    const summary = toolSummary(entry.tool_name, args, entry.result_message || '');
    const icon = toolIcon(entry.tool_name || '');
    const isError = entry.tool_status !== 'ok';
    const isVisualSync = (entry.tool_name || '').includes('visual_context');

    return (
        <div className="flex justify-center py-0.5 w-full">
            <div className="w-full max-w-md">
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    className={`w-full flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] transition-all ${
                        isError
                            ? 'bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400'
                            : isVisualSync
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-500 dark:text-emerald-500'
                                : 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
                    }`}
                >
                    <span className="shrink-0">{icon}</span>
                    <span className="font-medium truncate">{summary || entry.tool_name}</span>
                    <span className="ml-auto tabular-nums text-[10px] opacity-50 shrink-0">{formatTime(entry.ts)}</span>
                </button>

                {open && (
                    <div className="mx-1 mt-0.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 px-3 py-2 text-[11px] space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-zinc-400">{entry.tool_name}</span>
                            <span className={`ml-auto text-[10px] font-semibold ${isError ? 'text-red-500' : 'text-emerald-500'}`}>{entry.tool_status}</span>
                        </div>
                        {args && Object.keys(args).length > 0 && (
                            <div className="font-mono text-zinc-500 dark:text-zinc-400 space-y-0.5">
                                {Object.entries(args).map(([k, v]) => (
                                    <div key={k}><span className="text-zinc-400">{k}:</span> <span className="text-zinc-600 dark:text-zinc-300">{typeof v === 'string' ? v : JSON.stringify(v)}</span></div>
                                ))}
                            </div>
                        )}
                        {entry.result_message && (
                            <div className={`text-[11px] ${isError ? 'text-red-500' : 'text-zinc-500'}`}>→ {entry.result_message}</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Session chat view ──────────────────────────────────────────────────────

interface VoiceSessionDetailProps {
    session: any;
    onClose: () => void;
    variant?: 'sidebar' | 'page';
}

export const VoiceSessionDetail: React.FC<VoiceSessionDetailProps> = ({ session, onClose, variant = 'sidebar' }) => {
    const chatRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [session?.entries?.length]);

    const entries: any[] = session?.entries || [];
    const durationSec = Math.round((session.durationMs || 0) / 1000);
    const durationLabel = durationSec < 60 ? `${durationSec}s` : `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`;

    return (
        <div className={`flex flex-col h-full ${variant === 'page' ? '' : ''}`}>
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Voice-Session</div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                        <span>{new Date(session.createdAt).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>·</span>
                        <span>{durationLabel}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{session.messageCount}</span>
                        <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{session.toolCount}</span>
                    </div>
                </div>
                <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <X className="w-4 h-4 text-zinc-400" />
                </button>
            </div>

            {/* Chat */}
            <div ref={chatRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {entries.map((entry: any, i: number) => {
                    if (entry.kind === 'transcript') {
                        const isUser = entry.source === 'user';
                        return (
                            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                <div className="max-w-[80%]">
                                    <div className={`text-[10px] font-medium mb-0.5 text-zinc-400 ${isUser ? 'text-right' : ''}`}>
                                        {isUser ? 'Du' : 'Exposé'} · {formatTime(entry.ts)}
                                    </div>
                                    <div className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                                        isUser
                                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-tr-sm'
                                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-tl-sm'
                                    }`}>
                                        {entry.text}
                                    </div>
                                </div>
                            </div>
                        );
                    } else if (entry.kind === 'tool_call') {
                        return <ToolChip key={i} entry={entry} />;
                    }
                    return null;
                })}
            </div>
        </div>
    );
};
