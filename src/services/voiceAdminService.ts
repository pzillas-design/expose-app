import type { VoiceAdminConfig, VoiceDiagnostics, VoiceAdminToolConfig, VoiceToolCallLog, VoiceTranscriptLog } from '@/types';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'expose_voice_admin_config_v2';
const DB_KEY = 'voice-assistant';

export const DEFAULT_VOICE_MODEL = 'gemini-3.1-flash-live-preview';
export const DEFAULT_VOICE_NAME = 'Enceladus';

export const GEMINI_LIVE_VOICES = [
    'Aoede', 'Charon', 'Enceladus', 'Fenrir', 'Kore',
    'Leda', 'Orus', 'Puck', 'Zephyr', 'Sulafat',
] as const;

export const DEFAULT_SYSTEM_PROMPT = `You are Exposé — AI art director and retouching pro. Think like a senior retoucher: lighting mood, contrast, color palette, composition, depth of field — you know what elevates images.

STYLE: Brief, concrete. Don't ask "what do you want?" — suggest instead. Never read back the prompt, just briefly explain the creative idea.

CONTEXT: You receive the current app state at session start. Call get_app_context if you need a refresh (e.g. after navigation or if context seems stale).

VARIABLES: Automatically create 2-4 variables with each edit suggestion (mood, intensity, style, color tone etc.) so the user can choose between directions.

PRESETS: When an installed preset fits the request, use its prompt as a base.

WORKFLOW: Set prompt + variables → briefly explain → generate only on command.

NAVIGATION: When the user asks to edit an image, use the currentImageId from context. If currentImageId is set, you are already in detail view — use previous_image / next_image to navigate. If in gallery, use select_image_by_index.`;

export const DEFAULT_GREETING = `Greet the user as Exposé. Say something like "Welcome to Exposé. Want to edit an image, create something new, or upload?" — vary slightly, keep it brief. Respond in the session language.`;

export const DEFAULT_TOOL_DESCRIPTIONS: Record<string, string> = {
    get_app_context: "Read current screen state, available actions, and the user's installed presets/templates. Call this first to understand context before suggesting edits. Note: after navigation, prefer the newContext field from the navigation response for the most current state.",
    open_gallery: 'Go to the main gallery/feed view (Level 1).',
    open_create: 'Open the create/generate view.',
    open_settings: 'Open the settings dialog.',
    repeat_current_image: 'Generate more variations from the currently open image.',
    download_current_image: 'Download the currently viewed image. Opens a download dialog so the user can save it.',
    open_presets: 'Open prompt presets inside the current editing panel.',
    open_reference_image_picker: 'Open the reference image picker in the current editing panel.',
    start_annotation_mode: 'Activate image annotation mode in the current editing panel.',
    open_create_new: 'Open the create page in creation mode with aspect ratio selection, ready for a new image.',
    open_upload: 'Open the file upload dialog so the user can upload a BRAND NEW image from their device. Use ONLY when the user explicitly says "upload", "import", or wants to add a new file from their device. NEVER use this when the user wants to edit an existing image already in the gallery — instead ask which image they mean.',
    set_prompt_text: "Write a prompt for image generation or editing. Write in the user's language. For edits: describe ONLY the desired change, never the current state. Keep prompts short and professional.",
    trigger_generation: 'PROTECTED: Start image generation. ONLY call this when the user explicitly says "generiere", "generate", "los", "start generation" or similar direct command. NEVER call this automatically after writing a prompt — always present the prompt first and wait for the user to confirm or ask to generate.',
    next_image: 'Navigate to the next image in the current stack or gallery.',
    previous_image: 'Navigate to the previous image in the current stack or gallery.',
    go_back: 'Go back to the previous view — like pressing the back/chevron button in the header. From detail view goes to stack, from stack goes to gallery.',
    stop_voice_mode: 'End the voice assistant session and stop listening.',
    set_aspect_ratio: 'Set the aspect ratio for a new image on the create page. Available ratios: 16:9, 4:3, 1:1, 3:4, 9:16.',
    open_stack: 'Navigate to the stack/group view of the current image. Shows all versions and variations of the image in the feed grid.',
    create_variables: 'Create variable controls so the user can explore creative directions. Call this proactively with every edit suggestion — 2-4 variables with 3-4 options each (e.g. Mood, Intensity, Style, Color). The user clicks options to fine-tune before generating.',
    select_variable_option: 'Toggle a variable option on or off. Use when the user says which option to activate or deactivate.',
    set_quality: 'Set the generation quality/resolution. Available: "0.5k" (512px, fastest, 0.05€), "1k" (1024px, fast, 0.10€), "2k" (2048px, fast, 0.20€), "4k" (4096px, fast, 0.40€).',
    select_image_by_index: 'Open the image at a specific numeric index in the current gallery or stack (1-based index).',
    select_image_by_position: 'Open the image at a specific grid position (row and column, both 1-based).',
};

