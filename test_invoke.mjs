import { createClient } from '@supabase/supabase-js';

const url1 = process.env.VITE_SUPABASE_URL || 'https://nwxamngfnysostaefxif.supabase.co';

console.log("Testing fetch directly to Edge Function...");
const go = async (url) => {
    try {
        const res = await fetch(`${url}/functions/v1/generate-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        console.log(`[${url}] Status:`, res.status, res.statusText);
        const text = await res.text();
        console.log(`[${url}] response:`, text.substring(0, 100));
    } catch (e) {
        console.error(`[${url}] Fetch failed:`, e.message);
    }
};

go('https://rhocpnetpxficxnrprsq.supabase.co'); // v6 Production
go('https://nwxamngfnysostaefxif.supabase.co'); // v5 Staging?
