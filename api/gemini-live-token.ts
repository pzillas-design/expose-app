import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// --- CORS: restrict to own domains ---
const ALLOWED_ORIGINS = [
    'https://expose.ae',
    'https://www.expose.ae',
    'https://staging.expose.ae',
    'http://localhost:5173',
    'http://localhost:3000',
];

function getCorsOrigin(req: VercelRequest): string {
    const origin = req.headers.origin || '';
    return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

function setCors(res: VercelResponse, origin: string) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
}

const DEFAULT_LIVE_MODEL = 'gemini-3.1-flash-live-preview';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const corsOrigin = getCorsOrigin(req);

    if (req.method === 'OPTIONS') {
        setCors(res, corsOrigin);
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        setCors(res, corsOrigin);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // --- Auth: verify Supabase JWT ---
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            setCors(res, corsOrigin);
            return res.status(401).json({ error: 'Missing authorization token' });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (supabaseUrl && supabaseServiceKey) {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
            if (authError || !user) {
                setCors(res, corsOrigin);
                return res.status(401).json({ error: 'Invalid or expired session' });
            }
        }

        // --- Token generation ---
        const apiKey = process.env.VOICE_ASSIST_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            setCors(res, corsOrigin);
            return res.status(500).json({ error: 'Missing Google API key for voice mode' });
        }

        const ai = new GoogleGenAI({ apiKey });

        const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();
        const requestedModel = typeof req.body?.model === 'string' ? req.body.model.trim() : '';
        const model = requestedModel || process.env.GEMINI_LIVE_MODEL || DEFAULT_LIVE_MODEL;

        // Note: liveConnectConstraints omitted — causes 1011 errors with current SDK
        const token = await ai.authTokens.create({
            config: {
                uses: 1,
                expireTime,
                newSessionExpireTime,
                httpOptions: { apiVersion: 'v1alpha' }
            }
        });

        setCors(res, corsOrigin);
        return res.status(200).json({
            token: token.name,
            model,
            expiresAt: expireTime
        });
    } catch (error) {
        console.error('[voice-token] failed to create token', error);
        setCors(res, corsOrigin);
        return res.status(500).json({
            error: 'Unable to create live voice token',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
