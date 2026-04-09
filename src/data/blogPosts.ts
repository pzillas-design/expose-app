export type ContentBlock =
    | { type: 'h2'; text: string }
    | { type: 'h3'; text: string }
    | { type: 'p'; text: string }
    | { type: 'ul'; items: string[] }
    | { type: 'ol'; items: string[] }
    | { type: 'tip'; label?: string; text: string }
    | { type: 'image'; src: string; alt?: string; caption?: string };

export interface BlogPostTranslation {
    title: string;
    excerpt: string;
    content: ContentBlock[];
}

export interface BlogPost {
    slug: string;
    category: string;
    date: string;
    readTime: number;
    coverGradient: string;
    coverImage?: string;
    featured?: boolean;
    en: BlogPostTranslation;
    de?: BlogPostTranslation;
}

/** Returns the best available translation — falls back to English. */
export function getTranslation(post: BlogPost, lang: string): BlogPostTranslation {
    if (lang === 'de' && post.de) return post.de;
    return post.en;
}

export const BLOG_POSTS: BlogPost[] = [
    {
        slug: 'real-estate-staging-ai',
        category: 'Tutorial',
        date: 'April 4, 2026',
        readTime: 6,
        coverGradient: 'from-amber-950 via-orange-950 to-stone-950',
        coverImage: '/home/1 creation reimagined/3.jpeg',
        featured: true,
        en: {
            title: 'How to Stage Real Estate Photos with AI',
            excerpt: "Empty rooms don't sell homes. Here's how to transform bare property photos into warm, fully staged spaces — in minutes, not days.",
            content: [
                {
                    type: 'p',
                    text: "Real estate agents know the problem well: a property is beautiful in person, but the listing photos show empty, sterile rooms that fail to communicate the potential of the space. Traditional virtual staging costs €100–400 per room and takes 2–3 business days. AI-powered staging changes that equation entirely.",
                },
                { type: 'h2', text: 'Why Staging Matters' },
                {
                    type: 'p',
                    text: 'Staged homes sell 73% faster and for 5–17% more than unstaged properties. Buyers struggle to visualize empty spaces — furniture, lighting, and décor do the cognitive work of helping them imagine living there.',
                },
                { type: 'h2', text: 'The Classic Approach vs. AI Staging' },
                {
                    type: 'ul',
                    items: [
                        'Traditional staging: €500–2000 per shoot, physical furniture rental, scheduling delays',
                        'Manual virtual staging (outsourced): €100–400/room, 2–3 day turnaround, limited revision rounds',
                        'AI staging with exposé: €0.10–0.40 per generation, results in under a minute, unlimited iterations',
                    ],
                },
                { type: 'h2', text: 'Step 1 — Upload Your Empty Room Photo' },
                {
                    type: 'p',
                    text: 'Start with a clean, well-lit photo of the empty room. Natural light works best — avoid strong shadows that will be hard to match with generated furniture. Shoot from a corner or doorway to capture as much of the room as possible.',
                },
                { type: 'image', src: '/home/1 creation reimagined/21.jpg', caption: 'A well-lit empty room — the ideal starting point for AI staging.' },
                { type: 'h2', text: 'Step 2 — Write a Specific Style Prompt' },
                {
                    type: 'p',
                    text: 'Be specific about the target buyer and style. "Modern Scandinavian living room, light oak furniture, linen sofa in off-white, warm pendant light, potted plants" will outperform a generic "add furniture" prompt every time.',
                },
                {
                    type: 'tip',
                    text: 'Match the staging style to the property type and likely buyer. A minimalist Bauhaus apartment calls for different furniture than a countryside farmhouse.',
                },
                { type: 'h2', text: 'Step 3 — Use Visual Prompting to Protect Existing Elements' },
                {
                    type: 'p',
                    text: "If the room has a beautiful parquet floor, a feature wall, or architectural details you want to preserve, use exposé's masking tools to paint over only the areas you want changed. This tells the AI: keep everything outside the mask, only stage the interior.",
                },
                { type: 'h2', text: 'Step 4 — Iterate Quickly' },
                {
                    type: 'p',
                    text: 'Generate 3–4 versions with slightly different style prompts — one contemporary, one classic, one warm-toned. Show all to your client and let them choose, or A/B test them in your listing.',
                },
                { type: 'image', src: '/home/1 creation reimagined/22.jpg', caption: 'Multiple style variants generated from the same base photo.' },
                { type: 'h2', text: "What Works and What Doesn't" },
                {
                    type: 'ul',
                    items: [
                        '✓ Living rooms, bedrooms, dining areas with clear floor plans',
                        '✓ Adding rugs, artwork, plants, curtains to partially furnished spaces',
                        '✓ Changing wall colors and lighting mood',
                        '✗ Very unusual room proportions or extreme wide-angle distortion',
                        '✗ Rooms dominated by complex reflective surfaces (mirrors, full-wall windows)',
                    ],
                },
                { type: 'h2', text: 'The Business Case' },
                {
                    type: 'p',
                    text: "Staging a 3-bedroom apartment (living room, 2 bedrooms) with 2–3 variants per room = approximately 6–9 images. At exposé credit pricing, that's under €5 in generation costs. The same job outsourced would cost €600–1200 and take a week.",
                },
                {
                    type: 'tip',
                    label: 'Business idea',
                    text: "Offer AI staging as an add-on service to your real estate clients. At €50–150 per property you're dramatically cheaper than traditional virtual staging while keeping most of the margin.",
                },
            ],
        },
    },
    {
        slug: 'visual-prompting-guide',
        category: 'Guide',
        date: 'March 28, 2026',
        readTime: 5,
        coverGradient: 'from-indigo-950 via-violet-950 to-slate-950',
        coverImage: '/home/1 creation reimagined/4.jpeg',
        en: {
            title: 'Visual Prompting: Why Drawing on Images Changes Everything',
            excerpt: "Text prompts alone have a fundamental limitation — they can't tell the AI exactly where to make changes. Visual prompting solves that.",
            content: [
                {
                    type: 'p',
                    text: 'Every prompt-based image tool shares the same blind spot: text is imprecise. You can write "change the sofa" but the AI has to guess which sofa, how much of the surrounding area to affect, and whether you want the floor or the wall behind it preserved. Visual prompting eliminates that guesswork by letting you draw directly on the image.',
                },
                { type: 'h2', text: 'What is Visual Prompting?' },
                {
                    type: 'p',
                    text: 'Visual prompting means using brushes, shapes, and annotations drawn on top of your source image to communicate intent. Instead of describing a location in words, you mark it. Instead of hoping the AI understands "the left window", you paint over it. The combination of your visual annotation and your text prompt gives the model far more information to work with.',
                },
                { type: 'image', src: '/home/1 creation reimagined/41.jpg', alt: 'Paint directly on the image to define exactly what should change.' },
                { type: 'h2', text: 'The Three Core Annotation Types' },
                { type: 'h3', text: '1. Freehand Mask' },
                {
                    type: 'p',
                    text: "Use the brush tool to paint over any area you want the AI to modify. Everything outside your painted region is treated as locked — the model will try to match lighting, texture, and perspective at the boundary. This is ideal for replacing furniture, changing wall paint, or swapping out a floor material.",
                },
                { type: 'h3', text: '2. Shape Masks' },
                {
                    type: 'p',
                    text: "Rectangle and ellipse masks are faster for regular areas — a window, a door, a rug. Draw the shape once, resize to fit, and you have a clean selection without any brush wobble.",
                },
                { type: 'h3', text: '3. Reference Stamps' },
                {
                    type: 'p',
                    text: "Reference stamps let you paste a reference image directly onto the canvas and position it where the AI should draw inspiration. Want to match the marble texture from a material swatch? Stamp it on the floor you want to change. The AI uses the visual reference to guide its output far more accurately than any text description could.",
                },
                { type: 'image', src: '/home/1 creation reimagined/42.jpg', alt: 'A reference stamp positions source material where the AI should focus.' },
                { type: 'image', src: '/blog/variablen.jpeg', alt: 'Style, audience and light variables for precise generation control.' },
                { type: 'h2', text: 'Combining Annotations with Prompts' },
                {
                    type: 'p',
                    text: 'The real power emerges when you use both. Paint over the kitchen countertop, then write "replace with honed Carrara marble". The mask tells the AI where; the text tells it what. Results are dramatically more precise than either input alone.',
                },
                { type: 'tip', text: "Paint slightly larger than the area you want to change. A small buffer at the boundary gives the AI room to blend edges naturally." },
                { type: 'h2', text: 'Real-World Use Cases' },
                {
                    type: 'ul',
                    items: [
                        'Replace a single piece of furniture without touching the rest of the room',
                        'Swap wall colors while keeping art and fixtures intact',
                        'Test different flooring materials across an entire room',
                        'Inpaint over unwanted objects (cables, clutter, temporary fixtures)',
                        'Match a reference material from a product catalog to a specific surface',
                    ],
                },
                { type: 'h2', text: 'Tips for Clean Masks' },
                {
                    type: 'ol',
                    items: [
                        "Zoom in before painting edges near furniture legs or architectural details",
                        "Use shape masks for rectangular areas — they're cleaner than freehand",
                        "If the result bleeds outside your intended area, reduce your mask and try again",
                        "For large flat surfaces (entire walls, floors), full-image edits with a text prompt often work better than masking",
                    ],
                },
                {
                    type: 'p',
                    text: 'Visual prompting shifts the creative conversation from "describe what you want" to "show where you want it". Once you try it, going back to text-only prompting for spatial edits feels like trying to give directions without a map.',
                },
            ],
        },
    },
    {
        slug: 'reference-images-style-matching',
        category: 'Guide',
        date: 'April 1, 2026',
        readTime: 3,
        coverGradient: 'from-stone-950 via-zinc-900 to-neutral-950',
        coverImage: '/blog/ref-cover.jpeg',
        en: {
            title: 'Reference Images: Copy Any Style Without Describing It',
            excerpt: "AI images often look generic. Reference images fix that — feed the AI real-world examples and get results that actually match your vision, faster.",
            content: [
                {
                    type: 'p',
                    text: "AI-generated images often look the same. Too smooth, too generic — lifeless. The problem: the AI has no context for what you actually want and interpolates into the void. Reference images change that. Feed it real examples from the world and you'll reach your vision significantly faster.",
                },
                { type: 'h2', text: '1. How It Works' },
                {
                    type: 'p',
                    text: 'Upload your main image and tap Inspiration. Here you add up to 5 reference images — photos, screenshots, anything. The AI automatically recognises which is your main image and which serve as style references. A short note in the prompt is enough: "Use the lighting mood of the reference."',
                },
                { type: 'h2', text: '2. Direct Upload' },
                {
                    type: 'p',
                    text: 'Already have images you love? Upload them directly — from your computer, your phone, drag & drop, or paste with Command+V straight from your clipboard.',
                },
                { type: 'h2', text: '3. Pinterest — the Better Moodboard' },
                {
                    type: 'p',
                    text: "Pinterest is one of the best sources for creative inspiration — interiors, lighting, textures, colour palettes, architecture. Millions of curated images, organised by topic, style and mood. It's worth exploring before you start.",
                },
                {
                    type: 'p',
                    text: 'exposé has a direct shortcut built in: tap Inspiration → Pinterest link. That opens Pinterest straight in your browser. When you find something you like:',
                },
                { type: 'image', src: '/blog/ref-pinterest.jpeg', alt: 'The Pinterest shortcut inside the Inspiration panel.' },
                {
                    type: 'ul',
                    items: [
                        'On desktop: right-click the image → "Copy image"',
                        'On mobile: take a screenshot',
                        'Back in exposé: Command+V or upload — the app recognises it instantly',
                    ],
                },
                { type: 'h2', text: '4. Pro Tip: Crop for Precision' },
                {
                    type: 'p',
                    text: "The AI reads the whole reference image. If you only want it to pick up on one thing — a colour mood, a specific texture — crop the reference first. Tap the crop icon and cut it down to just the relevant detail. Less noise, sharper result.",
                },
                { type: 'h2', text: '5. Combine Image + Text' },
                {
                    type: 'p',
                    text: 'A reference image alone is often enough. Even better with a short prompt: "Use the texture of the reference for the floor." Maximum control, minimum effort.',
                },
                {
                    type: 'tip',
                    label: 'Pro tip',
                    text: "Your own gallery is the best reference library. Open an image in exposé that you love — then navigate to the image you want to edit and press Cmd+V. The first image is instantly added as a reference.",
                },
            ],
        },
        de: {
            title: 'Referenzbilder: Jeden Style kopieren, ohne ihn zu beschreiben',
            excerpt: 'KI-Bilder wirken oft generisch und leblos. Referenzbilder lösen das — füttere die AI mit echten Beispielen und komm deutlich schneller ans Ziel.',
            content: [
                {
                    type: 'p',
                    text: 'KI-Bilder sehen oft gleich aus. Zu glatt, zu generisch, irgendwie leblos. Das Problem: Die AI hat keinen Kontext für das, was du wirklich willst — sie interpoliert ins Blaue. Referenzbilder ändern das. Füttere sie mit echten Beispielen aus der Welt und du kommst deutlich schneller ans Ziel.',
                },
                { type: 'h2', text: '1. So funktioniert\'s' },
                {
                    type: 'p',
                    text: 'Lade dein Hauptbild hoch und tippe auf Inspiration. Hier fügst du bis zu 5 Referenzbilder hinzu — Fotos, Screenshots, alles. Die AI erkennt automatisch, welches dein Hauptbild ist und welche als Style-Vorlage gelten. Ein kurzer Hinweis im Prompt reicht: „Nutze die Lichtstimmung der Referenz."',
                },
                { type: 'h2', text: '2. Direkter Upload' },
                {
                    type: 'p',
                    text: 'Hast du schon Bilder, die dir gefallen? Einfach hochladen — vom Computer, vom Handy, per Drag & Drop oder Command+V direkt aus der Zwischenablage.',
                },
                { type: 'h2', text: '3. Pinterest — das bessere Moodboard' },
                {
                    type: 'p',
                    text: 'Pinterest ist eine der besten Quellen für kreative Inspiration — Interieur, Licht, Texturen, Farben, Architektur. Millionen kuratierte Bilder, sortiert nach Thema, Stil und Stimmung. Es lohnt sich, dort zu stöbern, bevor du anfängst.',
                },
                {
                    type: 'p',
                    text: 'In Exposé gibt es dafür einen direkten Shortcut: Tippe auf Inspiration → Pinterest-Link. Das öffnet Pinterest direkt im Browser. Wenn du etwas gefunden hast:',
                },
                { type: 'image', src: '/blog/ref-pinterest.jpeg', caption: 'Der Pinterest-Shortcut im Inspiration-Panel.' },
                {
                    type: 'ul',
                    items: [
                        'Am PC: Rechtsklick auf das Bild → „Bild kopieren"',
                        'Am Handy: Screenshot machen',
                        'In Exposé: Command+V oder hochladen — die App erkennt es sofort',
                    ],
                },
                { type: 'h2', text: '4. Pro-Tipp: Croppen für mehr Präzision' },
                {
                    type: 'p',
                    text: 'Die AI liest das gesamte Referenzbild. Wenn du nur ein bestimmtes Detail übertragen willst — eine Farbstimmung, eine Textur — schneide das Bild vorher zu. Crop-Icon am Referenzbild anklicken, auf das Wesentliche zuschneiden. Weniger Rauschen, präziseres Ergebnis.',
                },
                { type: 'h2', text: '5. Bild + Text kombinieren' },
                {
                    type: 'p',
                    text: 'Ein Referenzbild allein reicht oft schon. Noch besser mit einem kurzen Prompt dazu: „Nutze die Textur der Referenz für den Boden." Maximale Kontrolle, minimaler Aufwand.',
                },
                {
                    type: 'tip',
                    label: 'Pro-Tipp',
                    text: 'Deine eigene Galerie ist die beste Referenz-Bibliothek. Öffne ein Bild in Exposé, das dir gefällt — geh dann auf das Bild, das du bearbeiten willst, und drücke Cmd+V. Das erste Bild wird sofort als Referenz hinzugefügt.',
                },
            ],
        },
    },
    {
        slug: 'renovation-visualization',
        category: 'Use Case',
        date: 'March 22, 2026',
        readTime: 6,
        coverGradient: 'from-slate-950 via-zinc-900 to-stone-950',
        coverImage: '/home/1 creation reimagined/6.jpeg',
        en: {
            title: 'Visualize Renovations Before You Break a Single Wall',
            excerpt: "Show buyers what a property could look like after renovation — without architectural drawings, 3D software, or a contractor on speed dial.",
            content: [
                {
                    type: 'p',
                    text: "A dated kitchen with laminate countertops and pine cabinets. A bathroom tiled in 1990s beige. A living room with a load-bearing wall that could open up the entire floor plan. These are the properties that buyers walk away from — not because the bones are bad, but because they can't see the potential. Renovation visualization changes that.",
                },
                { type: 'h2', text: 'The Problem with "Imagine It Renovated"' },
                {
                    type: 'p',
                    text: "Most buyers don't have spatial imagination. Telling them \"picture this with an open kitchen\" rarely works. Floor plans don't help either — they're abstract. What actually moves buyers is seeing a photorealistic image of the finished result before any work begins.",
                },
                { type: 'image', src: '/home/1 creation reimagined/43.jpg', caption: 'The same space — before and after AI renovation visualization.' },
                { type: 'h2', text: 'What You Can Change in Minutes' },
                {
                    type: 'ul',
                    items: [
                        'Kitchen: replace cabinets, countertops, appliances, backsplash, flooring',
                        'Bathroom: restyle tiles, swap fixtures, change the vanity and lighting',
                        'Living room: open up a wall, add skylights, change flooring throughout',
                        'Façade: update exterior cladding, window frames, paint color, garden landscaping',
                        'Any room: modernize lighting, remove popcorn ceilings, add built-ins',
                    ],
                },
                { type: 'h2', text: 'The Workflow' },
                {
                    type: 'ol',
                    items: [
                        'Upload a clean photo of the space as-is',
                        'Use the mask brush to paint over the surfaces you want to renovate',
                        'Describe the renovation in your prompt — be specific about materials and style',
                        'Generate 3–4 variants to explore different directions',
                        "Refine: mask a smaller area and iterate on details that didn't land right",
                    ],
                },
                { type: 'tip', text: "For kitchens, generate the cabinets and countertops first, then mask just the backsplash and iterate on that separately. Working in layers gives you more control than trying to change everything at once." },
                { type: 'h2', text: 'Using Reference Images for Material Accuracy' },
                {
                    type: 'p',
                    text: "When you have a specific product in mind — a particular tile from a manufacturer, a countertop material from a slab supplier — upload a photo of it as a reference image. The AI will incorporate that specific texture and color into the generated renovation, making the result immediately useful for client presentations and supplier discussions.",
                },
                { type: 'image', src: '/home/1 creation reimagined/44.jpg', caption: 'Reference material samples guide the AI toward specific renovation finishes.' },
                { type: 'h2', text: 'Beyond Residential: Commercial Renovation Previews' },
                {
                    type: 'p',
                    text: "The same approach works for commercial spaces. Restaurant remodels, office fit-outs, retail refits — any space that needs to be sold to an investor or tenant before construction begins. A photorealistic visualization generated in minutes is more persuasive than a mood board and faster than any 3D rendering firm.",
                },
                { type: 'h2', text: 'Managing Expectations' },
                {
                    type: 'p',
                    text: "AI renovation visualization is a communication and sales tool, not a technical drawing. Results are photorealistic but not architectural — they show the visual intent of a renovation, not structural engineering details. Frame them as creative previews, and they land exactly right.",
                },
                {
                    type: 'tip',
                    label: 'For agents',
                    text: "Present renovation visualizations alongside a rough cost estimate from a contractor. \"This kitchen renovation costs approximately €15,000 and looks like this\" is one of the most effective tools for selling a fixer-upper at a realistic price.",
                },
            ],
        },
    },
    {
        slug: 'product-photography-ai',
        category: 'Use Case',
        date: 'March 15, 2026',
        readTime: 5,
        coverGradient: 'from-emerald-950 via-teal-950 to-cyan-950',
        coverImage: '/home/1 creation reimagined/2.jpeg',
        en: {
            title: 'From Product Shots to Campaign Visuals in Minutes',
            excerpt: 'How small e-commerce brands are using AI to create campaign-quality product images without a studio budget.',
            content: [],
        },
    },
];
