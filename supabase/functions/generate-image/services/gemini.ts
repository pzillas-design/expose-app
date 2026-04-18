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
        return "The first image is the ORIGINAL — it is the primary subject to be edited; preserve its composition, proportions, and perspective exactly. The second image marks specific areas to change with red annotations. All remaining images are REFERENCE IMAGES only — visual inspiration for style or content, never a replacement for the original. Apply the changes at the annotated areas, draw on the references for guidance, and do not render the red markings in the output.";
    }

    if (hasMask) {
        return "Image 1 is the original. Image 2 shows red annotations marking where and what to change. Apply all changes at the annotated locations. Do not render the red markings in the output. Maintain original style and perspective.";
    }

    if (hasRefs) {
        return "The first image is the ORIGINAL — it is the primary subject to be edited. Preserve its composition, proportions, and perspective exactly in the output. All subsequent images are REFERENCE IMAGES only — they supply visual style or content inspiration and must never replace the original as the output base. Apply the prompt to the original image, drawing on the references for visual guidance.";
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
        parts.push({ text: "ORIGINAL IMAGE (primary subject — preserve its layout, structure, and perspective)" });
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

                const refLabel = ref.instruction
                    ? `REFERENCE IMAGE (style/content guidance only — do not use as base): ${ref.instruction}`
                    : "REFERENCE IMAGE (style/content guidance only — do not use as base)";
                parts.push({ text: refLabel });
                allRefs.push(ref.src);
            } catch (err) {
                console.warn(`Failed to process reference image ${i}:`, err);
            }
        }
    }

    console.log('[DEBUG] prepareParts - parts:', parts.length, 'mask:', hasMask, 'refs:', hasRefs);

    // Guard: Google API rejects empty contents
    if (parts.length === 0) {
        throw new Error('Cannot generate: no prompt or image provided.');
    }

    return { parts, hasMask, hasRefs, allRefs };
};

/**
 * Time-to-first-chunk deadline. If Gemini's stream doesn't emit anything within
 * this window, we treat the request as hung and abort so the Kie fallback can run.
 * Normal first chunk arrives in 2–8s; 20s gives comfortable headroom.
 */
const FIRST_CHUNK_TIMEOUT_MS = 20_000;

/**
 * Once streaming has begun, any gap between chunks longer than this is treated
 * as a mid-stream hang. Seen with gemini-3.1-flash-image-preview: it emits a
 * thought chunk, then stalls forever waiting for the final image.
 */
const CHUNK_IDLE_TIMEOUT_MS = 25_000;

/**
 * Error thrown when Gemini's stream fails to produce a first chunk in time.
 * index.ts uses this to trigger the Kie fallback without waiting for the
 * overall request timeout.
 */
export class GeminiNoStreamError extends Error {
    constructor(message = 'Gemini produced no stream chunk within deadline') {
        super(message);
        this.name = 'GeminiNoStreamError';
    }
}

/**
 * Merges an array of streamed GenerateContentResponse chunks into a single
 * response object that looks the same shape as the non-streaming response.
 * extractGeneratedImage() can then read it unchanged.
 */
const mergeStreamChunks = (chunks: any[]): any => {
    if (chunks.length === 0) return null;

    // Collect all parts across all chunks (each chunk has candidates[0].content.parts).
    const allParts: any[] = [];
    let lastCandidate: any = null;
    let promptFeedback: any = null;
    let usageMetadata: any = null;
    let modelVersion: string | null = null;
    let responseId: string | null = null;

    for (const chunk of chunks) {
        const candidate = chunk?.candidates?.[0];
        if (candidate) {
            lastCandidate = candidate;
            const parts = candidate?.content?.parts;
            if (Array.isArray(parts)) allParts.push(...parts);
        }
        if (chunk?.promptFeedback) promptFeedback = chunk.promptFeedback;
        if (chunk?.usageMetadata) usageMetadata = chunk.usageMetadata;
        if (chunk?.modelVersion) modelVersion = chunk.modelVersion;
        if (chunk?.responseId) responseId = chunk.responseId;
    }

    return {
        candidates: lastCandidate
            ? [{
                ...lastCandidate,
                content: {
                    ...(lastCandidate.content || {}),
                    parts: allParts
                }
            }]
            : [],
        promptFeedback,
        usageMetadata,
        modelVersion,
        responseId
    };
};

/**
 * Calls Gemini API to generate an image via streaming.
 *
 * Why streaming:
 * - Gives us a time-to-first-chunk signal. If the server hangs (seen on 2-image
 *   edits), no chunks arrive and we abort at FIRST_CHUNK_TIMEOUT_MS instead of
 *   waiting for the full request timeout — the Kie fallback gets the budget.
 * - Thought chunks (interim reasoning images) stream as they're produced, so
 *   we know the generator is actually working before the final image lands.
 *
 * System instruction adapts to the scenario (create, edit, annotations, refs).
 */
