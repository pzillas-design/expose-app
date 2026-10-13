import React, { memo, useMemo, useCallback } from 'react';
import { CanvasImage, ImageRow } from '@/types';
import { NAV_SCROLL_OFFSET } from '@/config/layout';
import { Loader2, Layers, Layers2, ChevronRight, Upload, Download, X } from 'lucide-react';
import { SideSheet } from '@/components/sidesheet/SideSheet';
import { GlobalFooter } from '@/components/layout/GlobalFooter';
import { useMobile } from '@/hooks/useMobile';
import { useKeyboardGridNavigation } from '@/hooks/useKeyboardGridNavigation';
import { useItemDialog } from '@/components/ui/Dialog';
import { Theme, Typo, Button, Tooltip } from '@/components/ui/DesignSystem';
import { BlobBackground } from '@/components/ui/BlobBackground';
import { FeedHeroSection } from '../layout/FeedHeroSection';
import { LayerComposer } from '@/components/composer/LayerComposer';
import { GeneratingRing } from '@/components/ui/GeneratingRing';

/* ── TTL helpers ── */
// Muss mit DEFAULT_TTL_DAYS in supabase/functions/cleanup-expired-images
// übereinstimmen — sonst zeigt der Countdown eine Frist an, die nicht gilt.
const TTL_DAYS = 14;
const WARNING_DAYS = 5;

function getDaysRemaining(createdAt: string | number | undefined): number | null {
    if (!createdAt) return null;
    const created = typeof createdAt === 'number' ? createdAt : new Date(createdAt).getTime();
    const expiresAt = created + TTL_DAYS * 24 * 60 * 60 * 1000;
    return Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
}

/**
 * Restfrist eines Tages-Abschnitts, gerechnet aus dem Tag selbst.
 *
 * Nicht aus den Kacheln des Abschnitts: Deren Deckbild ist die NEUESTE
 * Variante eines Stapels, waehrend der Stapel nach seinem Original einsortiert
 * ist. Die kleinste Frist ueber die Deckbilder waere deshalb zu optimistisch —
 * sie uebersaehe die aelteren Bilder, die im zugeklappten Stapel stecken.
 *
 * Der Tag ist ohnehin die Einheit, an der die Frist haengt: Alles, was an
 * einem Tag entstanden ist, laeuft am selben Tag ab.
 */
function getDayDaysRemaining(dayKey: string): number | null {
    const [y, m, d] = dayKey.split('-').map(Number);
    if (!y || !m || !d) return null;
    // Ende des Kalendertags, damit ein am Morgen erzeugtes Bild nicht einen
    // Tag frueher gezaehlt wird als eines vom Abend desselben Tages.
    const dayEnd = new Date(y, m - 1, d, 23, 59, 59).getTime();
    return Math.ceil((dayEnd + TTL_DAYS * 86_400_000 - Date.now()) / 86_400_000);
}

/**
 * Tagesschluessel aus einem Zeitstempel. Bewusst nach Kalendertag und nicht
 * nach Stunde oder Minute: Eine Kopfzeile "13:36-13:36" waere eine Zeitspanne
 * von null und sagt niemandem etwas.
 */
const dayKeyOf = (ts: string | number | undefined): string => {
    const d = ts ? new Date(ts) : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * "Heute", "Gestern", sonst das ausgeschriebene Datum — aus dem Tagesschluessel.
 *
 * Bewusst aus dem SCHLUESSEL und nicht aus einem Zeitstempel: Gruppiert wurde
 * nach dem Datum des Originals, beschriftet wurde nach dem Datum des
 * Deckbildes, und das Deckbild ist die NEUESTE Fassung. Zwei Stapel mit
 * Originalen von verschiedenen Tagen, deren neueste Fassungen am selben Tag
 * entstanden, bekamen dadurch dieselbe Ueberschrift — im Verlauf stand "8.
 * Oktober" zweimal untereinander.
 */
const dayLabelOf = (key: string, lang: 'de' | 'en'): string => {
    const [y, m, dd] = key.split('-').map(Number);
    const d = new Date(y, (m || 1) - 1, dd || 1);
    const today = dayKeyOf(Date.now());
    const yesterday = dayKeyOf(Date.now() - 86400000);
    if (key === today) return lang === 'de' ? 'Heute' : 'Today';
    if (key === yesterday) return lang === 'de' ? 'Gestern' : 'Yesterday';
    return d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'long' });
};

/**
 * Das Abzeichen oben auf einer Kachel — Quellbild, Upload-Fortschritt, Anzahl
 * im Stapel.
 *
 * Vorher stand dieselbe Klassenkette an drei Stellen abgeschrieben. Dass der
 * Chip unfertig wirkte, war die Folge: Es gab keine Stelle, an der man ihn
 * haette verbessern koennen, ohne ihn dreimal zu verbessern.
 *
 * Poliert gegenueber der alten Fassung:
 * - Weichzeichner statt reiner Deckkraft, damit er auf hellen wie dunklen
 *   Bildmotiven gleich gut sitzt. Dieselbe Sprache wie die Kopfzeile.
 * - Ein feiner Ring statt nur eines Schattens. Auf einem weissen Hausdach war
 *   der Chip vorher praktisch unsichtbar.
 * - Waechst mit dem Inhalt: ein Icon bleibt rund, eine zweistellige Zahl
 *   bekommt Luft, statt gequetscht zu werden.
 */
/**
 * Die Flaeche zum Ablegen oder Auswaehlen von Bildern.
 *
 * Eine Definition fuer beide Vorkommen — den leeren Zustand und den Streifen
 * ueber der Galerie. Sie unterscheiden sich nur in der Anordnung, nicht in der
 * Erscheinung; zwei Abschriften waeren die naechste Stelle gewesen, an der
 * Farbwerte auseinanderlaufen.
 *
 * Der Untergrund ist bewusst in Schwarz bzw. Weiss mit niedriger Deckkraft
 * angegeben statt in festen Grautoenen: So sitzt er in beiden Themen gleich
 * und bleibt der blosse Hauch, der gewuenscht ist.
 */
const UploadDropZone: React.FC<{
    onClick: () => void;
    label: string;
    active?: boolean;
    row?: boolean;
    className?: string;
}> = ({ onClick, label, active = false, row = false, className = '' }) => (
    <button
        onClick={onClick}
        // Symbol immer ueber der Schrift, in beiden Faellen. Nebeneinander
        // zerfiel die Einheit in zwei Dinge, die zufaellig nebeneinander
        // stehen; uebereinander liest es sich als eine Sache. `row` regelt
        // seither nur noch, wie viel Luft die Flaeche bekommt.
        className={`w-full rounded-2xl flex flex-col items-center justify-center transition-colors duration-200
            ${row ? 'gap-3.5 py-10' : 'gap-4 px-6 py-14'}
            ${active
                // Beim Ziehen etwas deutlicher, aber in derselben Tonlage —
                // kein Farbwechsel, nur mehr davon.
                ? 'bg-black/[0.06] dark:bg-white/[0.08]'
                : 'bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]'}
            ${className}`}
    >
        <Upload className="w-[18px] h-[18px] text-zinc-400 dark:text-zinc-500 shrink-0" strokeWidth={1.75} />
        {/* Eine Zeile. Zwei Zeilen machten aus einem Satz zwei, obwohl beide
            dasselbe sagen: wie man Bilder hereinbekommt. */}
        <span className="text-[13px] leading-tight text-zinc-500 dark:text-zinc-400">{label}</span>
    </button>
);

const TileChip: React.FC<{
    children: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
    title?: string;
}> = ({ children, className = '', onClick, title }) => {
    const Tag: any = onClick ? 'button' : 'div';
    return (
    <Tag
        onClick={onClick}
        title={title}
        // Mitte und Anordnung getrennt: Das aeussere Feld zentriert (place-items),
        // das innere ordnet (flex). Vorher machte ein Raster beides zugleich —
        // grid-flow-col mit auto-cols-max zentriert die Spur, nicht den Inhalt,
        // und bei einer einzelnen Ziffer sass sie dadurch sichtbar daneben.
        //
        // Keine Fettschrift: Auf einer dunklen Scheibe traegt schon der Kontrast,
        // und fett machte aus einer Nebensache ein Ausrufezeichen.
        // top-3/right-3 statt top-2/right-2: Der Auswahlkreis sitzt in einem
        // Feld mit p-3, also 12 Pixel von der Ecke. Das Abzeichen sass auf 8
        // und stand damit sichtbar anders als sein Gegenstueck.
        className={`absolute top-3 right-3 z-20 h-[22px] min-w-[22px] px-1.5 rounded-full
            grid place-items-center
            bg-black/45 backdrop-blur-[3px]
            text-[11px] font-normal tabular-nums leading-none text-white
            ${onClick ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'} ${className}`}
    >
        <span className="flex items-center gap-1 leading-none">{children}</span>
    </Tag>
    );
};

