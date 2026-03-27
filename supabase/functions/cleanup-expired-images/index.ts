// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TTL_DAYS = 30;
const BATCH_SIZE = 50; // delete in batches to avoid timeouts

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const cutoff = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
        console.log(`[cleanup] Finding root images older than ${cutoff} (${TTL_DAYS} days)`);

        // 1. Find expired root images (no parent_id)
        const { data: expiredRoots, error: rootsError } = await supabaseAdmin
            .from('canvas_images')
            .select('id')
            .is('parent_id', null)
            .lt('created_at', cutoff)
            .limit(BATCH_SIZE);

        if (rootsError) {
            console.error('[cleanup] Error finding expired roots:', rootsError);
            return new Response(JSON.stringify({ error: rootsError.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!expiredRoots || expiredRoots.length === 0) {
            console.log('[cleanup] No expired images found');
            return new Response(JSON.stringify({ deleted: 0 }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const rootIds = expiredRoots.map(r => r.id);
        console.log(`[cleanup] Found ${rootIds.length} expired root images`);

        // 2. Find all descendants (children, grandchildren, etc.)
        const allIdsToDelete = [...rootIds];
        let parentIds = rootIds;

        // Walk the parent_id chain to collect all descendants
        while (parentIds.length > 0) {
            const { data: children, error: childError } = await supabaseAdmin
                .from('canvas_images')
                .select('id')
                .in('parent_id', parentIds);

            if (childError) {
                console.error('[cleanup] Error finding children:', childError);
                break;
            }

            if (!children || children.length === 0) break;

            const childIds = children.map(c => c.id);
            allIdsToDelete.push(...childIds);
            parentIds = childIds;
        }

        console.log(`[cleanup] Total images to delete: ${allIdsToDelete.length} (${rootIds.length} roots + ${allIdsToDelete.length - rootIds.length} variants)`);

        // 3. Fetch storage paths before deletion
        const { data: storagePaths } = await supabaseAdmin
            .from('canvas_images')
            .select('storage_path')
            .in('id', allIdsToDelete)
            .not('storage_path', 'is', null);

        const paths = (storagePaths || [])
            .map(r => r.storage_path)
            .filter(Boolean);

        // Also collect thumbnail paths
        const thumbPaths = paths.map(p => {
            const parts = p.split('/');
            const filename = parts[parts.length - 1];
            return [...parts.slice(0, -1), `thumb_${filename}`].join('/');
        });

        const allPaths = [...paths, ...thumbPaths];

        // 4. Delete from canvas_images table
        const { error: deleteError, count: deleteCount } = await supabaseAdmin
            .from('canvas_images')
            .delete({ count: 'exact' })
            .in('id', allIdsToDelete);

        if (deleteError) {
            console.error('[cleanup] Error deleting from DB:', deleteError);
            return new Response(JSON.stringify({ error: deleteError.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log(`[cleanup] Deleted ${deleteCount} records from canvas_images`);

        // 5. Delete from storage (in batches of 100)
        let storageDeleted = 0;
        for (let i = 0; i < allPaths.length; i += 100) {
            const batch = allPaths.slice(i, i + 100);
            const { error: storageError } = await supabaseAdmin.storage
                .from('user-content')
                .remove(batch);

            if (storageError) {
                console.error(`[cleanup] Storage batch ${i / 100 + 1} error:`, storageError);
            } else {
                storageDeleted += batch.length;
            }
        }

        console.log(`[cleanup] Deleted ${storageDeleted} files from storage`);

        // 6. Clean up orphaned generation_jobs (optional)
        const { error: jobsError, count: jobsCount } = await supabaseAdmin
            .from('generation_jobs')
            .delete({ count: 'exact' })
            .lt('created_at', cutoff)
            .in('status', ['completed', 'failed']);

        if (jobsError) {
            console.warn('[cleanup] generation_jobs cleanup error (non-fatal):', jobsError);
        } else {
            console.log(`[cleanup] Cleaned up ${jobsCount} old generation_jobs`);
        }

        const result = {
            expired_roots: rootIds.length,
            total_deleted: deleteCount,
            storage_files_deleted: storageDeleted,
            jobs_cleaned: jobsCount || 0
        };

        console.log('[cleanup] Done:', JSON.stringify(result));

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('[cleanup] Unexpected error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
