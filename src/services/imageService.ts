import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { CanvasImage, ImageRow } from '../types';

export const imageService = {
    /**
     * Saves a newly generated image to Storage and DB.
     * This is intended to be called in the background (fire and forget from UI perspective).
     */
    async persistImage(image: CanvasImage, userId: string): Promise<{ success: boolean; error?: string }> {
        console.log(`Deep Sync: Persisting image ${image.id} for user ${userId}...`);

        // 1. Upload Full Image
        const path = await storageService.uploadImage(image.src, userId);
        if (!path) {
            console.warn('Deep Sync: Storage upload failed. Skipping DB insert.');
            return { success: false, error: 'Upload Failed' };
        }

        // 2. Upload Thumbnail if exists
        let thumbPath: string | null = null;
        if (image.thumbSrc) {
            const thumbFileName = `thumb_${image.id}.jpg`;
            thumbPath = await storageService.uploadImage(image.thumbSrc, userId, thumbFileName);
        }

        // 3. Insert into DB
        const { error } = await supabase.from('canvas_images').insert({
            id: image.id,
            user_id: userId,
            storage_path: path,
            thumb_storage_path: thumbPath,
            width: Math.round(image.width),
            height: Math.round(image.height),
            real_width: image.realWidth,
            real_height: image.realHeight,
            model_version: image.modelVersion,
            title: image.title,
            base_name: image.baseName,
            version: image.version,
            prompt: image.generationPrompt,
            user_draft_prompt: image.userDraftPrompt,
            parent_id: image.parentId,
            annotations: image.annotations ? JSON.stringify(image.annotations) : null,
            generation_params: { quality: image.quality }
        });

        if (error) {
            console.error('Deep Sync: DB Insert Failed:', error);
            return { success: false, error: `DB: ${error.message}` };
        } else {
            console.log(`Deep Sync: Success! Image ${image.id} is safe.`);
            return { success: true };
        }
    },

    /**
     * Updates an existing image in the DB.
     */
    async updateImage(imageId: string, updates: Partial<CanvasImage>, userId: string): Promise<void> {
        const dbUpdates: any = {};

        // Map fields
        if (updates.annotations !== undefined) {
            dbUpdates.annotations = JSON.stringify(updates.annotations);
        }
        if (updates.userDraftPrompt !== undefined) {
            dbUpdates.user_draft_prompt = updates.userDraftPrompt;
        }

        // Only proceed if there are actual updates
        if (Object.keys(dbUpdates).length === 0) return;

        const { error } = await supabase
            .from('canvas_images')
            .update({ ...dbUpdates, updated_at: new Date().toISOString() })
            .eq('id', imageId)
            .eq('user_id', userId);

        if (error) {
            console.error('Deep Sync: Update Failed:', error);
            throw error; // Bubble up to controller
        }
    },

    /**
     * Deletes multiple images from DB.
     */
    async deleteImages(imageIds: string[], userId: string): Promise<void> {
        if (imageIds.length === 0) return;

        const { error } = await supabase
            .from('canvas_images')
            .delete()
            .in('id', imageIds)
            .eq('user_id', userId);

        if (error) {
            console.error('Deep Sync: Bulk Delete DB Failed:', error);
            throw error;
        }
    },

    /**
     * Deletes an image from DB and Storage.
     */
    async deleteImage(image: CanvasImage, userId: string): Promise<void> {
        return this.deleteImages([image.id], userId);
    },

    /**
     * Handles the complex step of generating an image and returning the final CanvasImage object.
     * NOW: Offloaded to Supabase Edge Function for persistence.
     */
    async processGeneration({
        sourceImage,
        prompt,
        qualityMode,
        maskDataUrl,
        newId,
        modelName
    }: {
        sourceImage: CanvasImage;
        prompt: string;
        qualityMode: any;
        maskDataUrl?: string;
        newId: string;
        modelName?: string;
    }): Promise<CanvasImage> {
        console.log(`Generation: Invoking Edge Function for job ${newId}...`);

        const { data, error } = await supabase.functions.invoke('generate-image', {
            body: {
                sourceImage,
                prompt,
                qualityMode,
                maskDataUrl,
                newId,
                modelName
            }
        });

        if (error || !data?.success) {
            console.error("Edge Generation Failed:", error || data?.error);
            throw new Error(error?.message || data?.error || "Generation error");
        }

        const result = data.image; // Server returns partially populated CanvasImage
        const { generateThumbnail } = await import('../utils/imageUtils');
        const thumbSrc = await generateThumbnail(result.src);

        // Determine actual dimensions of the generated result
        const getImageDims = (src: string): Promise<{ w: number, h: number }> => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
                img.src = src;
            });
        };

        const { w: genWidth, h: genHeight } = await getImageDims(result.imageBase64);

        return {
            ...sourceImage,
            id: newId,
            src: result.imageBase64,
            thumbSrc: thumbSrc,
            originalSrc: sourceImage.src,
            isGenerating: false,
            generationStartTime: undefined,
            generationPrompt: prompt,
            userDraftPrompt: '',
            version: (sourceImage.version || 1) + 1,
            title: sourceImage.title.includes('_v')
                ? sourceImage.title.split('_v')[0] + `_v${(sourceImage.version || 1) + 1}`
                : `${sourceImage.title}_v2`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            modelVersion: result.modelVersion,
            annotations: [],
            maskSrc: undefined,
            // Keep canvas dimensions consistent with the row height to prevent "huge" images
            // while storing the actual high-res pixels in realWidth/Height
            width: (genWidth / genHeight) * 512,
            height: 512,
            realWidth: genWidth,
            realHeight: genHeight
        };
    },

    /**
     * Loads all images for the user from DB and Storage.
     * Converts them back into the ImageRow structure used by the app.
     */
    async loadUserImages(userId: string): Promise<ImageRow[]> {
        console.log('Deep Sync: Loading user history (Priority: Newest First)...');

        // 1. Get Metadata - Order by newest first
        const { data: dbImages, error } = await supabase
            .from('canvas_images')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error || !dbImages) {
            console.error('Deep Sync: Load Failed:', error);
            return [];
        }

        // 2. Resolve URLs with Prioritization
        // We load in chunks to give the newest ones the strongest focus in the browser's network tab
        const loadedImages: CanvasImage[] = [];

        // Helper to resolve a single record
        const resolveRecord = async (record: any): Promise<CanvasImage> => {
            const [signedUrl, thumbSignedUrl] = await Promise.all([
                storageService.getSignedUrl(record.storage_path),
                record.thumb_storage_path ? storageService.getSignedUrl(record.thumb_storage_path) : Promise.resolve(null)
            ]);

            const targetHeight = 512;
            const aspectRatio = record.width / record.height;
            const normalizedWidth = aspectRatio * targetHeight;

            return {
                id: record.id,
                src: signedUrl || '',
                thumbSrc: thumbSignedUrl || undefined,
                width: normalizedWidth,
                height: targetHeight,
                realWidth: record.real_width,
                realHeight: record.real_height,
                modelVersion: record.model_version,
                title: record.title,
                baseName: record.base_name,
                version: record.version,
                isGenerating: false,
                originalSrc: signedUrl || '',
                generationPrompt: record.prompt,
                userDraftPrompt: record.user_draft_prompt || '',
                annotations: record.annotations ? (typeof record.annotations === 'string' ? JSON.parse(record.annotations) : record.annotations) : [],
                parentId: record.parent_id,
                quality: record.generation_params?.quality || 'pro-1k',
                createdAt: new Date(record.created_at).getTime(),
                updatedAt: new Date(record.updated_at).getTime()
            };
        };

        // Chunk the work: Load first 10 immediately, then the rest
        const priorityBatch = dbImages.slice(0, 10);
        const remainingBatch = dbImages.slice(10);

        const priorityResults = await Promise.all(priorityBatch.map(resolveRecord));
        loadedImages.push(...priorityResults);

        // Load the rest in the background without blocking the first render
        // (The caller will get the first set, and we could potentially update later, 
        // but for now we just want to ensure the order of requests is correct)
        if (remainingBatch.length > 0) {
            // Process remaining in chunks of 20 to keep network pipe focused
            for (let i = 0; i < remainingBatch.length; i += 20) {
                const chunk = remainingBatch.slice(i, i + 20);
                const chunkResults = await Promise.all(chunk.map(resolveRecord));
                loadedImages.push(...chunkResults);
            }
        }

        // 3. Group into Rows
        const rows: ImageRow[] = [];
        const groups = new Map<string, CanvasImage[]>();

        loadedImages.forEach(img => {
            if (!img.src) return;
            const key = img.baseName || img.title || 'untitled';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(img);
        });

        groups.forEach((items, key) => {
            // Within a row, we still sort oldest to newest (left to right)
            items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            rows.push({
                id: items[0].id + '_row',
                title: key,
                items: items,
                createdAt: items[items.length - 1].createdAt // Row date is newest item in row
            });
        });

        // Sort rows by oldest first (newest will be at the bottom of the canvas)
        rows.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        return rows;
    }
};
