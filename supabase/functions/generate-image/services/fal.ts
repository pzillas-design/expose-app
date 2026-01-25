/**
 * Service to handle requests to Fal.ai
 */

export const generateImageFal = async (
    apiKey: string,
    model: string,
    prompt: string,
    options: any = {}
) => {
    const response = await fetch(`https://fal.run/${model}`, {
        method: 'POST',
        headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            ...options
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Fal.ai API Error: ${error}`);
    }

    const result = await response.json();

    // Fal.ai usually returns an object with an 'images' array
    // Each image has a 'url'
    const imageUrl = result.images?.[0]?.url;

    if (!imageUrl) {
        throw new Error("Fal.ai: No image returned in response");
    }

    // Fetch the image to get base64 or return URL
    // Since our index.ts expects base64 for processing, we fetch it
    const imageRes = await fetch(imageUrl);
    const blob = await imageRes.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    return {
        data: base64,
        url: imageUrl,
        seed: result.seed,
        timing: result.timings
    };
};
