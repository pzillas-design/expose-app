import type { VercelRequest, VercelResponse } from '@vercel/node';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const origin = getCorsOrigin(req);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).end();

    const { url } = req.query;
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Missing url param' });

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    // Only allow image hosts
    const ALLOWED_HOSTS = ['i.pinimg.com', 'pinimg.com', 'i.pinterest.com', 'images.unsplash.com', 'cdn.pixabay.com'];
    if (!ALLOWED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
        return res.status(403).json({ error: 'Host not allowed' });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; expose-proxy/1.0)',
                'Referer': 'https://www.pinterest.com/',
                'Accept': 'image/*,*/*',
            },
        });

        if (!response.ok) return res.status(response.status).json({ error: 'Upstream error' });

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        if (!contentType.startsWith('image/')) return res.status(400).json({ error: 'Not an image' });

        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).send(Buffer.from(buffer));
    } catch (e) {
        return res.status(500).json({ error: 'Fetch failed' });
    }
}
