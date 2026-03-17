// @ts-nocheck
/**
 * kie-webhook — receives Kie.ai task completion callbacks.
 * Kie.ai POSTs to this URL when a generation task completes.
 * Must respond within 15s (we respond immediately, process in background).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { saveKieResult } from '../_shared/saveKieResult.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    let body: any = null;
    try {
        body = await req.json();
    } catch {
        return new Response('Bad Request', { status: 400 });
    }

    console.log('[INFO] kie-webhook received:', JSON.stringify(body).substring(0, 300));

    // Extract taskId from callback payload
    // Kie.ai sends: { code, msg, data: { taskId, info: { result_urls: [...] } } }
    // or: { data: { taskId, resultUrls: [...] } }
    const taskId = body?.data?.taskId || body?.data?.task_id;
    if (!taskId) {
        console.error('[ERROR] kie-webhook: no taskId in payload');
        return new Response('ok', { status: 200 }); // always 200 so Kie stops retrying bad payloads
    }

    // Extract image URL from callback payload (multiple formats)
    const data = body?.data || {};
    let imageUrl: string | null =
        data?.info?.result_urls?.[0] ||
        data?.info?.resultUrls?.[0] ||
        data?.resultUrls?.[0] ||
        data?.resultUrl ||
        data?.imageUrl ||
        data?.url ||
        data?.image_url ||
        data?.video_url ||
        null;

    // Try resultJson field
    if (!imageUrl && data?.resultJson) {
        try {
            const parsed = JSON.parse(data.resultJson);
            imageUrl = parsed?.resultUrls?.[0] || parsed?.images?.[0] || parsed?.url || null;
        } catch { /* ignore */ }
    }

    const isFailure = body?.code !== 200 || body?.msg?.toLowerCase().includes('fail') || body?.msg?.toLowerCase().includes('error');

    // Respond immediately (Kie.ai requires response within 15s)
    const response = new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    // Process in background (download + save can take 30-60s for 4K images)
    const process = async () => {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const kieApiKey = (Deno.env.get('KIE_API_KEY') || Deno.env.get('kie.ai'))!;

        // Look up job by kie_task_id
        const { data: job, error: jobError } = await supabaseAdmin
            .from('generation_jobs')
            .select('id, status, webhook_data, user_id, cost')
            .eq('kie_task_id', taskId)
            .maybeSingle();

        if (jobError || !job) {
            console.error(`[ERROR] kie-webhook: no job found for taskId ${taskId}`, jobError);
            return;
        }

        if (job.status === 'completed' || job.status === 'failed') {
            console.log(`[INFO] kie-webhook: job ${job.id} already ${job.status}, skipping`);
            return;
        }

        const webhookData = job.webhook_data;
        if (!webhookData) {
            console.error(`[ERROR] kie-webhook: no webhook_data for job ${job.id}`);
            return;
        }

        if (isFailure || !imageUrl) {
            console.error(`[ERROR] kie-webhook: task failed or no image URL for job ${job.id}. Code: ${body?.code}, msg: ${body?.msg}`);
            // Refund credits
            if (!webhookData.isPro && webhookData.cost > 0) {
                try {
                    await supabaseAdmin
                        .from('profiles')
                        .update({ credits: webhookData.refundCredits })
                        .eq('id', webhookData.userId);
                    console.log(`[INFO] kie-webhook: refunded credits for user ${webhookData.userId}`);
                } catch { /* non-critical */ }
            }
            await supabaseAdmin
                .from('generation_jobs')
                .update({ status: 'failed', error: body?.msg || 'Kie task failed' })
                .eq('id', job.id);
            return;
        }

        console.log(`[INFO] kie-webhook: saving result for job ${job.id}, imageUrl: ${imageUrl.substring(0, 60)}`);
        await saveKieResult(supabaseAdmin, job.id, imageUrl, webhookData, kieApiKey, data?.costTime);
    };

    EdgeRuntime.waitUntil(process());

    return response;
});
