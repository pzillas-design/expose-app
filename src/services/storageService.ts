import { supabase } from './supabaseClient';

export const storageService = {
    /**
     * Uploads a base64 image or Blob to Supabase Storage
     * @param imageSrc Base64 string or BlobUrl (we will fetch it to get the blob)
     * @param userId User ID
     * @returns The storage path (e.g. 'user_123/img_456.png')
     */
    async uploadImage(imageSrc: string, userId: string, customFileName?: string): Promise<string | null> {
        try {
            // 1. Convert Base64/URL to Blob
            const response = await fetch(imageSrc);
            const blob = await response.blob();

            // 2. Generate Path
            const fileName = customFileName || `${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
            const filePath = `${userId}/${fileName}`;

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
     * Get a temporary public URL for a private image
     */
    async getSignedUrl(path: string): Promise<string | null> {
        if (!path) return null;

        // PERFORMANCE HACK: If it's a thumbnail, use the public URL directly
        // This avoids the 'Signed URL Waterfall' that slows down the projects page.
        if (path.includes('thumb_')) {
            return this.getPublicUrl(path);
        }

        // Init cache if empty
        if (this._urlCache.size === 0) {
            this._getPersistentCache();
        }

        // Check cache (valid for 1 hour locally, even though signed for 7 days)
        const cached = this._urlCache.get(path);
        if (cached && cached.expires > Date.now()) {
            return cached.url;
        }

        try {
            const { data, error } = await supabase.storage
                .from('user-content')
                .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

            if (error) throw error;

            if (data?.signedUrl) {
                this._urlCache.set(path, {
                    url: data.signedUrl,
                    expires: Date.now() + 1000 * 60 * 60 // Cache locally for 1 hour
                });
                this._savePersistentCache();
            }

            return data.signedUrl;
        } catch (error) {
            console.error('Get Signed URL Failed:', error);
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
