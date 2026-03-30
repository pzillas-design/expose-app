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

function formatTimestamp(timestamp: number) {
    return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(timestamp);
}

/* ── Toggle ─────────────────────────────────────────────────── */
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${checked ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}
    >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

/* ── Section wrapper ────────────────────────────────────────── */
const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
    <div className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden ${className ?? ''}`}>
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
            {icon}
            <h3 className="text-xs font-bold flex-1 text-zinc-700 dark:text-zinc-300">{title}</h3>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

/* ── Feature toggle row ─────────────────────────────────────── */
const FeatureRow = ({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: () => void }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
        <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{label}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">{hint}</div>
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
        <div className="flex flex-col">
            <AdminViewHeader
                title="Voice Assistant"
                description="Kommandozentrale für den KI-Sprachassistenten"
            />

            {/* ── Save bar ──────────────────────────────────────── */}
            <div className="px-6 md:px-8 pt-2 pb-1 flex items-center justify-end gap-3">
                {diagnostics.sessionModel && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Session aktiv · {diagnostics.sessionModel}
                    </div>
                )}
                <Button
                    size="s"
                    variant={saveState === 'saved' ? 'secondary' : 'primary'}
                    icon={saveState === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : saveState === 'saved' ? <Check className="w-3 h-3" /> : undefined}
                    onClick={handleSave}
                    disabled={saveState === 'saving'}
                >
                    {saveState === 'saved' ? 'Gespeichert' : 'Speichern'}
                </Button>
            </div>

            <div className="px-6 md:px-8 py-4 space-y-5">

                {/* ── Konfiguration ─────────────────────────────── */}
                <Section title="Konfiguration" icon={<Settings2 className="w-3.5 h-3.5 text-zinc-400" />}>
                    <div className="space-y-5">

                        {/* Global enable */}
                        <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                            <div>
                                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Voice aktivieren</div>
                                <div className="text-[11px] text-zinc-400 mt-0.5">Blendet den Mikrofon-Button in der App ein und erlaubt Session-Start</div>
                            </div>
                            <Toggle checked={config.enabled} onChange={() => updateConfig(c => ({ ...c, enabled: !c.enabled }))} />
                        </div>

                        {/* Model + Voice */}
                        <div className="grid grid-cols-2 gap-4">
                            <label className="block space-y-1.5">
                                <span className="text-[11px] font-semibold text-zinc-500">Modell</span>
                                <Input
                                    value={config.model}
                                    onChange={(e) => updateConfig(c => ({ ...c, model: e.target.value }))}
                                    placeholder={DEFAULT_VOICE_MODEL}
                                />
                            </label>
                            <label className="block space-y-1.5">
                                <span className="text-[11px] font-semibold text-zinc-500">Stimme</span>
                                <select
                                    value={config.voiceName}
                                    onChange={(e) => updateConfig(c => ({ ...c, voiceName: e.target.value }))}
                                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
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
                        <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
                            <FeatureRow
                                label="Sprachprotokoll"
                                hint="Zeigt gesprochenen Text des Nutzers als Transkript an — nützlich für Debugging"
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
                                label="Bildschirmzugriff"
                                hint="KI sieht Screenshots des aktuellen Screens und geöffnete Bilder — für visuelle Vorschläge"
                                checked={config.visualContextEnabled}
                                onChange={() => updateConfig(c => ({ ...c, visualContextEnabled: !c.visualContextEnabled }))}
                            />
                        </div>

                        {/* Voice name custom input if not in list */}
                        {!GEMINI_LIVE_VOICES.includes(config.voiceName as any) && (
                            <label className="block space-y-1.5">
                                <span className="text-[11px] font-semibold text-zinc-500">Benutzerdefinierte Stimme</span>
                                <Input
                                    value={config.voiceName}
                                    onChange={(e) => updateConfig(c => ({ ...c, voiceName: e.target.value }))}
                                    placeholder={DEFAULT_VOICE_NAME}
                                />
                            </label>
                        )}
                    </div>
                </Section>

                {/* ── Prompt & Begrüßung ────────────────────────── */}
                <Section title="Prompt & Begrüßung" icon={<MessageSquareText className="w-3.5 h-3.5 text-zinc-400" />}>
                    <div className="space-y-4">
                        <div className="text-[11px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl px-3 py-2">
                            Die Sprache wird automatisch aus der App-Einstellung erkannt und an den Prompt angehängt. Ein Prompt reicht für beide Sprachen.
                        </div>
                        <label className="block space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-zinc-500">System Prompt</span>
                                {config.systemPrompt !== DEFAULT_SYSTEM_PROMPT && (
                                    <button type="button" onClick={() => updateConfig(c => ({ ...c, systemPrompt: DEFAULT_SYSTEM_PROMPT }))} className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                                        <RotateCcw className="w-3 h-3" /> Reset
                                    </button>
                                )}
                            </div>
                            <TextArea
                                rows={7}
                                value={config.systemPrompt}
                                onChange={(e) => updateConfig(c => ({ ...c, systemPrompt: e.target.value }))}
                                placeholder={DEFAULT_SYSTEM_PROMPT}
                            />
                        </label>
                        <label className="block space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-zinc-500">Begrüßung</span>
                                <span className="text-[10px] text-zinc-400">Wird beim Session-Start an die KI gesendet</span>
                            </div>
                            <TextArea
                                rows={2}
                                value={config.greeting}
                                onChange={(e) => updateConfig(c => ({ ...c, greeting: e.target.value }))}
                                placeholder={DEFAULT_GREETING}
                            />
                        </label>
                    </div>
                </Section>

                {/* ── Tools ─────────────────────────────────────── */}
                <Section title={`Tools & Fähigkeiten · ${enabledToolCount} / ${config.tools.length} aktiv`} icon={<Wrench className="w-3.5 h-3.5 text-zinc-400" />}>
                    <div className="grid grid-cols-[220px_1fr] gap-0 -m-5">
                        {/* Left: tool list */}
                        <div className="border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto max-h-[480px]">
                            {config.tools.map(tool => {
                                const isSelected = selectedTool === tool.name;
                                const hasCustomDesc = !!tool.description;
                                return (
                                    <button
                                        key={tool.name}
                                        type="button"
                                        onClick={() => setSelectedTool(tool.name)}
                                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors border-b border-zinc-50 dark:border-zinc-800/60 last:border-0 ${isSelected ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}
                                    >
                                        {/* Enable toggle */}
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
                                        <span className={`text-[11px] font-medium flex-1 truncate ${tool.enabled ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}`}>
                                            {tool.name}
                                        </span>
                                        {hasCustomDesc && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" title="Angepasste Beschreibung" />}
                                        <ChevronRight className={`shrink-0 w-3 h-3 transition-colors ${isSelected ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-300 dark:text-zinc-600'}`} />
                                    </button>
                                );
                            })}
                        </div>

                        {/* Right: detail editor */}
                        <div className="p-5">
                            {selectedTool ? (
                                <div className="space-y-3 h-full">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedTool}</div>
                                            <div className="text-[10px] text-zinc-400 mt-0.5">
                                                {selectedToolIsDefault ? 'Standard-Beschreibung' : 'Angepasste Beschreibung · wird an die API gesendet'}
                                            </div>
                                        </div>
                                        {!selectedToolIsDefault && (
                                            <button
                                                type="button"
                                                onClick={() => updateConfig(c => ({ ...c, tools: c.tools.map(t => t.name === selectedTool ? { ...t, description: undefined } : t) }))}
                                                className="shrink-0 flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                                            >
                                                <RotateCcw className="w-3 h-3" /> Reset
                                            </button>
                                        )}
                                    </div>
                                    <TextArea
                                        rows={8}
                                        value={selectedToolDesc}
                                        onChange={(e) => updateConfig(c => ({ ...c, tools: c.tools.map(t => t.name === selectedTool ? { ...t, description: e.target.value } : t) }))}
                                        className="font-mono text-[11px]"
                                    />
                                    <p className="text-[10px] text-zinc-400">
                                        Diese Beschreibung bestimmt, wann und wie die KI dieses Tool aufruft. Je präziser, desto besser das Verhalten.
                                    </p>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-[11px] text-zinc-400">
                                    Tool auswählen um die Beschreibung zu bearbeiten
                                </div>
                            )}
                        </div>
                    </div>
                </Section>

                {/* ── Live-Monitor ──────────────────────────────── */}
                <Section title="Live-Monitor" icon={<Eye className="w-3.5 h-3.5 text-zinc-400" />}>
                    <div className="-mt-2 space-y-3">
                        {/* Tabs */}
                        <div className="flex gap-1 border-b border-zinc-100 dark:border-zinc-800 -mx-5 px-5">
                            {([
                                { key: 'calls', label: 'Tool-Aufrufe' },
                                { key: 'transcript', label: 'Gespräch' },
                                { key: 'context', label: 'Kontext' },
                            ] as const).map(tab => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setLiveTab(tab.key)}
                                    className={`px-3 py-2 text-[11px] font-semibold border-b-2 transition-colors ${liveTab === tab.key ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                                >
                                    {tab.label}
                                    {tab.key === 'calls' && diagnostics.toolCalls.length > 0 && (
                                        <span className="ml-1.5 text-[9px] bg-zinc-200 dark:bg-zinc-700 rounded-full px-1.5 py-0.5">{diagnostics.toolCalls.length}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Tool calls */}
                        {liveTab === 'calls' && (
                            <div className="space-y-1 max-h-64 overflow-y-auto">
                                {diagnostics.toolCalls.length === 0 ? (
                                    <p className="text-[11px] text-zinc-400 py-6 text-center">Noch keine Tool-Aufrufe in dieser Session.</p>
                                ) : diagnostics.toolCalls.map(entry => (
                                    <div key={entry.id} className="flex items-start gap-2 py-1.5 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/30">
                                        <span className={`mt-1 shrink-0 w-1.5 h-1.5 rounded-full ${entry.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">{entry.name}</span>
                                                <span className="text-[10px] text-zinc-400 shrink-0">{formatTimestamp(entry.timestamp)}</span>
                                            </div>
                                            {entry.message && <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{entry.argsSummary} — {entry.message}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Transcript */}
                        {liveTab === 'transcript' && (
                            <div className="space-y-1 max-h-64 overflow-y-auto">
                                {diagnostics.transcripts.length === 0 ? (
                                    <p className="text-[11px] text-zinc-400 py-6 text-center">Noch keine Transkripte. Starte eine Voice-Session.</p>
                                ) : diagnostics.transcripts.map(entry => (
                                    <div key={entry.id} className={`py-1.5 px-3 rounded-lg ${entry.source === 'user' ? 'bg-zinc-50 dark:bg-zinc-800/30' : 'bg-blue-50 dark:bg-blue-950/20'}`}>
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <span className="text-[10px] font-semibold text-zinc-500">{entry.source === 'user' ? 'Du' : 'Exposé'}</span>
                                            <span className="text-[10px] text-zinc-400">{formatTimestamp(entry.timestamp)}</span>
                                        </div>
                                        <p className="text-[11px] text-zinc-700 dark:text-zinc-200">{entry.text}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Context */}
                        {liveTab === 'context' && (
                            <div className="space-y-3">
                                <div>
                                    <div className="text-[10px] font-semibold text-zinc-400 mb-1.5">App-Zustand (was die KI über den Screen weiß)</div>
                                    <pre className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-words font-mono bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-3 max-h-40 overflow-y-auto">
                                        {diagnostics.appContextSummary || 'Keine aktive Session.'}
                                    </pre>
                                </div>
                                <div>
                                    <div className="text-[10px] font-semibold text-zinc-400 mb-1.5">Visuelle Frames · {diagnostics.visualFrameCount} gesendet</div>
                                    <pre className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-words font-mono bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-3 max-h-40 overflow-y-auto">
                                        {diagnostics.visualContextSummary || 'Bildschirmzugriff inaktiv oder keine Session.'}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </Section>

            </div>
        </div>
    );
};
