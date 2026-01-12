import { createClient } from '@supabase/supabase-js';

const url = 'https://nwxamngfnysostaefxif.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhc2UiLCJyZWYiOiJud3hhbW5nZm55c29zdGFlZnhpZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY1OTg0MzY2LCJleHAiOjIwODE1NjAzNjZ9.2EuIuz8VRQ5diWybBaDovA3Tdx50wiub-zJjnpOWOIc';

const supabase = createClient(url, key);

async function check() {
    console.log('--- API Pricing Check ---');
    const { data, error } = await supabase.from('api_pricing').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.table(data);
    }
}

check();
