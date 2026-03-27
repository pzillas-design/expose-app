# Agent Instructions

This file is the canonical repo-level instruction file for coding agents.

## Deployment Defaults

- Default branch for day-to-day work: `staging`
- Do not push to `main` or `beta` unless explicitly requested
- Prefer GitHub-driven web deploys over ad hoc direct Vercel deploys

## Image Generation / Edge Functions

- Treat `supabase/functions/generate-image` as sensitive infrastructure
- Make minimal changes around auth, SDK imports, and Edge boot behavior
- Before blaming app code, first check whether the function still boots and whether Supabase is rejecting requests before user code runs

## Supabase Deploy Rule

Deploy `generate-image` with explicit JWT verification disabled:

```bash
npx supabase functions deploy generate-image --no-verify-jwt
```

Reason:
- the function relies on expired/edge-case JWTs reaching user code
- deploy/config behavior around `verify_jwt = false` has proven fragile enough that the explicit flag is the safe path

## Required Checks After Supabase Deploy

1. Boot check

```bash
curl -i -X OPTIONS "https://<project-ref>.supabase.co/functions/v1/generate-image" \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST"
```

Expected: `200 ok`

If you get `503 BOOT_ERROR`, the function failed to start. Check recent code changes first, especially SDK imports and Edge-runtime compatibility.

2. Auth check

- If the UI shows `Session error — Please refresh` or `Sitzungs-Fehler – Bitte Seite neu laden`, do not assume the browser session is the root cause.
- First verify whether Supabase is rejecting the request with `401` before the function handler runs.

## Known Pitfalls

- Do not do broad Gemini SDK rewrites in `supabase/functions/generate-image/services/gemini.ts` without verifying:
  - the import exists in the Edge runtime
  - the API call shape still matches the SDK
  - the response shape still matches `extractImageBase64()`
- Do not assume staging and main are using isolated Supabase projects unless explicitly confirmed.

## Google AI Studio / Gemini Image Notes

- For the current staging `NB2` path, the canonical Google API model is `gemini-3.1-flash-image-preview`
- For `NB Pro`, the canonical Google API model is `gemini-3-pro-image-preview`
- Do not infer API model names from AI Studio URLs. AI Studio may use URL slugs like `gemini-3-1-flash-image`, while the Gemini API model name is `gemini-3.1-flash-image-preview`
- The canonical request shape for our Google image path is `ai.models.generateContent(...)`
- The expected image response shape is in `response.candidates[*].content.parts[*].inlineData`
- `gemini-3.1-flash-image-preview` supports text-to-image and text+image-to-image flows, which matches our create/edit flow with source image, annotation image, and references
- `gemini-3.1-flash-image-preview` is a Preview model, so names, limits, and feature support can still change; verify before changing model strings
- Relevant current limits/capabilities to keep in mind:
  - supports image generation via `generateContent`
  - supports text and image input
  - returns text and image parts
  - does not support function calling / structured outputs / caching in this image workflow
  - supports sizes including `1K`, `2K`, and `4K`

## Generation Semantics

- `Create` means text-to-image generation with optional reference images
- `Edit` means source-image editing with prompt, optional annotation image, and optional reference images
- `Annotation Image` means a muted version of the original plus visible red annotation overlays that indicate where to change the image
- `Reference Images` are visual guidance and may be general or tied to a specific edit context

## Gemini Payload Rules We Actually Use

- Build the Gemini request as multimodal `parts`
- Keep the sequence stable:
  - prompt text first
  - variable text second, if present
  - original image next, if present
  - annotation image next, if present
  - reference images last
- After every image `inlineData` part, add a short identifying text part such as `Original Image`, `Annotation Image`, or `Reference Image`
- Use scenario-specific system instructions based on:
  - source image present or not
  - annotation image present or not
  - references present or not
- For edit flows without references, let the model preserve the original aspect ratio
- For create flows and edit flows with references, pass explicit aspect ratio in `generationConfig.imageConfig.aspectRatio`

## Google Doc Anchors

- Primary doc hub for our image pipeline:
  - [Google Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation?hl=de)
- Best model-specific verification page for `NB2`:
  - [Gemini 3.1 Flash Image Preview model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image-preview?hl=de)
- If pricing or current feature support is in doubt:
  - [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing?hl=de#gemini-3.1-flash-image-preview)

## Existing Project References

These older project docs already exist and may still contain useful context:

- [`./.agent/workflows/deployment_strategy.md`](./.agent/workflows/deployment_strategy.md)
- [`./.agent/workflows/generation_logic.md`](./.agent/workflows/generation_logic.md)
- [`./_agents/workflows/generation_logic.md`](./_agents/workflows/generation_logic.md)
