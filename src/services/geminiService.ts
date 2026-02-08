
import { GenerationQuality, AnnotationObject } from "../types";

/**
 * Helper to ensure we have a base64 string.
 * If input is a URL, it fetches it. If it's already a data URL, it returns it.
 */
async function ensureBase64(input: string): Promise<string> {
  if (input.startsWith('data:')) return input;
  if (!input.startsWith('http')) return input; // Assume raw base64

  try {
    const response = await fetch(input, { mode: 'cors' });
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Failed to fetch image for base64 conversion (CORS?):", err);
    return input; // Fallback to original
  }
}

/**
 * Edits an image using Gemini based on a text prompt.
 * Now uses Vercel proxy for secure API key handling.
 * @param imageBase64 The base64 string of the image (including data:image/... prefix or raw) OR a URL.
 * @param prompt The instruction for editing (e.g., "Add a retro filter").
 * @param maskImageBase64 Optional base64 string of the composite mask image (ghost original + annotations).
 * @param qualityMode The selected quality/model mode.
 * @param annotations Optional list of annotations to extract reference images from.
 * @returns The base64 string of the edited image.
 */
export const editImageWithGemini = async (
  imageBase64: string,
  prompt: string,
  maskImageBase64?: string,
  qualityMode: GenerationQuality = 'pro-1k',
  annotations: AnnotationObject[] = []
): Promise<{ imageBase64: string; usageMetadata?: any; modelVersion?: string }> => {
  try {
    // Ensure we have base64 for everyone
    const [sourceBase64, maskBase64] = await Promise.all([
      ensureBase64(imageBase64),
      maskImageBase64 ? ensureBase64(maskImageBase64) : Promise.resolve(undefined)
    ]);

    // Call Vercel proxy instead of direct Gemini API
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageBase64: sourceBase64,
        prompt,
        maskBase64,
        qualityMode,
        annotations
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Proxy error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.imageBase64) {
      throw new Error('No image returned from proxy');
    }

    return {
      imageBase64: data.imageBase64,
      usageMetadata: data.usageMetadata,
      modelVersion: qualityMode
    };

  } catch (error: any) {
    console.error('[geminiService] Error:', error);
    throw new Error(error.message || 'Image generation failed');
  }
};
