import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

Deno.serve(async (req) => {
    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Delete boards that are:
        // 1. Empty (no images)
        // 2. Older than 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

        const { data: emptyBoards, error: fetchError } = await supabaseAdmin
            .from('boards')
            .select('id, created_at')
            .eq('item_count', 0)
            .lt('created_at', twentyFourHoursAgo)

        if (fetchError) {
            console.error('Error fetching empty boards:', fetchError)
            return new Response(
                JSON.stringify({ error: 'Failed to fetch empty boards', details: fetchError }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        if (!emptyBoards || emptyBoards.length === 0) {
            console.log('No empty boards to clean up')
            return new Response(
                JSON.stringify({ message: 'No empty boards to clean up', deleted: 0 }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const boardIds = emptyBoards.map(b => b.id)
        console.log(`Found ${boardIds.length} empty boards to delete:`, boardIds)

        const { error: deleteError } = await supabaseAdmin
            .from('boards')
            .delete()
            .in('id', boardIds)

        if (deleteError) {
            console.error('Error deleting empty boards:', deleteError)
            return new Response(
                JSON.stringify({ error: 'Failed to delete empty boards', details: deleteError }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        console.log(`Successfully deleted ${boardIds.length} empty boards`)

        return new Response(
            JSON.stringify({
                message: 'Empty boards cleaned up successfully',
                deleted: boardIds.length,
                boardIds
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Unexpected error in cleanup-empty-boards:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
