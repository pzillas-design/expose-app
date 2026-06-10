import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '@/components/ui/Modal';
import { Button, Tooltip } from '@/components/ui/DesignSystem';
import { ChevronDown, Check, Info } from 'lucide-react';
import {
    GenerationSettings,
    DEFAULT_GENERATION_SETTINGS,
    getGenerationPriceUsd,
    GenerationQuality,
    ImageQualityLevel,
    ImageAspectRatio,
    ImageModelProvider,
} from '@/types';

/**
 * Apple-polished settings modal: monochrome segmented controls (no orange),
 * a single dynamic subtitle *below* each option grid that describes the
 * currently selected value (no per-option sublabels, no '?' icons).
 *
 *   [ heading ]
 *   [ option grid                               ]
 *   [ subtitle that updates based on selection  ]
 */

interface GenerationSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    value?: GenerationSettings;
    onChange?: (next: GenerationSettings) => void;
    lang?: 'de' | 'en';
}

// ── Option lists ───────────────────────────────────────────────────────────

// Model family (top selector). The actual provider is derived together with
// the quality step below.
type ModelFamily = 'nano' | 'gpt';
const MODEL_OPTIONS: { family: ModelFamily; label: string }[] = [
    { family: 'nano', label: 'Nano Banana' },
    { family: 'gpt',  label: 'GPT Image' },
];

// Nano Banana quality steps map directly onto the provider variant.
const NANO_QUALITY_DE: { value: ImageModelProvider; label: string }[] = [
    { value: 'fal-nb2',         label: 'Schnell' },
    { value: 'nano-banana-pro', label: 'Beste' },
];
const NANO_QUALITY_EN: { value: ImageModelProvider; label: string }[] = [
    { value: 'fal-nb2',         label: 'Fast' },
    { value: 'nano-banana-pro', label: 'Best' },
];

const RES_OPTIONS: { value: GenerationQuality; label: string }[] = [
    { value: 'nb2-1k', label: '1K · 1024 px' },
    { value: 'nb2-2k', label: '2K · 2560 px' },
    { value: 'nb2-4k', label: '4K · 3840 px' },
];

const QUALITY_OPTIONS_DE: { value: ImageQualityLevel; label: string }[] = [
    { value: 'low',    label: 'Niedrig' },
    { value: 'medium', label: 'Mittel'  },
    { value: 'high',   label: 'Hoch'    },
];

const QUALITY_OPTIONS_EN: { value: ImageQualityLevel; label: string }[] = [
    { value: 'low',    label: 'Low'    },
    { value: 'medium', label: 'Medium' },
    { value: 'high',   label: 'High'   },
];

const ASPECT_OPTIONS_DE: { value: ImageAspectRatio; label: string }[] = [
    { value: 'auto', label: 'Auto (aus Quellbild)' },
    { value: '1:1',  label: '1:1 — Quadrat'         },
    { value: '16:9', label: '16:9 — Breitbild'      },
    { value: '9:16', label: '9:16 — Hochkant'       },
    { value: '4:3',  label: '4:3 — klassisch'       },
    { value: '3:4',  label: '3:4 — Hochformat'      },
    { value: '3:2',  label: '3:2 — DSLR Querformat' },
    { value: '2:3',  label: '2:3 — DSLR Hochformat' },
    { value: '5:4',  label: '5:4 — Print Querformat'},
    { value: '4:5',  label: '4:5 — Social Hochformat'},
    { value: '21:9', label: '21:9 — Cinematic'      },
];
const ASPECT_OPTIONS_EN: { value: ImageAspectRatio; label: string }[] = [
    { value: 'auto', label: 'Auto (from source)' },
    { value: '1:1',  label: '1:1 — square'          },
    { value: '16:9', label: '16:9 — widescreen'     },
    { value: '9:16', label: '9:16 — vertical'       },
    { value: '4:3',  label: '4:3 — classic'         },
    { value: '3:4',  label: '3:4 — portrait'        },
    { value: '3:2',  label: '3:2 — DSLR landscape'  },
    { value: '2:3',  label: '2:3 — DSLR portrait'   },
    { value: '5:4',  label: '5:4 — print landscape' },
    { value: '4:5',  label: '4:5 — social portrait' },
    { value: '21:9', label: '21:9 — cinematic'      },
];

