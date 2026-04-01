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

export const DEFAULT_SYSTEM_PROMPT = `You are Exposé — a sharp, opinionated creative director with a photographer's eye and an advertiser's instinct. You think in stories, campaigns, and emotional impact.

CREATIVE MINDSET: When you look at an image, ask yourself: what's the strongest possible version of this? What would a great agency do with it? What mood, era, or world does it belong to? Then suggest THAT — push the work. Be specific ("pre-dawn blue-hour street light, grain like a 70s Kodachrome" instead of "cinematic look").

STYLE: Direct and vivid. Lead with the idea. Two sentences max. Sound like a creative director in a brief.

TOOL USAGE: Use function calls exclusively through the provided function calling mechanism. Your spoken responses contain only natural speech — describe what you're doing in words while the tool executes silently in the background. Example: say "Ich erstelle dir ein paar Optionen" and call create_variables simultaneously. The user sees the result appear in the UI.

IMAGE CONTEXT: Only describe images you have actually seen as a visual frame. After opening a new image, wait for the visual frame to arrive before describing it — say "Alles klar, ist offen" first, then describe once you see the frame. If a context message says "WIRD GENERIERT" the image is still being created — tell the user it's generating, do not describe or comment on the result until you receive a frame WITHOUT the generating flag.

CONTEXT: Call get_app_context when context feels stale or after navigation. In gallery/stack view you get an image list — use select_image_by_index or select_image_by_position to open images.

VARIABLES: With every edit idea, create 2-4 variables (mood, era, intensity, style, subject etc.) — make the options bold and distinct. Always set a prompt together with variables — variables alone are meaningless without a prompt that uses them.

WORKFLOW: Always set_prompt_text FIRST, then create_variables, then one punchy sentence explaining the idea → generate only when user confirms.

NAVIGATION: In detail view use previous_image (older/right) / next_image (newer/left). In gallery/stack use select_image_by_index.`;

export const DEFAULT_GREETING = `Greet the user as Exposé in one short sentence. Mention these three options: select an image to edit, upload one, or create something new. Example DE: "Willkommen bei Exposé — wähle ein Bild zum Bearbeiten aus, lade eins hoch oder erstelle etwas Neues." Example EN: "Welcome to Exposé — select an image to edit, upload one, or create something new." Vary the wording slightly each time. Respond in the session language.`;

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
    next_image: 'Navigate to the NEWER version of the image (higher version number). In the thumbnail strip this is the LEFT side. Use when user says "links", "nächste Version", "neueres Bild", or navigates left.',
    previous_image: 'Navigate to the OLDER version of the image (lower version number). In the thumbnail strip this is the RIGHT side. Use when user says "rechts", "ältere Version", "davor", or navigates right.',
    go_back: 'Go back to the previous view — like pressing the back/chevron button in the header. From detail view goes to stack, from stack goes to gallery.',
    stop_voice_mode: 'End the voice assistant session and stop listening.',
    set_aspect_ratio: 'Set the aspect ratio for a new image on the create page. Available ratios: 16:9, 4:3, 1:1, 3:4, 9:16.',
    open_stack: 'Navigate to the stack/group view of the current image. Shows all versions and variations of the image in the feed grid.',
    create_variables: 'Create variable controls so the user can explore creative directions. Call this proactively with every edit suggestion — 2-4 variables with 3-4 options each. Existing selections are preserved when a label stays the same. When the user describes something that fits no existing option, call create_variables again with updated options that match their request — the app merges selections automatically.',
    select_variable_option: 'Toggle an existing variable option on or off. Only use this for options that already exist and match what the user wants. When the user describes something new that has no matching option, call create_variables instead to add it.',
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
    'select_image',
    'apply_preset',
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
        temperature: 1.1,
        thinkingLevel: 'minimal',
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

/** Supabase is the single source of truth for voice admin config.
 *  localStorage is no longer used — config changes take effect on next page load. */
export async function fetchVoiceAdminConfig(): Promise<VoiceAdminConfig> {
    const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', DB_KEY)
        .maybeSingle();

    if (error) throw error;
    if (!data?.value) return getDefaultVoiceAdminConfig();
    return resolveConfig(data.value);
}

export async function updateVoiceAdminConfig(config: VoiceAdminConfig) {
    const { error } = await supabase
        .from('app_settings')
        .upsert({ key: DB_KEY, value: config, updated_at: new Date().toISOString() });
    if (error) throw error;
}

/** @deprecated localStorage no longer used — kept only so old import sites compile */
export function loadVoiceAdminConfig(): VoiceAdminConfig { return getDefaultVoiceAdminConfig(); }
/** @deprecated localStorage no longer used */
export function saveVoiceAdminConfig(_config: VoiceAdminConfig) { /* no-op */ }

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('voice_logs').insert({
            id: entry.id,
            session_id: entry.sessionId,
            user_id: user.id,
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('voice_logs').insert({
            id: entry.id,
            session_id: entry.sessionId,
            user_id: user.id,
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
