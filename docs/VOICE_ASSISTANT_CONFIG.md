# Exposé Voice Assistant — Konfiguration & Erweiterung

> Dieses Dokument beschreibt die aktuelle Voice-Konfiguration und dient als Arbeitsgrundlage, um den Assistenten gemeinsam weiterzuentwickeln.

---

## 1. Identität (System Instruction)

**Datei:** `src/hooks/useGeminiLiveVoice.ts` Zeile ~636

| Eigenschaft | Entscheidung |
|-------------|-------------|
| **Name** | Exposé |
| **Stil** | Minimalistisch, präzise |
| **Expertise** | Fotografie, Marketing, Design, visuelle Gestaltung |
| **Sprache** | Automatisch nach App-Sprache (DE/EN) |

### Deutsch
Du bist Exposé, Sprachassistent einer KI-Bildgenerator-App. Navigation: Galerie (L1) -> Stapel (L2) -> Detailansicht (L3). Nutze Begriffe "Galerie", "Stapel", "Detailansicht" konsistent. Sprich knapp. Aktionen: Vor/Zurück navigiert linear. "Zurück" (go_back) geht Ebene höher. Nutze Funktionen still. Prompts kurz & pragmatisch. Bei Edits nur Änderung beschreiben. VARIABLEN vs PROMPT: Nutze `set_prompt_text` für direkte, gezielte Korrekturen (z.B. "Hintergrund blau"). Nutze `create_variables` NUR wenn der Nutzer nach "Optionen", "Variationen", "Vorschlägen" oder "Möglichkeiten" fragt, um kreative Chips (Stil, Licht, Stimmung) zum Probieren anzubieten. Nie eigenständig generieren — erst Prompt/Variablen setzen, kurz begründen, auf Kommando generieren.
```

### English
You are Exposé, voice assistant of an AI image generation app. Hierarchy: Gallery (L1) -> Stack (2) -> Detail View (L3). Use these terms consistently. Speak briefly. Next/Prev navigates within context. "Back" (go_back) goes up one level. Use functions silently. Prompts short and pragmatic. VARIABLES vs PROMPT: Use `set_prompt_text` for direct, specific edits (e.g. "make background blue"). Use `create_variables` ONLY when the user asks for "options", "variations", "suggestions" or "possibilities" to provide creative chips (Style, Lighting, Mood) for exploration. Never generate on your own — set prompt/variables, briefly explain, generate only on command.
```

### 🔧 Offene Fragen
- [ ] Soll er eigenständig kreative Vorschläge machen? (z.B. "Das Bild hätte mehr Wirkung mit warmem Licht")
- [ ] Soll der Prompt noch mehr Kontext bekommen? (z.B. verfügbare Modelle, Style-Presets)

---

## 2. Greeting (Begrüßung)

**Datei:** `src/hooks/useGeminiLiveVoice.ts` Zeile ~668

Wenn die Voice-Session startet, wird nach 180ms ein Greeting gesendet:

| Sprache | Greeting-Prompt |
|---------|----------------|
| DE | Begrüßt als Exposé, fragt ob bearbeiten (→ Upload) oder erstellen (→ Create-Seite) |
| EN | Greets as Exposé, asks edit existing (→ Upload) or create new (→ Create page) |

### Flow nach Greeting
```
User sagt "bearbeiten" → open_upload() → Upload-Dialog öffnet sich
User sagt "erstellen"  → open_create_new() → Create-Seite mit Aspect-Ratio-Auswahl
```

### 🔧 Offene Fragen
- [x] ~~Kontextabhängiges Greeting?~~ → **Ja, fragt nach Bearbeiten/Erstellen**
- [ ] Soll das Greeting anders sein wenn der User schon ein Bild offen hat?
- [ ] Soll ein Sound den Start zusätzlich signalisieren?

---

## 3. Stimme

**Datei:** `src/hooks/useGeminiLiveVoice.ts` Zeile ~633

| Setting | Wert |
|---------|------|
| **Aktuelle Stimme** | `Charon` ✅ |
| **Sample Rate Input** | 16 kHz |
| **Sample Rate Output** | 24 kHz |

### Verfügbare Stimmen (Gemini Live API)
| Name | Beschreibung |
|------|-------------|
| Aoede | Warm, freundlich |
| **Charon** | ← **aktuell gewählt** |
| Fenrir | — |
| Kore | — |
| Puck | — |

