import React, { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
import { ChevronLeft, ChevronRight, Download, Info, Trash2, MoreHorizontal, Type, Square, Circle, Minus, Brush, Trash, Check, Shapes, X, Repeat } from 'lucide-react';
import { CanvasImage } from '@/types';
import { useDetailLayout } from '@/utils/uiPrefs';
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
 * Immer sichtbar, aber zurueckgenommen — und auf jedem Untergrund lesbar.
 *
 * Die dunkle Fuellung traegt ueber hellen Motiven, der helle Ring ueber
 * dunklen. Mit nur einem der beiden verschwindet der Knopf jeweils auf der
 * anderen Haelfte der Bilder: Schwarz auf Schwarz ist unsichtbar, und eine
 * helle Flaeche auf einem Schneebild ebenso.
 *
 * Deshalb beides, und beides schwach: Es geht nicht darum, aufzufallen,
 * sondern darum, nicht zu verschwinden.
 */
const FLOATING_BTN_BASE = `text-white rounded-full flex items-center
    bg-black/35 hover:bg-black/60 backdrop-blur-md
    ring-1 ring-white/20 hover:ring-white/30
    transition-[background-color,box-shadow] duration-150`;

const FLOATING_BTN = `${FLOATING_BTN_BASE} h-9 px-4 text-xs font-medium`;

/** Dasselbe als quadratischer Knopf fuer ein einzelnes Symbol. */
const FLOATING_BTN_ICON = `${FLOATING_BTN_BASE} h-9 w-9 justify-center`;

export const DetailPage: React.FC<DetailPageProps> = ({
    images, selectedId, onBack, onSelectImage, onDelete, onDownload, onInfo, onSidebarWidthChange,
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
        setIsSideSheetVisible(false);
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
     * Wird derzeit nicht benutzt: Die Eingabe daran auszurichten sah bei einem
     * Bild gut aus, verhielt sich ueber mehrere aber schlecht — der Wert haengt
     * am Seitenverhaeltnis, und beim Blaettern von einem Quer- auf ein
     * Hochformat waere die Eingabe samt Cursor um ueber hundert Pixel
     * gesprungen. Ein Eingabefeld, das seinen Platz wechselt, waehrend man
     * darin schreibt, ist schlimmer als eines, das nicht buendig steht.
     *
     * Bleibt stehen, weil die Groesse unabhaengig davon stimmt und jemand sie
     * fuer eine Einblendung am Bildrand brauchen koennte.
     */
    const [imageTopOffset, setImageTopOffset] = useState(0);
    void imageTopOffset;

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
                case 'e':
                case 'E':
                    if (!e.metaKey && !e.ctrlKey && !e.altKey) {
                        e.preventDefault();
                        setIsSideSheetVisible(!isSideSheetVisible);
                    }
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

    // Resizable Sidebar States
    const [sidebarWidth, setSidebarWidth] = useState(380);
    const [isResizing, setIsResizing] = useState(false);
    useEffect(() => { onSidebarWidthChange?.(380); }, []);

    // Anordnung: nebeneinander oder untereinander. Auf schmalen Geraeten gilt
    // immer untereinander — dort waere nebeneinander kein Angebot, sondern eine
    // Zumutung, und deshalb ist die Hoehe dort auch nicht ziehbar: Der Platz
    // reicht gerade fuer beides, es gibt nichts zu verteilen.
    const detailLayout = useDetailLayout();
    // Die Zeilenanordnung gilt nur, SOLANGE die Eingabe sichtbar ist. Im
    // Vollbild gibt es nichts zu teilen: Dort soll das Bild die ganze Flaeche
    // bekommen und mittig darin stehen — mit der Zeilenhoehe waere es oben
    // geklebt und darunter waere der Platz der verschwundenen Eingabe leer
    // geblieben.
    const isRowLayout = !isMobile && detailLayout === 'row' && isSideSheetActuallyVisible;
    // Anteilig am Fenster statt einer festen Zahl: 320 Pixel sind auf einem
    // 13-Zoll-Bildschirm ein Drittel und auf einem grossen ein Streifen, unter
    // dem das Bild verloren wirkt. Ein knappes Drittel haelt das Verhaeltnis
    // zwischen Bild und Eingabe ueber alle Groessen hinweg aehnlich.
    const [panelHeight, setPanelHeight] = useState(() =>
        typeof window === 'undefined' ? 320 : Math.round(Math.min(Math.max(window.innerHeight * 0.32, 260), 460))
    );
    const MIN_PANEL_HEIGHT = 200;

    /**
     * Hoehe des Bildbereichs im Zeilenmodus.
     *
     * Das Bild sitzt buendig unter der Leiste und nimmt die volle Breite; seine
     * Hoehe folgt daraus. Die Eingabe rueckt direkt darunter — es bleibt kein
     * Streifen dazwischen, und bei einem 4:3-Bild ist der Bereich genau so hoch
     * wie das Bild.
     *
     * Zweite Grenze fuer Hochformate: Sonst fuellte ein 3:4-Bild bei voller
     * Breite den ganzen Bildschirm und die Eingabe waere nicht mehr zu sehen.
     */
    const [rowImageHeight, setRowImageHeight] = useState<number | undefined>(undefined);
    useEffect(() => {
        if (!isRowLayout) { setRowImageHeight(undefined); return; }
        const compute = () => {
            const el = mainRef.current;
            if (!el || !imgNaturalDims.width || !imgNaturalDims.height) return;
            const byWidth = el.clientWidth * imgNaturalDims.height / imgNaturalDims.width;
            const maxH = Math.max(220, el.clientHeight - MIN_PANEL_HEIGHT);
            setRowImageHeight(Math.round(Math.min(byWidth, maxH)));
        };
        compute();
        const el = mainRef.current;
        const obs = el ? new ResizeObserver(compute) : null;
        if (el && obs) obs.observe(el);
        window.addEventListener('resize', compute);
        return () => { obs?.disconnect(); window.removeEventListener('resize', compute); };
    }, [isRowLayout, imgNaturalDims.width, imgNaturalDims.height]);

    const startResizing = useCallback(() => setIsResizing(true), []);
    const stopResizing = useCallback(() => setIsResizing(false), []);

    const MIN_SIDEBAR_WIDTH = 300;
    const MAX_SIDEBAR_WIDTH = 600;

    const resize = useCallback((e: MouseEvent) => {
        if (!isResizing) return;
        if (isRowLayout) {
            // Nach oben ziehen vergroessert die Leiste. Die Obergrenze haengt am
            // Fenster statt an einer festen Zahl: Sonst liesse sich auf einem
            // kleinen Bildschirm das Bild vollstaendig verdecken.
            const maxPanel = Math.max(MIN_PANEL_HEIGHT, window.innerHeight * 0.75);
            const next = window.innerHeight - e.clientY;
            setPanelHeight(Math.min(Math.max(next, MIN_PANEL_HEIGHT), maxPanel));
            return;
        }
        const newWidth = window.innerWidth - e.clientX;
        const clampedWidth = Math.min(Math.max(newWidth, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
        setSidebarWidth(clampedWidth);
        onSidebarWidthChange?.(clampedWidth);
    }, [isResizing, isRowLayout, onSidebarWidthChange]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", resize);
            window.addEventListener("mouseup", stopResizing);
        } else {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        }
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [isResizing, resize, stopResizing]);


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
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
            {/* Removed internal header - handled by AppNavbar */}

            <main ref={mainRef} className={`flex-1 flex flex-col ${isRowLayout ? '' : 'md:flex-row'} md:overflow-hidden ${isMobile && state.sideSheetMode === 'brush' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                {/* Canvas Area — mobile brush: flex-1 (fills screen); mobile normal: fixed aspect-ratio height; desktop: flex-1 */}
                <div
                    className={`flex flex-col bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden group ${isMobile && state.sideSheetMode === 'brush' ? 'flex-1' : 'shrink-0 md:flex-1 md:shrink'}`}
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
                        className={`relative overflow-hidden min-h-0 ${isRowLayout ? 'shrink-0' : 'flex-1'}`}
                        style={isRowLayout && rowImageHeight ? { height: `${rowImageHeight}px` } : undefined}
                    >

                        {/* Floating action buttons */}
                        {state.sideSheetMode !== 'brush' && (
                            <div className={`absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-40 transition-opacity duration-200 ${isMobile && img.isGenerating ? 'opacity-100' : isMobile ? 'hidden' : 'opacity-60 group-hover:opacity-100'}`}>
                                <div className="flex items-center gap-1.5 pointer-events-auto">
                                    {/* Blaettern steht jetzt in derselben Zeile wie die
                                        uebrigen Handlungen am Bild. An den Seitenraendern
                                        lagen die Pfeile weit auseinander und mitten im
                                        Motiv; unten bilden sie mit "Mehr" und "Bearbeiten"
                                        eine Gruppe, die man an einem Ort findet. */}
                                    {idx > 0 && (
                                        <button
                                            onClick={() => handleSelectWithin(images[idx - 1].id)}
                                            aria-label={t('previous') || 'Zurück'}
                                            className={FLOATING_BTN_ICON}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                    )}
                                    {idx < images.length - 1 && (
                                        <button
                                            onClick={() => handleSelectWithin(images[idx + 1].id)}
                                            aria-label={t('next') || 'Weiter'}
                                            className={FLOATING_BTN_ICON}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    )}
                                    {img.generationPrompt && (
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
                                    {!isSideSheetVisible && !showBlob && (
                                        <Tooltip text={t('open_editing_panel')} shortcut="E">
                                            <button onClick={() => setIsSideSheetVisible(true)} className={FLOATING_BTN}>
                                                {t('nav_edit')}
                                            </button>
                                        </Tooltip>
                                    )}
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
                            className="absolute inset-0 flex justify-center items-center"
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
                                                            : { animation: 'detail-img-in 220ms cubic-bezier(0.25,1,0.5,1) both' }
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
                    className={`flex flex-col relative md:overflow-hidden bg-white dark:bg-zinc-950 md:shrink-0 ${isResizing ? 'select-none' : 'md:transition-[width,height] md:duration-300 md:ease-in-out'} ${!isSideSheetActuallyVisible && (isMobile || isRowLayout) ? 'hidden' : ''}`}
                    style={isMobile
                        ? undefined
                        : isRowLayout
                            // Keine gesetzte Hoehe: Die Leiste nimmt, was das Bild
                            // uebrig laesst. Damit rueckt sie unmittelbar an das
                            // Bild heran, und es gibt nichts mehr zu ziehen.
                            //
                            // Ausgeblendet wird sie ueber `hidden` in der
                            // Klassenliste, nicht ueber eine Hoehe von 0: Im
                            // Seitenmodus schrumpft eine Breite sichtbar zusammen,
                            // hier gibt es nichts zu schrumpfen — die Leiste
                            // bekommt ihre Hoehe vom uebrigen Platz, und 0 waere
                            // wirkungslos geblieben. Genau daran lag es, dass
                            // Ausblenden im Zeilenmodus nichts tat.
                            ? { width: '100%' }
                            : { width: isSideSheetActuallyVisible ? `${sidebarWidth}px` : '0px' }}
                >
                    {/* Resizer Handle — desktop only */}
                    {!isMobile && !isRowLayout && (
                        /*
                            Greifflaeche ueber die volle Hoehe, sichtbar ist nur ein
                            kurzer Balken in der Mitte.

                            Vorher leuchtete die ganze Kante auf — eine
                            bildschirmhohe Flaeche als Rueckmeldung auf einen
                            Mauszeiger ist zu viel Antwort fuer zu wenig Frage. Der
                            Balken ist etwa daumenhoch: genug, um ihn zu sehen und zu
                            treffen, wenig genug, um ihn zu uebersehen, solange man
                            ihn nicht sucht.

                            Im Ruhezustand sehr zurueckhaltend, beim Ueberfahren
                            deutlicher — getroffen wird ohnehin die ganze Kante.
                        */
                        <div
                            onMouseDown={startResizing}
                            // Die Greifflaeche beginnt an der Kante, der sichtbare
                            // Balken sitzt ein Stueck weiter innen — direkt an der
                            // Bildkante klebte er am Bild und las sich als dessen
                            // Rand statt als Griff.
                            className="absolute left-0 top-0 bottom-0 w-6 -ml-1 cursor-col-resize z-50 group/resize flex items-center"
                        >
                            <div className="w-1.5 h-12 ml-3 rounded-full bg-black/10 dark:bg-white/12
                                group-hover/resize:bg-black/20 dark:group-hover/resize:bg-white/28
                                group-active/resize:bg-black/30 dark:group-active/resize:bg-white/40
                                transition-colors duration-150" />
                        </div>
                    )}

                    <SideSheet
                        key={state.selectedImage?.id ?? 'no-selection'}
                        width={isMobile || isRowLayout ? '100%' : `${sidebarWidth}px`}
                        rowLayout={isRowLayout}
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
