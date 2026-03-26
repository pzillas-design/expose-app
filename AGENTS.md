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

## Existing Project References

These older project docs already exist and may still contain useful context:

- [`./.agent/workflows/deployment_strategy.md`](./.agent/workflows/deployment_strategy.md)
- [`./.agent/workflows/generation_logic.md`](./.agent/workflows/generation_logic.md)
- [`./_agents/workflows/generation_logic.md`](./_agents/workflows/generation_logic.md)
