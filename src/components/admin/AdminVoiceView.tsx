import React from 'react';
import { Check, Loader2, MessageSquareText, RotateCcw, Settings2, Sparkles, Navigation, PenTool, Upload, Monitor } from 'lucide-react';
import { AdminViewHeader } from './AdminViewHeader';
import { TranslationFunction, VoiceAdminConfig, VoiceDiagnostics } from '@/types';
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

// ─── Sidebar nav ────────────────────────────────────────────────────────────

type SectionId = 'general' | 'prompt' | 'tools-nav' | 'tools-creative' | 'tools-create' | 'tools-edit' | 'tools-system';

const NAV_ITEMS: Array<{ id: SectionId; label: string; icon: React.ReactNode; group?: string }> = [
    { id: 'general', label: 'Allgemein', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'prompt', label: 'Prompt & Begrüßung', icon: <MessageSquareText className="w-4 h-4" /> },
    { id: 'tools-nav', label: 'Navigation', icon: <Navigation className="w-4 h-4" />, group: 'Tools' },
    { id: 'tools-creative', label: 'Kreativ-Workflow', icon: <Sparkles className="w-4 h-4" />, group: 'Tools' },
    { id: 'tools-create', label: 'Erstellen & Upload', icon: <Upload className="w-4 h-4" />, group: 'Tools' },
    { id: 'tools-edit', label: 'Bearbeitung', icon: <PenTool className="w-4 h-4" />, group: 'Tools' },
    { id: 'tools-system', label: 'System', icon: <Monitor className="w-4 h-4" />, group: 'Tools' },
];

const TOOL_GROUPS: Record<string, { tools: string[]; hint: string }> = {
    'tools-nav': {
        tools: ['open_gallery', 'go_back', 'open_stack', 'next_image', 'previous_image', 'select_image_by_index', 'select_image_by_position'],
        hint: 'Navigation zwischen Galerie, Stapeln und Bildern. Die AI kann diese Tools jederzeit aufrufen um dem User durch die App zu navigieren.',
    },
    'tools-creative': {
        tools: ['set_prompt_text', 'create_variables', 'select_variable_option', 'apply_preset', 'trigger_generation'],
        hint: 'Der kreative Kern — Prompt schreiben, Variablen erstellen, Presets anwenden und Generierung starten. Die AI nutzt diese im Detail- und Erstellen-View.',
    },
    'tools-create': {
        tools: ['open_create', 'open_create_new', 'open_upload', 'set_aspect_ratio', 'set_quality'],
        hint: 'Neue Bilder erstellen, hochladen, Format und Qualität einstellen. Verfügbar wenn der User etwas Neues starten will.',
    },
    'tools-edit': {
        tools: ['open_presets', 'open_reference_image_picker', 'start_annotation_mode', 'repeat_current_image'],
        hint: 'Erweiterte Bearbeitungsfunktionen — Vorlagen, Referenzbilder, Anmerkungen und Varianten. Im Detail-View verfügbar.',
    },
    'tools-system': {
        tools: ['get_app_context', 'stop_voice_mode', 'download_current_image', 'open_settings'],
        hint: 'Systeminterne Tools — App-Status abrufen, Session beenden, Download und Einstellungen.',
    },
};

// ─── Small components ───────────────────────────────────────────────────────

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}
    >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

const SettingRow: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
        <div className="min-w-0 flex-1">
            <div className="text-sm text-zinc-800 dark:text-zinc-200">{label}</div>
            {hint && <div className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{hint}</div>}
        </div>
        <div className="shrink-0">{children}</div>
    </div>
);

// ─── Inline tool card ───────────────────────────────────────────────────────

