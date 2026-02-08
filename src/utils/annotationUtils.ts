import { AnnotationObject } from '../types';

/**
 * Generates a composite "Annotation Image" from the original image and current annotations.
 * Following logic from generation_logic.md:
 * - Original Image at 40% (0.4) opacity.
 * - Annotations (paths, stamps, shapes) at 100% (1.0) opacity.
 * 
 * CRITICAL: Annotations are placed on the canvas at canvas dimensions (e.g., 763x512),
 * but the annotation image is rendered at real dimensions (e.g., 5056x3392).
 * We must scale all coordinates accordingly!
 */
export async function generateAnnotationImage(
    originalSrc: string,
    annotations: AnnotationObject[],
    dimensions: { width: number; height: number },
    canvasDimensions: { width: number; height: number }
): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Calculate scaling factors from canvas dimensions to real dimensions
    const scaleX = dimensions.width / canvasDimensions.width;
    const scaleY = dimensions.height / canvasDimensions.height;

    console.log('[AnnotationUtils] Scaling coordinates:', {
        canvasDims: canvasDimensions,
        realDims: dimensions,
        scaleX,
        scaleY
    });

    // Helper function to scale a point
    const scalePoint = (p: { x: number; y: number }) => ({
        x: p.x * scaleX,
        y: p.y * scaleY
    });

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
    // ALL annotations are rendered in HIGH-VISIBILITY RED for maximum AI attention

    const ANNOTATION_COLOR = '#FF0000'; // Bright red for maximum visibility

    // First: Draw shapes
    for (const ann of annotations) {
        if (ann.type === 'shape' && ann.points && ann.points.length > 0) {
            ctx.strokeStyle = ANNOTATION_COLOR;
            ctx.lineWidth = ann.strokeWidth || 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (ann.shapeType === 'rect' && ann.points.length >= 2) {
                // Draw rectangle - scale coordinates
                const scaledPoints = ann.points.map(scalePoint);
                const minX = Math.min(...scaledPoints.map(p => p.x));
                const minY = Math.min(...scaledPoints.map(p => p.y));
                const maxX = Math.max(...scaledPoints.map(p => p.x));
                const maxY = Math.max(...scaledPoints.map(p => p.y));
                ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
            } else if (ann.shapeType === 'circle' && ann.points.length >= 2) {
                // Draw circle - scale coordinates
                const p0 = scalePoint(ann.points[0]);
                const p1 = scalePoint(ann.points[1]);
                const centerX = (p0.x + p1.x) / 2;
                const centerY = (p0.y + p1.y) / 2;
                const radius = Math.sqrt(
                    Math.pow(p1.x - p0.x, 2) +
                    Math.pow(p1.y - p0.y, 2)
                ) / 2;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                ctx.stroke();
            } else {
                // Draw polygon - scale coordinates
                const scaledPoints = ann.points.map(scalePoint);
                ctx.beginPath();
                ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
                for (let i = 1; i < scaledPoints.length; i++) {
                    ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }
    }

    // Second: Draw paths (brush strokes)
    for (const ann of annotations) {
        if (ann.type === 'mask_path' && ann.points && ann.points.length > 0) {
            // Scale path coordinates
            const scaledPoints = ann.points.map(scalePoint);
            ctx.beginPath();
            ctx.strokeStyle = ANNOTATION_COLOR;
            ctx.lineWidth = (ann.strokeWidth || 4) * scaleX; // Scale stroke width too
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
            for (let i = 1; i < scaledPoints.length; i++) {
                ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y);
            }
            ctx.stroke();
        }
    }

    // Third: Draw stamps and their text labels (on top)
    for (const ann of annotations) {
        if (ann.type === 'stamp' && ann.x !== undefined && ann.y !== undefined) {
            // Scale stamp position
            const scaledX = ann.x * scaleX;
            const scaledY = ann.y * scaleY;

            // Draw Emoji if exists
            if (ann.emoji) {
                ctx.font = `${(ann.width || 48) * scaleX}px serif`; // Scale emoji size
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ann.emoji, scaledX, scaledY);
            }

            // Draw text label with white text on red background
            if (ann.text) {
                const fontSize = 20 * scaleX; // Scale font size
                const textY = scaledY + (ann.emoji ? 30 * scaleY : 0); // Scale offset

                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Measure text for background
                const metrics = ctx.measureText(ann.text);
                const padding = 8 * scaleX; // Scale padding
                const bgWidth = metrics.width + padding * 2;
                const bgHeight = fontSize + padding * 2;

                // Draw red background
                ctx.fillStyle = ANNOTATION_COLOR;
                ctx.fillRect(
                    scaledX - bgWidth / 2,
                    textY - bgHeight / 2,
                    bgWidth,
                    bgHeight
                );

                // Draw white text
                ctx.fillStyle = '#ffffff';
                ctx.fillText(ann.text, scaledX, textY);
            }
        }

        // Also draw text labels for shapes
        if (ann.type === 'shape' && ann.text && ann.points && ann.points.length > 0) {
            // Calculate center of shape - scale coordinates
            const scaledPoints = ann.points.map(scalePoint);
            const centerX = scaledPoints.reduce((sum, p) => sum + p.x, 0) / scaledPoints.length;
            const centerY = scaledPoints.reduce((sum, p) => sum + p.y, 0) / scaledPoints.length;

            const fontSize = 20 * scaleX; // Scale font size
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Measure text for background
            const metrics = ctx.measureText(ann.text);
            const padding = 8 * scaleX; // Scale padding
            const bgWidth = metrics.width + padding * 2;
            const bgHeight = fontSize + padding * 2;

            // Draw red background
            ctx.fillStyle = ANNOTATION_COLOR;
            ctx.fillRect(
                centerX - bgWidth / 2,
                centerY - bgHeight / 2,
                bgWidth,
                bgHeight
            );

            // Draw white text
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
