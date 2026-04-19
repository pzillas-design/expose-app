// @ts-nocheck
// ── Legacy shim ──────────────────────────────────────────────────────────────
// The original provider-cascade (Gemini primary → Kie fallback) was replaced by
// `generate-image-fal` in commit 2022eaf. This route stays deployed so stale
// client bundles (browser tabs opened before the switch) keep working without a
// forced reload — we simply forward their request to the new function 1:1 and
// return its response verbatim. Request/response shapes are compatible:
//   client expects { success, imageBase64, modelVersion, usageMetadata? } — all
//   present on the fal function's success payload.
//
// When all clients have rotated past 2022eaf (safe: a few days of active sessions),
// this shim can be removed and the function paused.

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        // Build the sibling function's URL. In the edge runtime, SUPABASE_URL is the
        // project API origin (e.g. https://<ref>.supabase.co); functions live at
        // /functions/v1/<name>. Forward body + auth header unchanged.
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const targetUrl = `${supabaseUrl}/functions/v1/generate-image-fal`;

        const body = await req.text();
        const authHeader = req.headers.get('Authorization') ?? '';

        const upstream = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader ? { Authorization: authHeader } : {}),
            },
            body,
        });

        const respBody = await upstream.text();
        console.log(`[legacy generate-image shim] forwarded → fal status=${upstream.status} len=${respBody.length}`);

        return new Response(respBody, {
            status: upstream.status,
            headers: {
                'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
                ...corsHeaders,
            },
        });
    } catch (err) {
        console.error('[legacy generate-image shim] forwarding failed:', err);
        return new Response(
            JSON.stringify({ success: false, error: `Legacy-shim forwarding failed: ${err?.message || 'unknown'}` }),
            { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
    }
});