// ── Dynamic subtitles (current-selection descriptions) ─────────────────────

const FAMILY_DESC_DE: Record<ModelFamily, string> = {
    nano: 'Googles Modell — fotorealistisch, schnell. „Beste" nutzt Nano Banana Pro für höchste Qualität.',
    gpt:  'OpenAIs Modell mit starkem Prompt-Verständnis und Text/Layout.',
};
const FAMILY_DESC_EN: Record<ModelFamily, string> = {
    nano: "Google's model — photoreal, fast. \"Best\" uses Nano Banana Pro for top quality.",
    gpt:  "OpenAI's model with strong prompt comprehension and text/layout.",
};

const NANO_QUALITY_DESC_DE: Record<string, string> = {
    'fal-nb2':         'Nano Banana — schnell & günstig, für die meisten Edits.',
    'nano-banana-pro': 'Nano Banana Pro — beste Foto-Qualität, etwas langsamer.',
};
const NANO_QUALITY_DESC_EN: Record<string, string> = {
    'fal-nb2':         'Nano Banana — fast & cheap, for most edits.',
    'nano-banana-pro': 'Nano Banana Pro — best photo quality, a bit slower.',
};

const RES_DESC_DE: Record<string, string> = {
    'nb2-1k': '1024 px lange Seite.',
    'nb2-2k': '1920 px lange Seite.',
    'nb2-4k': '3840 px lange Seite.',
};
const RES_DESC_EN: Record<string, string> = {
    'nb2-1k': '1024 px long edge.',
    'nb2-2k': '1920 px long edge.',
    'nb2-4k': '3840 px long edge.',
};

const QUALITY_DESC_DE: Record<ImageQualityLevel, string> = {
    low:    'Setzt nur das Wesentliche um.',
    medium: 'Ausgewogen zwischen Schlichtheit und Detail.',
    high:   'Kreativ und detailfreudig.',
};
const QUALITY_DESC_EN: Record<ImageQualityLevel, string> = {
    low:    'Keeps only the essentials.',
    medium: 'Balanced between simplicity and detail.',
    high:   'Creative and rich in detail.',
};

const ASPECT_DESC_DE: Record<ImageAspectRatio, string> = {
    auto:  'Übernimmt das Verhältnis aus dem Quellbild.',
    '1:1': 'Quadrat · Social-Posts und Avatare.',
    '16:9': 'Breitbild · Slides und Banner.',
    '9:16': 'Hochkant · Stories und Reels.',
    '4:3': 'Klassisch · Foto-Standard.',
    '3:4': 'Hochformat · Porträt-Standard.',
    '3:2': 'DSLR-Querformat.',
    '2:3': 'DSLR-Hochformat.',
    '5:4': 'Print-Querformat.',
    '4:5': 'Social-Hochformat.',
    '21:9': 'Cinematic · ultrabreit.',
};
const ASPECT_DESC_EN: Record<ImageAspectRatio, string> = {
    auto:  'Inherits the ratio of the source image.',
    '1:1': 'Square · social posts and avatars.',
    '16:9': 'Widescreen · slides and banners.',
    '9:16': 'Vertical · stories and reels.',
    '4:3': 'Classic · photo standard.',
    '3:4': 'Portrait · classic.',
    '3:2': 'DSLR landscape.',
    '2:3': 'DSLR portrait.',
    '5:4': 'Print landscape.',
    '4:5': 'Social portrait.',
    '21:9': 'Cinematic · ultrawide.',
};

// ── Dropdown (used for aspect-ratio field only) ────────────────────────────

