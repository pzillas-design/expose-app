# fal.ai Async/Webhook Generation — Design

**Date:** 2026-06-04
**Status:** Approved for staging build
**Branch:** staging only (feature-flagged, default OFF)

## Problem

The `generate-image-fal` edge function calls fal **synchronously** (`fetch https://fal.run/...`, waits up to 350s) and holds the client connection open until the image is ready. gpt-image-2 high-quality / large edits run 150–200s, which exceeds Supabase's HTTP gateway response timeout (~150s). The client's `supabase.functions.invoke` throws even though the edge function keeps running server-side and successfully writes the image.

The current mitigation (`76fb224`) is a band-aid: after the throw, the client re-checks the `images` table up to 4× to see if the image landed anyway. The root cause — a long-held synchronous connection — remains.

## Goal

Eliminate the gateway-timeout root cause by switching to fal's **queue + webhook** pattern: submit the job and return immediately, let fal call us back when done. Works for arbitrarily long generations, no held connections.

## Key insight: the client is already async-ready

`useGeneration` already has `pollForJob`, which:
- watches the `images` table → swaps the placeholder for the finished image,
- watches `generation_jobs.status === 'failed'` → shows the error + drops the placeholder,
- auto-attaches a poller to every `isGenerating` item via a `useEffect`.

And `processGeneration` already treats a **falsy return** as "async accepted — polling will finish it" (the `else` branch at useGeneration.ts:628). So the client needs only a tiny change: detect the `submitted` response and return `null`.

## Architecture

### Submit (modified `generate-image-fal`, async branch)

Gated by env `FAL_ASYNC_ENABLED === 'true'`. When OFF, the existing synchronous path runs unchanged (zero production risk).

1. Auth, parse payload, resolve prompt/variables/aspect/image_urls, build `falInput` — **identical to today**.
2. Deduct credits (same as today; refunded by the webhook on failure).
3. Persist everything the webhook will need to build the final image into `generation_jobs.request_payload.async`:
   `userId, userEmail, requestType, resolvedPrompt, qualityMode, provider, endpoint,
    sourceImage {id, baseName, version, width, height, realWidth, realHeight},
    sourceFolderId, targetTitle, activeTemplateId, variables, cost`.
4. Submit to the queue instead of calling sync:
   `POST https://queue.fal.run/{endpoint}?fal_webhook={ENCODED_WEBHOOK_URL}`
   where `ENCODED_WEBHOOK_URL = encodeURIComponent("{SUPABASE_FUNCTIONS_URL}/fal-webhook?job={newId}")`.
5. Store `fal_request_id` (from the submit response) in `request_payload.async.falRequestId`, set job `status='processing'`.
6. Return `200 {status:'submitted', jobId}` immediately.

### Webhook (new function `fal-webhook`)

Deployed with `--no-verify-jwt` (fal isn't a Supabase user). Security comes from fal's signature, not JWT.

1. Read **raw body bytes** (needed for signature).
2. **Verify ED25519 signature** per fal spec:
   - Fetch + cache (≤24h) JWKS from `https://rest.fal.ai/.well-known/jwks.json`.
   - Required headers: `X-Fal-Webhook-Request-Id`, `-User-Id`, `-Timestamp`, `-Signature`. Missing → 401.
   - Reject if `|now - timestamp| > 300s` (replay protection).
   - message = `requestId \n userId \n timestamp \n hex(sha256(body))`, UTF-8.
   - Verify hex signature against each JWKS key with ED25519; any match → valid, else 401.
3. Correlate: read `job` query param → load the `generation_jobs` row → its `request_payload.async` context.
4. **Idempotency:** if an `images` row already exists for this job id, return 200 immediately.
5. On `status === 'OK'`:
   - Extract image URL from `payload.images[0].url`, download bytes.
   - Recompute title/version, upload to `user-content` storage, insert `images` row,
     finalize `generation_jobs` (`completed`, duration, resolved prompt) — **reusing the exact
     logic from the current sync path (index.ts:554–675)**, extracted into a shared module.
6. On `status === 'ERROR'`: set job `failed` + error message, **refund credits**.
7. Always return 200 quickly (fal retries on non-2xx; we don't want duplicate work — hence idempotency).

### Shared module

Extract the post-generation logic (version calc, storage upload, images insert, job finalize, credit refund) from `generate-image-fal/index.ts` into `supabase/functions/_shared/persistResult.ts` so both the sync path and the webhook use one implementation. No behavioral change to the sync path.

### Client (`imageService.processGeneration`)

Detect `{status:'submitted'}` (or any response without a finished image) → return `null`. Everything else (placeholder, polling, credit UI, toast) already works.

## Security notes

- The `job` query param is a UUID (unguessable), but it is **not** the security boundary — the ED25519 signature is. An attacker who can't forge fal's signature can't trigger a fake completion.
- JWKS keys are cached in module scope with a TTL (≤24h) to avoid a fetch per webhook.
- Credits are deducted at submit and refunded only by a signed failure webhook, so a forged request can't drain or inflate credits.

## Rollout

1. Build behind `FAL_ASYNC_ENABLED` (default OFF). Deploy both functions to the staging Supabase project.
2. Flip the flag ON in staging, run real generations (incl. a 4K/high-quality edit that used to time out).
3. Verify: placeholder → completed image, correct version/dimensions, credits correct, failure path refunds.
4. Once solid, enable on production and eventually remove the sync path + the client race-guard.

## Out of scope (for now)

- Removing the client race-guard (keep until async is proven on production).
- Cancellation via the queue cancel endpoint.
- Migrating the Layer Composer (it's pure client-side, no fal call).
