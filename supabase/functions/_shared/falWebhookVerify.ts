// @ts-nocheck
// -----------------------------------------------------------------------------
// falWebhookVerify — verify the authenticity of an incoming fal.ai webhook.
// -----------------------------------------------------------------------------
// fal signs each webhook with ED25519. We verify per their spec:
//   https://fal.ai/docs/documentation/model-apis/inference/webhooks#verification-process
//
//   message = requestId "\n" userId "\n" timestamp "\n" hex(sha256(rawBody))
//   signature = hex, verified against any key in the JWKS.
//
// This is the security boundary for the webhook (it runs with --no-verify-jwt
// because fal is not a Supabase user). A caller who can't forge fal's signature
// cannot trigger a fake completion or refund.
// -----------------------------------------------------------------------------

const JWKS_URL = 'https://rest.fal.ai/.well-known/jwks.json';
const TIMESTAMP_LEEWAY_S = 300; // ±5 min replay window

let cachedKeys: CryptoKey[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h (spec: ≤24h)

const hexToBytes = (hex: string): Uint8Array => {
    const clean = hex.trim().toLowerCase();
    if (clean.length % 2 !== 0 || /[^0-9a-f]/.test(clean)) throw new Error('bad hex');
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
};

const bytesToHex = (bytes: Uint8Array): string =>
    Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

async function loadKeys(): Promise<CryptoKey[]> {
    const now = Date.now();
    if (cachedKeys && now - cachedAt < CACHE_TTL_MS) return cachedKeys;

    const res = await fetch(JWKS_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`JWKS fetch failed: HTTP ${res.status}`);
    const jwks = await res.json();
    const keys: CryptoKey[] = [];
    for (const jwk of jwks?.keys ?? []) {
        try {
            // fal publishes OKP/Ed25519 keys with base64url `x`.
            const key = await crypto.subtle.importKey(
                'jwk',
                { kty: 'OKP', crv: 'Ed25519', x: jwk.x, ext: true },
                { name: 'Ed25519' },
                false,
                ['verify'],
            );
            keys.push(key);
        } catch (e) {
            console.warn('[falWebhookVerify] skip key:', (e as any)?.message || e);
        }
    }
    if (keys.length === 0) throw new Error('JWKS contained no usable Ed25519 keys');
    cachedKeys = keys;
    cachedAt = now;
    return keys;
}

export interface VerifyResult { valid: boolean; reason?: string }

/**
 * @param headers incoming request headers
 * @param rawBody the exact raw bytes of the request body (NOT JSON-reparsed)
 */
export async function verifyFalWebhook(headers: Headers, rawBody: Uint8Array): Promise<VerifyResult> {
    const requestId = headers.get('x-fal-webhook-request-id');
    const userId = headers.get('x-fal-webhook-user-id');
    const timestamp = headers.get('x-fal-webhook-timestamp');
    const signature = headers.get('x-fal-webhook-signature');
    if (!requestId || !userId || !timestamp || !signature) {
        return { valid: false, reason: 'missing webhook headers' };
    }

    // Replay protection
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > TIMESTAMP_LEEWAY_S) {
        return { valid: false, reason: 'timestamp outside leeway' };
    }

    // message = requestId \n userId \n timestamp \n hex(sha256(body))
    const bodyHashBuf = await crypto.subtle.digest('SHA-256', rawBody);
    const bodyHashHex = bytesToHex(new Uint8Array(bodyHashBuf));
    const message = new TextEncoder().encode(
        `${requestId}\n${userId}\n${timestamp}\n${bodyHashHex}`,
    );

    let sigBytes: Uint8Array;
    try { sigBytes = hexToBytes(signature); }
    catch { return { valid: false, reason: 'signature not hex' }; }

    let keys: CryptoKey[];
    try { keys = await loadKeys(); }
    catch (e) { return { valid: false, reason: `jwks: ${(e as any)?.message || e}` }; }

    for (const key of keys) {
        try {
            const ok = await crypto.subtle.verify('Ed25519', key, sigBytes, message);
            if (ok) return { valid: true };
        } catch { /* try next key */ }
    }
    return { valid: false, reason: 'no key verified signature' };
}
