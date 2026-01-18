import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai';
import { urlToBase64, extractBase64FromDataUrl } from '../utils/imageProcessing.ts';

/**
 * Prepares the parts array for Gemini API request
 */
export const prepareParts = async (
    sourceBase64: string,
    maskDataUrl: string | undefined,
    payloadAttachments: string[] | undefined,
    sourceAnnotations: any[] | undefined,
    prompt: string
): Promise<{ parts: any[], hasMask: boolean, hasRefs: boolean, allRefs: string[] }> => {
    const parts: any[] = [];

    // Add source image if available
    if (sourceBase64) {
        parts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: sourceBase64
            }
        });
    }

    // Add mask if provided
    const hasMask = !!maskDataUrl;
    if (maskDataUrl) {
        const maskBase64 = extractBase64FromDataUrl(maskDataUrl);
        parts.push({
            inlineData: {
                mimeType: 'image/png',
                data: maskBase64
            }
        });
    }

    // Collect reference images from annotations
    const allRefs: string[] = [];
    if (payloadAttachments && Array.isArray(payloadAttachments)) {
        allRefs.push(...payloadAttachments);
    }
    if (sourceAnnotations && Array.isArray(sourceAnnotations)) {
        sourceAnnotations.forEach((ann: any) => {
            if (ann.referenceImage && !allRefs.includes(ann.referenceImage)) {
                allRefs.push(ann.referenceImage);
            }
        });
    }

    // Add reference images to parts
    const hasRefs = allRefs.length > 0;
    for (const refSrc of allRefs) {
        try {
            let refBase64 = refSrc;
            if (refSrc.startsWith('http')) {
                refBase64 = await urlToBase64(refSrc);
            } else if (refSrc.includes(',')) {
                refBase64 = extractBase64FromDataUrl(refSrc);
            }
            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: refBase64
                }
            });
        } catch (err) {
            console.warn('Failed to process reference image:', err);
        }
    }

    // Add text prompt
    parts.push({ text: prompt });

    return { parts, hasMask, hasRefs, allRefs };
};

/**
 * Calls Gemini API to generate an image
 */
export const generateImage = async (
    apiKey: string,
    modelName: string,
    parts: any[],
    generationConfig: any
) => {
    const genAI = new GoogleGenerativeAI(apiKey);

    const systemInstruction = "You are an expert AI image generator. You interpret prompts to generate high-quality, photorealistic images. You preserve artist intent for style and composition.";

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
