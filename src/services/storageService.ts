import { supabase } from './supabaseClient';

export const storageService = {
    /**
     * Uploads a base64 image or Blob to Supabase Storage
     * @param imageSrc Base64 string or BlobUrl (we will fetch it to get the blob)
     * @param userId User ID
     * @returns The storage path (e.g. 'user_123/img_456.png')
     */
    async uploadImage(imageSrc: string, userId: string, customFileName?: string, subfolder?: string): Promise<string | null> {
        try {
            // 1. Optimize Image (Resize to 4K max & Compress)
            // Skip optimization for thumbnails (already small)
            let blob: Blob;
            if (customFileName?.startsWith('thumb_')) {
                const response = await fetch(imageSrc);
                blob = await response.blob();
            } else {
                const { compressImage } = await import('../utils/imageUtils');
                blob = await compressImage(imageSrc);
            }

            // 2. Generate Path
            const fileName = customFileName || `${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
            const folderPath = subfolder ? `${userId}/${subfolder}` : userId;
            const filePath = `${folderPath}/${fileName}`;

            // 3. Upload
            const { data, error } = await supabase.storage
                .from('user-content')
                .upload(filePath, blob, {
                    cacheControl: '3600',
                    upsert: true // Allow overwriting if filename is provided
                });

            if (error) {
                console.error('Supabase Storage Error:', error);
                throw error;
            }
            return data.path;
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
                        this._urlCache.set(key, parsed[key]);
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
            this._urlCache.forEach((val, key) => {
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

        // 0. Ensure cache is loaded
        if (this._urlCache.size === 0) {
            this._getPersistentCache();
        }

        const results: Record<string, string> = {};
        const toFetch: string[] = [];

        // Generate a cache key suffix based on options
        const optionsKey = options ? `_${options.width}x${options.height}_q${options.quality || 80}` : '';

        // 1. Check Cache
        paths.forEach(path => {
            const cacheKey = path + optionsKey;
            const cached = this._urlCache.get(cacheKey);
            if (cached && cached.expires > Date.now()) {
                results[cacheKey] = cached.url;
            } else if (path) {
                toFetch.push(path);
            }
        });

        if (toFetch.length === 0) return results;

        try {
            // 2. Fetch missing in one call
            console.log(`Storage: Batch signing ${toFetch.length} paths...`);
            const { data, error } = await supabase.storage
                .from('user-content')
                .createSignedUrls(toFetch, 60 * 60 * 24 * 7, {
                    transform: options ? {
                        width: options.width,
                        height: options.height,
                        quality: options.quality,
                        resize: options.resize
                    } : undefined
                } as any);

            if (error) throw error;

            if (data) {
                data.forEach((item: any) => {
                    if (item.signedUrl) {
                        const fullKey = (item.path || item.error === null && item.signedUrl ? toFetch[data.indexOf(item)] : item.path) + optionsKey;
                        // Supabase sometimes returns the path differently in the result, so we fallback to the input path index if needed
                        const resolvedPath = item.path || toFetch[data.indexOf(item)];
                        const finalKey = resolvedPath + optionsKey;

                        results[finalKey] = item.signedUrl;
                        this._urlCache.set(finalKey, {
                            url: item.signedUrl,
                            expires: Date.now() + 1000 * 60 * 60 // Cache locally for 1 hour
                        });
                    }
                });
                this._savePersistentCache();
            }

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

        // Generate a cache key suffix based on options
        const optionsKey = options ? `_${options.width}x${options.height}_q${options.quality || 80}` : '';

        // 1. Check Cache
        const cached = this._urlCache.get(path + optionsKey);
        if (cached && cached.expires > Date.now()) {
            return cached.url;
        }

        try {
            const { data, error } = await supabase.storage
                .from('user-content')
                .createSignedUrl(path, 60 * 60 * 24 * 7, {
                    transform: options ? {
                        width: options.width,
                        height: options.height,
                        quality: options.quality,
                        resize: options.resize
                    } : undefined
                } as any);

            if (error) throw error;

            if (data?.signedUrl) {
                this._urlCache.set(path + optionsKey, {
                    url: data.signedUrl,
                    expires: Date.now() + 1000 * 60 * 60
                });
                this._savePersistentCache();
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
