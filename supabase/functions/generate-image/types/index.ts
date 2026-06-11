/**
 * Type definitions for generate-image Edge Function
 */

export interface GenerationPayload {
    newId: string;
    sourceImage: any;
    prompt: string;
    qualityMode: string;
    maskDataUrl?: string;
    modelName?: string;
    board_id?: string;
    attachments?: string[];
    aspectRatio?: string;
}

export interface GenerationConfig {
    imageConfig: {
        mimeType?: string;
        imageSize?: string;
        aspectRatio?: string;
    };
}

// Sale prices per image, ~75% margin against fal.ai costs.
// Nano Banana has no quality knob — flat per resolution.
// fal costs: NB2 $0.06/0.08/0.12/0.16 · NB Pro $0.15/0.15/0.30.
export const COSTS: Record<string, number> = {
    'fast': 0.00,
    'pro-1k': 0.60,
    'pro-2k': 0.60,
    'pro-4k': 1.20,
    'nb2-05k': 0.25,
    'nb2-1k': 0.30,
    'nb2-2k': 0.50,
    'nb2-4k': 0.65,
};

// GPT Image 2 is the only model where quality affects price
// (fal bills low/medium/high differently: e.g. high $0.21 at 1K, $0.40 at 4K).
export const GPT_COSTS: Record<string, Record<string, number>> = {
    'nb2-1k': { low: 0.05, medium: 0.20, high: 0.85 },
    'nb2-2k': { low: 0.10, medium: 0.30, high: 1.00 },
    'nb2-4k': { low: 0.20, medium: 0.50, high: 1.60 },
};
