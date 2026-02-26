import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { CanvasImage, ImageRow } from '../types';
import { slugify } from '../utils/stringUtils';
import { generateId } from '../utils/ids';

const buildUploadSubfolder = () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const dateFolder = `upload${dd}${mm}${yyyy}`;
    return `user-content/${dateFolder}`;
};

export const imageService = {
    /**
     * Saves a newly generated image to Storage and DB.
     * This is intended to be called in the background (fire and forget from UI perspective).
     */
    async persistImage(image: CanvasImage, userId: string, userEmail?: string): Promise<{ success: boolean; error?: string; storage_path?: string; thumb_storage_path?: string }> {
        console.log(`Deep Sync: Persisting image ${image.id} for user ${userId}...`);

        // 1. Determine path+filename
        const isOriginal = (image.version || 1) <= 1;
        const fileRole = isOriginal ? 'original' : `variante${image.version}`;
        const customFileName = `${fileRole}_${image.id.substring(0, 8)}.png`;
        const subfolder = buildUploadSubfolder();
        const storageIdentifier = userEmail || userId;

        // 2. Upload Image (Compressed to 4K max via uploadImage)
        const uploadResult = await storageService.uploadImage(image.src, storageIdentifier, customFileName, subfolder);
        if (!uploadResult) {
            console.warn('Deep Sync: Storage upload failed. Skipping DB insert.');
            return { success: false, error: 'Upload Failed' };
        }

        // 3. CLEAN UP ANNOTATIONS: Ensure reference images are storage paths, not signed URLs or Base64
        const cleanedAnnotations = await imageService._processAnnotationsForStorage(image.annotations || [], userId, userEmail);

        // 4. Insert into DB with thumbnail path (still using userId for database)
        const { error } = await supabase.from('images').insert({
            id: image.id,
            user_id: userId,
            storage_path: uploadResult.path,
            thumb_storage_path: uploadResult.thumbPath || null,
            width: Math.round(image?.width || 512),
            height: Math.round(image?.height || 512),
            real_width: image.realWidth,
            real_height: image.realHeight,
            model_version: image.modelVersion,
            title: image.title,
            base_name: image?.baseName || image?.title || 'Image',
            version: image.version,
            prompt: image.generationPrompt,
            user_draft_prompt: image.userDraftPrompt,
            parent_id: image.parentId,
            annotations: cleanedAnnotations ? JSON.stringify(cleanedAnnotations) : null,
            generation_params: { quality: image.quality }
        });


        if (error) {
            console.error('Deep Sync: DB Insert Failed:', error);
            return { success: false, error: `DB: ${error.message}` };
        } else {
            console.log(`Deep Sync: Success! Image ${image.id} is safe.`);
            return {
                success: true,
                storage_path: uploadResult.path,
                thumb_storage_path: uploadResult.thumbPath || undefined
            };
        }
    },

    /**
     * Updates an existing image in the DB.
     */
    async updateImage(imageId: string, updates: Partial<CanvasImage>, userId: string): Promise<void> {
        const dbUpdates: any = {};

        // Map fields
        if (updates.annotations !== undefined) {
            const cleaned = await imageService._processAnnotationsForStorage(updates.annotations, userId);
            dbUpdates.annotations = JSON.stringify(cleaned);
        }
        if (updates.userDraftPrompt !== undefined) {
            dbUpdates.user_draft_prompt = updates.userDraftPrompt;
        }

        if (updates.activeTemplateId !== undefined || updates.variableValues !== undefined || updates.quality !== undefined) {
            const { data: results } = await supabase
                .from('images')
                .select('generation_params')
                .eq('id', imageId)
                .limit(1);

            const current = results?.[0];

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
            .from('images')
            .update({ ...dbUpdates, updated_at: new Date().toISOString() })
            .eq('id', imageId)
            .eq('user_id', userId);

        if (error) {
            console.error('Deep Sync: Update Failed:', error);
            throw error; // Bubble up to controller
        }
    },

    /**
     * Deletes multiple images from DB and Storage.
     */
    async deleteImages(imageIds: string[], userId: string): Promise<void> {
        if (imageIds.length === 0) return;

        // 0. Fetch storage paths before deleting from DB
        const { data: images } = await supabase
            .from('images')
            .select('storage_path, thumb_storage_path')
            .in('id', imageIds)
            .eq('user_id', userId);

        // 1. Delete from images
        const { error: imgError } = await supabase
            .from('images')
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

        // 3. Delete files from Storage (both original and thumbnail)
        if (images && images.length > 0) {
            const pathsToDelete: string[] = [];

            images.forEach(img => {
                if (img.storage_path) {
                    pathsToDelete.push(img.storage_path);
                }
                if (img.thumb_storage_path) {
                    pathsToDelete.push(img.thumb_storage_path);
                }
            });

            if (pathsToDelete.length > 0) {
                console.log(`[ImageService] Deleting ${pathsToDelete.length} files from storage...`);
                const { error: storageError } = await supabase.storage
                    .from('user-content')
                    .remove(pathsToDelete);

                if (storageError) {
                    console.error('Storage deletion failed:', storageError);
                    // Don't throw - DB is already cleaned up
                } else {
                    console.log(`[ImageService] Successfully deleted ${pathsToDelete.length} files from storage`);
                }
            }
        }
    },

    /**
     * Deletes an image from DB and Storage.
     */
    async deleteImage(image: CanvasImage, userId: string): Promise<void> {
        return imageService.deleteImages([image.id], userId);
    },

    /**
     * Handles the complex step of generating an image and returning the final CanvasImage object.
     * NOW: Offloaded to Supabase Edge Function for persistence.
     */
    async processGeneration({
        payload,
        qualityMode,
        modelName,
        newId,
        attachments,
        targetVersion,
        targetTitle,
        aspectRatio,
        sourceImage // Passed for local dimension calculation fallback
    }: {
        payload: any; // StructuredGenerationRequest
        qualityMode: any;
        newId: string;
        sourceImage: CanvasImage;
        modelName?: string;
        attachments?: string[];
        targetVersion?: number;
        targetTitle?: string;
        aspectRatio?: string;
    }): Promise<CanvasImage> {
        console.log(`Generation: Invoking Edge Function for job ${newId}...`);

        const { data, error } = await supabase.functions.invoke('generate-image', {
            body: {
                ...payload,
                qualityMode,
                newId,
                modelName,
                attachments,
                aspectRatio,
                targetTitle,
                sourceImage
            }
        });

        if (error || !data?.success) {
            console.error("Edge Generation Failed:");
            console.error("  Error object:", error);
            console.error("  Response data:", data);

            let errorMsg = "Unknown generation error";
            if (error && (error as any).context) {
                try {
                    // Try to parse error body if it was a FunctionsHttpError
                    const errorBody = await (error as any).context.json();
                    errorMsg = errorBody.error || errorBody.message || JSON.stringify(errorBody);
                } catch (e) {
                    errorMsg = error.message;
                }
            } else {
                errorMsg = error?.message || data?.error || errorMsg;
            }

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
        if (sourceImage?.width && Math.abs(logicalWidth - sourceImage.width) > 1) {
            console.log(`Generation: Dimension mismatch detected (${genWidth}x${genHeight}). Syncing DB...`);
            const targetUserId = sourceImage.userId || (sourceImage as any).user_id;
            if (targetUserId) {
                imageService.updateImage(newId, {
                    width: Math.round(logicalWidth),
                    height: Math.round(logicalHeight),
                    realWidth: genWidth,
                    realHeight: genHeight
                } as any, targetUserId)
                    .catch(e => console.warn("Failed to sync natural dimensions to DB:", e));
            }
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
            generationPrompt: payload.prompt,
            quality: qualityMode,
            userDraftPrompt: '', // Clean prompt field for generated images
            activeTemplateId: undefined, // No preset carried over
            variableValues: undefined, // No variables carried over,
            version: result.version || targetVersion || (sourceImage.version || 1) + 1,
            title: result.title || targetTitle || (sourceImage.title?.includes(' v')
                ? sourceImage.title.split(' v')[0] + ` v${(sourceImage.version || 1) + 1}`
                : `${sourceImage.title || 'Image'} v2`),
            baseName: result.base_name || sourceImage.baseName || sourceImage.title,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            modelVersion: result.modelVersion || result.model_version,
            annotations: [], // Clean slate - no inherited annotations
            maskSrc: undefined,
            // Keep canvas dimensions consistent with the row height to prevent "huge" images
            // while storing the actual high-res pixels in realWidth/Height
            width: logicalWidth,
            height: logicalHeight,
            realWidth: genWidth,
            realHeight: genHeight,
            parentId: result.parent_id || (sourceImage.id !== newId ? sourceImage.id : sourceImage.parentId)
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

        // PREFER STORED THUMBNAIL if available, otherwise use on-the-fly transformation
        let thumbSignedUrl: string | undefined;

        if (record.thumb_storage_path) {
            // Use stored thumbnail (faster, no pixelation!)
            thumbSignedUrl = preSignedUrls[record.thumb_storage_path];
            if (!thumbSignedUrl) {
                thumbSignedUrl = await storageService.getSignedUrl(record.thumb_storage_path);
            }
        } else {
            // Fallback to on-the-fly 600px transformation
            const thumbOptionsKey = `_600xundefined_q75`;
            thumbSignedUrl = preSignedUrls[record.storage_path + thumbOptionsKey];

            if (!thumbSignedUrl && record.storage_path) {
                thumbSignedUrl = await storageService.getSignedUrl(record.storage_path, { width: 600, quality: 75 });
            }
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
            thumbSrc: thumbSignedUrl || signedUrl || undefined,
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
    async loadUserImages(userId: string, limit = 50, offset = 0): Promise<ImageRow[]> {
        console.log(`[DEBUG] loadUserImages for userId=${userId}`);
        console.log('Deep Sync: Loading user history (Priority: Newest First)...');

        // 1. Get Completed Images & Active Jobs in parallel
        const imgsQuery = supabase
            .from('images')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const jobsQuery = supabase
            .from('generation_jobs')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'processing');

        const [imgsRes, jobsRes] = await Promise.all([
            imgsQuery,
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
            const signStart = performance.now();
            // Collect ALL paths that need signing
            const allPathsToSign = new Set<string>();
            dbImages.forEach(rec => {
                if (rec.storage_path) {
                    allPathsToSign.add(rec.storage_path);

                    // Add stored thumbnail if available
                    if (rec.thumb_storage_path) {
                        allPathsToSign.add(rec.thumb_storage_path);
                    }
                }
                // Add reference images from annotations
                const rawAnns = rec.annotations ? (typeof rec.annotations === 'string' ? JSON.parse(rec.annotations) : rec.annotations) : [];
                rawAnns.forEach((ann: any) => {
                    if (ann.referenceImage && !ann.referenceImage.startsWith('data:') && !ann.referenceImage.startsWith('http')) {
                        allPathsToSign.add(ann.referenceImage);
                    }
                });
            });
            console.log(`[ImageService] Collected ${allPathsToSign.size} paths to sign`);


            // Batch sign 100 paths at a time - PARALLELIZED for speed
            const pathsArray = Array.from(allPathsToSign);
            const signedUrlMap: Record<string, string> = {};

            const chunks: string[][] = [];
            for (let i = 0; i < pathsArray.length; i += 100) {
                chunks.push(pathsArray.slice(i, i + 100));
            }

            console.log(`[ImageService] Signing ${chunks.length} chunks in parallel...`);

            // Execute all chunks in parallel
            await Promise.all(chunks.map(async (chunk, idx) => {
                const chunkStart = performance.now();
                const [hdResults, optResults] = await Promise.all([
                    // 1. Sign original HD versions
                    storageService.getSignedUrls(chunk),
                    // 2. Pre-sign 600px optimized versions for immediate canvas display
                    storageService.getSignedUrls(chunk, { width: 600, quality: 75 })
                ]);
                Object.assign(signedUrlMap, hdResults);
                Object.assign(signedUrlMap, optResults);
                console.log(`[ImageService] Chunk ${idx + 1}/${chunks.length} signed in ${(performance.now() - chunkStart).toFixed(2)}ms`);
            }));
            console.log(`[ImageService] All URLs signed in ${(performance.now() - signStart).toFixed(2)}ms`);


            // Transform records using the map
            const transformStart = performance.now();
            const transformed = await Promise.all(dbImages.map(rec => imageService.resolveImageRecord(rec, signedUrlMap)));
            loadedImages.push(...transformed);
            console.log(`[ImageService] Records transformed in ${(performance.now() - transformStart).toFixed(2)}ms`);
        }

        // 3. Reconstruct Skeleton Placeholders from Active Jobs
        const jobProcessingStart = performance.now();
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
                parentId: job.parent_id, // Map persistent lineage from DB
                generationPrompt: job.prompt,
                quality: job.model as any,
                createdAt: startTime,
                updatedAt: startTime,
                annotations: [],
                userId: userId
            };
            loadedImages.push(skeleton);
        });

        // 4. Group into Rows by Root Ancestry
        const rows: ImageRow[] = [];
        const imageMap = new Map<string, CanvasImage>(loadedImages.map(img => [img.id, img]));
        const groups = new Map<string, CanvasImage[]>();

        const getRootId = (img: CanvasImage): string => {
            let current = img;
            let depth = 0;
            // Trace back to the oldest parent available in the current set
            while (current.parentId && imageMap.has(current.parentId) && depth < 50) {
                current = imageMap.get(current.parentId)!;
                depth++;
            }
            // If the oldest visible one has a parentId, that missing parent is our "virtual" root.
            // This ensures all siblings of the same missing parent stay in the same row.
            return current.parentId || current.id;
        };

        loadedImages.forEach(img => {
            let groupId = getRootId(img);

            // FALLBACK: If the root is missing and not tracked by a missing parent ID,
            // use baseName to keep related images together.
            if (!imageMap.has(groupId) && img.baseName) {
                groupId = `baseName_${img.baseName}`;
            }

            if (!groups.has(groupId)) groups.set(groupId, []);
            groups.get(groupId)!.push(img);
        });

        groups.forEach((items, groupId) => {
            // Within a row, sort oldest to newest
            items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

            // Determine row title
            let rowTitle = 'untitled';
            let rowCreatedAt = items[0].createdAt;

            if (groupId.startsWith('baseName_')) {
                rowTitle = items[0].baseName || items[0].title || 'untitled';
            } else {
                const root = imageMap.get(groupId);
                if (root) {
                    rowTitle = root.baseName || root.title || 'untitled';
                    rowCreatedAt = root.createdAt;
                } else {
                    rowTitle = items[0].baseName || items[0].title || 'untitled';
                }
            }

            rows.push({
                id: groupId + '_row',
                title: rowTitle,
                items: items,
                createdAt: rowCreatedAt // Row date is the emergence of the root or oldest visible version
            });
        });

        // Sort rows by newest first (Apple Photos style: newest groups at the top)
        rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return rows;
    },

    /**
     * Loads a specific image by ID and its "family" (siblings/versions).
     * Used for deep-links to images that might not be in the initial feed page.
     */
    async loadImageById(imageId: string): Promise<ImageRow[]> {
        console.log(`[ImageService] loadImageById: ${imageId}`);

        // 1. Fetch the target image record
        const { data: targetRec, error: targetError } = await supabase
            .from('images')
            .select('*')
            .eq('id', imageId)
            .single();

        if (targetError || !targetRec) {
            console.error(`[ImageService] Target image ${imageId} not found:`, targetError);
            return [];
        }

        // 2. Fetch the whole family (sharing the same base_name)
        // This ensures the row structure is preserved for navigation
        const { data: familyRecs, error: familyError } = await supabase
            .from('images')
            .select('*')
            .eq('user_id', targetRec.user_id)
            .eq('base_name', targetRec.base_name);

        if (familyError) {
            console.error(`[ImageService] Family fetch failed for ${targetRec.base_name}:`, familyError);
            return [];
        }

        const dbImages = familyRecs || [targetRec];

        // 3. Resolve and Group (Simplified reuse of logic from loadUserImages)
        const allPathsToSign = new Set<string>();
        dbImages.forEach(rec => {
            if (rec.storage_path) {
                allPathsToSign.add(rec.storage_path);
                if (rec.thumb_storage_path) allPathsToSign.add(rec.thumb_storage_path);
            }
            const rawAnns = rec.annotations ? (typeof rec.annotations === 'string' ? JSON.parse(rec.annotations) : rec.annotations) : [];
            rawAnns.forEach((ann: any) => {
                if (ann.referenceImage && !ann.referenceImage.startsWith('data:') && !ann.referenceImage.startsWith('http')) {
                    allPathsToSign.add(ann.referenceImage);
                }
            });
        });

        const signedUrlMap: Record<string, string> = {};
        const pathsArray = Array.from(allPathsToSign);
        const [hdResults, optResults] = await Promise.all([
            storageService.getSignedUrls(pathsArray),
            storageService.getSignedUrls(pathsArray, { width: 600, quality: 75 })
        ]);
        Object.assign(signedUrlMap, hdResults);
        Object.assign(signedUrlMap, optResults);

        const loadedImages = await Promise.all(dbImages.map(rec => imageService.resolveImageRecord(rec, signedUrlMap)));

        // Group into rows
        const rows: ImageRow[] = [];
        const imageMap = new Map<string, CanvasImage>(loadedImages.map(img => [img.id, img]));
        const groups = new Map<string, CanvasImage[]>();

        const getRootId = (img: CanvasImage): string => {
            let current = img;
            let depth = 0;
            while (current.parentId && imageMap.has(current.parentId) && depth < 50) {
                current = imageMap.get(current.parentId)!;
                depth++;
            }
            return current.parentId || current.id;
        };

        loadedImages.forEach(img => {
            let groupId = getRootId(img);
            if (!imageMap.has(groupId) && img.baseName) groupId = `baseName_${img.baseName}`;
            if (!groups.has(groupId)) groups.set(groupId, []);
            groups.get(groupId)!.push(img);
        });

        groups.forEach((items, groupId) => {
            items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            let rowTitle = items[0].baseName || items[0].title || 'untitled';
            let rowCreatedAt = items[0].createdAt;
            const root = imageMap.get(groupId);
            if (root) {
                rowTitle = root.baseName || root.title || 'untitled';
                rowCreatedAt = root.createdAt;
            }
            rows.push({ id: groupId + '_row', title: rowTitle, items, createdAt: rowCreatedAt });
        });

        return rows;
    },

    /**
     * Internal helper to prepare annotations for storage by:
     * 1. Uploading Base64 reference images to Storage
     * 2. Converting Signed URLs back to Storage Paths
     */
    async _processAnnotationsForStorage(annotations: any[], userId: string, userEmail?: string): Promise<any[]> {
        if (!annotations) return [];

        return await Promise.all(annotations.map(async (ann) => {
            if (ann.type === 'reference_image' && ann.referenceImage) {
                const src = ann.referenceImage;

                // 1. If it's a Base64 string, upload it
                if (src.startsWith('data:')) {
                    const fileName = `ref_${generateId().substring(0, 8)}.png`;
                    const storageIdentifier = userEmail || userId;
                    const result = await storageService.uploadImage(src, storageIdentifier, fileName, 'user-settings/references');
                    if (result) {
                        return { ...ann, referenceImage: result.path };
                    }
                }

                // 2. If it's a Signed URL, strip it back to a storage path
                // Supabase signed URLs contain /storage/v1/object/sign/
                if (src.includes('/storage/v1/object/sign/')) {
                    // The path is usually between /public-bucket/ and the query params
                    // But we can just use the storage_path if we had stored it.
                    // Since we don't have it directly, we have to extract it or 
                    // ideally we already stored the relative path in the object.

                    // Actually, if it's already a Signed URL, it means it was LOADED.
                    // When it was loaded, we should have kept the path.
                    // For now, let's look for known markers to extract the path.
                    try {
                        const url = new URL(src);
                        const pathParts = url.pathname.split('/user-content/');
                        if (pathParts.length > 1) {
                            // Extract path and remove any trailing version info if present
                            const rawPath = pathParts[1].split('?')[0];
                            return { ...ann, referenceImage: decodeURIComponent(rawPath) };
                        }
                    } catch (e) {
                        console.warn("Failed to extract path from signed URL:", e);
                    }
                }
            }
            return ann;
        }));
    }
};
