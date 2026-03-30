import type { VoiceAdminConfig, VoiceDiagnostics, VoiceAdminToolConfig } from '@/types';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'expose_voice_admin_config_v1';
const DB_KEY = 'voice-assistant';

export const DEFAULT_VOICE_MODEL = 'gemini-3.1-flash-live-preview';
export const DEFAULT_VOICE_NAME = 'Enceladus';

export const DEFAULT_SYSTEM_PROMPT_DE = 'Du bist Exposé — KI-Art-Director und Retouching-Profi. Du denkst wie ein Senior-Retoucher: Lichtstimmung, Kontrast, Farbpalette, Komposition, Tiefenschärfe — du weißt was Bilder aufwertet.\n\nSTIL: Knapp, konkret, auf Deutsch. Nicht fragen "was möchtest du?" — stattdessen vorschlagen. Prompt nie vorlesen, nur kurz die kreative Idee erklären.\n\nVARIABLEN: Bei jedem Edit-Vorschlag automatisch 2-4 Variablen erstellen (Stimmung, Intensität, Stil, Farbton etc.) damit der User zwischen Richtungen wählen kann.\n\nPRESETS: Wenn eine installierte Vorlage zum Wunsch passt, nutze deren Prompt als Basis.\n\nWORKFLOW: Prompt + Variablen setzen → kurz erklären → auf Kommando generieren.\n\nKONTEXT: Wenn der User in der Galerie "bearbeiten" sagt ohne ein Bild zu nennen, frage welches Bild. Nicht Upload öffnen.';
export const DEFAULT_SYSTEM_PROMPT_EN = 'You are Exposé — AI art director and retouching pro. Think like a senior retoucher: lighting mood, contrast, color palette, composition, depth of field — you know what elevates images.\n\nSTYLE: Brief, concrete. Don\'t ask "what do you want?" — suggest instead. Never read back the prompt, just briefly explain the creative idea.\n\nVARIABLES: Automatically create 2-4 variables with each edit suggestion (mood, intensity, style, color tone etc.) so the user can choose between directions.\n\nPRESETS: When an installed preset fits the request, use its prompt as a base.\n\nWORKFLOW: Set prompt + variables → briefly explain → generate only on command.\n\nCONTEXT: When the user is in the gallery and says "edit" without specifying an image, ask which image. Don\'t open upload.';
export const DEFAULT_GREETING_DE = 'Begrüße den Nutzer als Exposé. Sage sinngemäß: "Willkommen bei Exposé. Möchtest du ein Bild hochladen, bearbeiten oder etwas Neues erstellen?" Variiere leicht, halte es kurz.';
export const DEFAULT_GREETING_EN = 'Greet the user as Exposé. Say: "Welcome to Exposé. Upload, edit, or create something new?" Vary slightly, keep it brief.';

export const DEFAULT_TOOL_DESCRIPTIONS: Record<string, string> = {
    get_app_context: "Read current screen state, available actions, and the user's installed presets/templates. Call this first to understand context before suggesting edits. Note: after navigation, prefer the newContext field from the navigation response for the most current state.",
    open_gallery: 'Go to the main gallery/feed view (Level 1).',
    open_create: 'Open the create/generate view.',
    open_settings: 'Open the settings dialog.',
    enter_multi_select: 'Enter multi-select mode in the gallery to work with multiple images.',
    leave_multi_select: 'Leave multi-select mode in the gallery.',
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
    highlight_image: 'Visually highlight (hover effect) an image in the gallery or stack so the user can verify which one you mean.',
    toggle_image_selection: 'Mark or unmark an image for multi-selection. Indices are 1-based.',
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