export const generateImage = async (
    apiKey: string,
    modelName: string,
    parts: any[],
    generationConfig: any,
    hasSource: boolean,
    hasMask: boolean,
    hasRefs: boolean,
    onRetry?: () => void
) => {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = getSystemInstruction(hasSource, hasMask, hasRefs);

    console.log('[DEBUG] System Instruction:', systemInstruction);

    // Exponential backoff retry for transient errors (Google recommendation)
    // Attempts: 3 total. Delays: 5s, 10s, 20s + up to 3s jitter each.
    // Hang detection (no first chunk) is NOT retried — fall through fast to Kie.
    let lastError: any;
    const MAX_ATTEMPTS = 3;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        try {
            const stream = await ai.models.generateContentStream({
                model: modelName,
                contents: [{ parts }],
                config: {
                    systemInstruction,
                    responseModalities: ['IMAGE'],
                    // includeThoughts makes thinking chunks stream — a strong liveness
                    // signal that the server is actually generating (not hung).
                    // thoughtsTokenCount is billed either way.
                    thinkingConfig: { includeThoughts: true },
                    ...generationConfig
                }
            });

            // Race: every chunk (including the first) must arrive within its deadline.
            // First chunk: FIRST_CHUNK_TIMEOUT_MS. Subsequent chunks: CHUNK_IDLE_TIMEOUT_MS.
            // A mid-stream hang (seen on image-preview models) reliably triggers here
            // so the caller can fall back to Kie within budget.
            const chunks: any[] = [];
            const streamStart = Date.now();
            let firstChunkAt: number | null = null;
            let thoughtChunkCount = 0;
            let idleTimer: ReturnType<typeof setTimeout> | null = null;
            let hangReject: ((err: Error) => void) | null = null;

            const resetIdleTimer = () => {
                if (idleTimer) clearTimeout(idleTimer);
                const isFirst = firstChunkAt === null;
                const windowMs = isFirst ? FIRST_CHUNK_TIMEOUT_MS : CHUNK_IDLE_TIMEOUT_MS;
                idleTimer = setTimeout(() => {
                    hangReject?.(new GeminiNoStreamError(
                        isFirst
                            ? `No stream chunk from Gemini within ${FIRST_CHUNK_TIMEOUT_MS / 1000}s`
                            : `Gemini stream idle for ${CHUNK_IDLE_TIMEOUT_MS / 1000}s after ${chunks.length} chunk(s)`
                    ));
                }, windowMs);
            };

            const hangDeadline = new Promise<never>((_, reject) => {
                hangReject = reject;
            });
            resetIdleTimer();

            const consume = (async () => {
                for await (const chunk of stream) {
                    if (firstChunkAt === null) {
                        firstChunkAt = Date.now();
                        console.log(`[DEBUG] Gemini first chunk received after ${firstChunkAt - streamStart}ms`);
                    }
                    // Count thought chunks (interim reasoning images) as a liveness signal.
                    const parts = chunk?.candidates?.[0]?.content?.parts;
                    if (Array.isArray(parts)) {
                        for (const p of parts) if (p?.thought) { thoughtChunkCount++; break; }
                    }
                    chunks.push(chunk);
                    resetIdleTimer();
                }
            })();

            try {
                await Promise.race([consume, hangDeadline]);
            } finally {
                if (idleTimer) clearTimeout(idleTimer);
            }

            const merged = mergeStreamChunks(chunks);
            // Attach stream telemetry for the caller to persist in providerMetadata.
            merged.streamStats = {
                firstChunkLatencyMs: firstChunkAt !== null ? firstChunkAt - streamStart : null,
                totalStreamMs: Date.now() - streamStart,
                chunkCount: chunks.length,
                thoughtChunkCount,
            };
            return merged;
        } catch (err: any) {
            lastError = err;

            // Hang — don't retry, let caller fallback to Kie immediately.
            if (err instanceof GeminiNoStreamError) {
                console.warn('[DEBUG] Gemini stream hang detected — abort for fallback');
                throw err;
            }

            const status = err.status || (err.message?.match(/\[(\d+)\]/)?.[1]);
            const isTransient = status === '500' || status === '503' || status === '429' || status === '504' || err.message?.includes('fetch failed');
            if (isTransient && i < MAX_ATTEMPTS - 1) {
                const baseDelay = 5000 * Math.pow(2, i); // 5s, 10s, 20s
                const jitter = Math.random() * 3000;     // 0–3s jitter
                console.warn(`Gemini API transient error (${status}), retry ${i + 1}/${MAX_ATTEMPTS - 1} after ${Math.round((baseDelay + jitter) / 1000)}s...`);
                onRetry?.();
                await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
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
