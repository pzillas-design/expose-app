export type ContentBlock =
    | { type: 'h2'; text: string }
    | { type: 'h3'; text: string }
    | { type: 'p'; text: string }
    | { type: 'ul'; items: string[] }
    | { type: 'ol'; items: string[] }
    | { type: 'tip'; label?: string; text: string }
    | { type: 'image'; src: string; alt?: string; caption?: string };

export interface BlogPost {
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    date: string;
    readTime: number;
    coverGradient: string;
    coverImage?: string;
    featured?: boolean;
    content: ContentBlock[];
}

export const BLOG_POSTS: BlogPost[] = [
    {
        slug: 'real-estate-staging-ai',
        title: 'How to Stage Real Estate Photos with AI',
        excerpt: "Empty rooms don't sell homes. Here's how to transform bare property photos into warm, fully staged spaces — in minutes, not days.",
        category: 'Tutorial',
        date: 'April 4, 2026',
        readTime: 6,
        coverGradient: 'from-amber-950 via-orange-950 to-stone-950',
        coverImage: '/home/1 creation reimagined/3.jpeg',
        featured: true,
        content: [
            {
                type: 'p',
                text: "Real estate agents know the problem well: a property is beautiful in person, but the listing photos show empty, sterile rooms that fail to communicate the potential of the space. Traditional virtual staging costs €100–400 per room and takes 2–3 business days. AI-powered staging changes that equation entirely.",
            },
            {
                type: 'h2',
                text: 'Why Staging Matters',
            },
            {
                type: 'p',
                text: 'Staged homes sell 73% faster and for 5–17% more than unstaged properties. Buyers struggle to visualize empty spaces — furniture, lighting, and décor do the cognitive work of helping them imagine living there.',
            },
            {
                type: 'h2',
                text: 'The Classic Approach vs. AI Staging',
            },
            {
                type: 'ul',
                items: [
                    'Traditional staging: €500–2000 per shoot, physical furniture rental, scheduling delays',
                    'Manual virtual staging (outsourced): €100–400/room, 2–3 day turnaround, limited revision rounds',
                    'AI staging with exposé: €0.10–0.40 per generation, results in under a minute, unlimited iterations',
                ],
            },
            {
                type: 'h2',
                text: 'Step 1 — Upload Your Empty Room Photo',
            },
            {
                type: 'p',
                text: 'Start with a clean, well-lit photo of the empty room. Natural light works best — avoid strong shadows that will be hard to match with generated furniture. Shoot from a corner or doorway to capture as much of the room as possible.',
            },
            {
                type: 'image',
                src: '/home/1 creation reimagined/21.jpg',
                caption: 'A well-lit empty room — the ideal starting point for AI staging.',
            },
            {
                type: 'h2',
                text: 'Step 2 — Write a Specific Style Prompt',
            },
            {
                type: 'p',
                text: 'Be specific about the target buyer and style. "Modern Scandinavian living room, light oak furniture, linen sofa in off-white, warm pendant light, potted plants" will outperform a generic "add furniture" prompt every time.',
            },
            {
                type: 'tip',
                text: 'Match the staging style to the property type and likely buyer. A minimalist Bauhaus apartment calls for different furniture than a countryside farmhouse.',
            },
            {
                type: 'h2',
                text: 'Step 3 — Use Visual Prompting to Protect Existing Elements',
            },
            {
                type: 'p',
                text: "If the room has a beautiful parquet floor, a feature wall, or architectural details you want to preserve, use exposé's masking tools to paint over only the areas you want changed. This tells the AI: keep everything outside the mask, only stage the interior.",
            },
            {
                type: 'h2',
                text: 'Step 4 — Iterate Quickly',
            },
            {
                type: 'p',
                text: 'Generate 3–4 versions with slightly different style prompts — one contemporary, one classic, one warm-toned. Show all to your client and let them choose, or A/B test them in your listing.',
            },
            {
                type: 'image',
                src: '/home/1 creation reimagined/22.jpg',
                caption: 'Multiple style variants generated from the same base photo.',
            },
            {
                type: 'h2',
                text: 'What Works and What Doesn\'t',
            },
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
            {
                type: 'h2',
                text: 'The Business Case',
            },
            {
                type: 'p',
                text: 'Staging a 3-bedroom apartment (living room, 2 bedrooms) with 2–3 variants per room = approximately 6–9 images. At exposé credit pricing, that\'s under €5 in generation costs. The same job outsourced would cost €600–1200 and take a week.',
            },
            {
                type: 'tip',
                label: 'Business idea',
                text: 'Offer AI staging as an add-on service to your real estate clients. At €50–150 per property you\'re dramatically cheaper than traditional virtual staging while keeping most of the margin.',
            },
        ],
    },
    {
        slug: 'visual-prompting-guide',
        title: 'Visual Prompting: Why Drawing on Images Changes Everything',
        excerpt: "Text prompts alone have a fundamental limitation — they can't tell the AI exactly where to make changes. Visual prompting solves that.",
        category: 'Guide',
        date: 'March 28, 2026',
        readTime: 5,
        coverGradient: 'from-indigo-950 via-violet-950 to-slate-950',
        coverImage: '/home/1 creation reimagined/4.jpeg',
        content: [
            {
                type: 'p',
                text: "Every prompt-based image tool shares the same blind spot: text is imprecise. You can write \"change the sofa\" but the AI has to guess which sofa, how much of the surrounding area to affect, and whether you want the floor or the wall behind it preserved. Visual prompting eliminates that guesswork by letting you draw directly on the image.",
            },
            {
                type: 'h2',
                text: 'What is Visual Prompting?',
            },
            {
                type: 'p',
                text: "Visual prompting means using brushes, shapes, and annotations drawn on top of your source image to communicate intent. Instead of describing a location in words, you mark it. Instead of hoping the AI understands \"the left window\", you paint over it. The combination of your visual annotation and your text prompt gives the model far more information to work with.",
            },
            {
                type: 'image',
                src: '/home/1 creation reimagined/41.jpg',
                caption: 'Paint directly on the image to define exactly what should change.',
            },
            {
                type: 'h2',
                text: 'The Three Core Annotation Types',
            },
            {
                type: 'h3',
                text: '1. Freehand Mask',
            },
            {
                type: 'p',
                text: "Use the brush tool to paint over any area you want the AI to modify. Everything outside your painted region is treated as locked — the model will try to match lighting, texture, and perspective at the boundary. This is ideal for replacing furniture, changing wall paint, or swapping out a floor material.",
            },
            {
                type: 'h3',
                text: '2. Shape Masks',
            },
            {
                type: 'p',
                text: "Rectangle and ellipse masks are faster for regular areas — a window, a door, a rug. Draw the shape once, resize to fit, and you have a clean selection without any brush wobble.",
            },
            {
                type: 'h3',
                text: '3. Reference Stamps',
            },
            {
                type: 'p',
                text: "Reference stamps let you paste a reference image directly onto the canvas and position it where the AI should draw inspiration. Want to match the marble texture from a material swatch? Stamp it on the floor you want to change. The AI uses the visual reference to guide its output far more accurately than any text description could.",
            },
            {
                type: 'image',
                src: '/home/1 creation reimagined/42.jpg',
                caption: 'A reference stamp positions source material where the AI should focus.',
            },
            {
                type: 'h2',
                text: 'Combining Annotations with Prompts',
            },
            {
                type: 'p',
                text: "The real power emerges when you use both. Paint over the kitchen countertop, then write \"replace with honed Carrara marble\". The mask tells the AI where; the text tells it what. Results are dramatically more precise than either input alone.",
            },
            {
                type: 'tip',
                text: "Paint slightly larger than the area you want to change. A small buffer at the boundary gives the AI room to blend edges naturally.",
            },
            {
                type: 'h2',
                text: 'Real-World Use Cases',
            },
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
            {
                type: 'h2',
                text: 'Tips for Clean Masks',
            },
            {
                type: 'ol',
                items: [
                    'Zoom in before painting edges near furniture legs or architectural details',
                    'Use shape masks for rectangular areas — they\'re cleaner than freehand',
                    'If the result bleeds outside your intended area, reduce your mask and try again',
                    'For large flat surfaces (entire walls, floors), full-image edits with a text prompt often work better than masking',
                ],
            },
            {
                type: 'p',
                text: "Visual prompting shifts the creative conversation from \"describe what you want\" to \"show where you want it\". Once you try it, going back to text-only prompting for spatial edits feels like trying to give directions without a map.",
            },
        ],
    },
    {
        slug: 'reference-images-style-matching',
        title: 'Reference Images: Copy Any Style Without Describing It',
        excerpt: "Stop guessing how to put a style into words. With reference images, you show the AI exactly what you're going for — and it matches it.",
        category: 'Guide',
        date: 'April 1, 2026',
        readTime: 5,
        coverGradient: 'from-stone-950 via-zinc-900 to-neutral-950',
        coverImage: '/home/1 creation reimagined/12.jpeg',
        content: [
            {
                type: 'p',
                text: "\"Warm, mid-century modern, with a Californian feel\" — even a skilled art director struggles to translate that into consistent AI output with text alone. The problem is that visual style is visual. It lives in proportions, material combinations, lighting quality, color grading. Words approximate it. Images capture it.",
            },
            {
                type: 'h2',
                text: 'How Reference Images Work in exposé',
            },
            {
                type: 'p',
                text: "Upload one or more reference images alongside your source photo and prompt. The AI analyzes the reference for style, texture, color palette, and mood — and applies those qualities to the edit or generation. You don't have to describe the style at all if the reference already shows it.",
            },
            {
                type: 'image',
                src: '/home/1 creation reimagined/31.jpg',
                caption: 'Reference image (left) guides the style of the generated edit (right).',
            },
            {
                type: 'h2',
                text: 'What References Are Good For',
            },
            {
                type: 'ul',
                items: [
                    'Matching a specific furniture or material brand\'s visual language',
                    'Replicating a staging style from a previous project a client loved',
                    'Applying a mood board\'s color palette to a new space',
                    'Maintaining visual consistency across a multi-property portfolio',
                    'Translating inspiration from Pinterest or design magazines into actual staging',
                ],
            },
            {
                type: 'h2',
                text: 'Choosing the Right Reference',
            },
            {
                type: 'p',
                text: "Not every image makes a good reference. The model responds most strongly to references that clearly show the style element you care about — a full room shot for overall mood, a close-up for material texture, or a color swatch for palette. Avoid references that are ambiguous or contain too many competing styles.",
            },
            {
                type: 'tip',
                text: "Use 2–3 tightly focused references rather than one complex scene. A material close-up + a room layout + a lighting reference will give the model clearer signals than a single busy mood board.",
            },
            {
                type: 'h2',
                text: 'Combining References with Masks',
            },
            {
                type: 'p',
                text: "The most powerful workflow: mask the specific area you want to change, then provide a reference for what it should look like. Mask the floor + reference a herringbone oak parquet = precise, style-matched output without writing a word about wood species, plank width, or finish.",
            },
            {
                type: 'image',
                src: '/home/1 creation reimagined/32.jpg',
                caption: 'Masking + reference image: precise control over where and what style is applied.',
            },
            {
                type: 'h2',
                text: 'Reference Stamps on the Canvas',
            },
            {
                type: 'p',
                text: "exposé's canvas tools include reference stamps — you can paste a reference directly onto the source image and position it where you want the AI to focus. Stamp a tile sample on the bathroom wall you want to restyle. The model treats the stamp as a spatial instruction: apply this, here.",
            },
            {
                type: 'h2',
                text: 'Practical Example: Portfolio Consistency',
            },
            {
                type: 'p',
                text: "A real estate agency staging multiple units in the same building wants a consistent brand look across all listings. With text prompts alone, each generation drifts. With a saved reference image from the first approved staging, every subsequent room can be generated with the same visual anchor — same furniture weight, same warm lighting, same neutral palette.",
            },
            {
                type: 'tip',
                label: 'Pro tip',
                text: "Save your best-performing generated images as references for future projects. Over time you build a personal style library that makes every new job faster and more consistent.",
            },
        ],
    },
    {
        slug: 'renovation-visualization',
        title: 'Visualize Renovations Before You Break a Single Wall',
        excerpt: "Show buyers what a property could look like after renovation — without architectural drawings, 3D software, or a contractor on speed dial.",
        category: 'Use Case',
        date: 'March 22, 2026',
        readTime: 6,
        coverGradient: 'from-slate-950 via-zinc-900 to-stone-950',
        coverImage: '/home/1 creation reimagined/6.jpeg',
        content: [
            {
                type: 'p',
                text: "A dated kitchen with laminate countertops and pine cabinets. A bathroom tiled in 1990s beige. A living room with a load-bearing wall that could open up the entire floor plan. These are the properties that buyers walk away from — not because the bones are bad, but because they can't see the potential. Renovation visualization changes that.",
            },
            {
                type: 'h2',
                text: 'The Problem with "Imagine It Renovated"',
            },
            {
                type: 'p',
                text: "Most buyers don't have spatial imagination. Telling them \"picture this with an open kitchen\" rarely works. Floor plans don't help either — they're abstract. What actually moves buyers is seeing a photorealistic image of the finished result before any work begins.",
            },
            {
                type: 'image',
                src: '/home/1 creation reimagined/43.jpg',
                caption: 'The same space — before and after AI renovation visualization.',
            },
            {
                type: 'h2',
                text: 'What You Can Change in Minutes',
            },
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
            {
                type: 'h2',
                text: 'The Workflow',
            },
            {
                type: 'ol',
                items: [
                    'Upload a clean photo of the space as-is',
                    'Use the mask brush to paint over the surfaces you want to renovate',
                    'Describe the renovation in your prompt — be specific about materials and style',
                    'Generate 3–4 variants to explore different directions',
                    'Refine: mask a smaller area and iterate on details that didn\'t land right',
                ],
            },
            {
                type: 'tip',
                text: "For kitchens, generate the cabinets and countertops first, then mask just the backsplash and iterate on that separately. Working in layers gives you more control than trying to change everything at once.",
            },
            {
                type: 'h2',
                text: 'Using Reference Images for Material Accuracy',
            },
            {
                type: 'p',
                text: "When you have a specific product in mind — a particular tile from a manufacturer, a countertop material from a slab supplier — upload a photo of it as a reference image. The AI will incorporate that specific texture and color into the generated renovation, making the result immediately useful for client presentations and supplier discussions.",
            },
            {
                type: 'image',
                src: '/home/1 creation reimagined/44.jpg',
                caption: 'Reference material samples guide the AI toward specific renovation finishes.',
            },
            {
                type: 'h2',
                text: 'Beyond Residential: Commercial Renovation Previews',
            },
            {
                type: 'p',
                text: "The same approach works for commercial spaces. Restaurant remodels, office fit-outs, retail refits — any space that needs to be sold to an investor or tenant before construction begins. A photorealistic visualization generated in minutes is more persuasive than a mood board and faster than any 3D rendering firm.",
            },
            {
                type: 'h2',
                text: 'Managing Expectations',
            },
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
    {
        slug: 'product-photography-ai',
        title: 'From Product Shots to Campaign Visuals in Minutes',
        excerpt: 'How small e-commerce brands are using AI to create campaign-quality product images without a studio budget.',
        category: 'Use Case',
        date: 'March 15, 2026',
        readTime: 5,
        coverGradient: 'from-emerald-950 via-teal-950 to-cyan-950',
        coverImage: '/home/1 creation reimagined/2.jpeg',
        content: [],
    },
];
