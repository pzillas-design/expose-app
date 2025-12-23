import { CanvasImage, AnnotationObject } from '../types';

export const generateMaskFromAnnotations = async (img: CanvasImage): Promise<string> => {
    if (!img.annotations || img.annotations.length === 0) return '';

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 1. Draw Original (background)
    const baseImg = new Image();
    baseImg.src = img.src;
    await new Promise(r => baseImg.onload = r);
    ctx.drawImage(baseImg, 0, 0, img.width, img.height);

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

    // 3. Draw Stamps
    img.annotations.forEach(ann => {
        if (ann.type === 'stamp' && ann.x !== undefined && ann.y !== undefined) {
            const radius = Math.max(80, img.width * 0.08);
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.arc(ann.x, ann.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // 4. Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    img.annotations.forEach(ann => {
        const text = ann.text;
        if (!text) return;
        let x = 0, y = 0;
        if (ann.type === 'stamp') { x = ann.x!; y = ann.y!; }
        else if (ann.type === 'mask_path') { x = ann.points[0].x; y = ann.points[0].y; } // Approx center

        const fontSize = Math.max(24, img.width * 0.03);
        ctx.font = `900 ${fontSize}px monospace`;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = fontSize / 4;
        ctx.strokeText(text.toUpperCase(), x, y);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text.toUpperCase(), x, y);
    });

    return canvas.toDataURL('image/png');
};
