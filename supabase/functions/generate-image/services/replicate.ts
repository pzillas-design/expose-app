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
    // 1. Extract Prompt and Images from Gemini-style 'parts'
    let prompt = '';
    const inputImages: string[] = [];

    for (const part of parts) {
        if (part.text) {
            prompt += part.text + ' ';
        }
        if (part.inlineData && part.inlineData.data) {
            // Convert raw base64 to Data URI for Replicate
            const mimeType = part.inlineData.mimeType || 'image/jpeg';
            const dataUri = `data:${mimeType};base64,${part.inlineData.data}`;
            inputImages.push(dataUri);
        }
    }

    prompt = prompt.trim();

    // 2. Prepare Replicate Payload
    // Google Nano Banana Pro expects 'prompt' and 'image_input' (array)
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
        throw new Error(`Replicate API Error: ${response.status} ${response.statusText} - ${errorText}`);
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
            throw new Error(`Replicate Prediction Failed: ${prediction.error}`);
        }

        // If still processing after wait, we might need to poll. 
        // For this implementation, let's assume 'Prefer: wait' catches most.
        // If not, we'd loop here. Let's add a quick polling loop just in case.
        let finalPrediction = prediction;
        let attempts = 0;
        const maxAttempts = 60; // Increase to 60s polling (total potential wait > 2 mins including header)

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
            throw new Error(`Replicate Timeout or Fail: ${finalPrediction.status}`);
        }

        prediction.output = finalPrediction.output;
    }

    // 5. Extract Output Image
    // Output is usually an array of URLs
    const outputUrls = prediction.output;
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
    } catch (downloadError) {
        console.error('Failed to download replicate image:', downloadError);
        // Fallback: If safe download fails, try to return URL? No, index.ts expects data.
        throw new Error(`Failed to download generated image: ${downloadError.message}`);
    }
};
