import React from 'react';
import { AudioLines, Cpu, Eye, MessageSquareText, RefreshCw, Settings2, ToggleLeft, Wrench } from 'lucide-react';
import { AdminViewHeader } from './AdminViewHeader';
import { TranslationFunction, VoiceAdminConfig, VoiceDiagnostics } from '@/types';
import { Button, Input, TextArea } from '@/components/ui/DesignSystem';
import {
    DEFAULT_GREETING_DE,
    DEFAULT_GREETING_EN,
    DEFAULT_SYSTEM_PROMPT_DE,
    DEFAULT_SYSTEM_PROMPT_EN,
    DEFAULT_VOICE_MODEL,
    DEFAULT_VOICE_NAME,
    getDefaultVoiceAdminConfig,
} from '@/services/voiceAdminService';

interface AdminVoiceViewProps {
    t: TranslationFunction;
    config: VoiceAdminConfig;
    diagnostics: VoiceDiagnostics;
    onConfigChange: React.Dispatch<React.SetStateAction<VoiceAdminConfig>>;
}

const TOOL_DESCRIPTIONS: Record<string, string> = {
    get_app_context: 'Liest den aktuellen Screen und die möglichen Aktionen.',
    open_gallery: 'Navigiert zurück in die Galerie.',
    open_create: 'Öffnet die Create-Ansicht.',
    open_settings: 'Öffnet die Einstellungen.',
    enter_multi_select: 'Aktiviert Mehrfachauswahl.',
    leave_multi_select: 'Beendet Mehrfachauswahl.',
    repeat_current_image: 'Startet Varianten für das aktuelle Bild.',
    download_current_image: 'Öffnet Download-Dialog für das aktuelle Bild.',
    open_presets: 'Öffnet Presets im Sidepanel.',
    open_reference_image_picker: 'Öffnet den Referenzbild-Picker.',
    start_annotation_mode: 'Aktiviert Anmerkungen.',
    open_create_new: 'Öffnet Create im New-Image-Flow.',
    open_upload: 'Öffnet den Upload-Dialog.',
    set_prompt_text: 'Schreibt direkt in das Prompt-Feld.',
    trigger_generation: 'Startet Generierung nur auf expliziten Nutzerbefehl.',
    next_image: 'Geht zum nächsten Bild.',
    previous_image: 'Geht zum vorherigen Bild.',
    go_back: 'Navigiert eine Ebene zurück.',
    stop_voice_mode: 'Beendet die Voice-Session.',
    set_aspect_ratio: 'Setzt das Seitenverhältnis.',
    open_stack: 'Öffnet den Stack des aktuellen Bildes.',
    highlight_image: 'Hebt ein Bild visuell hervor.',
    toggle_image_selection: 'Wählt ein Bild in Multi-Select an oder ab.',
    create_variables: 'Erstellt Variable-Chips für Varianten.',
    select_variable_option: 'Toggelt eine Variable-Option.',
    set_quality: 'Setzt 1K, 2K oder 4K.',
    select_image_by_index: 'Öffnet ein Bild per Index.',
    select_image_by_position: 'Öffnet ein Bild per Grid-Position.',
};

