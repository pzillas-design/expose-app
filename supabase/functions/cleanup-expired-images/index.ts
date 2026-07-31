// @ts-nocheck
// -----------------------------------------------------------------------------
// cleanup-expired-images — enforces the image retention window.
// -----------------------------------------------------------------------------
// HISTORY / WHY THIS WAS REWRITTEN
// The previous version queried `canvas_images`, a legacy table with 0 rows — the
// app writes to `images`. So the nightly cron ran, found nothing and exited: the
// 30-day TTL had never deleted anything since launch, while the UI showed users
// an "expires in X days" countdown. This version targets the real table and also
// clears the temp-upload scratch space, which was never cleaned either.
//
// Reference images are NOT separate storage objects — they live inline as base64
// inside the (double-encoded) annotations JSON, so they vanish with the row and
// need no separate deletion.
//
// Usage:
//   POST /cleanup-expired-images            → deletes
//   POST /cleanup-expired-images?dryRun=1   → reports only, changes nothing
//   Optional: ?ttlDays=30  ?tempHours=6
// -----------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEFAULT_TTL_DAYS = 30;
const DEFAULT_TEMP_HOURS = 6;      // temp uploads are consumed within minutes
const ROOT_BATCH = 200;            // roots pulled per pass
const STORAGE_BATCH = 100;         // storage remove() payload limit
const ID_BATCH = 80;               // ids per .in() — see chunked() below
const TIME_BUDGET_MS = 110_000;    // stay well inside the function wall-clock

/**
 * PostgREST puts .in() values in the URL query string, so a few hundred UUIDs
 * blow past the URL length limit and the request silently returns nothing.
 * That is not theoretical: a dry run reported 423 rows to delete but 0 files,
 * because the storage_path lookup came back empty — which would have deleted
 * the rows and orphaned every file. All .in() calls must go through here.
 */
const chunked = <T,>(arr: T[], size = ID_BATCH): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** thumb_<file> sibling that the app generates next to each image. */
const thumbPathFor = (p: string) => {
    const parts = p.split('/');
    return [...parts.slice(0, -1), `thumb_${parts[parts.length - 1]}`].join('/');
};

