#!/usr/bin/env node

// Check if the function exists and what version it is
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwxamngfnysostaefxif.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eGFtbmdmbnlzb3N0YWVmeGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODQzNjYsImV4cCI6MjA4MTU2MDM2Nn0.2EuIuz8VRQ5diWybBaDovA3Tdx50wiub-zJjnpOWOIc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFunction() {
    console.log('🔍 Checking get_smart_generation_estimates function...\n');

    // Try calling it directly
    console.log('Attempting to call RPC...');
    const { data, error } = await supabase.rpc('get_smart_generation_estimates');

    if (error) {
        console.error('❌ Error:', error.message);
        console.error('Code:', error.code);
        console.error('Details:', error.details);

        if (error.code === '42702') {
            console.log('\n⚠️  The function still has the ambiguous column error.');
            console.log('This means the SQL was not executed correctly or is cached.');
            console.log('\n💡 Try these steps:');
            console.log('1. In Supabase Dashboard, go to Database → Functions');
            console.log('2. Find get_smart_generation_estimates');
            console.log('3. Delete it completely');
            console.log('4. Run the SQL again');
        }
    } else {
        console.log('✅ Function works!');
        console.log('Data:', data);
    }
}

checkFunction().catch(console.error);
