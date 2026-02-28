export const generateImageKie = async (
    apiKey: string,
    modelName: string,
    payload: any,
    sourceBase64?: string
) => {
    const { prompt, variables, annotationImage, references } = payload;
    let fullPrompt = "You are an expert AI designer. ";

    if (sourceBase64) {
        fullPrompt += "You are provided with an original image and reference images. Modify the original image according to the User Prompt. ";
    } else {
        fullPrompt += "Create a brand new image from scratch based on the User Prompt. ";
    }

    if (prompt) fullPrompt += `\nUser Prompt: ${prompt}`;
    if (variables && Object.keys(variables).length > 0) {
        fullPrompt += `\nVariables: ${JSON.stringify(variables)}`;
    }

    if (annotationImage) {
        fullPrompt += "\nCRITICAL: You are provided with an annotation image showing Bright Red markers. These red markers indicate exactly where modifications should occur. Strictly follow the locations of the RED annotations, but DO NOT render the red marks in the final image.";
    }

    const filesUrl: string[] = [];

    // Add original image
    if (sourceBase64) {
        const srcData = sourceBase64.startsWith('data:') ? sourceBase64 : `data:image/jpeg;base64,${sourceBase64}`;
        filesUrl.push(srcData);
    }

    // Add annotation image
    if (annotationImage) {
        // annotationImage from canvas is usually a data URL
        const annDataUrl = annotationImage.startsWith('data:') ? annotationImage : `data:image/png;base64,${annotationImage}`;
        filesUrl.push(annDataUrl);
    }

    // Add references
    if (references && Array.isArray(references)) {
        for (const ref of references) {
            let refUrl = ref.src;
            if (!refUrl.startsWith('http') && !refUrl.startsWith('data:')) {
                refUrl = `data:image/jpeg;base64,${refUrl}`;
            }
            filesUrl.push(refUrl);
        }
    }

    const requestBody: any = {
        model: modelName,
        prompt: fullPrompt,
        n: 1,
        // Since we are mostly sending 1024x1024 or preserving aspect ratio
        size: "1024x1024",
        response_format: "b64_json"
    };

    if (filesUrl.length > 0) {
        requestBody.filesUrl = filesUrl;
    }

    console.log('[DEBUG] Kie API Request preparing (files count):', filesUrl.length);

    const response = await fetch('https://api.kie.ai/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Kie API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
};
