
import { GoogleGenAI } from "@google/genai";
import { GenerationQuality, AnnotationObject } from "../types";

/**
 * Edits an image using Gemini based on a text prompt.
 * @param imageBase64 The base64 string of the image (including data:image/... prefix or raw).
 * @param prompt The instruction for editing (e.g., "Add a retro filter").
 * @param maskImageBase64 Optional base64 string of the composite mask image (ghost original + annotations).
 * @param qualityMode The selected quality/model mode.
 * @param annotations Optional list of annotations to extract reference images from.
 * @returns The base64 string of the edited image.
 */
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
    // Initialize Gemini AI client inside the function to ensure API_KEY is present
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Ensure we have base64 for everyone
    const [sourceBase64, maskBase64] = await Promise.all([
      ensureBase64(imageBase64),
      maskImageBase64 ? ensureBase64(maskImageBase64) : Promise.resolve(undefined)
    ]);

    // Clean base64 string if it has the prefix
    const cleanBase64 = sourceBase64.split(',')[1] || sourceBase64;

    const parts: any[] = [];

    // 1. Context Instruction
    const hasMask = !!maskBase64;
    const hasRefs = annotations.some(ann => !!ann.referenceImage);

    let systemInstruction = "I am providing an ORIGINAL image (to be edited).";
    if (hasMask) {
      systemInstruction += " I am also providing a MASK image (indicating areas to edit, and what to edit there).";
      const maskLabels = annotations
        .filter(ann => ann.type !== 'reference_image' && ann.text)
        .map(ann => ann.text);
      if (maskLabels.length > 0) {
        systemInstruction += ` The masked areas include instructions/labels such as: ${maskLabels.join(', ')}.`;
      }
    }
    if (hasRefs) systemInstruction += " I am also providing REFERENCE images (for inspiration/visual reference).";

    systemInstruction += " Apply the edits to the ORIGINAL image based on the user prompt";
    if (hasRefs) systemInstruction += " and using the REFERENCE images as a guide";
    systemInstruction += ".";

    parts.push({ text: systemInstruction });

    // 2. The Original Image
    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: 'image/jpeg',
      },
    });
    parts.push({ text: "Image 1: The Original Image (Target for editing)." });

    // 3. The Mask/Guide Image (if present)
    if (maskBase64) {
      const cleanMask = maskBase64.split(',')[1] || maskBase64;
      parts.push({
        inlineData: {
          data: cleanMask,
          mimeType: 'image/png', // Canvas exports usually as PNG
        },
      });
      parts.push({ text: "Image 2: The Annotation Image. White markers indicate the edit regions." });
    }

    // 4. Reference Images
    // Iterate through annotations to find reference images
    await Promise.all(annotations.map(async (ann) => {
      if (ann.referenceImage) {
        const refBase64 = await ensureBase64(ann.referenceImage);
        const cleanRef = refBase64.split(',')[1] || refBase64;

        // Add the image
        parts.push({
          inlineData: {
            data: cleanRef,
            mimeType: 'image/jpeg',
          }
        });

        // Add Context for this image - SPECIFIC vs GLOBAL
        if (ann.type === 'reference_image') {
          // Global Reference
          parts.push({ text: "Reference Image: Use this as a visual reference for the overall style or composition." });
        } else if (ann.text) {
          // Local Reference attached to a specific mask/object with label
          parts.push({ text: `Reference Image for '${ann.text}': Use this as a visual reference specifically for the area labeled '${ann.text}'.` });
        } else {
          // Local Reference attached to a mask but no label
          parts.push({ text: "Reference Image for a specific masked area: Use this as a visual reference for the corresponding part of the mask." });
        }
      }
    }));

    // 5. The User Prompt Logic
    let promptText = prompt.trim();
    if (maskBase64) {
      if (!promptText) {
        promptText = "Apply the edits to the masked area.";
      } else {
        promptText = `Apply the edits to the masked area. ${promptText}`;
      }
    }

    parts.push({ text: `User Prompt: ${promptText}` });



    // Determine Model and Config based on Quality Mode
    // Fast: Gemini 2.5 Flash Image (free/cheap, ~1024px) - GA model
    // Pro: Gemini 3 Pro Image aka "Nano Banana Pro" (paid, up to 4K)
    let modelName = 'gemini-2.5-flash-image';
    let config: any = {};

    if (qualityMode === 'fast') {
      modelName = 'gemini-2.5-flash-image'; // GA model (replaces 2.0-flash-exp)
      // No config needed - output matches input resolution
    } else {
      // Pro modes use Gemini 3 Pro Image (Nano Banana Pro)
      modelName = 'gemini-3-pro-image-preview';

      // Set output image size for Gemini 3 Pro Image
      let outputSize = '1024';
      switch (qualityMode) {
        case 'pro-1k':
          outputSize = '1024';
          break;
        case 'pro-2k':
          outputSize = '2048';
          break;
        case 'pro-4k':
          outputSize = '4096';
          break;
      }

      config = {
        outputOptions: {
          outputImageSize: outputSize
        }
      };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: parts,
      },
      ...(Object.keys(config).length > 0 ? { config } : {})
    });

    // Iterate through parts to find the image output
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData) {
          const base64Response = part.inlineData.data;
          return {
            imageBase64: `data:image/jpeg;base64,${base64Response}`,
            usageMetadata: response.usageMetadata,
            modelVersion: response.modelVersion
          };
        }
      }
    }

    throw new Error("No image generated in response.");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
