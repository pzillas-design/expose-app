import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!process.env.VITE_SUPABASE_URL) dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { data, error } = await supabase.from('images').select('*').limit(1);
    console.log(error ? 'Error: ' + error.message : 'Success: ' + (data && data.length > 0 ? Object.keys(data[0]).join(', ') : 'Empty table'));

    // Check if beta state exists just in case
    console.log("If beta exposes localStorage, we can't check it from Node, but we can verify table exists.");
}
run();
