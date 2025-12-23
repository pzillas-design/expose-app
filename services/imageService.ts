import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { CanvasImage, ImageRow } from '../types';

export const imageService = {
    /**
     * Saves a newly generated image to Storage and DB.
     * This is intended to be called in the background (fire and forget from UI perspective).
     */
    async persistImage(image: CanvasImage, userId: string): Promise<void> {
        console.log(`Deep Sync: Persisting image ${image.id} for user ${userId}...`);

        // 1. Upload to Storage
        const path = await storageService.uploadImage(image.src, userId);
        if (!path) {
            console.warn('Deep Sync: Storage upload failed. Skipping DB insert.');
            return;
        }

        // 2. Insert into DB
        const { error } = await supabase.from('canvas_images').insert({
            id: image.id,
            user_id: userId,
            storage_path: path,
            width: image.width,
            height: image.height,
            title: image.title,
            base_name: image.baseName,
            version: image.version,
            prompt: image.generationPrompt,
            parent_id: image.parentId,
            annotations: image.annotations ? JSON.stringify(image.annotations) : null,
            generation_params: { quality: image.quality }
        });

        if (error) {
            console.error('Deep Sync: DB Insert Failed:', error);
        } else {
            console.log(`Deep Sync: Success! Image ${image.id} is safe.`);
        }
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
            const signedUrl = await storageService.getSignedUrl(record.storage_path);

            return {
                id: record.id,
                src: signedUrl || '', // Fallback?
                width: record.width,
                height: record.height,
                title: record.title,
                baseName: record.base_name,
                version: record.version,
                isGenerating: false,
                originalSrc: signedUrl || '', // For now assuming original is same
                generationPrompt: record.prompt,
                userDraftPrompt: '',
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
