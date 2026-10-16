import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef, memo } from 'react';
import { ChevronLeft, ChevronRight, Download, Info, Trash2, MoreHorizontal, Type, Square, Circle, Minus, Brush, Trash, Check, Shapes, X, Repeat } from 'lucide-react';
import { CanvasImage } from '@/types';
import { SideSheet } from '@/components/sidesheet/SideSheet';
import { useMobile } from '@/hooks/useMobile';
import { Theme, Typo, Tooltip, RoundIconButton, Button } from '@/components/ui/DesignSystem';
import { useItemDialog } from '@/components/ui/Dialog';
import { EditorCanvas } from '@/components/canvas/EditorCanvas';
import { ObjectsTab } from '@/components/sidesheet/ObjectsTab';
import { BlobBackground } from '@/components/ui/BlobBackground';
import { GenerationProgressBar } from '@/components/canvas/ImageItem';
import { useToast } from '@/components/ui/Toast';import { stackIdOf } from '@/utils/stacks';


/* ── Circular progress for thumb strip generating placeholders ── */
const ThumbCircularProgress: React.FC<{ startTime?: number; estimatedDuration?: number }> = ({ startTime, estimatedDuration }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!startTime) return;
        const duration = estimatedDuration || 60000;
        let rafId: number;
        const tick = () => {
            const elapsed = Date.now() - startTime;
            const raw = elapsed / duration;
            const capped = 1 - Math.exp(-raw * 1.5);
            setProgress(Math.min(capped * 0.85, 0.85));
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [startTime, estimatedDuration]);

    const r = 9;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - progress);

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: 'rotate(-90deg)' }}>
                {/* Track */}
                <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
                {/* Fill */}
                <circle
                    cx="12" cy="12" r={r} fill="none"
                    stroke="rgba(255,255,255,1)" strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'none' }}
                />
            </svg>
        </div>
    );
};

/* ── Memoised thumbnail button ── */
const ThumbButton = memo<{ id: string; src: string; isActive: boolean; isNew?: boolean; leaving?: boolean; thumbOpacity: number; onSelect: (id: string) => void }>(
    ({ id, src, isActive, isNew, leaving, thumbOpacity, onSelect }) => {
        const [hovered, setHovered] = useState(false);
        const [mounted, setMounted] = useState(false);
        useEffect(() => {
            const raf = requestAnimationFrame(() => setMounted(true));
            return () => cancelAnimationFrame(raf);
        }, []);
        const collapseEase = 'cubic-bezier(0.4, 0, 0.2, 1)';
        // Width/margin: entering thumbs jump instantly to full size so offsetLeft is immediately
        // correct for scroll centering. Only leaving thumbs animate width to 0.
        const wrapperWidth = leaving ? '0px' : '36px';
        const wrapperMargin = leaving ? '0px' : '8px';
        const active = mounted && !leaving;
        const invisible = thumbOpacity === 0;
        const displayOpacity = leaving ? 0 : (isActive ? 1 : hovered ? Math.max(thumbOpacity, 0.85) : thumbOpacity);
        const btnTransition = hovered || leaving || displayOpacity === thumbOpacity
            ? `opacity 200ms ease, transform 200ms ease`
            : 'opacity 300ms ease, transform 150ms ease';
        return (
            <div
                className="shrink-0 overflow-visible h-9 flex items-center"
                style={{
                    width: wrapperWidth,
                    marginRight: wrapperMargin,
                    transition: leaving ? `width 300ms ${collapseEase}, margin 300ms ${collapseEase}` : 'none',
                    scrollSnapAlign: 'center',
                }}
            >
                <button
                    data-thumb-id={id}
                    onClick={() => { if (!leaving) onSelect(id); }}
                    onMouseEnter={() => { if (!invisible && !leaving) setHovered(true); }}
                    onMouseLeave={() => setHovered(false)}
                    style={{
                        opacity: displayOpacity,
                        transform: `scale(${leaving ? 0.6 : (active ? (isActive ? 1.1 : 0.9) : 0.6)})`,
                        transition: btnTransition,
                        pointerEvents: leaving ? 'none' : undefined,
                    }}
                    className={`relative h-9 w-9 rounded-[3px] overflow-hidden outline-none${isActive && !leaving ? ' ring-2 ring-orange-600 ring-offset-2 ring-offset-white dark:ring-offset-black z-10' : ''}${invisible ? ' pointer-events-none' : ''}`}
                >
                    <img src={src} decoding="async" className="w-full h-full object-cover" />
                    {isNew && (
                        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-orange-400 to-red-500 pointer-events-none" />
                    )}
                </button>
            </div>
        );
    }
);
ThumbButton.displayName = 'ThumbButton';

/* ── Memoised generating thumbnail ── */
const GeneratingThumb = memo<{ id: string; pSrc?: string; isActive: boolean; thumbOpacity: number; startTime?: number; estimatedDuration?: number; onSelect: (id: string) => void }>(
    ({ id, pSrc, isActive, thumbOpacity, startTime, estimatedDuration, onSelect }) => {
        const [hovered, setHovered] = useState(false);
        const [mounted, setMounted] = useState(false);
        useEffect(() => {
            const raf = requestAnimationFrame(() => setMounted(true));
            return () => cancelAnimationFrame(raf);
        }, []);
        const invisible = thumbOpacity === 0;
        const displayOpacity = isActive ? 1 : hovered ? Math.max(thumbOpacity, 0.85) : thumbOpacity;
        const springEase = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
        return (
            // Wrapper is full-width immediately so offsetLeft is stable for scroll centering.
            // Visual animation runs on the button via opacity/scale only.
            <div
                className="shrink-0 overflow-visible h-9 flex items-center"
                style={{
                    width: '36px',
                    marginRight: '8px',
                    transition: 'none',
                    scrollSnapAlign: 'center',
                }}
            >
                <button
                    data-thumb-id={id}
                    onClick={() => onSelect(id)}
                    onMouseEnter={() => { if (!invisible) setHovered(true); }}
                    onMouseLeave={() => setHovered(false)}
                    style={{
                        opacity: mounted ? displayOpacity : 0,
                        transform: `scale(${mounted ? (isActive ? 1.1 : 0.9) : 0.6})`,
                        transition: `opacity 300ms ease, transform 320ms ${springEase}`,
                    }}
                    className={`relative h-9 w-9 rounded-[3px] overflow-hidden outline-none${isActive ? ' ring-2 ring-orange-600 ring-offset-2 ring-offset-white dark:ring-offset-black z-10' : ''}${invisible ? ' pointer-events-none' : ''}`}
                >
                    {pSrc ? (
                        <img src={pSrc} className="w-full h-full object-cover blur-sm brightness-75 scale-110" alt="" />
                    ) : (
                        <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                    )}
                    <ThumbCircularProgress startTime={startTime} estimatedDuration={estimatedDuration} />
                </button>
            </div>
        );
    }
);
GeneratingThumb.displayName = 'GeneratingThumb';

interface DetailPageProps {
    images: CanvasImage[];
    selectedId: string;
    onBack: () => void;
    onSelectImage: (id: string) => void;
    onDelete: (id: string) => void;
    onDownload: (id: string) => void;
    onInfo: (id: string) => void;
    /** Der Kopf, der im Blatt sitzt — kommt fertig von App (siehe dort). */
    headerSlot?: React.ReactNode;
    onSidebarWidthChange?: (w: number) => void;
    isSideSheetVisible?: boolean;
    onSideSheetVisibleChange?: (v: boolean) => void;
    isExiting?: boolean;
    hasMore?: boolean;
    onLoadMore?: () => void;

    // SideSheet Props (pass-through)
    state: any;
    actions: any;
    t: any;
}

