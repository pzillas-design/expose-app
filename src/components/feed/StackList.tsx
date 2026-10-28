import React from 'react';
import { Repeat, Download, Pencil } from 'lucide-react';
import { GeneratingRing } from '@/components/ui/GeneratingRing';
import type { CanvasImage } from '@/types';
import { imageNameOf } from '@/utils/imageName';
import { formatRelativeTime } from '@/utils/timeUtils';

/**
 * Der Stapel von innen: eine Liste, kein Raster.
 *
 * Ein Stapel ist eine Reihe von Versuchen am selben Bild. Im Raster standen
 * sie als gleich grosse Kacheln nebeneinander — das ist die Form fuer "viele
 * verschiedene Bilder", nicht fuer "dasselbe Bild, sechsmal anders". Zum
 * Vergleichen braucht man eine Achse, und die ist hier senkrecht: ein Bild
 * unter dem anderen, gross, immer gleich breit, mittig auf der Seite.
 *
 * Unter jedem Bild eine Zeile: links Fassung und Alter, rechts die
 * Handlungen. Was verlangt wurde, erscheint beim Ueberfahren — stuende es
 * immer da, laese man bei sechs Fassungen sechsmal fast denselben Satz, und
 * aus der Bildstrecke wuerde eine Textwand.
 *
 * Die Bilder kommen in voller Aufloesung, nicht als Vorschau: Hier wird
 * verglichen, und ein Unterschied, den man nur in den Details sieht, ist in
 * einer 512er Vorschau keiner. Geladen wird erst beim Herankommen.
 */
interface StackListProps {
    images: CanvasImage[];
    activeId?: string | null;
    currentLang?: 'de' | 'en';
    onSelect: (id: string) => void;
    onGenerateMore?: (img: CanvasImage) => void;
    onDownload?: (id: string) => void;
    onHoverIndex?: (idx: number | null) => void;
    t?: (key: any) => string;
}

/**
 * Zurueckgenommen, bis der Zeiger in der Zeile steht.
 *
 * Auf dem Handy immer voll: Dort gibt es kein Ueberfahren, und was man nicht
 * sehen kann, kann man nicht benutzen.
 */
const ROW_DIM = 'opacity-100 md:opacity-45 md:group-hover/row:opacity-100';

/**
 * Eine Handlung in der Zeile: leise, gleiche Hoehe, gleiche Flaeche.
 *
 * `primary` heisst: Dieser Knopf tut dasselbe wie ein Klick auf die Zeile.
 * Er nimmt deshalb schon das Hover-Aussehen an, wenn irgendwo in der Zeile
 * der Zeiger steht — sonst sieht man beim Ueberfahren der Zeile nicht, was
 * ein Klick ausloesen wuerde.
 */
const RowAction: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
    primary?: boolean;
}> = ({ onClick, icon, children, primary = false }) => (
    <button
        onClick={e => { e.stopPropagation(); onClick(); }}
        className={`h-9 px-3.5 rounded-full inline-flex items-center gap-2 text-[13px] font-medium
            text-zinc-600 dark:text-zinc-300
            hover:bg-black/[0.05] dark:hover:bg-white/[0.08]
            hover:text-zinc-900 dark:hover:text-white
            transition-colors duration-150
            ${primary ? 'group-hover/row:bg-black/[0.05] dark:group-hover/row:bg-white/[0.08] group-hover/row:text-zinc-900 dark:group-hover/row:text-white' : ''}`}
    >
        {icon}
        {children}
    </button>
);

