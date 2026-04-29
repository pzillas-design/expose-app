import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/DesignSystem';
import { ChevronDown, Check } from 'lucide-react';
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

const PROVIDER_OPTIONS: { value: ImageModelProvider; label: string }[] = [
    { value: 'openai',  label: 'GPT Image 2' },
    { value: 'fal-nb2', label: 'Nano Banana 2' },
];

const RES_OPTIONS: { value: GenerationQuality; label: string }[] = [
    { value: 'nb2-1k', label: '1K' },
    { value: 'nb2-2k', label: '2K' },
    { value: 'nb2-4k', label: '4K' },
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
];

// ── Dynamic subtitles (current-selection descriptions) ─────────────────────

const PROVIDER_DESC_DE: Record<ImageModelProvider, string> = {
    openai:    'OpenAIs Modell mit starkem Prompt-Verständnis.',
    'fal-nb2': 'Googles Modell mit kreativen und schnelleren Ergebnissen.',
};
const PROVIDER_DESC_EN: Record<ImageModelProvider, string> = {
    openai:    "OpenAI's model with strong prompt comprehension.",
    'fal-nb2': "Google's model with creative and faster results.",
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
};

// ── Dropdown (used for aspect-ratio field only) ────────────────────────────

interface DropdownProps<V extends string> {
    value: V;
    options: { value: V; label: string }[];
    onChange: (v: V) => void;
}
function Dropdown<V extends string>({ value, options, onChange }: DropdownProps<V>) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);
    const current = options.find(o => o.value === value);
    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
                <span className="truncate">{current?.label}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
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
                </div>
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
    };
    return <div className={`${base} ${dims[ratio]}`} />;
};

// ── Building blocks ────────────────────────────────────────────────────────

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

    const providerDesc = (isDe ? PROVIDER_DESC_DE : PROVIDER_DESC_EN)[local.provider];
    const resDesc      = (isDe ? RES_DESC_DE      : RES_DESC_EN)[local.resolution] ?? '';
    const qualityDesc  = (isDe ? QUALITY_DESC_DE  : QUALITY_DESC_EN)[local.quality];
    const aspectDesc   = (isDe ? ASPECT_DESC_DE   : ASPECT_DESC_EN)[local.aspectRatio];

    const qualityOptions = isDe ? QUALITY_OPTIONS_DE : QUALITY_OPTIONS_EN;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isDe ? 'Bild-Einstellungen' : 'Image settings'} maxWidth="lg">
            <div className="px-6 pb-6 pt-2 flex flex-col gap-5">
                {/* Model */}
                <Section heading={isDe ? 'Modell' : 'Model'} subtitle={providerDesc}>
                    <div className="grid grid-cols-2 gap-1.5">
                        {PROVIDER_OPTIONS.map(opt => (
                            <PillButton
                                key={opt.value}
                                active={local.provider === opt.value}
                                onClick={() => update('provider', opt.value)}
                            >
                                {opt.label}
                            </PillButton>
                        ))}
                    </div>
                </Section>

                {/* Resolution */}
                <Section heading={isDe ? 'Auflösung' : 'Resolution'} subtitle={resDesc}>
                    <div className="grid grid-cols-3 gap-1.5">
                        {RES_OPTIONS.map(opt => (
                            <PillButton
                                key={opt.value}
                                active={local.resolution === opt.value}
                                onClick={() => update('resolution', opt.value)}
                            >
                                {opt.label}
                            </PillButton>
                        ))}
                    </div>
                </Section>

                {/* Quality — only meaningful for gpt-image-2; Nano Banana 2 has no
                    user-facing quality knob, so we hide the entire section there. */}
                {local.provider === 'openai' && (
                    <Section heading={isDe ? 'Qualität' : 'Quality'} subtitle={qualityDesc}>
                        <div className="grid grid-cols-3 gap-1.5">
                            {qualityOptions.map(opt => (
                                <PillButton
                                    key={opt.value}
                                    active={local.quality === opt.value}
                                    onClick={() => update('quality', opt.value)}
                                >
                                    {opt.label}
                                </PillButton>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Aspect ratio — dropdown. Subtitle dropped: the dropdown labels
                    already carry the description (e.g. "16:9 — Breitbild"). */}
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

                {/* Price subtitle above the Done button — same subtle font as section sublines. */}
                <div className="flex flex-col items-stretch gap-4 mt-4">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                        {isDe ? 'Kosten pro Bild · ' : 'Cost per image · '}
                        <span className="tabular-nums">{priceFormatted}</span>
                    </div>
                    <Button variant="primary" size="l" onClick={onClose} className="w-full">
                        {isDe ? 'Fertig' : 'Done'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
