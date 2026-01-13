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

/**
 * Compresses and resizes an image for storage optimization.
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

            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Failed to create blob from canvas"));
            }, 'image/jpeg', quality);
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

    // Helper to get extension from MIME type
    const getExt = (mime?: string) => {
        if (!mime) return 'jpg';
        if (mime.includes('png')) return 'png';
        if (mime.includes('webp')) return 'webp';
        return 'jpg'; // Default to jpg
    };

    try {
        // Try fetching the image as a blob
        const response = await fetch(src, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const blob = await response.blob();
        const detectedExt = getExt(blob.type);

        // Clean filename and ensure extension
        let finalFilename = filename.trim();
        const hasExtension = /\.(jpg|jpeg|png|webp)$/i.test(finalFilename);

        if (!hasExtension) {
            finalFilename = `${finalFilename}.${detectedExt}`;
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.body.appendChild(document.createElement('a'));
        link.style.display = 'none';
        link.href = url;
        link.download = finalFilename;
        link.click();

        // Cleanup
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            link.remove();
        }, 200);

    } catch (error) {
        console.error('Download failed via fetch/blob:', error);

        // Fallback: Use standard direct link with download attribute
        const link = document.body.appendChild(document.createElement('a'));
        link.style.display = 'none';
        link.href = src;

        // Simple extension fallback for direct link
        const finalFilename = /\.(jpg|jpeg|png|webp)$/i.test(filename)
            ? filename : `${filename}.jpg`;

        link.download = finalFilename;
        link.target = "_blank";
        link.click();

        setTimeout(() => link.remove(), 200);
    }
}
