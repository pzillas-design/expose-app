
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2022-11-15',
})

const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
    const signature = req.headers.get('stripe-signature')

    try {
        const body = await req.text()
        const event = stripe.webhooks.constructEvent(
            body,
            signature ?? '',
            Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
        )

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object
            const userId = session.metadata.user_id
            const amount = parseFloat(session.metadata.amount)

            // 1. Get current balance
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('credits, total_spent')
                .eq('id', userId)
                .single()

            if (profile) {
                // 2. Update balance
                const newCredits = (profile.credits || 0) + amount
                const newTotalSpent = (profile.total_spent || 0) + amount

                await supabaseAdmin
                    .from('profiles')
                    .update({
                        credits: newCredits,
                        total_spent: newTotalSpent,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userId)

                console.log(`Successfully added ${amount}€ to user ${userId}`)
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 })
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`)
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }
})