/* ── Memoised grid item ── */
interface FeedGridItemProps {
    img: CanvasImage;
    idx: number;
    isSelected: boolean;
    isKeyboardActive: boolean;
    isSelectMode: boolean;
    onSelectImage: (id: string) => void;
    onToggleSelect?: (id: string, isRange?: boolean) => void;
    setActiveIndex: (idx: number | null) => void;
    actions?: any;
    /** Thumbnail/src of the parent image, used as blurred background when generating a variation */
    parentSrc?: string;
    /** Number of images in this group (≥2 triggers stack visual + badge) */
    groupCount?: number;
    /** Whether any image in this group is currently generating */
    hasGenerating?: boolean;
    /** Die Reihe hinter dieser Kachel — wird an onOpenGroup durchgereicht. */
    group?: ImageRow | null;
    /** Waehlt alle Bilder dieses Stapels aus bzw. ab. Fehlt bei Einzelbildern. */
    onToggleSelectStack?: () => void;
    /**
     * Oeffnet den Stapel. Nimmt die Reihe als Argument, statt sie einzuschliessen:
     * Eine je Kachel neu erzeugte Pfeilfunktion macht memo() wirkungslos, und dann
     * rendert JEDE Kachel bei JEDEM Mauszeiger-Wechsel neu.
     */
    onOpenGroup?: (row: ImageRow) => void;
    /** Staggered fade-in delay in ms (for group open animation) */
    staggerDelay?: number;
    /** Whether this item was the last one viewed in detail — plays zoom-out return animation */
    isLastViewed?: boolean;
    /** Generated image not yet opened by user */
    isNew?: boolean;
    /** Days remaining before auto-deletion (≤7 shows yellow warning dot) */
    daysRemaining?: number | null;
    /** Current UI language for tooltip text */
    currentLang?: 'de' | 'en';
    /** True when this image is the source/original in a stack view */
    isSource?: boolean;
}

/**
 * Dauer des Rueckkehr-Zooms. MUSS mit dem Keyframe feed-zoom-return in
 * index.css uebereinstimmen.
 *
 * Vorher standen hier drei Zahlen fuer dieselbe Sache: die Animation lief
 * 480 ms, abgeraeumt wurde an zwei Stellen nach 500 ms und an einer nach
 * 600 ms. 20 ms Luft reichen nicht — faengt die Animation einen Frame spaeter
 * an, weil der Browser gerade Bilder dekodiert, wird sie mittendrin abgeraeumt
 * und die Kachel springt auf ihre Endgroesse. Genau dieses Zucken nach dem
 * Zoom war zu sehen.
 */
const ZOOM_RETURN_MS = 480;
const ZOOM_RETURN_CLEAR_MS = ZOOM_RETURN_MS + 140;

