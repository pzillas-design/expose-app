import { PromptTemplate } from '../types';

// --- Assets Data ---
export interface StampVariant { label: string; icon: string; }
export interface StampItem { id: string; label: string; variants: StampVariant[]; }
export interface StampCategory { id: string; label: string; items: StampItem[]; }

export const CATEGORIES = ['Alle', 'Staging', 'Innen', 'Renovieren', 'Außen', 'Retuschieren', 'Wetter'];

export const STAMP_LIBRARY: StampCategory[] = [
    {
        id: 'living', label: 'Wohnzimmer', items: [
            { id: 'sofa', label: 'Sofa & Sitzmöbel', variants: [{ label: 'Wohnlandschaft (U-Form)', icon: '🛋' }, { label: 'Ecksofa (L-Form)', icon: '🛋' }, { label: '3-Sitzer Couch', icon: '🛋' }, { label: '2-Sitzer Couch', icon: '🛋' }, { label: 'Chesterfield Sofa', icon: '🛋' }, { label: 'Sessel', icon: '🪑' }, { label: 'Recamiere', icon: '🪑' }] },
            { id: 'table', label: 'Tische', variants: [{ label: 'Couchtisch (Rechteckig)', icon: '🪵' }, { label: 'Couchtisch (Rund)', icon: '🪵' }, { label: 'Couchtisch (Glas)', icon: '🧊' }, { label: 'Beistelltisch', icon: '🪵' }] },
            { id: 'tv', label: 'Media', variants: [{ label: 'TV-Lowboard', icon: '📺' }, { label: 'Wandfernseher', icon: '📺' }, { label: 'Leinwand', icon: '📽' }] },
            { id: 'storage', label: 'Stauraum', variants: [{ label: 'Regalwand', icon: '📚' }, { label: 'Sideboard', icon: '🗄' }, { label: 'Bücherregal', icon: '📚' }, { label: 'Wandregal', icon: '➖' }] },
            { id: 'fireplace', label: 'Kamin', variants: [{ label: 'Kamin (Modern)', icon: '🔥' }, { label: 'Kaminofen', icon: '🔥' }, { label: 'Offener Kamin', icon: '🔥' }] }
        ]
    },
    {
        id: 'kitchen', label: 'Küche & Essen', items: [
            { id: 'island', label: 'Kochinsel', variants: [{ label: 'Kochinsel mit Bar', icon: '🥘' }, { label: 'Freistehende Kochinsel', icon: '🥘' }, { label: 'Küchenblock', icon: '🥘' }] },
            { id: 'dining', label: 'Esstisch', variants: [{ label: 'Esstisch (Rechteckig)', icon: '🍽' }, { label: 'Esstisch (Rund)', icon: '🍽' }, { label: 'Esstisch (Oval)', icon: '🍽' }, { label: 'Esstisch (Massivholz)', icon: '🍽' }] },
            { id: 'chairs', label: 'Stühle', variants: [{ label: 'Esszimmerstuhl', icon: '🪑' }, { label: 'Sitzbank', icon: '🪑' }, { label: 'Barhocker', icon: '🪑' }] },
            { id: 'kitchen_unit', label: 'Küchenzeile', variants: [{ label: 'Küchenzeile (L-Form)', icon: '🧊' }, { label: 'Küchenzeile (Gerade)', icon: '🧊' }, { label: 'Hochschrank', icon: '❄️' }] }
        ]
    },
    {
        id: 'bedroom', label: 'Schlafzimmer', items: [
            { id: 'bed', label: 'Bett', variants: [{ label: 'Doppelbett', icon: '🛏' }, { label: 'Boxspringbett', icon: '🛏' }, { label: 'Einzelbett', icon: '🛏' }, { label: 'Hochbett', icon: '🪜' }, { label: 'Himmelbett', icon: '⛺️' }] },
            { id: 'wardrobe', label: 'Schrank', variants: [{ label: 'Kleiderschrank', icon: '🚪' }, { label: 'Einbauschrank', icon: '🚪' }, { label: 'Kommode', icon: '📦' }] },
            { id: 'night', label: 'Nacht', variants: [{ label: 'Nachttisch', icon: '📦' }, { label: 'Schminktisch', icon: '💄' }] }
        ]
    },
    {
        id: 'deco', label: 'Deko & Pflanzen', items: [
            { id: 'plants', label: 'Pflanzen', variants: [{ label: 'Große Monstera', icon: '🌿' }, { label: 'Hohe Palme', icon: '🌴' }, { label: 'Hängepflanze', icon: '🍃' }, { label: 'Kleine Sukkulente', icon: '🪴' }, { label: 'Blumenstrauß', icon: '💐' }] },
            { id: 'rug', label: 'Teppich', variants: [{ label: 'Teppich (Rechteckig)', icon: '🧶' }, { label: 'Teppich (Rund)', icon: '🧶' }, { label: 'Fellteppich', icon: '🧶' }, { label: 'Vintage Teppich', icon: '🧶' }] },
            { id: 'light_floor', label: 'Beleuchtung', variants: [{ label: 'Bogenlampe', icon: '💡' }, { label: 'Tripod Lampe', icon: '💡' }, { label: 'Deckenfluter', icon: '💡' }] },
            { id: 'light_ceil', label: 'Deckenleuchte', variants: [{ label: 'Pendelleuchte', icon: '🏮' }, { label: 'Kronleuchter', icon: '💎' }, { label: 'Spots', icon: '🔦' }] }
        ]
    }
];

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
    { id: 'sys-1', title: 'Blauer Himmel', prompt: 'Make the sky clear blue and sunny', tags: ['Außen', 'Wetter'], isPinned: true, isCustom: false, usageCount: 100, lastUsed: Date.now() },
    { id: 'sys-2', title: 'Aufräumen', prompt: 'Remove all clutter, trash, and loose items from the scene', tags: ['Innen', 'Außen', 'Retuschieren'], isPinned: false, isCustom: false, usageCount: 80 },
    { id: 'sys-3', title: 'Sommer-Look', prompt: 'Change the season to summer, green grass, bright lighting', tags: ['Außen', 'Wetter', 'Staging'], isPinned: false, isCustom: false, usageCount: 50 },
    { id: 'sys-4', title: 'Mehr Tageslicht', prompt: 'Brighten the room with natural daylight streaming through windows', tags: ['Innen', 'Beleuchtung'], isPinned: true, isCustom: false, usageCount: 60 },
    { id: 'sys-5', title: 'Modern Staging', prompt: 'Stage the room with modern, minimalist furniture', tags: ['Innen', 'Staging'], isPinned: false, isCustom: false, usageCount: 40 },
];