const ToolCard: React.FC<{
    tool: VoiceAdminConfig['tools'][0];
    onDescChange: (desc: string) => void;
}> = ({ tool, onDescChange }) => {
    const desc = tool.description ?? DEFAULT_TOOL_DESCRIPTIONS[tool.name] ?? '';
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Auto-grow textarea to fit content
    React.useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, [desc]);

    return (
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 px-4 py-3.5 space-y-2">
            <div className="text-[13px] font-mono font-medium text-zinc-700 dark:text-zinc-200">{tool.name}</div>
            <textarea
                ref={textareaRef}
                value={desc}
                onChange={(e) => {
                    onDescChange(e.target.value);
                    // Auto-grow on input
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                className="w-full bg-transparent text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed resize-none focus:outline-none focus:text-zinc-700 dark:focus:text-zinc-200 placeholder:text-zinc-300"
                placeholder="Beschreibung..."
            />
        </div>
    );
};

// ─── Main view ──────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved';

export const AdminVoiceView: React.FC<AdminVoiceViewProps> = ({ t, config, diagnostics, onConfigChange }) => {
    const [activeSection, setActiveSection] = React.useState<SectionId>('general');
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
        } catch { setSaveState('idle'); }
    }, [config]);

    const isToolSection = activeSection.startsWith('tools-');

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

    const renderContent = () => {
        switch (activeSection) {
            case 'general':
                return (
                    <div>
                        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">Grundeinstellungen für den Voice-Assistenten — Modell, Stimme und Verhalten.</p>
                        <div className="space-y-1">
                            <SettingRow label="Voice aktivieren" hint="Zeigt den Mikrofon-Button in der App">
                                <Toggle checked={config.enabled} onChange={() => updateConfig(c => ({ ...c, enabled: !c.enabled }))} />
                            </SettingRow>
                            <SettingRow label="Modell">
                                <Input value={config.model} onChange={(e) => updateConfig(c => ({ ...c, model: e.target.value }))} placeholder={DEFAULT_VOICE_MODEL} className="w-48 text-right text-xs" />
                            </SettingRow>
                            <SettingRow label="Stimme">
                                <select
                                    value={config.voiceName}
                                    onChange={(e) => updateConfig(c => ({ ...c, voiceName: e.target.value }))}
                                    className="w-40 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
                                >
                                    {GEMINI_LIVE_VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                                    {!GEMINI_LIVE_VOICES.includes(config.voiceName as any) && <option value={config.voiceName}>{config.voiceName}</option>}
                                </select>
                            </SettingRow>
                            <SettingRow label="Temperature" hint="Höher = kreativer">
                                <div className="flex items-center gap-3">
                                    <input type="range" min={0} max={2} step={0.1} value={config.temperature ?? 1.1} onChange={(e) => updateConfig(c => ({ ...c, temperature: parseFloat(e.target.value) }))} className="w-28 accent-orange-500" />
                                    <span className="text-xs text-zinc-500 tabular-nums w-7 text-right">{config.temperature ?? 1.1}</span>
                                </div>
                            </SettingRow>
                            <SettingRow label="Thinking Level" hint="Wie gründlich die AI nachdenkt">
                                <select
                                    value={config.thinkingLevel ?? 'minimal'}
                                    onChange={(e) => updateConfig(c => ({ ...c, thinkingLevel: e.target.value as any }))}
                                    className="w-32 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm"
                                >
                                    <option value="none">None</option>
                                    <option value="minimal">Minimal</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </SettingRow>
                            <SettingRow label="Nutzer-Transkript" hint="Gesprochenen Text mitloggen">
                                <Toggle checked={config.inputTranscriptionEnabled} onChange={() => updateConfig(c => ({ ...c, inputTranscriptionEnabled: !c.inputTranscriptionEnabled }))} />
                            </SettingRow>
                            <SettingRow label="KI-Antworttext" hint="KI-Antworten transkribieren">
                                <Toggle checked={config.outputTranscriptionEnabled} onChange={() => updateConfig(c => ({ ...c, outputTranscriptionEnabled: !c.outputTranscriptionEnabled }))} />
                            </SettingRow>
                            <SettingRow label="Bilder senden" hint="Thumbnails an die KI senden">
                                <Toggle checked={config.visualContextEnabled} onChange={() => updateConfig(c => ({ ...c, visualContextEnabled: !c.visualContextEnabled }))} />
                            </SettingRow>
                        </div>
                    </div>
                );

            case 'prompt':
                return (
                    <div>
                        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">Persönlichkeit und Verhalten der AI. Sprache wird automatisch erkannt — ein Prompt deckt DE und EN ab.</p>
                        <div className="space-y-8">
                            <label className="block space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">System Prompt</span>
                                    {config.systemPrompt !== DEFAULT_SYSTEM_PROMPT && (
                                        <button type="button" onClick={() => updateConfig(c => ({ ...c, systemPrompt: DEFAULT_SYSTEM_PROMPT }))} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                                            <RotateCcw className="w-3 h-3" /> Reset
                                        </button>
                                    )}
                                </div>
                                <TextArea rows={14} value={config.systemPrompt} onChange={(e) => updateConfig(c => ({ ...c, systemPrompt: e.target.value }))} placeholder={DEFAULT_SYSTEM_PROMPT} className="font-mono text-xs" />
                            </label>
                            <label className="block space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Begrüßung</span>
                                    {config.greeting !== DEFAULT_GREETING && (
                                        <button type="button" onClick={() => updateConfig(c => ({ ...c, greeting: DEFAULT_GREETING }))} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                                            <RotateCcw className="w-3 h-3" /> Reset
                                        </button>
                                    )}
                                </div>
                                <TextArea rows={4} value={config.greeting} onChange={(e) => updateConfig(c => ({ ...c, greeting: e.target.value }))} placeholder={DEFAULT_GREETING} />
                                <p className="text-xs text-zinc-400">Die AI variiert den Wortlaut bei jedem Session-Start leicht.</p>
                            </label>
                        </div>
                    </div>
                );

            default: {
                if (!isToolSection) return null;
                const group = TOOL_GROUPS[activeSection];
                if (!group) return null;
                const tools = group.tools.map(name => config.tools.find(t => t.name === name)).filter(Boolean) as VoiceAdminConfig['tools'];
                const enabledCount = tools.filter(t => t.enabled).length;

                return (
                    <div>
                        <p className="text-xs text-zinc-400 mb-2 leading-relaxed">{group.hint}</p>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 mt-4">
                            {tools.map(tool => (
                                <ToolCard
                                    key={tool.name}
                                    tool={tool}
                                    onDescChange={(desc) => updateConfig(c => ({ ...c, tools: c.tools.map(t => t.name === tool.name ? { ...t, description: desc } : t) }))}
                                />
                            ))}
                        </div>
                    </div>
                );
            }
        }
    };

    return (
        <div className="flex flex-col min-h-0 h-full">
            <AdminViewHeader title="Voice Assistant" actions={headerActions} />

            {/* Mobile: horizontal scroll tabs */}
            <div className="md:hidden border-b border-zinc-100 dark:border-zinc-800 px-4 py-2 flex gap-1 overflow-x-auto">
                {NAV_ITEMS.map(item => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveSection(item.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeSection === item.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'text-zinc-400 hover:text-zinc-700'}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Desktop sidebar */}
                <nav className="hidden md:flex flex-col w-52 shrink-0 border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto py-4 px-3">
                    {(() => {
                        let lastGroup: string | undefined;
                        return NAV_ITEMS.map(item => {
                            const showGroup = item.group && item.group !== lastGroup;
                            lastGroup = item.group;
                            const isActive = activeSection === item.id;
                            return (
                                <React.Fragment key={item.id}>
                                    {showGroup && (
                                        <div className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{item.group}</div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection(item.id)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${isActive ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}
                                    >
                                        <span className={isActive ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}>{item.icon}</span>
                                        {item.label}
                                    </button>
                                </React.Fragment>
                            );
                        });
                    })()}
                </nav>

                {/* Content */}
                <div className="flex-1 min-w-0 overflow-y-auto">
                    <div className="max-w-3xl px-6 md:px-10 py-6 md:py-10">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5">
                            {NAV_ITEMS.find(n => n.id === activeSection)?.label}
                        </h2>
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};
