import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://rhocpnetpxficxnrprsq.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!key) {
    console.error('❌ Error: Missing Supabase Key');
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    console.log('--- Database Check ---');

    // Check Presets
    const { data: presets, count: presetCount, error: pError } = await supabase
        .from('global_presets')
        .select('*', { count: 'exact' });

    if (pError) {
        console.error('Presets Error:', pError);
    } else {
        console.log(`Global Presets: ${presetCount} records found.`);
        if (presets && presets.length > 0) {
            console.log('Sample Preset Titles:', presets.map(p => p.title).join(', '));
        }
    }

    // Check Objects
    const { data: objects, count: objectCount, error: oError } = await supabase
        .from('global_objects_items')
        .select('*', { count: 'exact' });

    if (oError) {
        console.error('Objects Error:', oError);
    } else {
        console.log(`Global Objects: ${objectCount} records found.`);
        if (objects && objects.length > 0) {
            console.log('Sample Object Labels:', objects.map(o => o.label_de).join(', '));
        }
    }
}

check();
