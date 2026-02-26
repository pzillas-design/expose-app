#!/usr/bin/env node

// Script to execute the smart estimation SQL migration
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rhocpnetpxficxnrprsq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.error('❌ Error: Missing Supabase Key (SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
    console.log('🔧 Executing smart estimation SQL migration...\n');

    // Read the SQL file
    const sql = readFileSync('supabase/migrations/20260117210000_get_average_generation_time.sql', 'utf-8');

    console.log('📄 SQL to execute:');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log('');

    // Note: The anon key doesn't have permission to execute raw SQL
    // We need to use the RPC approach or service role key

    console.log('⚠️  Cannot execute raw SQL with anon key.');
    console.log('');
    console.log('📋 Please execute this SQL manually in Supabase Dashboard:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/nwxamngfnysostaefxif/sql/new');
    console.log('   2. Paste the SQL from above');
    console.log('   3. Click "Run"');
    console.log('');
    console.log('Or copy this one-liner:');
    console.log('');
    console.log(sql.split('\n').filter(line => !line.trim().startsWith('--')).join(' '));
}

executeMigration().catch(console.error);