> Vollständige Liste und Demos: https://ai.google.dev/gemini-api/docs/live-api

### 🔧 Offene Fragen
- [ ] Stimme in der UI auswählbar machen?
- [ ] Verschiedene Stimmen für verschiedene Sprachen?

---

## 4. Modell

**Datei:** `api/gemini-live-token.ts` Zeile ~10

| Setting | Wert |
|---------|------|
| **Standard-Modell** | `gemini-2.0-flash` (via `DEFAULT_LIVE_MODEL`) |
| **Override** | ENV `GEMINI_LIVE_MODEL` |
| **Modality** | `AUDIO` (Sprach-Output) |

### 🔧 Offene Fragen
- [ ] Auf `gemini-2.5-flash-native-audio-latest` upgraden für bessere Audio-Qualität?
- [ ] Fallback-Modell wenn primäres nicht verfügbar?

---

## 5. Tools / Funktionen (was die Voice steuern kann)

**Datei:** `src/hooks/useGeminiLiveVoice.ts` Zeile ~75–190

Das Modell kann über Function Calling die App steuern.

### Aktuelle Tools (27 Stück)

| 1 | `get_app_context` | Aktuellen Screen & verfügbare Aktionen abfragen | keine |
| 2 | `open_gallery` | Zur Galerie/Feed navigieren | keine |
| 3 | `open_create` | Create-View öffnen | keine |
| 4 | `open_create_new` | Create-Seite mit Aspect-Ratio-Auswahl (für neue Bilder) | keine |
| 5 | `open_upload` | Upload-Dialog öffnen (Bild bearbeiten) | keine |
| 6 | `open_settings` | Settings-Dialog öffnen | keine |
| 7 | `enter_multi_select` | Multi-Select-Modus in Galerie starten | keine |
| 8 | `leave_multi_select` | Multi-Select-Modus verlassen | keine |
| 9 | `repeat_current_image` | Variationen vom aktuellen Bild generieren | keine |
| 10 | `show_detail_panel` | Edit-/Info-Panel zeigen | keine |
| 11 | `hide_detail_panel` | Edit-/Info-Panel verstecken | keine |
| 12 | `open_presets` | Prompt-Presets öffnen | keine |
| 13 | `open_reference_image_picker` | Referenzbild-Picker öffnen | keine |
| 14 | `start_annotation_mode` | Annotation-Modus aktivieren | keine |
| 15 | `set_prompt_text` | Text ins Prompt-Feld schreiben | `text` (string) |
| 16 | `trigger_generation` | Generieren-Button klicken | keine |
| 17 | `next_image` | Nächstes Bild | keine |
| 18 | `previous_image` | Vorheriges Bild | keine |
| 19 | `go_back` | Zurück (Chevron-Button Funktion) | keine |
| 20 | `stop_voice_mode` | Voice-Modus beenden | keine |
| 21 | `open_stack` | Stapel-Ansicht (alle Versionen) öffnen | keine |
| 22 | `set_aspect_ratio` | Seitenverhältnis setzen | `ratio` (string) |
| 23 | `create_variables` | Creative-Variablen für den Prompt erstellen | `controls` (array) |
| 24 | `select_variable_option` | Variable-Option umschalten | `label`, `option` (string) |
| 25 | `set_quality` | Generierungs-Qualität (1k, 2k, 4k) setzen | `quality` (string) |
| 26 | `select_image_by_index` | Bild über Index (1-basiert) öffnen | `index` (number) |
| 27 | `select_image_by_position` | Bild über Grid-Position (Reihe/Spalte) öffnen | `row`, `column` (number) |

### Architektur: So funktioniert ein Tool-Call

```
User spricht → Gemini erkennt Intent → sendet FunctionCall
    → useGeminiLiveVoice.executeToolCall() wird aufgerufen
    → ruft den passenden VoiceCommandHandler auf (z.B. openCreate())
    → Handler kommt von App.tsx, führt die echte App-Aktion aus
    → Ergebnis wird an Gemini zurückgesendet via sendToolResponse()
    → Gemini bestätigt per Sprache
```

### Handler-Interface (was App.tsx bereitstellen muss)

