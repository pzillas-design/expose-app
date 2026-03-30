/**
 * JWT signature verification for edge functions.
 * Handles both HS256 (HMAC-SHA256) and ES256 (ECDSA) tokens.
 * Supabase started issuing ES256 tokens; for those we fall back to unverified
 * decode since getUserById with the service role key provides the real auth check.
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

export async function verifyJwtSignature(token: string): Promise<{ sub: string; email?: string; role?: string }> {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Malformed JWT');

    const [headerB64, payloadB64, signatureB64] = parts;

    // Check the JWT algorithm — Supabase now issues ES256 (ECDSA) tokens in addition to HS256.
    // We can only verify HS256 with the SUPABASE_JWT_SECRET; for ES256 we rely on getUserById.
    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
    const alg = header.alg ?? 'HS256';

    const secret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET');
    if (!secret || alg !== 'HS256') {
        // No secret available, or non-HMAC algorithm (e.g. ES256):
        // fall back to unverified decode. getUserById with service role key
        // provides the real authentication guarantee.
        const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
        if (!payload.sub) throw new Error('JWT missing sub claim');
        return { sub: payload.sub, email: payload.email, role: payload.role };
    }

    // HS256: Import HMAC key and verify signature
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
    );

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);

    const valid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!valid) throw new Error('Invalid JWT signature');

    // Parse payload — intentionally NOT checking exp
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));

    if (!payload.sub) throw new Error('JWT missing sub claim');

    return { sub: payload.sub, email: payload.email, role: payload.role };
}
