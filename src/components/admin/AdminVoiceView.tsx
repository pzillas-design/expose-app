import React from 'react';
import { AudioLines, Check, ChevronRight, Eye, Loader2, MessageSquareText, RotateCcw, Settings2, Wrench } from 'lucide-react';
import { AdminViewHeader } from './AdminViewHeader';
import { TranslationFunction, VoiceAdminConfig, VoiceDiagnostics } from '@/types';
import { Button, Input, TextArea } from '@/components/ui/DesignSystem';
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
}

function formatTimestamp(ts: number) {
    return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(ts);
}

/* ── Toggle ─────────────────────────────────────────────────── */
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}
    >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

/* ── Section ─────────────────────────────────────────────────── */
const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string; noPadding?: boolean }> = ({
    title, icon, children, className, noPadding,
}) => (
    <div className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden ${className ?? ''}`}>
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2.5">
            <span className="text-zinc-400">{icon}</span>
            <h3 className="text-sm font-semibold flex-1 text-zinc-800 dark:text-zinc-200">{title}</h3>
        </div>
        <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
);

/* ── Feature toggle row ─────────────────────────────────────── */
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

export const AdminVoiceView: React.FC<AdminVoiceViewProps> = ({ t, config, diagnostics, onConfigChange }) => {
    const enabledToolCount = config.tools.filter(tool => tool.enabled).length;
    const [selectedTool, setSelectedTool] = React.useState<string | null>(config.tools[0]?.name ?? null);
    const [liveTab, setLiveTab] = React.useState<'calls' | 'transcript' | 'context'>('calls');
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

    const selectedToolData = config.tools.find(t => t.name === selectedTool) ?? null;
    const selectedToolDesc = selectedToolData?.description ?? DEFAULT_TOOL_DESCRIPTIONS[selectedTool ?? ''] ?? '';
    const selectedToolIsDefault = !selectedToolData?.description;

    return (
        <div className="flex flex-col min-h-0">
            <AdminViewHeader
                title="Voice Assistant"
                description="Kommandozentrale für den KI-Sprachassistenten"
            />

            {/* ── Top bar ───────────────────────────────────────── */}
            <div className="px-6 md:px-10 pt-3 pb-2 flex items-center justify-end gap-4">
                {diagnostics.sessionModel && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Session aktiv · {diagnostics.sessionModel}
                    </div>
                )}
                <Button
                    size="s"
                    variant={saveState === 'saved' ? 'secondary' : 'primary'}
                    icon={saveState === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveState === 'saved' ? <Check className="w-3.5 h-3.5" /> : undefined}
                    onClick={handleSave}
                    disabled={saveState === 'saving'}
                >
                    {saveState === 'saved' ? 'Gespeichert' : 'Speichern'}
                </Button>
            </div>

            {/* ── Main content ──────────────────────────────────── */}
            <div className="px-6 md:px-10 py-6 space-y-6 max-w-6xl w-full">

                {/* ── Row 1: Config + Prompts side-by-side on xl ── */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                    {/* Konfiguration */}
                    <Section title="Konfiguration" icon={<Settings2 className="w-4 h-4" />}>
                        <div className="space-y-6">

                            {/* Global enable */}
                            <div className="flex items-start justify-between gap-6 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                                <div>
                                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Voice aktivieren</div>
                                    <div className="text-xs text-zinc-400 mt-1 max-w-xs">Blendet den Mikrofon-Button ein und erlaubt den Start einer Voice-Session</div>
                                </div>
                                <Toggle checked={config.enabled} onChange={() => updateConfig(c => ({ ...c, enabled: !c.enabled }))} />
                            </div>

                            {/* Model + Voice */}
                            <div className="grid grid-cols-2 gap-4">
                                <label className="block space-y-2">
                                    <span className="text-xs font-semibold text-zinc-500">Modell</span>
                                    <Input
                                        value={config.model}
                                        onChange={(e) => updateConfig(c => ({ ...c, model: e.target.value }))}
                                        placeholder={DEFAULT_VOICE_MODEL}
                                    />
                                </label>
                                <label className="block space-y-2">
                                    <span className="text-xs font-semibold text-zinc-500">Stimme</span>
                                    <select
                                        value={config.voiceName}
                                        onChange={(e) => updateConfig(c => ({ ...c, voiceName: e.target.value }))}
                                        className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                                    >
                                        {GEMINI_LIVE_VOICES.map(v => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                        {!GEMINI_LIVE_VOICES.includes(config.voiceName as any) && (
                                            <option value={config.voiceName}>{config.voiceName} (custom)</option>
                                        )}
                                    </select>
                                </label>
                            </div>

                            {/* Feature toggles */}
                            <div>
                                <FeatureRow
                                    label="Nutzer-Transkript"
                                    hint="Zeigt gesprochenen Text des Nutzers im Live-Monitor an — nützlich für Debugging"
                                    checked={config.inputTranscriptionEnabled}
                                    onChange={() => updateConfig(c => ({ ...c, inputTranscriptionEnabled: !c.inputTranscriptionEnabled }))}
                                />
                                <FeatureRow
                                    label="KI-Antworttext"
                                    hint="Transkribiert KI-Antworten als Text — erscheint im Live-Monitor unter Gespräch"
                                    checked={config.outputTranscriptionEnabled}
                                    onChange={() => updateConfig(c => ({ ...c, outputTranscriptionEnabled: !c.outputTranscriptionEnabled }))}
                                />
                                <FeatureRow
                                    label="Bilder an KI senden"
                                    hint="Sendet Thumbnails der aktuell sichtbaren Bilder an die KI — kein UI-Screenshot, nur Bildinhalte. Detail: 1 Bild, Galerie: bis zu 4."
                                    checked={config.visualContextEnabled}
                                    onChange={() => updateConfig(c => ({ ...c, visualContextEnabled: !c.visualContextEnabled }))}
                                />
                            </div>

                            {/* Custom voice input */}
                            {!GEMINI_LIVE_VOICES.includes(config.voiceName as any) && (
                                <label className="block space-y-2">
                                    <span className="text-xs font-semibold text-zinc-500">Benutzerdefinierte Stimme</span>
                                    <Input
                                        value={config.voiceName}
                                        onChange={(e) => updateConfig(c => ({ ...c, voiceName: e.target.value }))}
                                        placeholder={DEFAULT_VOICE_NAME}
                                    />
                                </label>
                            )}
                        </div>
                    </Section>

                    {/* Prompt & Begrüßung */}
                    <Section title="Prompt & Begrüßung" icon={<MessageSquareText className="w-4 h-4" />}>
                        <div className="space-y-5">
                            <div className="text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3 leading-relaxed">
                                Die Sprache wird automatisch aus der App-Einstellung erkannt — ein Prompt reicht für beide Sprachen.
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
                                <TextArea
                                    rows={8}
                                    value={config.systemPrompt}
                                    onChange={(e) => updateConfig(c => ({ ...c, systemPrompt: e.target.value }))}
                                    placeholder={DEFAULT_SYSTEM_PROMPT}
                                />
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
                                <TextArea
                                    rows={3}
                                    value={config.greeting}
                                    onChange={(e) => updateConfig(c => ({ ...c, greeting: e.target.value }))}
                                    placeholder={DEFAULT_GREETING}
                                />
                                <p className="text-xs text-zinc-400">Wird beim Session-Start an die KI gesendet — sie generiert daraus eine individuelle Begrüßung.</p>
                            </label>
                        </div>
                    </Section>
                </div>

                {/* ── Row 2: Tools (full width) ─────────────────── */}
                <Section
                    title={`Tools & Fähigkeiten · ${enabledToolCount} von ${config.tools.length} aktiv`}
                    icon={<Wrench className="w-4 h-4" />}
                    noPadding
                >
                    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
                        {/* Tool list */}
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateConfig(c => ({ ...c, tools: c.tools.map(t => t.name === tool.name ? { ...t, enabled: !t.enabled } : t) }));
                                            }}
                                            className={`shrink-0 h-4 w-4 rounded-[4px] border-2 flex items-center justify-center transition-colors cursor-pointer ${tool.enabled ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white' : 'border-zinc-300 dark:border-zinc-600'}`}
                                        >
                                            {tool.enabled && <Check className="w-2.5 h-2.5 text-white dark:text-zinc-900" />}
                                        </div>
                                        <span className={`text-xs font-medium flex-1 truncate ${tool.enabled ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}`}>
                                            {tool.name}
                                        </span>
                                        {hasCustomDesc && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" title="Angepasste Beschreibung" />}
                                        <ChevronRight className={`shrink-0 w-3.5 h-3.5 transition-colors ${isSelected ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-300 dark:text-zinc-600'}`} />
                                    </button>
                                );
                            })}
                        </div>

                        {/* Description editor */}
                        <div className="p-6">
                            {selectedTool ? (
                                <div className="space-y-4 h-full">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedTool}</div>
                                            <div className="text-xs text-zinc-400 mt-1">
                                                {selectedToolIsDefault ? 'Standard-Beschreibung (nicht überschrieben)' : 'Angepasste Beschreibung · wird direkt an die API gesendet'}
                                            </div>
                                        </div>
                                        {!selectedToolIsDefault && (
                                            <button
                                                type="button"
                                                onClick={() => updateConfig(c => ({ ...c, tools: c.tools.map(t => t.name === selectedTool ? { ...t, description: undefined } : t) }))}
                                                className="shrink-0 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" /> Reset
                                            </button>
                                        )}
                                    </div>
                                    <TextArea
                                        rows={9}
                                        value={selectedToolDesc}
                                        onChange={(e) => updateConfig(c => ({ ...c, tools: c.tools.map(t => t.name === selectedTool ? { ...t, description: e.target.value } : t) }))}
                                        className="font-mono text-xs"
                                    />
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Die Beschreibung bestimmt, wann und wie die KI dieses Tool aufruft. Je präziser, desto vorhersehbarer das Verhalten.
                                    </p>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-sm text-zinc-400">
                                    Tool auswählen um die Beschreibung zu bearbeiten
                                </div>
                            )}
                        </div>
                    </div>
                </Section>

                {/* ── Row 3: Live-Monitor (full width) ──────────── */}
                <Section title="Live-Monitor" icon={<Eye className="w-4 h-4" />} noPadding>
                    <div>
                        {/* Tabs */}
                        <div className="flex gap-1 border-b border-zinc-100 dark:border-zinc-800 px-6">
                            {([
                                { key: 'calls', label: 'Tool-Aufrufe' },
                                { key: 'transcript', label: 'Gespräch' },
                                { key: 'context', label: 'Agent-Kontext' },
                            ] as const).map(tab => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setLiveTab(tab.key)}
                                    className={`px-4 py-3 text-xs font-semibold border-b-2 -mb-px transition-colors ${liveTab === tab.key ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                                >
                                    {tab.label}
                                    {tab.key === 'calls' && diagnostics.toolCalls.length > 0 && (
                                        <span className="ml-2 text-[9px] bg-zinc-200 dark:bg-zinc-700 rounded-full px-1.5 py-0.5">{diagnostics.toolCalls.length}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="p-6">
                            {/* Tool calls */}
                            {liveTab === 'calls' && (
                                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                                    {diagnostics.toolCalls.length === 0 ? (
                                        <p className="text-sm text-zinc-400 py-8 text-center">Noch keine Tool-Aufrufe in dieser Session.</p>
                                    ) : diagnostics.toolCalls.map(entry => (
                                        <div key={entry.id} className="flex items-start gap-3 py-2 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/30">
                                            <span className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${entry.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{entry.name}</span>
                                                    <span className="text-xs text-zinc-400 shrink-0">{formatTimestamp(entry.timestamp)}</span>
                                                </div>
                                                {entry.message && <p className="text-xs text-zinc-500 mt-0.5 truncate">{entry.argsSummary} — {entry.message}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Transcript */}
                            {liveTab === 'transcript' && (
                                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                                    {diagnostics.transcripts.length === 0 ? (
                                        <p className="text-sm text-zinc-400 py-8 text-center">Noch keine Transkripte. Starte eine Voice-Session.</p>
                                    ) : diagnostics.transcripts.map(entry => (
                                        <div key={entry.id} className={`py-2 px-3.5 rounded-xl ${entry.source === 'user' ? 'bg-zinc-50 dark:bg-zinc-800/30' : 'bg-blue-50 dark:bg-blue-950/20'}`}>
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-xs font-semibold text-zinc-500">{entry.source === 'user' ? 'Du' : 'Exposé'}</span>
                                                <span className="text-xs text-zinc-400">{formatTimestamp(entry.timestamp)}</span>
                                            </div>
                                            <p className="text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed">{entry.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Agent context */}
                            {liveTab === 'context' && (() => {
                                let ctx: Record<string, any> | null = null;
                                try { ctx = diagnostics.appContextSummary ? JSON.parse(diagnostics.appContextSummary) : null; } catch { /* ignore */ }

                                const levels = [
                                    { key: 'gallery', label: 'Galerie', short: 'L1' },
                                    { key: 'stack', label: 'Stapel', short: 'L2' },
                                    { key: 'detail', label: 'Detail', short: 'L3' },
                                ];
                                const specialLevel = ctx && !levels.find(l => l.key === ctx!.viewLevel)
                                    ? (ctx.viewLevel === 'create' ? 'Erstellen' : ctx.viewLevel)
                                    : null;

                                return (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                            {/* Left: Level + properties */}
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
                                                            { label: 'Mehrfachauswahl', value: ctx.isSelectMode ? 'Aktiv' : 'Aus' },
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

                                                {/* Visual frames */}
                                                <div className="flex items-start justify-between gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-semibold text-zinc-400 mb-1">Gesendete Bilder</div>
                                                        <p className="text-xs text-zinc-400 leading-relaxed">
                                                            {diagnostics.visualContextSummary || (config.visualContextEnabled ? 'Keine Session aktiv.' : 'Deaktiviert — KI erhält keine Bildthumbnails.')}
                                                        </p>
                                                    </div>
                                                    <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold ${diagnostics.visualFrameCount > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                                                        {diagnostics.visualFrameCount} {diagnostics.visualFrameCount === 1 ? 'Bild' : 'Bilder'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right: Image list + Presets */}
                                            <div className="space-y-4">
                                                {ctx?.images && ctx.images.length > 0 ? (
                                                    <div>
                                                        <div className="text-xs font-semibold text-zinc-400 mb-2">
                                                            Bilder im Kontext — {ctx.images.length}{ctx.images.length === 48 ? ' (max)' : ''}
                                                        </div>
                                                        <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden max-h-40 overflow-y-auto">
                                                            {ctx.images.slice(0, 12).map((img: any, idx: number) => (
                                                                <div key={img.id} className="flex items-center gap-3 py-2 px-3.5 border-b border-zinc-50 dark:border-zinc-800/60 last:border-0">
                                                                    <span className="text-[10px] text-zinc-300 dark:text-zinc-600 w-5 shrink-0 font-mono tabular-nums">#{idx + 1}</span>
                                                                    <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate">{img.prompt || <span className="text-zinc-300 dark:text-zinc-600 italic">kein Prompt</span>}</span>
                                                                </div>
                                                            ))}
                                                            {ctx.images.length > 12 && (
                                                                <div className="py-2 px-3.5 text-xs text-zinc-400 italic">+{ctx.images.length - 12} weitere</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : ctx && (
                                                    <div className="text-xs text-zinc-400 py-3 text-center">Keine Bild-Liste verfügbar in dieser Ansicht.</div>
                                                )}

                                                {ctx?.presets && ctx.presets.length > 0 && (
                                                    <div>
                                                        <div className="text-xs font-semibold text-zinc-400 mb-2">{ctx.presets.length} installierte Presets</div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {ctx.presets.slice(0, 14).map((p: any, i: number) => (
                                                                <span key={i} className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2.5 py-1 rounded-lg">
                                                                    {p.title}{p.hasControls ? ' ⚙' : ''}
                                                                </span>
                                                            ))}
                                                            {ctx.presets.length > 14 && (
                                                                <span className="text-xs text-zinc-400 px-1 py-1">+{ctx.presets.length - 14}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Explanation */}
                                        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/30 px-5 py-4 space-y-2.5 border border-zinc-100 dark:border-zinc-800/60">
                                            <div className="text-xs font-bold text-zinc-500">Wie der Agent-Kontext funktioniert</div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-zinc-400 leading-relaxed">
                                                <div><span className="font-semibold text-zinc-600 dark:text-zinc-300">JSON-Kontext</span> — wird bei jedem Tool-Aufruf mitgeschickt: aktuelle Ebene, Bild-IDs, verfügbare Aktionen und Presets.</div>
                                                <div><span className="font-semibold text-zinc-600 dark:text-zinc-300">Bildthumbnails</span> — keine UI-Screenshots. Detail: 1 Bild, Galerie/Stapel: bis zu 4 Bilder werden als Frames mitgesendet.</div>
                                                <div><span className="font-semibold text-zinc-600 dark:text-zinc-300">Konfigurierbar</span> — der Toggle "Bilder an KI senden" deaktiviert die Thumbnails. Alles andere ist hardcoded.</div>
                                            </div>
                                        </div>

                                        {!ctx && (
                                            <p className="text-sm text-zinc-400 py-4 text-center">Keine Kontext-Daten verfügbar.</p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </Section>

            </div>
        </div>
    );
};
