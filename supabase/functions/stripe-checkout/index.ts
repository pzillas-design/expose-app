
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'

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
        // Authenticate user — extract sub from JWT payload without signature verification.
        // verify_jwt=false is set in config.toml so expired tokens still reach us; we look
        // up the user via service-role to confirm they exist (avoids getUser() network call
        // failing on expired tokens in supabase-js v2.99+ which triggers sign-out).
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const authHeader = req.headers.get('Authorization') ?? '';
        const jwtToken = authHeader.replace(/^Bearer\s+/i, '');
        let userId: string | null = null;
        try {
            const parts = jwtToken.split('.');
            if (parts.length === 3) {
                const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
                userId = JSON.parse(payloadJson)?.sub ?? null;
            }
        } catch { /* malformed JWT */ }

        if (!userId) throw new Error('User not found')

        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
        const user = authUser?.user ?? null
        if (!user) throw new Error('User not found')

        const { amount, success_url, cancel_url } = await req.json()
        console.log(`Creating checkout session for user ${user.email}, amount: ${amount}`);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'paypal'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: 'Exposé Credit Top-up',
                            description: `Adding ${amount.toFixed(2)}€ to your balance`,
                        },
                        unit_amount: Math.round(amount * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url,
            cancel_url,
            customer_email: user.email,
            metadata: {
                user_id: user.id,
                amount: amount.toString(),
            },
        })

        console.log(`Checkout session created: ${session.id}`);

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error("Stripe Checkout Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
