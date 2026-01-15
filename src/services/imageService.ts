import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { CanvasImage, ImageRow } from '../types';
import { boardService } from './boardService';
import { slugify } from '../utils/stringUtils';

export const imageService = {
    /**
     * Saves a newly generated image to Storage and DB.
     * This is intended to be called in the background (fire and forget from UI perspective).
     */
    async persistImage(image: CanvasImage, userId: string): Promise<{ success: boolean; error?: string }> {
        console.log(`Deep Sync: Persisting image ${image.id} for user ${userId}...`);

        // 1. Determine Path & Filename
        const boardId = (image as any).boardId;
        let subfolder = boardId;

        if (boardId) {
            await boardService.ensureBoardExists(userId, boardId);
            const board = await boardService.getBoard(boardId);
            if (board) {
                subfolder = `${slugify(board.name)}_${boardId}`;
            }
        }

        const titleSlug = slugify(image.title || 'image');
        const customFileName = `${titleSlug}_v${image.version || 1}_${image.id.substring(0, 8)}.png`;

        // 2. Upload Image (Compressed to 4K max via uploadImage)
        const path = await storageService.uploadImage(image.src, userId, customFileName, subfolder);
        if (!path) {
            console.warn('Deep Sync: Storage upload failed. Skipping DB insert.');
            return { success: false, error: 'Upload Failed' };
        }

        // 2. Insert into DB (Thumbnail path is now optional/null as we use dynamic transformations)
        const { error } = await supabase.from('canvas_images').insert({
            id: image.id,
            user_id: userId,
            board_id: (image as any).boardId, // Use boardId if available
            storage_path: path,
            thumb_storage_path: null,
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

        if (updates.activeTemplateId !== undefined || updates.variableValues !== undefined || updates.quality !== undefined) {
            const { data: current } = await supabase
                .from('canvas_images')
                .select('generation_params')
                .eq('id', imageId)
                .single();

            const params = current?.generation_params || {};
            if (updates.activeTemplateId !== undefined) params.activeTemplateId = updates.activeTemplateId;
            if (updates.variableValues !== undefined) params.variableValues = updates.variableValues;
            if (updates.quality !== undefined) params.quality = updates.quality;

            dbUpdates.generation_params = params;
        }

        if (updates.width !== undefined) dbUpdates.width = updates.width;
        if (updates.height !== undefined) dbUpdates.height = updates.height;
        if (updates.realWidth !== undefined) dbUpdates.real_width = updates.realWidth;
        if (updates.realHeight !== undefined) dbUpdates.real_height = updates.realHeight;

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

        // 1. Delete from canvas_images
        const { error: imgError } = await supabase
            .from('canvas_images')
            .delete()
            .in('id', imageIds)
            .eq('user_id', userId);

        if (imgError) {
            console.error('Deep Sync: Bulk Delete DB Failed:', imgError);
            throw imgError;
        }

        // 2. Also delete from generation_jobs to prevent "resurrection" on reload
        const { error: jobError } = await supabase
            .from('generation_jobs')
            .delete()
            .in('id', imageIds)
            .eq('user_id', userId);

        if (jobError) {
            console.warn('Deep Sync: Bulk Delete jobs failed (missing RLS?), attempting status update fallback:', jobError);
            await supabase
                .from('generation_jobs')
                .update({ status: 'failed' })
                .in('id', imageIds)
                .eq('user_id', userId);
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
        modelName,
        boardId,
        attachments,
        targetVersion,
        targetTitle,
        aspectRatio
    }: {
        sourceImage: CanvasImage;
        prompt: string;
        qualityMode: any;
        maskDataUrl?: string;
        newId: string;
        modelName?: string;
        boardId?: string;
        attachments?: string[];
        targetVersion?: number;
        targetTitle?: string;
        aspectRatio?: string;
    }): Promise<CanvasImage> {
        console.log(`Generation: Invoking Edge Function for job ${newId}...`);

        const { data, error } = await supabase.functions.invoke('generate-image', {
            body: {
                sourceImage,
                prompt,
                qualityMode,
                maskDataUrl,
                newId,
                modelName,
                board_id: boardId,
                attachments,
                aspectRatio
            }
        });

        if (error || !data?.success) {
            console.error("Edge Generation Failed:");
            console.error("  Error object:", error);
            console.error("  Response data:", data);
            console.error("  Status:", error?.status);
            console.error("  Message:", error?.message || data?.error);

            const errorMsg = error?.message || data?.error || "Unknown generation error";
            const statusInfo = error?.status ? ` (Status: ${error.status})` : '';
            throw new Error(`${errorMsg}${statusInfo}`);
        }

        const result = data.image; // Server returns partially populated CanvasImage

        // We skip manual thumbnail generation now, as we use dynamic transformations.
        // The resolved record will handle requesting a smaller version via Supabase.


        // Determine actual dimensions of the generated result
        const getImageDims = (src: string): Promise<{ w: number, h: number }> => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
                img.src = src;
            });
        };

        const { w: genWidth, h: genHeight } = await getImageDims(result.src);

        const logicalWidth = (genWidth / genHeight) * 512;
        const logicalHeight = 512;

        // NEW: Sync the DB if the returned dimensions differ from the placeholder
        // This prevents "cropping" on reload when the placeholder had the wrong aspect ratio
        if (Math.abs(logicalWidth - sourceImage.width) > 1) {
            console.log(`Generation: Dimension mismatch detected (${genWidth}x${genHeight}). Syncing DB...`);
            this.updateImage(newId, {
                width: Math.round(logicalWidth),
                height: Math.round(logicalHeight),
                realWidth: genWidth,
                realHeight: genHeight
            } as any, sourceImage.userId || (sourceImage as any).user_id)
                .catch(e => console.warn("Failed to sync natural dimensions to DB:", e));
        }

        return {
            ...sourceImage,
            id: newId,
            src: result.src,
            storage_path: result.storage_path,
            thumbSrc: undefined,
            originalSrc: sourceImage.src,

            isGenerating: false,
            generationStartTime: sourceImage.generationStartTime,
            generationPrompt: prompt,
            quality: qualityMode,
            userDraftPrompt: '', // Clean prompt field for generated images
            activeTemplateId: undefined, // No preset carried over
            variableValues: undefined, // No variables carried over,
            version: targetVersion || (sourceImage.version || 1) + 1,
            title: targetTitle || (sourceImage.title.includes('_v')
                ? sourceImage.title.split('_v')[0] + `_v${(sourceImage.version || 1) + 1}`
                : `${sourceImage.title}_v2`),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            modelVersion: result.modelVersion,
            annotations: [], // Clean slate - no inherited annotations
            maskSrc: undefined,
            // Keep canvas dimensions consistent with the row height to prevent "huge" images
            // while storing the actual high-res pixels in realWidth/Height
            width: logicalWidth,
            height: logicalHeight,
            realWidth: genWidth,
            realHeight: genHeight,
            boardId: boardId,
            parentId: sourceImage.id
        };
    },

    /**
     * Resolves a single DB record into a CanvasImage object.
     * Uses pre-signed URLs if provided to avoid sequential network requests.
     */
    async resolveImageRecord(record: any, preSignedUrls: Record<string, string> = {}): Promise<CanvasImage> {
        let signedUrl = preSignedUrls[record.storage_path];

        // AUTO-SIGN FALLBACK: If URL is missing (e.g. newly generated), fetch it now
        if (!signedUrl && record.storage_path) {
            signedUrl = await storageService.getSignedUrl(record.storage_path);
        }

        // Use pre-signed 800px version as thumbSrc if available
        const thumbOptionsKey = `_800xundefined_q75`;
        let thumbSignedUrl = preSignedUrls[record.storage_path + thumbOptionsKey];

        // AUTO-SIGN FALLBACK FOR OPTIMIZED:
        if (!thumbSignedUrl && record.storage_path) {
            thumbSignedUrl = await storageService.getSignedUrl(record.storage_path, { width: 800, quality: 75 });
        }

        const targetHeight = 512;
        const aspectRatio = record.width / record.height;
        const normalizedWidth = aspectRatio * targetHeight;

        const rawAnns = record.annotations ? (typeof record.annotations === 'string' ? JSON.parse(record.annotations) : record.annotations) : [];

        // Resolve reference image paths in annotations from the provided pre-signed map
        const resolvedAnns = await Promise.all(rawAnns.map(async (ann: any) => {
            if (ann.referenceImage && !ann.referenceImage.startsWith('data:') && !ann.referenceImage.startsWith('http')) {
                let resolvedUrl = preSignedUrls[ann.referenceImage];
                if (!resolvedUrl) {
                    resolvedUrl = await storageService.getSignedUrl(ann.referenceImage);
                }
                return { ...ann, referenceImage: resolvedUrl || ann.referenceImage };
            }
            return ann;
        }));

        return {
            id: record.id,
            src: signedUrl || '',
            storage_path: record.storage_path,
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
            annotations: resolvedAnns,
            parentId: record.parent_id,
            quality: record.generation_params?.quality || 'pro-1k',
            activeTemplateId: record.generation_params?.activeTemplateId,
            variableValues: record.generation_params?.variableValues,
            userId: record.user_id,
            createdAt: new Date(record.created_at).getTime(),
            generationStartTime: new Date(record.created_at).getTime(),
            updatedAt: new Date(record.updated_at).getTime()
        };
    },

    /**
     * Loads all images for the user from DB and Storage.
     * Converts them back into the ImageRow structure used by the app.
     */
    async loadUserImages(userId: string, boardId?: string): Promise<ImageRow[]> {
        console.log(`[DEBUG] loadUserImages: boardId=${boardId}, userId=${userId}`);
        console.log('Deep Sync: Loading user history (Priority: Newest First)...');

        // 1. Get Completed Images & Active Jobs in parallel
        let imgsQuery = supabase
            .from('canvas_images')
            .select('*')
            .eq('user_id', userId);

        if (boardId) {
            imgsQuery = imgsQuery.eq('board_id', boardId);
        }


        // Fetch jobs WITH board_id filter to ensure board isolation
        let jobsQuery = supabase
            .from('generation_jobs')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'processing');

        if (boardId) {
            jobsQuery = jobsQuery.eq('board_id', boardId);
        }

        const [imgsRes, jobsRes] = await Promise.all([
            imgsQuery.order('created_at', { ascending: false }),
            jobsQuery.order('created_at', { ascending: false })
        ]);

        if (imgsRes.error) {
            console.error('Deep Sync: Load Images Failed:', imgsRes.error);
            return [];
        }

        const dbImages = imgsRes.data || [];

        // 1.5. Clean up and filter stale jobs (older than 6 minutes)
        let rawJobs = jobsRes.data || [];

        const sixMinutesAgo = Date.now() - (6 * 60 * 1000);

        const activeJobs = rawJobs.filter(j => new Date(j.created_at).getTime() >= sixMinutesAgo);
        const staleJobs = rawJobs.filter(j => new Date(j.created_at).getTime() < sixMinutesAgo);

        if (staleJobs.length > 0) {
            console.log(`Deep Sync: Automatically cleaning up ${staleJobs.length} stale jobs...`);
            supabase.from('generation_jobs')
                .delete()
                .in('id', staleJobs.map(j => j.id))
                .then(({ error }) => {
                    if (error) console.error('Stale job cleanup failed:', error);
                });
        }

        // 2. Resolve URLs for Completed Images with Batching
        const loadedImages: CanvasImage[] = [];

        if (dbImages.length > 0) {
            // Collect ALL paths that need signing
            const allPathsToSign = new Set<string>();
            dbImages.forEach(rec => {
                if (rec.storage_path) allPathsToSign.add(rec.storage_path);
                // Add reference images from annotations
                const rawAnns = rec.annotations ? (typeof rec.annotations === 'string' ? JSON.parse(rec.annotations) : rec.annotations) : [];
                rawAnns.forEach((ann: any) => {
                    if (ann.referenceImage && !ann.referenceImage.startsWith('data:') && !ann.referenceImage.startsWith('http')) {
                        allPathsToSign.add(ann.referenceImage);
                    }
                });
            });

            // Batch sign 100 paths at a time - PARALLELIZED for speed
            const pathsArray = Array.from(allPathsToSign);
            const signedUrlMap: Record<string, string> = {};

            const chunks: string[][] = [];
            for (let i = 0; i < pathsArray.length; i += 100) {
                chunks.push(pathsArray.slice(i, i + 100));
            }

            // Execute all chunks in parallel
            await Promise.all(chunks.map(async (chunk) => {
                const [hdResults, optResults] = await Promise.all([
                    // 1. Sign original HD versions
                    storageService.getSignedUrls(chunk),
                    // 2. Pre-sign 800px optimized versions for immediate canvas display
                    storageService.getSignedUrls(chunk, { width: 800, quality: 75 })
                ]);
                Object.assign(signedUrlMap, hdResults);
                Object.assign(signedUrlMap, optResults);
            }));

            // Transform records using the map
            const transformed = await Promise.all(dbImages.map(rec => this.resolveImageRecord(rec, signedUrlMap)));
            loadedImages.push(...transformed);
        }

        // 3. Reconstruct Skeleton Placeholders from Active Jobs
        activeJobs.forEach(job => {
            // SKIP if this ID is already loaded as a finished image
            if (loadedImages.some(img => img.id === job.id)) {
                console.log(`Deep Sync: Skipping job ${job.id} as it is already loaded as a finished image.`);
                return;
            }

            // Find parent to inherit dimensions/baseName
            const parent = loadedImages.find(img => img.id === job.parent_id) || dbImages.find(d => d.id === job.parent_id);

            // Correctly resolve baseName from either CanvasImage (baseName) or DB record (base_name)
            const parentBaseName = parent ? (('baseName' in parent) ? parent.baseName : (parent as any).base_name) : null;
            const baseName = parentBaseName || 'Generation';
            const startTime = new Date(job.created_at).getTime();

            const skeleton: CanvasImage = {
                id: job.id,
                src: parent?.src || '', // Use parent image as placeholder if available
                storage_path: '',
                width: parent ? (parent.width / (parent.height || 512)) * 512 : 512,
                height: 512,
                title: baseName,
                baseName: baseName,
                version: 0, // Will be updated on completion
                isGenerating: true,
                generationStartTime: startTime,
                parentId: job.parent_id,
                generationPrompt: job.prompt,
                quality: job.model as any,
                createdAt: startTime,
                updatedAt: startTime,
                annotations: [],
                boardId: job.board_id
            };
            loadedImages.push(skeleton);
        });

        // 4. Group into Rows
        const rows: ImageRow[] = [];
        const groups = new Map<string, CanvasImage[]>();

        loadedImages.forEach(img => {
            // No longer filtering out images without src - we let the UI component handle the fallback
            // This prevents the entire row/canvas from being empty if batch signing fails temporarily.

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
                createdAt: items[items.length - 1].createdAt || items[0].createdAt // Row date is newest item in row
            });
        });

        // Sort rows by oldest first (newest will be at the bottom of the canvas)
        rows.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        return rows;
    }
};
