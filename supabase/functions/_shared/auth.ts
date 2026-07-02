/**
 * JWT signature verification for edge functions.
 * Handles both HS256 (HMAC-SHA256, legacy secret) and ES256 (ECDSA, verified
 * against the project's public JWKS) tokens. Fails closed: a token whose
 * signature cannot be verified is rejected — there is no unverified fallback.
 * Intentionally skips expiration check (verify_jwt=false handles expired tokens).
 */

function base64UrlDecode(str: string): Uint8Array {
    // Convert base64url to base64
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // Pad if needed
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, c => c.charCodeAt(0));
}

// JWKS is cached per isolate — Supabase rotates keys rarely; on a kid miss we refetch once.
let jwksCache: { keys: any[] } | null = null;

async function fetchJwks(force = false): Promise<{ keys: any[] }> {
    if (jwksCache && !force) return jwksCache;
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    if (!supabaseUrl) throw new Error('SUPABASE_URL not configured');
    const res = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
    jwksCache = await res.json();
    return jwksCache!;
}

async function verifyEs256(headerB64: string, payloadB64: string, signatureB64: string, kid?: string): Promise<void> {
    let jwks = await fetchJwks();
    let jwk = jwks.keys.find((k: any) => (kid ? k.kid === kid : k.alg === 'ES256' || k.kty === 'EC'));
    if (!jwk && kid) {
        // Key rotation: refetch once before giving up.
        jwks = await fetchJwks(true);
        jwk = jwks.keys.find((k: any) => k.kid === kid);
    }
    if (!jwk) throw new Error('No matching JWKS key for token');

    const key = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
    );
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    // JWT ES256 signatures are raw r||s (64 bytes) — exactly what WebCrypto expects.
    const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, base64UrlDecode(signatureB64), data);
    if (!valid) throw new Error('Invalid JWT signature');
}

async function verifyHs256(headerB64: string, payloadB64: string, signatureB64: string, secret: string): Promise<void> {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
    );
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify('HMAC', key, base64UrlDecode(signatureB64), data);
    if (!valid) throw new Error('Invalid JWT signature');
}

export async function verifyJwtSignature(token: string): Promise<{ sub: string; email?: string; role?: string }> {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Malformed JWT');

    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
    const alg = header.alg ?? 'HS256';

    if (alg === 'ES256') {
        await verifyEs256(headerB64, payloadB64, signatureB64, header.kid);
    } else if (alg === 'HS256') {
        const secret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET');
        if (!secret) throw new Error('No JWT secret configured for HS256 verification');
        await verifyHs256(headerB64, payloadB64, signatureB64, secret);
    } else {
        throw new Error(`Unsupported JWT algorithm: ${alg}`);
    }

    // Parse payload — intentionally NOT checking exp
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    if (!payload.sub) throw new Error('JWT missing sub claim');

    return { sub: payload.sub, email: payload.email, role: payload.role };
}
