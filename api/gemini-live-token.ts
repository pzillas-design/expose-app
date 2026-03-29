import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const DEFAULT_LIVE_MODEL = 'gemini-3.1-flash-live-preview';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
            .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            .end();
    }

    if (req.method !== 'POST') {
        Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.VOICE_ASSIST_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
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

        return res
            .status(200)
            .setHeader('Access-Control-Allow-Origin', '*')
            .json({
                token: token.name,
                model,
                expiresAt: expireTime
            });
    } catch (error) {
        console.error('[voice-token] failed to create token', error);
        Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
        return res.status(500).json({
            error: 'Unable to create live voice token',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
