
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing connection to:', url);
console.log('Using key starting with:', key?.substring(0, 15) + '...');

const supabase = createClient(url || '', key || '');

async function test() {
    console.log('\n1. Testing Auth Settings...');
    const { data: auth, error: authError } = await supabase.auth.getSession();
    if (authError) {
        console.error('❌ Auth Error:', authError.message);
    } else {
        console.log('✅ Auth Session retrieved (User: ' + (auth.session?.user?.email || 'Guest') + ')');
    }

    console.log('\n2. Testing Public Table (profiles)...');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(1);
    if (pError) {
        console.error('❌ Profiles Error:', pError.message, pError.hint);
    } else {
        console.log('✅ Profiles table access OK.');
    }

    console.log('\n3. Testing Missing Table (global_objects_items)...');
    const { data: stamps, error: sError } = await supabase.from('global_objects_items').select('*').limit(1);
    if (sError) {
        console.error('❌ Stamps Error:', sError.message, sError.hint);
    } else {
        console.log('✅ Stamps table access OK.');
    }
}

test();
