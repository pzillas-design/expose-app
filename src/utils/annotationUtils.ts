import { AnnotationObject } from '../types';

/**
 * Generates a composite "Annotation Image" from the original image and current annotations.
 * Following logic from generation_logic.md:
 * - Original Image at 40% (0.4) opacity.
 * - Annotations (paths, stamps, shapes) at 100% (1.0) opacity.
 */
export async function generateAnnotationImage(
    originalSrc: string,
    annotations: AnnotationObject[],
    dimensions: { width: number; height: number }
): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 1. Draw Original Image at 40% opacity
    try {
        const img = await loadImage(originalSrc);
        ctx.globalAlpha = 0.4;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
    } catch (err) {
        console.warn('AnnotationUtils: Failed to load original image', err);
        // Continue - the annotations are the priority
    }

    // 2. Draw Annotations at 100% opacity
    // We group them to draw paths first, then stamps/shapes
    for (const ann of annotations) {
        if (ann.type === 'mask_path' && ann.points && ann.points.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = ann.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(ann.points[0].x, ann.points[0].y);
            for (let i = 1; i < ann.points.length; i++) {
                ctx.lineTo(ann.points[i].x, ann.points[i].y);
            }
            ctx.stroke();
        } else if ((ann.type === 'stamp' || ann.type === 'shape') && ann.x !== undefined && ann.y !== undefined) {
            // Draw Emoji or Shape
            if (ann.emoji) {
                ctx.font = `${ann.width || 32}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ann.emoji, ann.x, ann.y);
            }

            // Draw text label if exists
            if (ann.text) {
                ctx.font = 'bold 20px sans-serif';
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 3;
                ctx.strokeText(ann.text, ann.x, ann.y + (ann.height || 0) / 2 + 20);
                ctx.fillText(ann.text, ann.x, ann.y + (ann.height || 0) / 2 + 20);
            }
        }
    }

    return canvas.toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}
