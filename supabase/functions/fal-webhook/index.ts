// @ts-nocheck
// -----------------------------------------------------------------------------
// fal-webhook — receives fal.ai's async completion callback.
// -----------------------------------------------------------------------------
// Deployed with --no-verify-jwt (fal is not a Supabase user). Security is the
// ED25519 signature check, NOT the JWT. Correlation to our job is via the
// ?job=<id> query param; the per-job async context was stored on the
// generation_jobs row at submit time by generate-image-fal.
//
// fal payload: { request_id, status: 'OK' | 'ERROR', payload: { images: [...] }, error? }
// We always return 200 quickly (fal retries non-2xx → we'd rather be idempotent
// than do duplicate work).
// -----------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyFalWebhook } from '../_shared/falWebhookVerify.ts';
import { persistFalResult, refundCredits, AsyncContext } from '../_shared/persistResult.ts';

Deno.serve(async (req) => {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    // Raw bytes are required for signature verification — read once.
    const rawBody = new Uint8Array(await req.arrayBuffer());

    // 1) Verify authenticity
    const verdict = await verifyFalWebhook(req.headers, rawBody);
    if (!verdict.valid) {
        console.warn('[fal-webhook] rejected:', verdict.reason);
        return new Response(JSON.stringify({ error: 'invalid signature', reason: verdict.reason }), {
            status: 401, headers: { 'Content-Type': 'application/json' },
        });
    }

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    try {
        const url = new URL(req.url);
        const jobId = url.searchParams.get('job');
        if (!jobId) return new Response(JSON.stringify({ error: 'missing job param' }), { status: 400 });

        let body: any = {};
        try { body = JSON.parse(new TextDecoder().decode(rawBody)); } catch { /* tolerate */ }
        const status = body?.status; // 'OK' | 'ERROR'

        // Load the job + its stored async context.
        const { data: job } = await supabaseAdmin
            .from('generation_jobs')
            .select('id, status, request_payload')
            .eq('id', jobId)
            .maybeSingle();
        if (!job) {
            console.warn(`[fal-webhook] no job row for ${jobId}`);
            return new Response(JSON.stringify({ ok: true, note: 'no job' }), { status: 200 });
        }

        const ctx: AsyncContext | undefined = job.request_payload?.async;
        if (!ctx) {
            console.warn(`[fal-webhook] job ${jobId} has no async context`);
            return new Response(JSON.stringify({ ok: true, note: 'no ctx' }), { status: 200 });
        }

        // Already finished? Stay idempotent.
        if (job.status === 'completed' || job.status === 'failed') {
            return new Response(JSON.stringify({ ok: true, note: 'already final' }), { status: 200 });
        }

        if (status === 'ERROR') {
            const errMsg = (typeof body?.error === 'string' ? body.error : JSON.stringify(body?.error || 'fal error')).slice(0, 500);
            await supabaseAdmin.from('generation_jobs')
                .update({ status: 'failed', error: errMsg })
                .eq('id', jobId);
            await refundCredits(supabaseAdmin, ctx.userId, ctx.cost);
            console.warn(`[fal-webhook] job ${jobId} ERROR: ${errMsg}`);
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        // status OK — extract the image
        const first = body?.payload?.images?.[0];
        if (!first?.url) {
            await supabaseAdmin.from('generation_jobs')
                .update({ status: 'failed', error: 'webhook payload missing image url' })
                .eq('id', jobId);
            await refundCredits(supabaseAdmin, ctx.userId, ctx.cost);
            return new Response(JSON.stringify({ ok: true, note: 'no image' }), { status: 200 });
        }

        const result = await persistFalResult(supabaseAdmin, jobId, ctx, {
            imageUrl: first.url,
            width: first.width,
            height: first.height,
            contentType: first.content_type,
        });

        if (!result.ok) {
            await supabaseAdmin.from('generation_jobs')
                .update({ status: 'failed', error: result.error.slice(0, 500) })
                .eq('id', jobId);
            await refundCredits(supabaseAdmin, ctx.userId, ctx.cost);
            console.error(`[fal-webhook] job ${jobId} persist failed: ${result.error}`);
            return new Response(JSON.stringify({ ok: true, note: 'persist failed' }), { status: 200 });
        }

        console.log(`[fal-webhook] job ${jobId} completed`);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (e) {
        console.error('[fal-webhook] handler error:', (e as any)?.message || e);
        // Return 200 so fal doesn't hammer us with retries; the job stays
        // 'processing' and the client poller keeps waiting (or times out in UI).
        return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }
});
