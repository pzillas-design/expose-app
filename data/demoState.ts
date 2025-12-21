
import { ImageRow, CanvasImage } from '../types';
import { generateId } from '../utils/ids';

const demoImages = [
    { url: 'https://images.unsplash.com/photo-1600585154340-be6199fbfd0b?auto=format&fit=crop&w=800&q=80', title: 'Modern Villa', w: 800, h: 533 },
    { url: 'https://images.unsplash.com/photo-1600585154526-990dcea4db0d?auto=format&fit=crop&w=800&q=80', title: 'Modern Villa (Alt)', w: 800, h: 533 },
    { url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80', title: 'Modern Villa (Detail)', w: 800, h: 533 },
    { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', title: 'Penthouse View', w: 800, h: 533 },
    { url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80', title: 'Penthouse (Night)', w: 800, h: 533 },
    { url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80', title: 'Kitchen Design', w: 800, h: 533 },
    { url: 'https://images.unsplash.com/photo-1600566753190-17f0bb2a6c3e?auto=format&fit=crop&w=800&q=80', title: 'Kitchen (Warm)', w: 800, h: 533 },
    { url: 'https://images.unsplash.com/photo-1556911227-4c177e17478d?auto=format&fit=crop&w=800&q=80', title: 'Kitchen (Minimal)', w: 800, h: 533 }
];

const createOriginal = (demoIndex: number): CanvasImage => {
    const demo = demoImages[demoIndex];
    return {
        id: generateId(),
        src: demo.url,
        originalSrc: demo.url,
        width: demo.w / 2,
        height: demo.h / 2,
        title: demo.title,
        baseName: demo.title,
        version: 1,
        isGenerating: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
};

const createVariation = (parentId: string, demoIndex: number, version: number, prompt: string): CanvasImage => {
    const demo = demoImages[demoIndex];
    return {
        id: generateId(),
        parentId,
        src: demo.url,
        originalSrc: demoImages.find(d => d.title === demo.title.split(' (')[0])?.url || demo.url,
        width: demo.w / 2,
        height: demo.h / 2,
        title: `${demo.title.split(' (')[0]} v${version}`,
        baseName: demo.title.split(' (')[0],
        version,
        isGenerating: false,
        generationPrompt: prompt,
        createdAt: Date.now() + (version * 1000),
        updatedAt: Date.now() + (version * 1000)
    };
};

export const getDemoRows = (): ImageRow[] => {
    // Row 1: Exterior
    const orig1 = createOriginal(0);
    const var1_1 = createVariation(orig1.id, 1, 2, 'Change time to sunset');
    const var1_2 = createVariation(orig1.id, 2, 3, 'Make the garden more lush');

    // Row 2: Penthouse
    const orig2 = createOriginal(3);
    const var2_1 = createVariation(orig2.id, 4, 2, 'Convert to night shot');
    const var2_2 = createVariation(orig2.id, 4, 3, 'Add more city lights');

    // Row 3: Kitchen
    const orig3 = createOriginal(5);
    const var3_1 = createVariation(orig3.id, 6, 2, 'Warmer lighting');
    const var3_2 = createVariation(orig3.id, 7, 3, 'Minimalist style change');
    const var3_3 = createVariation(orig3.id, 7, 4, 'Change countertop material');

    return [
        {
            id: generateId(),
            title: 'Modern Villa Project',
            items: [orig1, var1_1, var1_2],
            createdAt: Date.now()
        },
        {
            id: generateId(),
            title: 'Penthouse Staging',
            items: [orig2, var2_1, var2_2],
            createdAt: Date.now()
        },
        {
            id: generateId(),
            title: 'Kitchen Renovation',
            items: [orig3, var3_1, var3_2, var3_3],
            createdAt: Date.now()
        }
    ];
};
