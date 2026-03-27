import { GoogleGenAI } from 'https://esm.sh/@google/genai';
import { urlToBase64, extractBase64FromDataUrl } from '../utils/imageProcessing.ts';

/**
 * Builds a scenario-appropriate system instruction based on what inputs are present.
 *
 * A: Just prompt (no image)           → "Generate an image..."
 * B: Prompt + original                → "Edit the original image..."
 * C: Prompt + original + annotations  → "Image 1 original, Image 2 annotations..."
 * D: Prompt + original + references   → "Edit original, use references..."
 * E: Prompt + original + ann + refs   → "Image 1 original, Image 2 annotations, references..."
 */
export const getSystemInstruction = (hasSource: boolean, hasMask: boolean, hasRefs: boolean): string => {
    if (!hasSource) {
        return "Generate an image based on the prompt.";
    }

    if (hasMask && hasRefs) {
        return "Image 1 is the original. Image 2 shows red annotations marking where and what to change. Reference images provide visual guidance. Apply changes at the annotated locations using references as style guide. Do not render the red markings in the output. Maintain original style and perspective.";
    }

    if (hasMask) {
        return "Image 1 is the original. Image 2 shows red annotations marking where and what to change. Apply all changes at the annotated locations. Do not render the red markings in the output. Maintain original style and perspective.";
    }

    if (hasRefs) {
        return "Edit the original image based on the prompt. Use the reference images as visual guidance for style and content. Maintain the original aspect ratio and perspective.";
    }

    return "Edit the original image based on the prompt. Maintain the overall style and perspective.";
};

/**
 * Prepares the parts array for Gemini API request.
 * Sequence: Prompt -> Variables -> Original -> Annotation -> References
 */
export const prepareParts = async (
    payload: any,
    sourceBase64?: string
): Promise<{ parts: any[], hasMask: boolean, hasRefs: boolean, allRefs: string[] }> => {
    const parts: any[] = [];
    const { prompt, variables, annotationImage, references } = payload;

    // 1. User Prompt
    if (prompt) {
        parts.push({ text: prompt });
    }

    // 2. Variables
    if (variables && Object.keys(variables).length > 0) {
        const varString = Object.entries(variables)
            .map(([key, vals]) => `${key}: ${(vals as string[]).join(', ')}`)
            .join('; ');
        parts.push({ text: varString });
    }

    // 3. Original Image
    if (sourceBase64) {
        parts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: sourceBase64
            }
        });
        parts.push({ text: "Original Image" });
    }

    // 4. Annotation Image
    let hasMask = false;
    if (annotationImage) {
        hasMask = true;
        const maskBase64 = extractBase64FromDataUrl(annotationImage);
        parts.push({
            inlineData: {
                mimeType: 'image/png',
                data: maskBase64
            }
        });
        parts.push({ text: "Annotation Image (muted original with red annotations)" });
    }

    // 5. Reference Images
    const allRefs: string[] = [];
    let hasRefs = false;
    if (references && Array.isArray(references) && references.length > 0) {
        hasRefs = true;
        for (let i = 0; i < references.length; i++) {
            const ref = references[i];
            try {
                let refBase64 = ref.src;
                if (ref.src.startsWith('http')) {
                    refBase64 = await urlToBase64(ref.src);
                } else if (ref.src.includes(',')) {
                    refBase64 = extractBase64FromDataUrl(ref.src);
                }

                parts.push({
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: refBase64
                    }
                });

                parts.push({ text: ref.instruction || "Reference Image" });
                allRefs.push(ref.src);
            } catch (err) {
                console.warn(`Failed to process reference image ${i}:`, err);
            }
        }
    }

    console.log('[DEBUG] prepareParts - parts:', parts.length, 'mask:', hasMask, 'refs:', hasRefs);
    return { parts, hasMask, hasRefs, allRefs };
};

/**
 * Calls Gemini API to generate an image.
 * System instruction adapts to the scenario (create, edit, annotations, refs).
 */
export const generateImage = async (
    apiKey: string,
    modelName: string,
    parts: any[],
    generationConfig: any,
    hasSource: boolean,
    hasMask: boolean,
    hasRefs: boolean
) => {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = getSystemInstruction(hasSource, hasMask, hasRefs);

    console.log('[DEBUG] System Instruction:', systemInstruction);

    // Retry for transient errors
    let lastError: any;
    for (let i = 0; i < 2; i++) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: [{ parts }],
                config: {
                    systemInstruction,
                    responseModalities: ['TEXT', 'IMAGE'],
                    ...generationConfig
                }
            });

            return response;
        } catch (err: any) {
            lastError = err;
            const status = err.status || (err.message?.match(/\[(\d+)\]/)?.[1]);
            if (status === '500' || status === '503' || status === '429' || err.message?.includes('fetch failed')) {
                console.warn(`Gemini API transient error (${status}), retrying ${i + 1}/2...`);
                await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
                continue;
            }
            throw err;
        }
    }

    throw lastError;
};

export const extractGeneratedImage = (response: any): { base64: string; mimeType: string } | null => {
    const visit = (node: any): { base64: string; mimeType: string } | null => {
        if (!node) return null;

        if (Array.isArray(node)) {
            for (const item of node) {
                const found = visit(item);
                if (found) return found;
            }
            return null;
        }

        if (typeof node !== 'object') return null;

        const inline = node.inlineData || node.inline_data;
        if (inline?.data && typeof inline.data === 'string') {
            const mimeType = inline.mimeType || inline.mime_type || 'image/png';
            if (mimeType.startsWith('image/')) {
                return { base64: inline.data, mimeType };
            }
        }

        if (typeof node.imageBase64 === 'string') {
            return { base64: node.imageBase64, mimeType: node.mimeType || 'image/png' };
        }

        if (typeof node.imageBytes === 'string') {
            return { base64: node.imageBytes, mimeType: node.mimeType || 'image/png' };
        }

        if (typeof node.bytesBase64Encoded === 'string') {
            return { base64: node.bytesBase64Encoded, mimeType: node.mimeType || 'image/png' };
        }

        for (const value of Object.values(node)) {
            const found = visit(value);
            if (found) return found;
        }

        return null;
    };

    return visit(response);
};
