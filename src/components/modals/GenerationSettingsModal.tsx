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

interface GenerationSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    value?: GenerationSettings;
    onChange?: (next: GenerationSettings) => void;
    lang?: 'de' | 'en';
}

// ── Generation mode — encodes provider + quality in one pick ───────────────

type GenerationMode = 'nb2' | 'nb2-pro' | 'gpt-low' | 'gpt-mid' | 'gpt-high';

const MODE_PRESETS: Record<GenerationMode, { provider: ImageModelProvider; quality: ImageQualityLevel }> = {
    'nb2':      { provider: 'fal-nb2',          quality: 'low'    },
    'nb2-pro':  { provider: 'nano-banana-pro',   quality: 'high'   },
    'gpt-low':  { provider: 'openai',            quality: 'low'    },
    'gpt-mid':  { provider: 'openai',            quality: 'medium' },
    'gpt-high': { provider: 'openai',            quality: 'high'   },
};

// Hints reflect each model's documented edge: NB2 = speed/price at ~90% of Pro
// quality, NB Pro = top image quality & typography, GPT Image = prompt
// adherence (low = cheap drafts, high = max precision).
const MODE_OPTIONS_DE: { value: GenerationMode; label: string; hint?: string }[] = [
    { value: 'nb2',      label: 'Nano Banana 2',     hint: 'schnell & günstig' },
    { value: 'nb2-pro',  label: 'Nano Banana Pro',   hint: 'beste Qualität'    },
    { value: 'gpt-low',  label: 'GPT Image Niedrig', hint: 'schnelle Entwürfe' },
    { value: 'gpt-mid',  label: 'GPT Image Mittel',  hint: 'ausgewogen'        },
    { value: 'gpt-high', label: 'GPT Image Hoch',    hint: 'sehr präzise'      },
];

const MODE_OPTIONS_EN: { value: GenerationMode; label: string; hint?: string }[] = [
    { value: 'nb2',      label: 'Nano Banana 2',    hint: 'fast & affordable' },
    { value: 'nb2-pro',  label: 'Nano Banana Pro',  hint: 'best quality'      },
    { value: 'gpt-low',  label: 'GPT Image Low',    hint: 'quick drafts'      },
    { value: 'gpt-mid',  label: 'GPT Image Medium', hint: 'balanced'          },
    { value: 'gpt-high', label: 'GPT Image High',   hint: 'very precise'      },
];

function detectMode(s: GenerationSettings): GenerationMode {
    if (s.provider === 'nano-banana-pro') return 'nb2-pro';
    if (s.provider === 'fal-nb2') return 'nb2';
    if (s.quality === 'low') return 'gpt-low';
    if (s.quality === 'medium') return 'gpt-mid';
    return 'gpt-high';
}

// ── Resolution options ─────────────────────────────────────────────────────

const RES_OPTIONS: { value: GenerationQuality; label: string }[] = [
    { value: 'nb2-1k', label: '1K · 1024 px' },
    { value: 'nb2-2k', label: '2K · 2560 px' },
    { value: 'nb2-4k', label: '4K · 3840 px' },
];

// ── Aspect-ratio options ───────────────────────────────────────────────────

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

// ── Dropdown ───────────────────────────────────────────────────────────────

interface DropdownProps<V extends string> {
    value: V;
    options: { value: V; label: string; hint?: string }[];
    onChange: (v: V) => void;
}
function Dropdown<V extends string>({ value, options, onChange }: DropdownProps<V>) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number; placement: 'down' | 'up' } | null>(null);

    const updatePos = () => {
        const t = triggerRef.current;
        if (!t) return;
        const r = t.getBoundingClientRect();
        const PANEL_MAX_H = 320;
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
                                <span className="flex items-center gap-2 shrink-0">
                                    {opt.hint && (
                                        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">{opt.hint}</span>
                                    )}
                                    {active && <Check className="w-4 h-4 shrink-0" />}
                                </span>
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </div>
    );
}

// ── Building blocks ────────────────────────────────────────────────────────

const HeadingWithInfo: React.FC<{ heading: string; info: string }> = ({ heading, info }) => (
    <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-zinc-900 dark:text-white">{heading}</span>
        <Tooltip text={info} side="top">
            <Info className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-help shrink-0" />
        </Tooltip>
    </div>
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

    const mode = detectMode(local);
    const price = getGenerationPriceUsd(local.provider, local.resolution, local.quality);
    const priceFormatted = price.toFixed(2).replace('.', ',') + ' €';

    const handleModeChange = (m: GenerationMode) => {
        const p = MODE_PRESETS[m];
        const next = { ...local, provider: p.provider, quality: p.quality };
        setLocal(next);
        onChange?.(next);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isDe ? 'Bild-Einstellungen' : 'Image settings'} maxWidth="lg">
            <div className="px-6 pb-6 pt-2 flex flex-col gap-5">

                {/* Mode (model + quality combined) */}
                <div className="flex flex-col gap-2">
                    <HeadingWithInfo
                        heading={isDe ? 'KI-Modell' : 'AI model'}
                        info={isDe
                            ? 'Nano Banana 2 und Nano Banana Pro nutzen Googles Modell. GPT-Image-Modi nutzen OpenAIs GPT Image 2.'
                            : "Nano Banana 2 and Nano Banana Pro use Google's model. GPT Image modes use OpenAI's GPT Image 2."}
                    />
                    <Dropdown
                        value={mode}
                        options={isDe ? MODE_OPTIONS_DE : MODE_OPTIONS_EN}
                        onChange={handleModeChange}
                    />
                </div>

                {/* Resolution — separate */}
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

                {/* Aspect ratio */}
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

                {/* Cost per image */}
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
