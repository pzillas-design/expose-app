import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        let startDate: Date | null = null
        if (req.method !== 'GET') {
            try {
                const body = await req.json()
                if (body?.startDate) {
                    const parsed = new Date(body.startDate)
                    if (!Number.isNaN(parsed.getTime())) startDate = parsed
                }
            } catch {
                // ignore invalid optional body
            }
        }

        // Verify admin
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
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

        // Fetch all succeeded payment intents from Stripe
        let allPayments: any[] = []
        let hasMore = true
        let startingAfter: string | undefined

        while (hasMore) {
            const params: any = { limit: 100, 'expand[]': ['data.charges'] }
            if (startingAfter) params.starting_after = startingAfter

            const result = await stripe.paymentIntents.list(params)
            allPayments = [...allPayments, ...result.data]
            hasMore = result.has_more
            if (result.data.length > 0) {
                startingAfter = result.data[result.data.length - 1].id
            }
        }

        const succeeded = allPayments.filter(pi => {
            if (pi.status !== 'succeeded') return false
            if (!startDate) return true
            return new Date(pi.created * 1000) >= startDate
        })
        const totalRevenueCents = succeeded.reduce((sum, pi) => sum + pi.amount_received, 0)
        const totalRevenue = totalRevenueCents / 100

        // Group by month (last 6 months)
        const monthlyRevenue: Record<string, number> = {}
        succeeded.forEach(pi => {
            const d = new Date(pi.created * 1000)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            monthlyRevenue[key] = (monthlyRevenue[key] || 0) + pi.amount_received / 100
        })

        return new Response(JSON.stringify({
            totalRevenue,
            paymentCount: succeeded.length,
            monthlyRevenue,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: err.message === 'Forbidden' ? 403 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
