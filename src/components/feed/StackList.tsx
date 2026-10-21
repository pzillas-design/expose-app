import React from 'react';
import { Repeat, Download, Layers2, Pencil } from 'lucide-react';
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
    onCombineLayers?: () => void;
    onHoverIndex?: (idx: number | null) => void;
    t?: (key: any) => string;
}

/** Eine Handlung unter dem Bild: leise, gleiche Hoehe, gleiche Flaeche. */
const RowAction: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
}> = ({ onClick, icon, children }) => (
    <button
        onClick={onClick}
        className="h-9 px-3.5 rounded-full inline-flex items-center gap-2 text-[13px] font-medium
            text-zinc-600 dark:text-zinc-300
            hover:bg-black/[0.05] dark:hover:bg-white/[0.08]
            hover:text-zinc-900 dark:hover:text-white
            transition-colors duration-150"
    >
        {icon}
        {children}
    </button>
);

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
            className="group/row animate-[stack-fan_460ms_cubic-bezier(0.16,1,0.3,1)_backwards] flex flex-col"
        >
            <button
                onClick={() => onSelect(img.id)}
                style={{ aspectRatio: `${img.width} / ${img.height}` }}
                className={`relative w-full overflow-hidden bg-zinc-200 dark:bg-zinc-800
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
                        className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500"
                    />
                )}
                <span className="absolute inset-0 bg-black/0 group-hover/row:bg-black/[0.05] transition-colors duration-200" />
            </button>

            {/* Die Zeile unter dem Bild: links, wer es ist; rechts, was man tun
                kann. Die Handlungen erscheinen beim Ueberfahren — auf dem Handy
                stehen sie fest, dort gibt es kein Ueberfahren. */}
            <div className="flex items-center gap-3 pt-3 min-h-[44px]">
                <span className="text-[14px] font-medium text-zinc-700 dark:text-zinc-200 tabular-nums shrink-0">
                    {isOriginal ? 'Original' : `v${version}`}
                </span>
                <span className="text-[13px] text-zinc-400 dark:text-zinc-500 shrink-0">
                    {img.createdAt ? formatRelativeTime(img.createdAt, lang) : ''}
                </span>

                {prompt && (
                    <span className="hidden lg:block min-w-0 max-w-[48%] truncate text-[13px] text-zinc-400 dark:text-zinc-500
                        opacity-0 group-hover/row:opacity-100 transition-opacity duration-200">
                        {prompt}
                    </span>
                )}

                {/* Der Abstandhalter schiebt die Handlungen immer an das rechte
                    Ende der Bildkante — auch bei einem Bild ohne Auftrag, wo
                    sie sonst mitten in der Zeile haengen blieben. */}
                <div className="flex-1" />

                <div className="flex items-center gap-0.5 shrink-0
                    opacity-100 md:opacity-0 md:group-hover/row:opacity-100 transition-opacity duration-200">
                    <RowAction onClick={() => onSelect(img.id)} icon={<Pencil className="w-3.5 h-3.5" />}>
                        {lang === 'de' ? 'Bearbeiten' : 'Edit'}
                    </RowAction>
                    {onGenerateMore && (img.generationPrompt || isOriginal) && (
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
    images, activeId, currentLang = 'de', onSelect, onGenerateMore, onDownload, onCombineLayers, onHoverIndex, t,
}) => (
    /*
        Mittig und breit: 72 Prozent des Fensters, hoechstens 1400 Pixel.

        Auf einem grossen Schirm war die vorige Breite zu knapp — man vergleicht
        Fassungen, und was man nicht sieht, kann man nicht vergleichen. Die
        Obergrenze verhindert, dass ein Bild auf einem sehr breiten Schirm zur
        Plakatwand wird.
    */
    <div className="w-full flex justify-center px-4 sm:px-8 pt-8 sm:pt-12 pb-32">
        <div className="w-full md:w-[72%] max-w-[1400px] flex flex-col gap-14 sm:gap-20">
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

            {/* Ebenen kombinieren steht am Ende der Liste, nicht in einer
                eigenen Leiste: Es ist etwas, das man mit dem GANZEN Stapel tut,
                also gehoert es unter ihn. */}
            {onCombineLayers && images.length >= 2 && (
                <button
                    onClick={onCombineLayers}
                    className="self-center h-11 px-5 rounded-full inline-flex items-center gap-2.5 text-[14px] font-medium
                        bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.10]
                        text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white
                        transition-colors duration-150"
                >
                    <Layers2 className="w-4 h-4" strokeWidth={1.5} />
                    {currentLang === 'de' ? 'Ebenen kombinieren' : 'Combine layers'}
                </button>
            )}
        </div>
    </div>
);