/** Remove old scratch files under _temp_fal/ and _temp_kie/. */
async function cleanupTempFiles(admin: any, olderThanMs: number, dryRun: boolean) {
    let found = 0, removed = 0;
    for (const prefix of ['_temp_fal', '_temp_kie']) {
        let offset = 0;
        while (true) {
            const { data: files, error } = await admin.storage
                .from('user-content')
                .list(prefix, { limit: 1000, offset });
            if (error) { console.error(`[cleanup] list ${prefix} failed:`, error.message); break; }
            if (!files || files.length === 0) break;

            const stale = files
                .filter((f: any) => {
                    const ts = new Date(f.created_at ?? f.updated_at ?? 0).getTime();
                    return ts > 0 && Date.now() - ts > olderThanMs;
                })
                .map((f: any) => `${prefix}/${f.name}`);

            found += stale.length;
            if (stale.length && !dryRun) {
                for (let i = 0; i < stale.length; i += STORAGE_BATCH) {
                    const chunk = stale.slice(i, i + STORAGE_BATCH);
                    const { error: rmErr } = await admin.storage
                        .from('user-content').remove(chunk);
                    if (rmErr) console.error('[cleanup] temp remove failed:', rmErr.message);
                    else removed += chunk.length;
                }
            }
            if (files.length < 1000) break;
            offset += files.length;
        }
    }
    return { found, removed };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const started = Date.now();
    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dryRun') === '1';
    // The endpoint runs without JWT verification (the cron cannot hold a user
    // token), so query params must never be able to WIDEN the deletion: an
    // attacker passing ?ttlDays=0 would otherwise wipe every image. Overrides may
    // only ever make the window LONGER, never shorter than the configured TTL.
    const rawTtl = Number(url.searchParams.get('ttlDays'));
    const ttlDays = Number.isFinite(rawTtl) ? Math.max(rawTtl, DEFAULT_TTL_DAYS) : DEFAULT_TTL_DAYS;
    const rawTemp = Number(url.searchParams.get('tempHours'));
    const tempHours = Number.isFinite(rawTemp) ? Math.max(rawTemp, 1) : DEFAULT_TEMP_HOURS;

    try {
        const admin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        const cutoff = new Date(Date.now() - ttlDays * 86_400_000).toISOString();
        console.log(`[cleanup] ttl=${ttlDays}d cutoff=${cutoff} dryRun=${dryRun}`);

        let rootsSeen = 0, rowsDeleted = 0, filesDeleted = 0, filesFailed = 0;

        // Loop passes until nothing expired is left or the time budget runs out.
        while (Date.now() - started < TIME_BUDGET_MS) {
            const { data: roots, error: rootsErr } = await admin
                .from('images')
                .select('id')
                .is('parent_id', null)
                .lt('created_at', cutoff)
                .limit(ROOT_BATCH);

            if (rootsErr) throw new Error(`roots query: ${rootsErr.message}`);
            if (!roots?.length) break;

            rootsSeen += roots.length;

            // Collect the whole edit tree — variants must go with their original,
            // otherwise children would be left pointing at a deleted parent.
            const ids = new Set<string>(roots.map((r: any) => r.id));
            let frontier: string[] = roots.map((r: any) => r.id);
            while (frontier.length) {
                const kids: any[] = [];
                for (const part of chunked(frontier)) {
                    const { data, error: kidsErr } = await admin
                        .from('images').select('id').in('parent_id', part);
                    if (kidsErr) throw new Error(`children query: ${kidsErr.message}`);
                    if (data?.length) kids.push(...data);
                }
                if (!kids.length) break;
                frontier = kids.map((k: any) => k.id).filter((id: string) => !ids.has(id));
                frontier.forEach((id: string) => ids.add(id));
            }
            const allIds = [...ids];

            // Storage paths (+ thumbnails) must be read BEFORE the rows disappear.
            // A failure here must abort the pass — deleting rows without their
            // paths would orphan the files permanently.
            const paths: string[] = [];
            for (const part of chunked(allIds)) {
                const { data, error: pathErr } = await admin
                    .from('images').select('storage_path')
                    .in('id', part).not('storage_path', 'is', null);
                if (pathErr) throw new Error(`storage_path query: ${pathErr.message}`);
                paths.push(...(data ?? []).map((r: any) => r.storage_path).filter(Boolean));
            }
            if (paths.length === 0 && allIds.length > 0) {
                throw new Error(`sanity check: ${allIds.length} rows but 0 storage paths — aborting to avoid orphaning files`);
            }
            const allPaths = [...paths, ...paths.map(thumbPathFor)];

            if (dryRun) {
                rowsDeleted += allIds.length;
                filesDeleted += allPaths.length;
                break; // one representative pass is enough for a report
            }

            // Files first: if this fails we still hold the rows, so the next run
            // retries instead of silently orphaning the objects.
            for (let i = 0; i < allPaths.length; i += STORAGE_BATCH) {
                const chunk = allPaths.slice(i, i + STORAGE_BATCH);
                const { error: rmErr } = await admin.storage.from('user-content').remove(chunk);
                if (rmErr) { filesFailed += chunk.length; console.error('[cleanup] storage:', rmErr.message); }
                else filesDeleted += chunk.length;
            }

            for (const part of chunked(allIds)) {
                const { error: delErr, count } = await admin
                    .from('images').delete({ count: 'exact' }).in('id', part);
                if (delErr) throw new Error(`row delete: ${delErr.message}`);
                rowsDeleted += count ?? 0;
            }

            console.log(`[cleanup] pass: ${roots.length} roots → ${allIds.length} rows, ${allPaths.length} files`);
        }

        // Old finished jobs (bookkeeping only, no user-visible content).
        let jobsCleaned = 0;
        if (!dryRun) {
            const { count } = await admin.from('generation_jobs')
                .delete({ count: 'exact' })
                .lt('created_at', cutoff)
                .in('status', ['completed', 'failed']);
            jobsCleaned = count ?? 0;
        }

        const temp = await cleanupTempFiles(admin, tempHours * 3_600_000, dryRun);

        const result = {
            dryRun, ttlDays,
            expired_roots: rootsSeen,
            rows_deleted: rowsDeleted,
            files_deleted: filesDeleted,
            files_failed: filesFailed,
            temp_files_found: temp.found,
            temp_files_removed: temp.removed,
            jobs_cleaned: jobsCleaned,
            duration_ms: Date.now() - started,
        };
        console.log('[cleanup] done:', JSON.stringify(result));
        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('[cleanup] failed:', err?.message || err);
        return new Response(JSON.stringify({ error: err?.message || String(err) }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
