
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { verifyJwtSignature } from '../_shared/auth.ts'

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
        // Authenticate user — verify JWT signature but skip expiration check.
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log('[checkout] verifying JWT...');
        const authHeader = req.headers.get('Authorization') ?? '';
        const jwtToken = authHeader.replace(/^Bearer\s+/i, '');
        const jwtPayload = await verifyJwtSignature(jwtToken);
        const userId = jwtPayload.sub;

        console.log(`[checkout] looking up user ${userId}...`);
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
        const user = authUser?.user ?? null
        if (!user) throw new Error('User not found')

        const body = await req.json();
        const { success_url, cancel_url } = body;
        // Coerce amount to number in case the client sends a string
        const amount = typeof body.amount === 'string' ? parseFloat(body.amount) : body.amount;
        console.log(`[checkout] amount=${amount} (${typeof body.amount} raw), urls: ${success_url} / ${cancel_url}`);

        // Server-side validation — prevent amount manipulation and open redirects
        const MIN_AMOUNT = 5.0;
        const MAX_AMOUNT = 500.0;
        if (typeof amount !== 'number' || isNaN(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
            throw new Error(`Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT} EUR`);
        }
        const isAllowedUrl = (url: string) => {
            if (!url) return false;
            // Allow any subdomain of expose.ae (staging, preview, www, etc.)
            if (/^https:\/\/([a-z0-9-]+\.)*expose\.ae(\/|$)/i.test(url)) return true;
            // Allow localhost for development
            if (url.startsWith('http://localhost') || url.startsWith('https://localhost')) return true;
            return false;
        };
        if (!isAllowedUrl(success_url) || !isAllowedUrl(cancel_url)) {
            throw new Error(`Invalid redirect URL: ${success_url}`);
        }

        // Get or create Stripe Customer — link to profile for future refunds
        const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single()

        let stripeCustomerId = profileData?.stripe_customer_id

        if (!stripeCustomerId) {
            // Check if customer already exists in Stripe by email
            const existing = await stripe.customers.list({ email: user.email ?? '', limit: 1 })
            if (existing.data.length > 0) {
                stripeCustomerId = existing.data[0].id
            } else {
                const customer = await stripe.customers.create({
                    email: user.email ?? undefined,
                    metadata: { user_id: user.id },
                })
                stripeCustomerId = customer.id
            }
            // Save to profile
            await supabaseAdmin.from('profiles').update({ stripe_customer_id: stripeCustomerId }).eq('id', userId)
            console.log(`[checkout] linked Stripe customer ${stripeCustomerId} to user ${userId}`)
        }

        console.log(`[checkout] creating Stripe session for ${user.email}, amount: ${amount}...`);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
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
            customer: stripeCustomerId,
            metadata: {
                user_id: user.id,
                amount: amount.toString(),
            },
        })

        console.log(`[checkout] session created: ${session.id}`);

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error("[checkout] error:", error.message, "| type:", error.type, "| code:", error.code);
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
