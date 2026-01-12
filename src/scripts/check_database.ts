import { createClient } from '@supabase/supabase-js';

const url = 'https://nwxamngfnysostaefxif.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhc2UiLCJyZWYiOiJud3hhbW5nZm55c29zdGFlZnhpZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY1OTg0MzY2LCJleHAiOjIwODE1NjAzNjZ9.2EuIuz8VRQ5diWybBaDovA3Tdx50wiub-zJjnpOWOIc';

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
