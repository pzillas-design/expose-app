# Gemini Live Voice Prototype

Status:
- branch-only prototype
- current branch: `codex/gemini-live-prototype`
- not intended for `main`/`staging` without explicit review

Goal:
- add a removable voice-assistant mode to Expose
- start and stop it from the existing feed `...` menu
- keep it modular, feature-flagged, and easy to delete later

## Product Intent

The voice assistant is designed as a mode, not as a permanent UI rewrite.

Current UX direction:
- entry point lives in the existing feed/grid `...` menu
- menu item starts the assistant
- while active, a thin animated line is shown at the top center of the header
- the assistant remains active across the app
- the same menu item can stop the assistant again

Current prototype behavior:
- voice session uses the Gemini Live API
- browser microphone is streamed as 16-bit PCM, 16 kHz
- model answers come back as text
- browser `speechSynthesis` speaks those responses for now
- app actions are executed through Gemini tool/function calls

Reason for this split:
- it gets us a real end-to-end Live API session quickly
- it avoids adding an audio playback pipeline before core UX is validated
- it stays easier to remove if the experiment is abandoned

## Architecture

The prototype is intentionally separated into small pieces.

Main files:
- `api/gemini-live-token.ts`
- `src/hooks/useGeminiLiveVoice.ts`
- `src/components/voice/VoiceModeIndicator.tsx`
- `src/components/layout/AppNavbar.tsx`
- `src/App.tsx`

Optional UI anchors used by voice tools:
- `src/components/sidesheet/SideSheet.tsx`

### 1. Token endpoint

File:
- `api/gemini-live-token.ts`

Purpose:
- creates short-lived Gemini Live auth tokens on the server
- avoids exposing the real Gemini API key in the browser

Environment variables checked:
- `GOOGLE_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_AI_STUDIO_API_KEY`
- optional: `GEMINI_LIVE_MODEL`

Default model:
- `gemini-3.1-flash-live-preview`

### 2. Client voice hook

File:
- `src/hooks/useGeminiLiveVoice.ts`

Purpose:
- owns the Live API session lifecycle
- requests the ephemeral token from the server endpoint
- connects with `@google/genai`
- streams microphone audio
- handles Gemini tool calls
- speaks back short replies via browser speech synthesis

Current states:
- `off`
- `starting`
- `greeting`
- `listening`
- `thinking`
- `speaking`
- `error`

### 3. Header indicator

File:
- `src/components/voice/VoiceModeIndicator.tsx`

Purpose:
- renders the animated thin line in the header
- shows subtle live feedback while the assistant is active
- no logic inside, purely presentational

### 4. Menu integration

File:
- `src/components/layout/AppNavbar.tsx`

Purpose:
- exposes one menu item in the feed/grid menu
- toggles between:
  - `Sprachassistent starten`
  - `Sprachassistent beenden`

The menu entry is only rendered when the feature flag is enabled.

### 5. App wiring

File:
- `src/App.tsx`

Purpose:
- creates the global voice hook instance
- passes the active state into the navbar
- maps Gemini tool calls to real app actions
- builds lightweight visual context from current UI state

## Feature Flag

Current gate:
- `VITE_ENABLE_VOICE_ASSISTANT === 'true'`
- or enabled automatically in local dev

Where:
- `src/App.tsx`

Why:
- makes the experiment easy to disable after merge
- allows safe branch development without changing the default product

## Tool / Function Calling

The assistant does not directly click the DOM on its own.
Instead, Gemini requests app actions through explicit functions.

Current tool set:
- `get_app_context`
- `open_gallery`
- `open_create`
- `open_settings`
- `enter_multi_select`
- `leave_multi_select`
- `repeat_current_image`
- `show_detail_panel`
- `hide_detail_panel`
- `open_presets`
- `open_reference_image_picker`
- `start_annotation_mode`

Implementation:
- tool declarations live in `src/hooks/useGeminiLiveVoice.ts`
- real app behavior is mapped in `src/App.tsx`

This keeps the assistant constrained and easier to reason about than a free-form browser agent.

## Visual Context

The voice model is given lightweight image context where it helps.

Current rules:
- detail view:
  - send the current image thumbnail
- multi-select mode:
  - send up to 4 selected image thumbnails
- also send a short text summary describing the current UI state

Source of thumbnails:
- existing `thumbSrc` values already used by the app
- fallback to `src` if `thumbSrc` is missing

Relevant existing code:
- `src/types.ts`
- `src/services/imageService.ts`
- `src/components/pages/FeedPage.tsx`

Why thumbnails:
- enough visual grounding for voice commands
- much cheaper than sending full-resolution images
- already available in the product

## Current Limits

This prototype is intentionally incomplete.

Known limitations:
- spoken output currently uses browser `speechSynthesis`, not native model audio playback
- no session resume/reconnect flow yet
- no permission-specific onboarding UI yet
- no production analytics around voice usage yet
- visual context is sent as lightweight snapshots, not full continuous video
- the prototype currently favors simplicity over full polish

## Removal Plan

This prototype is designed to be easy to remove.

If we decide to drop it, delete these files first:
- `api/gemini-live-token.ts`
- `src/hooks/useGeminiLiveVoice.ts`
- `src/components/voice/VoiceModeIndicator.tsx`

Then remove the small integrations from:
- `src/App.tsx`
- `src/components/layout/AppNavbar.tsx`
- `src/components/sidesheet/SideSheet.tsx`

Finally disable or delete:
- `VITE_ENABLE_VOICE_ASSISTANT`

Because the feature is isolated behind a flag and a small set of files, rollback should be low-risk.

## Why `gemini-3.1-flash-live-preview`

Current model choice is based on the official Live API SDK quickstart.

Reason:
- official current example for Live API uses `gemini-3.1-flash-live-preview`
- this matches the latest documented Live SDK path better than older `2.5` live examples

Important distinction:
- voice/realtime model:
  - `gemini-3.1-flash-live-preview`
- image generation model:
  - `gemini-3.1-flash-image-preview`

These are separate roles and should not be conflated.

## Sources

Primary references used while building this prototype:
- [Get started with Gemini Live API using the Google GenAI SDK](https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk?hl=de)
- [Live API overview](https://ai.google.dev/gemini-api/docs/live?linkId=24543752)
- [Ephemeral tokens](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
- [Gemini models](https://ai.google.dev/models/gemini)
- local SDK typings:
  - `node_modules/@google/genai/dist/web/web.d.ts`

Key doc takeaways:
- Live API uses WebSockets
- browser clients should use ephemeral tokens, not the raw API key
- text, audio, and video/image frames can be sent in live sessions
- tool/function calls are first-class in the Live API flow

## Next Recommended Steps

1. Test the token route against the real Vercel env
2. Verify microphone capture in the browser
3. Verify first real tool call end-to-end
4. Decide whether to keep browser speech synthesis or switch to native model audio playback
5. Add minimal UX polish only after the real session is stable