interface DropdownProps<V extends string> {
    value: V;
    options: { value: V; label: string }[];
    onChange: (v: V) => void;
}
function Dropdown<V extends string>({ value, options, onChange }: DropdownProps<V>) {
    const [open, setOpen] = useState(false);
    // Panel is rendered via portal into document.body so it's not clipped by the
    // Modal's overflow boundary. Position is computed from the trigger button's
    // bounding rect — and flipped above the trigger when there isn't enough room
    // below the viewport edge.
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number; placement: 'down' | 'up' } | null>(null);

    const updatePos = () => {
        const t = triggerRef.current;
        if (!t) return;
        const r = t.getBoundingClientRect();
        const PANEL_MAX_H = 320; // soft estimate for placement decision
        const spaceBelow = window.innerHeight - r.bottom;
        const placement: 'down' | 'up' = spaceBelow >= PANEL_MAX_H || spaceBelow >= window.innerHeight - r.top
            ? 'down'
            : 'up';
        setPanelPos({
            top: placement === 'down' ? r.bottom + 6 : r.top - 6,
            left: r.left,
            width: r.width,
            placement,
        });
    };

    useEffect(() => {
        if (!open) return;
        updatePos();
        const onClickOutside = (e: MouseEvent) => {
            const t = e.target as Node;
            if (triggerRef.current?.contains(t)) return;
            if (panelRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onScrollOrResize = () => updatePos();
        document.addEventListener('mousedown', onClickOutside);
        window.addEventListener('resize', onScrollOrResize);
        // Capture phase so we react to inner scroll containers too (e.g. Modal body).
        window.addEventListener('scroll', onScrollOrResize, true);
        return () => {
            document.removeEventListener('mousedown', onClickOutside);
            window.removeEventListener('resize', onScrollOrResize);
            window.removeEventListener('scroll', onScrollOrResize, true);
        };
    }, [open]);

    const current = options.find(o => o.value === value);

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
                <span className="truncate">{current?.label}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && panelPos && createPortal(
                <div
                    ref={panelRef}
                    style={{
                        position: 'fixed',
                        top: panelPos.placement === 'down' ? panelPos.top : undefined,
                        bottom: panelPos.placement === 'up' ? window.innerHeight - panelPos.top : undefined,
                        left: panelPos.left,
                        width: panelPos.width,
                        maxHeight: 'min(60vh, 360px)',
                        zIndex: 9999,
                    }}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100"
                >
                    {options.map(opt => {
                        const active = opt.value === value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left transition-colors ${
                                    active
                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium'
                                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                                }`}
                            >
                                <span className="truncate">{opt.label}</span>
                                {active && <Check className="w-4 h-4 shrink-0" />}
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </div>
    );
}

// ── Aspect-ratio thumbnail (mirrors the AspectIcon in CreationModal) ───────

const AspectThumb: React.FC<{ ratio: ImageAspectRatio; active: boolean }> = ({ ratio, active }) => {
    const stroke = active
        ? 'border-current'
        : 'border-zinc-400 dark:border-zinc-500 group-hover:border-zinc-600 dark:group-hover:border-zinc-300';
    const base = `border-[1.5px] rounded-[1px] transition-colors ${stroke}`;
    if (ratio === 'auto') {
        // dotted square so the thumbnail still occupies the same footprint
        return <div className={`w-4 h-4 border-[1.5px] border-dashed rounded-[1px] transition-colors ${stroke}`} />;
    }
    const dims: Record<Exclude<ImageAspectRatio, 'auto'>, string> = {
        '16:9': 'w-5 h-[11px]',
        '9:16': 'w-[11px] h-5',
        '4:3':  'w-5 h-[15px]',
        '3:4':  'w-[15px] h-5',
        '3:2':  'w-5 h-[13px]',
        '2:3':  'w-[13px] h-5',
        '1:1':  'w-4 h-4',
        '5:4':  'w-5 h-4',
        '4:5':  'w-4 h-5',
        '21:9': 'w-5 h-[9px]',
    };
    return <div className={`${base} ${dims[ratio]}`} />;
};

// ── Building blocks ────────────────────────────────────────────────────────

/** Heading with a small info icon that surfaces a tooltip on hover. */
const HeadingWithInfo: React.FC<{ heading: string; info: string }> = ({ heading, info }) => (
    <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-zinc-900 dark:text-white">{heading}</span>
        <Tooltip text={info} side="top">
            <Info className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-help shrink-0" />
        </Tooltip>
    </div>
);

const Section: React.FC<{ heading: string; subtitle: string; children: React.ReactNode }> = ({ heading, subtitle, children }) => (
    <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-zinc-900 dark:text-white">{heading}</span>
        {children}
        <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug min-h-[1.25rem]">{subtitle}</span>
    </div>
);

/** Apple-style segmented option button — monochrome inverse fill on active. */
interface PillButtonProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}
const PillButton: React.FC<PillButtonProps> = ({ active, onClick, children, className = '' }) => (
    <button
        type="button"
        onClick={onClick}
        className={`group flex items-center justify-center gap-1.5 rounded-lg border-[1.5px] px-3 py-2.5 text-sm font-medium transition-all ${
            active
                ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
        } ${className}`}
    >
        {children}
    </button>
);

/** Stepped slider with named stops (2 or 3 states). Custom-drawn track, ticks
 *  and a large grip; a transparent native range sits on top for drag/keyboard.
 *  Stop labels are centered under each tick and clickable. */
function StepSlider<V extends string>({ steps, value, onChange }: {
    steps: { value: V; label: string }[];
    value: V;
    onChange: (v: V) => void;
}) {
    const n = steps.length;
    const idx = Math.max(0, steps.findIndex(s => s.value === value));
    const pct = n > 1 ? (idx / (n - 1)) * 100 : 0;
    const posAt = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 0);

    return (
        <div className="px-2.5 pt-2">
            <div className="relative h-7 flex items-center">
                {/* track */}
                <div className="absolute inset-x-0 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                {/* filled portion */}
                <div className="absolute left-0 h-2 rounded-full bg-zinc-900 dark:bg-white transition-[width] duration-150 ease-out" style={{ width: `${pct}%` }} />
                {/* tick marks at each stop */}
                {steps.map((s, i) => (
                    <span
                        key={s.value}
                        className={`absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 transition-colors ${i <= idx ? 'bg-white/80 dark:bg-zinc-900/70' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                        style={{ left: `${posAt(i)}%` }}
                    />
                ))}
                {/* large grip */}
                <span
                    className="absolute w-6 h-6 rounded-full bg-white border border-zinc-300 dark:border-zinc-500 shadow-md -translate-x-1/2 pointer-events-none transition-[left] duration-150 ease-out"
                    style={{ left: `${pct}%` }}
                >
                    <span className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-700" />
                </span>
                {/* transparent native range for dragging + keyboard a11y */}
                <input
                    type="range"
                    min={0}
                    max={n - 1}
                    step={1}
                    value={idx}
                    onChange={e => onChange(steps[Number(e.target.value)].value)}
                    className="absolute inset-x-0 w-full h-7 opacity-0 cursor-pointer"
                    aria-label="quality"
                />
            </div>
            {/* labels centered under each stop */}
            <div className="relative h-5 mt-2.5">
                {steps.map((s, i) => (
                    <button
                        key={s.value}
                        type="button"
                        onClick={() => onChange(s.value)}
                        className={`absolute -translate-x-1/2 whitespace-nowrap text-xs transition-colors ${i === idx ? 'font-bold text-zinc-900 dark:text-white' : 'font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        style={{ left: `${posAt(i)}%` }}
                    >
                        {s.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── Modal ──────────────────────────────────────────────────────────────────

export const GenerationSettingsModal: React.FC<GenerationSettingsModalProps> = ({
    isOpen,
    onClose,
    value,
    onChange,
    lang = 'de',
}) => {
    const [local, setLocal] = useState<GenerationSettings>(value || DEFAULT_GENERATION_SETTINGS);
    const isDe = lang === 'de';

    React.useEffect(() => {
        if (value) setLocal(value);
    }, [value]);

    const update = <K extends keyof GenerationSettings>(key: K, v: GenerationSettings[K]) => {
        const next = { ...local, [key]: v };
        setLocal(next);
        onChange?.(next);
    };

    // Price now depends on (resolution × quality). Shown in its own box above the
    // Done button, not baked into the subtitles.
    const price = getGenerationPriceUsd(local.resolution, local.quality);
    const priceFormatted = price.toFixed(2).replace('.', ',') + ' €';

    const family: ModelFamily = local.provider === 'openai' ? 'gpt' : 'nano';

    const qualityOptions     = isDe ? QUALITY_OPTIONS_DE : QUALITY_OPTIONS_EN;
    const nanoQualityOptions = isDe ? NANO_QUALITY_DE : NANO_QUALITY_EN;

    // Switch model family: keep the Nano variant when staying in Nano; default
    // to the fast variant when coming from GPT; GPT always maps to 'openai'.
    const selectFamily = (f: ModelFamily) => {
        if (f === 'gpt') update('provider', 'openai');
        else update('provider', local.provider === 'nano-banana-pro' ? 'nano-banana-pro' : 'fal-nb2');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isDe ? 'Bild-Einstellungen' : 'Image settings'} maxWidth="lg">
            <div className="px-6 pb-6 pt-2 flex flex-col gap-5">
                {/* Model family */}
                <div className="flex flex-col gap-2">
                    <HeadingWithInfo
                        heading={isDe ? 'Modell' : 'Model'}
                        info={isDe ? FAMILY_DESC_DE[family] : FAMILY_DESC_EN[family]}
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                        {MODEL_OPTIONS.map(opt => (
                            <PillButton key={opt.family} active={family === opt.family} onClick={() => selectFamily(opt.family)}>
                                {opt.label}
                            </PillButton>
                        ))}
                    </div>
                </div>

                {/* Quality — directly under the model. Real stepped slider. */}
                <div className="flex flex-col gap-2">
                    <HeadingWithInfo
                        heading={isDe ? 'Qualität' : 'Quality'}
                        info={family === 'nano'
                            ? (isDe
                                ? 'Schnell = Nano Banana (schnell & günstig). Beste = Nano Banana Pro (höchste Foto-Qualität, etwas langsamer).'
                                : 'Fast = Nano Banana (fast & cheap). Best = Nano Banana Pro (top photo quality, a bit slower).')
                            : (isDe
                                ? 'Wie viel Detail & kreativen Stil das Modell investiert. Höher = präziser, langsamer, teurer.'
                                : 'How much detail & creative style the model invests. Higher = more precise, slower, pricier.')}
                    />
                    {family === 'nano'
                        ? <StepSlider steps={nanoQualityOptions} value={local.provider} onChange={v => update('provider', v)} />
                        : <StepSlider steps={qualityOptions} value={local.quality} onChange={v => update('quality', v)} />}
                </div>

                {/* Aspect ratio — placed directly under Model. Dropdown labels carry the description. */}
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {isDe ? 'Seitenverhältnis' : 'Aspect ratio'}
                    </span>
                    <Dropdown
                        value={local.aspectRatio}
                        options={isDe ? ASPECT_OPTIONS_DE : ASPECT_OPTIONS_EN}
                        onChange={v => update('aspectRatio', v)}
                    />
                </div>

                {/* Resolution — its own row. */}
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {isDe ? 'Auflösung' : 'Resolution'}
                    </span>
                    <Dropdown
                        value={local.resolution}
                        options={RES_OPTIONS}
                        onChange={v => update('resolution', v)}
                    />
                </div>

                {/* Cost per image — same heading + subline pattern as other sections, left-aligned. */}
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {isDe ? 'Kosten pro Bild' : 'Cost per image'}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {priceFormatted}
                    </span>
                </div>

                <Button variant="primary" size="l" onClick={onClose} className="w-full mt-2">
                    {isDe ? 'Fertig' : 'Done'}
                </Button>
            </div>
        </Modal>
    );
};
