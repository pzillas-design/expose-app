import { encodeBase64 } from "https://deno.land/std@0.207.0/encoding/base64.ts";

const POLL_INTERVAL_MS = 3000; // 3 seconds between polls
const MAX_POLLS = 40;          // ~120 seconds total before timeout (2 min)

export const generateImageKie = async (
    apiKey: string,
    modelName: string,
    payload: any,
    imageUrls: string[],
    aspectRatio: string,
    resolution: string
) => {
    const { prompt, variables, annotationImage } = payload;

    // Build prompt
    let fullPrompt = '';
    if (imageUrls.length > 0) {
        fullPrompt += 'Modify the provided image. ';
    }
    if (annotationImage) {
        fullPrompt += 'Red markers in the image indicate exactly where to make changes. Do not render the red marks in the final output. ';
    }
    if (prompt) fullPrompt += prompt;
    if (variables && Object.keys(variables).length > 0) {
        fullPrompt += `\nVariables: ${JSON.stringify(variables)}`;
    }

    const taskBody: any = {
        model: modelName,
        input: {
            prompt: fullPrompt.trim(),
            aspect_ratio: aspectRatio,
            resolution,
            output_format: 'jpg'
        }
    };

    if (imageUrls.length > 0) {
        taskBody.input.image_input = imageUrls;
    }

    console.log('[DEBUG] Kie createTask | model:', modelName, '| AR:', aspectRatio, '| Res:', resolution, '| Images:', imageUrls.length);

    // Step 1: Create the generation task
    const createRes = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(taskBody)
    });

    if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Kie createTask ${createRes.status}: ${errText}`);
    }

    const createData = await createRes.json();
    const taskId = createData?.data?.taskId;
    if (!taskId) {
        throw new Error(`Kie createTask: no taskId in response: ${JSON.stringify(createData)}`);
    }
    console.log('[DEBUG] Kie taskId created:', taskId);

    // Step 2: Poll until complete
    for (let poll = 0; poll < MAX_POLLS; poll++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

        const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!pollRes.ok) {
            const errText = await pollRes.text();
            throw new Error(`Kie recordInfo ${pollRes.status}: ${errText}`);
        }

        const pollData = await pollRes.json();
        const taskData = pollData?.data;
        const state = taskData?.state || taskData?.status;
        console.log(`[DEBUG] Kie poll ${poll + 1}/${MAX_POLLS} | state: ${state}`);

        if (state === 'success' || state === 'completed') {
            // Log full taskData so we can see the exact response shape in Supabase logs
            console.log('[DEBUG] Kie success taskData keys:', Object.keys(taskData || {}).join(', '));
            console.log('[DEBUG] Kie success taskData (truncated):', JSON.stringify(taskData).substring(0, 600));

            let imageUrl: string | null = null;

            // 1. resultJson (nano-banana-pro format): JSON string with { resultUrls: [...] }
            if (taskData?.resultJson) {
                try {
                    const parsed = JSON.parse(taskData.resultJson);
                    imageUrl = parsed?.resultUrls?.[0] || parsed?.images?.[0] || parsed?.url || null;
                } catch { /* fall through */ }
            }

            // 2. Direct URL fields (nano-banana-2 may use these)
            if (!imageUrl && taskData?.resultUrl) {
                imageUrl = typeof taskData.resultUrl === 'string' ? taskData.resultUrl : null;
            }
            if (!imageUrl && taskData?.imageUrl) {
                imageUrl = typeof taskData.imageUrl === 'string' ? taskData.imageUrl : null;
            }
            if (!imageUrl && taskData?.url) {
                imageUrl = typeof taskData.url === 'string' ? taskData.url : null;
            }

            // 3. Array/object output fields
            if (!imageUrl) {
                const output = taskData?.output || taskData?.outputs || taskData?.images || taskData?.results;
                if (Array.isArray(output) && output.length > 0) {
                    const first = output[0];
                    imageUrl = typeof first === 'string' ? first : (first?.url || first?.imageUrl || first?.src || null);
                } else if (output && typeof output === 'object') {
                    imageUrl = output?.url || output?.imageUrl || output?.src || null;
                } else if (typeof output === 'string') {
                    imageUrl = output;
                }
            }

            if (!imageUrl) {
                throw new Error(`Kie task complete but no image URL found. Keys: ${Object.keys(taskData || {}).join(', ')}`);
            }
            console.log('[DEBUG] Kie result URL:', imageUrl.substring(0, 80));

            // Download and return as base64 (same format index.ts expects)
            const imgRes = await fetch(imageUrl);
            if (!imgRes.ok) throw new Error(`Kie result download failed: ${imgRes.status}`);
            const b64 = encodeBase64(new Uint8Array(await imgRes.arrayBuffer()));

            // costTime = actual Kie model processing time in ms (excludes our polling overhead)
            const costTime: number | undefined = typeof taskData?.costTime === 'number' ? taskData.costTime : undefined;
            console.log('[DEBUG] Kie costTime:', costTime, 'ms');

            return { data: [{ b64_json: b64 }], costTime };
        }

        if (state === 'fail' || state === 'failed' || state === 'error') {
            throw new Error(`Kie task failed: ${taskData?.failMsg || JSON.stringify(taskData)}`);
        }
        // status: 'processing' | 'pending' → keep polling
    }

    throw new Error(`Kie task timed out after ${(MAX_POLLS * POLL_INTERVAL_MS / 1000).toFixed(0)}s`);
};
