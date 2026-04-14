// @ts-nocheck

const POLL_INTERVAL_MS = 5000; // 5s between polls
const MAX_POLLS = 60;          // 60 × 5s = 300s (5 min) — runs in EdgeRuntime.waitUntil

/**
 * Creates a Kie.ai generation task and returns the taskId immediately.
 */
export const createKieTask = async (
    apiKey: string,
    modelName: string,
    kiePayload: { prompt: string; variables?: Record<string, any>; annotationImage?: string | null },
    imageUrls: string[],
    aspectRatio: string,
    resolution: string,
): Promise<string> => {
    const { prompt, variables, annotationImage } = kiePayload;

    let fullPrompt = '';
    if (imageUrls.length > 0) fullPrompt += 'Modify the provided image. ';
    if (annotationImage) fullPrompt += 'Red markers in the image indicate exactly where to make changes. Do not render the red marks in the final output. ';
    if (prompt) fullPrompt += prompt;
    if (variables && Object.keys(variables).length > 0) fullPrompt += `\nVariables: ${JSON.stringify(variables)}`;

    const taskBody: any = {
        model: modelName,
        input: {
            prompt: fullPrompt.trim(),
            aspect_ratio: aspectRatio,
            resolution,
            output_format: 'jpg',
        },
    };
    if (imageUrls.length > 0) taskBody.input.image_input = imageUrls;

    console.log('[DEBUG] Kie createTask | model:', modelName, '| AR:', aspectRatio, '| Res:', resolution, '| Images:', imageUrls.length);

    const res = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(taskBody),
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Kie createTask ${res.status}: ${txt}`);
    }

    const data = await res.json();
    const taskId = data?.data?.taskId;
    if (!taskId) throw new Error(`Kie createTask: no taskId in response: ${JSON.stringify(data)}`);
    console.log('[DEBUG] Kie taskId:', taskId);
    return taskId;
};

/**
 * Polls Kie.ai for task completion. Returns the result image URL.
 * Designed to run inside EdgeRuntime.waitUntil() for up to 5 minutes.
 */
export const pollKieTask = async (
    apiKey: string,
    taskId: string,
): Promise<{ imageUrl: string; costTime?: number }> => {
    for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

        const res = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Kie recordInfo ${res.status}: ${txt}`);
        }

        const pollData = await res.json();
        const taskData = pollData?.data;
        const state = taskData?.state || taskData?.status;
        console.log(`[DEBUG] Kie poll ${i + 1}/${MAX_POLLS} | state: ${state}`);

        if (state === 'success' || state === 'completed') {
            console.log('[DEBUG] Kie success taskData keys:', Object.keys(taskData || {}).join(', '));

            let imageUrl: string | null = null;

            // 1. resultJson (nano-banana format): JSON string with { resultUrls: [...] }
            if (taskData?.resultJson) {
                try {
                    const parsed = JSON.parse(taskData.resultJson);
                    imageUrl = parsed?.resultUrls?.[0] || parsed?.images?.[0] || parsed?.url || null;
                } catch { /* fall through */ }
            }
            // 2. resultUrls array directly on taskData
            if (!imageUrl && Array.isArray(taskData?.resultUrls) && taskData.resultUrls.length > 0) {
                imageUrl = taskData.resultUrls[0] || null;
            }
            // 3. Direct URL fields
            if (!imageUrl) imageUrl = taskData?.resultUrl || taskData?.imageUrl || taskData?.url || null;
            // 4. Array/object output fields
            if (!imageUrl) {
                const output = taskData?.output || taskData?.outputs || taskData?.images || taskData?.results;
                if (Array.isArray(output) && output.length > 0) {
                    const first = output[0];
                    imageUrl = typeof first === 'string' ? first : (first?.url || first?.imageUrl || null);
                } else if (output && typeof output === 'object') {
                    imageUrl = output?.url || output?.imageUrl || null;
                } else if (typeof output === 'string') {
                    imageUrl = output;
                }
            }

            if (!imageUrl) {
                throw new Error(`Kie task complete but no image URL found. Keys: ${Object.keys(taskData || {}).join(', ')}`);
            }

            const costTime: number | undefined = typeof taskData?.costTime === 'number' ? taskData.costTime : undefined;
            console.log('[DEBUG] Kie result URL:', imageUrl.substring(0, 80), '| costTime:', costTime);
            return { imageUrl, costTime };
        }

        if (state === 'fail' || state === 'failed' || state === 'error') {
            throw new Error(`Kie task failed: ${taskData?.failMsg || JSON.stringify(taskData)}`);
        }
        // 'processing' | 'pending' → keep polling
    }

    throw new Error(`Kie task timed out after ${(MAX_POLLS * POLL_INTERVAL_MS / 1000).toFixed(0)}s`);
};
