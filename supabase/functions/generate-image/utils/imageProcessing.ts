import { encodeBase64 } from "https://deno.land/std@0.207.0/encoding/base64.ts";

/**
 * Image processing utilities for base64 conversion
 */

/**
 * Converts an HTTP URL to base64 string.
 * 30s timeout to prevent silent hangs in the background task.
 */
export const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    return encodeBase64(new Uint8Array(arrayBuffer));
};

/**
 * Extracts base64 data from a data URL
 */
export const extractBase64FromDataUrl = (dataUrl: string): string => {
    return dataUrl.split(',')[1] || dataUrl;
};

/**
 * Prepares source image for Gemini API (converts to base64 if needed)
 */
export const prepareSourceImage = async (src: string): Promise<string> => {
    if (!src) return '';

    // Blob URLs are browser-only and cannot be fetched server-side
    if (src.startsWith('blob:')) return '';

    if (src.startsWith('http')) {
        return await urlToBase64(src);
    } else if (src.includes(',')) {
        return extractBase64FromDataUrl(src);
    }

    return src;
};
