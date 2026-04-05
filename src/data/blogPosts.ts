export type ContentBlock =
    | { type: 'h2'; text: string }
    | { type: 'h3'; text: string }
    | { type: 'p'; text: string }
    | { type: 'ul'; items: string[] }
    | { type: 'ol'; items: string[] }
    | { type: 'tip'; label?: string; text: string };

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
        readTime: 4,
        coverGradient: 'from-indigo-950 via-violet-950 to-slate-950',
        content: [],
    },
    {
        slug: 'product-photography-ai',
        title: 'From Product Shots to Campaign Visuals in Minutes',
        excerpt: 'How small e-commerce brands are using AI to create campaign-quality product images without a studio budget.',
        category: 'Use Case',
        date: 'March 15, 2026',
        readTime: 5,
        coverGradient: 'from-emerald-950 via-teal-950 to-cyan-950',
        content: [],
    },
];
