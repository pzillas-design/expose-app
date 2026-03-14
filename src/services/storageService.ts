import { supabase } from './supabaseClient';
import { compressImage } from '../utils/imageUtils';

export const THUMB_OPTIONS = { width: 400, quality: 50, resize: 'contain' as const } as const;
export const THUMB_OPTIONS_KEY = `_w${THUMB_OPTIONS.width}h_q${THUMB_OPTIONS.quality}_contain`;

export const storageService = {
    /**
     * Uploads a base64 image or Blob to Supabase Storage
     * @param imageSrc Base64 string or BlobUrl (we will fetch it to get the blob)
     * @param userIdentifier User email (preferred) or user ID
     * @returns The storage path (e.g. 'user@email.com/board-name/img_456.png')
     */
    async uploadImage(imageSrc: string, userIdentifier: string, customFileName?: string, subfolder?: string): Promise<{ path: string; thumbPath?: string } | null> {
        try {
            // 1. Optimize Image (Resize to 4K max & Compress)
            // Skip optimization for thumbnails (already small)
            // Optimize: Max 4K (4096px) and 80% Quality (0.8)
            const blob = await compressImage(imageSrc, 4096, 0.8);

            // 2. Detect format from blob MIME type
            const mimeType = blob.type;
            let extension = '.png'; // Default fallback

            if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
                extension = '.jpg';
            } else if (mimeType === 'image/png') {
                extension = '.png';
            } else if (mimeType === 'image/webp') {
                extension = '.webp';
            }

            // 3. Generate Path with clean folder structure and correct extension
            let fileName: string;
            if (customFileName) {
                // If custom filename is provided, ensure it has the correct extension
                const nameWithoutExt = customFileName.replace(/\.(png|jpg|jpeg|webp)$/i, '');
                fileName = `${nameWithoutExt}${extension}`;
            } else {
                fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`;
            }

            const normalizedIdentifier = ((userIdentifier || '')
                .trim()
                .toLowerCase()
                .replace(/\//g, '_')) || 'unknown-user';

            const folderPath = subfolder ? `${normalizedIdentifier}/${subfolder}` : normalizedIdentifier;
            const filePath = `${folderPath}/${fileName}`;

            console.log(`[Storage] Uploading to: ${filePath} (${mimeType})`);

            // 4. Upload Main Image
            const { data, error } = await supabase.storage
                .from('user-content')
                .upload(filePath, blob, {
                    cacheControl: '3600',
                    upsert: true, // Allow overwriting if filename is provided
                    contentType: mimeType
                });

            if (error) {
                console.error('Supabase Storage Error:', error);
                throw error;
            }

            return { path: data.path };
        } catch (error: any) {
            console.error('Storage Upload Failed:', error.message || error, error);
            return null;
        }
    },

    // In-memory cache + Session Persistence to prevent flickering
    _urlCache: new Map<string, { url: string, expires: number }>(),

    _getPersistentCache() {
        try {
            const stored = sessionStorage.getItem('nano_url_cache');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Convert object back to Map
                Object.keys(parsed).forEach(key => {
                    if (parsed[key].expires > Date.now()) {
                        storageService._urlCache.set(key, parsed[key]);
                    }
                });
            }
        } catch (e) {
            console.warn('Storage: Failed to load persistent cache', e);
        }
    },

    _savePersistentCache() {
        try {
            const obj: any = {};
            storageService._urlCache.forEach((val, key) => {
                obj[key] = val;
            });
            sessionStorage.setItem('nano_url_cache', JSON.stringify(obj));
        } catch (e) {
            // Might fail if too large, ignore
        }
    },

    /**
     * Get multiple signed URLs at once (batching)
     * @param paths List of storage paths
     * @param options Transformation options
     * @returns A map of path -> signedUrl
     */
    async getSignedUrls(paths: string[], options?: { width?: number, height?: number, quality?: number, resize?: 'cover' | 'contain' | 'fill' }): Promise<Record<string, string>> {
        if (!paths || paths.length === 0) return {};

        const perfStart = performance.now();

        // 0. Ensure cache is loaded
        if (storageService._urlCache.size === 0) {
            storageService._getPersistentCache();
        }

        const results: Record<string, string> = {};
        const toFetch: string[] = [];

        // Generate a cache key suffix based on options (only include defined values)
        const optionsKey = options ? `_w${options.width || ''}h${options.height || ''}_q${options.quality || 80}` : '';

        // 1. Check Cache
        paths.forEach(path => {
            const cacheKey = path + optionsKey;
            const cached = storageService._urlCache.get(cacheKey);
            if (cached && cached.expires > Date.now()) {
                results[cacheKey] = cached.url;
            } else if (path) {
                toFetch.push(path);
            }
        });

        const cacheHits = paths.length - toFetch.length;
        console.log(`[StorageService] URL Cache: ${cacheHits}/${paths.length} hits (${((cacheHits / paths.length) * 100).toFixed(1)}%)`);

        if (toFetch.length === 0) {
            console.log(`[StorageService] All URLs from cache (${(performance.now() - perfStart).toFixed(2)}ms)`);
            return results;
        }

        try {
            // Ensure session is fresh before batch signing
            await supabase.auth.getSession();

            console.log(`Storage: Batch signing ${toFetch.length} paths...`);

            if (options) {
                // createSignedUrls (batch) does NOT support transform — use parallel singular calls
                const transform = Object.fromEntries(
                    Object.entries({
                        width: options.width,
                        height: options.height,
                        quality: options.quality,
                        resize: options.resize
                    }).filter(([, v]) => v !== undefined)
                );
                await Promise.all(toFetch.map(async (path) => {
                    const { data, error } = await supabase.storage
                        .from('user-content')
                        .createSignedUrl(path, 60 * 60 * 24 * 7, { transform } as any);
                    if (!error && data?.signedUrl) {
                        const key = path + optionsKey;
                        results[key] = data.signedUrl;
                        storageService._urlCache.set(key, { url: data.signedUrl, expires: Date.now() + 1000 * 60 * 60 * 24 * 7 });
                    }
                }));
            } else {
                // No transform — use fast batch endpoint
                const { data, error } = await supabase.storage
                    .from('user-content')
                    .createSignedUrls(toFetch, 60 * 60 * 24 * 7);

                if (error) throw error;

                if (data) {
                    data.forEach((item: any, idx: number) => {
                        if (item.signedUrl) {
                            const resolvedPath = item.path || toFetch[idx];
                            const key = resolvedPath + optionsKey;
                            results[key] = item.signedUrl;
                            storageService._urlCache.set(key, { url: item.signedUrl, expires: Date.now() + 1000 * 60 * 60 * 24 * 7 });
                        }
                    });
                }
            }

            storageService._savePersistentCache();
            console.log(`[StorageService] Batch signed ${toFetch.length} URLs in ${(performance.now() - perfStart).toFixed(2)}ms`);
            return results;
        } catch (error) {
            console.error('Batch Signed URLs Failed:', error);
            return results;
        }
    },

    /**
     * Get a temporary public URL for a private image
     */
    async getSignedUrl(path: string, options?: { width?: number, height?: number, quality?: number, resize?: 'cover' | 'contain' | 'fill' }): Promise<string | null> {
        if (!path) return null;

        // Generate a cache key suffix based on options (only include defined values)
        const optionsKey = options ? `_w${options.width || ''}h${options.height || ''}_q${options.quality || 80}` : '';

        // 1. Check Cache
        const cached = storageService._urlCache.get(path + optionsKey);
        if (cached && cached.expires > Date.now()) {
            return cached.url;
        }

        try {
            // Ensure session is fresh before signing
            await supabase.auth.getSession();

            // Build transform object only with defined fields (avoid 'undefined' strings in URLs)
            const transform = options ? Object.fromEntries(
                Object.entries({
                    width: options.width,
                    height: options.height,
                    quality: options.quality,
                    resize: options.resize
                }).filter(([, v]) => v !== undefined)
            ) : undefined;

            const { data, error } = await supabase.storage
                .from('user-content')
                .createSignedUrl(path, 60 * 60 * 24 * 7, {
                    transform
                } as any);

            if (error) throw error;

            if (data?.signedUrl) {
                storageService._urlCache.set(path + optionsKey, {
                    url: data.signedUrl,
                    expires: Date.now() + 1000 * 60 * 60 * 24 * 7 // Cache for 7 days (same as URL validity)
                });
                storageService._savePersistentCache();
                return data.signedUrl;
            }
            return null;
        } catch (error) {
            console.error('Error signing url:', path, error);
            return null;
        }
    },

    /**
     * Constructs a public URL for a file. 
     * Note: Requires the bucket or the path to be public in Supabase.
     */
    getPublicUrl(path: string): string {
        const { data } = supabase.storage
            .from('user-content')
            .getPublicUrl(path);
        return data.publicUrl;
    },

    async deleteImage(path: string) {
        const { error } = await supabase.storage
            .from('user-content')
            .remove([path]);
        if (error) console.error('Delete Storage Image Failed:', error);
    }
};
