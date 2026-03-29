CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App settings public read" ON public.app_settings;
CREATE POLICY "App settings public read"
ON public.app_settings
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "App settings admin all" ON public.app_settings;
CREATE POLICY "App settings admin all"
ON public.app_settings
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

INSERT INTO public.app_settings (key, value)
VALUES (
    'voice-assistant',
    '{
      "enabled": true,
      "model": "gemini-3.1-flash-live-preview",
      "voiceName": "Charon",
      "inputTranscriptionEnabled": true,
      "outputTranscriptionEnabled": true,
      "visualContextEnabled": true,
      "systemPromptDe": "Du bist Exposé, Sprachassistent einer KI-Bildgenerator-App. Navigation: Galerie (L1) -> Stapel (L2) -> Detailansicht (L3). Nutze Begriffe \"Galerie\", \"Stapel\", \"Detailansicht\" konsistent. Sprich knapp. Aktionen: Vor/Zurück navigiert linear. \"Zurück\" (go_back) geht Ebene höher. Nutze Funktionen still. Prompts kurz & pragmatisch. Bei Edits nur Änderung beschreiben. VARIABLEN vs PROMPT: Nutze `set_prompt_text` für direkte, gezielte Korrekturen (z.B. \"Hintergrund blau\"). Nutze `create_variables` NUR wenn der Nutzer nach \"Optionen\", \"Variationen\", \"Vorschlägen\" oder \"Möglichkeiten\" fragt, um kreative Chips (Stil, Licht, Stimmung) zum Probieren anzubieten. Nie eigenständig generieren — erst Prompt/Variablen setzen, kurz begründen, auf Kommando generieren.",
      "systemPromptEn": "You are Exposé, voice assistant of an AI image generation app. Hierarchy: Gallery (L1) -> Stack (2) -> Detail View (L3). Use these terms consistently. Speak briefly. Next/Prev navigates within context. \"Back\" (go_back) goes up one level. Use functions silently. Prompts short and pragmatic. VARIABLES vs PROMPT: Use `set_prompt_text` for direct, specific edits (e.g. \"make background blue\"). Use `create_variables` ONLY when the user asks for \"options\", \"variations\", \"suggestions\" or \"possibilities\" to provide creative chips (Style, Lighting, Mood) for exploration. Never generate on your own — set prompt/variables, briefly explain, generate only on command.",
      "greetingDe": "Begrüße den Nutzer als Exposé. Sage sinngemäß: \"Willkommen bei Exposé. Möchtest du ein Bild hochladen, bearbeiten oder etwas Neues erstellen?\" Variiere leicht, halte es kurz.",
      "greetingEn": "Greet the user as Exposé. Say: \"Welcome to Exposé. Upload, edit, or create something new?\" Vary slightly, keep it brief.",
      "tools": [
        { "name": "get_app_context", "enabled": true },
        { "name": "open_gallery", "enabled": true },
        { "name": "open_create", "enabled": true },
        { "name": "open_settings", "enabled": true },
        { "name": "enter_multi_select", "enabled": true },
        { "name": "leave_multi_select", "enabled": true },
        { "name": "repeat_current_image", "enabled": true },
        { "name": "show_detail_panel", "enabled": true },
        { "name": "hide_detail_panel", "enabled": true },
        { "name": "open_presets", "enabled": true },
        { "name": "open_reference_image_picker", "enabled": true },
        { "name": "start_annotation_mode", "enabled": true },
        { "name": "open_create_new", "enabled": true },
        { "name": "open_upload", "enabled": true },
        { "name": "set_prompt_text", "enabled": true },
        { "name": "trigger_generation", "enabled": true },
        { "name": "next_image", "enabled": true },
        { "name": "previous_image", "enabled": true },
        { "name": "go_back", "enabled": true },
        { "name": "stop_voice_mode", "enabled": true },
        { "name": "set_aspect_ratio", "enabled": true },
        { "name": "open_stack", "enabled": true },
        { "name": "highlight_image", "enabled": true },
        { "name": "toggle_image_selection", "enabled": true },
        { "name": "create_variables", "enabled": true },
        { "name": "select_variable_option", "enabled": true },
        { "name": "set_quality", "enabled": true },
        { "name": "select_image_by_index", "enabled": true },
        { "name": "select_image_by_position", "enabled": true }
      ]
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
