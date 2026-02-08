import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
            .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            .end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            imageBase64,
            prompt,
            maskBase64,
            qualityMode = 'pro-1k',
            annotations = []
        } = req.body;

        if (!imageBase64 || !prompt) {
            return res.status(400).json({ error: 'Missing required fields: imageBase64, prompt' });
        }

        // Get API Key from environment
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[Proxy] GEMINI_API_KEY not found in environment');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Prepare request parts
        const parts: any[] = [];

        // 1. System instruction
        parts.push({
            text: "I am providing an ORIGINAL image (to be edited), a MASK image (indicating areas to edit), and REFERENCE images (for inspiration/visual reference). Apply the edits to the ORIGINAL image based on the user prompt and using the REFERENCE images as a guide."
        });

        // 2. Original Image
        const cleanBase64 = imageBase64.includes(',')
            ? imageBase64.split(',')[1]
            : imageBase64;

        parts.push({
            inlineData: {
                data: cleanBase64,
                mimeType: 'image/jpeg'
            }
        });
        parts.push({ text: "Image 1: The Original Image (Target for editing)." });

        // 3. Mask Image (if present)
        if (maskBase64) {
            const cleanMask = maskBase64.includes(',')
                ? maskBase64.split(',')[1]
                : maskBase64;

            parts.push({
                inlineData: {
                    data: cleanMask,
                    mimeType: 'image/png'
                }
            });
            parts.push({ text: "Image 2: The Mask. White areas = edit region." });
        }

        // 4. Reference Images from annotations
        if (annotations && annotations.length > 0) {
            annotations.forEach((ann: any, idx: number) => {
                if (ann.referenceImage) {
                    const cleanRef = ann.referenceImage.includes(',')
                        ? ann.referenceImage.split(',')[1]
                        : ann.referenceImage;

                    parts.push({
                        inlineData: {
                            data: cleanRef,
                            mimeType: 'image/jpeg'
                        }
                    });

                    if (ann.text) {
                        parts.push({
                            text: `Reference Image ${idx + 1} for '${ann.text}': Use this as a visual reference for the object/area labeled '${ann.text}'.`
                        });
                    } else {
                        parts.push({ text: `Reference Image ${idx + 1}.` });
                    }
                }
            });
        }

        // 5. User Prompt
        let finalPrompt = prompt.trim();
        if (maskBase64 && !finalPrompt) {
            finalPrompt = "Apply the edits to the masked area.";
        } else if (maskBase64) {
            finalPrompt = `Apply the edits to the masked area. ${finalPrompt}`;
        }
        parts.push({ text: `User Prompt: ${finalPrompt}` });

        // Determine model and config based on quality mode
        const modelConfig: Record<string, { model: string; size: string }> = {
            'fast': { model: 'gemini-3-pro-image-preview', size: '1024x1024' },
            'pro-1k': { model: 'gemini-3-pro-image-preview', size: '1024x1024' },
            'pro-2k': { model: 'gemini-3-pro-image-preview', size: '2048x2048' },
            'pro-4k': { model: 'gemini-3-pro-image-preview', size: '4096x4096' }
        };

        const config = modelConfig[qualityMode] || modelConfig['pro-1k'];

        // Call Gemini API
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: parts
                    }],
                    generationConfig: {
                        outputImageSize: config.size
                    }
                })
            }
        );

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('[Proxy] Gemini API error:', errorText);
            return res.status(geminiResponse.status).json({
                error: 'Gemini API error',
                details: errorText
            });
        }

        const geminiData = await geminiResponse.json();

        // Extract image from response
        let imageBase64Result = '';
        if (geminiData.candidates && geminiData.candidates[0]?.content?.parts) {
            const imagePart = geminiData.candidates[0].content.parts.find(
                (p: any) => p.inlineData?.mimeType?.startsWith('image/')
            );

            if (imagePart?.inlineData?.data) {
                imageBase64Result = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            }
        }

        if (!imageBase64Result) {
            console.error('[Proxy] No image in Gemini response:', JSON.stringify(geminiData));
            return res.status(500).json({ error: 'No image in API response' });
        }

        // Return success
        return res.status(200)
            .setHeader('Access-Control-Allow-Origin', '*')
            .json({
                imageBase64: imageBase64Result,
                usageMetadata: geminiData.usageMetadata || null
            });

    } catch (error: any) {
        console.error('[Proxy] Exception:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Unknown error'
        });
    }
}
