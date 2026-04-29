import { AnnotationObject } from '../types';

const getRectPoints = (ann: AnnotationObject) => {
    if (ann.points && ann.points.length > 0) return ann.points;
    const x = ann.x || 0;
    const y = ann.y || 0;
    const width = ann.width || 0;
    const height = ann.height || 0;
    return [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height }
    ];
};

const getShapeLabelAnchor = (ann: AnnotationObject) => {
    if (ann.shapeType === 'line' && ann.points && ann.points.length >= 2) {
        return {
            x: (ann.points[0].x + ann.points[1].x) / 2,
            y: (ann.points[0].y + ann.points[1].y) / 2
        };
    }

    if (ann.shapeType === 'circle') {
        return {
            x: (ann.x || 0) + (ann.width || 0) / 2,
            y: (ann.y || 0) + (ann.height || 0) / 2
        };
    }

    const points = getRectPoints(ann);
    if (points.length === 0) return null;

    return {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length
    };
};

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
    // Cap the annotation canvas at 2048 px on the long edge. The annotation only
    // needs to convey *where* the markers are; full source-pixel resolution would
    // produce a 30–50 MB PNG/JPEG that fal rejects with HTTP 422 (>25 MB limit).
    // Strokes still scale via strokeScale so they read at the same relative size.
    const MAX_LONG_EDGE = 2048;
    const longSide = Math.max(dimensions.width, dimensions.height);
    const downscale = longSide > MAX_LONG_EDGE ? MAX_LONG_EDGE / longSide : 1;
    const targetW = Math.round(dimensions.width * downscale);
    const targetH = Math.round(dimensions.height * downscale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Calculate scaling factors from canvas dimensions to (capped) real dimensions
    const scaleX = targetW / canvasDimensions.width;
    const scaleY = targetH / canvasDimensions.height;
    const strokeScale = (scaleX + scaleY) / 2;

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
        if (ann.type === 'shape') {
            ctx.strokeStyle = ANNOTATION_COLOR;
            ctx.lineWidth = (ann.strokeWidth || 4) * strokeScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (ann.shapeType === 'rect') {
                const rectPoints = getRectPoints(ann);
                const scaledPoints = rectPoints.map(scalePoint);
                const minX = Math.min(...scaledPoints.map(p => p.x));
                const minY = Math.min(...scaledPoints.map(p => p.y));
                const maxX = Math.max(...scaledPoints.map(p => p.x));
                const maxY = Math.max(...scaledPoints.map(p => p.y));
                ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
            } else if (ann.shapeType === 'circle') {
                const centerX = ((ann.x || 0) + (ann.width || 0) / 2) * scaleX;
                const centerY = ((ann.y || 0) + (ann.height || 0) / 2) * scaleY;
                const radiusX = Math.abs((ann.width || 0) / 2) * scaleX;
                const radiusY = Math.abs((ann.height || 0) / 2) * scaleY;
                ctx.beginPath();
                ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (ann.shapeType === 'line' && ann.points && ann.points.length >= 2) {
                const scaledPoints = ann.points.map(scalePoint);
                ctx.beginPath();
                ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
                ctx.lineTo(scaledPoints[1].x, scaledPoints[1].y);
                ctx.stroke();
            } else if (ann.points && ann.points.length > 0) {
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
            ctx.lineWidth = (ann.strokeWidth || 4) * strokeScale;
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

            // Emojis are UI-only — never rendered into the annotation image.
            // Draw text label with white text on red background
            if (ann.text) {
                const fontSize = 20 * scaleX; // Scale font size
                const textY = scaledY; // always at stamp center when emoji suppressed

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
        if (ann.type === 'shape' && ann.text) {
            const labelAnchor = getShapeLabelAnchor(ann);
            if (!labelAnchor) continue;
            const center = scalePoint(labelAnchor);
            const centerX = center.x;
            const centerY = center.y;

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

    // JPEG @ 0.85 quality keeps the file well under fal's 25 MB ceiling even at
    // 2048 px long edge. PNG was lossless but ballooned to 30+ MB on real-estate
    // photos, tripping HTTP 422 on the openai/gpt-image-2/edit endpoint.
    return canvas.toDataURL('image/jpeg', 0.85);
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
