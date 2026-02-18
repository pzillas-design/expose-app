
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env from .env or .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    const { data, error } = await supabase
        .from('global_presets')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching presets:', error);
        process.exit(1);
    }

    if (data && data.length > 0) {
        console.log('Columns in global_presets:', Object.keys(data[0]));
    } else {
        // Try to get schema via RPC or just assume it's empty
        console.log('Table global_presets is empty, cannot infer columns from data.');

        // Attempt to select a non-existent column to see error message
        const { error: error2 } = await supabase
            .from('global_presets')
            .select('slug')
            .limit(1);

        if (error2) {
            console.log('Column "slug" seems to be missing:', error2.message);
        } else {
            console.log('Column "slug" exists!');
        }
    }
}

checkColumns();
