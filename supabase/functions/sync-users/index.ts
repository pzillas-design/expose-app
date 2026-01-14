import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Admin Verification
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') throw new Error('Unauthorized')

        // 2. Initialize Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 3. Sync Logic
        let page = 1
        let updatedCount = 0
        let hasMore = true

        while (hasMore) {
            const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
                page: page,
                perPage: 50
            })

            if (error) throw error
            if (!users || users.length === 0) {
                hasMore = false
                break
            }

            for (const u of users) {
                // Check if profile exists
                const { data: existing } = await supabaseAdmin.from('profiles').select('id, email').eq('id', u.id).maybeSingle()

                if (!existing) {
                    // Create missing profile
                    await supabaseAdmin.from('profiles').insert({
                        id: u.id,
                        email: u.email,
                        full_name: u.user_metadata?.full_name || 'User',
                        credits: 0 // Default for recovered users
                    })
                    updatedCount++
                } else if (!existing.email || existing.email !== u.email) {
                    // Update missing/wrong email
                    await supabaseAdmin.from('profiles').update({ email: u.email }).eq('id', u.id)
                    updatedCount++
                }
            }

            page++
        }

        return new Response(
            JSON.stringify({ message: `Synced ${updatedCount} profiles` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