/**
 * Die schwebenden Knoepfe ueber dem Bild.
 *
 * Immer sichtbar, auf jedem Untergrund — mit einer Regel statt mehrerer.
 *
 * Der Kniff ist `backdrop-contrast(0.78)`: Kontrast senken zieht jeden Tonwert
 * zur Mitte. Schwarz wird dadurch grau, Weiss ebenfalls. Die Flaeche hebt sich
 * also von selbst ab, egal was darunter liegt — ohne Fallunterscheidung, ohne
 * Rahmen, ohne eine Farbe, die auf der einen Haelfte der Bilder falsch ist.
 *
 * Eine feste Fuellung kann das nicht: Schwarz auf Schwarz bleibt unsichtbar,
 * Weiss auf einem Schneebild ebenso. Beides hatten wir, und beides war nur fuer
 * die Haelfte der Motive richtig.
 *
 * Dazu eine sehr schwache helle Fuellung fuer mittlere Tonwerte, wo das Senken
 * des Kontrasts wenig bewirkt, und ein leichter Schlagschatten am Zeichen.
 *
 * Der Wert ist bewusst nah an 1: Bei 0,55 hoben sich die Knoepfe auf schwarzem
 * Grund als deutlich helle Scheiben ab — sichtbar ja, aber lauter als das Bild,
 * ueber dem sie liegen. Sie sollen auffindbar sein, nicht auffallen.
 */
const FLOATING_BTN_BASE = `text-white rounded-full flex items-center
    backdrop-blur-md backdrop-contrast-[0.78] backdrop-brightness-105 backdrop-saturate-[0.95]
    bg-white/[0.04] hover:bg-white/[0.10]
    [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]
    transition-[background-color] duration-150`;

const FLOATING_BTN = `${FLOATING_BTN_BASE} h-9 px-4 text-xs font-medium`;

/** Dasselbe als quadratischer Knopf fuer ein einzelnes Symbol. */
const FLOATING_BTN_ICON = `${FLOATING_BTN_BASE} h-9 w-9 justify-center`;

/**
 * Die Pfeile zum Blaettern: links und rechts am Rand, senkrecht in der Mitte.
 *
 * Vor und Zurueck sind gegenlaeufige Richtungen. Nebeneinander in einer Reihe
 * unten waren sie das nicht mehr — und der Weg der Maus war fuer beide gleich
 * weit nach unten statt zur jeweiligen Seite.
 *
 * Ohne Weichzeichner, anders als die uebrigen schwebenden Knoepfe: Diese hier
 * liegen IMMER ueber dem Bild, und ein verwaschener Fleck, der staendig da ist,
 * faellt mehr auf als eine ruhige dunkle Scheibe.
 *
 * Die Scheibe ist dunkler als zuvor (45 statt 25 Prozent), der Zug als Ganzes
 * dafuer leiser (35 statt 60). Ein kraeftiger Kreis bei geringer Deckkraft
 * bleibt auf hellen wie dunklen Bildern lesbar, waehrend ein heller Kreis bei
 * hoher Deckkraft auf einer weissen Wand verschwindet.
 *
 * Dazu eine Klickflaeche, die ueber den sichtbaren Kreis hinausgeht —
 * getroffen wird mit der Maus im Lauf, nicht mit dem Zirkel.
 */
const FLOATING_ARROW = `text-white rounded-full flex items-center justify-center
    absolute top-1/2 -translate-y-1/2 z-40 h-12 w-12
    bg-black/45 hover:bg-black/65
    [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]
    transition-[background-color] duration-150
    pointer-events-auto
    before:absolute before:-inset-2 before:content-['']`;

