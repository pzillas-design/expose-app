import React from 'react';
import { Repeat, Download, ChevronRight } from 'lucide-react';
import type { CanvasImage } from '@/types';
import { imageNameOf } from '@/utils/imageName';
import { formatRelativeTime } from '@/utils/timeUtils';
import { Tooltip } from '@/components/ui/DesignSystem';

/**
 * Der Stapel von innen: eine Liste, kein Raster.
 *
 * Ein Stapel ist eine Reihe von Versuchen am selben Bild. Im Raster standen
 * sie als gleich grosse Kacheln nebeneinander — das ist die Form fuer "viele
 * verschiedene Bilder", nicht fuer "dasselbe Bild, sechsmal anders". Zum
 * Vergleichen braucht man eine Achse, und die ist hier senkrecht: ein Bild
 * unter dem anderen, deutlich groesser als im Raster, immer gleich breit.
 *
 * Im Ruhezustand steht fast nichts dabei: Fassung und Alter, mehr nicht. Was
 * tatsaechlich verlangt wurde, erscheint erst beim Ueberfahren — zusammen mit
 * den beiden Handlungen, die man an dieser Stelle braucht (noch eine Fassung,
 * herunterladen). So bleibt die Liste ruhig und sagt trotzdem mehr als das
 * Raster je konnte.
 *
 * Der Eintritt ist die Umkehrung der Kachel: Dort liegen zwei graue Blaetter
 * hinter dem Deckbild. Hier faechern sie auseinander — jede Zeile kommt aus
 * der Lage der vorigen heran und wird dabei aus einer grauen Flaeche zu ihrem
 * Bild.
 */
interface StackListProps {
    images: CanvasImage[];
    activeId?: string | null;
    currentLang?: 'de' | 'en';
    onSelect: (id: string) => void;
    onGenerateMore?: (img: CanvasImage) => void;
    onDownload?: (id: string) => void;
    /** Zeigt die Kachel-Nummer in der Tastaturnavigation an. */
    onHoverIndex?: (idx: number | null) => void;
    t?: (key: any) => string;
}

