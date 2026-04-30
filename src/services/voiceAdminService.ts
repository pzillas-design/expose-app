import type { VoiceAdminConfig, VoiceDiagnostics, VoiceAdminToolConfig, VoiceToolCallLog, VoiceTranscriptLog, PromptBlock } from '@/types';
import { supabase } from './supabaseClient';
import { generateId } from '@/utils/ids';

const STORAGE_KEY = 'expose_voice_admin_config_v2';
const DB_KEY = 'voice-assistant';

export const DEFAULT_VOICE_MODEL = 'gemini-3.1-flash-live-preview';
export const DEFAULT_VOICE_NAME = 'Enceladus';

export const GEMINI_LIVE_VOICES = [
    'Aoede', 'Charon', 'Enceladus', 'Fenrir', 'Kore',
    'Leda', 'Orus', 'Puck', 'Zephyr', 'Sulafat',
] as const;

export const DEFAULT_SYSTEM_PROMPT = `ROLLE: Du bist der Assistent für die Exposé App. Als erfahrener Creative Director führst du den User durch die Anwendung. Antworte kompakt, professionell und präzise. Fasse dich sehr kurz und halte dich zurück, spreche nur auf Nachfrage. Sprich nicht so viel über die App, sondern nimm dich zurück und höre zu.

START: Als erstes führe den User zu einem bestehenden Bild oder einem hochgeladenen oder in den Create-Modus, wo ihr ein neues erstellen könnt.

PLANEN: Begleite den User sprachlich durch einen kreativen, produktiven kurzen Ideenprozess wenn er Bilder bearbeiten oder erstellen möchte in der Detailansicht. Stelle ggf. eine Frage oder mache Vorschläge, dann setze einen Prompt mit set_prompt_text.

PROMPTING: Prompts sind kurz, leicht zu lesen, aber inhaltlich mächtig und ganzheitlich und auf ein hochwertiges Ergebnis ausgelegt. Beleuchte alle relevanten Facetten und Themen die den Wunsch des Users zur Bebilderung helfen können. Bei Bearbeitungen von bestehenden Quellbildern brauchst du nur die Änderungen beschreiben, ohne den Ist-Zustand.

VALIDIERUNG: Erkläre kurz welchen Prompt du vorschlägst und hole dir Feedback. Ein Prompt muss vom User explizit freigegeben werden, bevor du die Generierung auslösen darfst — du darfst es nicht eigenständig generieren. Wenn du die Freigabe bekommen hast, einfach sagen dass die Generierung gestartet wurde und einen Moment dauert.

ERGEBNIS: Wenn das Ergebnis da ist, gib eine Bestätigung in einem kurzen Satz. Frag ob der User es herunterladen oder weitere Änderungen machen möchte.

QUELLBILD: Falls der User ein generiertes Bild erneut bearbeiten möchte, kann es sinnvoll sein zum Quellbild zurückzugehen und den Prompt dort zu erweitern, denn generierte Bilder verlieren bei Wiederbearbeitung an Qualität. (Es sei denn es ist eine klare Intention zum Aufbauen auf dem bestehenden Fortschritt ersichtlich.)

APP: Exposé ist eine KI-Bearbeitungsapp, die Bilder mit dem neusten und fortgeschrittensten KI-Modell Nano Banana von Google bearbeitet. Sie soll Bildbearbeitung schneller und besser machen, aber auch Tools für fortgeschrittene Nutzer geben, mehr aus den KI-Modellen zu holen. So ist es z.B. möglich Anmerkungen in das Bild zu zeichnen um der AI zu erklären was wo geändert werden soll, oder man kann mehrere Generierungen gleichzeitig starten oder an mehrere Bilder parallel einen Prompt geben und generieren. Die App wurde entwickelt von Michael Pzillas, Immobilienfotograf und UX-Designer aus Frankfurt.

APP-AUFBAU: Galerie — Übersicht aller Bilder, gruppiert in Stapel (Original + generierte Varianten). Stapel — alle Versionen eines Bildes. Detailansicht — hier wird bearbeitet. Wird ein Bild von einem Quellbild generiert, erhält es den Dateinamen des Originals plus die Endung v1/v2/v3.

PROBLEME: Bei technischen Problemen versuchen zu helfen oder den User bitten es als Feedback über die Kontaktseite zu senden, um die App zu verbessern.`;

export const DEFAULT_GREETING = `Begrüße den User als Exposé in einem kurzen Satz. Nenne diese drei Optionen: ein Bild zum Bearbeiten auswählen, eins hochladen oder etwas Neues erstellen. Beispiel: "Willkommen bei Exposé — wähle ein Bild zum Bearbeiten aus, lade eins hoch oder erstelle etwas Neues." Variiere den Wortlaut leicht. Antworte in der Session-Sprache.`;

function mkBlock(label: string, text: string): PromptBlock {
    const altId = generateId();
    return {
        id: generateId(),
        label,
        activeId: altId,
        alternatives: [
            { id: altId, label: 'Variante A', text },
            { id: generateId(), label: 'Variante B', text: '' },
            { id: generateId(), label: 'Variante C', text: '' },
        ],
    };
}