export const DetailPage: React.FC<DetailPageProps> = ({
    images, selectedId, onBack, onSelectImage, onDelete, onDownload, onInfo, onSidebarWidthChange, headerSlot,
    isSideSheetVisible: isSideSheetVisibleProp, onSideSheetVisibleChange, isExiting,
    hasMore, onLoadMore,
    state, actions, t
}) => {
    const isMobile = useMobile();
    const { showToast } = useToast();
    const [loadedImageId, setLoadedImageId] = useState<string | null>(null);
    const isMainLoaded = loadedImageId === selectedId;
    // Track previous loaded image src so it stays visible during navigation flicker
    const prevLoadedSrcRef = useRef<string | null>(null);
    const [subMenu, setSubMenu] = useState<'text' | 'shapes' | 'brush'>('text');
    // SideSheet visibility — controlled from outside if prop provided
    const [isSideSheetVisibleLocal, setIsSideSheetVisibleLocal] = useState(true);
    const isSideSheetVisible = isSideSheetVisibleProp ?? isSideSheetVisibleLocal;
    const setIsSideSheetVisible = (v: boolean) => {
        setIsSideSheetVisibleLocal(v);
        onSideSheetVisibleChange?.(v);
    };
    // Brush mode visually hides the sidesheet to give canvas full width
    const isSideSheetActuallyVisible = isSideSheetVisible && state.sideSheetMode !== 'brush';

    // O(1) lookups via Map instead of O(n) find/findIndex on every render
    const imageMap = useMemo(() => new Map(images.map(i => [i.id, i])), [images]);

    // Die EINE Liste, auf der sich Pfeile, Thumbnail-Leiste und Nachladen
    // bewegen. Vorher stand dieser Filter dreimal im File und die Pfeile
    // benutzten ihn gar nicht — ein Bild ohne Vorschau war damit per Pfeil
    // erreichbar, in der Leiste aber unsichtbar, und der Markierungsindex
    // verschob sich.
    //
    // Platzhalter gehören ausdrücklich dazu: Sie sind vollwertige Einträge,
    // nur eben noch ohne Bild. Würden sie fehlen, übersprängen die Pfeile
    // gerade entstehende Varianten.
    const navigableImages = useMemo(
        () => images.filter(i => i.isGenerating || i.thumbSrc || i.src),
        [images],
    );
    const imageIndexMap = useMemo(
        () => new Map(navigableImages.map((i, idx) => [i.id, idx])),
        [navigableImages],
    );

    // Thumbstrip: render ALL displayable images — stable DOM width prevents layout shifts from mx-auto
    // opacity-0 items beyond ±8 are pointer-events-none so they cost nothing at runtime
    const stripImages = useMemo(() => {
        const displayable = navigableImages;
        const currentIdx = imageIndexMap.get(selectedId) ?? -1;
        return displayable.map((img, index) => ({
            img,
            distance: currentIdx === -1 ? 0 : Math.abs(index - currentIdx),
        }));
    }, [images, selectedId]);

    // Track thumbnails that just left stripImages so we can animate them out
    const leavingThumbsRef = useRef<Map<string, { img: CanvasImage; index: number }>>(new Map());
    const [leavingThumbs, setLeavingThumbs] = useState<Map<string, { img: CanvasImage; index: number }>>(new Map());
    const prevStripRef = useRef<Array<{ img: CanvasImage; distance: number }>>([]);
    useEffect(() => {
        const currentIds = new Set(stripImages.map(s => s.img.id));
        let changed = false;
        prevStripRef.current.forEach(({ img }, index) => {
            if (!currentIds.has(img.id) && !leavingThumbsRef.current.has(img.id)) {
                leavingThumbsRef.current.set(img.id, { img, index });
                changed = true;
                setTimeout(() => {
                    leavingThumbsRef.current.delete(img.id);
                    setLeavingThumbs(new Map(leavingThumbsRef.current));
                }, 380);
            }
        });
        if (changed) setLeavingThumbs(new Map(leavingThumbsRef.current));
        prevStripRef.current = stripImages;
    }, [stripImages]);

    // Merged strip: interleave leaving thumbs at their original positions
    const combinedStrip = useMemo(() => {
        const result: Array<{ img: CanvasImage; distance: number; leaving: boolean }> =
            stripImages.map(s => ({ ...s, leaving: false }));
        leavingThumbs.forEach(({ img, index }) => {
            const insertAt = Math.min(index, result.length);
            result.splice(insertAt, 0, { img, distance: 99, leaving: true });
        });
        return result;
    }, [stripImages, leavingThumbs]);

    // Suppress zoom animation when navigating within the detail view (only show on first entry from grid).
    // Reset only when the image actually finishes loading — not on selectedId change — so that all
    // intermediate re-renders during loading (imgNaturalDims, displayBox, etc.) also stay suppressed.
    const suppressEntryAnimRef = useRef(false);
    useEffect(() => { if (isMainLoaded) suppressEntryAnimRef.current = false; }, [isMainLoaded]);

    // Art des Übergangs beim Bildwechsel. Innerhalb eines Stapels vergleicht
    // man Varianten — jede Bewegung stört dabei, also wird sofort gewechselt.
    // Beim Wechsel in einen anderen Stapel macht ein kurzes Wischen spürbar,
    // dass man das Objekt verlassen hat.
    const transitionRef = useRef<'none' | 'next' | 'prev'>('none');
    const [transition, setTransition] = useState<'none' | 'next' | 'prev'>('none');
    useEffect(() => { setTransition(transitionRef.current); }, [selectedId]);

    const handleSelectWithin = useCallback((id: string) => {
        suppressEntryAnimRef.current = true;
        transitionRef.current = 'none';
        onSelectImage(id);
    }, [onSelectImage]);

    // Right-click on the canvas overlay → briefly disable the overlay's pointer-events
    // so the contextmenu event lands on the underlying <img>, which makes the browser
    // show its native image menu ("Copy Image", "Save As…", "Open in New Tab").
    //
    // Synthesizing a contextmenu via dispatchEvent doesn't work in modern browsers —
    // they only show the native menu for *trusted* user-initiated events. So instead
    // we sidestep the overlay just-in-time using mousedown (button===2 = right click,
    // fires synchronously *before* contextmenu).
    const handleOverlayMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 2) return;
        const overlay = e.currentTarget;
        const prev = overlay.style.pointerEvents;
        overlay.style.pointerEvents = 'none';
        // Restore after the contextmenu has fired (a few ms is plenty).
        window.setTimeout(() => { overlay.style.pointerEvents = prev; }, 80);
    }, []);

    const img = imageMap.get(selectedId);
    const idx = imageIndexMap.get(selectedId) ?? -1;

    // Keep a live ref so the debounced onBack guard can re-check after a tick.
    const imgRef = useRef(img);
    useEffect(() => { imgRef.current = img; }, [img]);
    const { confirm } = useItemDialog();

    // Track generating children of current image
    /**
     * Schreibt der Nutzer gerade in ein Feld (Prompt, Titel)? Dann darf die
     * Ansicht nicht wechseln — der Cursor würde mitten im Satz herausgerissen.
     * Gilt für beide Sprünge: zum Platzhalter beim Start und zum Ergebnis am
     * Ende. Dieselbe Regel steckt in useGeneration für den dortigen Pfad.
     */
    const isTypingNow = useCallback((): boolean => {
        if (typeof document === 'undefined') return false;
        const el = document.activeElement as HTMLElement | null;
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'TEXTAREA'
            || (tag === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'range', 'file'].includes((el as HTMLInputElement).type))
            || el.isContentEditable;
    }, []);

    const generatingChild = useMemo(() =>
        img ? images.find(i => i.parentId === img.id && i.isGenerating) : undefined,
        [images, img]
    );
    /**
     * Begleitet eine laufende Generierung: beim Start auf den Platzhalter
     * wechseln, am Ende auf das Ergebnis — sofern der Nutzer zwischendurch
     * nicht selbst woanders hingegangen ist.
     *
     * Die verfolgte Generierung wird über ihre ID nachgeschlagen, NICHT über
     * generatingChild. Letzteres sucht Kinder des gerade angezeigten Bildes und
     * ist leer, sobald man den Platzhalter selbst ansieht — der Code hielt die
     * Generierung dann für beendet, verwarf den Merker, und beim nächsten
     * Schritt auf das Quellbild galt sie als neu entdeckt. Ergebnis war eine
     * Falle: Ein Pfeil in Richtung Quellbild warf einen sofort zum Platzhalter
     * zurück, während die Gegenrichtung funktionierte.
     *
     * Zusätzlich merkt sich autoJumpedRef jeden Platzhalter, zu dem bereits
     * gesprungen wurde. Derselbe Sprung passiert damit höchstens einmal, egal
     * wie oft man danach am Quellbild vorbeikommt.
     */
    const trackedGenRef = useRef<{ childId: string; parentId: string } | null>(null);
    const autoJumpedRef = useRef<Set<string>>(new Set());
    const navHappenedDuringGenRef = useRef(false);

    /**
     * Beim Oeffnen laufende Generierungen gelten als bereits gesehen.
     *
     * Der Sprung zum Platzhalter gilt der Generierung, die man GERADE hier
     * ausgeloest hat. Lief sie schon, als die Ansicht aufging, hat der Nutzer
     * bewusst ein anderes Bild angetippt — und landete trotzdem auf dem
     * Ladebildschirm, weil der Platzhalter ein Kind des geoeffneten Bildes ist.
     * Aus der Galerie heraus traf das jedes Mal zu: Die Ansicht wird neu
     * aufgebaut, der Merker gegen Wiederholungen ist dann leer.
     *
     * Ein Layout-Effekt, nicht useEffect: Er laeuft vor dem Effekt unten, der
     * sonst im selben Durchgang schon gesprungen waere.
     */
    const seededRef = useRef(false);
    useLayoutEffect(() => {
        // Erst wenn ueberhaupt Bilder da sind: Bei einem Direktaufruf steht die
        // Liste anfangs leer, und ein Merker aus einer leeren Liste merkt nichts.
        if (seededRef.current || images.length === 0) return;
        seededRef.current = true;
        images.forEach(i => { if (i.isGenerating) autoJumpedRef.current.add(i.id); });
    }, [images]);

    useEffect(() => {
        // Neue Generierung am aktuell angezeigten Bild entdeckt
        if (generatingChild && !trackedGenRef.current && !autoJumpedRef.current.has(generatingChild.id)) {
            trackedGenRef.current = { childId: generatingChild.id, parentId: selectedId };
            navHappenedDuringGenRef.current = false;
            if (selectedId !== generatingChild.id && !isTypingNow()) {
                autoJumpedRef.current.add(generatingChild.id);
                onSelectImage(generatingChild.id);
            }
            return;
        }

        const tracked = trackedGenRef.current;
        if (!tracked) return;

        const trackedImage = imageMap.get(tracked.childId);
        // Fehlt das Bild (noch nicht geladen), weiter abwarten statt abbrechen.
        if (!trackedImage) return;

        if (trackedImage.isGenerating) {
            // Weder Quellbild noch Platzhalter: Der Nutzer ist selbst woanders
            // hingegangen, der Sprung zum Ergebnis entfällt.
            if (selectedId !== tracked.parentId && selectedId !== tracked.childId) {
                navHappenedDuringGenRef.current = true;
            }
            return;
        }

        // Fertig
        const userNavigated = navHappenedDuringGenRef.current
            || (selectedId !== tracked.parentId && selectedId !== tracked.childId);
        trackedGenRef.current = null;
        navHappenedDuringGenRef.current = false;
        if (userNavigated || isTypingNow()) return;
        // Steht die Ansicht schon auf dem Platzhalter, ist das ein Nichtstun —
        // er wird an Ort und Stelle zum fertigen Bild.
        //
        // Die Eingabe wird dabei NICHT mehr ausgeblendet. Das sollte einmal das
        // Ergebnis gross zeigen, war aber eine Ansichtsaenderung, die niemand
        // angefordert hat — und seit es drei Ansichtsmodi gibt, wirft sie den
        // Nutzer aus dem, den er eingestellt hat. Wer das fertige Bild gross
        // sehen will, hat dafuer den Vollbildmodus.
        onSelectImage(tracked.childId);
    }, [generatingChild, imageMap, selectedId, onSelectImage, isTypingNow]);
    const imageViewportRef = useRef<HTMLDivElement>(null);
    // Im Zeilenmodus wird die Bildhoehe gesetzt statt gemessen. Gemessen wird
    // deshalb der Hauptbereich: Wuerde der Bildbereich sich selbst messen,
    // nachdem seine Hoehe aus dieser Messung stammt, liefe beides im Kreis.
    const mainRef = useRef<HTMLDivElement>(null);

    // Keep blob visible after generation completes until the real image has loaded
    const prevIsGeneratingRef = useRef<boolean>(false);
    const prevSelectedIdRef = useRef<string>('');
    const thumbStripRef = useRef<HTMLDivElement>(null);
    const [waitingForGeneratedLoad, setWaitingForGeneratedLoad] = useState<string | null>(null);
    useEffect(() => {
        // If selectedId changed, reset tracking state before checking transition
        if (prevSelectedIdRef.current !== selectedId) {
            prevSelectedIdRef.current = selectedId;
            prevIsGeneratingRef.current = img?.isGenerating ?? false;
            setWaitingForGeneratedLoad(null);
            return;
        }
        const wasGenerating = prevIsGeneratingRef.current;
        prevIsGeneratingRef.current = img?.isGenerating ?? false;
        if (wasGenerating && !img?.isGenerating && img?.src) {
            setWaitingForGeneratedLoad(selectedId);
            setLoadedImageId(null); // reset so image fades in via onLoad
        }
    }, [img?.isGenerating, selectedId]);
    const showBlob = img?.isGenerating || waitingForGeneratedLoad === selectedId;

    /**
     * Punktereihe statt Zaehlung im Kopf.
     *
     * Nur bis zwoelf Bilder: Darueber ist eine Punktereihe keine Auskunft mehr,
     * sondern ein Muster, und die einzelnen Punkte waeren kleiner als der
     * Unterschied, den sie zeigen sollen.
     */
    const showDots = !isMobile && images.length > 1 && images.length <= 12;

    const thumbStripInnerRef = useRef<HTMLDivElement>(null);
    // First-mount flag: use instant scroll on entry, smooth on subsequent navigation
    const isFirstStripScrollRef = useRef(true);
    // Suppress the scroll-end → handleSelectWithin reaction while we're programmatically
    // scrolling the strip to recenter (otherwise the centering effect fights itself).
    const isProgrammaticScrollRef = useRef(false);
    // Clear the programmatic-scroll guard on the real scrollend (with a timeout
    // fallback) instead of a fixed delay — a fixed delay can expire mid-animation
    // and let scroll-selection hijack to an intermediate thumb (multi-thumb jumps).
    const scrollEndTimerRef = useRef<number | null>(null);
    const scrollEndHandlerRef = useRef<(() => void) | null>(null);
    // Marks selectedId changes that came from the user's own horizontal scroll —
    // those don't need the centering effect to reposition the strip (the user is
    // already mid-scroll, snapping it back would jerk).
    const userScrollSelectionRef = useRef(false);

    // Fallback: also load more when active image (via thumb click / arrow keys) is near
    // the end of the loaded list, so non-scroll navigation still triggers paging.
    useEffect(() => {
        if (!hasMore || !onLoadMore) return;
        const idx = imageIndexMap.get(selectedId) ?? -1;
        if (idx === -1) return;
        if (navigableImages.length - idx <= 20) onLoadMore();
    }, [selectedId, navigableImages, imageIndexMap, hasMore, onLoadMore]);

    // Track actual image dimensions — initialized from DB values, updated from real load.
    // Also preloads via Image() so displayBox can be computed even when the visible <img>
    // hasn't been inserted into the DOM yet (chicken-and-egg with the displayBox guard).
    const [imgNaturalDims, setImgNaturalDims] = useState({ width: img?.width || 0, height: img?.height || 0 });
    useEffect(() => {
        if (!img?.src) return;
        // If we already have valid DB dimensions, use them immediately
        if (img.width && img.height) {
            setImgNaturalDims({ width: img.width, height: img.height });
            return;
        }
        // Fallback: preload to discover natural dimensions when DB values are missing
        const preload = new window.Image();
        preload.onload = () => {
            if (preload.naturalWidth > 0 && preload.naturalHeight > 0)
                setImgNaturalDims({ width: preload.naturalWidth, height: preload.naturalHeight });
        };
        preload.src = img.src;
    }, [img?.src, img?.width, img?.height]);

    const logicalDims = useMemo(() => ({
        width: img?.width || 0,
        height: img?.height || 0
    }), [img?.width, img?.height]);

    const [displayBox, setDisplayBox] = useState({ width: 0, height: 0 });
    /**
     * Abstand der Bildoberkante zur Oberkante ihres Bereichs.
     *
     * Die Eingabe legt sich in der Spaltenansicht an diese Linie, damit beide
     * auf derselben Hoehe beginnen. Das Bild bleibt mittig — bewegt wird die
     * Eingabe.
     *
     * Der Wert haengt am Seitenverhaeltnis und aendert sich damit beim
     * Blaettern. Deshalb gleitet die Eingabe weich an ihre neue Lage, statt zu
     * springen, und waehrend man im Feld schreibt, aendert sich ohnehin nichts
     * daran — die Hoehe des Bildes haengt nicht am Text.
     */
    const [imageTopOffset, setImageTopOffset] = useState(0);
    /** Innenabstand oben im Panel (pt-6 in SideSheet) — zaehlt bereits mit. */
    const PANEL_INNER_PT = 24;

    // In annotation mode (brush/text/shapes) the bottom toolbars float over the image.
    // Reserve this many pixels at the bottom so the image scales to fit above them.
    const BRUSH_BOTTOM_RESERVE = 176;

    const updateDisplayBox = useCallback(() => {
        const viewport = imageViewportRef.current;
        if (!viewport || imgNaturalDims.width <= 0 || imgNaturalDims.height <= 0) return;

        const viewportWidth = viewport.clientWidth;
        const reservedBottom = state.sideSheetMode === 'brush' ? BRUSH_BOTTOM_RESERVE : 0;
        const viewportHeight = viewport.clientHeight - reservedBottom;
        if (viewportWidth <= 0 || viewportHeight <= 0) return;

        const scale = Math.min(
            viewportWidth / imgNaturalDims.width,
            viewportHeight / imgNaturalDims.height
        );

        const boxHeight = Math.max(1, Math.round(imgNaturalDims.height * scale));
        setDisplayBox({
            width: Math.max(1, Math.round(imgNaturalDims.width * scale)),
            height: boxHeight
        });
        // Wie weit die Oberkante des Bildes von der Oberkante seines Bereichs
        // entfernt ist. Das Bild steht mittig; die Eingabe daneben legt sich an
        // diese Linie an, damit beide auf derselben Hoehe beginnen.
        setImageTopOffset(Math.max(0, Math.round((viewport.clientHeight - boxHeight) / 2)));
    }, [imgNaturalDims.height, imgNaturalDims.width, state.sideSheetMode]);

    useEffect(() => {
        updateDisplayBox();
        const viewport = imageViewportRef.current;
        if (!viewport) return;

        const observer = new ResizeObserver(() => updateDisplayBox());
        observer.observe(viewport);
        window.addEventListener('resize', updateDisplayBox);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateDisplayBox);
        };
    }, [updateDisplayBox]);

    useEffect(() => {
        if (state.sideSheetMode === 'brush') {
            actions.setMaskTool(subMenu === 'brush' ? 'brush' : subMenu === 'text' ? 'text' : 'select');
        }
    }, [subMenu, state.sideSheetMode, actions]);

    const generateId = () => Math.random().toString(36).substring(2, 9);

    const handleAddObjectCenter = (label: string, itemId: string, icon?: string) => {
        if (!img) return;
        const cx = logicalDims.width / 2;
        const cy = logicalDims.height / 2;
        const newAnn: any = { id: generateId(), type: 'stamp', x: cx, y: cy, text: label, itemId, emoji: icon, color: '#fff', strokeWidth: 0, points: [], createdAt: Date.now() };
        actions.handleUpdateAnnotations(img.id, [...(img.annotations || []), newAnn]);
        actions.setMaskTool('select');
    };

    const handleAddText = () => {
        if (!img) return;
        const cx = logicalDims.width / 2;
        const cy = logicalDims.height / 2;
        const newText: any = { id: generateId(), type: 'stamp', x: cx, y: cy, text: '', color: '#fff', strokeWidth: 4, points: [], createdAt: Date.now() };
        actions.handleUpdateAnnotations(img.id, [...(img.annotations || []), newText]);
        actions.setMaskTool('select');
    };

    const handleAddShape = (shape: 'rect' | 'circle' | 'line') => {
        if (!img) return;
        // Use the logical image space that is persisted and exported.
        const cx = logicalDims.width / 2;
        const cy = logicalDims.height / 2;
        const size = Math.min(logicalDims.width, logicalDims.height) * 0.3;
        const half = size / 2;
        let newShape: any;
        if (shape === 'line') {
            newShape = { id: generateId(), type: 'shape', shapeType: 'line', points: [{ x: cx - half, y: cy }, { x: cx + half, y: cy }], strokeWidth: 4, color: '#fff', createdAt: Date.now() };
        } else if (shape === 'rect') {
            const x = cx - half, y = cy - half;
            newShape = { id: generateId(), type: 'shape', shapeType: 'rect', points: [{ x, y }, { x: x + size, y }, { x: x + size, y: y + size }, { x, y: y + size }], strokeWidth: 4, color: '#fff', createdAt: Date.now() };
        } else {
            newShape = { id: generateId(), type: 'shape', shapeType: 'circle', x: cx - half, y: cy - half, width: size, height: size, points: [], strokeWidth: 4, color: '#fff', createdAt: Date.now() };
        }
        actions.handleUpdateAnnotations(img.id, [...(img.annotations || []), newShape]);
        actions.setMaskTool('select');
    };

    // Sync global activeId is now exclusively handled by App.tsx to prevent race conditions

    // Deep-link support: ensure the missing image is fetched
    useEffect(() => {
        if (!img && selectedId && actions.ensureImageLoaded) {
            actions.ensureImageLoaded(selectedId);
        }
    }, [selectedId, img, actions.ensureImageLoaded]);


    // Reset load state on image change and check cache
    useEffect(() => {
        setSubMenu('text');

        const imEl = document.getElementById(`detail-img-${selectedId}`) as HTMLImageElement;
        if (imEl && imEl.complete && imEl.naturalWidth > 0 && imEl.src && !imEl.src.includes('data:image/gif')) {
            setLoadedImageId(selectedId);
        } else {
            setLoadedImageId(null);
        }

        // Fallback in case onLoad never fires (cached images, errors, etc.)
        const fallbackTimer = setTimeout(() => {
            const el = document.getElementById(`detail-img-${selectedId}`) as HTMLImageElement;
            if (el) {
                setLoadedImageId(selectedId);
                setWaitingForGeneratedLoad(null);
            }
        }, 800);

        return () => clearTimeout(fallbackTimer);
    }, [selectedId]);

    const navigate = useCallback((d: 1 | -1) => {
        const n = idx + d;
        if (n < 0 || n >= navigableImages.length) return;
        const from = navigableImages[idx];
        const to = navigableImages[n];
        // Gleicher Stapel → sofort, damit der Vergleich nicht gestört wird.
        const crossesStack = !!from && !!to && stackIdOf(from) !== stackIdOf(to);
        suppressEntryAnimRef.current = true;
        transitionRef.current = crossesStack ? (d === 1 ? 'next' : 'prev') : 'none';
        onSelectImage(to.id);
    }, [idx, navigableImages, onSelectImage]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            // Ignore OS key auto-repeat — a held/bounced arrow key would otherwise
            // fire several navigations from one press ("jumps too many photos").
            if (e.repeat) return;
            // Ignore if an input or textarea is focused
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            // Annotation Mode Escape/Enter
            if (state.sideSheetMode === 'brush') {
                if (e.key === 'Escape' || e.key === 'Enter') {
                    e.preventDefault();
                    actions.setSideSheetMode('prompt');
                    return;
                }
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                onBack();
                return;
            }

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    navigate(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    navigate(1);
                    break;
                case 'a':
                case 'A':
                    if (!e.metaKey && !e.ctrlKey && !e.altKey && isSideSheetVisible) {
                        e.preventDefault();
                        actions.handleModeChange(state.sideSheetMode === 'brush' ? 'prompt' : 'brush');
                    }
                    break;
                case 'm':
                case 'M':
                    if (!e.metaKey && !e.ctrlKey && !e.altKey) {
                        e.preventDefault();
                        if (selectedId) actions.handleGenerateMore(selectedId);
                    }
                    break;
                case 'd':
                case 'D':
                    if (!e.metaKey && !e.ctrlKey && !e.altKey) {
                        e.preventDefault();
                        if (selectedId) onDownload(selectedId);
                    }
                    break;
                case 'Backspace':
                case 'Delete':
                    e.preventDefault();
                    // Navigation after delete is handled by handleDeleteImage in the controller
                    if (selectedId) await onDelete(selectedId);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate, confirm, onDelete, onDownload, selectedId, onBack, actions, isSideSheetVisible, setIsSideSheetVisible, state.sideSheetMode]);

    /*
        Eine Ansicht, kein Umschalter.

        Es gab drei: Spalten, Zeilen, Vollbild. Drei Anordnungen fuer eine
        Seite heisst, dass zwei davon schlechter sind als die dritte — und dass
        jede Aenderung an der Detailansicht dreimal gedacht und dreimal
        getestet werden muss. Auf dem Desktop steht das Blatt links, das Bild
        daneben, fertig. Auf schmalen Geraeten untereinander, weil nebeneinander
        dort nicht geht.
    */

    /**
     * Die schwebende Insel: nur dort, wo das Blatt seinen eigenen Kopf traegt
     * (Desktop, Spaltenansicht). Im Zeilenmodus liegt es als Leiste unter dem
     * Bild — eine Insel ueber die ganze Breite waere keine mehr.
     */
    const isIsland = !!headerSlot && !isMobile;

    /**
     * Breite des Seitenpanels — fest, nicht mehr ziehbar.
     *
     * Der Ziehgriff ist entfallen: Er war ein Bedienelement, das in jeder
     * Sitzung neu benutzt werden musste, um denselben Zustand wieder
     * herzustellen, und sein Wert wurde nirgends gespeichert. Eine Groesse, die
     * ohnehin fuer fast jeden gleich ist, gehoert festgelegt und nicht
     * verhandelt.
     *
     * 30 Prozent der Fensterbreite, begrenzt auf 360 bis 480 Pixel: Unter 360
     * wird die Eingabe eng, ueber 480 nimmt sie dem Bild Platz, ohne selbst
     * etwas davon zu haben — der Text wuerde nur breiter laufen, und das liest
     * sich schlechter. CSS rechnet das selbst, es braucht keine Messung und
     * keinen Zustand.
     */
    const SIDEBAR_WIDTH = 'clamp(360px, 30vw, 480px)';
    /** Nominalwert fuer alles, was eine Zahl braucht (Drop-Zonen, Sprachkontext). */
    const SIDEBAR_WIDTH_PX = typeof window === 'undefined'
        ? 380
        : Math.round(Math.min(Math.max(window.innerWidth * 0.30, 360), 480));


    const MIN_PANEL_HEIGHT = 200;



    // No image found — go back, this page shouldn't exist without a valid image.
    // Only navigates away if images have already loaded (images.length > 0) but this
    // specific one isn't in the list (deleted/invalid). On a hard refresh the images
    // array starts empty while loading from DB — we must NOT navigate away in that window.
    useEffect(() => {
        if (img) return; // valid image — nothing to do
        if (images.length === 0) return; // images not loaded yet — wait
        const tid = window.setTimeout(() => {
            if (!imgRef.current) onBack();
        }, 150);
        return () => window.clearTimeout(tid);
    }, [img, images.length, onBack]);
    if (!img) return null;

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-100 dark:bg-[#121214]">
            {/* Removed internal header - handled by AppNavbar */}

            {/* Auf schmalen Geraeten scrollt die SEITE, nicht ein Kasten darin:
                Bild oben, Blatt darunter, ein Scrollbereich fuer alles. Auf dem
                Desktop stehen beide nebeneinander und nichts scrollt ausser dem
                Blatt selbst. */}
            <main ref={mainRef} className={`flex-1 flex flex-col md:flex-row md:overflow-hidden ${isMobile && state.sideSheetMode === 'brush' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                {/* Canvas Area — mobile brush: flex-1 (fills screen); mobile normal: fixed aspect-ratio height; desktop: flex-1 */}
                <div
                    className={`flex flex-col bg-zinc-100 dark:bg-[#121214] relative overflow-hidden group ${isMobile && state.sideSheetMode === 'brush' ? 'flex-1' : 'shrink-0 md:flex-1 md:shrink'}`}
                    style={isMobile && state.sideSheetMode !== 'brush'
                        ? {
                            height: (imgNaturalDims.width ?? 0) > 0 && (imgNaturalDims.height ?? 0) > 0
                                ? `${Math.round(window.innerWidth * imgNaturalDims.height / imgNaturalDims.width)}px`
                                : `${window.innerWidth}px`
                        }
                        : undefined
                    }
                >
                    {/* Image Container */}
                    <div
                        className="relative overflow-hidden min-h-0 flex-1"
                    >

                        {/* Blaettern: an den Seiten, senkrecht in der Mitte des Bildes.
                            Beide Pfeile bleiben stehen und werden am Rand der Liste nur
                            abgeschaltet — eine Taste, die verschwindet, verschiebt die
                            andere und laesst die Maus ins Leere greifen. */}
                        {state.sideSheetMode !== 'brush' && !isMobile && (
                            <div className={`absolute inset-0 pointer-events-none z-40 transition-opacity duration-200 opacity-35 group-hover:opacity-100`}>
                                {/* Wo es nicht weitergeht, steht kein Pfeil.
                                    Ein abgeschalteter Knopf ist ein Angebot, das
                                    keines ist — und seit die beiden an den Raendern
                                    kleben statt nebeneinander, verschiebt das
                                    Weglassen auch nichts mehr. */}
                                {idx > 0 && (
                                    <button
                                        onClick={() => handleSelectWithin(images[idx - 1].id)}
                                        aria-label={t('previous') || 'Zurück'}
                                        className={`${FLOATING_ARROW} left-5`}
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                )}
                                {idx < images.length - 1 && (
                                    <button
                                        onClick={() => handleSelectWithin(images[idx + 1].id)}
                                        aria-label={t('next') || 'Weiter'}
                                        className={`${FLOATING_ARROW} right-5`}
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Punkte: wo man im Stapel steht. Nur bei ueberschaubarer
                            Anzahl — bei fuenfzig Bildern waere eine Punktereihe keine
                            Auskunft mehr, sondern ein Muster. Und nur beim Darueberfahren:
                            Beim Ansehen gehoert die Flaeche dem Bild. */}
                        {state.sideSheetMode !== 'brush' && showDots && (
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-[7px] pointer-events-none z-40
                                opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {images.map((im, i) => (
                                    <span
                                        key={im.id}
                                        className={`rounded-full transition-all duration-150 ${i === idx
                                            ? 'w-1.5 h-1.5 bg-white'
                                            : 'w-[5px] h-[5px] bg-white/30'}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Weitere Knoepfe am unteren Bildrand. Sind Punkte da, ruecken
                            sie eine Reihe hoeher — zwei Dinge auf derselben Linie
                            uebereinander waeren weder lesbar noch treffbar. */}
                        {state.sideSheetMode !== 'brush' && (
                            <div className={`absolute ${showDots ? 'bottom-14' : 'bottom-6'} left-0 right-0 flex justify-center pointer-events-none z-40 transition-opacity duration-200 ${isMobile && img.isGenerating ? 'opacity-100' : isMobile ? 'hidden' : 'opacity-60 group-hover:opacity-100'}`}>
                                <div className="relative flex items-center gap-1.5 pointer-events-auto">
                                    <div className="flex items-center gap-1.5">
                                    {/* "Mehr" steht oben im Blatt, hinter dem Herunterladen.
                                        Hier unten waere es dasselbe ein zweites Mal — und
                                        der Platz ueber dem Bild gehoert dem Bild. */}
                                    {img.generationPrompt && !headerSlot && (
                                        <Tooltip text={t('generate_more')} shortcut="M">
                                            <button
                                                onClick={() => actions.handleGenerateMore(img)}
                                                className={`${FLOATING_BTN} gap-1.5`}
                                            >
                                                <Repeat className="w-3.5 h-3.5" />
                                                {t('nav_more')}
                                            </button>
                                        </Tooltip>
                                    )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Sizing wrapper: image and annotations share the exact same fitted box.
                            In brush mode a paddingBottom reserves space for the floating toolbars
                            so the image scales to fit above them and the bottom edge stays reachable. */}
                        <div
                            ref={imageViewportRef}
                            // Immer mittig. Ein Bild gehoert in die Mitte seiner
                            // Flaeche — das ist in jedem Bildprogramm so, und es
                            // bleibt ruhig, wenn man zwischen Bildern mit
                            // verschiedenen Seitenverhaeltnissen blaettert.
                            //
                            // Ein frueherer Versuch richtete es in der Seitenanordnung
                            // oben aus, damit es mit der Eingabe daneben auf einer
                            // Linie beginnt. Das war die falsche Haelfte: Buendig
                            // werden soll die Box, nicht das Bild.
                            // Mit Insel: linksbuendig, damit das Bild unmittelbar an
                            // das Blatt heranrueckt. Mittig blieb zwischen beiden ein
                            // Streifen leeren Grundes stehen, der nach Luecke aussah
                            // und nicht nach Rand. Ohne Insel wie bisher mittig.
                            className={`absolute inset-0 flex items-center ${isIsland ? 'justify-start' : 'justify-center'}`}
                            style={state.sideSheetMode === 'brush' ? { paddingBottom: BRUSH_BOTTOM_RESERVE } : undefined}
                        >
                            {displayBox.width > 0 && displayBox.height > 0 && (
                                <div
                                    className={`relative shrink-0 transition-[opacity,transform] duration-[180ms] ease-in ${isExiting ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
                                    style={{ width: displayBox.width, height: displayBox.height }}
                                >
                                    {/* Loading state while generating or waiting for image */}
                                    {showBlob && (() => {
                                        const parentImg = img.parentId ? imageMap.get(img.parentId) : null;
                                        const parentLoadSrc = parentImg?.thumbSrc || parentImg?.src;
                                        // Fallback chain: parent thumb → parent src → own thumbSrc → own src (blob ok, better than bubbles)
                                        const blurSrc = parentLoadSrc || img.thumbSrc || (img.src && !img.src.startsWith('blob:empty') ? img.src : undefined);
                                        if (blurSrc) {
                                            return (
                                                <div className="absolute inset-0 overflow-hidden">
                                                    <img src={blurSrc} className="w-full h-full object-cover scale-110 blur-2xl brightness-100 dark:brightness-50" alt="" />
                                                </div>
                                            );
                                        }
                                        return <BlobBackground />;
                                    })()}
                                    {/* Previous image stays visible during navigation to prevent white flash */}
                                    {!isMainLoaded && !showBlob && prevLoadedSrcRef.current && (
                                        <img
                                            src={prevLoadedSrcRef.current}
                                            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                            alt=""
                                        />
                                    )}
                                    {img.thumbSrc && (
                                        <div className={`absolute inset-0 ${showBlob ? 'overflow-hidden' : ''}`}>
                                            <img
                                                src={img.thumbSrc}
                                                className={`w-full h-full object-contain pointer-events-none ${showBlob ? 'blur-xl brightness-100 dark:brightness-50 scale-110' : ''}`}
                                                style={
                                                    transition !== 'none'
                                                        ? { animation: `detail-img-swipe-${transition} 260ms cubic-bezier(0.25,1,0.5,1) both` }
                                                        : suppressEntryAnimRef.current
                                                            ? {}
                                                                                            // Der Eintritt in die Ansicht: deutlicher und
                                                            // weicher auslaufend als frueher (0.96 in 220 ms
                                                            // sah man kaum). Das Bild kommt aus einer Kachel,
                                                            // es soll sichtbar ankommen.
                                                            : { animation: 'detail-enter 380ms cubic-bezier(0.16,1,0.3,1) both' }
                                                }
                                                alt=""
                                            />
                                        </div>
                                    )}
                                    {img.isGenerating && (
                                        <GenerationProgressBar
                                            startTime={img.generationStartTime}
                                            estimatedDuration={img.estimatedDuration}
                                            onImage={!!(prevLoadedSrcRef.current || img.thumbSrc)}
                                        />
                                    )}

                                    <img
                                        id={`detail-img-${img.id}`}
                                        key={img.id}
                                        src={img.src}
                                        alt={img.title}
                                        crossOrigin="anonymous"
                                        draggable={true}
                                        onLoad={(e) => {
                                            const imgEl = e.target as HTMLImageElement;
                                            setImgNaturalDims({ width: imgEl.naturalWidth, height: imgEl.naturalHeight });
                                            (imgEl.decode?.() ?? Promise.resolve()).catch(() => {}).then(() => {
                                                prevLoadedSrcRef.current = img.src;
                                                setLoadedImageId(img.id);
                                                setWaitingForGeneratedLoad(null);
                                            });
                                        }}
                                        onError={() => {
                                            setLoadedImageId(img.id);
                                            setWaitingForGeneratedLoad(null);
                                        }}
                                        className={`absolute inset-0 w-full h-full transition-opacity duration-200 ease-out ${isMainLoaded && !showBlob ? 'opacity-100' : 'opacity-0'}`}
                                        style={{ objectFit: 'contain' }}
                                    />

                                    {!showBlob && isMainLoaded && logicalDims.width > 0 && logicalDims.height > 0 && (
                                        // Overlay only captures clicks while the user is actively drawing
                                        // (sideSheetMode === 'brush'). state.activeShape stays set even after
                                        // the user leaves brush mode, so checking it here would needlessly block
                                        // the native image context menu in prompt-mode (no Copy Image / Save As).
                                        <div className={`absolute inset-0 z-20 ${state.sideSheetMode === 'brush' ? 'pointer-events-auto' : 'pointer-events-none'}`} onMouseDown={handleOverlayMouseDown}>
                                            <EditorCanvas
                                                width={logicalDims.width}
                                                height={logicalDims.height}
                                                annotationWidth={logicalDims.width}
                                                annotationHeight={logicalDims.height}
                                                zoom={1}
                                                annotations={img.annotations || []}
                                                onChange={(anns) => actions.handleUpdateAnnotations(img.id, anns)}
                                                brushSize={state.brushSize}
                                                activeTab={state.sideSheetMode === 'brush' ? 'brush' : 'none'}
                                                maskTool={state.maskTool}
                                                activeShape={state.activeShape}
                                                isBrushResizing={state.isBrushResizing}
                                                isActive={state.sideSheetMode === 'brush'}
                                                activeAnnotationId={state.activeAnnotationId}
                                                onActiveAnnotationChange={actions.onActiveAnnotationChange}
                                                t={t}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>{/* closes sizing wrapper */}
                    </div>{/* closes image container */}

                    {/* Bottom Area: Fixed space so canvas never jumps (desktop only in brush mode; mobile uses fixed toolbar) */}
                    {/* Ist die Leiste aus, faellt auch der Platz weg, den sie
                        belegt — sonst bliebe ein leerer Streifen stehen und das
                        Bild haette nichts gewonnen. Im Pinselmodus bleibt die
                        Hoehe wie gehabt, dort haengt die Werkzeugleiste darin. */}
                    <div className={`${state.sideSheetMode !== 'brush' ? 'h-0 overflow-hidden' : `${isMobile ? 'h-0' : 'h-20'} overflow-visible`} shrink-0 relative z-30 w-full`}>
                        {/* Thumbnail Strip — width is capped to a fixed thumb count
                            (11 desktop / 5 mobile), centered. Cell = 36px thumb + 8px gap = 44px. */}

                        {/* Annotations Toolbar — fixed bottom on mobile, absolute on desktop */}
                        {state.sideSheetMode === 'brush' && <div className={`${isMobile ? 'fixed bottom-6' : 'absolute bottom-6'} left-0 right-0 z-50 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150`}>
                            {/* Secondary Row: Contextual Sub-Menu */}
                            <div className="w-full flex justify-center pointer-events-none">
                                {subMenu === 'text' && (
                                    <div className="w-full flex items-center justify-center pointer-events-none animate-in slide-in-from-bottom-2 fade-in duration-200">
                                        <ObjectsTab
                                            t={t}
                                            currentLang={state.lang}
                                            library={state.fullLibrary}
                                            onAddUserCategory={actions.addUserCategory}
                                            onDeleteUserCategory={actions.deleteUserCategory}
                                            onAddUserItem={actions.addUserItem}
                                            onDeleteUserItem={actions.deleteUserItem}
                                            onAddText={handleAddText}
                                            onAddObject={(label, itemId, icon) => {
                                                handleAddObjectCenter(label, itemId, icon);
                                                actions.setMaskTool('select');
                                            }}
                                            scrollable={true}
                                            variant="horizontal"
                                        />
                                    </div>
                                )}

                                {subMenu === 'shapes' && (
                                    <div className={`bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/5 dark:border-white/5 ${Theme.Effects.Shadow} rounded-full px-2 py-1.5 pointer-events-auto flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200`}>
                                        <button
                                            onClick={() => {
                                                actions.setMaskTool('select');
                                                handleAddShape('rect');
                                            }}
                                            className="w-12 h-12 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all hover:text-zinc-900 dark:hover:text-zinc-100"
                                        >
                                            <Square className="w-5 h-5" />
                                        </button>

                                        <button
                                            onClick={() => {
                                                actions.setMaskTool('select');
                                                handleAddShape('circle');
                                            }}
                                            className="w-12 h-12 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all hover:text-zinc-900 dark:hover:text-zinc-100"
                                        >
                                            <Circle className="w-5 h-5" />
                                        </button>

                                        <button
                                            onClick={() => {
                                                actions.setMaskTool('select');
                                                handleAddShape('line');
                                            }}
                                            className="w-12 h-12 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all hover:text-zinc-900 dark:hover:text-zinc-100"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}

                                {subMenu === 'brush' && (
                                    <div className={`bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/5 dark:border-white/5 ${Theme.Effects.Shadow} rounded-full px-5 py-2 pointer-events-auto flex items-center gap-4 w-64 animate-in slide-in-from-bottom-2 fade-in duration-200`}>
                                        <span className="text-[11px] font-medium text-zinc-500 w-8">{state.brushSize}px</span>
                                        <input
                                            type="range"
                                            min="10" max="400"
                                            value={state.brushSize}
                                            onChange={(e) => actions.setBrushSize(Number(e.target.value))}
                                            onMouseDown={() => actions.setIsBrushResizing(true)}
                                            onMouseUp={() => actions.setIsBrushResizing(false)}
                                            className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500 relative"
                                        />
                                        <Tooltip text={t('clear_all_brush') || 'Pinselstriche löschen'} side="top">
                                            <button
                                                onClick={() => actions.handleUpdateAnnotations(img.id, img.annotations?.filter((a: any) => a.type !== 'mask_path') || [])}
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        </Tooltip>
                                    </div>
                                )}
                            </div>

                            {/* Primary Row: 3 Tools + Done */}
                            <div className={`flex items-center gap-1.5 p-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/5 dark:border-white/5 ${Theme.Effects.Shadow} rounded-full pointer-events-auto overflow-hidden`}>
                                <Tooltip text={t('tooltip_tool_text') || 'Text platzieren'} side="top">
                                    <button
                                        onClick={() => {
                                            setSubMenu('text');
                                            actions.setMaskTool('select');
                                        }}
                                        className={`w-[44px] h-[44px] flex items-center justify-center rounded-full transition-all ${subMenu === 'text' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                                    >
                                        <Type className="w-5 h-5" />
                                    </button>
                                </Tooltip>

                                <Tooltip text={t('tooltip_tool_shapes') || 'Formen zeichnen'} side="top">
                                    <button
                                        onClick={() => {
                                            setSubMenu('shapes');
                                            actions.setMaskTool('select');
                                        }}
                                        className={`w-[44px] h-[44px] flex items-center justify-center rounded-full transition-all ${subMenu === 'shapes' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                                    >
                                        <Shapes className="w-5 h-5" />
                                    </button>
                                </Tooltip>

                                <Tooltip text={t('tooltip_tool_brush') || 'Pinsel'} side="top">
                                    <button
                                        onClick={() => {
                                            setSubMenu('brush');
                                            actions.setMaskTool('brush');
                                        }}
                                        className={`w-[44px] h-[44px] flex items-center justify-center rounded-full transition-all ${subMenu === 'brush' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                                    >
                                        <Brush className="w-5 h-5" />
                                    </button>
                                </Tooltip>

                                <div className="w-[1px] h-8 bg-zinc-200 dark:bg-zinc-800 mx-1" />

                                <Button
                                    onClick={() => actions.handleModeChange('prompt')}
                                    variant="primary-mono"
                                    size="l"
                                    className={`!h-[44px] !rounded-full ${Theme.Effects.ShadowSm} hover:${Theme.Effects.Shadow}`}
                                >
                                    {t('done') || 'Fertig'}
                                </Button>
                            </div>
                        </div>}
                    </div>
                </div>

                {/* Side Sheet — below image on mobile, side panel on desktop */}
                <aside
                    // Ohne Trennlinien, wie unter der Navigationsleiste. Die
                    // Kante entsteht aus dem Flaechenwechsel; eine gezogene
                    // Linie daneben waere eine zweite Aussage ueber dieselbe
                    // Grenze. Der Ziehgriff zum Verbreitern sitzt ohnehin dort
                    // und zeigt sie an, sobald man ihn braucht.
                    /*
                        Als schwebende Insel links.

                        Das Blatt ist keine Wand am Fensterrand mehr, sondern eine
                        Flaeche, die auf dem dunklen Grund liegt: ringsum Abstand,
                        runde Ecken, eigener Untergrund. Dadurch gehoert der Rest
                        des Fensters sichtbar dem Bild — und das Blatt liest sich
                        als EIN Ding, nicht als die zweite Haelfte einer Teilung.

                        Links, weil der Blick dort anfaengt: erst wer das ist und
                        was man tun kann, dann das Bild.
                    */
                    className={`flex flex-col relative md:overflow-hidden md:shrink-0 md:transition-[width,height,padding-top] md:duration-300 md:ease-in-out motion-reduce:md:transition-none
                        ${isIsland
                            // Im hellen Modus eine Haarlinie dazu: Weiss auf Zink-50
                            // ist ein Unterschied von drei Prozent Helligkeit — der
                            // Schatten allein traegt die Kante dort nicht.
                            ? `md:order-first md:m-4 md:rounded-[20px] ${Theme.Colors.PanelBg} ${Theme.Effects.ShadowSm}
                                ring-1 ring-black/[0.035] dark:ring-white/[0.03]
                                md:animate-[sheet-in_340ms_cubic-bezier(0.16,1,0.3,1)_backwards]`
                            // Schmale Geraete: keine eigene Flaeche. Das Blatt ist dort
                            // kein Blatt, sondern die Fortsetzung der Seite unter dem
                            // Bild — ein eigener Untergrund waere eine Kante, die nichts
                            // trennt.
                            : 'bg-transparent'}
                        ${!isSideSheetActuallyVisible && isIsland ? 'hidden' : ''}`}
                    style={isMobile
                        ? undefined
                        : {
                            width: isSideSheetActuallyVisible ? SIDEBAR_WIDTH : '0px',
                            // Mit Kopf im Blatt faengt das Blatt oben an.
                            paddingTop: headerSlot ? 0 : Math.max(0, imageTopOffset - PANEL_INNER_PT),
                        }}
                >
                    {/* Resizer Handle — desktop only */}

                    <SideSheet
                        key={state.selectedImage?.id ?? 'no-selection'}
                        width={isMobile ? '100%' : `${SIDEBAR_WIDTH_PX}px`}
                        disableMobileSheet={isMobile}
                        selectedImage={state.selectedImage}
                        selectedImages={state.selectedImages}
                        sideSheetMode={state.sideSheetMode}
                        onModeChange={actions.handleModeChange}
                        brushSize={state.brushSize}
                        onBrushSizeChange={actions.setBrushSize}
                        maskTool={state.maskTool}
                        onMaskToolChange={actions.setMaskTool}
                        activeShape={state.activeShape}
                        onActiveShapeChange={actions.setActiveShape}
                        onBrushResizeStart={() => actions.setIsBrushResizing(true)}
                        onBrushResizeEnd={() => actions.setIsBrushResizing(false)}
                        onGenerate={actions.handleGenerate}
                        onUpdateAnnotations={actions.handleUpdateAnnotations}
                        headerSlot={headerSlot}
                        onUpdatePrompt={actions.handleUpdatePrompt}
                        onUpdateVariables={actions.handleUpdateVariables}
                        onDeleteImage={actions.handleDeleteImage}
                        onDeselectAll={actions.deselectAll}
                        onGenerateMore={actions.handleGenerateMore}
                        onNavigateParent={actions.handleNavigateParent}
                        onDownload={actions.handleDownload}
                        isDragOver={state.isDragOver}
                        onGlobalDragLeave={() => actions.setIsDragOver(false)}
                        t={t}
                        lang={state.currentLang}
                        fullLibrary={state.fullLibrary}
                        onAddUserCategory={actions.addUserCategory}
                        onDeleteUserCategory={actions.deleteUserCategory}
                        onAddUserItem={actions.addUserItem}
                        onDeleteUserItem={actions.deleteUserItem}
                        qualityMode={state.qualityMode}
                        onQualityModeChange={actions.setQualityMode}
                        templates={state.templates || []}
                        onSaveTemplate={actions.saveTemplate}
                        onDeleteTemplate={actions.deleteTemplate}
                        onRefreshTemplates={actions.refreshTemplates}
                        onSaveRecentPrompt={actions.recordPresetUsage}
                        onUpdateImageTitle={actions.updateProfile}
                        userProfile={state.userProfile}
                        initialPrompt={
                            state.selectedImage?.parentId
                                ? imageMap.get(state.selectedImage.parentId)?.userDraftPrompt ?? ''
                                : state.selectedImage?.userDraftPrompt ?? ''
                        }
                    />
                </aside>
            </main >
        </div >
    );
};
