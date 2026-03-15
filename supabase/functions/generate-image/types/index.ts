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

export const COSTS: Record<string, number> = {
    'fast': 0.00,
    'pro-1k': 0.10,
    'pro-2k': 0.25,
    'pro-4k': 0.50,
    'nb2-1k': 0.07,
    'nb2-2k': 0.17,
    'nb2-4k': 0.35,
};
