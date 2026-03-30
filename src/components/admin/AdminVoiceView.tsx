import React from 'react';
import { Check, Eye, Loader2, MessageSquareText, RotateCcw, Settings2, Trash2, Wrench } from 'lucide-react';
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

// ─── Two-pane monitor feed ───────────────────────────────────────────────────

const MonitorFeed: React.FC<{ feedEntries: FeedEntry[] }> = ({ feedEntries }) => {
    const [selectedToolId, setSelectedToolId] = React.useState<string | null>(null);
    const chatRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll chat to bottom on new entries
    React.useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [feedEntries.length]);

    const selectedTool = feedEntries.find(
        e => e.id === selectedToolId && e.kind === 'tool'
    ) as (FeedEntry & { kind: 'tool' }) | undefined;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] min-h-[400px]">

            {/* ── Left: continuous chat flow ── */}
            <div
                ref={chatRef}
                className="overflow-y-auto max-h-[500px] px-6 py-5 space-y-3 border-b lg:border-b-0 lg:border-r border-zinc-100 dark:border-zinc-800"
            >
                {feedEntries.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                        <MessageSquareText className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />
                        <p className="text-sm text-zinc-400">Noch keine Aktivität</p>
                        <p className="text-xs text-zinc-300 dark:text-zinc-600">Starte eine Voice-Session um Logs zu sehen</p>
                    </div>
                )}

                {feedEntries.map(entry => {
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
                        // ── Tool call chip ──
                        const call = entry.call;
                        const isSelected = entry.id === selectedToolId;
                        return (
                            <div key={entry.id} className="flex justify-center py-0.5">
                                <button
                                    type="button"
                                    onClick={() => setSelectedToolId(isSelected ? null : entry.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                                        isSelected
                                            ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 shadow-sm'
                                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${call.status === 'ok' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                    <span className="font-mono">{call.name}</span>
                                    <span className="text-zinc-300 dark:text-zinc-600">·</span>
                                    <span className="tabular-nums">{formatDate(call.timestamp)}</span>
                                </button>
                            </div>
                        );
                    }
                })}
            </div>

            {/* ── Right: tool call detail ── */}
            <div className="p-6 overflow-y-auto max-h-[500px]">
                {selectedTool ? (
                    <ToolCallDetail call={selectedTool.call} />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                        <Wrench className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />
                        <p className="text-sm text-zinc-400">Tool-Aufruf anklicken</p>
                        <p className="text-xs text-zinc-300 dark:text-zinc-600">Details erscheinen hier</p>
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
    const [liveTab, setLiveTab] = React.useState<'feed' | 'context'>('feed');
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

                {/* Row 2: Live-Monitor */}
                <Section title="Live-Monitor" icon={<Eye className="w-4 h-4" />} noPadding>
                    <div>
                        {/* Tab bar */}
                        <div className="flex items-center border-b border-zinc-100 dark:border-zinc-800 px-6">
                            <div className="flex gap-1 flex-1">
                                {([
                                    { key: 'feed', label: 'Verlauf', count: feedEntries.length },
                                    { key: 'context', label: 'Agent-Kontext' },
                                ] as const).map(tab => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setLiveTab(tab.key)}
                                        className={`px-4 py-3 text-xs font-semibold border-b-2 -mb-px transition-colors ${liveTab === tab.key ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                                    >
                                        {tab.label}
                                        {'count' in tab && tab.count > 0 && (
                                            <span className="ml-2 text-[9px] bg-zinc-200 dark:bg-zinc-700 rounded-full px-1.5 py-0.5 tabular-nums">{tab.count}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            {feedEntries.length > 0 && onClearLogs && (
                                <button
                                    type="button"
                                    onClick={onClearLogs}
                                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors py-3"
                                    title="Verlauf leeren"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Leeren</span>
                                </button>
                            )}
                        </div>

                        {/* Feed tab — list + detail two-pane */}
                        {liveTab === 'feed' && (
                            feedEntries.length === 0 ? (
                                <div className="py-12 flex flex-col items-center gap-2 text-center px-6">
                                    <MessageSquareText className="w-8 h-8 text-zinc-200 dark:text-zinc-700" />
                                    <p className="text-sm text-zinc-400">Starte eine Voice-Session, um den Verlauf zu sehen.</p>
                                    <p className="text-xs text-zinc-300 dark:text-zinc-600">Gespräche und Tool-Aufrufe werden dauerhaft gespeichert.</p>
                                </div>
                            ) : (
                                <MonitorFeed feedEntries={feedEntries} />
                            )
                        )}

                        {/* Context tab */}
                        {liveTab === 'context' && (() => {
                            let ctx: Record<string, any> | null = null;
                            try { ctx = diagnostics.appContextSummary ? JSON.parse(diagnostics.appContextSummary) : null; } catch { /* ignore */ }
                            const levels = [
                                { key: 'gallery', label: 'Galerie', short: 'L1' },
                                { key: 'stack', label: 'Stapel', short: 'L2' },
                                { key: 'detail', label: 'Detail', short: 'L3' },
                            ];
                            const specialLevel = ctx && !levels.find(l => l.key === ctx!.viewLevel)
                                ? (ctx.viewLevel === 'create' ? 'Erstellen' : ctx.viewLevel) : null;
                            return (
                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-xs font-semibold text-zinc-400 mb-2.5">Aktuelle Ebene</div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {levels.map((lvl, i) => {
                                                        const isActive = ctx?.viewLevel === lvl.key;
                                                        return (
                                                            <React.Fragment key={lvl.key}>
                                                                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isActive ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                                                                    <span className="opacity-50 text-[10px]">{lvl.short}</span>
                                                                    <span>{lvl.label}</span>
                                                                </div>
                                                                {i < levels.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 shrink-0" />}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    {specialLevel && (
                                                        <>
                                                            <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 shrink-0" />
                                                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">{specialLevel}</div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {ctx && (
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    {[
                                                        { label: 'Bilder', value: String(ctx.imageCount ?? '—') },
                                                        { label: 'Presets nutzbar', value: ctx.canOpenPresets ? 'Ja' : 'Nein' },
                                                        { label: 'Referenzbild', value: ctx.canAddReferenceImage ? 'Möglich' : 'Nein' },
                                                        { label: 'Annotation', value: ctx.canAnnotateImage ? 'Möglich' : 'Nein' },
                                                        { label: 'Hat Prompt', value: ctx.detailHasPrompt ? 'Ja' : ctx.viewLevel === 'detail' ? 'Nein' : '—' },
                                                    ].map(({ label, value }) => (
                                                        <div key={label} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/30">
                                                            <span className="text-xs text-zinc-400">{label}</span>
                                                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex items-start justify-between gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-semibold text-zinc-400 mb-1">Gesendete Bilder</div>
                                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                                        {diagnostics.visualContextSummary || (config.visualContextEnabled ? 'Keine Session aktiv.' : 'Deaktiviert.')}
                                                    </p>
                                                </div>
                                                <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold ${diagnostics.visualFrameCount > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                                                    {diagnostics.visualFrameCount} {diagnostics.visualFrameCount === 1 ? 'Bild' : 'Bilder'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            {ctx?.images && ctx.images.length > 0 ? (
                                                <div>
                                                    <div className="text-xs font-semibold text-zinc-400 mb-2">Bilder im Kontext — {ctx.images.length}{ctx.images.length === 48 ? ' (max)' : ''}</div>
                                                    <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden max-h-40 overflow-y-auto">
                                                        {ctx.images.slice(0, 12).map((img: any, idx: number) => (
                                                            <div key={img.id} className="flex items-center gap-3 py-2 px-3.5 border-b border-zinc-50 dark:border-zinc-800/60 last:border-0">
                                                                <span className="text-[10px] text-zinc-300 dark:text-zinc-600 w-5 shrink-0 font-mono tabular-nums">#{idx + 1}</span>
                                                                <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate">{img.prompt || <span className="text-zinc-300 dark:text-zinc-600 italic">kein Prompt</span>}</span>
                                                            </div>
                                                        ))}
                                                        {ctx.images.length > 12 && <div className="py-2 px-3.5 text-xs text-zinc-400 italic">+{ctx.images.length - 12} weitere</div>}
                                                    </div>
                                                </div>
                                            ) : ctx && (
                                                <div className="text-xs text-zinc-400 py-3 text-center">Keine Bild-Liste in dieser Ansicht.</div>
                                            )}
                                            {ctx?.presets && ctx.presets.length > 0 && (
                                                <div>
                                                    <div className="text-xs font-semibold text-zinc-400 mb-2">{ctx.presets.length} Presets</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {ctx.presets.slice(0, 14).map((p: any, i: number) => (
                                                            <span key={i} className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2.5 py-1 rounded-lg">{p.title}{p.hasControls ? ' ⚙' : ''}</span>
                                                        ))}
                                                        {ctx.presets.length > 14 && <span className="text-xs text-zinc-400 px-1 py-1">+{ctx.presets.length - 14}</span>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/30 px-5 py-4 space-y-2.5 border border-zinc-100 dark:border-zinc-800/60">
                                        <div className="text-xs font-bold text-zinc-500">Wie der Agent-Kontext aufgebaut ist</div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-zinc-400 leading-relaxed">
                                            <div><span className="font-semibold text-zinc-600 dark:text-zinc-300">JSON-Kontext</span> — aktuelle Ebene, Bild-IDs, verfügbare Aktionen und Presets (nur die der App-Sprache).</div>
                                            <div><span className="font-semibold text-zinc-600 dark:text-zinc-300">Bildthumbnails</span> — keine UI-Screenshots. Detail: 1 Bild, Galerie/Stapel: bis zu 4 Frames.</div>
                                            <div><span className="font-semibold text-zinc-600 dark:text-zinc-300">Konfigurierbar</span> — Toggle "Bilder an KI senden" steuert Thumbnails. Alles andere ist hardcoded.</div>
                                        </div>
                                    </div>
                                    {!ctx && <p className="text-sm text-zinc-400 py-4 text-center">Keine Kontext-Daten verfügbar.</p>}
                                </div>
                            );
                        })()}
                    </div>
                </Section>

                {/* Row 3: Tools */}
                <Section title={`Tools & Fähigkeiten · ${enabledToolCount} von ${config.tools.length} aktiv`} icon={<Wrench className="w-4 h-4" />} noPadding>
                    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
                        <div className="border-b lg:border-b-0 lg:border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto max-h-[420px] lg:max-h-[520px]">
                            {config.tools.map(tool => {
                                const isSelected = selectedTool === tool.name;
                                const hasCustomDesc = !!tool.description;
                                return (
                                    <button
                                        key={tool.name}
                                        type="button"
                                        onClick={() => setSelectedTool(tool.name)}
                                        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors border-b border-zinc-50 dark:border-zinc-800/60 last:border-0 ${isSelected ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}
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
