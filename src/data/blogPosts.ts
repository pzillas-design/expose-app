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
        coverImage: '/blog/vp-cover.jpeg',
        en: {
            title: "Visual Prompting: Become the Art Director, the AI Does the Rest.",
            excerpt: "Instead of editing every pixel yourself, you sketch the intent — the AI handles the execution.",
            content: [
                {
                    type: 'p',
                    text: "Traditional image editing: selecting, masking, retouching — years of experience, a lot of time. New AI models like Google's Nano Banana 2 now operate at the level of an experienced retoucher, and beyond. Scary? Visual prompting makes you the director of that capability — you show where and what, the AI executes. That keeps you in creative control and lets you determine the outcome.",
                },
                { type: 'h2', text: 'Annotation Mode' },
                {
                    type: 'p',
                    text: "Exposé has a dedicated mode for this: Annotation Mode. Instead of describing everything in text — and hoping the AI interprets it correctly — you draw directly on the image. Mark the area, name the change, and let the model handle the rest. The annotation is sent as a separate layer alongside your original image, giving the AI precise spatial context it couldn't get from a text prompt alone.",
                },
                { type: 'image', src: '/blog/vp-sticker.jpeg', alt: 'Sticker panel with pre-made annotation stamps.' },
                {
                    type: 'tip',
                    label: 'Tip',
                    text: "Use stickers for things you annotate regularly. Exposé comes with a set of pre-made stickers — and you can extend the list with your own.",
                },
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
                    text: 'Say you want to add a wardrobe to a corner of the room. Draw a rectangle where it should go — just the rough outline, enough to indicate size and position. Then place a text chip on top: "wardrobe". The AI receives both: the spatial hint from the shape and the semantic context from the label. That combination is far more reliable than either input alone.',
                },
            ],
        },
        de: {
            title: 'Visual Prompting: Werde zum Art Director, die AI macht den Rest.',
            excerpt: 'Statt jeden Pixel selbst zu setzen, skizzierst du die Intention — die AI übernimmt die Ausführung.',
            content: [
                {
                    type: 'p',
                    text: 'Klassische Bildbearbeitung bedeutet: auswählen, maskieren, retuschieren — viel Erfahrung, viel Zeit. Neue KI-Modelle wie Googles Nano Banana 2 arbeiten inzwischen auf dem Niveau eines erfahrenen Bildbearbeiters, und darüber hinaus. Beängstigend, oder? Visuelles Prompting macht dich zum Regisseur dieser Fähigkeit — du zeigst wo und was, die AI führt aus. Damit behältst du die kreative Oberhand und bestimmst das Ergebnis.',
                },
                { type: 'h2', text: 'Der Anmerkungsmodus' },
                {
                    type: 'p',
                    text: 'Exposé hat dafür einen eigenen Modus: den Anmerkungsmodus. Statt alles in Text zu beschreiben — und darauf zu hoffen, dass die AI es richtig interpretiert — zeichnest du direkt auf das Bild. Markiere den Bereich, benenne die Änderung, und lass das Modell den Rest übernehmen. Die Anmerkung wird als eigener Layer gemeinsam mit deinem Originalbild an die AI gesendet und gibt ihr räumlichen Kontext, den ein Text-Prompt allein nie liefern könnte.',
                },
                { type: 'image', src: '/blog/vp-sticker.jpeg', alt: 'Das Sticker-Panel mit vorgefertigten Anmerkungsstempeln.' },
                {
                    type: 'tip',
                    label: 'Tipp',
                    text: 'Nutze Sticker für Dinge, die du regelmäßig annotierst. Exposé kommt mit einer Auswahl an fertigen Stickern — und du kannst die Liste mit eigenen erweitern.',
                },
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
                    text: 'Angenommen, du möchtest einen Schrank in eine Ecke des Raumes setzen. Zeichne ein Rechteck dorthin — nur den groben Umriss, genug um Größe und Position anzudeuten. Dann platziere einen Textchip darauf: „Schrank". Die AI erhält beides: den räumlichen Hinweis durch die Form und den semantischen Kontext durch das Label. Diese Kombination ist deutlich zuverlässiger als jede Eingabe allein.',
                },
            ],
        },
    },
    {
        slug: 'variables-presets',
        category: 'Guide',
        date: 'March 20, 2026',
        readTime: 4,
        coverGradient: 'from-violet-950 via-indigo-950 to-slate-950',
        coverImage: '/blog/variables-cover.jpg',
        en: {
            title: 'Variables: Set It Up Once, Generate Forever.',
            excerpt: "Stop rewriting the same prompt. Build a template once, define your options — and generate new assets with a few clicks.",
            content: [
                {
                    type: 'p',
                    text: "Most creative workflows have a rhythm: same type of image, same visual direction, slightly different each time. A new product shot, another social post, a fresh variant for a campaign. Without structure, you end up rewriting the same prompt over and over — tweaking a word here, adjusting a detail there. Variables solve this. You build the prompt once as a template, divide it into topics, and define your own options for each. From then on, generating a new asset is a matter of selecting, not typing.",
                },
                { type: 'h2', text: 'How It Works' },
                {
                    type: 'p',
                    text: "Open the Variables panel and start building your template. A variable is a named category — Style, Mood, Audience, Light — with a list of options you define. Write them comma-separated: the model reads each option as a distinct direction. When you generate, you pick one option per variable and the app assembles your prompt automatically. Change one variable, generate again — new result, same visual logic.",
                },
                { type: 'image', src: '/blog/variablen.jpeg', alt: 'The Variables panel with custom categories and options.' },
                { type: 'h2', text: 'What You Can Define' },
                {
                    type: 'p',
                    text: "Variables work best when they reflect how you actually think about your images. Some ideas to get started:",
                },
                {
                    type: 'ul',
                    items: [
                        'Style — minimalist, editorial, warm lifestyle, dark luxury, soft Scandinavian',
                        'Mood / Atmosphere — energetic, calm, melancholic, festive, clinical',
                        'Target audience — Gen Z, young professionals, families, luxury buyers',
                        'Persona — name, age, background, visual archetype of the person in the image',
                        'Color palette — muted earth tones, neon accents, monochrome, pastels',
                        'Composition — wide shot, close-up, top-down, rule of thirds, centered portrait',
                        'Lighting — golden hour, studio soft box, dramatic side light, flat daylight',
                        'Setting / Location — urban rooftop, cozy interior, minimal white studio, nature',
                    ],
                },
                {
                    type: 'p',
                    text: "The more deliberately you define your variables, the more consistent — and reusable — your creative output becomes. Think of it as codifying your taste.",
                },
                { type: 'h2', text: 'Why It Works' },
                {
                    type: 'p',
                    text: "Modern image models like Nano Banana 2 don't need exhaustive prompts to produce great results. Short, structured input often outperforms long, freeform descriptions. Variables take advantage of that: each option is a precise signal, and the combination of several precise signals gives the model exactly the context it needs.",
                },
                { type: 'h2', text: 'Visual Identity at Scale' },
                {
                    type: 'p',
                    text: "Once your preset is dialed in, every asset you generate from it shares the same visual DNA. Same style logic, same color range, same compositional thinking — regardless of how many variants you create. That consistency is hard to achieve with freeform prompting. Variables make it the default.",
                },
                {
                    type: 'tip',
                    label: 'Tip',
                    text: "When you're happy with your preset, share it. Tap the share button and Exposé generates a link you can send to colleagues or collaborators. They open it, get your exact template, and can start generating consistent assets immediately — no briefing needed.",
                },
            ],
        },
        de: {
            title: 'Variablen: Einmal aufsetzen, immer wieder nutzen.',
            excerpt: 'Hör auf, denselben Prompt immer neu zu schreiben. Bau einmal eine Vorlage, definiere deine Optionen — und generiere neue Assets mit wenigen Klicks.',
            content: [
                {
                    type: 'p',
                    text: 'Die meisten kreativen Workflows haben einen Rhythmus: gleiche Art Bild, gleiche visuelle Richtung, jedes Mal leicht anders. Ein neues Produktbild, ein weiterer Social Post, eine frische Variante für eine Kampagne. Ohne Struktur schreibst du denselben Prompt immer wieder neu — ein Wort hier, ein Detail dort. Variablen lösen das. Du baust den Prompt einmal als Vorlage, teilst ihn in Themen ein und definierst für jedes Thema eigene Optionen. Ab dann ist ein neuer Asset eine Frage von Auswählen, nicht Tippen.',
                },
                { type: 'h2', text: 'So funktioniert es' },
                {
                    type: 'p',
                    text: 'Öffne das Variablen-Panel und baue deine Vorlage. Eine Variable ist eine benannte Kategorie — Stil, Stimmung, Zielgruppe, Licht — mit einer Liste von Optionen, die du selbst festlegst. Schreib sie kommagetrennt: das Modell liest jede Option als eigene Richtung. Beim Generieren wählst du pro Variable eine Option, die App fügt deinen Prompt automatisch zusammen. Andere Variable, neues Ergebnis — gleiche visuelle Logik.',
                },
                { type: 'image', src: '/blog/variablen.jpeg', alt: 'Das Variablen-Panel mit eigenen Kategorien und Optionen.' },
                { type: 'h2', text: 'Was du definieren kannst' },
                {
                    type: 'p',
                    text: 'Variablen funktionieren am besten, wenn sie widerspiegeln, wie du selbst über deine Bilder denkst. Ein paar Ideen zum Einstieg:',
                },
                {
                    type: 'ul',
                    items: [
                        'Stil — minimalistisch, editorial, warmes Lifestyle, Dark Luxury, weiches Skandinavisch',
                        'Stimmung / Atmosphäre — energetisch, ruhig, melancholisch, festlich, klinisch',
                        'Zielgruppe — Gen Z, junge Berufstätige, Familien, Luxuskäufer',
                        'Persona — Name, Alter, Hintergrund, visueller Archetyp der abgebildeten Person',
                        'Farbpalette — gedeckte Erdtöne, Neon-Akzente, Monochrom, Pastelltöne',
                        'Bildgestaltung — Weitwinkel, Nahaufnahme, Vogelperspektive, Drittel-Regel, zentriertes Portrait',
                        'Licht — goldene Stunde, Studio-Softbox, dramatisches Seitenlicht, gleichmäßiges Tageslicht',
                        'Setting / Ort — urbanes Rooftop, gemütliches Interieur, minimales weißes Studio, Natur',
                    ],
                },
                {
                    type: 'p',
                    text: 'Je bewusster du deine Variablen definierst, desto konsistenter — und wiederverwendbarer — wird dein kreativer Output. Betrachte es als das Festhalten deines eigenen Geschmacks.',
                },
                { type: 'h2', text: 'Warum es funktioniert' },
                {
                    type: 'p',
                    text: 'Moderne Bildmodelle wie Nano Banana 2 brauchen keine ausufernden Prompts für gute Ergebnisse. Kurzer, strukturierter Input schlägt lange Freitextbeschreibungen oft. Variablen nutzen das aus: jede Option ist ein präzises Signal, und die Kombination mehrerer präziser Signale gibt dem Modell genau den Kontext, den es braucht.',
                },
                { type: 'h2', text: 'Visuelle Identität im Maßstab' },
                {
                    type: 'p',
                    text: 'Sobald dein Preset stimmt, teilen alle Assets, die du daraus generierst, dieselbe visuelle DNA. Gleiche Stillogik, gleiche Farbrange, gleiches kompositorisches Denken — egal wie viele Varianten du erstellst. Diese Konsistenz ist mit freiem Prompting schwer zu erreichen. Variablen machen sie zur Grundeinstellung.',
                },
                {
                    type: 'tip',
                    label: 'Tipp',
                    text: 'Wenn du mit deinem Preset zufrieden bist, teile es. Tippe auf den Teilen-Button und Exposé erstellt einen Link, den du an Kollegen oder Mitstreiter senden kannst. Sie öffnen ihn, erhalten deine exakte Vorlage und können sofort konsistente Assets generieren — kein Briefing nötig.',
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
                    text: 'Start by uploading an image you want to edit. You\'ll see the prompt box — and below it a row of buttons: Annotations, Inspiration, and more. Tap Inspiration and a panel opens: upload an image from your computer or paste one directly with Command+V.',
                },
                {
                    type: 'p',
                    text: 'You can use something from your own gallery, a saved screenshot, or anything you find online. The AI reads the image and uses it as a stylistic anchor for your generation.',
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
                    text: 'Lade zuerst ein Bild hoch, das du bearbeiten möchtest. Du siehst die Prompt-Box — und darunter ein paar Buttons: Anmerkungen, Inspiration und mehr. Tippe auf Inspiration und ein Panel öffnet sich: du kannst ein Bild vom Computer hochladen oder mit Command+V direkt aus der Zwischenablage einfügen.',
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
