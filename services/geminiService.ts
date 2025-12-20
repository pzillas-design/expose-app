
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
export const editImageWithGemini = async (
  imageBase64: string,
  prompt: string,
  maskImageBase64?: string,
  qualityMode: GenerationQuality = 'pro-1k',
  annotations: AnnotationObject[] = []
): Promise<{ imageBase64: string; usageMetadata?: any }> => {
  try {
    // Initialize Gemini AI client inside the function to ensure API_KEY is present
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Clean base64 string if it has the prefix
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;

    const parts: any[] = [];

    // 1. Context Instruction
    let systemInstruction = "I am providing an ORIGINAL image (to be edited), a MASK image (indicating areas to edit), and REFERENCE images (for inspiration/visual reference).";
    systemInstruction += " Apply the edits to the ORIGINAL image based on the user prompt and using the REFERENCE images as a guide.";

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
    if (maskImageBase64) {
      const cleanMask = maskImageBase64.split(',')[1] || maskImageBase64;
      parts.push({
        inlineData: {
          data: cleanMask,
          mimeType: 'image/png', // Canvas exports usually as PNG
        },
      });
      parts.push({ text: "Image 2: The Mask. White areas = edit region." });
    }

    // 4. Reference Images
    // Iterate through annotations to find reference images
    annotations.forEach((ann) => {
      if (ann.referenceImage) {
        const cleanRef = ann.referenceImage.split(',')[1] || ann.referenceImage;

        // Add the image
        parts.push({
          inlineData: {
            data: cleanRef,
            mimeType: 'image/jpeg', // Assuming upload is jpeg/png, API handles most
          }
        });

        // Add Context for this image - GENERIC / UNIVERSAL
        if (ann.type === 'reference_image') {
          // Global Reference
          parts.push({ text: "Reference Image: Use this as a visual reference." });
        } else if (ann.text) {
          // Local Reference attached to a specific mask/object
          parts.push({ text: `Reference Image for '${ann.text}': Use this as a visual reference for the object/area labeled '${ann.text}'.` });
        } else {
          parts.push({ text: "Reference Image." });
        }
      }
    });

    // 5. The User Prompt Logic
    let promptText = prompt.trim();
    if (maskImageBase64) {
      if (!promptText) {
        promptText = "Apply the edits to the masked area.";
      } else {
        promptText = `Apply the edits to the masked area. ${promptText}`;
      }
    }

    parts.push({ text: `User Prompt: ${promptText}` });


    // Determine Model and Config based on Quality Mode
    let modelName = 'gemini-3-pro-image-preview'; // Default
    let imageConfig: any = {};

    switch (qualityMode) {
      case 'fast':
        modelName = 'gemini-2.5-flash-image';
        // No specific imageSize config for flash-image
        break;
      case 'pro-1k':
        modelName = 'gemini-3-pro-image-preview';
        imageConfig = { imageSize: '1K' };
        break;
      case 'pro-2k':
        modelName = 'gemini-3-pro-image-preview';
        imageConfig = { imageSize: '2K' };
        break;
      case 'pro-4k':
        modelName = 'gemini-3-pro-image-preview';
        imageConfig = { imageSize: '4K' };
        break;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: Object.keys(imageConfig).length > 0 ? imageConfig : undefined
      }
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
            usageMetadata: response.usageMetadata
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
