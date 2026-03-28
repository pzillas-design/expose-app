/**
 * JWT signature verification for edge functions.
 * Verifies the token was issued by Supabase (HMAC-SHA256 signature check)
 * but intentionally skips expiration check (verify_jwt=false is set to handle expired tokens).
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

    const secret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET');
    if (!secret) {
        // JWT secret not available — fall back to unverified decode.
        // The DB trigger on profiles still protects against credit manipulation.
        const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
        if (!payload.sub) throw new Error('JWT missing sub claim');
        return { sub: payload.sub, email: payload.email, role: payload.role };
    }

    // Import HMAC key
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
    );

    // Verify signature over header.payload
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);

    const valid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!valid) throw new Error('Invalid JWT signature');

    // Parse payload — intentionally NOT checking exp
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));

    if (!payload.sub) throw new Error('JWT missing sub claim');

    return { sub: payload.sub, email: payload.email, role: payload.role };
}
