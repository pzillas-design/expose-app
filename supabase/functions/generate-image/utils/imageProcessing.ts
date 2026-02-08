import { encodeBase64 } from "https://deno.land/std@0.207.0/encoding/base64.ts";

/**
 * Image processing utilities for base64 conversion
 */

/**
 * Converts an HTTP URL to base64 string
 */
export const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
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

    if (src.startsWith('http')) {
        return await urlToBase64(src);
    } else if (src.includes(',')) {
        return extractBase64FromDataUrl(src);
    }

    return src;
};
