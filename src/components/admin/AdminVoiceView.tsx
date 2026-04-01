import React from 'react';
import { Check, ChevronRight, Eye, Loader2, MessageSquareText, RotateCcw, Settings2, Trash2, Wrench } from 'lucide-react';
import { AdminViewHeader } from './AdminViewHeader';
import { TranslationFunction, VoiceAdminConfig, VoiceDiagnostics, VoiceToolCallLog, VoiceTranscriptLog } from '@/types';
import { Input, TextArea } from '@/components/ui/DesignSystem';
import {
    DEFAULT_GREETING,
    DEFAULT_SYSTEM_PROMPT,
    DEFAULT_TOOL_DESCRIPTIONS,
    DEFAULT_VOICE_MODEL,
    DEFAULT_VOICE_NAME,
    GEMINI_LIVE_VOICES,
    updateVoiceAdminConfig,
} from '@/services/voiceAdminService';

interface AdminVoiceViewProps {
    t: TranslationFunction;
    config: VoiceAdminConfig;
    diagnostics: VoiceDiagnostics;
    onConfigChange: React.Dispatch<React.SetStateAction<VoiceAdminConfig>>;
    onClearLogs?: () => void;
}

function formatDate(ts: number) {
    const d = new Date(ts);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) {
        return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(ts);
    }
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ts);
}

function viewLevelLabel(level: string): string {
    return ({ gallery: 'Galerie', stack: 'Stapel', detail: 'Detail', create: 'Erstellen' } as Record<string, string>)[level] ?? level;
}

function parseCtxSnapshot(snapshot: string | undefined): Record<string, any> | null {
    if (!snapshot) return null;
    try { return JSON.parse(snapshot); } catch { return null; }
}

type FeedEntry =
    | { id: string; timestamp: number; kind: 'transcript'; entry: VoiceTranscriptLog }
    | { id: string; timestamp: number; kind: 'tool'; call: VoiceToolCallLog };

// ─── Chat detail for a tool call ────────────────────────────────────────────

