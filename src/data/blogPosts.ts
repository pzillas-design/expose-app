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
        coverGradient: 'from-stone-950 via-neutral-900 to-zinc-950',
        coverImage: '/blog/multi-cover.jpg',
        featured: true,
        en: {
            title: 'One Room, Multiple Angles. How to Keep the AI Consistent.',
            excerpt: "Staging one photo is easy. Keeping it consistent across multiple perspectives — that's where most workflows fall apart. Here's the approach that works.",
            content: [
                {
                    type: 'p',
                    text: "That AI staging looks impressive on a single photo is no longer a secret. The challenge starts when you have multiple shots of the same room and want the staged versions to actually match. Same sofa, same table, same TV. Current AI models have no memory between generations. Here's the workflow that gets them in line.",
                },
                { type: 'h2', text: '1. Start with the Best Overview' },
                {
                    type: 'p',
                    text: "Always begin with the shot that shows the most of the room. A wide angle or a clearly readable floor plan works as your visual foundation. This image is your anchor — where you establish the style, materials, and atmosphere that will carry through every subsequent perspective.",
                },
                { type: 'image', src: '/blog/multi1-homestaging.jpeg', alt: 'Staging the overview image with room type, style, and audience settings in exposé.' },
                {
                    type: 'tip',
                    label: 'Tip',
                    text: "Use 0.5K resolution while experimenting with different styles. Only switch to high-res once the concept is locked in.",
                },
                { type: 'h2', text: '2. Use the Staged Result as Inspiration' },
                {
                    type: 'p',
                    text: "Got your perfect anchor image? Great. Now it's about transferring that knowledge to the next angle. Instead of letting the AI guess, feed it the finished staging of the first image as Inspiration.",
                },
                {
                    type: 'p',
                    text: 'In your prompt, help the model understand the perspective shift. Be explicit: "Add home staging that matches the reference image, but photograph the room from the opposite side."',
                },
                { type: 'image', src: '/blog/multi3-add-inspiration.jpeg', alt: 'Adding the staged first image as inspiration when working on the second angle in exposé.' },
                { type: 'h2', text: '3. Annotate the Furniture Layout' },
                {
                    type: 'p',
                    text: "For irregular rooms or complex furniture arrangements, a visual reference alone sometimes isn't enough. That's where annotations come in. Switch to Annotation Mode and roughly mark where the sofa, dining table, or sideboard should sit in the new view. This combination of spatial guidance and the visual style from your anchor image is the most reliable path to a coherent result.",
                },
                { type: 'image', src: '/blog/multi4-annotate.jpeg', alt: 'Annotation mode with rectangle shapes and text labels marking sofa, table, and TV placement.' },
                {
                    type: 'tip',
                    text: 'Use the More function to generate a full batch of variants at once.',
                },
                { type: 'h2', text: 'What Works Best' },
                {
                    type: 'p',
                    text: "AI models have a surprisingly good grasp of geometry — but they don't actually think in 3D. These guidelines make it easier for them:",
                },
                {
                    type: 'ul',
                    items: [
                        'Embrace empty space: the tidier the room, the less room the AI has to make mistakes.',
                        'Stay away from edges: place furniture centrally. The AI tends to completely reinterpret objects cropped at the frame edges when the perspective changes.',
                        "And if you're short on time: one perfectly staged photo stands out more than ten half-baked angles.",
                    ],
                },
                { type: 'image', src: '/blog/multi6-result.jpg', alt: 'Staged bedroom from the first angle.' },
                { type: 'image', src: '/blog/multi5-result2.jpg', alt: 'Same staging from the opposite angle — consistent furniture, style, and layout.' },
            ],
        },
        de: {
            title: 'Ein Raum, mehrere Blickwinkel. So bleibt die AI konsistent.',
            excerpt: 'Ein Foto zu stagen ist einfach. Die Konsistenz über verschiedene Perspektiven hinweg zu halten — da scheitern die meisten Workflows. Hier ist der Ansatz, der funktioniert.',
            content: [
                {
                    type: 'p',
                    text: "Dass KI-Staging auf einem einzelnen Foto beeindruckt, ist kein Geheimnis mehr. Die Herausforderung beginnt, wenn du mehrere Fotos desselben Raumes hast und die gestagten Versionen tatsächlich zusammenpassen sollen. Gleiches Sofa, gleicher Tisch, gleicher Fernseher. Aktuelle KI-Modelle haben kein Gedächtnis zwischen Generierungen. Wir zeigen dir den Workflow, mit dem du die KI zur Ordnung rufst.",
                },
                { type: 'h2', text: '1. Mit dem besten Überblick starten' },
                {
                    type: 'p',
                    text: "Beginne immer mit der Aufnahme, die den maximalen Raumüberblick bietet. Ein weiter Winkel oder ein klar erkennbarer Grundriss dienen hier als visuelle Basis. Dieses Bild ist dein Anker – hier legst du den Stil, die Materialien und die Atmosphäre fest, die sich später durch alle weiteren Perspektiven ziehen werden.",
                },
                { type: 'image', src: '/blog/multi1-homestaging.jpeg', alt: 'Das Übersichtsbild wird mit Raumtyp, Stil und Zielgruppe in exposé gestagert.' },
                {
                    type: 'tip',
                    label: 'Tipp',
                    text: "Nutze die 0.5K-Auflösung, während du mit verschiedenen Stilen experimentierst. Erst wenn das Konzept steht, schaltest du für das finale Ergebnis auf High-Res um.",
                },
                { type: 'h2', text: '2. Das gestagte Bild als Inspiration verwenden' },
                {
                    type: 'p',
                    text: "Hast du dein perfektes Ankerbild generiert? Jetzt überträgst du dieses Wissen auf den nächsten Blickwinkel. Anstatt die KI raten zu lassen, gibst du ihr das fertige Staging des ersten Bildes als Inspiration mit — tippe dazu auf das Kamera-Icon und füge es direkt als Referenz hinzu.",
                },
                {
                    type: 'p',
                    text: 'Im Prompt hilfst du dem Modell zusätzlich, den Perspektivwechsel zu verstehen. Formuliere es explizit: \u201eFüge Home Staging hinzu, das dem Referenzbild entspricht, aber fotografiere den Raum von der gegenüberliegenden Seite.\u201c',
                },
                { type: 'image', src: '/blog/multi3-add-inspiration.jpeg', alt: 'Das erste gestagte Bild wird als Inspiration für den zweiten Blickwinkel in exposé hinzugefügt.' },
                { type: 'h2', text: '3. Das Möbel-Layout annotieren' },
                {
                    type: 'p',
                    text: "Bei komplexen Arrangements reicht ein visuelles Referenzbild manchmal nicht aus. Wechsle in den Anmerkungsmodus und markiere grob, wo Sofa, Esstisch oder Sideboard im neuen Blickwinkel stehen sollen — die sicherste Methode für ein stimmiges Ergebnis.",
                },
                { type: 'image', src: '/blog/multi4-annotate.jpeg', alt: 'Anmerkungsmodus mit Rechteck-Formen und Beschriftungen für Sofa, Tisch und TV-Platzierung.' },
                {
                    type: 'tip',
                    text: 'Nutze die \u201eMehr\u201c-Funktion, um direkt einen ganzen Batch an Varianten zu erstellen.',
                },
                { type: 'h2', text: 'Was am besten funktioniert' },
                {
                    type: 'p',
                    text: "KI-Modelle haben ein erstaunliches Verständnis für Geometrie, aber sie \u201edenken\u201c nicht in 3D. Mit diesen Faustregeln machst du es ihnen leichter:",
                },
                {
                    type: 'ul',
                    items: [
                        'Mut zur Lücke: Je aufgeräumter der Raum, desto weniger Interpretationsspielraum hat die KI für Fehler.',
                        'Raus aus den Ecken: Platziere Möbel eher zentral im Bild. Die KI neigt dazu, angeschnittene Objekte an den Bildrändern bei Perspektivwechseln völlig neu zu interpretieren.',
                        'Und wenn die Zeit knapp ist: Ein perfekt gestagtes Foto sticht mehr hervor als zehn halbgare Blickwinkel. ;-)',
                        'Du möchtest noch mehr Kontrolle? Für echte 3D-Geometrie, Licht und Materialien lohnt sich spezialisierte Software — wie <a href="https://www.applydesign.io/" target="_blank" rel="noopener noreferrer" class="text-orange-500 hover:underline">ApplyDesign</a>.',
                    ],
                },
                { type: 'image', src: '/blog/multi6-result.jpg', alt: 'Gestagtes Schlafzimmer aus dem ersten Blickwinkel.' },
                { type: 'image', src: '/blog/multi5-result2.jpg', alt: 'Dasselbe Staging aus dem entgegengesetzten Winkel — konsistente Möbel, Stil und Layout.' },
            ],
        },
    },
    {
        slug: 'visual-prompting-guide',
        category: 'Guide',
        date: 'March 28, 2026',
        isoDate: '2026-03-28',
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
        coverGradient: 'from-violet-950 via-indigo-950 to-slate-950',
        coverImage: '/blog/presets-cover.jpg',
        en: {
            title: 'Presets: Build Once, Use Forever.',
            excerpt: 'Less typing, more picking. How presets let you build a prompt setup once and reuse it in seconds on every project.',
            content: [
                {
                    type: 'p',
                    text: "Let's be honest: even in the most creative jobs, certain steps repeat themselves over and over. Same kind of content, different air freshener. Presets turn that routine into a toolbox. You get faster. More consistent.",
                },
                {
                    type: 'p',
                    text: "Whether it's a new product photo or the next social post: we write the same prompts again and again — when we could use that time to actually refine and sharpen them.",
                },
                { type: 'image', src: '/blog/presets-in-use.jpeg', alt: 'A loaded preset: selected options at the top, the generated image on the right.', caption: 'A preset in use — picked options at the top, the three dots for editing at the bottom.' },
                {
                    type: 'p',
                    text: "With presets you build your perfect prompt setup once, cleanly. You define things like style, mood and audience, and save new ideas and trends straight into the tool — instead of letting them vanish into the void after every project. Later you just pick your template and generate. And because everything is just a click, you can compare variants in seconds instead of typing for minutes.",
                },
                { type: 'h2', text: 'How to Build One' },
                {
                    type: 'p',
                    text: 'At the bottom of the preset area you\'ll find three dots → "Edit Presets". A preset only needs three things:',
                },
                {
                    type: 'p',
                    text: 'Title. So you can find the preset again quickly.',
                },
                {
                    type: 'p',
                    text: 'Main prompt. The instruction that always stays the same. E.g. "Style the room as follows" or "Adjust the outfit". Everything you never want to re-type goes in here.',
                },
                {
                    type: 'p',
                    text: 'Variables. The real game-changer. Ask yourself: what actually changes? The mood? The style? Create variables like "Mood" and feed them with options like calm, energetic, festive.',
                },
                { type: 'image', src: '/blog/presets-editor.png', alt: 'The preset editor with title, main prompt, and variables.' },
                {
                    type: 'tip',
                    label: 'Pro tip',
                    text: 'When your preset works, share it. One click, one link — and the whole team delivers the same standard.',
                },
            ],
        },
        de: {
            title: 'Presets: Einmal bauen, immer nutzen.',
            excerpt: 'Weniger tippen, mehr auswählen. Wie du dir mit Presets ein Prompt-Setup baust, das du bei jedem Projekt in Sekunden wiederverwendest.',
            content: [
                {
                    type: 'p',
                    text: 'Seien wir ehrlich: auch in den kreativsten Jobs wiederholen sich bestimmte Arbeitsschritte immer wieder. Ähnlicher Content, anderer Airfresher. Presets machen aus dieser Routine einen Werkzeugkasten. Du wirst schneller. Konsistenter.',
                },
                {
                    type: 'p',
                    text: 'Egal ob neues Produktfoto oder Social Post: Wir setzen oft dieselben Prompts immer wieder — dabei könnten wir die Zeit nutzen, unsere Prompts zu verfeinern und auszubauen.',
                },
                { type: 'image', src: '/blog/presets-in-use.jpeg', alt: 'Ein geladenes Preset: gewählte Optionen oben, das generierte Bild rechts.', caption: 'Ein Preset in Nutzung — oben die ausgewählten Optionen, unten die drei Punkte zum Bearbeiten.' },
                {
                    type: 'p',
                    text: 'Mit Presets baust du dir dein perfektes Prompt-Setup einmal sauber auf. Du definierst z.B. Stil, Stimmung und Zielgruppe und speicherst neue Ideen und Trends direkt ins Werkzeug ein, statt sie nach jedem Projekt im Nirvana verschwinden zu lassen. Später wählst du nur noch deine Vorlage aus und generierst. Und weil alles nur noch ein Klick ist, kannst du Varianten in Sekunden vergleichen, statt minutenlang zu tippen.',
                },
                { type: 'h2', text: 'So baust du dir eins' },
                {
                    type: 'p',
                    text: 'Unten im Bereich findest du drei Punkte → „Presets bearbeiten". Ein Preset braucht nur drei Dinge:',
                },
                {
                    type: 'p',
                    text: 'Titel. Damit du das Preset schnell wiederfindest.',
                },
                {
                    type: 'p',
                    text: 'Haupt-Prompt. Die Anweisung, die immer gleich bleibt. Z.B. „Gestalte das Zimmer wie folgt" oder „Passe das Outfit an". Alles, was du nie wieder tippen willst, kommt hier rein.',
                },
                {
                    type: 'p',
                    text: 'Variablen. Der eigentliche Gamechanger. Überleg dir: Was ändert sich wirklich? Die Stimmung? Der Stil? Leg Variablen wie „Stimmung" an und füttere sie mit Optionen wie ruhig, energetisch oder festlich.',
                },
                { type: 'image', src: '/blog/presets-editor.png', alt: 'Der Preset-Editor mit Titel, Haupt-Prompt und Variablen.' },
                {
                    type: 'tip',
                    label: 'Pro-Tipp',
                    text: 'Wenn dein Preset sitzt, teil es mit dem Team. Ein Klick, ein Link — und alle liefern denselben Standard.',
                },
            ],
        },
    },
    {
        slug: 'reference-images-style-matching',
        category: 'Guide',
        date: 'April 1, 2026',
        isoDate: '2026-04-01',
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
