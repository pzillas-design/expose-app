
import { ImageRow, CanvasImage } from '../types';
import { generateId } from '../utils/ids';

const demoImages = [
    {
        url: 'https://images.unsplash.com/photo-1600585154340-be6199fbfd0b?auto=format&fit=crop&w=1200&q=80',
        title: 'Modern Villa',
        w: 1200,
        h: 800
    },
    {
        url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
        title: 'Luxury Living',
        w: 1200,
        h: 800
    },
    {
        url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        title: 'Penthouse View',
        w: 1200,
        h: 800
    },
    {
        url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
        title: 'Minimalist Interior',
        w: 1200,
        h: 1800
    }
];

export const getDemoRows = (): ImageRow[] => {
    const row1Id = generateId();
    const row2Id = generateId();
    const row3Id = generateId();

    const img1Id = generateId();
    const img2Id = generateId();
    const img3Id = generateId();
    const img4Id = generateId();

    const img1: CanvasImage = {
        id: img1Id,
        src: demoImages[0].url,
        originalSrc: demoImages[0].url,
        width: demoImages[0].w / 2,
        height: demoImages[0].h / 2,
        title: demoImages[0].title,
        baseName: demoImages[0].title,
        version: 1,
        isGenerating: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    const img1v2: CanvasImage = {
        id: generateId(),
        parentId: img1Id,
        src: demoImages[1].url,
        originalSrc: demoImages[0].url,
        width: demoImages[1].w / 2,
        height: demoImages[1].h / 2,
        title: demoImages[0].title + ' v2',
        baseName: demoImages[0].title,
        version: 2,
        isGenerating: false,
        generationPrompt: 'Add a sunset atmosphere and clean up the lawn',
        createdAt: Date.now() + 1000,
        updatedAt: Date.now() + 1000
    };

    const img3: CanvasImage = {
        id: img3Id,
        src: demoImages[2].url,
        originalSrc: demoImages[2].url,
        width: demoImages[2].w / 2,
        height: demoImages[2].h / 2,
        title: demoImages[2].title,
        baseName: demoImages[2].title,
        version: 1,
        isGenerating: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    const img4: CanvasImage = {
        id: img4Id,
        src: demoImages[3].url,
        originalSrc: demoImages[3].url,
        width: demoImages[3].w / 3,
        height: demoImages[3].h / 3,
        title: demoImages[3].title,
        baseName: demoImages[3].title,
        version: 1,
        isGenerating: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    return [
        {
            id: row1Id,
            title: 'Exteriors',
            items: [img1, img1v2],
            createdAt: Date.now()
        },
        {
            id: row2Id,
            title: 'Views',
            items: [img3],
            createdAt: Date.now()
        },
        {
            id: row3Id,
            title: 'Vertical Shots',
            items: [img4],
            createdAt: Date.now()
        }
    ];
};