const FeedGridItem = memo<FeedGridItemProps>(({ img, idx, isSelected, isKeyboardActive, isSelectMode, onSelectImage, onToggleSelect, setActiveIndex, actions, parentSrc, group, onToggleSelectStack, groupCount = 1, hasGenerating = false, onOpenGroup, staggerDelay, isLastViewed, isNew, daysRemaining, currentLang = 'en', isSource = false }) => {
    const isMobile = useMobile();
    const previewSrc = img.thumbSrc || img.src;

    // Bilder blenden ein, statt aufzuploppen.
    //
    // Vorher stand das <img> ohne jede Rueckmeldung im Baum: Es erschien in dem
    // Moment, in dem der Browser es dekodiert hatte. Bei fuenfzig Kacheln und
    // lazy loading heisst das: in zufaelliger Reihenfolge, einzeln, ueber
    // mehrere Sekunden verteilt. Genau das ist der chaotische Aufbau.
    //
    // Ein bereits zwischengespeichertes Bild wird NICHT eingeblendet: Dort ist
    // `complete` schon beim ersten Anfassen wahr, und eine Blende auf etwas,
    // das sofort da ist, waere selbst wieder ein Flackern.
    // Zieldeckkraft: im Auswahlmodus ist ein markiertes Bild gedaempft.
    const targetOpacity = isSelectMode && isSelected ? 0.6 : 1;
    // Bewusst OHNE React-Zustand.
    //
    // Mit useState begann das Bild bei opacity 0 und wurde erst durch ein
    // erneutes Rendern sichtbar. Bei einem bereits zwischengespeicherten Bild
    // liegt dazwischen ein gezeichneter Frame — und genau der ist das kurze
    // Leersein nach der Animation.
    //
    // Ein ref-Callback laeuft waehrend des Commits, also VOR dem ersten
    // Zeichnen. Was im Zwischenspeicher liegt, ist damit sofort sichtbar; alles
    // andere blendet per onLoad ein. Nebenbei entfaellt ein Zustands-Update je
    // Kachel.
    const imgRef = React.useCallback((node: HTMLImageElement | null) => {
        if (node?.complete) node.style.opacity = String(targetOpacity);
    }, [targetOpacity]);
    const isGen = !!img.isGenerating;
    const isGroup = groupCount > 1;
    const playedReturnRef = React.useRef(false);
    if (isLastViewed) playedReturnRef.current = true;

    // Tile hugs the image's natural aspect ratio at full column width — no square
    // letterboxing. Row height then follows the tallest image in that row.
    const boundedStyle = {
        aspectRatio: `${img.width} / ${img.height}`,
        width: '100%',
        height: 'auto',
    };

    return (
        <div
            onPointerEnter={(e) => { if (e.pointerType !== 'touch') setActiveIndex(idx); }}
            onPointerLeave={(e) => { if (e.pointerType !== 'touch') setActiveIndex(null); }}
            data-image-id={img.id}
            className={`relative isolate group cursor-pointer`}
            // Eine Kachel, die den Rueckkehr-Zoom gespielt hat, darf danach nicht
            // in die gestaffelte Einblendung zurueckfallen: Die laeuft mit
            // `both` und haelt waehrend ihrer Verzoegerung den Startwert
            // opacity 0 — die Kachel waere nach dem Zoom noch einmal
            // unsichtbar. Im Stapel, wo es eine Staffelung gibt, war das der
            // zweite leere Frame.
            style={isLastViewed
                ? {
                    // Set the 'from' keyframe values as inline style so the very first paint
                    // already shows the zoomed-in state — avoids the brief normal-size flash
                    // that occurs before the CSS animation engine kicks in.
                    // MUSS mit dem Keyframe feed-zoom-return übereinstimmen —
                    // sonst blitzt vor dem Start der Animation ein Zwischenwert auf.
                    transform: 'scale(1.28)',
                    opacity: 0.5,
                    animation: `feed-zoom-return ${ZOOM_RETURN_MS}ms cubic-bezier(0.25,1,0.5,1) both`,
                }
                : staggerDelay !== undefined && !playedReturnRef.current
                    ? { animation: `feed-fade-in 280ms ${staggerDelay}ms both ease-out` }
                    : undefined}
        >
            {/* Wrapper for the image bounding box */}
            <div
                className="relative isolate cursor-pointer transition-transform duration-100 active:scale-[1.03]"
                style={boundedStyle}
                onClick={(e) => {
                    if (onOpenGroup && group) { onOpenGroup(group); return; }
                    if (isSelectMode && onToggleSelect) onToggleSelect(img.id, e.shiftKey);
                    else onSelectImage(img.id);
                }}
            >

                {/* Stack cards — bottom center, spread on hover */}
                {isGroup && (
                    <>
                        {groupCount > 2 && (
                            <div
                                // Das hinterste Blatt. Dunkler als das vordere, damit
                                // es auf schwarzem Grund zuruecktritt statt als heller
                                // Balken aufzuliegen — vorher war es mit zinc-700
                                // heller als das Blatt davor, also genau verkehrt
                                // herum: Das Entfernteste stach am meisten hervor.
                                className="absolute h-full -z-20 bg-zinc-200 dark:bg-zinc-800"
                                style={{
                                    left: '10px', right: '10px',
                                    bottom: 0,
                                    // translateY statt bottom: bottom ist eine
                                    // Layout-Eigenschaft und zwingt den Browser bei
                                    // jedem Frame zu einem neuen Umbruch. transform
                                    // erledigt die Grafikkarte allein.
                                    transform: `translateY(${isKeyboardActive ? 28 : 20}px) scaleX(0.93)`,
                                    transition: 'transform 260ms cubic-bezier(0.25,1,0.5,1)',
                                    willChange: 'transform',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.10)',
                                }}
                            />
                        )}
                        <div
                            // Das vordere Blatt bleibt das hellste: Naeher heisst
                            // mehr Kontrast zum Hintergrund. Zusammen mit dem
                            // dunkleren hinteren ergibt das eine Staffelung statt
                            // zweier gleich lauter Balken.
                            className="absolute h-full -z-10 bg-zinc-300 dark:bg-zinc-700"
                            style={{
                                left: '5px', right: '5px',
                                bottom: 0,
                                transform: `translateY(${isKeyboardActive ? 16 : 11}px) scaleX(0.96)`,
                                transition: 'transform 260ms cubic-bezier(0.25,1,0.5,1)',
                                willChange: 'transform',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                            }}
                        />
                    </>
                )}

                {/* Main card */}
                <div className={`absolute inset-0 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 ${isGen ? 'bg-zinc-100 dark:bg-zinc-900' : 'bg-white dark:bg-black group-hover:bg-zinc-50 dark:group-hover:bg-black transition-colors'}`}>

                    {isGen ? (
                        <>
                            {(() => {
                                // Placeholders inherit src/thumbSrc from the source image (useGeneration.ts),
                                // so img.thumbSrc / img.src IS the parent image during loading.
                                // parentSrc (resolved via imageIdMap) wins when available, then fall back
                                // to the placeholder's own inherited src before showing BlobBackground.
                                const bgSrc = parentSrc || img.thumbSrc || img.src;
                                return bgSrc ? (
                                    <div className="absolute inset-0">
                                        <img src={bgSrc} className="w-full h-full object-cover scale-110 blur-xl brightness-75" alt="" />
                                    </div>
                                ) : (
                                    <BlobBackground />
                                );
                            })()}
                            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                                <GeneratingRing
                                    generationStartTime={img.generationStartTime}
                                    estimatedDuration={img.estimatedDuration}
                                    size={28}
                                />
                            </div>
                        </>
                    ) : previewSrc ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <img
                                ref={imgRef}
                                src={previewSrc}
                                alt={img.title}
                                onLoad={e => { e.currentTarget.style.opacity = String(targetOpacity); }}
                                // Ein Bild, das nicht laedt, darf nicht unsichtbar
                                // bleiben — lieber ohne Blende zeigen.
                                onError={e => { e.currentTarget.style.opacity = String(targetOpacity); }}
                                style={{ opacity: 0, transition: 'opacity 300ms ease-out' }}
                                className="w-full h-full object-cover" 
                                // Die zurueckkehrende Kachel wartet nicht auf den
                                // Scroll-Ausloeser: Sonst laeuft der Zoom auf einem
                                // leeren Kasten und das Bild springt hinterher herein.
                                loading={isLastViewed ? 'eager' : 'lazy'}
                                // Dekodieren neben dem Hauptstrang, damit es die
                                // laufende Zoom-Animation nicht ins Stocken bringt.
                                decoding="async"
                            />
                        </div>
                    ) : null}

                    {/* Hover scrim — desktop only; on touch, hover CSS causes iOS to require two taps */}
                    {!isGen && !isMobile && (
                        <div className={`absolute inset-0 pointer-events-none transition-colors duration-150 ${isKeyboardActive ? 'bg-black/[0.12]' : 'bg-black/0 group-hover:bg-black/[0.09]'}`} />
                    )}

                    {/* Selection circle — shown on pointer hover (isKeyboardActive) or in select mode.
                        Outer wrapper provides a generous 44×44px hit target (the visible circle
                        is only 20px, which previously caused stray taps to bubble to the parent and
                        open the image instead of toggling selection). */}
                    {!isGen && !(isGroup && !isMobile && onToggleSelectStack) && (
                        <div
                            className={`absolute top-0 left-0 p-3 z-20 cursor-pointer ${isSelectMode || (isKeyboardActive && !isMobile) ? '' : 'pointer-events-none'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (!isSelectMode) actions?.setIsSelectMode?.(true);
                                if (onToggleSelect) onToggleSelect(img.id, e.shiftKey);
                            }}
                        >
                            <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${isSelectMode && isSelected
                                    ? 'opacity-100 scale-100 hover:scale-110 bg-gradient-to-br from-orange-400 to-red-500 shadow-md'
                                    : isSelectMode
                                        ? 'opacity-100 scale-100 hover:scale-110 hover:opacity-100 bg-white/90 dark:bg-zinc-800/90'
                                        : (isKeyboardActive && !isMobile)
                                            ? 'opacity-80 scale-100 hover:opacity-100 hover:scale-110 bg-white/90 dark:bg-zinc-800/90'
                                            : 'opacity-0 scale-75'
                                    }`}
                            >
                                {isSelectMode && isSelected && (
                                    <svg className="w-2.5 h-2.5 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Source image badge — same weight + size as the Euro icon in the navbar. */}
                    {isSource && (
                        <TileChip>
                            <Upload className="w-[13px] h-[13px]" strokeWidth={2} />
                        </TileChip>
                    )}

                    {/* Upload state — queued items spin without progress; the single
                        actively uploading item fills a clock-style progress ring 0→100. */}
                    {!isGen && !isSource && !img.storage_path && img.src?.startsWith('blob:') && (
                        <TileChip>
                            {img.uploadStatus === 'uploading' ? (
                                <svg viewBox="0 0 20 20" className="w-[16px] h-[16px] -rotate-90">
                                    <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2.5"
                                        className="stroke-white/30" />
                                    <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2.5" strokeLinecap="round"
                                        className="stroke-white transition-[stroke-dashoffset] duration-200"
                                        strokeDasharray={2 * Math.PI * 8}
                                        strokeDashoffset={(2 * Math.PI * 8) * (1 - Math.min(100, img.uploadProgress ?? 0) / 100)} />
                                </svg>
                            ) : (
                                <Loader2 className="w-[14px] h-[14px] animate-[spin_3s_linear_infinite]" />
                            )}
                        </TileChip>
                    )}

                    {/* Anzahl der Bilder im Stapel.
                        Oben rechts, derselbe Chip wie Quellbild und Upload — die
                        Stelle ist frei, weil beide anderen nur in der
                        Stapelansicht bzw. beim Hochladen auftreten, der Zaehler
                        dagegen nur auf einem Deckbild in der Galerie.
                        Der Punkt zeigt an, dass in diesem Stapel gerade etwas
                        entsteht; dann ist die Zahl noch nicht endgueltig. */}
                    {isGroup && !isGen && (
                        /*
                            Zahl und Auswahlkreis sind dasselbe Bedienelement.

                            Die Zahl sagt, wie viele Bilder im Stapel liegen; ein
                            Klick nimmt genau diese. Das ist die Handlung, die man
                            an einem Deckbild ueberhaupt will — der Stapel ist die
                            Einheit, nicht das zufaellig oberste Bild.

                            Deshalb traegt ein Deckbild auch keinen eigenen
                            Auswahlkreis mehr: Zwei Auswahlknoepfe auf derselben
                            Kachel, von denen einer sechs Bilder nimmt und der
                            andere eines, waeren nicht zu erraten.

                            Sichtbar beim Ueberfahren, im Auswahlmodus und sobald
                            etwas ausgewaehlt ist — sonst waere der Zustand
                            unsichtbar. Auf Beruehrungsgeraeten bleibt sie
                            sichtbar und bleibt reine Auskunft: Dort ist die
                            Mehrfachauswahl ohnehin abgeschaltet.
                        */
                        <TileChip
                            onClick={isMobile || !onToggleSelectStack ? undefined : (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onToggleSelectStack();
                            }}
                            className={`${isMobile || isSelectMode || isSelected ? '' : 'opacity-0 group-hover:opacity-100'} transition-[opacity,background-color] duration-150 ${
                                isSelected ? '!bg-gradient-to-br !from-orange-400 !to-red-500 shadow-md' : ''
                            }`}
                        >
                            {hasGenerating && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />}
                            {groupCount}
                        </TileChip>
                    )}

                </div>

                {/* Priority: isNew orange dot > expiring yellow dot */}
                {isNew && !isGen ? (
                    <span className="absolute -top-1 -right-1 z-30 w-3 h-3 rounded-full bg-gradient-to-br from-orange-400 to-red-500 shadow-sm pointer-events-none" />
                ) : (daysRemaining != null && daysRemaining <= WARNING_DAYS && !isGen) ? (
                    <Tooltip text={currentLang === 'de'
                        ? `Wird in ${Math.max(0, daysRemaining)} ${daysRemaining === 1 ? 'Tag' : 'Tagen'} gelöscht`
                        : `Will be deleted in ${Math.max(0, daysRemaining)} ${daysRemaining === 1 ? 'day' : 'days'}`
                    }>
                        <span className="absolute -top-1 -right-1 z-30 w-3 h-3 rounded-full bg-yellow-400 shadow-sm cursor-default" />
                    </Tooltip>
                ) : null}
            </div>
        </div>
    );
});
FeedGridItem.displayName = 'FeedGridItem';

interface FeedPageProps {
    images: CanvasImage[];
    rows: ImageRow[];
    isLoading: boolean;
    hasMore: boolean;
    onSelectImage: (id: string) => void;
    onCreateNew: () => void;
    onGenerate?: () => void;
    onUpload?: (files?: FileList, targetFolderId?: string) => void;
    onLoadMore: () => void;
    isFetchingMore?: boolean;
    isSelectMode?: boolean;
    isSelectionSideSheetOpen?: boolean;
    /** Waehlt alle Bilder eines Stapels aus bzw. ab — vom Zaehler auf dem Deckbild. */
    onToggleSelectStack?: (ids: string[]) => void;
    selectedIds?: string[];
    onToggleSelect?: (id: string, isRange?: boolean) => void;
    state?: any;
    actions?: any;
    t?: any;
    expandedGroupId: string | null;
    onExpandedGroupChange: (id: string | null) => void;
    lastViewedId?: string | null;
    /** Stapel, den der Nutzer gerade verlassen hat — wird in die erste Zeile gescrollt. */
    returnToStackId?: string | null;
    onReturnToStackHandled?: () => void;
    onScrollProgress?: (p: number) => void;
    voiceFocusIndex?: number | null;
    showComposer?: boolean;
    onOpenComposer?: () => void;
    onCloseComposer?: () => void;
    columnsOverride?: number;
}

export const FeedPage: React.FC<FeedPageProps> = ({ images, rows, isLoading, hasMore, onSelectImage, onCreateNew, onGenerate, onUpload, onLoadMore, isFetchingMore = false, isSelectMode, isSelectionSideSheetOpen, selectedIds = [], onToggleSelect, onToggleSelectStack, expandedGroupId, onExpandedGroupChange, lastViewedId, returnToStackId, onReturnToStackHandled, state, actions, t, onScrollProgress, voiceFocusIndex, showComposer: showComposerProp, onOpenComposer, onCloseComposer, columnsOverride }) => {
    // URL-based fallback: expandedGroupId may still be null on first render after /stack/:id navigation
    const effectiveGroupId = expandedGroupId || (
        typeof window !== 'undefined' && window.location.pathname.startsWith('/stack/')
            ? window.location.pathname.split('/').pop() || null
            : null
    );

    const sentinelRef = React.useRef<HTMLDivElement>(null);
    /**
     * Anzahl der sichtbaren Kacheln, als Ref.
     *
     * Der Scroll-Zuhoerer haengt weiter oben im Aufbau als displayImages und
     * kaeme sonst an den Wert nicht heran. Ein Ref loest das ohne die Reihenfolge
     * im Aufbau umzustellen — und ohne den Zuhoerer bei jeder Aenderung der
     * Bildzahl neu anzuhaengen.
     */
    const visibleCountRef = React.useRef(0);
    const isMobile = useMobile();
    const gridRef = React.useRef<HTMLDivElement>(null);
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const scrollRafRef = React.useRef<number>(0);
    const { confirm } = useItemDialog();
    // Layer Composer — opened from the entry tile inside an expanded stack grid.
    // If showComposerProp/onOpenComposer/onCloseComposer are provided, the parent manages state;
    // otherwise falls back to local state so the component works standalone.
    const [showComposerInternal, setShowComposerInternal] = React.useState(false);
    const showComposer = showComposerProp ?? showComposerInternal;
    const openComposer = React.useCallback(() => { onOpenComposer?.(); setShowComposerInternal(true); }, [onOpenComposer]);
    const closeComposer = React.useCallback(() => { onCloseComposer?.(); setShowComposerInternal(false); }, [onCloseComposer]);

    // Report scroll progress to parent (drives hero navbar collapse animation).
    // Depends on images.length so the listener is re-registered after the loading
    // state clears and scrollRef finally gets attached to the DOM.
    const [gradientOp, setGradientOp] = React.useState(1);
    const [scrollP, setScrollP] = React.useState(0);
    const hasImages = images.length > 0;
    React.useEffect(() => {
        if (!onScrollProgress) return;
        const el = scrollRef.current;
        if (!el) return;
        const HERO_SCROLL_DISTANCE = 120; // must match TOP_PAD(20) + BOT_EXTRA(100) in AppNavbar hero mode
        // Reset to 0 whenever we (re-)attach so the header snaps to expanded state
        const p0 = Math.min(el.scrollTop / HERO_SCROLL_DISTANCE, 1);
        onScrollProgress(p0);
        setScrollP(p0);
        setGradientOp(Math.max(1 - p0 * 1.3, 0));
        const fn = () => {
            cancelAnimationFrame(scrollRafRef.current);
            scrollRafRef.current = requestAnimationFrame(() => {
                const p = Math.min(el.scrollTop / HERO_SCROLL_DISTANCE, 1);
                onScrollProgress(p);
                setScrollP(p);
                setGradientOp(Math.max(1 - p * 1.3, 0));
            });
        };
        el.addEventListener('scroll', fn, { passive: true });
        return () => { el.removeEventListener('scroll', fn); cancelAnimationFrame(scrollRafRef.current); };
    }, [onScrollProgress, hasImages]);

    // Pagination fallback for the IntersectionObserver: with the min-h-[100dvh]
    // spacer (or in throttled/background tabs) the observer can miss the sentinel,
    // leaving "scroll for more" stuck with nothing loading. A direct near-bottom
    // check guarantees the next page loads. handleLoadMore is itself guarded
    // against duplicate/concurrent loads.
    React.useEffect(() => {
        const el = scrollRef.current;
        if (!el || effectiveGroupId) return; // only the main feed paginates
        const onScroll = () => {
            if (!hasMore || isFetchingMore || isLoading) return;
            // Sind alle Tage zugeklappt, steht nichts im Weg: Der Fussbereich
            // liegt dann staendig im Blick, und jeder Lauf wuerde die naechste
            // Seite holen — die wieder nur eine zugeklappte Zeile beitraegt.
            // Dann wird nicht von selbst geladen; dafuer gibt es den Knopf.
            if (visibleCountRef.current === 0) return;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 600) onLoadMore?.();
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [effectiveGroupId, hasMore, isFetchingMore, isLoading, onLoadMore, hasImages]);

    const prevSelectModeRef = React.useRef(false);
    const prevSelectedCountRef = React.useRef(0);
    const lastSelectImageRef = React.useRef<string | null>(null);
    // Set when entering select mode — the scroll for it fires once the grid has
    // actually swapped to the select-mode layout (see renderSelectMode below).
    const pendingSelectScrollRef = React.useRef<string | null>(null);

    // Time-based retry: waits for the tile to exist in the DOM (up to 600ms)
    // before scrolling. Aligns it to the FIRST visible row (just below the
    // fixed navbar), not centered — so the selected image lands at the top.
    const scrollGridToTile = React.useCallback((targetId: string) => {
        const start = Date.now();
        const scrollFn = () => {
            const el = gridRef.current?.querySelector(`[data-image-id="${targetId}"]`) as HTMLElement | null;
            const sc = scrollRef.current;
            if (el && sc) {
                const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
                sc.scrollTo({ top: Math.max(0, top - NAV_SCROLL_OFFSET), behavior: 'instant' as ScrollBehavior });
            } else if (Date.now() - start < 600) {
                requestAnimationFrame(scrollFn);
            }
        };
        requestAnimationFrame(scrollFn);
    }, []);

    // When entering select mode, scroll to the first selected image (which may have
    // shifted position because the grid re-mounts with all individual images ungrouped)
    // AND ensure we are not in a group drill-down (Select mode always ungroups).
    React.useEffect(() => {
        if (isSelectMode && effectiveGroupId) {
            onExpandedGroupChange(null);
        }
    }, [isSelectMode, effectiveGroupId, onExpandedGroupChange]);

    React.useEffect(() => {
        const isEntering = !!isSelectMode && !prevSelectModeRef.current;
        const isExiting = !isSelectMode && prevSelectModeRef.current;
        const isFirstSelection = !!isSelectMode && prevSelectModeRef.current && prevSelectedCountRef.current === 0 && selectedIds.length > 0;

        prevSelectModeRef.current = !!isSelectMode;
        prevSelectedCountRef.current = selectedIds.length;

        // Track last selected image for scroll restoration on exit
        if (isSelectMode && selectedIds.length > 0) {
            lastSelectImageRef.current = selectedIds[selectedIds.length - 1];
        }

        if (isEntering && selectedIds.length > 0) {
            // The grid hasn't swapped to the ungrouped select-mode layout yet (fade
            // transition, ~160ms — see renderSelectMode below). If the selected
            // tile happens to already be a stack cover, it exists in the OLD
            // (still-showing) grid too, so scrolling immediately would land against
            // stale coordinates that the swap invalidates a moment later — the
            // tile ends up out of view. Defer until the swap actually happened.
            pendingSelectScrollRef.current = selectedIds[0];
        } else if (isFirstSelection && selectedIds.length > 0) {
            // Already showing the select-mode grid — safe to scroll right away.
            scrollGridToTile(selectedIds[0]);
        }

        // Scroll to the cover tile of the last selected image's group when exiting select mode
        if (isExiting && lastSelectImageRef.current) {
            const targetId = lastSelectImageRef.current;
            const start = Date.now();
            const tryScroll = () => {
                // Find cover tile for this image's group
                const row = rows.find(r => r.items.some(i => i.id === targetId));
                const coverId = row ? row.items[0].id : targetId;
                const el = document.querySelector(`[data-image-id="${coverId}"]`);
                if (el) {
                    el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
                } else if (Date.now() - start < 500) {
                    requestAnimationFrame(tryScroll);
                }
            };
            requestAnimationFrame(tryScroll);
            lastSelectImageRef.current = null;
        }
    }, [isSelectMode, selectedIds, effectiveGroupId, rows, scrollGridToTile]);

    // Map: cover image id → row (for quick group lookup)
    // Cover = newest item (first in row, items sorted newest→oldest)
    const groupCountMap = useMemo(() => {
        const map = new Map<string, number>();
        rows.forEach(r => {
            const cover = r.items[0];
            if (cover) map.set(cover.id, r.items.length);
        });
        return map;
    }, [rows]);

    const groupRowMap = useMemo(() => {
        const map = new Map<string, ImageRow>();
        rows.forEach(r => {
            const cover = r.items[0];
            if (cover) map.set(cover.id, r);
        });
        return map;
    }, [rows]);

    // What to render: level 1 = newest item per group as cover, level 2 = all items of expanded group,
    // select mode = all individual images (stacks dissolved)
    // Smooth select-mode transition. Entering/leaving select mode swaps the grid
    // from stack covers to every single image — doing that instantly looked like
    // a chaotic reload. `renderSelectMode` lags behind the real flag: the grid
    // first fades OUT, the content is swapped while invisible, then it fades back
    // IN (with the just-checked tile leading, see staggerDelay below).
    const [renderSelectMode, setRenderSelectMode] = React.useState(!!isSelectMode);
    const [isGridFading, setIsGridFading] = React.useState(false);
    React.useEffect(() => {
        if (!!isSelectMode === renderSelectMode) return;
        setIsGridFading(true);
        const t = setTimeout(() => {
            setRenderSelectMode(!!isSelectMode);
            setIsGridFading(false);
        }, 160);
        return () => clearTimeout(t);
    }, [isSelectMode, renderSelectMode]);

    // Fires the scroll deferred above once the grid has actually swapped to the
    // select-mode (ungrouped) layout, so it targets the tile's FINAL position
    // instead of a pre-swap layout that's about to shift underneath it.
    React.useEffect(() => {
        if (!renderSelectMode || !pendingSelectScrollRef.current) return;
        const targetId = pendingSelectScrollRef.current;
        pendingSelectScrollRef.current = null;
        scrollGridToTile(targetId);
    }, [renderSelectMode, scrollGridToTile]);

    // Eine Identitaet fuer alle Kacheln. Vorher entstand je Stapelkachel bei
    // jedem Rendern eine neue Pfeilfunktion — damit war das memo() an
    // FeedGridItem wirkungslos, und ein Mauszeiger-Wechsel (der nur
    // activeIndex setzt) liess das gesamte Raster neu rendern.
    const handleOpenGroup = React.useCallback((row: ImageRow) => {
        actions?.markGroupSeen?.(row.items.map(i => i.id));
        onExpandedGroupChange(row.id);
    }, [actions, onExpandedGroupChange]);

    /**
     * Tagesabschnitte der Galerie.
     *
     * Nur dort: In einem geoeffneten Stapel und im Auswahlmodus bleibt das
     * Raster flach, weil beide Ansichten bereits einen eigenen Fokus setzen.
     *
     * `rows` ist schon nach Datum sortiert, neueste zuerst — die Map behaelt
     * die Einfuegereihenfolge, also stimmt die Reihenfolge der Abschnitte
     * ohne zweites Sortieren.
     */
    const daySections = useMemo(() => {
        if (effectiveGroupId || renderSelectMode) return null;
        const byDay = new Map<string, CanvasImage[]>();
        for (const row of rows) {
            const cover = row.items[0];
            if (!cover) continue;
            const key = dayKeyOf(row.createdAt ?? cover.createdAt);
            const bucket = byDay.get(key);
            if (bucket) bucket.push(cover);
            else byDay.set(key, [cover]);
        }
        return Array.from(byDay.entries()).map(([key, covers]) => ({
            key,
            label: dayLabelOf(key, state?.currentLang === 'de' ? 'de' : 'en'),
            covers,
            // Die Frist haengt am Tag, nicht an der einzelnen Kachel. Steht die
            // Gruppe zu, sind die gelben Punkte an den Kacheln nicht zu sehen —
            // ohne diesen Wert verschwaende die Warnung mit dem Zuklappen, und
            // genau das waere der Moment, in dem sie gebraucht wird.
            daysLeft: getDayDaysRemaining(key),
        }));
    }, [rows, effectiveGroupId, renderSelectMode, state?.currentLang]);

    // AUFGEKLAPPTE Tage, nicht zugeklappte.
    //
    // Umgekehrt herum war es falsch: Die Liste der zugeklappten Tage wurde
    // einmal beim ersten Aufbau gefuellt. Jeder Tag, der spaeter dazukam —
    // und beim Scrollen kommen staendig aeltere nach — stand nicht darin und
    // galt damit als offen. Deshalb klappte ausgerechnet der unterste Tag
    // immer von selbst auf.
    //
    // Als Menge der offenen Tage kann das nicht passieren: Was nicht
    // ausdruecklich geoeffnet wurde, ist zu. Nachgeladene Tage sind damit
    // automatisch zu, ohne dass die Nachlade-Logik davon wissen muss.
    const [openDays, setOpenDays] = React.useState<Set<string>>(new Set());
    const daysSeededRef = React.useRef(false);
    React.useEffect(() => {
        if (daysSeededRef.current || !daySections || daySections.length === 0) return;
        daysSeededRef.current = true;
        setOpenDays(new Set([daySections[0].key]));
    }, [daySections]);
    const toggleDay = React.useCallback((key: string) => {
        setOpenDays(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    }, []);

    const displayImages = useMemo(() => {
        if (effectiveGroupId) {
            return rows.find(r => r.id === effectiveGroupId)?.items || [];
        }
        if (renderSelectMode) {
            return rows.flatMap(r => r.items);
        }
        // Nur was wirklich sichtbar ist — sonst zeigen Tastatur- und
        // Sprachnavigation auf Kacheln, die gar nicht im Raster stehen.
        if (daySections) {
            return daySections
                .filter(sec => openDays.has(sec.key))
                .flatMap(sec => sec.covers);
        }
        return rows.map(r => r.items[0]).filter(Boolean) as CanvasImage[];
    }, [effectiveGroupId, renderSelectMode, rows, daySections, openDays]);
    visibleCountRef.current = displayImages.length;

    // Track which cover tile to animate when closing a group.
    // useLayoutEffect fires synchronously before paint so the first visible frame
    // already has scale(1.1) applied — avoids the "normal→big→small" zapple.
    const [returnCoverId, setReturnCoverId] = React.useState<string | null>(null);
    // Reveal a specific tile (e.g. a freshly saved layer composite) with the same
    // zoom-return animation used when navigating back — works inside a stack too.
    const [revealId, setRevealId] = React.useState<string | null>(null);
    const prevExpandedGroupId = React.useRef<string | null>(null);

    // Scroll a tile to the FIRST visible row (just below the fixed navbar), so the
    // origin you came from lands at the TOP of the viewport — not merely 'nearest',
    // which leaves an already-visible tile wherever it happened to be. Retries until
    // the grid has re-rendered the tile.
    const scrollTileToTop = React.useCallback((tileId: string) => {
        const start = Date.now();
        const tryScroll = () => {
            const el = gridRef.current?.querySelector(`[data-image-id="${tileId}"]`) as HTMLElement | null;
            const sc = scrollRef.current;
            if (el && sc) {
                const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
                sc.scrollTo({ top: Math.max(0, top - NAV_SCROLL_OFFSET), behavior: 'instant' as ScrollBehavior });
            } else if (Date.now() - start < 500) {
                requestAnimationFrame(tryScroll);
            }
        };
        requestAnimationFrame(tryScroll);
    }, []);

    // Rückkehr aus einem Stapel über den Routenwechsel: Die ID kommt von App,
    // weil sie den Neuaufbau dieser Komponente überleben muss. Greift einmal
    // pro Rückkehr, danach meldet die Komponente zurück und App vergisst sie.
    const handledReturnRef = React.useRef<string | null>(null);
    React.useLayoutEffect(() => {
        if (!returnToStackId || handledReturnRef.current === returnToStackId) return;
        const row = rows.find(r => r.id === returnToStackId);
        const cover = row?.items[0];
        if (!cover) return; // Reihen noch nicht geladen — nächster Durchlauf
        handledReturnRef.current = returnToStackId;
        setReturnCoverId(cover.id);
        setTimeout(() => setReturnCoverId(null), ZOOM_RETURN_CLEAR_MS);
        scrollTileToTop(cover.id);
        onReturnToStackHandled?.();
    }, [returnToStackId, rows, scrollTileToTop, onReturnToStackHandled]);

    React.useLayoutEffect(() => {
        if (prevExpandedGroupId.current && !expandedGroupId) {
            const row = rows.find(r => r.id === prevExpandedGroupId.current);
            const cover = row?.items[0];
            if (cover) {
                setReturnCoverId(cover.id);
                setTimeout(() => setReturnCoverId(null), ZOOM_RETURN_CLEAR_MS);
                // Scroll the origin stack's cover to the top row after re-render.
                scrollTileToTop(cover.id);
            }
        }
        prevExpandedGroupId.current = expandedGroupId;
    }, [expandedGroupId, rows, scrollTileToTop]);

    // Resolve lastViewedId → the cover tile of whichever row contains it
    const lastViewedRowCoverId = React.useMemo(() => {
        if (!lastViewedId) return null;
        if (displayImages.some(i => i.id === lastViewedId)) return lastViewedId;
        const row = rows.find(r => r.items.some(i => i.id === lastViewedId));
        if (!row) return null;
        return row.items[0].id;
    }, [lastViewedId, displayImages, rows]);

    // Rückkehr aus der Detailansicht — exakt derselbe Weg wie die Rückkehr aus
    // einem Stapel. Vorher war er schwächer gebaut und blieb deshalb hinter
    // dem Stapel-Verhalten zurück:
    //
    //   - Er löste nur den Scroll aus, nie den Zoom. Der hing stattdessen an
    //     einem Zeitfenster nach dem Aufbau — ein Wettlauf mit dem Laden, den
    //     die Bilder regelmäßig gewannen.
    //   - Er merkte sich "erledigt", bevor die Kachel überhaupt existierte.
    //     War sie noch nicht da, war der eine Versuch verbraucht.
    //   - Er lief nach dem Zeichnen statt davor, was den Sprung sichtbar macht.
    //
    // Jetzt: vor dem Zeichnen, wartet auf die Kachel, löst Zoom und Scroll
    // gemeinsam aus, und gilt erst dann als erledigt.
    const handledLastViewedRef = React.useRef<string | null>(null);
    React.useLayoutEffect(() => {
        if (!lastViewedRowCoverId) return;
        if (handledLastViewedRef.current === lastViewedRowCoverId) return;
        // Steht die Kachel noch nicht in den Reihen, übernimmt der nächste Durchlauf.
        if (!rows.some(r => r.items.some(i => i.id === lastViewedRowCoverId))) return;
        handledLastViewedRef.current = lastViewedRowCoverId;
        setReturnCoverId(lastViewedRowCoverId);
        setTimeout(() => setReturnCoverId(null), ZOOM_RETURN_CLEAR_MS);
        scrollTileToTop(lastViewedRowCoverId);
    }, [lastViewedRowCoverId, rows, scrollTileToTop]);

    // O(1) lookups instead of O(n) per item
    const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const imageIdMap = useMemo(() => new Map(images.map(i => [i.id, i])), [images]);

    // Drag & drop file upload
    const [isDropActive, setIsDropActive] = React.useState(false);
    const dragCounter = React.useRef(0);

    const handleDragEnter = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDropActive(true);
            actions?.setIsDragOver?.(true);
        }
    }, [actions]);

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            setIsDropActive(false);
            actions?.setIsDragOver?.(false);
        }
    }, [actions]);

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDropActive(false);
        actions?.setIsDragOver?.(false);

        const files = e.dataTransfer.files;
        if (files?.length && onUpload) {
            // Drop innerhalb eines geöffneten Stapels: Bilder dort einsortieren
            // statt für jedes einen neuen Stapel anzulegen.
            onUpload(files, effectiveGroupId || undefined);
        }
    }, [onUpload, actions, effectiveGroupId]);

    // Dynamically calculate columns based on actual DOM layout
    const [columns, setColumns] = React.useState(2);
    React.useEffect(() => {
        const updateColumns = () => {
            if (!gridRef.current || !gridRef.current.children.length) return;
            // Tages-Kopfzeilen sind vollbreite Rasterelemente und wuerden die
            // Spaltenzaehlung auf 1 druecken — sie stehen allein in ihrer Zeile.
            const children = (Array.from(gridRef.current.children) as HTMLElement[])
                .filter(el => el.dataset.dayHeader !== '1');
            if (children.length === 0) return;
            const firstTop = children[0].offsetTop;
            let colCountRaw = 0;
            for (const child of children) {
                if (child.offsetTop === firstTop) {
                    colCountRaw++;
                } else {
                    break;
                }
            }
            const colCount = colCountRaw > 0 ? colCountRaw : 2;
            setColumns(colCount);
            actions?.setGridColumns?.(colCount);
        };
        requestAnimationFrame(updateColumns);
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, [displayImages]);

    const { activeIndex, setActiveIndex } = useKeyboardGridNavigation({
        itemCount: displayImages.length,
        columns,
        isActive: true,
        getElementAtIndex: useCallback((idx: number) => {
            const img = displayImages[idx];
            return img ? document.querySelector(`[data-image-id="${img.id}"]`) : null;
        }, [displayImages]),
        onEscape: () => {
            if (effectiveGroupId) { onExpandedGroupChange(null); return; }
            if (isSelectMode) actions?.setIsSelectMode?.(false);
        },
        onEnter: (idx) => {
            const img = displayImages[idx];
            if (!img) return;
            const gc = effectiveGroupId ? 1 : (groupCountMap.get(img.id) ?? 1);
            const row = effectiveGroupId ? null : groupRowMap.get(img.id);
            if (gc > 1 && row) { onExpandedGroupChange(row.id); return; }
            if (isSelectMode && onToggleSelect) onToggleSelect(img.id);
            else onSelectImage(img.id);
        },
        onDelete: async (idx) => {
            const img = displayImages[idx];
            if (!img) return;

            const toDelete = isSelectMode && selectedIdSet.has(img.id) ? selectedIds : [img.id];

            const confirmed = await confirm({
                title: toDelete.length > 1 ? (t?.('delete_confirm_multi') || 'Delete images') : (t?.('delete_confirm_single') || 'Delete image'),
                description: toDelete.length > 1 ? (t?.('delete_confirm_multi') || `Do you really want to delete ${toDelete.length} image(s)?`) : (t?.('delete_confirm_single') || `Do you really want to delete ${toDelete.length} image(s)?`),
                confirmLabel: t?.('delete') || 'Delete',
                cancelLabel: t?.('cancel') || 'Cancel',
                variant: 'danger'
            });
            if (confirmed && actions?.handleDeleteImage) {
                toDelete.forEach(id => actions.handleDeleteImage(id, true));
                if (isSelectMode) actions?.setIsSelectMode?.(false);
            }
        }
    });

    React.useEffect(() => {
        if (!hasMore || isLoading || isFetchingMore) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoading && !isFetchingMore && hasMore) {
                console.log('[FeedPage] Sentinel hit, triggering onLoadMore');
                if (typeof onLoadMore === 'function') {
                    onLoadMore();
                }
            }
        }, {
            threshold: 0.1,
            rootMargin: '200px', // Start loading 200px before reaching the end
            root: scrollRef.current
        });

        if (sentinelRef.current && displayImages.length > 0) {
            observer.observe(sentinelRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, isLoading, isFetchingMore, onLoadMore]);

    // Eine Kachel. Herausgezogen, weil das Raster sie an zwei Stellen
    // braucht: flach (Stapel, Auswahlmodus) und nach Tagen gruppiert.
    const renderTile = (img: CanvasImage, idx: number) => {
        const gc = (effectiveGroupId || renderSelectMode) ? 1 : (groupCountMap.get(img.id) ?? 1);
        const row = (effectiveGroupId || renderSelectMode) ? null : groupRowMap.get(img.id);
        const hasGen = row?.items.some(i => i.isGenerating) ?? false;
        const parentImg = img.parentId ? imageIdMap.get(img.parentId) : undefined;
        const parentSrc = parentImg ? (parentImg.thumbSrc || parentImg.src) : undefined;
        const unseenIds: Set<string> = state?.unseenIds ?? new Set();
        // For group covers: dot if any item in group is unseen
        const rowItems = row?.items ?? [img];
        const isNew = !effectiveGroupId
            ? rowItems.some(i => unseenIds.has(i.id))
            : unseenIds.has(img.id);
        // TTL: use root image's createdAt for group covers
        const rootImg = rowItems.find(i => !i.parentId) ?? img;
        const daysLeft = getDaysRemaining(rootImg.createdAt);
        return (
            <FeedGridItem
                key={img.id}
                img={img}
                idx={idx}
                isSelected={selectedIdSet.has(img.id)}
                isKeyboardActive={activeIndex === idx || voiceFocusIndex === idx}
                isSelectMode={!!isSelectMode}
                onSelectImage={onSelectImage}
                onToggleSelect={onToggleSelect}
                setActiveIndex={setActiveIndex}
                actions={actions}
                parentSrc={parentSrc}
                groupCount={gc}
                hasGenerating={hasGen}
                group={row}
                onOpenGroup={gc > 1 && row ? handleOpenGroup : undefined}
                onToggleSelectStack={gc > 1 && row && onToggleSelectStack
                    ? () => onToggleSelectStack(row.items.map(i => i.id))
                    : undefined}
                staggerDelay={
                    renderSelectMode
                        // In select mode the tile the user just checked leads, the rest
                        // follow a beat later so the eye keeps its anchor.
                        ? (selectedIdSet.has(img.id) ? 0 : 90 + Math.min(idx * 22, 260))
                        : effectiveGroupId ? Math.min(idx * 35, 350) : undefined
                }
                // Der Rückkehr-Zoom galt bisher nur in der Galerie
                // (!effectiveGroupId) — aus der Detailansicht zurück in
                // einen Stapel blieb er deshalb aus. Die Kachel ist dort
                // genauso vorhanden, der Ausschluss war nicht begründet.
                // Im Auswahlmodus bleibt er aus: Dort wird markiert,
                // nicht navigiert.
                isLastViewed={img.id === revealId || (!renderSelectMode && img.id === (returnCoverId ?? ''))}
                isNew={isNew}
                daysRemaining={daysLeft}
                currentLang={state?.currentLang}
                isSource={!img.parentId && !img.isGenerating && (!!effectiveGroupId || renderSelectMode)}
            />
        );
    };

    if (isLoading && images.length === 0) {
        // Auch der Ladezustand nimmt Dateien an. Vorher kehrte FeedPage hier
        // zurück, bevor die Drop-Handler überhaupt im Baum standen — und der
        // globale Handler in App.tsx steigt auf '/' ausdrücklich aus, weil er
        // FeedPage den Vortritt lässt. In den ersten Sekunden nach dem Öffnen
        // fiel ein Drop damit durch, ohne Hinweis.
        return (
            <div
                className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400 dark:text-zinc-800" />
            </div>
        );
    }

    const triggerUpload = () => document.getElementById('feed-upload-input')?.click();

    return (
        <div
            className="flex-1 flex overflow-hidden relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Shared hidden file input for all upload triggers */}
            <input
                type="file"
                id="feed-upload-input"
                className="hidden"
                accept="image/*"
                multiple
                // Gleiche Regel wie beim Drop: Ist ein Stapel geöffnet, landen die
                // Bilder dort statt in einem neuen.
                onChange={(e) => { if (e.target.files?.length) onUpload?.(e.target.files, effectiveGroupId || undefined); e.target.value = ''; }}
            />
            <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-zinc-950 relative flex flex-col">

                {/* Drag & drop overlay */}
                {isDropActive && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <div className="absolute inset-0 bg-black/60" />
                        <div className={`relative flex flex-col items-center gap-3 px-10 py-8 ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusXl} ${Theme.Effects.ShadowLg}`}>
                            <Upload className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                            <p className={`${Typo.Body} text-sm text-zinc-600 dark:text-zinc-400`}>
                                {t?.('drop_files_here') || 'Drop files here'}
                            </p>
                        </div>
                    </div>
                )}
                {/* Fixed spacer so content starts below the expanded hero header */}
                {/* renderSelectMode (not isSelectMode) so the hero disappears together
                    with the grid swap instead of jumping mid-fade. */}
                {!effectiveGroupId && !renderSelectMode && images.length > 0 && onScrollProgress && (
                    <FeedHeroSection />
                )}
                <div className="flex-1 flex flex-col">
                    {/* Die Mindesthoehe haelt den Fussbereich unten, solange das
                        Raster den Schirm fuellt. Bei zugeklappten Tagen gibt es
                        nichts zu fuellen — dann waere sie nur ein Bildschirm
                        Schwarz zwischen Liste und Fuss. */}
                    <div className={`flex-1 flex flex-col relative pb-16 ${displayImages.length > 0 ? 'min-h-[100dvh]' : ''}`}>
                        {/*
                            Nicht an displayImages haengen, sondern daran, ob es
                            ueberhaupt Bilder gibt.

                            displayImages enthaelt seit den Tagesgruppen nur die
                            SICHTBAREN Kacheln. Klappt jemand alle Tage zu, ist es
                            leer — und der leere Zustand haette die Kopfzeilen
                            verdraengt, mit denen man sie wieder aufklappt. Eine
                            Sackgasse, aus der nur ein Neuladen herausfuehrt.
                        */}
                        {(displayImages.length > 0 || (daySections?.length ?? 0) > 0) ? (
                            <>
                                {/*
                                    Ablagestreifen ueber der Galerie.

                                    Nur dort: In einem geoeffneten Stapel und im
                                    Auswahlmodus hat die Ansicht eine andere
                                    Aufgabe, und ein Hochladen-Angebot stuende im
                                    Weg. Er scrollt mit dem Inhalt weg, statt
                                    dauerhaft Platz zu belegen.

                                    Gleiche Seitenabstaende wie das Raster, damit
                                    er buendig mit den Kacheln steht.
                                */}
                                {!effectiveGroupId && !renderSelectMode && (
                                    <div className="px-4 sm:px-8">
                                        <UploadDropZone
                                            row
                                            onClick={triggerUpload}
                                            active={isDropActive}
                                            label={t?.('welcome_drop_cta') || 'Upload and edit'}
                                        />
                                    </div>
                                )}
                                <div
                                    key={`${effectiveGroupId ?? 'root'}-${renderSelectMode ? 'select' : 'normal'}`}
                                    ref={gridRef}
                                    className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 items-end gap-x-3 gap-y-10 sm:gap-x-6 sm:gap-y-16 px-4 sm:px-8 mt-0 bg-transparent animate-in fade-in ${effectiveGroupId ? 'zoom-in-[99%]' : ''} duration-200 ease-out transition-opacity ${isGridFading ? 'opacity-0' : 'opacity-100'} ${effectiveGroupId ? 'pt-12 sm:pt-16' : 'pt-2 sm:pt-4'} ${isMobile ? 'pb-[max(9rem,calc(9rem+env(safe-area-inset-bottom)))]' : ''}`}
                                style={columnsOverride ? { gridTemplateColumns: `repeat(${columnsOverride}, minmax(0, 1fr))` } : undefined}
                                >
                                    {daySections ? (() => {
                                        // Ein fortlaufender Index ueber die SICHTBAREN Kacheln, damit
                                        // Tastatur- und Sprachnavigation mit displayImages uebereinstimmen.
                                        let imgIdx = 0;
                                        return daySections.flatMap(sec => {
                                            const closed = !openDays.has(sec.key);
                                            const header = (
                                                <button
                                                    key={`day-${sec.key}`}
                                                    data-day-header="1"
                                                    onClick={() => toggleDay(sec.key)}
                                                    // Negative Aussenabstaende gegen den Zeilenabstand des
                                                    // Rasters: Der ist fuer Bildkacheln gedacht und laesst
                                                    // zwischen zwei zugeklappten Tagen sonst eine halbe
                                                    // Bildhoehe Luft stehen.
                                                    // Der Zeilenabstand des Rasters wird exakt
                                                    // aufgehoben (-my-5 bzw. -my-8 bei gap-y-10/16)
                                                    // und durch einen eigenen ersetzt. Vorher hob
                                                    // ihn ein ungefaehrer Wert nur teilweise auf,
                                                    // und zwar an beiden Breiten unterschiedlich —
                                                    // daher die ungleichen Luecken zwischen den
                                                    // Tagen.
                                                    // Buendig mit Kacheln und Ablageflaeche: keine
                                                    // negativen Seitenabstaende mehr, die die Zeile
                                                    // 8 Pixel ueber die Spalte hinausschoben.
                                                    // Dieselbe Rundung und dieselbe Flaechenfarbe
                                                    // wie dort — und mehr Hoehe, damit die Flaeche
                                                    // beim Ueberfahren traegt statt nur anzudeuten.
                                                    className="col-span-full flex items-center gap-2 px-4 py-3.5 -my-5 sm:-my-8 rounded-2xl text-left
                                                        hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors duration-150 group/day"
                                                >
                                                    <ChevronRight
                                                        className={`w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-200 ${closed ? '' : 'rotate-90'}`}
                                                        strokeWidth={2}
                                                    />
                                                    {/* Dezenter: Die Kopfzeile ordnet, sie ist nicht
                                                        der Inhalt. Typo.H4 ist halbfett und in
                                                        Textfarbe — damit stand das Datum lauter da
                                                        als die Bilder darunter. */}
                                                    <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 group-hover/day:text-zinc-800 dark:group-hover/day:text-zinc-200 transition-colors">
                                                        {sec.label}
                                                    </span>
                                                    {sec.daysLeft != null && sec.daysLeft <= WARNING_DAYS && (
                                                        // Dezent, aber nicht zu uebersehen: Steht der Tag zu,
                                                        // sind die gelben Punkte an den Kacheln verdeckt, und
                                                        // dies ist die einzige Stelle, an der die Frist noch
                                                        // auftaucht.
                                                        <span className="ml-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-black/[0.04] dark:bg-white/[0.06]">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                                            {state?.currentLang === 'de'
                                                                ? `noch ${Math.max(0, sec.daysLeft)} ${sec.daysLeft === 1 ? 'Tag' : 'Tage'}`
                                                                : `${Math.max(0, sec.daysLeft)} ${sec.daysLeft === 1 ? 'day' : 'days'} left`}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                            if (closed) return [header];
                                            return [header, ...sec.covers.map(img => renderTile(img, imgIdx++))];
                                        });
                                    })() : displayImages.map((img, idx) => renderTile(img, idx))}

                                    {/* Layer Composer entry — only inside an expanded stack with 2+ variants.
                                        Matches the parent image's aspect ratio (letterboxed in the square cell)
                                        so it lines up uniformly with the other tiles. */}
                                    {effectiveGroupId && !isSelectMode && displayImages.length >= 2 && (
                                        <button
                                            onClick={openComposer}
                                            style={{ aspectRatio: `${displayImages[0].width} / ${displayImages[0].height}`, width: '100%', height: 'auto' }}
                                            // Dieselbe Flaechensprache wie die Ablagestreifen,
                                            // aber die Ecken der Bildkacheln: Die sind eckig,
                                            // und ein gerundeter Kasten mittendrin bricht die
                                            // Reihe. Rundung ist hier kein Stil, sondern eine
                                            // Aussage ueber Zugehoerigkeit.
                                            className="relative flex flex-col items-center justify-center gap-2.5
                                                bg-black/[0.03] dark:bg-white/[0.04]
                                                hover:bg-black/[0.05] dark:hover:bg-white/[0.06]
                                                text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300
                                                transition-colors duration-200"
                                        >
                                            {/* Layers2 statt SquaresSubtract: zwei ruhige
                                                Flaechen uebereinander. Das alte Symbol trug
                                                eine gestrichelte Kontur und einen Ausschnitt
                                                und war damit das unruhigste Element im
                                                ganzen Raster. */}
                                            <Layers2 className="w-6 h-6" strokeWidth={1.5} />
                                            <span className="text-xs font-medium px-2 text-center leading-tight">
                                                {state?.currentLang === 'de' ? 'Ebenen kombinieren' : 'Combine layers'}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : !isLoading && (
                            /*
                                Leerer Zustand.

                                Vorher standen hier zwei gleich schwere
                                Vollbreit-Knoepfe untereinander, eine Ueberschrift
                                in Fliesstextgroesse (text-sm font-bold) und eine
                                Verschachtelung, deren aeussere Huelle nur ein
                                einziges Kind hatte. Dazu siezte der deutsche Text,
                                waehrend der Rest der App duzt.

                                Jetzt eine Handlung im Vordergrund: die Flaeche
                                selbst. Sie nimmt den Klick UND den Drop, also
                                braucht es daneben keinen zweiten Hochladen-Knopf.
                                Das Generieren bleibt als ruhiger Textlink darunter
                                — vorhanden, aber nicht im Wettbewerb.
                            */
                            <div className="flex-1 flex flex-col items-center justify-center px-6 w-full max-w-[420px] mx-auto gap-7 animate-in fade-in duration-500 min-h-full">
                                <div className="text-center space-y-1.5">
                                    <h1 className={Typo.H1}>
                                        {t?.('welcome_title') || 'Welcome to exposé'}
                                    </h1>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {t?.('welcome_empty_desc') || 'Upload photos to edit or generate something new.'}
                                    </p>
                                </div>

                                <UploadDropZone
                                    onClick={triggerUpload}
                                    active={isDropActive}
                                    label={t?.('welcome_drop_cta') || 'Upload and edit'}
                                />

                                <button
                                    onClick={onGenerate ?? onCreateNew}
                                    className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                                >
                                    {t?.('action_generate') || 'Generate image'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Infinite scroll sentinel + loading indicator */}
                {!effectiveGroupId && (hasMore || isFetchingMore) && (
                    <div ref={sentinelRef} className="flex flex-col items-center justify-center min-h-[8rem] py-8 gap-4">
                        <div className={`transition-all duration-1000 ease-in-out flex flex-col items-center ${ (isLoading || isFetchingMore) ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none' }`}>
                            <Loader2 className="w-10 h-10 animate-[spin_3s_linear_infinite] text-zinc-300 dark:text-zinc-800" />
                        </div>
                        
                        {!isLoading && !isFetchingMore && hasMore && (
                            displayImages.length > 0 ? (
                                <div className="animate-in fade-in duration-1000 flex flex-col items-center gap-2 text-zinc-400/50 dark:text-zinc-600/50">
                                    <div className="text-[10px] uppercase tracking-[0.3em] font-medium">
                                        {state?.currentLang === 'de' ? 'Weiter scrollen' : 'Scroll for more'}
                                    </div>
                                </div>
                            ) : (
                                // Zugeklappte Tage fuellen den Schirm nicht, also laedt
                                // nichts von selbst nach. Statt "weiter scrollen" — wohin
                                // auch — ein Knopf, der genau eine Seite holt.
                                <button
                                    onClick={() => onLoadMore?.()}
                                    className="animate-in fade-in duration-500 text-[13px] font-medium px-4 py-2 rounded-full
                                        text-zinc-500 dark:text-zinc-400
                                        bg-black/[0.04] dark:bg-white/[0.06]
                                        hover:bg-black/[0.07] dark:hover:bg-white/[0.10] transition-colors"
                                >
                                    {state?.currentLang === 'de' ? 'Ältere laden' : 'Load older'}
                                </button>
                            )
                        )}
                    </div>
                )}

                <div className="mt-auto">
                    <GlobalFooter
                        t={t}
                        onGalleryClick={() => {
                            // Already on feed, just scroll to top
                            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    />
                </div>
            </div>

            {/* Mobile selection action bar */}
            {isSelectMode && isMobile && selectedIds.length > 0 && (
                <div className={`fixed bottom-[max(5rem,calc(5rem+env(safe-area-inset-bottom)))] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} rounded-full shadow-xl backdrop-blur-md`}>
                    <button
                        onClick={() => actions?.handleDownload?.(selectedIds)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black dark:text-white"
                    >
                        <Download className="w-4 h-4" />
                        {selectedIds.length > 1 ? (t?.('n_download') || 'Download {{n}}').replace('{{n}}', String(selectedIds.length)) : (t?.('nav_download') || 'Download')}
                    </button>
                    <div className={`w-px h-5 ${Theme.Colors.Border} bg-current opacity-20`} />
                    <button
                        onClick={() => actions?.setIsSelectMode?.(false)}
                        className="flex items-center justify-center w-8 h-8 text-zinc-500 dark:text-zinc-400"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Selection SideSheet */}
            {isSelectMode && !isMobile && isSelectionSideSheetOpen && (
                <div className={`w-[380px] shrink-0 ${Theme.Colors.CanvasBg} flex flex-col z-10 relative`}>
                    {selectedIds.length > 0 ? (() => {
                        const selectedImages = images.filter(img => selectedIds.includes(img.id));
                        const selectedImage = selectedImages.length > 0 ? selectedImages[selectedImages.length - 1] : null;

                        return (
                            <SideSheet
                                key={selectedImage?.id ?? 'no-selection'}
                                selectedImage={selectedImage}
                                selectedImages={selectedImages}
                                sideSheetMode={state?.sideSheetMode || 'prompt'}
                                onModeChange={actions?.handleModeChange || (() => { })}
                                brushSize={state?.brushSize || 50}
                                onBrushSizeChange={actions?.setBrushSize || (() => { })}
                                onBrushResizeStart={() => actions?.setIsBrushResizing?.(true)}
                                onBrushResizeEnd={() => actions?.setIsBrushResizing?.(false)}
                                onGenerate={actions?.handleGenerate || (() => { })}
                                onUpdateAnnotations={actions?.handleUpdateAnnotations || (() => { })}
                                onUpdatePrompt={actions?.handleUpdatePrompt || (() => { })}
                                onUpdateVariables={actions?.handleUpdateVariables || (() => { })}
                                onDeleteImage={actions?.handleDeleteImage || (() => { })}
                                onDeselectAll={actions?.deselectAll || (() => { })}
                                onGenerateMore={actions?.handleGenerateMore || (() => { })}
                                onNavigateParent={actions?.handleNavigateParent || (() => { })}
                                onDownload={actions?.handleDownload || (() => { })}
                                isDragOver={state?.isDragOver}
                                onGlobalDragLeave={() => actions?.setIsDragOver?.(false)}
                                t={t || ((key: string) => key)}
                                lang={state?.currentLang || 'en'}
                                fullLibrary={state?.fullLibrary || []}
                                onAddUserCategory={actions?.addUserCategory || (() => { })}
                                onDeleteUserCategory={actions?.deleteUserCategory || (() => { })}
                                onAddUserItem={actions?.addUserItem || (async () => { })}
                                onDeleteUserItem={actions?.deleteUserItem || (() => { })}
                                maskTool={state?.maskTool || 'brush'}
                                onMaskToolChange={actions?.setMaskTool || (() => { })}
                                activeShape={state?.activeShape || 'rect'}
                                onActiveShapeChange={actions?.setActiveShape || (() => { })}
                                onInteractionStart={() => actions?.setSnapEnabled?.(false)}
                                onInteractionEnd={() => actions?.setSnapEnabled?.(true)}
                                qualityMode={state?.qualityMode || 'fast'}
                                onQualityModeChange={actions?.setQualityMode || (() => { })}
                                templates={state?.templates || []}
                                onSaveTemplate={actions?.saveTemplate || (async () => { })}
                                onDeleteTemplate={actions?.deleteTemplate || (async () => { })}
                                userProfile={state?.userProfile}
                                initialPrompt={
                                    selectedImage?.parentId
                                        ? imageIdMap.get(selectedImage.parentId)?.userDraftPrompt ?? ''
                                        : selectedImage?.userDraftPrompt ?? ''
                                }
                            />
                        );
                    })() : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 gap-3">
                            <Layers className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                            <p className="text-sm font-medium">
                                {t?.('select_images_to_edit') || 'Select images to edit'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {showComposer && effectiveGroupId && displayImages.length >= 2 && (
                <LayerComposer
                    stack={displayImages}
                    initialBaseId={displayImages[0].id}
                    title={rows.find(r => r.id === effectiveGroupId)?.title || ''}
                    onClose={closeComposer}
                    onSave={async (base, dataUrl, w, h) => {
                        const newId = await actions?.handleSaveComposite?.(base, dataUrl, w, h);
                        // Nach dem Speichern immer in der Stapel-Ansicht landen, nicht im Detail
                        if (effectiveGroupId) onExpandedGroupChange(effectiveGroupId);
                        // Neues Composite mit Zoom-Return-Reveal hervorheben (Indikator)
                        if (newId) { setRevealId(newId); setTimeout(() => setRevealId(null), 600); }
                    }}
                    t={t}
                    isDe={state?.currentLang === 'de'}
                />
            )}
        </div>
    );
};
