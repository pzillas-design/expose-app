import { CanvasImage, AnnotationObject } from '../types';

export const generateMaskFromAnnotations = async (img: CanvasImage, customBaseSrc?: string): Promise<string> => {
    if (!img.annotations || img.annotations.length === 0) return '';

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 1. Draw Original (background)
    const baseImg = new Image();
    baseImg.crossOrigin = "anonymous";
    baseImg.src = customBaseSrc || img.src;
    await new Promise(r => baseImg.onload = r);
    ctx.globalAlpha = 0.4; // "leicht gemutet" - 40% opacity
    ctx.drawImage(baseImg, 0, 0, img.width, img.height);
    ctx.globalAlpha = 1.0; // Reset for annotations

    // 2. Draw Paths
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    img.annotations.forEach(ann => {
        if (ann.type === 'mask_path' && ann.points.length > 0) {
            ctx.beginPath();
            ctx.lineWidth = ann.strokeWidth;
            ctx.moveTo(ann.points[0].x, ann.points[0].y);
            for (let i = 1; i < ann.points.length; i++) ctx.lineTo(ann.points[i].x, ann.points[i].y);
            ctx.stroke();
        }
    });


    // 2.5 Draw Shapes
    img.annotations.forEach(ann => {
        if (ann.type === 'shape') {
            const lw = Math.max(4, img.width * 0.005);
            ctx.lineWidth = lw;
            ctx.strokeStyle = '#ffffff';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';

            if (ann.shapeType === 'rect') {
                ctx.beginPath();
                ctx.rect(ann.x || 0, ann.y || 0, ann.width || 0, ann.height || 0);
                ctx.fill();
                ctx.stroke();
            } else if (ann.shapeType === 'circle') {
                const r = (ann.width || 0) / 2;
                const cx = (ann.x || 0) + r;
                const cy = (ann.y || 0) + (ann.height || ann.width || 0) / 2;
                ctx.beginPath();
                ctx.ellipse(cx, cy, Math.abs(r), Math.abs((ann.height || ann.width || 0) / 2), 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (ann.shapeType === 'line' && ann.points && ann.points.length >= 2) {
                ctx.beginPath();
                ctx.moveTo(ann.points[0].x, ann.points[0].y);
                ctx.lineTo(ann.points[1].x, ann.points[1].y);
                ctx.stroke();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(ann.points[0].x, ann.points[0].y, lw, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(ann.points[1].x, ann.points[1].y, lw, 0, Math.PI * 2); ctx.fill();
            }
        }
    });

    // 3. Draw Stamps (Circles removed as requested by user - AI now sees the text boxes directly)
    /* 
    img.annotations.forEach(ann => {
        if (ann.type === 'stamp' && ann.x !== undefined && ann.y !== undefined) {
            const radius = Math.max(50, img.width * 0.05);
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.arc(ann.x, ann.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    */

    // 4. Text (Instagram Story Style)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    img.annotations.forEach(ann => {
        // Skip reference images
        if (ann.type === 'reference_image') return;

        const text = ann.text;
        if (!text) return;
        let x = 0, y = 0;
        if (ann.type === 'stamp') { x = ann.x!; y = ann.y!; }
        else if (ann.type === 'shape') {
            if (ann.shapeType === 'line' && ann.points) {
                x = (ann.points[0].x + ann.points[1].x) / 2;
                y = (ann.points[0].y + ann.points[1].y) / 2;
            } else {
                x = (ann.x || 0) + (ann.width || 0) / 2;
                y = (ann.y || 0) + (ann.height || 0) / 2;
            }
        }
        else if (ann.type === 'mask_path') { x = ann.points[0].x; y = ann.points[0].y; }
        else return;

        // Font Settings (match UI)
        const fontSize = Math.max(16, img.width * 0.025);
        ctx.font = `bold ${fontSize}px sans-serif`;

        // Measure Text
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = fontSize * 1.2; // approx height

        // Padding
        const px = fontSize * 0.8;
        const py = fontSize * 0.4;

        const boxW = textWidth + (px * 2);
        const boxH = textHeight + (py * 2);
        const boxX = x - (boxW / 2);
        const boxY = y - (boxH / 2);
        const radius = 8 * (img.width / 1000); // Scale radius roughly

        // Draw Background Box (Rounded)
        ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
        ctx.beginPath();
        ctx.moveTo(boxX + radius, boxY);
        ctx.lineTo(boxX + boxW - radius, boxY);
        ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
        ctx.lineTo(boxX + boxW, boxY + boxH - radius);
        ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH);
        ctx.lineTo(boxX + radius, boxY + boxH);
        ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
        ctx.lineTo(boxX, boxY + radius);
        ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
        ctx.closePath();
        ctx.fill();

        // Draw Text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, x, y);
    });

    return canvas.toDataURL('image/png');
};