const StackRow: React.FC<{
    img: CanvasImage;
    idx: number;
    /** Nummer, die diese Fassung bekommen wird — fuer Platzhalter ohne eigene. */
    fallbackVersion?: number | null;
    isActive: boolean;
    lang: 'de' | 'en';
    onSelect: (id: string) => void;
    onGenerateMore?: (img: CanvasImage) => void;
    onDownload?: (id: string) => void;
    onHoverIndex?: (idx: number | null) => void;
    t?: (key: any) => string;
}> = ({ img, idx, fallbackVersion, isActive, lang, onSelect, onGenerateMore, onDownload, onHoverIndex, t }) => {
    const { version } = imageNameOf(img);
    const isOriginal = !img.parentId;
    /*
        Welche Nummer draufsteht.

        `imageNameOf` liefert null, wenn die Spalte fehlt oder 1 ist — und
        genau das ist beim Platzhalter der Fall: Ein aus der Datenbank
        rekonstruierter Auftrag traegt version 0 ("wird beim Fertigwerden
        gesetzt"). Daraus wurde woertlich "vnull". Fehlt die Nummer, nimmt die
        Liste die naechste freie ihres Stapels; weiss auch die nichts, bleibt
        die Zeile ohne Nummer statt mit einer falschen.
    */
    const shownVersion = version ?? fallbackVersion ?? null;
    /*
        Die Fassung, die gerade entsteht.

        Sie steht schon in der Liste, bevor es sie gibt — als Platzhalter an
        ihrem Platz, damit man sieht, WO sie erscheinen wird. Gezeigt wird
        dasselbe Bild, aus dem sie hervorgeht, stark weichgezeichnet und
        gedimmt; darueber ein Schimmer, der laeuft. Ein leeres Rechteck waere
        die ehrlichere, aber die kaeltere Antwort: Man wartet besser, wenn man
        sieht, woran gearbeitet wird.
    */
    const isPending = !!img.isGenerating;
    /*
        Nur der Auftrag, der dieses Bild erzeugt hat.

        Vorher wich der Code auf den ENTWURF aus (userDraftPrompt), wenn kein
        Auftrag da war. Beim Original ist das der Text, den jemand gerade ins
        Feld geschrieben hat — er hat das Bild nicht gemacht, er steht nur
        daneben. Unter dem Original stand damit ein Satz, der eine Herkunft
        behauptete, die es nicht gibt.
    */
    const prompt = (img.generationPrompt || '').trim();
    // Volle Aufloesung; das Vorschaubild dient nur als Platzhalter, bis sie da ist.
    const full = img.src || img.thumbSrc;

    const imgRef = React.useCallback((node: HTMLImageElement | null) => {
        if (node?.complete) node.style.opacity = '1';
    }, []);

    return (
        <div
            data-image-id={img.id}
            onMouseEnter={() => onHoverIndex?.(idx)}
            onMouseLeave={() => onHoverIndex?.(null)}
            style={{
                // Jede Zeile kommt aus der Lage der vorigen heran — weiter unten
                // heisst weiter her. Gedeckelt, damit die zehnte Fassung nicht
                // aus dem Bildschirm heranfliegt.
                ['--fan-from' as any]: `${-Math.min(16 + idx * 12, 72)}px`,
                animationDelay: `${Math.min(idx * 50, 350)}ms`,
            }}
            /*
                Die ganze Zeile ist der Weg hinein — Bild, Text und der
                Weissraum daneben. Vorher war nur das Bild anklickbar, und wer
                neben den Text traf, bekam nichts. Die Knoepfe darin halten
                ihren Klick bei sich (stopPropagation in RowAction).
            */
            role="button"
            tabIndex={isPending ? -1 : 0}
            onClick={() => { if (!isPending) onSelect(img.id); }}
            onKeyDown={e => {
                if (isPending) return;
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(img.id); }
            }}
            className={`group/row animate-[stack-fan_460ms_cubic-bezier(0.16,1,0.3,1)_backwards]
                flex flex-col md:flex-row md:items-start gap-4 md:gap-8 outline-none
                ${isPending ? '' : 'cursor-pointer'}`}
        >
            <div
                style={{ aspectRatio: `${img.width} / ${img.height}` }}
                className={`relative w-full md:w-[72%] shrink-0 overflow-hidden bg-zinc-200 dark:bg-zinc-800
                    ring-1 transition-[box-shadow] duration-200
                    ${isActive ? 'ring-black/20 dark:ring-white/25' : 'ring-black/5 dark:ring-white/10'}`}
            >
                {full && (
                    <img
                        ref={imgRef}
                        src={full}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onLoad={e => { (e.currentTarget as HTMLImageElement).style.opacity = '1'; }}
                        className={`absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500
                            ${isPending ? 'blur-2xl scale-110 brightness-105 dark:brightness-50' : ''}`}
                    />
                )}
                {isPending && (
                    <>
                        {/* Nur ruhig abgedeckt, kein wandernder Glanz: Der
                            Ring sagt bereits, dass gearbeitet wird, und er sagt
                            es genauer. Zwei Bewegungen nebeneinander machen aus
                            dem Warten ein Flimmern. */}
                        <span className="absolute inset-0 bg-white/40 dark:bg-black/40" />
                        <span className="absolute inset-0 grid place-items-center">
                            <GeneratingRing
                                generationStartTime={img.generationStartTime}
                                estimatedDuration={img.estimatedDuration}
                                size={44}
                            />
                        </span>
                    </>
                )}
                {!isPending && (
                    <span className="absolute inset-0 bg-black/0 group-hover/row:bg-black/[0.05] transition-colors duration-200" />
                )}
            </div>

            {/* Die Spalte rechts: wer es ist, was verlangt wurde, was man tun
                kann — untereinander. In einer Zeile unter dem Bild lagen die
                drei Handlungen an der fernen Kante, weit weg von dem, worauf
                sie sich beziehen. */}
            <div className="flex-1 min-w-0 md:pt-0.5 flex flex-col gap-3">
                <div className="flex items-baseline gap-2.5">
                    {/* Der Platzhalter traegt schon den Namen, den er behalten
                        wird: Die Fassungsnummer steht beim Anlegen fest, also
                        gibt es keinen Grund, ihn "Neue Fassung" zu nennen und
                        den Namen spaeter auszutauschen. */}
                    <span className="text-[14px] font-medium text-zinc-700 dark:text-zinc-200 tabular-nums">
                        {isOriginal
                            ? 'Original'
                            : shownVersion != null
                                ? `v${shownVersion}`
                                : (lang === 'de' ? 'Fassung' : 'Version')}
                    </span>
                    {/* Beim Platzhalter nur das Wort: Der Ring liegt auf dem
                        Bild, wo man ohnehin hinsieht. Er ist fuer Fotos
                        gezeichnet (helle Linie) und waere hier auf heller
                        Flaeche unsichtbar — zwei Ringe fuer dieselbe Auskunft
                        braucht es ohnehin nicht. */}
                    {isPending ? (
                        <span className="text-[13px] text-zinc-400 dark:text-zinc-500">
                            {lang === 'de' ? 'wird erzeugt' : 'generating'}
                        </span>
                    ) : (
                        <span className="text-[13px] text-zinc-400 dark:text-zinc-500">
                            {img.createdAt ? formatRelativeTime(img.createdAt, lang) : ''}
                        </span>
                    )}
                </div>

                {/*
                    Auftrag und Handlungen stehen immer da, nur zurueckgenommen
                    — beim Ueberfahren der Zeile kommen sie auf volle Staerke.

                    Vorher waren sie ganz unsichtbar und blendeten ein; dabei
                    liefen sie auseinander (die Knoepfe blieben laenger stehen
                    als der Text), weil sie zwar dieselbe Dauer, aber nicht
                    dieselbe Bedingung hatten. Jetzt genau eine Regel, und
                    beide haengen an ihr.
                */}
                {prompt && (
                    <p className={`text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-5
                        transition-opacity duration-200 ${ROW_DIM}`}>
                        {prompt}
                    </p>
                )}

                <div className={`flex flex-wrap items-center gap-0.5 -ml-3.5 transition-opacity duration-200
                    ${isPending ? 'hidden' : ROW_DIM}`}>
                    <RowAction primary onClick={() => onSelect(img.id)} icon={<Pencil className="w-3.5 h-3.5" />}>
                        {lang === 'de' ? 'Bearbeiten' : 'Edit'}
                    </RowAction>
                    {/* "Mehr" wiederholt einen Auftrag. Beim Original gibt es
                        keinen, also auch nichts zu wiederholen. */}
                    {onGenerateMore && !!img.generationPrompt && (
                        <RowAction onClick={() => onGenerateMore(img)} icon={<Repeat className="w-3.5 h-3.5" />}>
                            {t?.('nav_more') || (lang === 'de' ? 'Mehr' : 'More')}
                        </RowAction>
                    )}
                    {onDownload && (
                        <RowAction onClick={() => onDownload(img.id)} icon={<Download className="w-3.5 h-3.5" />}>
                            {lang === 'de' ? 'Sichern' : 'Save'}
                        </RowAction>
                    )}
                </div>
            </div>
        </div>
    );
};