export const DEFAULT_VOICE_TOOL_NAMES = [
    'get_app_context',
    'open_gallery',
    'open_create',
    'open_settings',
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
    'create_variables',
    'select_variable_option',
    'set_quality',
    'select_image_by_index',
    'select_image_by_position',
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
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        greeting: DEFAULT_GREETING,
        tools: buildDefaultTools(),
    };
}

function migrateConfig(parsed: any): Partial<VoiceAdminConfig> {
    // Migrate from old DE/EN split format
    const out: any = { ...parsed };
    if (!out.systemPrompt && out.systemPromptDe) out.systemPrompt = out.systemPromptDe;
    if (!out.greeting && out.greetingDe) out.greeting = out.greetingDe;
    // Clean up old keys
    delete out.systemPromptDe;
    delete out.systemPromptEn;
    delete out.greetingDe;
    delete out.greetingEn;
    return out;
}

function resolveConfig(parsed: any): VoiceAdminConfig {
    const migrated = migrateConfig(parsed);
    const defaults = getDefaultVoiceAdminConfig();
    const storedTools = new Map((migrated.tools || []).map((t: any) => [t.name, { enabled: !!t.enabled, description: t.description }]));

    return {
        ...defaults,
        ...migrated,
        tools: DEFAULT_VOICE_TOOL_NAMES.map(name => {
            const stored = storedTools.get(name);
            return {
                name,
                enabled: stored ? stored.enabled : true,
                ...(stored?.description ? { description: stored.description } : {}),
            };
        }),
    };
}

export function loadVoiceAdminConfig(): VoiceAdminConfig {
    if (typeof window === 'undefined') return getDefaultVoiceAdminConfig();
    try {
        // Try new key first, then old key for migration
        const raw = window.localStorage.getItem(STORAGE_KEY)
            ?? window.localStorage.getItem('expose_voice_admin_config_v1');
        if (!raw) return getDefaultVoiceAdminConfig();
        return resolveConfig(JSON.parse(raw));
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

    if (error) throw error;
    if (!data?.value) return loadVoiceAdminConfig();

    const resolved = resolveConfig(data.value);
    saveVoiceAdminConfig(resolved);
    return resolved;
}

export async function updateVoiceAdminConfig(config: VoiceAdminConfig) {
    saveVoiceAdminConfig(config);
    const { error } = await supabase
        .from('app_settings')
        .upsert({ key: DB_KEY, value: config, updated_at: new Date().toISOString() });
    if (error) throw error;
}

const LOGS_STORAGE_KEY = 'expose_voice_logs_v2'; // v2: sessionId added to all log entries
const MAX_LOG_ENTRIES = 100;

export function loadVoiceLogs(): { toolCalls: VoiceToolCallLog[]; transcripts: VoiceTranscriptLog[] } {
    if (typeof window === 'undefined') return { toolCalls: [], transcripts: [] };
    try {
        const raw = window.localStorage.getItem(LOGS_STORAGE_KEY);
        if (!raw) return { toolCalls: [], transcripts: [] };
        return JSON.parse(raw);
    } catch {
        return { toolCalls: [], transcripts: [] };
    }
}

export function saveVoiceLogs(toolCalls: VoiceToolCallLog[], transcripts: VoiceTranscriptLog[]) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify({
            toolCalls: toolCalls.slice(0, MAX_LOG_ENTRIES),
            transcripts: transcripts.slice(0, MAX_LOG_ENTRIES),
        }));
    } catch { /* quota exceeded */ }
}

export function clearVoiceLogsStorage() {
    if (typeof window === 'undefined') return;
    try { window.localStorage.removeItem(LOGS_STORAGE_KEY); } catch { /* ignore */ }
}

/** Fire-and-forget: persist a tool-call log entry to Supabase for remote debugging. */
export async function persistToolCallLog(entry: VoiceToolCallLog): Promise<void> {
    try {
        await supabase.from('voice_logs').insert({
            id: entry.id,
            session_id: entry.sessionId,
            kind: 'tool_call',
            tool_name: entry.name,
            tool_status: entry.status,
            args_summary: entry.argsSummary,
            result_message: entry.message,
            context_snapshot: entry.contextSnapshot ?? null,
            ts: entry.timestamp,
        });
    } catch { /* non-critical — local state is source of truth */ }
}

/** Fire-and-forget: persist a transcript log entry to Supabase for remote debugging. */
export async function persistTranscriptLog(entry: VoiceTranscriptLog): Promise<void> {
    try {
        await supabase.from('voice_logs').insert({
            id: entry.id,
            session_id: entry.sessionId,
            kind: 'transcript',
            source: entry.source,
            text: entry.text,
            ts: entry.timestamp,
        });
    } catch { /* non-critical */ }
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
