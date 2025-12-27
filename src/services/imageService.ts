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
        modelName: string;
    }): Promise<CanvasImage> {
        const { editImageWithGemini } = await import('./geminiService');
        const { generateThumbnail } = await import('../utils/imageUtils');

        const result = await editImageWithGemini(
            sourceImage.src,
            prompt,
            maskDataUrl,
            qualityMode,
            sourceImage.annotations || []
        );

        const thumbSrc = await generateThumbnail(result.imageBase64);

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
            maskSrc: undefined
        };
    },

    /**
     * Loads all images for the user from DB and Storage.
     * Converts them back into the ImageRow structure used by the app.
     */
    async loadUserImages(userId: string): Promise<ImageRow[]> {
        console.log('Deep Sync: Loading user history...');

        // 1. Get Metadata
        const { data: dbImages, error } = await supabase
            .from('canvas_images')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error || !dbImages) {
            console.error('Deep Sync: Load Failed:', error);
            return [];
        }

        // 2. Resolve URLs (Parallel)
        const loadedImages: CanvasImage[] = await Promise.all(dbImages.map(async (record) => {
            const [signedUrl, thumbSignedUrl] = await Promise.all([
                storageService.getSignedUrl(record.storage_path),
                record.thumb_storage_path ? storageService.getSignedUrl(record.thumb_storage_path) : Promise.resolve(null)
            ]);

            return {
                id: record.id,
                src: signedUrl || '', // Fallback?
                thumbSrc: thumbSignedUrl || undefined,
                width: record.width,
                height: record.height,
                realWidth: record.real_width,
                realHeight: record.real_height,
                modelVersion: record.model_version,
                title: record.title,
                baseName: record.base_name,
                version: record.version,
                isGenerating: false,
                originalSrc: signedUrl || '', // For now assuming original is same
                generationPrompt: record.prompt,
                userDraftPrompt: record.user_draft_prompt || '',
                annotations: record.annotations ? (typeof record.annotations === 'string' ? JSON.parse(record.annotations) : record.annotations) : [],
                parentId: record.parent_id,
                quality: record.generation_params?.quality || 'pro-1k',
                createdAt: new Date(record.created_at).getTime(),
                updatedAt: new Date(record.updated_at).getTime()
            };
        }));

        // 3. Group into Rows based on Parent/Child relationships
        // Logic: Items with the same baseName (or lineage) likely belong in the same row.
        // Simple approach: Group by baseName.

        const rows: ImageRow[] = [];
        const groups = new Map<string, CanvasImage[]>();

        loadedImages.forEach(img => {
            // Filter out images where signed URL failed
            if (!img.src) return;

            const key = img.baseName || img.title || 'untitled';
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(img);
        });

        groups.forEach((items, key) => {
            // Sort by version
            items.sort((a, b) => (a.version || 0) - (b.version || 0));

            rows.push({
                id: items[0].id + '_row', // reliable row id
                title: key,
                items: items,
                createdAt: items[0].createdAt
            });
        });

        // Sort rows by newest first
        rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return rows;
    }
};
