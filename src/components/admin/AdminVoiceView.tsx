import React from 'react';
import { Check, ChevronRight, Loader2, Mic, MessageSquareText, RotateCcw, Settings2, Sparkles, Wrench, Navigation, PenTool, Upload, Monitor } from 'lucide-react';
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

// ─── Sidebar nav items ──────────────────────────────────────────────────────

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

const TOOL_GROUPS: Record<string, string[]> = {
    'tools-nav': ['open_gallery', 'go_back', 'open_stack', 'next_image', 'previous_image', 'select_image_by_index', 'select_image_by_position'],
    'tools-creative': ['set_prompt_text', 'create_variables', 'select_variable_option', 'apply_preset', 'trigger_generation'],
    'tools-create': ['open_create', 'open_create_new', 'open_upload', 'set_aspect_ratio', 'set_quality'],
    'tools-edit': ['open_presets', 'open_reference_image_picker', 'start_annotation_mode', 'repeat_current_image'],
    'tools-system': ['get_app_context', 'stop_voice_mode', 'download_current_image', 'open_settings'],
};

// ─── Small reusable components ──────────────────────────────────────────────

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
    <div className="flex items-center justify-between gap-6 py-3.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
        <div className="min-w-0">
            <div className="text-sm text-zinc-800 dark:text-zinc-200">{label}</div>
            {hint && <div className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{hint}</div>}
        </div>
        <div className="shrink-0">{children}</div>
    </div>
);

// ─── Tool row inside a tools section ────────────────────────────────────────

const ToolRow: React.FC<{
    tool: VoiceAdminConfig['tools'][0];
    isSelected: boolean;
    onSelect: () => void;
    onToggle: () => void;
}> = ({ tool, isSelected, onSelect, onToggle }) => {
    const hasCustom = !!tool.description;
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors rounded-lg ${isSelected ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}
        >
            <div
                role="checkbox"
                aria-checked={tool.enabled}
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className={`shrink-0 h-4 w-4 rounded-[4px] border-2 flex items-center justify-center transition-colors cursor-pointer ${tool.enabled ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white' : 'border-zinc-300 dark:border-zinc-600'}`}
            >
                {tool.enabled && <Check className="w-2.5 h-2.5 text-white dark:text-zinc-900" />}
            </div>
            <span className={`text-xs font-mono flex-1 truncate ${tool.enabled ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}`}>{tool.name}</span>
            {hasCustom && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" title="Angepasst" />}
            <ChevronRight className={`shrink-0 w-3.5 h-3.5 ${isSelected ? 'text-zinc-400' : 'text-zinc-200 dark:text-zinc-700'}`} />
        </button>
    );
};

// ─── Main view ──────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved';

