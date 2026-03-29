import type { VoiceAdminConfig, VoiceDiagnostics, VoiceAdminToolConfig } from '@/types';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'expose_voice_admin_config_v1';
const DB_KEY = 'voice-assistant';

export const DEFAULT_VOICE_MODEL = 'gemini-3.1-flash-live-preview';
export const DEFAULT_VOICE_NAME = 'Charon';

export const DEFAULT_SYSTEM_PROMPT_DE = 'Du bist Exposé, Sprachassistent einer KI-Bildgenerator-App. Navigation: Galerie (L1) -> Stapel (L2) -> Detailansicht (L3). Nutze Begriffe "Galerie", "Stapel", "Detailansicht" konsistent. Sprich knapp. Aktionen: Vor/Zurück navigiert linear. "Zurück" (go_back) geht Ebene höher. Nutze Funktionen still. Prompts kurz & pragmatisch. Bei Edits nur Änderung beschreiben. VARIABLEN vs PROMPT: Nutze `set_prompt_text` für direkte, gezielte Korrekturen (z.B. "Hintergrund blau"). Nutze `create_variables` NUR wenn der Nutzer nach "Optionen", "Variationen", "Vorschlägen" oder "Möglichkeiten" fragt, um kreative Chips (Stil, Licht, Stimmung) zum Probieren anzubieten. Nie eigenständig generieren — erst Prompt/Variablen setzen, kurz begründen, auf Kommando generieren.';
export const DEFAULT_SYSTEM_PROMPT_EN = 'You are Exposé, voice assistant of an AI image generation app. Hierarchy: Gallery (L1) -> Stack (2) -> Detail View (L3). Use these terms consistently. Speak briefly. Next/Prev navigates within context. "Back" (go_back) goes up one level. Use functions silently. Prompts short and pragmatic. VARIABLES vs PROMPT: Use `set_prompt_text` for direct, specific edits (e.g. "make background blue"). Use `create_variables` ONLY when the user asks for "options", "variations", "suggestions" or "possibilities" to provide creative chips (Style, Lighting, Mood) for exploration. Never generate on your own — set prompt/variables, briefly explain, generate only on command.';
export const DEFAULT_GREETING_DE = 'Begrüße den Nutzer als Exposé. Sage sinngemäß: "Willkommen bei Exposé. Möchtest du ein Bild hochladen, bearbeiten oder etwas Neues erstellen?" Variiere leicht, halte es kurz.';
export const DEFAULT_GREETING_EN = 'Greet the user as Exposé. Say: "Welcome to Exposé. Upload, edit, or create something new?" Vary slightly, keep it brief.';

export const DEFAULT_VOICE_TOOL_NAMES = [
    'get_app_context',
    'open_gallery',
    'open_create',
    'open_settings',
    'enter_multi_select',
    'leave_multi_select',
    'repeat_current_image',
    'download_current_image',
    'open_presets',
    'open_reference_image_picker',
    'start_annotation_mode',
    'open_create_new',
    'open_upload',
    'set_prompt_text',
    'trigger_generation',
    'next_image',
    'previous_image',
    'go_back',
    'stop_voice_mode',
    'set_aspect_ratio',
    'open_stack',
    'highlight_image',
    'toggle_image_selection',
    'create_variables',
    'select_variable_option',
    'set_quality',
    'select_image_by_index',
    'select_image_by_position'
] as const;

function buildDefaultTools(): VoiceAdminToolConfig[] {
    return DEFAULT_VOICE_TOOL_NAMES.map(name => ({ name, enabled: true }));
}

export function getDefaultVoiceAdminConfig(): VoiceAdminConfig {
    return {
        enabled: true,
        model: DEFAULT_VOICE_MODEL,
        voiceName: DEFAULT_VOICE_NAME,
        inputTranscriptionEnabled: true,
        outputTranscriptionEnabled: true,
        visualContextEnabled: true,
        systemPromptDe: DEFAULT_SYSTEM_PROMPT_DE,
        systemPromptEn: DEFAULT_SYSTEM_PROMPT_EN,
        greetingDe: DEFAULT_GREETING_DE,
        greetingEn: DEFAULT_GREETING_EN,
        tools: buildDefaultTools(),
    };
}

export function loadVoiceAdminConfig(): VoiceAdminConfig {
    if (typeof window === 'undefined') return getDefaultVoiceAdminConfig();

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return getDefaultVoiceAdminConfig();

        const parsed = JSON.parse(raw) as Partial<VoiceAdminConfig>;
        const defaults = getDefaultVoiceAdminConfig();
        const storedTools = new Map((parsed.tools || []).map(tool => [tool.name, !!tool.enabled]));

        return {
            ...defaults,
            ...parsed,
            tools: DEFAULT_VOICE_TOOL_NAMES.map(name => ({
                name,
                enabled: storedTools.has(name) ? !!storedTools.get(name) : true,
            })),
        };
    } catch {
        return getDefaultVoiceAdminConfig();
    }
}

export function saveVoiceAdminConfig(config: VoiceAdminConfig) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export async function fetchVoiceAdminConfig(): Promise<VoiceAdminConfig> {
    const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', DB_KEY)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data?.value) {
        return loadVoiceAdminConfig();
    }

    const defaults = getDefaultVoiceAdminConfig();
    const parsed = data.value as Partial<VoiceAdminConfig>;
    const storedTools = new Map((parsed.tools || []).map(tool => [tool.name, !!tool.enabled]));

    const resolved: VoiceAdminConfig = {
        ...defaults,
        ...parsed,
        tools: DEFAULT_VOICE_TOOL_NAMES.map(name => ({
            name,
            enabled: storedTools.has(name) ? !!storedTools.get(name) : true,
        })),
    };

    saveVoiceAdminConfig(resolved);
    return resolved;
}

export async function updateVoiceAdminConfig(config: VoiceAdminConfig) {
    saveVoiceAdminConfig(config);

    const { error } = await supabase
        .from('app_settings')
        .upsert({
            key: DB_KEY,
            value: config,
            updated_at: new Date().toISOString(),
        });

    if (error) {
        throw error;
    }
}

export function getEmptyVoiceDiagnostics(): VoiceDiagnostics {
    return {
        sessionModel: null,
        sessionVoice: null,
        appContextSummary: null,
        visualContextSummary: null,
        visualFrameCount: 0,
        toolCalls: [],
        transcripts: [],
    };
}