```typescript
interface VoiceCommandHandlers {
    getAppContext: () => VoiceAppContext;
    getVisualContext: () => VoiceVisualContext | null;
    openGallery: () => Promise<VoiceActionResult> | VoiceActionResult;
    openCreate: () => Promise<VoiceActionResult> | VoiceActionResult;
    openCreateNew: () => Promise<VoiceActionResult> | VoiceActionResult;
    openUpload: () => Promise<VoiceActionResult> | VoiceActionResult;
    openSettings: () => Promise<VoiceActionResult> | VoiceActionResult;
    enterMultiSelect: () => Promise<VoiceActionResult> | VoiceActionResult;
    leaveMultiSelect: () => Promise<VoiceActionResult> | VoiceActionResult;
    repeatCurrentImage: () => Promise<VoiceActionResult> | VoiceActionResult;
    showDetailPanel: () => Promise<VoiceActionResult> | VoiceActionResult;
    hideDetailPanel: () => Promise<VoiceActionResult> | VoiceActionResult;
    openPresets: () => Promise<VoiceActionResult> | VoiceActionResult;
    openReferenceImagePicker: () => Promise<VoiceActionResult> | VoiceActionResult;
    startAnnotationMode: () => Promise<VoiceActionResult> | VoiceActionResult;
    setPromptText: (text: string) => Promise<VoiceActionResult> | VoiceActionResult;
    triggerGeneration: () => Promise<VoiceActionResult> | VoiceActionResult;
    nextImage: () => Promise<VoiceActionResult> | VoiceActionResult;
    previousImage: () => Promise<VoiceActionResult> | VoiceActionResult;
    goBack: () => Promise<VoiceActionResult> | VoiceActionResult;
    stopVoiceMode: () => void;
}
```

### 🔧 Weitere Tool-Ideen

- [x] `select_image` — Bestimmtes Bild in der Galerie auswählen (Index oder Reihe/Spalte)
- [ ] `delete_selected` — Ausgewählte Bilder löschen (mit Bestätigung!)
- [ ] `change_style` — Style-Preset wechseln (braucht `style` Parameter)
- [ ] `undo` / `redo` — Letzte Aktion rückgängig machen im anmerkungsmodus
- [ ] `save_image` / `download_image` — Bild speichern/downloaden

### So fügst du ein neues Tool hinzu

1. **Tool-Deklaration** in `toolDeclarations` Array hinzufügen
2. **Handler** in `VoiceCommandHandlers` Interface hinzufügen
3. **Switch-Case** in `executeToolCall` erweitern
4. **Destructuring** in `useGeminiLiveVoice()` Funktionssignatur hinzufügen
5. **Dependency-Array** von `executeToolCall` updaten
6. **App.tsx** — Handler-Implementierung übergeben

---

## 6. Visueller Kontext

**Datei:** `src/hooks/useGeminiLiveVoice.ts`

Der Assistent kann sehen, was auf dem Screen ist, über `syncVisualContext()`:

```typescript
interface VoiceVisualContext {
    summary: string;        // Text-Beschreibung des aktuellen Screens
    frames: VoiceVisualFrame[];  // Aktuelle Bilder als Base64
    contextKey: string;     // Cache-Key um unnötige Updates zu vermeiden
}
```

### 🔧 Offene Fragen
- [ ] Wie oft wird der visuelle Kontext synchronisiert?
- [ ] Soll der Assistent proaktiv auf Bildänderungen reagieren?
- [ ] Soll er den Prompt-Text lesen können?

---

## 7. Feature-Toggle & Deployment

| Setting | Wert | Ort |
|---------|------|-----|
| Dev-Modus | Immer aktiviert | `App.tsx` |
| Production | `VITE_ENABLE_VOICE_ASSISTANT=true` | `.env` / Vercel |
| API Key | `GEMINI_API_KEY` | `.env` / Vercel Secrets |
| Modell-Override | `GEMINI_LIVE_MODEL` | `.env` / Vercel Secrets |

### 🔧 Offene Fragen
- [ ] Voice nur für eingeloggte User? (aktuell: ja in Prod, nein in Dev)
- [ ] Voice nur für bestimmte Rollen/Pläne?
- [ ] Rate-Limiting für Voice-Sessions?

---

## 8. UI-Verbesserungen

### Aktueller Stand
- Voice startet/stoppt über Menü-Eintrag in der Navbar
- Visuelles Feedback: orange Linie im Header (VoiceModeIndicator)
- States: `off → starting → greeting → listening → thinking → speaking`


