/**
 * Service to handle requests to Replicate (Google Nano Banana Models)
 */

import { urlToBase64 } from '../utils/imageProcessing.ts';

export const generateImageReplicate = async (
    apiToken: string,
    model: string,
    parts: any[],
    options: any = {}
) => {
    // 1. Extract inputs
    let prompt = '';
    const inputImages: string[] = [];

    for (const part of parts) {
        if (part.text) {
            prompt += part.text + ' ';
        }
        if (part.inlineData && part.inlineData.data) {
            const mimeType = part.inlineData.mimeType || 'image/jpeg';
            const dataUri = `data:${mimeType};base64,${part.inlineData.data}`;
            inputImages.push(dataUri);
        }
    }

    prompt = prompt.trim();

    // 2. Prepare Replicate Payload (Google Nano Banana spec)
    // Supports: prompt, image_input (array)
    // We send ALL images in the strict order they were prepared:
    // 1. Source (JPEG)
    // 2. Annotation (PNG)
    // 3. References (if any)
    const inputPayload = {
        prompt: prompt,
        image_input: inputImages.length > 0 ? inputImages : undefined,
        ...options
    };

    // 3. Call Replicate API
    // We use the 'predictions' endpoint. 
    // Note: 'model' should be 'google/nano-banana-pro' or 'google/nano-banana'
    const response = await fetch('https://api.replicate.com/v1/models/' + model + '/predictions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'wait' // Wait for the prediction to finish (up to 60s)
        },
        body: JSON.stringify({
            input: inputPayload
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        let detail = `Error ${response.status} ${response.statusText}`;
        try {
            const parsed = JSON.parse(errorText);
            if (parsed.detail) detail = parsed.detail;
            else if (parsed.error) detail = parsed.error;
        } catch (_) {
            detail = errorText.substring(0, 100);
        }
        throw new Error(`Replicate API: ${detail}`);
    }

    const prediction = await response.json();

    // 4. Handle Response
    // If 'Prefer: wait' timed out, the status might be 'processing' or 'starting'.
    // In a production app, we might need polling. For now, we assume it finishes or we handle the wait.

    if (prediction.status !== 'succeeded') {
        // If it's strictly not succeeded (e.g. failed, canceled), throw.
        // If it's still processing, we might need to poll (omitted for brevity unless requested).
        // However, Google models are usually fast.

        if (prediction.status === 'failed' || prediction.status === 'canceled') {
            throw new Error(`Replicate ${prediction.status}: ${prediction.error || "Unknown reason"}`);
        }

        // If still processing after wait, we might need to poll. 
        // For this implementation, let's assume 'Prefer: wait' catches most.
        // If not, we'd loop here. Let's add a quick polling loop just in case.
        let finalPrediction = prediction;
        let attempts = 0;
        const maxAttempts = 300; // Increase to 300s (5 min) to handle cold starts safely

        while (['starting', 'processing'].includes(finalPrediction.status) && attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 1000));
            const pollRes = await fetch(finalPrediction.urls.get, {
                headers: { 'Authorization': `Bearer ${apiToken}` }
            });
            finalPrediction = await pollRes.json();
            attempts++;
        }

        if (finalPrediction.status !== 'succeeded') {
            console.error('Replicate Polling Timeout/Failure:', finalPrediction);
            const isTimeout = ['starting', 'processing'].includes(finalPrediction.status);
            throw new Error(isTimeout ? "Replicate Timeout (Cold Start)" : `Replicate Fail: ${finalPrediction.status}`);
        }

        prediction.output = finalPrediction.output;
    }

    // 5. Extract Output Image
    // Output can be an array of URLs or a single URL string
    let outputUrls = prediction.output;

    // Normalize to array if it's a string
    if (typeof outputUrls === 'string') {
        outputUrls = [outputUrls];
    }

    if (!outputUrls || !Array.isArray(outputUrls) || outputUrls.length === 0) {
        console.error('Replicate No Output:', prediction);
        throw new Error("Replicate: No output images returned");
    }

    const imageUrl = outputUrls[0];
    console.log('Downloading Replicate Image:', imageUrl);

    // 6. Fetch Image to return Base64 (consistent with existing app)
    try {
        // Use the shared utility to avoid stack overflow on large images
        const base64 = await urlToBase64(imageUrl);

        return {
            data: base64,
            url: imageUrl,
            predictionId: prediction.id,
            logs: prediction.logs
        };
    } catch (downloadError: any) {
        console.error('Failed to download replicate image:', downloadError);
        // Fallback: If safe download fails, try to return URL? No, index.ts expects data.
        throw new Error(`Failed to download generated image: ${downloadError?.message || "Unknown download error"}`);
    }
};
