const url = 'https://nwxamngfnysostaefxif.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhc2UiLCJyZWYiOiJud3hhbW5nZm55c29zdGFlZnhpZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY1OTg0MzY2LCJleHAiOjIwODE1NjAzNjZ9.2EuIuz8VRQ5diWybBaDovA3Tdx50wiub-zJjnpOWOIc';

async function check() {
    console.log('Checking global_presets...');
    try {
        const response = await fetch(`${url}/global_presets?select=*`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const data = await response.json();
        if (response.ok) {
            console.log(`Found ${data.length} presets.`);
            data.forEach(p => {
                console.log(`- [${p.id}] ${p.title} (${p.lang})`);
            });
        } else {
            console.error('Error fetching presets:', data);
        }
    } catch (e) {
        console.error('Fetch failed:', e);
    }

    console.log('\nChecking global_objects_items...');
    try {
        const response = await fetch(`${url}/global_objects_items?select=*`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const data = await response.json();
        if (response.ok) {
            console.log(`Found ${data.length} objects.`);
        } else {
            console.error('Error fetching objects:', data);
        }
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}

check();
