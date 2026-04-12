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
    isoDate: string;
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
        slug: 'one-room-multiple-angles',
        category: 'Guide',
        date: 'April 12, 2026',
        isoDate: '2026-04-12',
        readTime: 5,
        coverGradient: 'from-stone-950 via-neutral-900 to-zinc-950',
        coverImage: '/blog/multi-cover.jpg',
        featured: true,
        en: {
            title: 'One Room, Multiple Angles. How to Keep the AI Consistent.',
            excerpt: "Staging one photo is easy. Keeping furniture, style, and layout consistent across different perspectives — that's where most workflows fall apart. Here's the approach that works.",
            content: [
                {
                    type: 'p',
                    text: "AI staging works beautifully on a single image. The challenge starts when you have multiple photos of the same room and you want the staged versions to match. Same sofa, same table, same TV on the same wall. Current AI models have no memory between generations — without a strategy, every image ends up with its own interpretation. This guide shows how to work around that.",
                },
                { type: 'h2', text: 'Step 1 — Start with the Best Overview' },
                {
                    type: 'p',
                    text: "Pick the photo that shows the most of the room: widest angle, clearest floor plan, most positions visible at once. This is your anchor — you define the staging concept here, everything else follows.",
                },
                { type: 'image', src: '/blog/multi1-homestaging.jpeg', alt: 'Staging the overview image with room type, style, and audience settings in exposé.' },
                {
                    type: 'p',
                    text: "Stage it with your style, room type, and target audience. The more specific the prompt, the more coherent the result across all angles.",
                },
                {
                    type: 'tip',
                    label: 'Pro tip',
                    text: "Use 0.5K while exploring — switch to higher resolution only once you have a result you like.",
                },
                { type: 'h2', text: 'Step 2 — Use the Staged Result as Inspiration' },
                {
                    type: 'p',
                    text: "Happy with the result? Download it or copy it. Open the next angle of the room and add that staged image as Inspiration. In your prompt, name the perspective shift explicitly — something like: \"Add home staging similar to the reference image, but photographed from the opposite side.\"",
                },
                { type: 'image', src: '/blog/multi3-add-inspiration.jpeg', alt: 'Adding the staged first image as inspiration when working on the second angle in exposé.' },
                { type: 'h2', text: 'Step 3 — Annotate the Furniture Layout' },
                {
                    type: 'p',
                    text: "For complex layouts or tricky angles, annotations make a big difference. Switch to Annotation Mode and mark where each piece belongs in this view.",
                },
                { type: 'image', src: '/blog/multi4-annotate.jpeg', alt: 'Annotation mode with rectangle shapes and text labels marking sofa, table, and TV placement.' },
                {
                    type: 'tip',
                    label: 'Pro tip',
                    text: 'Use the More function to generate a batch of variants at once — consistency is easier to find when you have options.',
                },
                { type: 'h2', text: 'What Works Best' },
                {
                    type: 'ul',
                    items: [
                        'Less is more — a simple room with fewer pieces gives the AI less to get wrong.',
                        'Keep furniture away from the edges. AI models stubbornly resist showing cropped furniture — pieces placed centrally in the room translate far better across perspectives.',
                        'Very similar angles, or diametrically opposite views (front and back of the same space).',
                        'Open-plan rooms where the full layout is visible in the overview shot.',
                    ],
                },
                { type: 'image', src: '/blog/multi6-result.jpg', alt: 'Staged bedroom from the first angle.' },
                { type: 'image', src: '/blog/multi5-result2.jpg', alt: 'Same staging from the opposite angle — consistent furniture, style, and layout.' },
                {
                    type: 'p',
                    text: "It's not a perfect workflow — but it's the best one available right now.",
                },
                {
                    type: 'p',
                    text: "Current models have a surprisingly good spatial understanding — but it's inferred from millions of 2D photos, not a true model of the world. They can read perspective, depth, and geometry, but genuinely grasping a room in 3D and thinking consistently across viewpoints is a different level. World models will make that leap. Until then, iteration is part of the workflow. And if you're short on time: one great staged photo beats four inconsistent ones.",
                },
            ],
        },
        de: {
            title: 'Ein Raum, mehrere Blickwinkel. So bleibt die AI konsistent.',
            excerpt: 'Ein Foto zu stagen ist einfach. Die Konsistenz über verschiedene Perspektiven hinweg zu halten — da scheitern die meisten Workflows. Hier ist der Ansatz, der funktioniert.',
            content: [
                {
                    type: 'p',
                    text: "AI-Staging funktioniert wunderbar bei einem einzelnen Bild. Die Herausforderung beginnt, wenn du mehrere Fotos desselben Raumes hast und die gestagten Versionen tatsächlich zusammenpassen sollen. Gleiches Sofa, gleicher Tisch, gleicher Fernseher. Aktuelle KI-Modelle haben kein Gedächtnis zwischen Generierungen — ohne Strategie erfindet die AI bei jedem Bild ihren eigenen Raum. So geht es besser.",
                },
                { type: 'h2', text: 'Schritt 1 — Mit dem besten Überblick starten' },
                {
                    type: 'p',
                    text: "Wähle das Foto, das am meisten vom Raum zeigt: weitester Winkel, klarster Grundriss. Das ist dein Ankerbild — du definierst hier das Staging-Konzept, alles andere folgt daraus.",
                },
                { type: 'image', src: '/blog/multi1-homestaging.jpeg', alt: 'Das Übersichtsbild wird mit Raumtyp, Stil und Zielgruppe in exposé gestagert.' },
                {
                    type: 'p',
                    text: "Stage es mit deinem Stil, Raumtyp und Zielgruppe. Je spezifischer der Prompt, desto kohärenter das Ergebnis über alle Winkel hinweg.",
                },
                {
                    type: 'tip',
                    label: 'Pro-Tipp',
                    text: "Bleib bei 0,5K, solange du noch die Richtung suchst — höhere Auflösung erst wenn das Konzept steht.",
                },
                { type: 'h2', text: 'Schritt 2 — Das gestagte Bild als Inspiration verwenden' },
                {
                    type: 'p',
                    text: 'Zufrieden? Lade das Bild herunter oder kopiere es. Öffne den nächsten Winkel und füge das gestagte Bild als Inspiration hinzu. Im Prompt den Perspektivwechsel explizit benennen — zum Beispiel: \u201eAdd home staging similar to the reference image, but photographed from the opposite side.\u201c',
                },
                { type: 'image', src: '/blog/multi3-add-inspiration.jpeg', alt: 'Das erste gestagte Bild wird als Inspiration für den zweiten Blickwinkel in exposé hinzugefügt.' },
                { type: 'h2', text: 'Schritt 3 — Das Möbel-Layout annotieren' },
                {
                    type: 'p',
                    text: "Bei komplexen Grundrissen oder schwierigen Winkeln machen Annotationen das Ergebnis deutlich zuverlässiger. Wechsle in den Anmerkungsmodus und markiere, wo jedes Möbelstück hingehört.",
                },
                { type: 'image', src: '/blog/multi4-annotate.jpeg', alt: 'Anmerkungsmodus mit Rechteck-Formen und Beschriftungen für Sofa, Tisch und TV-Platzierung.' },
                {
                    type: 'tip',
                    label: 'Pro-Tipp',
                    text: 'Nutze die Mehr-Funktion für einen Batch — Konsistenz findet sich leichter, wenn du Optionen hast.',
                },
                { type: 'h2', text: 'Was am besten funktioniert' },
                {
                    type: 'ul',
                    items: [
                        'Weniger ist mehr — ein aufgeräumter Raum mit wenig Möbeln bietet der AI weniger Fehlerquellen.',
                        'Möbel mittig platzieren, nicht an den Rändern. Die AI weigert sich hartnäckig, angeschnittene Möbel zu zeigen — Stücke, die zentral im Raum stehen, übertragen sich deutlich besser auf andere Perspektiven.',
                        'Sehr ähnliche Winkel oder diametral entgegengesetzte Ansichten (Vorder- und Rückseite).',
                        'Offene Grundrisse, wo das gesamte Layout im Übersichtsbild sichtbar ist.',
                    ],
                },
                { type: 'image', src: '/blog/multi6-result.jpg', alt: 'Gestagtes Schlafzimmer aus dem ersten Blickwinkel.' },
                { type: 'image', src: '/blog/multi5-result2.jpg', alt: 'Dasselbe Staging aus dem entgegengesetzten Winkel — konsistente Möbel, Stil und Layout.' },
                {
                    type: 'p',
                    text: "Kein perfekter Workflow — aber der beste, den es gerade gibt.",
                },
                {
                    type: 'p',
                    text: "Aktuelle Bildmodelle haben ein erstaunlich gutes räumliches Verständnis — aber es ist aus Millionen von 2D-Fotos erschlossen, kein echtes Modell der Welt. Sie können Perspektive, Tiefe und Geometrie lesen, aber einen Raum wirklich in 3D zu begreifen und konsistent über Blickwinkel hinweg zu denken — das ist eine andere Stufe. World Models werden diesen Sprung schaffen. Bis dahin ist Iteration Teil des Workflows. Und wer keine Zeit hat: ein richtig gutes gestagtes Bild schlägt vier inkonsistente immer.",
                },
            ],
        },
    },
    {
        slug: 'visual-prompting-guide',
        category: 'Guide',
        date: 'March 28, 2026',
        isoDate: '2026-03-28',
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
        isoDate: '2026-03-20',
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
        isoDate: '2026-04-01',
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
];