export const AdminVoiceView: React.FC<AdminVoiceViewProps> = ({ t, config, diagnostics, onConfigChange }) => {
    const [activeSection, setActiveSection] = React.useState<SectionId>('general');
    const [selectedTool, setSelectedTool] = React.useState<string | null>(null);
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

    const selectedToolData = selectedTool ? config.tools.find(t => t.name === selectedTool) ?? null : null;
    const selectedToolDesc = selectedToolData?.description ?? DEFAULT_TOOL_DESCRIPTIONS[selectedTool ?? ''] ?? '';
    const selectedToolIsDefault = !selectedToolData?.description;
    const isToolSection = activeSection.startsWith('tools-');

    // When switching to a tool section, auto-select first tool
    React.useEffect(() => {
        if (isToolSection) {
            const group = TOOL_GROUPS[activeSection];
            if (group) {
                const first = group.find(name => config.tools.some(t => t.name === name));
                if (first) setSelectedTool(first);
            }
        }
    }, [activeSection, isToolSection, config.tools]);

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

    // ── Render the content for the active section ──

    const renderContent = () => {
        switch (activeSection) {
            case 'general':
                return (
                    <div className="space-y-1">
                        <SettingRow label="Voice aktivieren" hint="Blendet den Mikrofon-Button ein">
                            <Toggle checked={config.enabled} onChange={() => updateConfig(c => ({ ...c, enabled: !c.enabled }))} />
                        </SettingRow>
                        <SettingRow label="Modell">
                            <Input value={config.model} onChange={(e) => updateConfig(c => ({ ...c, model: e.target.value }))} placeholder={DEFAULT_VOICE_MODEL} className="w-56 text-right" />
                        </SettingRow>
                        <SettingRow label="Stimme">
                            <select
                                value={config.voiceName}
                                onChange={(e) => updateConfig(c => ({ ...c, voiceName: e.target.value }))}
                                className="w-44 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm text-right"
                            >
                                {GEMINI_LIVE_VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                                {!GEMINI_LIVE_VOICES.includes(config.voiceName as any) && (
                                    <option value={config.voiceName}>{config.voiceName}</option>
                                )}
                            </select>
                        </SettingRow>
                        <SettingRow label="Temperature" hint="Höher = kreativer, niedriger = präziser">
                            <div className="flex items-center gap-3">
                                <input
                                    type="range" min={0} max={2} step={0.1}
                                    value={config.temperature ?? 1.1}
                                    onChange={(e) => updateConfig(c => ({ ...c, temperature: parseFloat(e.target.value) }))}
                                    className="w-32 accent-orange-500"
                                />
                                <span className="text-xs text-zinc-500 tabular-nums w-8 text-right">{config.temperature ?? 1.1}</span>
                            </div>
                        </SettingRow>
                        <SettingRow label="Thinking Level" hint="Wie gründlich die AI nachdenkt bevor sie spricht">
                            <select
                                value={config.thinkingLevel ?? 'minimal'}
                                onChange={(e) => updateConfig(c => ({ ...c, thinkingLevel: e.target.value as any }))}
                                className="w-36 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm text-right"
                            >
                                <option value="none">None</option>
                                <option value="minimal">Minimal</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </SettingRow>
                        <SettingRow label="Nutzer-Transkript" hint="Gesprochenen Text des Nutzers mitloggen">
                            <Toggle checked={config.inputTranscriptionEnabled} onChange={() => updateConfig(c => ({ ...c, inputTranscriptionEnabled: !c.inputTranscriptionEnabled }))} />
                        </SettingRow>
                        <SettingRow label="KI-Antworttext" hint="KI-Antworten als Text transkribieren">
                            <Toggle checked={config.outputTranscriptionEnabled} onChange={() => updateConfig(c => ({ ...c, outputTranscriptionEnabled: !c.outputTranscriptionEnabled }))} />
                        </SettingRow>
                        <SettingRow label="Bilder senden" hint="Thumbnails der aktuellen Bilder an die KI senden">
                            <Toggle checked={config.visualContextEnabled} onChange={() => updateConfig(c => ({ ...c, visualContextEnabled: !c.visualContextEnabled }))} />
                        </SettingRow>
                    </div>
                );

            case 'prompt':
                return (
                    <div className="space-y-6">
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
                            <p className="text-xs text-zinc-400">Sprache wird automatisch erkannt — ein Prompt reicht für DE und EN.</p>
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
                            <p className="text-xs text-zinc-400">KI generiert daraus bei jedem Session-Start eine leicht variierte Begrüßung.</p>
                        </label>
                    </div>
                );

            default:
                if (!isToolSection) return null;
                const toolNames = TOOL_GROUPS[activeSection] || [];
                const tools = toolNames.map(name => config.tools.find(t => t.name === name)).filter(Boolean) as VoiceAdminConfig['tools'];
                const enabledCount = tools.filter(t => t.enabled).length;

                return (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs text-zinc-400">{enabledCount} von {tools.length} aktiv</p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-0 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden bg-zinc-50/50 dark:bg-zinc-800/20">
                            {/* Tool list */}
                            <div className="border-b lg:border-b-0 lg:border-r border-zinc-100 dark:border-zinc-800 py-1.5 overflow-y-auto max-h-[400px]">
                                {tools.map(tool => (
                                    <ToolRow
                                        key={tool.name}
                                        tool={tool}
                                        isSelected={selectedTool === tool.name}
                                        onSelect={() => setSelectedTool(tool.name)}
                                        onToggle={() => updateConfig(c => ({ ...c, tools: c.tools.map(t => t.name === tool.name ? { ...t, enabled: !t.enabled } : t) }))}
                                    />
                                ))}
                            </div>
                            {/* Tool detail */}
                            <div className="p-5">
                                {selectedTool && tools.some(t => t.name === selectedTool) ? (
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">{selectedTool}</div>
                                                <div className="text-[11px] text-zinc-400 mt-1">{selectedToolIsDefault ? 'Standard' : 'Angepasst'}</div>
                                            </div>
                                            {!selectedToolIsDefault && (
                                                <button type="button" onClick={() => updateConfig(c => ({ ...c, tools: c.tools.map(t => t.name === selectedTool ? { ...t, description: undefined } : t) }))} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                                                    <RotateCcw className="w-3 h-3" /> Reset
                                                </button>
                                            )}
                                        </div>
                                        <TextArea
                                            rows={7}
                                            value={selectedToolDesc}
                                            onChange={(e) => updateConfig(c => ({ ...c, tools: c.tools.map(t => t.name === selectedTool ? { ...t, description: e.target.value } : t) }))}
                                            className="font-mono text-xs"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-sm text-zinc-400">Tool auswählen</div>
                                )}
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="flex flex-col min-h-0 h-full">
            <AdminViewHeader title="Voice Assistant" actions={headerActions} />

            <div className="flex flex-1 min-h-0">
                {/* ── Left: macOS-style sidebar ── */}
                <div className="hidden md:block w-56 shrink-0 border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto py-4 px-3">
                    {(() => {
                        let lastGroup: string | undefined;
                        return NAV_ITEMS.map(item => {
                            const showGroup = item.group && item.group !== lastGroup;
                            lastGroup = item.group;
                            const isActive = activeSection === item.id;
                            return (
                                <React.Fragment key={item.id}>
                                    {showGroup && (
                                        <div className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 first:pt-0">
                                            {item.group}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection(item.id)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                                            isActive
                                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                                        }`}
                                    >
                                        <span className={isActive ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}>{item.icon}</span>
                                        {item.label}
                                    </button>
                                </React.Fragment>
                            );
                        });
                    })()}
                </div>

                {/* ── Mobile: horizontal tab bar ── */}
                <div className="md:hidden border-b border-zinc-100 dark:border-zinc-800 px-4 py-2 flex gap-1 overflow-x-auto w-full shrink-0">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveSection(item.id)}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                activeSection === item.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'text-zinc-400 hover:text-zinc-700'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* ── Right: content area ── */}
                <div className="flex-1 min-w-0 overflow-y-auto">
                    <div className="max-w-2xl px-8 py-8">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
                            {NAV_ITEMS.find(n => n.id === activeSection)?.label}
                        </h2>
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};