function formatTimestamp(timestamp: number) {
    return new Intl.DateTimeFormat('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(timestamp);
}

/* ── Compact toggle for tool list ───────────────────────────── */
const ToolToggle: React.FC<{
    name: string;
    description: string;
    checked: boolean;
    onChange: (next: boolean) => void;
}> = ({ name, description, checked, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className="group flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
    >
        <div className={`shrink-0 h-5 w-9 rounded-full transition-colors ${checked ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
            <div className={`h-4 w-4 rounded-full bg-white dark:bg-zinc-900 mt-0.5 transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
        <div className="min-w-0">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{name}</span>
            <span className="text-[10px] text-zinc-400 ml-2">{description}</span>
        </div>
    </button>
);

/* ── Setting toggle (bigger, with description below) ────────── */
const SettingToggle: React.FC<{
    label: string;
    description: string;
    checked: boolean;
    onChange: (next: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
    >
        <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{label}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{description}</div>
        </div>
        <div className={`shrink-0 h-5 w-9 rounded-full transition-colors ${checked ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
            <div className={`h-4 w-4 rounded-full bg-white dark:bg-zinc-900 mt-0.5 transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
    </button>
);

/* ── Section wrapper ────────────────────────────────────────── */
const Section: React.FC<{
    title: string;
    icon: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
}> = ({ title, icon, actions, children }) => (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
            {icon}
            <h3 className="text-xs font-bold flex-1">{title}</h3>
            {actions}
        </div>
        <div className="p-5">{children}</div>
    </div>
);

/* ── Inline key-value row for read-only info ────────────────── */
const InfoRow = ({ label, value, dot }: { label: string; value: string; dot?: string }) => (
    <div className="flex items-center justify-between py-1.5">
        <span className="text-[11px] text-zinc-500">{label}</span>
        <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            {dot && <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} />}
            {value}
        </span>
    </div>
);

export const AdminVoiceView: React.FC<AdminVoiceViewProps> = ({ t, config, diagnostics, onConfigChange }) => {
    const enabledToolCount = config.tools.filter(tool => tool.enabled).length;

    const updateConfig = React.useCallback((updater: (current: VoiceAdminConfig) => VoiceAdminConfig) => {
        onConfigChange(current => updater(current));
    }, [onConfigChange]);

    return (
        <div className="flex flex-col">
            <AdminViewHeader
                title="Voice Assistant"
                description="Live-Konfiguration, Tool-Freigaben und Laufzeit-Kontext"
            />

            <div className="px-6 md:px-8 py-6 space-y-5">

                {/* ── Row 1: Status + Session Config ─────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                    {/* Status — compact info list */}
                    <Section title="Status" icon={<AudioLines className="w-3.5 h-3.5 text-zinc-400" />}>
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            <InfoRow
                                label="Feature"
                                value={config.enabled ? 'Aktiv' : 'Deaktiviert'}
                                dot={config.enabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}
                            />
                            <InfoRow label="Modell" value={config.model} />
                            <InfoRow label="Stimme" value={config.voiceName} />
                            <InfoRow label="Tools aktiv" value={`${enabledToolCount} / ${config.tools.length}`} />
                            <InfoRow
                                label="Session"
                                value={diagnostics.sessionModel ? `${diagnostics.sessionModel}` : 'Keine aktive Session'}
                                dot={diagnostics.sessionModel ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}
                            />
                            {diagnostics.sessionVoice && (
                                <InfoRow label="Live-Stimme" value={diagnostics.sessionVoice} />
                            )}
                        </div>
                    </Section>

                    {/* Session config — interactive */}
                    <div className="xl:col-span-2">
                        <Section title="Session-Konfiguration" icon={<Settings2 className="w-3.5 h-3.5 text-zinc-400" />}>
                            <div className="space-y-4">
                                <SettingToggle
                                    label="Voice global aktivieren"
                                    description="Blendet den Entry in der App ein und erlaubt Session-Start."
                                    checked={config.enabled}
                                    onChange={(enabled) => updateConfig(c => ({ ...c, enabled }))}
                                />

                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block space-y-1.5">
                                        <span className="text-[11px] font-semibold text-zinc-500">Modell</span>
                                        <Input
                                            value={config.model}
                                            onChange={(e) => updateConfig(c => ({ ...c, model: e.target.value }))}
                                            placeholder={DEFAULT_VOICE_MODEL}
                                        />
                                    </label>
                                    <label className="block space-y-1.5">
                                        <span className="text-[11px] font-semibold text-zinc-500">Voice Name</span>
                                        <Input
                                            value={config.voiceName}
                                            onChange={(e) => updateConfig(c => ({ ...c, voiceName: e.target.value }))}
                                            placeholder={DEFAULT_VOICE_NAME}
                                        />
                                    </label>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <SettingToggle
                                        label="Input-Transkription"
                                        description="Was der Nutzer sagt."
                                        checked={config.inputTranscriptionEnabled}
                                        onChange={(v) => updateConfig(c => ({ ...c, inputTranscriptionEnabled: v }))}
                                    />
                                    <SettingToggle
                                        label="Output-Transkription"
                                        description="Text der Antwort."
                                        checked={config.outputTranscriptionEnabled}
                                        onChange={(v) => updateConfig(c => ({ ...c, outputTranscriptionEnabled: v }))}
                                    />
                                    <SettingToggle
                                        label="Visueller Kontext"
                                        description="Screen + Bilder an API."
                                        checked={config.visualContextEnabled}
                                        onChange={(v) => updateConfig(c => ({ ...c, visualContextEnabled: v }))}
                                    />
                                </div>
                            </div>
                        </Section>
                    </div>
                </div>

                {/* ── Row 2: Prompting ───────────────────────────── */}
                <Section
                    title="Prompting"
                    icon={<MessageSquareText className="w-3.5 h-3.5 text-zinc-400" />}
                    actions={
                        <Button
                            size="s"
                            variant="secondary"
                            icon={<RefreshCw className="w-3 h-3" />}
                            onClick={() => onConfigChange(getDefaultVoiceAdminConfig())}
                        >
                            Defaults
                        </Button>
                    }
                >
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                        <div className="space-y-3">
                            <label className="block space-y-1.5">
                                <span className="text-[11px] font-semibold text-zinc-500">System Prompt DE</span>
                                <TextArea
                                    rows={6}
                                    value={config.systemPromptDe}
                                    onChange={(e) => updateConfig(c => ({ ...c, systemPromptDe: e.target.value }))}
                                    placeholder={DEFAULT_SYSTEM_PROMPT_DE}
                                />
                            </label>
                            <label className="block space-y-1.5">
                                <span className="text-[11px] font-semibold text-zinc-500">Greeting DE</span>
                                <TextArea
                                    rows={2}
                                    value={config.greetingDe}
                                    onChange={(e) => updateConfig(c => ({ ...c, greetingDe: e.target.value }))}
                                    placeholder={DEFAULT_GREETING_DE}
                                />
                            </label>
                        </div>
                        <div className="space-y-3">
                            <label className="block space-y-1.5">
                                <span className="text-[11px] font-semibold text-zinc-500">System Prompt EN</span>
                                <TextArea
                                    rows={6}
                                    value={config.systemPromptEn}
                                    onChange={(e) => updateConfig(c => ({ ...c, systemPromptEn: e.target.value }))}
                                    placeholder={DEFAULT_SYSTEM_PROMPT_EN}
                                />
                            </label>
                            <label className="block space-y-1.5">
                                <span className="text-[11px] font-semibold text-zinc-500">Greeting EN</span>
                                <TextArea
                                    rows={2}
                                    value={config.greetingEn}
                                    onChange={(e) => updateConfig(c => ({ ...c, greetingEn: e.target.value }))}
                                    placeholder={DEFAULT_GREETING_EN}
                                />
                            </label>
                        </div>
                    </div>
                </Section>

                {/* ── Row 3: Tools ───────────────────────────────── */}
                <Section
                    title={`Tools / Fähigkeiten (${enabledToolCount}/${config.tools.length})`}
                    icon={<Wrench className="w-3.5 h-3.5 text-zinc-400" />}
                    actions={
                        <div className="flex gap-1.5">
                            <Button
                                size="s"
                                variant="secondary"
                                onClick={() => updateConfig(c => ({
                                    ...c,
                                    tools: c.tools.map(tool => ({ ...tool, enabled: true })),
                                }))}
                            >
                                Alle an
                            </Button>
                            <Button
                                size="s"
                                variant="secondary"
                                onClick={() => updateConfig(c => ({
                                    ...c,
                                    tools: c.tools.map(tool => ({ ...tool, enabled: false })),
                                }))}
                            >
                                Alle aus
                            </Button>
                        </div>
                    }
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0.5">
                        {config.tools.map(tool => (
                            <ToolToggle
                                key={tool.name}
                                name={tool.name}
                                description={TOOL_DESCRIPTIONS[tool.name] || ''}
                                checked={tool.enabled}
                                onChange={(enabled) => updateConfig(c => ({
                                    ...c,
                                    tools: c.tools.map(item => item.name === tool.name ? { ...item, enabled } : item),
                                }))}
                            />
                        ))}
                    </div>
                </Section>

                {/* ── Row 4: Context + Logs (read-only) ──────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

                    <Section title="Sichtbarer Kontext" icon={<Eye className="w-3.5 h-3.5 text-zinc-400" />}>
                        <div className="space-y-3">
                            <div>
                                <div className="text-[10px] font-semibold text-zinc-400 mb-1">App Context</div>
                                <pre className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-words font-mono bg-zinc-50 dark:bg-zinc-800/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                                    {diagnostics.appContextSummary || 'Noch kein Kontext erfasst.'}
                                </pre>
                            </div>
                            <div>
                                <div className="text-[10px] font-semibold text-zinc-400 mb-1">Visual Context · {diagnostics.visualFrameCount} Frames</div>
                                <pre className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-words font-mono bg-zinc-50 dark:bg-zinc-800/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                                    {diagnostics.visualContextSummary || 'Noch kein visueller Kontext.'}
                                </pre>
                            </div>
                        </div>
                    </Section>

                    <Section title="Laufzeit-Logs" icon={<MessageSquareText className="w-3.5 h-3.5 text-zinc-400" />}>
                        <div className="space-y-4">
                            <div>
                                <div className="text-[10px] font-semibold text-zinc-400 mb-1.5">Tool Calls</div>
                                <div className="space-y-1 max-h-52 overflow-y-auto">
                                    {diagnostics.toolCalls.length === 0 ? (
                                        <p className="text-[11px] text-zinc-400 py-3 text-center">Noch keine Tool-Calls.</p>
                                    ) : diagnostics.toolCalls.map(entry => (
                                        <div key={entry.id} className="flex items-start gap-2 py-1.5 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/30">
                                            <span className={`mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full ${entry.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">{entry.name}</span>
                                                    <span className="text-[10px] text-zinc-400 shrink-0">{formatTimestamp(entry.timestamp)}</span>
                                                </div>
                                                {entry.message && (
                                                    <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{entry.argsSummary} — {entry.message}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-semibold text-zinc-400 mb-1.5">Transkripte</div>
                                <div className="space-y-1 max-h-52 overflow-y-auto">
                                    {diagnostics.transcripts.length === 0 ? (
                                        <p className="text-[11px] text-zinc-400 py-3 text-center">Noch keine Transkripte.</p>
                                    ) : diagnostics.transcripts.map(entry => (
                                        <div key={entry.id} className="py-1.5 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/30">
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                <span className="text-[10px] font-semibold text-zinc-500">{entry.source === 'user' ? 'User' : 'Assistant'}</span>
                                                <span className="text-[10px] text-zinc-400">{formatTimestamp(entry.timestamp)}</span>
                                            </div>
                                            <p className="text-[11px] text-zinc-700 dark:text-zinc-200">{entry.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Section>
                </div>
            </div>
        </div>
    );
};