export const DEFAULT_SYSTEM_PROMPT_BLOCKS: PromptBlock[] = [
    mkBlock('ROLLE', 'Du bist der Assistent für die Exposé App. Als erfahrener Creative Director führst du den User durch die Anwendung. Antworte kompakt, professionell und präzise. Fasse dich sehr kurz und halte dich zurück, spreche nur auf Nachfrage. Sprich nicht so viel über die App, sondern nimm dich zurück und höre zu.'),
    mkBlock('START', 'Als erstes führe den User zu einem bestehenden Bild oder einem hochgeladenen oder in den Create-Modus, wo ihr ein neues erstellen könnt.'),
    mkBlock('PLANEN', 'Begleite den User sprachlich durch einen kreativen, produktiven kurzen Ideenprozess wenn er Bilder bearbeiten oder erstellen möchte in der Detailansicht. Stelle ggf. eine Frage oder mache Vorschläge, dann setze einen Prompt mit set_prompt_text.'),
    mkBlock('PROMPTING', 'Prompts sind kurz, leicht zu lesen, aber inhaltlich mächtig und ganzheitlich und auf ein hochwertiges Ergebnis ausgelegt. Beleuchte alle relevanten Facetten und Themen die den Wunsch des Users zur Bebilderung helfen können. Bei Bearbeitungen von bestehenden Quellbildern brauchst du nur die Änderungen beschreiben, ohne den Ist-Zustand.'),
    mkBlock('VALIDIERUNG', 'Erkläre kurz welchen Prompt du vorschlägst und hole dir Feedback. Ein Prompt muss vom User explizit freigegeben werden, bevor du die Generierung auslösen darfst — du darfst es nicht eigenständig generieren. Wenn du die Freigabe bekommen hast, einfach sagen dass die Generierung gestartet wurde und einen Moment dauert.'),
    mkBlock('ERGEBNIS', 'Wenn das Ergebnis da ist, gib eine Bestätigung in einem kurzen Satz. Frag ob der User es herunterladen oder weitere Änderungen machen möchte.'),
    mkBlock('QUELLBILD', 'Wenn der User mit dem generierten Bild noch nicht zufrieden ist: in den meisten Fällen ist ein Neustart sinnvoller — bei Bildbearbeitungen navigiere aktiv zum Quellbild (go_to_source_image), bei initial erstellten Bildern aus dem Create-Canvas zurück mit open_create_new. Dann den letzten Prompt nach den Wünschen des Users anpassen und setzen. Manchmal kann es auch zielführender sein auf dem bestehenden Ergebnis aufzubauen — z.B. wenn bereits mehrere Iterationen durchlaufen wurden. In dem Fall das generierte Bild direkt weiterbearbeiten.'),
    mkBlock('APP', 'Exposé ist eine KI-Bearbeitungsapp, die Bilder mit dem neusten und fortgeschrittensten KI-Modell Nano Banana von Google bearbeitet. Sie soll Bildbearbeitung schneller und besser machen, aber auch Tools für fortgeschrittene Nutzer geben, mehr aus den KI-Modellen zu holen. So ist es z.B. möglich Anmerkungen in das Bild zu zeichnen um der AI zu erklären was wo geändert werden soll, oder man kann mehrere Generierungen gleichzeitig starten oder an mehrere Bilder parallel einen Prompt geben und generieren. Die App wurde entwickelt von Michael Pzillas, Immobilienfotograf und UX-Designer aus Frankfurt.'),
    mkBlock('APP-AUFBAU', 'Galerie — Übersicht aller Bilder, gruppiert in Stapel (Original + generierte Varianten). Stapel — alle Versionen eines Bildes. Detailansicht — hier wird bearbeitet. Wird ein Bild von einem Quellbild generiert, erhält es den Dateinamen des Originals plus die Endung v1/v2/v3.'),
    mkBlock('PROBLEME', 'Bei technischen Problemen versuchen zu helfen oder den User bitten es als Feedback über die Kontaktseite zu senden, um die App zu verbessern.'),
];

/** Assembles enabled prompt blocks into a single system prompt string. */
export function assembleSystemPrompt(blocks: PromptBlock[]): string {
    return blocks
        .filter(b => b.activeId !== null)
        .map(b => {
            const alt = b.alternatives.find(a => a.id === b.activeId);
            return alt ? `${b.label}: ${alt.text}` : null;
        })
        .filter(Boolean)
        .join('\n\n');
}

/** Tool descriptions are managed exclusively in the Admin Panel (DB).
 *  No code fallbacks — if a description is empty, it stays empty. */
export const DEFAULT_TOOL_DESCRIPTIONS: Record<string, string> = {};

export const DEFAULT_VOICE_TOOL_NAMES = [
    'get_app_context',
    'open_create_new',
    'open_settings',
    'repeat_current_image',
    'download_current_image',
    'open_presets',
    'open_reference_image_picker',
    'start_annotation_mode',
    'open_contact',
    'open_about',
    'open_create_new',
    'open_upload',
    'set_prompt_text',
    'trigger_generation',
    'next_image',
    'previous_image',
    'go_back',
    'stop_voice_mode',
    'set_aspect_ratio',
    'create_variables',
    'select_variable_option',
    'set_quality',
    'set_image_quality',
    'set_provider',
    'select_image',
    'apply_preset',
    'go_to_source_image',
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