const ToolCallDetail: React.FC<{ call: VoiceToolCallLog }> = ({ call }) => {
    const ctx = parseCtxSnapshot(call.contextSnapshot);
    let args: Record<string, any> | null = null;
    try { args = JSON.parse(call.argsSummary); } catch { /* ignore */ }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${call.status === 'ok' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100">{call.name}</span>
                <span className="ml-auto text-xs text-zinc-400">{formatDate(call.timestamp)}</span>
            </div>

            {args && Object.keys(args).length > 0 && (
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 px-4 py-3 space-y-1.5">
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Parameter</div>
                    {Object.entries(args).map(([k, v]) => (
                        <div key={k} className="flex items-start gap-3">
                            <span className="text-xs text-zinc-400 font-mono w-20 shrink-0 truncate">{k}</span>
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 font-mono">{JSON.stringify(v)}</span>
                        </div>
                    ))}
                </div>
            )}

            {call.message && (
                <div className={`rounded-xl px-4 py-3 ${call.status === 'ok' ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30' : 'bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30'}`}>
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Ergebnis</div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-200">{call.message}</p>
                </div>
            )}

            {ctx && (
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 px-4 py-3 space-y-3">
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Kontext zum Zeitpunkt des Aufrufs</div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${ctx.viewLevel === 'detail' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' : ctx.viewLevel === 'stack' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                            {viewLevelLabel(ctx.viewLevel)}
                        </span>
                        {ctx.imageCount != null && <span className="text-xs text-zinc-500">{ctx.imageCount} Bilder</span>}
                        {ctx.viewLevel === 'detail' && (
                            <span className={`text-xs ${ctx.detailHasPrompt ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
                                {ctx.detailHasPrompt ? 'Prompt vorhanden' : 'Kein Prompt'}
                            </span>
                        )}
                        {ctx.canOpenPresets && <span className="text-xs text-zinc-400">Presets verfügbar</span>}
                    </div>
                    {ctx.images && ctx.images.length > 0 && (
                        <div className="space-y-1">
                            <div className="text-[10px] text-zinc-400">{ctx.images.length} Bilder im Kontext</div>
                            <div className="space-y-0.5 max-h-24 overflow-y-auto">
                                {ctx.images.slice(0, 8).map((img: any, i: number) => (
                                    <div key={img.id || i} className="flex items-center gap-2 text-[11px] text-zinc-500">
                                        <span className="text-zinc-300 dark:text-zinc-600 font-mono w-5 shrink-0">#{i + 1}</span>
                                        <span className="truncate">{img.prompt || <span className="italic text-zinc-300 dark:text-zinc-600">kein Prompt</span>}</span>
                                    </div>
                                ))}
                                {ctx.images.length > 8 && <div className="text-[11px] text-zinc-400 italic">+{ctx.images.length - 8} weitere</div>}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Session grouping ────────────────────────────────────────────────────────

interface VoiceSession {
    sessionId: string;
    entries: FeedEntry[];
    startedAt: number;
    endedAt: number;
    messageCount: number;
    toolCount: number;
    firstUserMessage: string | null;
}

function groupSessions(feedEntries: FeedEntry[]): VoiceSession[] {
    const map = new Map<string, FeedEntry[]>();
    for (const e of feedEntries) {
        const sid = e.kind === 'transcript' ? e.entry.sessionId : e.call.sessionId;
        const key = sid || '__legacy__';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
    }
    return Array.from(map.entries())
        .map(([sessionId, entries]) => {
            const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
            const transcripts = sorted.filter(e => e.kind === 'transcript') as (FeedEntry & { kind: 'transcript' })[];
            const tools = sorted.filter(e => e.kind === 'tool') as (FeedEntry & { kind: 'tool' })[];
            const firstUser = transcripts.find(e => e.entry.source === 'user')?.entry.text ?? null;
            return {
                sessionId,
                entries: sorted,
                startedAt: sorted[0]?.timestamp ?? 0,
                endedAt: sorted[sorted.length - 1]?.timestamp ?? 0,
                messageCount: transcripts.length,
                toolCount: tools.length,
                firstUserMessage: firstUser,
            };
        })
        .sort((a, b) => b.startedAt - a.startedAt); // newest first
}

// ─── Tool action summary — human-readable one-liner per tool ────────────────

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

// ─── Expandable tool call chip ───────────────────────────────────────────────

const ToolChip: React.FC<{ call: VoiceToolCallLog }> = ({ call }) => {
    const [open, setOpen] = React.useState(false);
    let args: Record<string, any> | null = null;
    try { args = call.argsSummary && call.argsSummary !== '{}' ? JSON.parse(call.argsSummary) : null; } catch { /* raw */ }

    const summary = toolSummary(call.name, args, call.message);
    const icon = toolIcon(call.name);
    const isError = call.status !== 'ok';
    const isVisualSync = call.name.includes('visual_context');

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
                    <span className="font-medium truncate">{summary || call.name}</span>
                    <span className="ml-auto tabular-nums text-[10px] opacity-50 shrink-0">{formatDate(call.timestamp)}</span>
                </button>

                {open && (
                    <div className="mx-1 mt-0.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 px-3 py-2 text-[11px] space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-zinc-400">{call.name}</span>
                            <span className={`ml-auto text-[10px] font-semibold ${isError ? 'text-red-500' : 'text-emerald-500'}`}>{call.status}</span>
                        </div>
                        {args && Object.keys(args).length > 0 && (
                            <div className="font-mono text-zinc-500 dark:text-zinc-400 space-y-0.5">
                                {Object.entries(args).map(([k, v]) => (
                                    <div key={k}><span className="text-zinc-400">{k}:</span> <span className="text-zinc-600 dark:text-zinc-300">{typeof v === 'string' ? v : JSON.stringify(v)}</span></div>
                                ))}
                            </div>
                        )}
                        {call.message && (
                            <div className={`text-[11px] ${isError ? 'text-red-500' : 'text-zinc-500'}`}>→ {call.message}</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Chat view for one session ───────────────────────────────────────────────

const SessionChat: React.FC<{ entries: FeedEntry[] }> = ({ entries }) => {
    const chatRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [entries.length]);

    return (
        <div ref={chatRef} className="overflow-y-auto h-full px-6 py-5 space-y-2.5">
            {entries.map(entry => {
                if (entry.kind === 'transcript') {
                    const isUser = entry.entry.source === 'user';
                    return (
                        <div key={entry.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <div className="max-w-[78%]">
                                <div className={`text-[10px] font-medium mb-1 text-zinc-400 ${isUser ? 'text-right' : ''}`}>
                                    {isUser ? 'Du' : 'Exposé'} · {formatDate(entry.timestamp)}
                                </div>
                                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                    isUser
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-tr-sm'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-tl-sm'
                                }`}>
                                    {entry.entry.text}
                                </div>
                            </div>
                        </div>
                    );
                } else {
                    return <ToolChip key={entry.id} call={entry.call} />;
                }
            })}
        </div>
    );
};

