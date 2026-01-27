/**
 * Generates a cost-optimized thumbnail from an image source (Base64 or URL).
 * Uses 600px max dimension and 0.6 JPEG quality for ~50% smaller file size.
 * @param src The source image (Data URL or static URL)
 * @param maxDim Maximum dimension (width or height) for the thumbnail
 * @returns A promise resolving to a Blob of the thumbnail
 */
export async function generateThumbnail(src: string, maxDim: number = 600): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // Handle remote URLs if necessary
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width;
            let h = img.height;

            if (w > maxDim || h > maxDim) {
                const ratio = w / h;
                if (w > h) {
                    w = maxDim;
                    h = maxDim / ratio;
                } else {
                    h = maxDim;
                    w = maxDim * ratio;
                }
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Failed to get canvas context"));
                return;
            }

            // Use better image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, w, h);

            // Export with higher compression (0.6) to save storage costs
            // Still looks good for thumbnails, but ~50% smaller file size
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Failed to create blob from canvas"));
            }, 'image/jpeg', 0.6);
        };
        img.onerror = () => reject(new Error("Failed to load image for thumbnail generation"));
        img.src = src;
    });
}

/**
 * Compresses and resizes an image for storage optimization.
 * Preserves original format (JPEG/PNG/WebP) from data URL.
 * @param src The source image (Data URL or URL)
 * @param maxDim Maximum dimension for 4K (4096)
 * @param quality JPEG quality (0.85 is a good balance)
 */
export async function compressImage(src: string, maxDim: number = 4096, quality: number = 0.85): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width;
            let h = img.height;

            if (w > maxDim || h > maxDim) {
                const ratio = w / h;
                if (w > h) {
                    w = maxDim;
                    h = maxDim / ratio;
                } else {
                    h = maxDim;
                    w = maxDim * ratio;
                }
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Failed to get canvas context"));
                return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);

            // Detect original format from data URL
            let mimeType = 'image/jpeg'; // Default to JPEG
            let compressionQuality = quality;

            if (src.startsWith('data:')) {
                const match = src.match(/^data:(image\/[a-z]+);/);
                if (match) {
                    mimeType = match[1];
                }
            }

            // PNG doesn't support quality parameter, use 1.0
            if (mimeType === 'image/png') {
                compressionQuality = 1.0;
            }

            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Failed to create blob from canvas"));
            }, mimeType, compressionQuality);
        };
        img.onerror = () => reject(new Error("Failed to load image for compression"));
        img.src = src;
    });
}


/**
 * Robustly downloads an image by fetching it as a blob.
 * This ensures the 'download' attribute works even for cross-origin URLs.
 */
export async function downloadImage(src: string, filename: string): Promise<void> {
    if (!src) return;

    // Clean filename and ensure extension
    let finalFilename = filename.trim();
    const hasExtension = /\.(jpg|jpeg|png|webp)$/i.test(finalFilename);

    if (!hasExtension) {
        const urlExt = src.match(/\.(jpg|jpeg|png|webp)/i)?.[1];
        finalFilename = `${finalFilename}.${urlExt || 'jpg'}`;
    }

    // For Supabase signed URLs, add download parameter to force download
    const isSupabaseUrl = src.includes('supabase.co/storage');

    if (isSupabaseUrl) {
        // Add download parameter to Supabase URL to force download instead of display
        const url = new URL(src);
        url.searchParams.set('download', finalFilename);

        const link = document.body.appendChild(document.createElement('a'));
        link.style.display = 'none';
        link.href = url.toString();
        link.click();

        setTimeout(() => link.remove(), 200);
        return;
    }

    // For data URLs, convert to blob for proper download
    if (src.startsWith('data:')) {
        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.body.appendChild(document.createElement('a'));
            link.style.display = 'none';
            link.href = url;
            link.download = finalFilename;
            link.click();

            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                link.remove();
            }, 200);
            return;
        } catch (err) {
            console.error('Data URL download failed:', err);
        }
    }

    // For other URLs (cross-origin), fetch as blob
    try {
        const response = await fetch(src, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.body.appendChild(document.createElement('a'));
        link.style.display = 'none';
        link.href = url;
        link.download = finalFilename;
        link.click();

        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            link.remove();
        }, 200);

    } catch (error) {
        console.error('Download failed:', error);

        // Final fallback
        const link = document.body.appendChild(document.createElement('a'));
        link.style.display = 'none';
        link.href = src;
        link.download = finalFilename;
        link.target = "_blank";
        link.click();

        setTimeout(() => link.remove(), 200);
    }
}
