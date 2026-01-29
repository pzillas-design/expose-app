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
    // Draw in order: shapes first, then paths, then stamps (so text is always on top)

    // First: Draw shapes
    for (const ann of annotations) {
        if (ann.type === 'shape' && ann.points && ann.points.length > 0) {
            ctx.strokeStyle = ann.color || '#ffffff';
            ctx.lineWidth = ann.strokeWidth || 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (ann.shapeType === 'rect' && ann.points.length >= 2) {
                // Draw rectangle
                const minX = Math.min(...ann.points.map(p => p.x));
                const minY = Math.min(...ann.points.map(p => p.y));
                const maxX = Math.max(...ann.points.map(p => p.x));
                const maxY = Math.max(...ann.points.map(p => p.y));
                ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
            } else if (ann.shapeType === 'circle' && ann.points.length >= 2) {
                // Draw circle
                const centerX = (ann.points[0].x + ann.points[1].x) / 2;
                const centerY = (ann.points[0].y + ann.points[1].y) / 2;
                const radius = Math.sqrt(
                    Math.pow(ann.points[1].x - ann.points[0].x, 2) +
                    Math.pow(ann.points[1].y - ann.points[0].y, 2)
                ) / 2;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                ctx.stroke();
            } else {
                // Draw polygon
                ctx.beginPath();
                ctx.moveTo(ann.points[0].x, ann.points[0].y);
                for (let i = 1; i < ann.points.length; i++) {
                    ctx.lineTo(ann.points[i].x, ann.points[i].y);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }
    }

    // Second: Draw paths (brush strokes)
    for (const ann of annotations) {
        if (ann.type === 'mask_path' && ann.points && ann.points.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = ann.color || '#ffffff';
            ctx.lineWidth = ann.strokeWidth || 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(ann.points[0].x, ann.points[0].y);
            for (let i = 1; i < ann.points.length; i++) {
                ctx.lineTo(ann.points[i].x, ann.points[i].y);
            }
            ctx.stroke();
        }
    }

    // Third: Draw stamps and their text labels (on top)
    for (const ann of annotations) {
        if (ann.type === 'stamp' && ann.x !== undefined && ann.y !== undefined) {
            // Draw Emoji if exists
            if (ann.emoji) {
                ctx.font = `${ann.width || 48}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ann.emoji, ann.x, ann.y);
            }

            // Draw text label with high contrast (white text with black outline)
            if (ann.text) {
                const fontSize = 24;
                const textY = ann.y + (ann.emoji ? 30 : 0); // Position below emoji if present

                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Black outline for contrast
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 4;
                ctx.strokeText(ann.text, ann.x, textY);

                // White fill
                ctx.fillStyle = '#ffffff';
                ctx.fillText(ann.text, ann.x, textY);
            }
        }

        // Also draw text labels for shapes
        if (ann.type === 'shape' && ann.text && ann.points && ann.points.length > 0) {
            // Calculate center of shape
            const centerX = ann.points.reduce((sum, p) => sum + p.x, 0) / ann.points.length;
            const centerY = ann.points.reduce((sum, p) => sum + p.y, 0) / ann.points.length;

            const fontSize = 24;
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Black outline for contrast
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.strokeText(ann.text, centerX, centerY);

            // White fill
            ctx.fillStyle = '#ffffff';
            ctx.fillText(ann.text, centerX, centerY);
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