// ─── Two-pane monitor feed ───────────────────────────────────────────────────

const MonitorFeed: React.FC<{ feedEntries: FeedEntry[] }> = ({ feedEntries }) => {
    const sessions = React.useMemo(() => groupSessions(feedEntries), [feedEntries]);
    const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);

    // Auto-select most recent session when sessions change
    React.useEffect(() => {
        if (sessions.length > 0) setSelectedSessionId(sessions[0].sessionId);
    }, [sessions.length]);

    const selectedSession = sessions.find(s => s.sessionId === selectedSessionId) ?? null;

    if (feedEntries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center p-6">
                <MessageSquareText className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm text-zinc-400">Noch keine Aktivität</p>
                <p className="text-xs text-zinc-300 dark:text-zinc-600">Starte eine Voice-Session um Logs zu sehen</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] min-h-[420px]">

            {/* ── Left: session list ── */}
            <div className="border-b lg:border-b-0 lg:border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto max-h-[500px]">
                {sessions.map(session => {
                    const isSelected = session.sessionId === selectedSessionId;
                    const durationSec = Math.round((session.endedAt - session.startedAt) / 1000);
                    const durationLabel = durationSec < 60
                        ? `${durationSec}s`
                        : `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`;
                    return (
                        <button
                            key={session.sessionId}
                            type="button"
                            onClick={() => setSelectedSessionId(session.sessionId)}
                            className={`w-full text-left px-4 py-3.5 border-b border-zinc-50 dark:border-zinc-800/60 last:border-0 transition-colors ${
                                isSelected ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                            }`}
                        >
                            <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 mb-0.5 tabular-nums">
                                {formatDate(session.startedAt)}
                            </div>
                            {session.firstUserMessage && (
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate leading-snug mb-1.5">
                                    {session.firstUserMessage}
                                </p>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {session.messageCount > 0 && (
                                    <span className="text-[10px] text-zinc-400">
                                        {session.messageCount} Msg
                                    </span>
                                )}
                                {session.toolCount > 0 && (
                                    <>
                                        <span className="text-zinc-200 dark:text-zinc-700">·</span>
                                        <span className="text-[10px] text-zinc-400">
                                            {session.toolCount} Tools
                                        </span>
                                    </>
                                )}
                                {durationSec > 1 && (
                                    <>
                                        <span className="text-zinc-200 dark:text-zinc-700">·</span>
                                        <span className="text-[10px] text-zinc-400">{durationLabel}</span>
                                    </>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ── Right: chat content ── */}
            <div className="max-h-[500px] overflow-hidden flex flex-col">
                {selectedSession ? (
                    <SessionChat entries={selectedSession.entries} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-6">
                        <Wrench className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />
                        <p className="text-sm text-zinc-400">Gespräch auswählen</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Shared sub-components ───────────────────────────────────────────────────

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}
    >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; noPadding?: boolean }> = ({
    title, icon, children, noPadding,
}) => (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2.5">
            <span className="text-zinc-400">{icon}</span>
            <h3 className="text-sm font-semibold flex-1 text-zinc-800 dark:text-zinc-200">{title}</h3>
        </div>
        <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
);

const FeatureRow = ({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: () => void }) => (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
        <div className="min-w-0">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</div>
            <div className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-sm">{hint}</div>
        </div>
        <Toggle checked={checked} onChange={onChange} />
    </div>
);

type SaveState = 'idle' | 'saving' | 'saved';

// ─── Main view ───────────────────────────────────────────────────────────────

export const AdminVoiceView: React.FC<AdminVoiceViewProps> = ({ t, config, diagnostics, onConfigChange, onClearLogs }) => {
    const enabledToolCount = config.tools.filter(tool => tool.enabled).length;
    const [selectedTool, setSelectedTool] = React.useState<string | null>(config.tools[0]?.name ?? null);
    // liveTab removed — Agent-Kontext tab merged into Verlauf header badges
    const [saveState, setSaveState] = React.useState<SaveState>('idle');

    const updateConfig = React.useCallback((updater: (c: VoiceAdminConfig) => VoiceAdminConfig) => {
        onConfigChange(c => updater(c));
        setSaveState('idle');
    }, [onConfigChange]);

    const handleSave = React.useCallback(async () => {
        setSaveState('saving');
        try {
            await updateVoiceAdminConfig(config);
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 2000);
        } catch {
            setSaveState('idle');
        }
    }, [config]);

    const feedEntries = React.useMemo((): FeedEntry[] => {
        const entries: FeedEntry[] = [
            ...diagnostics.toolCalls.map(c => ({ id: c.id, timestamp: c.timestamp, kind: 'tool' as const, call: c })),
            ...diagnostics.transcripts.map(e => ({ id: e.id, timestamp: e.timestamp, kind: 'transcript' as const, entry: e })),
        ];
        return entries.sort((a, b) => a.timestamp - b.timestamp);
    }, [diagnostics.toolCalls, diagnostics.transcripts]);

    const selectedToolData = config.tools.find(t => t.name === selectedTool) ?? null;
    const selectedToolDesc = selectedToolData?.description ?? DEFAULT_TOOL_DESCRIPTIONS[selectedTool ?? ''] ?? '';
    const selectedToolIsDefault = !selectedToolData?.description;

    const headerActions = (
        <div className="flex items-center gap-3">
            {diagnostics.sessionModel && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {diagnostics.sessionModel}
                </div>
            )}
            <button
                type="button"
                onClick={handleSave}
                disabled={saveState === 'saving'}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${saveState === 'saved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
            >
                {saveState === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
                {saveState === 'saved' && <Check className="w-3 h-3" />}
                {saveState === 'saved' ? 'Gespeichert' : 'Speichern'}
            </button>
        </div>
    );

    return (
        <div className="flex flex-col min-h-0">
            <AdminViewHeader
                title="Voice Assistant"
                description="Kommandozentrale für den KI-Sprachassistenten"
                actions={headerActions}
            />

            <div className="px-6 md:px-8 py-6 space-y-6">

                {/* Row 1: Konfiguration + Prompt (2-col on xl) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                    {/* Konfiguration */}
                    <Section title="Konfiguration" icon={<Settings2 className="w-4 h-4" />}>
                        <div className="space-y-6">
                            <div className="flex items-start justify-between gap-6 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                                <div>
                                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Voice aktivieren</div>
                                    <div className="text-xs text-zinc-400 mt-1 max-w-xs">Blendet den Mikrofon-Button ein und erlaubt den Start einer Voice-Session</div>
                                </div>
                                <Toggle checked={config.enabled} onChange={() => updateConfig(c => ({ ...c, enabled: !c.enabled }))} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="block space-y-2">
                                    <span className="text-xs font-semibold text-zinc-500">Modell</span>
                                    <Input value={config.model} onChange={(e) => updateConfig(c => ({ ...c, model: e.target.value }))} placeholder={DEFAULT_VOICE_MODEL} />
                                </label>
                                <label className="block space-y-2">
                                    <span className="text-xs font-semibold text-zinc-500">Stimme</span>
                                    <select
                                        value={config.voiceName}
                                        onChange={(e) => updateConfig(c => ({ ...c, voiceName: e.target.value }))}
                                        className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                                    >
                                        {GEMINI_LIVE_VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                                        {!GEMINI_LIVE_VOICES.includes(config.voiceName as any) && (
                                            <option value={config.voiceName}>{config.voiceName} (custom)</option>
                                        )}
                                    </select>
                                </label>
                            </div>

                            <div>
                                <FeatureRow
                                    label="Nutzer-Transkript"
                                    hint="Zeigt gesprochenen Text des Nutzers im Live-Monitor an"
                                    checked={config.inputTranscriptionEnabled}
                                    onChange={() => updateConfig(c => ({ ...c, inputTranscriptionEnabled: !c.inputTranscriptionEnabled }))}
                                />
                                <FeatureRow
                                    label="KI-Antworttext"
                                    hint="Transkribiert KI-Antworten als Text — erscheint unter Gespräch"
                                    checked={config.outputTranscriptionEnabled}
                                    onChange={() => updateConfig(c => ({ ...c, outputTranscriptionEnabled: !c.outputTranscriptionEnabled }))}
                                />
                                <FeatureRow
                                    label="Bilder an KI senden"
                                    hint="Sendet Thumbnails der aktuell sichtbaren Bilder — kein UI-Screenshot, nur Bildinhalte. Detail: 1 Bild, Galerie: bis zu 4."
                                    checked={config.visualContextEnabled}
                                    onChange={() => updateConfig(c => ({ ...c, visualContextEnabled: !c.visualContextEnabled }))}
                                />
                            </div>

                            {!GEMINI_LIVE_VOICES.includes(config.voiceName as any) && (
                                <label className="block space-y-2">
                                    <span className="text-xs font-semibold text-zinc-500">Benutzerdefinierte Stimme</span>
                                    <Input value={config.voiceName} onChange={(e) => updateConfig(c => ({ ...c, voiceName: e.target.value }))} placeholder={DEFAULT_VOICE_NAME} />
                                </label>
                            )}

                            {/* Temperature */}
                            <label className="block space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-zinc-500">Temperature</span>
                                    <span className="text-xs text-zinc-400 tabular-nums">{config.temperature ?? 1.1}</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    value={config.temperature ?? 1.1}
                                    onChange={(e) => updateConfig(c => ({ ...c, temperature: parseFloat(e.target.value) }))}
                                    className="w-full accent-orange-500"
                                />
                                <div className="flex justify-between text-[10px] text-zinc-400">
                                    <span>Präzise (0)</span>
                                    <span>Kreativ (2)</span>
                                </div>
                            </label>

                            {/* Thinking Level */}
                            <label className="block space-y-2">
                                <span className="text-xs font-semibold text-zinc-500">Thinking Level</span>
                                <select
                                    value={config.thinkingLevel ?? 'minimal'}
                                    onChange={(e) => updateConfig(c => ({ ...c, thinkingLevel: e.target.value as any }))}
                                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                                >
                                    <option value="none">None — kein Denken</option>
                                    <option value="minimal">Minimal — schnell, wenig Selbstkontrolle (default)</option>
                                    <option value="low">Low — etwas mehr Nachdenken</option>
                                    <option value="medium">Medium — ausbalanciert</option>
                                    <option value="high">High — gründlich, langsamer</option>
                                </select>
                            </label>
                        </div>
                    </Section>

                    {/* Prompt & Begrüßung */}
                    <Section title="Prompt & Begrüßung" icon={<MessageSquareText className="w-4 h-4" />}>
                        <div className="space-y-5">
                            <div className="text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3 leading-relaxed">
                                Die Sprache wird automatisch erkannt — ein Prompt reicht für DE und EN.
                            </div>
                            <label className="block space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-zinc-500">System Prompt</span>
                                    {config.systemPrompt !== DEFAULT_SYSTEM_PROMPT && (
                                        <button type="button" onClick={() => updateConfig(c => ({ ...c, systemPrompt: DEFAULT_SYSTEM_PROMPT }))} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                                            <RotateCcw className="w-3 h-3" /> Reset
                                        </button>
                                    )}
                                </div>
                                <TextArea rows={8} value={config.systemPrompt} onChange={(e) => updateConfig(c => ({ ...c, systemPrompt: e.target.value }))} placeholder={DEFAULT_SYSTEM_PROMPT} />
                            </label>
                            <label className="block space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-zinc-500">Begrüßung</span>
                                    {config.greeting !== DEFAULT_GREETING && (
                                        <button type="button" onClick={() => updateConfig(c => ({ ...c, greeting: DEFAULT_GREETING }))} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                                            <RotateCcw className="w-3 h-3" /> Reset
                                        </button>
                                    )}
                                </div>
                                <TextArea rows={3} value={config.greeting} onChange={(e) => updateConfig(c => ({ ...c, greeting: e.target.value }))} placeholder={DEFAULT_GREETING} />
                                <p className="text-xs text-zinc-400">Wird beim Session-Start gesendet — KI generiert daraus eine individuelle Begrüßung.</p>
                            </label>
                        </div>
                    </Section>
                </div>


                {/* Row 3: Tools */}
                <Section title={`Tools & Fähigkeiten · ${enabledToolCount} von ${config.tools.length} aktiv`} icon={<Wrench className="w-4 h-4" />} noPadding>
                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">
                        <div className="border-b lg:border-b-0 lg:border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto max-h-[420px] lg:max-h-[520px]">
                            {(() => {
                                const toolGroups: Array<{ label: string; tools: string[] }> = [
                                    { label: 'Navigation', tools: ['open_gallery', 'go_back', 'open_stack', 'next_image', 'previous_image', 'select_image_by_index', 'select_image_by_position'] },
                                    { label: 'Kreativ-Workflow', tools: ['set_prompt_text', 'create_variables', 'select_variable_option', 'apply_preset', 'trigger_generation'] },
                                    { label: 'Erstellen & Upload', tools: ['open_create', 'open_create_new', 'open_upload', 'set_aspect_ratio', 'set_quality'] },
                                    { label: 'Bearbeitung', tools: ['open_presets', 'open_reference_image_picker', 'start_annotation_mode', 'repeat_current_image'] },
                                    { label: 'System', tools: ['get_app_context', 'stop_voice_mode', 'download_current_image', 'open_settings'] },
                                ];
                                const groupedNames = new Set(toolGroups.flatMap(g => g.tools));
                                const ungrouped = config.tools.filter(t => !groupedNames.has(t.name));
                                if (ungrouped.length) toolGroups.push({ label: 'Sonstige', tools: ungrouped.map(t => t.name) });

                                return toolGroups.map(group => {
                                    const groupTools = group.tools.map(name => config.tools.find(t => t.name === name)).filter(Boolean) as typeof config.tools;
                                    if (!groupTools.length) return null;
                                    return (
                                        <div key={group.label}>
                                            <div className="px-5 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{group.label}</div>
                                            {groupTools.map(tool => {
                                                const isSelected = selectedTool === tool.name;
                                                const hasCustomDesc = !!tool.description;
                                                return (
                                                    <button
                                                        key={tool.name}
                                                        type="button"
                                                        onClick={() => setSelectedTool(tool.name)}
                                                        className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors border-b border-zinc-50 dark:border-zinc-800/60 last:border-0 ${isSelected ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}
                                                    >
                                                        <div
                                                            role="checkbox"
                                                            aria-checked={tool.enabled}
                                                            onClick={(e) => { e.stopPropagation(); updateConfig(c => ({ ...c, tools: c.tools.map(t => t.name === tool.name ? { ...t, enabled: !t.enabled } : t) })); }}
                                                            className={`shrink-0 h-4 w-4 rounded-[4px] border-2 flex items-center justify-center transition-colors cursor-pointer ${tool.enabled ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white' : 'border-zinc-300 dark:border-zinc-600'}`}
                                                        >
                                                            {tool.enabled && <Check className="w-2.5 h-2.5 text-white dark:text-zinc-900" />}
                                                        </div>
                                                        <span className={`text-xs font-medium flex-1 truncate ${tool.enabled ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}`}>{tool.name}</span>
                                                        {hasCustomDesc && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" title="Angepasste Beschreibung" />}
                                                        <ChevronRight className={`shrink-0 w-3.5 h-3.5 transition-colors ${isSelected ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-300 dark:text-zinc-600'}`} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                        <div className="p-6">
                            {selectedTool ? (
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedTool}</div>
                                            <div className="text-xs text-zinc-400 mt-1">{selectedToolIsDefault ? 'Standard-Beschreibung' : 'Angepasst · wird direkt an die API gesendet'}</div>
                                        </div>
                                        {!selectedToolIsDefault && (
                                            <button type="button" onClick={() => updateConfig(c => ({ ...c, tools: c.tools.map(t => t.name === selectedTool ? { ...t, description: undefined } : t) }))} className="shrink-0 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                                                <RotateCcw className="w-3.5 h-3.5" /> Reset
                                            </button>
                                        )}
                                    </div>
                                    <TextArea rows={9} value={selectedToolDesc} onChange={(e) => updateConfig(c => ({ ...c, tools: c.tools.map(t => t.name === selectedTool ? { ...t, description: e.target.value } : t) }))} className="font-mono text-xs" />
                                    <p className="text-xs text-zinc-400 leading-relaxed">Die Beschreibung bestimmt, wann und wie die KI dieses Tool aufruft.</p>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-sm text-zinc-400">Tool auswählen um die Beschreibung zu bearbeiten</div>
                            )}
                        </div>
                    </div>
                </Section>

            </div>
        </div>
    );
};
