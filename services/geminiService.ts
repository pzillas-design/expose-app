import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = 'gemini-3-pro-image-preview';

/**
 * Edits an image using Gemini based on a text prompt.
 * @param imageBase64 The base64 string of the image (including data:image/... prefix or raw).
 * @param prompt The instruction for editing (e.g., "Add a retro filter").
 * @param maskImageBase64 Optional base64 string of the composite mask image (ghost original + annotations).
 * @returns The base64 string of the edited image.
 */
export const editImageWithGemini = async (
  imageBase64: string,
  prompt: string,
  maskImageBase64?: string
): Promise<string> => {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        prompt,
        maskImageBase64
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate image');
    }

    const data = await response.json();
    return data.image;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};