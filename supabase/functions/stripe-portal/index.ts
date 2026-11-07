import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { verifyJwtSignature } from '../_shared/auth.ts'

/*
    Der Weg zu den eigenen Rechnungen.

    Stripe schickt die Rechnung per Mail — nur kommt sie nicht ueberall an:
    Firmen-Postfaecher halten solche Mails gern in der Quarantaene, und wer
    sie dort nicht findet, hat keinen Beleg. Das Kundenportal von Stripe
    loest das: eine Liste aller Zahlungen mit ihren Rechnungen zum
    Herunterladen, die sich der Kunde selbst holt.

    Die Sitzung dafuer muss serverseitig entstehen, weil sie den
    Stripe-Kunden nennt -- eine ID, die im Browser nichts zu suchen hat.
    Aufbau wie bei stripe-checkout: JWT pruefen, Nutzer laden, Kunde aus dem
    Profil, und die Rueckkehradresse gegen eine feste Liste halten, damit
    daraus keine offene Weiterleitung wird.
*/

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const authHeader = req.headers.get('Authorization') ?? '';
        const jwtToken = authHeader.replace(/^Bearer\s+/i, '');
        const jwtPayload = await verifyJwtSignature(jwtToken);
        const userId = jwtPayload.sub;

        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
        const user = authUser?.user ?? null
        if (!user) throw new Error('User not found')

        const body = await req.json().catch(() => ({}));
        const return_url = body?.return_url;

        const isAllowedUrl = (url: string) => {
            if (!url) return false;
            if (/^https:\/\/([a-z0-9-]+\.)*expose\.ae(\/|$)/i.test(url)) return true;
            if (url.startsWith('http://localhost') || url.startsWith('https://localhost')) return true;
            return false;
        };
        if (!isAllowedUrl(return_url)) {
            throw new Error(`Invalid return URL: ${return_url}`);
        }

        // Kunde aus dem Profil; fehlt er, in Stripe nach der Mailadresse
        // suchen. Nur anlegen, wenn es wirklich keinen gibt -- ein frisch
        // angelegter Kunde haette keine einzige Rechnung zu zeigen.
        const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single()

        let stripeCustomerId = profileData?.stripe_customer_id

        if (!stripeCustomerId) {
            const existing = await stripe.customers.list({ email: user.email ?? '', limit: 1 })
            if (existing.data.length === 0) {
                // Noch nie gezahlt: Es gibt nichts zu zeigen, und das soll die
                // Oberflaeche sagen duerfen, statt ein leeres Portal zu oeffnen.
                return new Response(JSON.stringify({ url: null, reason: 'no_customer' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }
            stripeCustomerId = existing.data[0].id
            await supabaseAdmin.from('profiles').update({ stripe_customer_id: stripeCustomerId }).eq('id', userId)
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url,
        })

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error("[portal] error:", error.message, "| type:", error.type, "| code:", error.code);
        return new Response(JSON.stringify({
            error: error.message,
            stripe_type: error.type ?? null,
            stripe_code: error.code ?? null,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