const StackRow: React.FC<{
    img: CanvasImage;
    idx: number;
    isActive: boolean;
    lang: 'de' | 'en';
    onSelect: (id: string) => void;
    onGenerateMore?: (img: CanvasImage) => void;
    onDownload?: (id: string) => void;
    onHoverIndex?: (idx: number | null) => void;
    t?: (key: any) => string;
}> = ({ img, idx, isActive, lang, onSelect, onGenerateMore, onDownload, onHoverIndex, t }) => {
    const { version } = imageNameOf(img);
    const isOriginal = !img.parentId;
    const prompt = (img.generationPrompt || img.userDraftPrompt || '').trim();
    const src = img.thumbSrc || img.src;

    // Das Bild blendet ueber seine graue Flaeche ein. Ein ref-Callback statt
    // eines Zustands: Was im Zwischenspeicher liegt, ist damit schon im ersten
    // gezeichneten Frame da und blitzt nicht grau auf.
    const imgRef = React.useCallback((node: HTMLImageElement | null) => {
        if (node?.complete) node.style.opacity = '1';
    }, []);

    return (
        <div
            data-image-id={img.id}
            onMouseEnter={() => onHoverIndex?.(idx)}
            onMouseLeave={() => onHoverIndex?.(null)}
            style={{
                // Jede Zeile kommt aus der Lage der vorigen — weiter unten
                // heisst weiter her. Gedeckelt, damit die zehnte Fassung nicht
                // aus dem Bildschirm heranfliegt.
                ['--fan-from' as any]: `${-Math.min(14 + idx * 10, 64)}px`,
                animationDelay: `${Math.min(idx * 45, 320)}ms`,
            }}
            className="group/row animate-[stack-fan_420ms_cubic-bezier(0.16,1,0.3,1)_backwards]
                flex flex-col md:flex-row md:items-start gap-4 md:gap-8"
        >
            {/* Das Bild. Linksbuendig und immer gleich breit: Zwei Fassungen
                untereinander sind nur vergleichbar, wenn ihre Kanten
                uebereinander liegen. */}
            <button
                onClick={() => onSelect(img.id)}
                style={{ aspectRatio: `${img.width} / ${img.height}` }}
                className={`relative w-full md:w-[66%] md:max-w-[780px] shrink-0 overflow-hidden
                    bg-zinc-300 dark:bg-zinc-700
                    ring-1 transition-[box-shadow,ring-color] duration-200
                    ${isActive ? 'ring-black/25 dark:ring-white/30' : 'ring-black/5 dark:ring-white/10'}`}
            >
                {src && (
                    <img
                        ref={imgRef}
                        src={src}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onLoad={e => { (e.currentTarget as HTMLImageElement).style.opacity = '1'; }}
                        className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500"
                    />
                )}

                {/* Beim Ueberfahren ein Hauch dunkler — dieselbe Antwort wie im
                    Raster, damit die Flaeche anfassbar wirkt. */}
                <span className="absolute inset-0 bg-black/0 group-hover/row:bg-black/[0.06] transition-colors duration-200" />
            </button>

            {/* Die Spalte daneben: im Ruhezustand zwei Zeilen, beim Ueberfahren
                der Auftrag und die Handlungen. */}
            <div className="flex-1 min-w-0 md:max-w-[300px] md:pt-1 flex flex-col gap-3">
                <div className="flex items-baseline gap-2.5">
                    <span className="text-[15px] font-medium text-zinc-800 dark:text-zinc-100 tabular-nums">
                        {isOriginal
                            ? (lang === 'de' ? 'Original' : 'Original')
                            : `v${version}`}
                    </span>
                    <span className="text-[13px] text-zinc-400 dark:text-zinc-500">
                        {img.createdAt ? formatRelativeTime(img.createdAt, lang) : ''}
                    </span>
                </div>

                {/* Was verlangt wurde. Erst beim Ueberfahren, und auf dem Handy
                    immer — dort gibt es kein Ueberfahren. */}
                {prompt && (
                    <p className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-4
                        opacity-100 md:opacity-0 md:group-hover/row:opacity-100 transition-opacity duration-200">
                        {prompt}
                    </p>
                )}

                <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover/row:opacity-100 transition-opacity duration-200">
                    {onGenerateMore && (img.generationPrompt || isOriginal) && (
                        <Tooltip text={t?.('generate_more') || 'Mehr'} side="bottom">
                            <button
                                onClick={() => onGenerateMore(img)}
                                className="h-9 px-3.5 rounded-full inline-flex items-center gap-2 text-[13px] font-medium
                                    bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.09] dark:hover:bg-white/[0.14]
                                    text-zinc-700 dark:text-zinc-200 transition-colors"
                            >
                                <Repeat className="w-3.5 h-3.5" />
                                {t?.('nav_more') || 'Mehr'}
                            </button>
                        </Tooltip>
                    )}
                    {onDownload && (
                        <Tooltip text={t?.('download') || 'Herunterladen'} side="bottom">
                            <button
                                onClick={() => onDownload(img.id)}
                                className="w-9 h-9 rounded-full inline-flex items-center justify-center
                                    hover:bg-black/[0.05] dark:hover:bg-white/[0.08]
                                    text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </Tooltip>
                    )}
                    <button
                        onClick={() => onSelect(img.id)}
                        className="h-9 px-3 rounded-full inline-flex items-center gap-1 text-[13px] font-medium
                            text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white
                            hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
                    >
                        {lang === 'de' ? 'Öffnen' : 'Open'}
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export const StackList: React.FC<StackListProps> = ({
    images, activeId, currentLang = 'de', onSelect, onGenerateMore, onDownload, onHoverIndex, t,
}) => (
    <div className="flex flex-col gap-10 md:gap-14 px-4 sm:px-8 pt-12 sm:pt-16 pb-24">
        {images.map((img, idx) => (
            <StackRow
                key={img.id}
                img={img}
                idx={idx}
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
);
