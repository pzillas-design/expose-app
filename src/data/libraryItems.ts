
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
    {
        id: 'living_room',
        label: 'Wohnen',
        icon: '',
        lang: 'de',
        items: [
            { id: 'living_landscape', label: 'Wohnlandschaft', icon: '🛋️' },
            { id: 'sofa_2seater', label: '2-Sitzer Sofa', icon: '🛋️' },
            { id: 'sitting_area', label: 'Sitzgruppe', icon: '🛋️' },
            { id: 'armchair', label: 'Sessel', icon: '🪑' },
            { id: 'coffee_table_set', label: 'Couchtisch-Set', icon: '🪵' },
            { id: 'media_wall', label: 'Medienwand', icon: '📺' },
            { id: 'sideboard', label: 'Sideboard', icon: '🗄️' },
            { id: 'bookshelf', label: 'Bücherregal', icon: '📚' },
            { id: 'reading_nook', label: 'Leseecke', icon: '📖' },
            { id: 'fireplace', label: 'Kaminbereich', icon: '🔥' },
        ]
    },
    {
        id: 'dining_kitchen',
        label: 'Essen & Küche',
        icon: '',
        lang: 'de',
        items: [
            { id: 'dining_area_large', label: 'Essbereich Groß', icon: '🍽️' },
            { id: 'dining_round', label: 'Esstisch Rund', icon: '🍽️' },
            { id: 'kitchen_island_set', label: 'Kücheninsel-Set', icon: '🔪' },
            { id: 'kitchenette', label: 'Küchenzeile', icon: '🍳' },
            { id: 'dining_chair', label: 'Stuhl', icon: '🪑' },
            { id: 'dining_nook', label: 'Frühstücksecke', icon: '☕' },
            { id: 'bar_setup', label: 'Bar-Bereich', icon: '🍸' },
            { id: 'pantry_shelf', label: 'Vorratsregal', icon: '🥫' },
        ]
    },
    {
        id: 'bedroom',
        label: 'Schlafen',
        icon: '',
        lang: 'de',
        items: [
            { id: 'bed_set_master', label: 'Doppelbett-Set', icon: '🛏️' },
            { id: 'single_bed_set', label: 'Einzelbett-Set', icon: '🛏️' },
            { id: 'wardrobe_system', label: 'Kleiderschrank', icon: '🚪' },
            { id: 'nightstand', label: 'Nachttisch', icon: '🌙' },
            { id: 'dresser', label: 'Kommode', icon: '🗄️' },
            { id: 'vanity_area', label: 'Schminktisch', icon: '🪞' },
            { id: 'bench_end', label: 'Bettbank', icon: '🪑' },
        ]
    },
    {
        id: 'bathroom',
        label: 'Bad',
        icon: '',
        lang: 'de',
        items: [
            { id: 'bathroom_vanity', label: 'Waschtisch', icon: '🚰' },
            { id: 'freestanding_tub', label: 'Freistehende Wanne', icon: '🛁' },
            { id: 'shower_cabin', label: 'Duschkabine', icon: '🚿' },
            { id: 'toilet_wall', label: 'WC-Anlage', icon: '🚽' },
            { id: 'towel_rack', label: 'Handtuchhalter', icon: '🧖' },
            { id: 'mirror_cabinet', label: 'Spiegelschrank', icon: '🪞' },
        ]
    },
    {
        id: 'work_office',
        label: 'Arbeiten',
        icon: '',
        lang: 'de',
        items: [
            { id: 'home_office_full', label: 'Büro Komplett', icon: '💻' },
            { id: 'desk_setup', label: 'Schreibtisch', icon: '🖥️' },
            { id: 'office_chair', label: 'Bürostuhl', icon: '🪑' },
            { id: 'meeting_corner', label: 'Besprechungsecke', icon: '🤝' },
            { id: 'shelving_wall', label: 'Aktenregal', icon: '📚' },
        ]
    },
    {
        id: 'lighting',
        label: 'Lampen',
        icon: '',
        lang: 'de',
        items: [
            { id: 'ceiling_lamp_group', label: 'Deckenleuchte', icon: '💡' },
            { id: 'chandelier', label: 'Kronleuchter', icon: '💎' },
            { id: 'lighting_floor', label: 'Stehlampe', icon: '🛋️' },
            { id: 'table_lamp', label: 'Tischlampe', icon: '🏮' },
            { id: 'wall_sconce', label: 'Wandleuchte', icon: '💡' },
            { id: 'pendant_lights', label: 'Pendelleuchten', icon: '💡' },
        ]
    },
    {
        id: 'plants',
        label: 'Pflanzen',
        icon: '',
        lang: 'de',
        items: [
            { id: 'plant_large', label: 'Große Zimmerpflanze', icon: '🪴' },
            { id: 'plant_group', label: 'Pflanzengruppe', icon: '🌿' },
            { id: 'hanging_plant', label: 'Hängepflanze', icon: '🍃' },
            { id: 'flower_vase', label: 'Blumenstrauß', icon: '💐' },
            { id: 'succulent_mix', label: 'Sukkulenten', icon: '🌵' },
            { id: 'olive_tree', label: 'Olivenbaum', icon: '🌳' },
        ]
    },
    {
        id: 'decoration',
        label: 'Deko',
        icon: '',
        lang: 'de',
        items: [
            { id: 'rug_large', label: 'Teppich Groß', icon: '🧶' },
            { id: 'wall_art_set', label: 'Wandbilder', icon: '🖼️' },
            { id: 'mirror_round', label: 'Wandspiegel Rund', icon: '🪞' },
            { id: 'curtains', label: 'Vorhänge', icon: '🪟' },
            { id: 'pillows_throw', label: 'Kissen & Decke', icon: '🛋️' },
            { id: 'books_decor', label: 'Deko-Bücher', icon: '📚' },
            { id: 'sculpture', label: 'Skulptur', icon: '🗿' },
        ]
    },
    {
        id: 'outdoor',
        label: 'Außenbereich',
        icon: '',
        lang: 'de',
        items: [
            { id: 'lounge_outdoor', label: 'Lounge-Ecke', icon: '☀️' },
            { id: 'dining_outdoor', label: 'Gartentisch-Set', icon: '🍽️' },
            { id: 'sun_loungers', label: 'Sonnenliegen', icon: '🏖️' },
            { id: 'parasol', label: 'Sonnenschirm', icon: '☂️' },
            { id: 'bbq_area', label: 'Grillbereich', icon: '🔥' },
            { id: 'firepit', label: 'Feuerschale', icon: '🔥' },
            { id: 'planters_outdoor', label: 'Pflanzkübel', icon: '🪴' },
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
    },
    {
        id: 'living_room',
        label: 'Living',
        icon: '',
        lang: 'en',
        items: [
            { id: 'living_landscape', label: 'Living Landscape', icon: '🛋️' },
            { id: 'sofa_2seater', label: '2-Seater Sofa', icon: '🛋️' },
            { id: 'sitting_area', label: 'Sitting Group', icon: '🛋️' },
            { id: 'armchair', label: 'Armchair', icon: '🪑' },
            { id: 'coffee_table_set', label: 'Coffee Table Set', icon: '🪵' },
            { id: 'media_wall', label: 'Media Wall', icon: '📺' },
            { id: 'sideboard', label: 'Sideboard', icon: '🗄️' },
            { id: 'bookshelf', label: 'Bookshelf', icon: '📚' },
            { id: 'reading_nook', label: 'Reading Nook', icon: '📖' },
            { id: 'fireplace', label: 'Fireplace Area', icon: '🔥' },
        ]
    },
    {
        id: 'dining_kitchen',
        label: 'Dining & Kitchen',
        icon: '',
        lang: 'en',
        items: [
            { id: 'dining_area_large', label: 'Dining Area Large', icon: '🍽️' },
            { id: 'dining_round', label: 'Round Dining Table', icon: '🍽️' },
            { id: 'kitchen_island_set', label: 'Kitchen Island Set', icon: '🔪' },
            { id: 'kitchenette', label: 'Kitchenette', icon: '🍳' },
            { id: 'dining_chair', label: 'Chair', icon: '🪑' },
            { id: 'dining_nook', label: 'Breakfast Nook', icon: '☕' },
            { id: 'bar_setup', label: 'Bar Area', icon: '🍸' },
            { id: 'pantry_shelf', label: 'Pantry Shelf', icon: '🥫' },
        ]
    },
    {
        id: 'bedroom',
        label: 'Bedroom',
        icon: '',
        lang: 'en',
        items: [
            { id: 'bed_set_master', label: 'Double Bed Set', icon: '🛏️' },
            { id: 'single_bed_set', label: 'Single Bed Set', icon: '🛏️' },
            { id: 'wardrobe_system', label: 'Wardrobe', icon: '🚪' },
            { id: 'nightstand', label: 'Nightstand', icon: '🌙' },
            { id: 'dresser', label: 'Dresser', icon: '🗄️' },
            { id: 'vanity_area', label: 'Vanity Table', icon: '🪞' },
            { id: 'bench_end', label: 'Bed Bench', icon: '🪑' },
        ]
    },
    {
        id: 'bathroom',
        label: 'Bathroom',
        icon: '',
        lang: 'en',
        items: [
            { id: 'bathroom_vanity', label: 'Vanity', icon: '🚰' },
            { id: 'freestanding_tub', label: 'Freestanding Tub', icon: '🛁' },
            { id: 'shower_cabin', label: 'Shower Cabin', icon: '🚿' },
            { id: 'toilet_wall', label: 'Toilet', icon: '🚽' },
            { id: 'towel_rack', label: 'Towel Rack', icon: '🧖' },
            { id: 'mirror_cabinet', label: 'Mirror Cabinet', icon: '🪞' },
        ]
    },
    {
        id: 'work_office',
        label: 'Work',
        icon: '',
        lang: 'en',
        items: [
            { id: 'home_office_full', label: 'Full Home Office', icon: '💻' },
            { id: 'desk_setup', label: 'Desk Setup', icon: '🖥️' },
            { id: 'office_chair', label: 'Office Chair', icon: '🪑' },
            { id: 'meeting_corner', label: 'Meeting Corner', icon: '🤝' },
            { id: 'shelving_wall', label: 'Shelving Wall', icon: '📚' },
        ]
    },
    {
        id: 'lighting',
        label: 'Lighting',
        icon: '',
        lang: 'en',
        items: [
            { id: 'ceiling_lamp_group', label: 'Ceiling Light', icon: '💡' },
            { id: 'chandelier', label: 'Chandelier', icon: '💎' },
            { id: 'lighting_floor', label: 'Floor Lamp', icon: '🛋️' },
            { id: 'table_lamp', label: 'Table Lamp', icon: '🏮' },
            { id: 'wall_sconce', label: 'Wall Sconce', icon: '💡' },
            { id: 'pendant_lights', label: 'Pendant Lights', icon: '💡' },
        ]
    },
    {
        id: 'plants',
        label: 'Plants',
        icon: '',
        lang: 'en',
        items: [
            { id: 'plant_large', label: 'Large Plant', icon: '🪴' },
            { id: 'plant_group', label: 'Plant Group', icon: '🌿' },
            { id: 'hanging_plant', label: 'Hanging Plant', icon: '🍃' },
            { id: 'flower_vase', label: 'Flower Vase', icon: '💐' },
            { id: 'succulent_mix', label: 'Succulents', icon: '🌵' },
            { id: 'olive_tree', label: 'Olive Tree', icon: '🌳' },
        ]
    },
    {
        id: 'decoration',
        label: 'Decor',
        icon: '',
        lang: 'en',
        items: [
            { id: 'rug_large', label: 'Large Rug', icon: '🧶' },
            { id: 'wall_art_set', label: 'Wall Art', icon: '🖼️' },
            { id: 'mirror_round', label: 'Round Mirror', icon: '🪞' },
            { id: 'curtains', label: 'Curtains', icon: '🪟' },
            { id: 'pillows_throw', label: 'Pillows & Throw', icon: '🛋️' },
            { id: 'books_decor', label: 'Coffee Table Books', icon: '📚' },
            { id: 'sculpture', label: 'Sculpture', icon: '🗿' },
        ]
    },
    {
        id: 'outdoor',
        label: 'Outdoor',
        icon: '',
        lang: 'en',
        items: [
            { id: 'lounge_outdoor', label: 'Lounge Area', icon: '☀️' },
            { id: 'dining_outdoor', label: 'Dining Set', icon: '🍽️' },
            { id: 'sun_loungers', label: 'Sun Loungers', icon: '🏖️' },
            { id: 'parasol', label: 'Parasol', icon: '☂️' },
            { id: 'bbq_area', label: 'BBQ Area', icon: '🔥' },
            { id: 'firepit', label: 'Firepit', icon: '🔥' },
            { id: 'planters_outdoor', label: 'Planters', icon: '🪴' },
        ]
    }
];
