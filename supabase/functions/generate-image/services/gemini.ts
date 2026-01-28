import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai';
import { urlToBase64, extractBase64FromDataUrl } from '../utils/imageProcessing.ts';

/**
 * Prepares the parts array for Gemini API request with structured interleaving.
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
        parts.push({ text: `User Prompt: ${prompt}` });
    }

    // 2. Design Variables
    if (variables && Object.keys(variables).length > 0) {
        const varString = Object.entries(variables)
            .map(([key, vals]) => `${key}: ${(vals as string[]).join(', ')}`)
            .join('; ');
        parts.push({ text: varString });
    }

    // 3. Image 1: Original Image
    if (sourceBase64) {
        parts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: sourceBase64
            }
        });
        parts.push({ text: "Image 1: The Original Image" });
    }

    // 4. Image 2: Annotation Image
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
        parts.push({ text: "Image 2: The Annotation Image (Muted original + annotations showing where and what to change)." });
    }

    // 5. Reference Images
    const allRefs: string[] = [];
    let hasRefs = false;
    if (references && Array.isArray(references)) {
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

                // Simplified reference labeling as requested
                const label = ref.instruction || "Reference Image";
                parts.push({ text: `${label} (Image ${i + 3 + (hasMask ? 0 : -1)})` });
                allRefs.push(ref.src);
            } catch (err) {
                console.warn(`Failed to process reference image ${i}:`, err);
            }
        }
    }

    return { parts, hasMask, hasRefs, allRefs };
};

/**
 * Calls Gemini API to generate an image
 */
export const generateImage = async (
    apiKey: string,
    modelName: string,
    parts: any[],
    generationConfig: any,
    requestType: 'create' | 'edit' = 'edit'
) => {
    const genAI = new GoogleGenerativeAI(apiKey);

    let systemInstruction = "You are an expert AI designer. You interpret prompts and visual context to generate high-quality, photorealistic images.";

    if (requestType === 'edit') {
        systemInstruction += " You are provided with an ORIGINAL image (Image 1) and an ANNOTATION image (Image 2) which identifies target areas for modification using high-contrast overlays or labels. Your goal is to modify the ORIGINAL image according to the User Prompt and Design Parameters, strictly adhering to the locations and objects specified in the ANNOTATION image. Maintain the overall style and perspective of the original image unless instructed otherwise.";
    } else {
        systemInstruction += " Create a brand new image from scratch based on the User Prompt and Design Parameters provided.";
    }

    const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction
    });

    const geminiResult = await model.generateContent({
        contents: [{ parts: parts }],
        generationConfig: Object.keys(generationConfig).length > 0 ? generationConfig : undefined
    });

    return geminiResult.response;
};
