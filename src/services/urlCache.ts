/**
 * URL Cache Service
 * Caches signed URLs to avoid redundant signing requests
 * TTL: 1 hour (Supabase signed URLs are valid for 1 hour by default)
 */

interface CacheEntry {
    url: string;
    expiresAt: number;
}

class URLCache {
    private cache = new Map<string, CacheEntry>();
    private readonly TTL = 60 * 60 * 1000; // 1 hour in ms

    /**
     * Generate cache key from path and transform options
     */
    private getCacheKey(path: string, options?: { width?: number; height?: number; quality?: number }): string {
        if (!options) return path;
        const { width, height, quality } = options;
        return `${path}_${width || 'auto'}x${height || 'auto'}_q${quality || 100}`;
    }

    /**
     * Get cached URL if still valid
     */
    get(path: string, options?: { width?: number; height?: number; quality?: number }): string | null {
        const key = this.getCacheKey(path, options);
        const entry = this.cache.get(key);

        if (!entry) return null;

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.url;
    }

    /**
     * Store URL in cache
     */
    set(path: string, url: string, options?: { width?: number; height?: number; quality?: number }): void {
        const key = this.getCacheKey(path, options);
        this.cache.set(key, {
            url,
            expiresAt: Date.now() + this.TTL
        });
    }

    /**
     * Clear expired entries (called periodically)
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache stats for debugging
     */
    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

export const urlCache = new URLCache();

// Cleanup expired entries every 5 minutes
setInterval(() => urlCache.cleanup(), 5 * 60 * 1000);
