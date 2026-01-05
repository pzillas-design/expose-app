
import { LibraryCategory } from '../types';

export const LIBRARY_CATEGORIES: LibraryCategory[] = [
    // --- DEUTSCH ---
    {
        id: 'basics',
        label: 'Basics',
        icon: '',
        lang: 'de',
        items: [
            { id: 'basics_table', label: 'Tisch', icon: '🍽️' },
            { id: 'basics_mirror', label: 'Spiegel', icon: '🪞' },
            { id: 'basics_lamp', label: 'Lampe', icon: '💡' },
            { id: 'basics_chair', label: 'Stuhl', icon: '🪑' },
            { id: 'basics_armchair', label: 'Sessel', icon: '🪑' },
            { id: 'basics_sofa', label: 'Sofa', icon: '🛋️' },
            { id: 'basics_rug', label: 'Teppich', icon: '🧶' },
            { id: 'basics_plant', label: 'Pflanze', icon: '🪴' },
            { id: 'basics_art', label: 'Wandbild', icon: '🖼️' },
            { id: 'basics_kitchen', label: 'Küche', icon: '🍳' },
            { id: 'basics_tv', label: 'TV-Schrank', icon: '📺' },
            { id: 'basics_shelf', label: 'Regal', icon: '📚' },
        ]
    },

    // --- ENGLISH ---
    {
        id: 'basics',
        label: 'Basics',
        icon: '',
        lang: 'en',
        items: [
            { id: 'basics_table', label: 'Table', icon: '🍽️' },
            { id: 'basics_mirror', label: 'Mirror', icon: '🪞' },
            { id: 'basics_lamp', label: 'Lamp', icon: '💡' },
            { id: 'basics_chair', label: 'Chair', icon: '🪑' },
            { id: 'basics_armchair', label: 'Armchair', icon: '🪑' },
            { id: 'basics_sofa', label: 'Sofa', icon: '🛋️' },
            { id: 'basics_rug', label: 'Rug', icon: '🧶' },
            { id: 'basics_plant', label: 'Plant', icon: '🪴' },
            { id: 'basics_art', label: 'Wall Art', icon: '🖼️' },
            { id: 'basics_kitchen', label: 'Kitchen', icon: '🍳' },
            { id: 'basics_tv', label: 'TV Stand', icon: '📺' },
            { id: 'basics_shelf', label: 'Shelf', icon: '📚' },
        ]
    }
];
