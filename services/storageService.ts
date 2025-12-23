import { supabase } from './supabaseClient';

export const storageService = {
    /**
     * Uploads a base64 image or Blob to Supabase Storage
     * @param imageSrc Base64 string or BlobUrl (we will fetch it to get the blob)
     * @param userId User ID
     * @returns The storage path (e.g. 'user_123/img_456.png')
     */
    async uploadImage(imageSrc: string, userId: string): Promise<string | null> {
        try {
            // 1. Convert Base64/URL to Blob
            const response = await fetch(imageSrc);
            const blob = await response.blob();

            // 2. Generate Path
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
            const filePath = `${userId}/${fileName}`;

            // 3. Upload
            const { data, error } = await supabase.storage
                .from('user-content')
                .upload(filePath, blob, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;
            return data.path;
        } catch (error) {
            console.error('Storage Upload Failed:', error);
            return null;
        }
    },

    /**
     * Get a temporary public URL for a private image
     */
    async getSignedUrl(path: string): Promise<string | null> {
        try {
            const { data, error } = await supabase.storage
                .from('user-content')
                .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

            if (error) throw error;
            return data.signedUrl;
        } catch (error) {
            console.error('Get Signed URL Failed:', error);
            return null;
        }
    },

    async deleteImage(path: string) {
        const { error } = await supabase.storage
            .from('user-content')
            .remove([path]);
        if (error) console.error('Delete Storage Image Failed:', error);
    }
};
