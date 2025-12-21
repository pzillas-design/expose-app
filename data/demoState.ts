
import { ImageRow, CanvasImage } from '../types';
import { generateId } from '../utils/ids';

const demoImages = [
    { url: 'https://images.unsplash.com/photo-1600585154340-be6199fbfd0b?auto=format&fit=crop&w=800&q=80', title: 'Modern Villa', w: 800, h: 533 },
    { url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80', title: 'Luxury Living', w: 800, h: 533 },
    { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', title: 'Penthouse View', w: 800, h: 533 },
    { url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80', title: 'Minimalist Interior', w: 800, h: 1200 },
    { url: 'https://images.unsplash.com/photo-1600566753190-17f0bb2a6c3e?auto=format&fit=crop&w=800&q=80', title: 'Smart Home', w: 800, h: 533 },
    { url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80', title: 'Kitchen Design', w: 800, h: 533 },
    { url: 'https://images.unsplash.com/photo-1600572236304-483a936a51c7?auto=format&fit=crop&w=800&q=80', title: 'Pool Area', w: 800, h: 533 }
];

const createImg = (demoIndex: number, version: number = 1, parentId?: string): CanvasImage => {
    const demo = demoImages[demoIndex % demoImages.length];
    const id = generateId();
    return {
        id,
        parentId,
        src: demo.url,
        originalSrc: demo.url,
        width: demo.w / 2,
        height: demo.h / 2,
        title: version > 1 ? `${demo.title} v${version}` : demo.title,
        baseName: demo.title,
        version,
        isGenerating: false,
        generationPrompt: version > 1 ? 'Enhanced lighting and detail' : undefined,
        createdAt: Date.now() + (version * 1000),
        updatedAt: Date.now() + (version * 1000)
    };
};

export const getDemoRows = (): ImageRow[] => {
    // Row 1: Start with an empty row (or first image is "empty" in a row)
    // The user said "das erste bild is leer" - I will interpret this as a row that is empty 
    // or a row where we can test the "Add first image" UI.
    // However, to satisfy "3-5 pro zeile", I'll make 3 rows with content.

    return [
        {
            id: generateId(),
            title: 'Empty Projects (Testing)',
            items: [], // This will show the "Create first" UI
            createdAt: Date.now()
        },
        {
            id: generateId(),
            title: 'Modern Exteriors',
            items: [
                createImg(0),
                createImg(0, 2, 'img0'),
                createImg(4),
                createImg(6)
            ],
            createdAt: Date.now()
        },
        {
            id: generateId(),
            title: 'Luxury Interiors',
            items: [
                createImg(1),
                createImg(5),
                createImg(3),
                createImg(3, 2, 'img3'),
                createImg(2)
            ],
            createdAt: Date.now()
        }
    ];
};
