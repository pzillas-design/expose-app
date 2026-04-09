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
            title: "You're the Art Director Now. The AI Does the Rest.",
            excerpt: "What used to take hours in Photoshop now takes seconds. You sketch the intent — the AI handles the execution.",
            content: [
                {
                    type: 'p',
                    text: "For a long time, editing an image meant doing everything yourself. Select the right pixels, mask the edges, clone the background, adjust levels — one detail at a time, layer by layer. Today something fundamental has shifted. You no longer need to execute every change manually. You just need to communicate clearly what should happen and where. That's the role of an art director. And with visual prompting, anyone can step into it.",
                },
                { type: 'h2', text: 'Annotation Mode' },
                {
                    type: 'p',
                    text: "Exposé has a dedicated mode for this: Annotation Mode. Instead of describing everything in text — and hoping the AI interprets it correctly — you draw directly on the image. Mark the area, name the change, and let the model handle the rest. The annotation is sent as a separate layer alongside your original image, giving the AI precise spatial context it couldn't get from a text prompt alone.",
                },
                { type: 'image', src: '/home/1 creation reimagined/41.jpg', alt: 'Drawing annotations directly on the image in Annotation Mode.' },
                { type: 'h2', text: 'The Tools' },
                {
                    type: 'p',
                    text: 'Annotation Mode gives you three types of tools to work with — and they are designed to be combined.',
                },
                {
                    type: 'ul',
                    items: [
                        'Text chips — place a label anywhere on the image. Type what should appear there: "armchair", "marble floor", "window with shutters". Precise, instant, no brush required.',
                        'Shapes — draw a rectangle or circle to outline an area quickly. Ideal for sketching a rough concept: where should the wardrobe go, which wall should change, what area to replace.',
                        'Freehand brush — the classic approach, familiar from tools like ChatGPT. Paint over any area and the AI treats everything inside your stroke as the target zone.',
                    ],
                },
                {
                    type: 'p',
                    text: "Each tool has its strengths. Text chips are the fastest way to name something precisely. Shapes let you sketch a rough spatial concept in seconds. The brush gives you freehand control for irregular areas. What makes Exposé's approach powerful is that you can mix them freely in the same annotation.",
                },
                { type: 'h2', text: 'Combine Them' },
                {
                    type: 'p',
                    text: 'Say you want to add a wardrobe to a corner of the room. Draw a rectangle where it should go — just the rough outline, enough to indicate size and position. Then place a text chip on top: "wardrobe". The AI receives both: the spatial hint from the shape and the semantic context from the label. That combination is far more reliable than either input alone.',
                },
                {
                    type: 'p',
                    text: 'The same logic applies to more complex changes. Brush over a wall, place a text chip saying "exposed concrete", and add a reference stamp of the texture you have in mind. Each annotation layer adds more signal. More signal means fewer failed generations.',
                },
                { type: 'image', src: '/home/1 creation reimagined/42.jpg', alt: 'Shapes, text chips and brush strokes combined in a single annotation.' },
                {
                    type: 'tip',
                    label: 'Tip',
                    text: "Use stickers for things you annotate regularly. Exposé comes with a curated set of pre-made stickers — and you can extend the list with your own. One tap to place, no typing needed. Build a set that matches your workflow and your annotations become much faster.",
                },
            ],
        },
        de: {
            title: 'Du bist der Art Director. Die AI macht den Rest.',
            excerpt: 'Was früher Stunden in Photoshop gedauert hat, geht heute in Sekunden. Du skizzierst die Intention — die AI übernimmt die Ausführung.',
            content: [
                {
                    type: 'p',
                    text: 'Lange Zeit bedeutete Bildbearbeitung: alles selbst machen. Die richtigen Pixel auswählen, Kanten maskieren, Hintergrund klonen, Ebene für Ebene. Heute hat sich etwas Grundlegendes verändert. Du musst nicht mehr jede Änderung manuell ausführen. Du musst nur klar kommunizieren, was passieren soll — und wo. Das ist die Rolle eines Art Directors. Und mit Visual Prompting kann das jeder.',
                },
                { type: 'h2', text: 'Der Anmerkungsmodus' },
                {
                    type: 'p',
                    text: 'Exposé hat dafür einen eigenen Modus: den Anmerkungsmodus. Statt alles in Text zu beschreiben — und darauf zu hoffen, dass die AI es richtig interpretiert — zeichnest du direkt auf das Bild. Markiere den Bereich, benenne die Änderung, und lass das Modell den Rest übernehmen. Die Anmerkung wird als eigener Layer gemeinsam mit deinem Originalbild an die AI gesendet und gibt ihr räumlichen Kontext, den ein Text-Prompt allein nie liefern könnte.',
                },
                { type: 'image', src: '/home/1 creation reimagined/41.jpg', alt: 'Anmerkungen direkt auf dem Bild im Anmerkungsmodus.' },
                { type: 'h2', text: 'Die Werkzeuge' },
                {
                    type: 'p',
                    text: 'Der Anmerkungsmodus bietet drei Arten von Werkzeugen — und sie sind dafür gemacht, kombiniert zu werden.',
                },
                {
                    type: 'ul',
                    items: [
                        'Textchips — platziere ein Label irgendwo auf dem Bild. Schreib, was dort erscheinen soll: „Sessel", „Marmorboden", „Fenster mit Läden". Präzise, sofort, kein Pinsel nötig.',
                        'Formen — zeichne ein Rechteck oder einen Kreis, um einen Bereich schnell zu umreißen. Ideal für ein schnelles Konzept: Wo soll der Schrank hin, welche Wand soll sich ändern, welcher Bereich soll ersetzt werden.',
                        'Freihandpinsel — der klassische Ansatz, bekannt aus Tools wie ChatGPT. Male über einen Bereich und die AI behandelt alles innerhalb als Zielzone.',
                    ],
                },
                {
                    type: 'p',
                    text: 'Jedes Werkzeug hat seine Stärken. Textchips sind der schnellste Weg, etwas präzise zu benennen. Formen lassen dich ein räumliches Konzept in Sekunden skizzieren. Der Pinsel gibt dir freie Kontrolle für unregelmäßige Bereiche. Was den Ansatz von Exposé stark macht: Du kannst alle drei in derselben Anmerkung frei kombinieren.',
                },
                { type: 'h2', text: 'Kombinieren' },
                {
                    type: 'p',
                    text: 'Angenommen, du möchtest einen Schrank in eine Ecke des Raumes setzen. Zeichne ein Rechteck dorthin — nur den groben Umriss, genug um Größe und Position anzudeuten. Dann platziere einen Textchip darauf: „Schrank". Die AI erhält beides: den räumlichen Hinweis durch die Form und den semantischen Kontext durch das Label. Diese Kombination ist deutlich zuverlässiger als jede Eingabe allein.',
                },
                {
                    type: 'p',
                    text: 'Dasselbe Prinzip gilt für komplexere Änderungen. Male über eine Wand, platziere einen Textchip „Sichtbeton" und füge einen Referenz-Stempel mit der gewünschten Textur hinzu. Jede Annotationsebene liefert mehr Signal. Mehr Signal bedeutet weniger fehlgeschlagene Generierungen.',
                },
                { type: 'image', src: '/home/1 creation reimagined/42.jpg', alt: 'Formen, Textchips und Pinselstriche kombiniert in einer Anmerkung.' },
                {
                    type: 'tip',
                    label: 'Tipp',
                    text: 'Nutze Sticker für Dinge, die du regelmäßig annotierst. Exposé kommt mit einer kuratierten Auswahl an fertigen Stickern — und du kannst die Liste mit eigenen erweitern. Ein Tipp zum Platzieren, kein Tippen nötig. Bau dir ein Set, das zu deinem Workflow passt, und deine Anmerkungen werden deutlich schneller.',
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
            title: 'A Picture Is Worth a Thousand Prompts. Here\'s How to Match Your Style.',
            excerpt: "AI images often look generic. Reference images fix that — feed the AI real-world examples and get results that actually match your vision, faster.",
            content: [
                {
                    type: 'p',
                    text: "AI-generated images often look the same. Too smooth, too generic — uninspired. The problem: the AI has no context for what you actually want and interpolates into the void. That's exactly what the Inspiration feature in Exposé is for. Feed it real examples from the world and you'll reach your vision significantly faster.",
                },
                { type: 'h2', text: 'How It Works' },
                {
                    type: 'p',
                    text: 'Start by uploading an image you want to edit. You\'ll see the prompt box — and below it a row of buttons: Annotations, Inspiration, and more. Tap Inspiration and a panel opens with your options:',
                },
                {
                    type: 'ul',
                    items: [
                        'Upload from your computer or phone',
                        'Drag & drop an image directly',
                        'Paste with Command+V straight from your clipboard',
                    ],
                },
                {
                    type: 'p',
                    text: 'You can pull something from your own gallery, a screenshot you saved, or anything you find online. The AI reads the image and uses it as a stylistic anchor for your generation.',
                },
                { type: 'h2', text: 'Find Ideas on Pinterest' },
                {
                    type: 'p',
                    text: "Pinterest is one of the best sources for creative inspiration — interiors, lighting, textures, colour palettes, architecture. Millions of curated images, organised by topic, style and mood. Exposé has a direct shortcut built in: tap Inspiration → Pinterest link and it opens straight in your browser.",
                },
                { type: 'image', src: '/blog/ref-pinterest.jpeg', alt: 'The Pinterest shortcut inside the Inspiration panel.' },
                {
                    type: 'p',
                    text: 'When you find something you like, the fastest way to bring it into Exposé: right-click the image in your browser → "Copy image" → switch to Exposé and press Command+V. Done.',
                },
                {
                    type: 'tip',
                    label: 'Tip',
                    text: 'Right-click any image in your browser → "Copy image" → Command+V in Exposé. No download needed.',
                },
                { type: 'h2', text: 'More Control with a Prompt' },
                {
                    type: 'p',
                    text: 'A reference image alone is often enough. But combining it with a short prompt gives you even more precision: "Use the texture of the reference for the floor." The AI takes both signals into account — the visual mood from the image, the specific instruction from your text.',
                },
                {
                    type: 'p',
                    text: "If you only want the AI to pick up on one aspect of a reference — a colour mood, a specific texture — crop it first. Tap the crop icon on the reference image and cut it down to just the relevant detail. Less noise, sharper result.",
                },
            ],
        },
        de: {
            title: 'Ein Bild sagt mehr als tausend Prompts. So trifft die KI deinen Style.',
            excerpt: 'KI-Bilder wirken oft generisch und uninspiriert. Referenzbilder lösen das — füttere die AI mit echten Beispielen und komm deutlich schneller ans Ziel.',
            content: [
                {
                    type: 'p',
                    text: 'KI-Bilder sehen oft gleich aus. Zu glatt, zu generisch, irgendwie uninspiriert. Das Problem: Die AI hat keinen Kontext für das, was du wirklich willst — sie interpoliert ins Blaue. Genau dafür gibt es in Exposé die Inspiration-Funktion. Füttere sie mit echten Beispielen aus der Welt und du kommst deutlich schneller ans Ziel.',
                },
                { type: 'h2', text: 'So funktioniert\'s' },
                {
                    type: 'p',
                    text: 'Lade zuerst ein Bild hoch, das du bearbeiten möchtest. Du siehst die Prompt-Box — und darunter ein paar Buttons: Anmerkungen, Inspiration und mehr. Tippe auf Inspiration und ein Panel öffnet sich mit deinen Optionen:',
                },
                {
                    type: 'ul',
                    items: [
                        'Vom Computer oder Handy hochladen',
                        'Bild per Drag & Drop einfügen',
                        'Mit Command+V direkt aus der Zwischenablage einfügen',
                    ],
                },
                {
                    type: 'p',
                    text: 'Du kannst etwas aus deiner eigenen Galerie nehmen, einen gespeicherten Screenshot oder irgendetwas, das du online findest. Die AI liest das Bild und nutzt es als stilistischen Anker für die Generierung.',
                },
                { type: 'h2', text: 'Ideen sammeln auf Pinterest' },
                {
                    type: 'p',
                    text: 'Pinterest ist eine der besten Quellen für kreative Inspiration — Interieur, Licht, Texturen, Farben, Architektur. Millionen kuratierte Bilder, sortiert nach Thema, Stil und Stimmung. In Exposé gibt es dafür einen direkten Shortcut: Tippe auf Inspiration → Pinterest-Link und er öffnet direkt im Browser.',
                },
                { type: 'image', src: '/blog/ref-pinterest.jpeg', alt: 'Der Pinterest-Shortcut im Inspiration-Panel.' },
                {
                    type: 'tip',
                    label: 'Tipp',
                    text: 'Rechtsklick auf ein beliebiges Bild im Browser → „Bild kopieren" → Command+V in Exposé. Kein Download nötig.',
                },
                { type: 'h2', text: 'Mehr Kontrolle mit einem Prompt' },
                {
                    type: 'p',
                    text: 'Ein Referenzbild allein reicht oft schon. Aber kombiniert mit einem kurzen Prompt bekommst du noch mehr Präzision: „Nutze die Textur der Referenz für den Boden." Die AI berücksichtigt beide Signale — die visuelle Stimmung aus dem Bild, die konkrete Anweisung aus deinem Text.',
                },
                {
                    type: 'p',
                    text: 'Wenn du nur einen bestimmten Aspekt des Referenzbilds übertragen willst — eine Farbstimmung, eine Textur — schneide es vorher zu. Tippe auf das Crop-Icon am Referenzbild und beschneide es auf das Wesentliche. Weniger Rauschen, präziseres Ergebnis.',
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
