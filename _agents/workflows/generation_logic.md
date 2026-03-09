---
description: System Logic for Image Generation — AI Models, API Usage, and Integration Notes
---

# Image Generation System — Technical Reference

## Architecture Overview

Image generation in Exposé runs through a **Supabase Edge Function** (`generate-image`).

The flow is:
1. **Client** (`useGeneration.ts`) creates a placeholder CanvasImage and calls `imageService.processGeneration()`
2. **imageService** calls the Edge Function via `supabase.functions.invoke('generate-image', { body: payload })`
3. **Edge Function** routes to the correct AI provider (Kie or Replicate) and returns the generated image

---

## ⚠️ CRITICAL: Correct Model Names

### Kie AI (Primary Provider)

**API Endpoint:** `https://api.kie.ai/v1/images/generations`

**Model Reference Page:** https://kie.ai/nano-banana?model=nano-banana-pro

| Quality Mode | Kie AI Model Name | Notes |
|---|---|---|
| `pro-1k` | `nano-banana-pro` | 1024px output |
| `pro-2k` | `nano-banana-pro` | 2048px output |
| `pro-4k` | `nano-banana-pro` | 4096px output |

**Default model (in Edge Function `index.ts`):**
```ts
let finalModelName = 'nano-banana-pro';
```

**WRONG names that will cause a `400 Bad Request` from Kie:**
- ❌ `google/nano-banana-pro`
- ❌ `gemini-3-pro-image-preview`
- ❌ `gemini-2.0-flash-exp`

The model identifier must be exactly `nano-banana-pro` — no prefix, no suffix.

---

### Replicate

❌ **Replicate is no longer used.** All image generation goes exclusively through Kie AI.

---

## Model Resolution Logic

In `src/hooks/useGeneration.ts`:

```ts
const resolveTargetModel = (_quality: string): string | undefined => {
    // Return undefined — let the Edge Function use its own default model
    return undefined;
};
```

**Important:** The client should NOT pass a model name to the Edge Function unless overriding for Replicate. The Edge Function always uses `nano-banana-pro` as default for Kie.

---

## Edge Function Logic (`supabase/functions/generate-image/index.ts`)

```ts
// Default model — always Kie's nano-banana-pro
let finalModelName = 'nano-banana-pro';

// Only override if explicitly provided AND valid
if (modelName && (
    modelName === 'nano-banana-pro' ||
    modelName.startsWith('gemini-') ||
    modelName.startsWith('replicate/') ||
    modelName.startsWith('google/')
)) {
    finalModelName = modelName;
}

// Route: Replicate only if prefix is 'replicate/'
const isReplicateModel = finalModelName.startsWith('replicate/');
// → else: Kie AI
```

---

## Kie API Request Format (`supabase/functions/generate-image/services/kie.ts`)

```ts
const requestBody = {
    model: 'nano-banana-pro',   // ← always this exact string
    prompt: fullPrompt,
    n: 1,
    size: "1024x1024",
    response_format: "b64_json",
    filesUrl: [...],            // optional: array of base64 data URLs for source/mask/refs
};
```

The response contains an image in `data[0].b64_json`.

---

## Placeholder / Skeleton

When a generation starts, a placeholder `CanvasImage` is immediately added to the feed with `isGenerating: true`. This creates the visible loading skeleton while the Edge Function runs. The placeholder is replaced with the real image on success, or removed on failure.

---

## Cost Structure

| Quality | Cost |
|---|---|
| `pro-1k` | 0.10 € |
| `pro-2k` | 0.25 € |
| `pro-4k` | 0.50 € |

Credits are deducted optimistically before the call and refunded on failure.
