import { GoogleGenAI } from "@google/genai";

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return response.status(500).json({ error: 'Server configuration error: Missing API Key' });
    }

    try {
        const { imageBase64, prompt, maskImageBase64 } = request.body;

        if (!imageBase64 || !prompt) {
            return response.status(400).json({ error: 'Missing image or prompt' });
        }

        const ai = new GoogleGenAI({ apiKey });

        // User requested specific model
        const MODEL_NAME = 'gemini-3-pro-image-preview';

        const parts = [];

        // 1. Context Instruction (only if mask is present)
        if (maskImageBase64) {
            parts.push({
                text: "I am providing two images. The first image is the original source. The second image is an annotated version with visual masks and text instructions. Apply the edits as instructed by the text engraved directly on the mask image."
            });
        }

        // 2. The Original Image
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
        parts.push({
            inlineData: {
                data: cleanBase64,
                mimeType: 'image/jpeg',
            },
        });

        // 3. The Mask/Guide Image (if present)
        if (maskImageBase64) {
            const cleanMask = maskImageBase64.split(',')[1] || maskImageBase64;
            parts.push({
                inlineData: {
                    data: cleanMask,
                    mimeType: 'image/png',
                },
            });
        }

        // 4. The User Prompt
        const promptText = maskImageBase64
            ? `Apply the edits as instructed by the text engraved directly on the mask image. Additional Note: ${prompt}`
            : prompt;

        parts.push({ text: promptText });

        // Using the new SDK syntax
        const aiResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: {
                parts: parts,
            },
        });

        // Parse response from new SDK
        const candidates = aiResponse.candidates;
        if (candidates && candidates.length > 0) {
            const parts = candidates[0].content.parts;
            for (const part of parts) {
                if (part.inlineData) {
                    const base64Response = part.inlineData.data;
                    return response.status(200).json({
                        image: `data:image/png;base64,${base64Response}`
                    });
                }
            }
        }

        return response.status(500).json({ error: "No image generated in response." });

    } catch (error) {
        console.error("Gemini API Error:", error);
        return response.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
