/**
 * Generates a low-res thumbnail from an image source (Base64 or URL).
 * @param src The source image (Data URL or static URL)
 * @param maxDim Maximum dimension (width or height) for the thumbnail
 * @returns A promise resolving to a Base64 string of the thumbnail
 */
export async function generateThumbnail(src: string, maxDim: number = 512): Promise<string> {
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

            // Export as medium quality JPEG to save storage/bandwidth
            const thumbSrc = canvas.toDataURL('image/jpeg', 0.7);
            resolve(thumbSrc);
        };
        img.onerror = () => reject(new Error("Failed to load image for thumbnail generation"));
        img.src = src;
    });
}
