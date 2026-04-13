import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Verify admin
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Unauthorized')
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)
        if (!user) throw new Error('Unauthorized')

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        if (profile?.role !== 'admin') throw new Error('Forbidden')

        const { paymentIntentId, amountCents } = await req.json()
        if (!paymentIntentId) throw new Error('paymentIntentId required')

        const refundParams: any = { payment_intent: paymentIntentId }
        if (amountCents) refundParams.amount = amountCents

        const refund = await stripe.refunds.create(refundParams)

        console.log(`[admin-refund] Refund created: ${refund.id} for PI ${paymentIntentId}`)

        return new Response(JSON.stringify({ refundId: refund.id, status: refund.status }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    } catch (err: any) {
        console.error('[admin-refund] error:', err.message)
        return new Response(JSON.stringify({ error: err.message }), {
            status: err.message === 'Forbidden' ? 403 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