export const StackList: React.FC<StackListProps> = ({
    images, activeId, currentLang = 'de', onSelect, onGenerateMore, onDownload, onHoverIndex, t,
}) => {
    /*
        Die naechste freie Fassungsnummer dieses Stapels.

        Ein Platzhalter weiss seine eigene oft nicht (siehe StackRow). Die
        Liste weiss es: Sie kennt alle Geschwister. Ist die hoechste bekannte
        Nummer v4, wird die entstehende v5 — dieselbe Rechnung, die der Server
        beim Anlegen anstellt.
    */
    const nextVersion = React.useMemo(() => {
        const known = images
            .map(i => imageNameOf(i).version ?? (typeof i.version === 'number' ? i.version : 0))
            .filter(v => typeof v === 'number' && v > 0) as number[];
        const max = known.length ? Math.max(...known) : 1;
        return max + 1;
    }, [images]);

    return (
    /*
        Mittig: der Block nimmt 86 Prozent des Fensters, das BILD darin 72
        Prozent des Blocks — also rund 62 Prozent der Fensterbreite. Rechts
        daneben bleibt die Spalte mit Fassung, Auftrag und Handlungen.

        Die Obergrenze verhindert, dass ein Bild auf einem sehr breiten Schirm
        zur Plakatwand wird.
    */
    <div className="w-full flex justify-center px-4 sm:px-8 pt-8 sm:pt-12 pb-32">
        <div className="w-full md:w-[86%] max-w-[1600px] flex flex-col gap-14 sm:gap-20">
            {images.map((img, idx) => (
                <StackRow
                    key={img.id}
                    img={img}
                    idx={idx}
                    fallbackVersion={img.isGenerating ? nextVersion : null}
                    isActive={activeId === img.id}
                    lang={currentLang}
                    onSelect={onSelect}
                    onGenerateMore={onGenerateMore}
                    onDownload={onDownload}
                    onHoverIndex={onHoverIndex}
                    t={t}
                />
            ))}

        </div>
    </div>
);
};
