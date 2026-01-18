#!/usr/bin/env node

// Quick script to test the smart estimation RPC function
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwxamngfnysostaefxif.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eGFtbmdmbnlzb3N0YWVmeGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODQzNjYsImV4cCI6MjA4MTU2MDM2Nn0.2EuIuz8VRQ5diWybBaDovA3Tdx50wiub-zJjnpOWOIc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEstimation() {
    console.log('🔍 Testing smart generation estimates...\n');

    // Test the RPC function
    const { data, error } = await supabase.rpc('get_smart_generation_estimates');

    if (error) {
        console.error('❌ Error calling RPC:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️  No estimation data found. This means:');
        console.log('   - No completed generations yet, OR');
        console.log('   - Not enough samples (need at least 1 for base duration)');
        return;
    }

    console.log('✅ Estimation data found!\n');

    data.forEach((estimate) => {
        console.log(`📊 Quality Mode: ${estimate.quality_mode}`);
        console.log(`   Base Duration: ${estimate.base_duration_ms}ms`);
        console.log(`   Concurrency Factor: ${estimate.concurrency_factor}`);
        console.log(`   Sample Count: ${estimate.sample_count}`);
        console.log('');
    });

    // Also check generation_jobs table
    console.log('📋 Checking generation_jobs table...\n');

    const { data: jobs, error: jobsError } = await supabase
        .from('generation_jobs')
        .select('id, status, quality_mode, duration_ms, concurrent_jobs, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (jobsError) {
        console.error('❌ Error fetching jobs:', jobsError);
        return;
    }

    if (!jobs || jobs.length === 0) {
        console.log('⚠️  No generation jobs found');
        return;
    }

    console.log(`Found ${jobs.length} recent jobs:\n`);
    jobs.forEach((job, i) => {
        console.log(`${i + 1}. Job ${job.id.substring(0, 8)}...`);
        console.log(`   Status: ${job.status}`);
        console.log(`   Quality: ${job.quality_mode || 'N/A'}`);
        console.log(`   Duration: ${job.duration_ms || 'N/A'}ms`);
        console.log(`   Concurrent: ${job.concurrent_jobs || 'N/A'}`);
        console.log(`   Created: ${new Date(job.created_at).toLocaleString()}`);
        console.log('');
    });
}

testEstimation().catch(console.error);
