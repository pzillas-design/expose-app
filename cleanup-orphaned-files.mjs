/**
 * Cleanup Script: Find and delete orphaned files in Supabase Storage
 * 
 * This script finds files in storage that don't have corresponding DB entries
 * and deletes them to save storage costs.
 * 
 * Run with: node cleanup-orphaned-files.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nwxamngfnysostaefxif.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role key for storage access

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    console.log('Set it with: export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function cleanupOrphanedFiles() {
    console.log('🔍 Finding orphaned files in storage...\n');

    // 1. Get all files from storage
    const { data: storageFiles, error: storageError } = await supabase.storage
        .from('user-content')
        .list('', {
            limit: 1000,
            sortBy: { column: 'created_at', order: 'desc' }
        });

    if (storageError) {
        console.error('❌ Failed to list storage files:', storageError);
        return;
    }

    console.log(`📦 Found ${storageFiles.length} files in storage`);

    // 2. Get all storage paths from DB
    const { data: dbImages, error: dbError } = await supabase
        .from('canvas_images')
        .select('storage_path, thumb_storage_path');

    if (dbError) {
        console.error('❌ Failed to fetch DB images:', dbError);
        return;
    }

    const dbPaths = new Set();
    dbImages.forEach(img => {
        if (img.storage_path) dbPaths.add(img.storage_path);
        if (img.thumb_storage_path) dbPaths.add(img.thumb_storage_path);
    });

    console.log(`📊 Found ${dbPaths.size} files referenced in DB\n`);

    // 3. Find orphaned files
    const orphanedFiles = [];

    for (const folder of storageFiles) {
        if (folder.id) {
            // List files in each user folder
            const { data: userFiles } = await supabase.storage
                .from('user-content')
                .list(folder.name, { limit: 1000 });

            if (userFiles) {
                for (const file of userFiles) {
                    const fullPath = `${folder.name}/${file.name}`;
                    if (!dbPaths.has(fullPath)) {
                        orphanedFiles.push(fullPath);
                    }
                }
            }
        }
    }

    console.log(`🗑️  Found ${orphanedFiles.length} orphaned files\n`);

    if (orphanedFiles.length === 0) {
        console.log('✅ No orphaned files found!');
        return;
    }

    // 4. Show orphaned files
    console.log('Orphaned files:');
    orphanedFiles.slice(0, 10).forEach(path => console.log(`  - ${path}`));
    if (orphanedFiles.length > 10) {
        console.log(`  ... and ${orphanedFiles.length - 10} more`);
    }

    // 5. Ask for confirmation (in production, you'd want to confirm)
    console.log('\n⚠️  To delete these files, uncomment the deletion code below');
    console.log('⚠️  This action cannot be undone!\n');

    // UNCOMMENT TO DELETE:
    /*
    console.log('🗑️  Deleting orphaned files...');
    const { error: deleteError } = await supabase.storage
        .from('user-content')
        .remove(orphanedFiles);

    if (deleteError) {
        console.error('❌ Deletion failed:', deleteError);
    } else {
        console.log(`✅ Successfully deleted ${orphanedFiles.length} orphaned files`);
    }
    */
}

cleanupOrphanedFiles().catch(console.error);
