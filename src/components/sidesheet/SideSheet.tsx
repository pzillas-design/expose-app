import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
    CanvasImage, PromptTemplate, AnnotationObject, TranslationFunction,
    LibraryCategory, GenerationQuality, PresetControl
} from '@/types';
import {
    Pen, Camera, X, ChevronRight, ChevronLeft, ChevronDown, Play, Plus, Check,
    Undo2, Redo2, Layers, MoreHorizontal, Settings2, CornerDownLeft, Bookmark
} from 'lucide-react';
import { useMobile } from '@/hooks/useMobile';
import { InspirationModal } from '@/components/modals/InspirationModal';
import { generateId } from '@/utils/ids';
import { compressImage } from '@/utils/imageUtils';
import { PRIMARY_PROVIDER } from '@/config/provider';
import { Theme, Typo, Tooltip, RoundIconButton, Button } from '@/components/ui/DesignSystem';
import { ContextTip, ContextTipChip } from '@/components/ui/ContextTip';
import { GenerationSettingsModal } from '@/components/modals/GenerationSettingsModal';
import { DEFAULT_GENERATION_SETTINGS, type GenerationSettings } from '@/types';
import { useEnterGenerates } from '@/utils/uiPrefs';

/**
 * Schluessel des einmaligen Hinweises auf das neue Standardmodell.
 * ContextTip fuehrt darunter Buch, ob er schon gezeigt wurde, und sorgt
 * nebenbei dafuer, dass nicht zwei Hinweise gleichzeitig aufgehen.
 */
const MODEL_HINT_KEY = 'expose_tip_seedream_default_v1';

/**
 * Die Chips unter "Vorlagen".
 *
 * Eine Angabe fuer alle drei Faelle: die Vorlagen selbst, der Knopf fuer eine
 * neue, und der leere Zustand. Vorher dreimal dieselbe Kette abgeschrieben,
 * mit je eigenen Abweichungen im Abstand.
 */
/**
 * Die Vorlagen-Chips oben: rund, und eine Spur kraeftiger als die Werte
 * darunter.
 *
 * Zwei Ebenen, zwei Formen: Die Vorlage ist die Wahl, ihre Werte sind der
 * Inhalt. Gleiche Form und gleiche Farbe liessen beides als eine lange Reihe
 * lesen — man sah nicht, was wozu gehoert.
 */
const TEMPLATE_CHIP = `inline-flex items-center gap-2 h-10 px-[18px] rounded-full text-[14px] font-medium group
    bg-orange-500/[0.12] dark:bg-orange-500/[0.13] text-orange-950/75 dark:text-orange-50/75
    hover:bg-orange-500/[0.18] dark:hover:bg-orange-500/[0.19] hover:text-orange-950 dark:hover:text-orange-50
    transition-colors duration-150`;

/**
 * Die aufgeklappte Vorlage: dieselbe Farbe, nur kraeftiger, dazu ein Ring.
 *
 * Offen heisst nicht "voll in Farbe getaucht" — die Flaeche bliebe sonst das
 * Lauteste im Panel, obwohl sie nur einen Zustand meldet.
 */
const TEMPLATE_CHIP_OPEN = `!bg-orange-500/[0.20] dark:!bg-orange-500/[0.21]
    !text-orange-950 dark:!text-orange-50`;

/** Die Werte innerhalb einer Vorlage: eckiger, kleiner und leiser als die Vorlage selbst. */
const VALUE_CHIP_BASE = `inline-flex items-center h-8 px-3.5 rounded-[10px] text-[13px] font-medium transition-colors duration-150`;

/**
 * Zeichen vor einer eingesetzten Zeile.
 *
 * Macht auf einen Blick erkennbar, was aus einem Chip kam und was selbst
 * geschrieben wurde — ohne eine zweite Darstellung dafuer zu bauen. Ein Strich
 * statt einer Raute: Er liest sich als Aufzaehlung und nicht als Schlagwort,
 * und das ist es ja auch.
 *
 * Beim Wiederfinden einer Zeile wird er ignoriert. Wer ihn beim Bearbeiten
 * loescht, soll seine Zeile trotzdem behalten.
 */
const VAR_LINE_PREFIX = '– ';

/**
 * Beschriftungen und Vorschlaege fuer Anmerkungen und Referenzen.
 *
 * Deutsch, weil sie im Prompt des Nutzers landen und von ihm gelesen und
 * geaendert werden. Die technische Zuordnung der Bilder ("Image 2: annotation
 * overlay") bleibt davon unberuehrt und englisch — sie richtet sich an das
 * Modell, nicht an den Nutzer.
 */
const ANN_LABEL = 'Markierungen';
const ANN_DEFAULT = 'nur die markierten Bereiche ändern';
const REF_LABEL = 'Referenzen';
const REF_DEFAULT = 'nur als Stilvorlage, nicht als Bildinhalt';

/** Innenabstand des Panels oben und unten, in Pixeln (entspricht pt-6/pb-6). */
const PANEL_PAD_Y = 24;

/**
 * Die Chips unter "Anmerkungen" — Pinselstriche, Stempel, Formen.
 *
 * Zweimal dieselbe Klassenkette abgeschrieben, und entsprechend uneben: links
 * 10 Pixel Abstand, rechts 4, dazu ein Kreuz von 12 Pixeln in einem Feld von
 * 20. Jetzt eine Angabe, rund wie die uebrigen Chips der Anwendung, innen
 * gleichmaessig, und das Kreuz gross genug, um es zu treffen.
 *
 * Der Hintergrund in Schwarz/Weiss mit Deckkraft statt in Zink-Toenen: So
 * sitzt der Chip auf hellem wie dunklem Grund gleich, und er passt zu den
 * Ablageflaechen und dem Kachel-Abzeichen.
 */
/**
 * Die runden Knoepfe in der Eingabezeile (Referenz, Markieren, Einstellungen).
 *
 * Vorher trug jeder seine eigene Kette mit eigenen Deckkraeften — 5 % hier,
 * 10 % dort — und keine davon entsprach den runden Knoepfen im Kopf des
 * Blattes. Jetzt eine Angabe, mit denselben Werten wie die uebrigen Flaechen
 * dieses Panels, und einer Trefferflaeche, die sechs Pixel ueber den
 * sichtbaren Kreis hinausgeht.
 */
const PROMPT_ICON_BTN = `relative w-10 h-10 flex items-center justify-center rounded-full shrink-0
    transition-colors duration-150 disabled:opacity-40
    before:content-[''] before:absolute before:-inset-1.5 before:rounded-full`;

const PROMPT_ICON_BTN_IDLE = `bg-black/[0.06] dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300
    hover:bg-black/[0.10] dark:hover:bg-white/[0.12] hover:text-zinc-900 dark:hover:text-zinc-100`;

/** Eingeschaltet: dieselbe Flaeche, nur kraeftiger — wie bei den Chips. */
const PROMPT_ICON_BTN_ON = `bg-black/[0.14] dark:bg-white/[0.18] text-zinc-900 dark:text-white`;

const ANNOTATION_CHIP = `inline-flex items-center gap-2 h-10 pl-[18px] pr-2.5 rounded-full text-[14px] font-medium
    bg-black/[0.06] dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300
    hover:bg-black/[0.10] dark:hover:bg-white/[0.12] hover:text-zinc-900 dark:hover:text-zinc-100
    transition-colors duration-150`;

const ANNOTATION_CHIP_CLOSE = `w-[24px] h-[24px] rounded-full grid place-items-center shrink-0
    bg-black/[0.07] dark:bg-white/[0.10] hover:bg-black/[0.15] dark:hover:bg-white/[0.20]
    transition-colors duration-150`;

import { saveGenerationSettings, loadGenerationSettings } from '@/utils/generationSettings';
import { useItemDialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { useImageSuggestions } from '@/hooks/useImageSuggestions';
import { PresetEditorModal } from '@/components/modals/PresetEditorModal';
import { ManagePresetsModal } from '@/components/modals/ManagePresetsModal';

// ─── Prop Types ───────────────────────────────────────────────────────────────

interface SideSheetProps {
    selectedImage: CanvasImage | null;
    selectedImages?: CanvasImage[];
    sideSheetMode: 'prompt' | 'brush' | 'objects';
    onModeChange: (mode: 'prompt' | 'brush' | 'objects') => void;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    onBrushResizeStart?: () => void;
    onBrushResizeEnd?: () => void;
    onGenerate: (prompt: string, draftPrompt?: string, templateId?: string, vars?: Record<string, string[]>) => void;
    onUpdateAnnotations: (id: string, anns: any[]) => void;
    /**
     * Der Kopf der Detailansicht, der im Blatt sitzt (Zurueck, Name, Knoepfe).
     *
     * Er kommt von aussen, weil er von Dingen weiss, die das Blatt nichts
     * angehen — Navigation, Loeschen, laufende Generierungen. Das Blatt gibt
     * ihm nur seinen Platz: oben, ausserhalb des scrollenden Bereichs.
     */
    headerSlot?: React.ReactNode;
    onUpdatePrompt: (id: string, text: string) => void;
    onUpdateVariables: (id: string, templateId: string | undefined, vars: Record<string, string[]>) => void;
    onDeleteImage: (id: string | string[]) => void;
    onDeselectAll?: () => void;
    onGenerateMore: (id: string) => void;
    onNavigateParent: (id: string) => void;
    onDownload?: (id: string | string[]) => void;
    // Allow state spread: isDragOver maps to isGlobalDragOver
    isGlobalDragOver?: boolean;
    isDragOver?: boolean;
    onGlobalDragLeave: () => void;
    t: TranslationFunction;
    lang: 'de' | 'en';
    fullLibrary: LibraryCategory[];
    onAddUserCategory: (label: string) => void;
    onDeleteUserCategory: (id: string) => void;
    onAddUserItem: (catId: string, label: string, icon?: string) => Promise<void>;
    onDeleteUserItem: (catId: string, itemId: string) => void;
    maskTool: 'brush' | 'text' | 'shape' | 'select';
    onMaskToolChange: (tool: 'brush' | 'text' | 'shape' | 'select') => void;
    activeShape: 'rect' | 'circle' | 'line';
    onActiveShapeChange: (shape: 'rect' | 'circle' | 'line') => void;
    onActiveAnnotationChange?: (id: string | null) => void;
    onInteractionStart: () => void;
    onInteractionEnd: () => void;
    onAddReference?: (file: File, annotationId?: string) => void;
    createReferenceFiles?: string[];
    onRemoveCreateReference?: (idx: number) => void;
    onUpload?: () => void;
    onCreateNew?: () => void;
    qualityMode: GenerationQuality;
    onQualityModeChange: (mode: GenerationQuality) => void;
    templates: PromptTemplate[];
    /**
     * Zeilenanordnung der Detailansicht: Bild oben, Panel unten.
     * Bewusst eine Prop und nicht direkt aus den Vorlieben gelesen — das
     * Seitenpanel steht auch in der Galerie und auf der Erstellen-Seite, und
     * dort gibt es diese Anordnung nicht.
     */
    onRefreshTemplates?: () => void;
    onSaveTemplate?: (template: any) => Promise<any>;
    onEditTemplate?: (template: PromptTemplate) => void;
    onDeleteTemplate?: (id: string) => Promise<void>;
    onSaveRecentPrompt?: (prompt: string) => Promise<void>;
    onUpdateImageTitle?: (id: string, title: string) => void;
    onShowInfo?: (id: string) => void;
    userProfile: any;
    width?: string;
    disableMobileSheet?: boolean;
    initialPrompt?: string;
}

// ─── Helper: Eyebrow Label ────────────────────────────────────────────────────

const Eyebrow: React.FC<{ children: React.ReactNode; className?: string; muted?: boolean }> = ({ children, className = '', muted = false }) => (
    <span className={`text-xs font-normal ${muted ? 'text-zinc-500 dark:text-zinc-600' : 'text-zinc-600 dark:text-zinc-400'} ${className}`}>
        {children}
    </span>
);

// ─── Main SideSheet ───────────────────────────────────────────────────────────
// Main component
export const SideSheet = React.forwardRef<any, SideSheetProps>((props, ref) => {
    const {
        selectedImage, selectedImages, sideSheetMode, onModeChange,
        brushSize, onBrushSizeChange, onBrushResizeStart, onBrushResizeEnd,
        onGenerate, onUpdateAnnotations, onUpdatePrompt, onUpdateVariables, headerSlot,
        onDeleteImage, onDeselectAll,
        onGlobalDragLeave,
        t, lang, fullLibrary, onAddUserCategory, onDeleteUserCategory,
        onAddUserItem, onDeleteUserItem, maskTool, onMaskToolChange,
        activeShape, onActiveShapeChange, onActiveAnnotationChange,
        onInteractionStart: onInteractionStartExt, onInteractionEnd: onInteractionEndExt,
        qualityMode, onQualityModeChange, templates, onSaveTemplate, onEditTemplate,
        onDeleteTemplate, onSaveRecentPrompt, onUpdateImageTitle, onDownload,
        onGenerateMore, onNavigateParent, userProfile, width
    } = props;
    // Support both isDragOver (from state spread) and isGlobalDragOver (explicit)
    const isGlobalDragOver = props.isGlobalDragOver ?? props.isDragOver ?? false;

    // ── State ──
    const [prompt, setPrompt] = useState(() => props.initialPrompt ?? selectedImage?.userDraftPrompt ?? '');
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
    /**
     * Welche Vorlage gerade aufgeklappt ist und ihre Chips zeigt.
     *
     * Getrennt von activeTemplateId: Die sagt, welche Vorlage zuletzt benutzt
     * wurde, und wird mit dem Auftrag vermerkt. Dies hier ist nur die Frage, ob
     * die Liste gerade offen steht — zwei verschiedene Dinge, die man leicht in
     * einen Wert presst und sich damit die Auswertung verdirbt.
     */
    const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
    const [controlValues, setControlValues] = useState<Record<string, string[]>>({});
    const [isSideZoneActive, setIsSideZoneActive] = useState(false);
    const [isQualityOpen, setIsQualityOpen] = useState(false);
    // PREVIEW: settings modal that replaces the resolution dropdown. Pure UI; only the
    // resolution part is wired back to the existing onQualityModeChange flow. Quality
    // and aspectRatio fields are tracked locally until the backend wiring lands.
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    // Hydrate from localStorage on mount, then mirror resolution into qualityMode.
    const [previewSettings, setPreviewSettings] = useState<GenerationSettings>(() => {
        const saved = loadGenerationSettings();
        return { ...saved, resolution: qualityMode || saved.resolution };
    });
    // Keep local resolution in sync if qualityMode changes from outside (e.g. preset).
    React.useEffect(() => {
        setPreviewSettings(prev => prev.resolution === qualityMode ? prev : { ...prev, resolution: qualityMode });
    }, [qualityMode]);
    // Einmaliger Hinweis auf das neue Standardmodell.
    //
    // Nur fuer Bestandsnutzer: Wer schon eine Wahl gespeichert hat, bekommt den
    // neuen Standard nicht aufgedrueckt — sonst wuerde eine bewusste
    // Entscheidung ueberschrieben. Der Hinweis ist der Ersatz dafuer: zeigen,
    // nicht umstellen. Wer bereits Seedream nutzt, sieht ihn nie.
    const [showModelHint, setShowModelHint] = React.useState(false);
    React.useEffect(() => {
        // Ob der Hinweis schon gezeigt wurde, verwaltet ContextTip selbst ueber
        // storageKey — hier nur die Frage, ob er ueberhaupt gemeint ist. Wer
        // bereits Seedream nutzt, braucht ihn nicht.
        //
        // Absichtlich nur beim Aufbau: Er soll nicht bei jedem Modellwechsel
        // wieder erscheinen.
        if (previewSettings.provider !== 'seedream') setShowModelHint(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Das Wegblenden und Merken uebernimmt ContextTip ueber storageKey. Hier
    // nur noch das vorzeitige Beenden, wenn der Nutzer von sich aus in die
    // Einstellungen geht oder das Modell wechselt — dann hat der Hinweis seinen
    // Zweck erfuellt und braucht nicht auszulaufen.
    const dismissModelHint = React.useCallback(() => {
        setShowModelHint(false);
    }, []);

    const handleSettingsChange = (next: GenerationSettings) => {
        dismissModelHint();
        setPreviewSettings(next);
        // Persist so imageService.generateImage can read at invoke time.
        saveGenerationSettings(next);
        if (next.resolution !== qualityMode) onQualityModeChange(next.resolution);
    };

    // Preset Menu State
    const [isPresetsMenuOpen, setIsPresetsMenuOpen] = useState(false);
    const presetsMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isPresetsMenuOpen && presetsMenuRef.current && !presetsMenuRef.current.contains(e.target as Node)) {
                setIsPresetsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isPresetsMenuOpen]);

    // Preset Editor State
    const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | undefined>();

    // Variable Controls State
    const [hiddenControlIds, setHiddenControlIds] = useState<string[]>([]);
    const [editingControlId, setEditingControlId] = useState<string | null>(null);
    const [editControlValue, setEditControlValue] = useState('');
    const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({});

    // Resolve active template + standalone controls early so voice event handlers can reference them
    const activeTemplate = templates?.find(t => t.id === activeTemplateId) || null;
    const expandedTemplate = templates?.find(t => t.id === expandedTemplateId) || null;
    const [standaloneControlsMap, setStandaloneControlsMap] = useState<Record<string, PresetControl[]>>({});
    // On create page (no selectedImage), use a dedicated key '_create'
    const standaloneControlsKey = selectedImage?.id ?? '_create';
    const standaloneControls = standaloneControlsMap[standaloneControlsKey] ?? [];
    const setStandaloneControls = React.useCallback((controls: PresetControl[]) => {
        const key = selectedImage?.id ?? '_create';
        setStandaloneControlsMap(prev => ({ ...prev, [key]: controls }));
    }, [selectedImage?.id]);

    // Reset hidden controls when template changes
    useEffect(() => {
        setHiddenControlIds([]);
        setLabelOverrides({});
        setEditingControlId(null);
    }, [activeTemplateId]);

    // Voice-created variables: listen for custom events from the voice assistant
    useEffect(() => {
        const handleSetVariables = (e: Event) => {
            const { controls } = (e as CustomEvent).detail as { controls: Array<{ label: string; options: string[]; selected?: string[] }> };
            if (!controls?.length) return;

            // Build a map of old label → { controlId, selectedValues } so we can preserve selections
            const oldControls = standaloneControls;
            const oldLabelMap = new Map<string, { id: string; values: string[] }>();
            oldControls.forEach(c => {
                const selected = controlValues[c.id];
                if (selected?.length) {
                    oldLabelMap.set(c.label.toLowerCase(), { id: c.id, values: selected });
                }
            });

            const now = Date.now();
            const presetControls: PresetControl[] = controls.map((c, ci) => ({
                id: `voice-${ci}-${now}`,
                label: c.label,
                options: c.options.map((opt, oi) => ({
                    id: `voice-opt-${ci}-${oi}-${now}`,
                    label: opt,
                    value: opt
                }))
            }));

            // Carry over old user selections first; fall back to AI pre-selection for new labels
            const newValues: Record<string, string[]> = {};
            presetControls.forEach((ctrl, ci) => {
                const validOptions = new Set(ctrl.options.map(o => o.value));
                const old = oldLabelMap.get(ctrl.label.toLowerCase());
                if (old) {
                    // Preserve existing user selection
                    const kept = old.values.filter(v => validOptions.has(v));
                    if (kept.length) { newValues[ctrl.id] = kept; return; }
                }
                // Apply AI pre-selection for this control
                const preSelected = controls[ci].selected;
                if (preSelected?.length) {
                    const valid = preSelected.filter(v => validOptions.has(v));
                    if (valid.length) newValues[ctrl.id] = valid;
                }
            });

            setStandaloneControls(presetControls);
            setControlValues(newValues);
            setHiddenControlIds([]);
        };

        const handleToggleVariable = (e: Event) => {
            const { label, option } = (e as CustomEvent).detail as { label: string; option: string };
            const controls = activeTemplate?.controls ?? standaloneControls;
            if (!controls?.length) return;

            const ctrl = controls.find(c =>
                c.label.toLowerCase() === label.toLowerCase() ||
                (labelOverrides[c.id] || '').toLowerCase() === label.toLowerCase()
            );
            if (!ctrl) return;

            const matchedOpt = ctrl.options.find(o =>
                o.value.toLowerCase() === option.toLowerCase() ||
                o.label.toLowerCase() === option.toLowerCase()
            );
            if (!matchedOpt) return;

            setControlValues(prev => {
                const current = prev[ctrl.id] || [];
                let updated: Record<string, string[]>;
                if (current.includes(matchedOpt.value)) {
                    const filtered = current.filter(v => v !== matchedOpt.value);
                    updated = { ...prev };
                    if (filtered.length === 0) delete updated[ctrl.id];
                    else updated[ctrl.id] = filtered;
                } else {
                    updated = { ...prev, [ctrl.id]: [...current, matchedOpt.value] };
                }
                if (selectedImage?.id) {
                    onUpdateVariables?.(selectedImage.id, activeTemplate?.id, updated);
                }
                return updated;
            });
        };

        window.addEventListener('expose:set-voice-variables', handleSetVariables);
        window.addEventListener('expose:toggle-voice-variable', handleToggleVariable);
        return () => {
            window.removeEventListener('expose:set-voice-variables', handleSetVariables);
            window.removeEventListener('expose:toggle-voice-variable', handleToggleVariable);
        };
    }, [selectedImage?.id, activeTemplate, standaloneControls, labelOverrides, onUpdateVariables]);

    // Annotation History
    const [historyMap, setHistoryMap] = useState<Map<string, AnnotationObject[][]>>(new Map());
    const [historyIndexMap, setHistoryIndexMap] = useState<Map<string, number>>(new Map());
    const [initialAnns, setInitialAnns] = useState<AnnotationObject[]>([]);
    const isInteracting = useRef(false);
    const lastSelectedIdRef = useRef<string | null>(null);
    // Always-current ref to selectedImage — prevents stale closure in useImperativeHandle callbacks
    const selectedImageRef = useRef(selectedImage);
    useEffect(() => { selectedImageRef.current = selectedImage; }, [selectedImage]);
    const { confirm } = useItemDialog();
    const { showToast } = useToast();

    // Inspiration / Reference Image
    const [isInspirationOpen, setIsInspirationOpen] = useState(false);
    const [viewingRefAnn, setViewingRefAnn] = useState<AnnotationObject | null>(null);
    const [inspirationInitialSrc, setInspirationInitialSrc] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Mobile Sheet
    const isMobile = useMobile();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const sheetRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStartY = useRef(0);
    const dragCurrentY = useRef(0);

    // ── Computed ──
    const isMulti = !!selectedImages && selectedImages.length > 1;
    const annotations = selectedImage?.annotations || [];
    const history = selectedImage?.id ? (historyMap.get(selectedImage.id) || []) : [];
    const historyIndex = selectedImage?.id ? (historyIndexMap.get(selectedImage.id) ?? -1) : -1;

    const displayTemplates = React.useMemo(() => {
        if (!templates) return [];
        /*
            Alles nach der eingestellten Sprache, auch die eigenen Vorlagen.

            Vorher waren eigene Vorlagen von der Filterung ausgenommen — die
            Begruendung war, die Datenbank koenne sie faelschlich als 'en'
            gespeichert haben. Die Folge war eine Liste, in der deutsche und
            englische Vorlagen nebeneinanderstehen, und beim Aufklappen dann
            englische Gruppen unter einem deutschen Namen.

            Damit trotzdem niemand seine Vorlagen verliert: Bleibt nach der
            Filterung keine einzige eigene uebrig, obwohl es welche gibt,
            werden sie alle gezeigt. Eine falsch gespeicherte Sprache macht
            so kein Loch in die Liste.
        */
        const matchesLang = (tpl: PromptTemplate) => !tpl.lang || tpl.lang === lang;
        const customs = templates.filter(tpl => tpl.isCustom);
        const customsInLang = customs.filter(matchesLang);
        const keepAllCustoms = customs.length > 0 && customsInLang.length === 0;
        const filtered = templates.filter(tpl => (tpl.isCustom && keepAllCustoms) || matchesLang(tpl));
        return filtered.slice(0, 12);
    }, [templates, lang]);


    // ── Prompt auto-resize ──
    //
    // Waechst mit dem Text, aber zwischen zwei Grenzen. Leer faellt das Feld
    // auf eine knappe Hoehe zurueck — ein halb leerer Kasten von 140 Pixeln war
    // viel Flaeche fuer nichts. Nach oben ist Schluss, dann scrollt der Text
    // IM Feld, statt die Knoepfe darunter immer weiter nach unten zu schieben.
    //
    // Das ist die Bauweise jedes Chat-Eingabefeldes, und sie loest nebenbei die
    // Frage nach einer zweiten Spalte fuer die Knoepfe: Die braucht es nicht,
    // wenn das Feld selbst nicht mehr waechst.
    const isMobileSheet = isMobile && !props.disableMobileSheet;

    // Mindesthoehe je nach Anordnung.
    //
    // In der Spaltenansicht hat die Eingabe die ganze Panelhoehe zur
    // Verfuegung; dort wirkt ein flaches Feld gedrueckt, und etwas Luft unter
    // dem Platzhalter laedt eher zum Schreiben ein. Im Zeilenmodus ist die
    // Leiste selbst niedrig — dort waere dieselbe Hoehe der ganze Platz.
    const PROMPT_MIN_H = 160;
    /**
     * Das Feld waechst mit seinem Text — und hat keine eigene Bildlaufleiste.
     *
     * Es gibt im Blatt genau EINE Flaeche, die scrollt: den Inhalt des Blattes.
     * Ein Kasten darin, der selbst scrollt, versteckt Text hinter einer
     * zweiten, unsichtbaren Kante: Man sieht nicht, dass noch etwas da ist,
     * und das Rad tut mal das eine, mal das andere, je nachdem, wo der Zeiger
     * gerade steht.
     *
     * Dass die Chips darunter beim Tippen nach unten wandern, ist der Preis —
     * und der richtige: Sie folgen dem Text, zu dem sie gehoeren.
     */
    useLayoutEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.max(el.scrollHeight, PROMPT_MIN_H)}px`;
        el.style.overflowY = 'hidden';
    }, [prompt, selectedImage?.id, PROMPT_MIN_H]);

    /**
     * Der Entwurfsbereich blendet beim Bildwechsel ein.
     *
     * Prompt und Variablen-Chips gehoeren dem einzelnen Bild: Beim Blaettern
     * steht mal Text da, mal Chips, mal nichts. Das sprang bisher uebergangslos
     * um, waehrend Karte, Knoepfe und Vorlagen stehen blieben — es sah aus wie
     * ein Fehler, nicht wie ein Wechsel.
     *
     * Ausblenden geschieht sofort, Einblenden weich: Der alte Inhalt gehoert
     * nicht mehr zum neuen Bild, er soll nicht noch kurz nachleuchten. Das Neue
     * dagegen darf kommen.
     *
     * Bewusst ohne key und damit ohne Neuaufbau: Das Textfeld wuerde dabei
     * seine berechnete Hoehe verlieren, bis der naechste Lauf sie wieder setzt.
     */
    const [draftIn, setDraftIn] = useState(true);
    useLayoutEffect(() => {
        setDraftIn(false);
        const id = requestAnimationFrame(() => requestAnimationFrame(() => setDraftIn(true)));
        return () => cancelAnimationFrame(id);
    }, [selectedImage?.id]);
    const draftFadeClass = draftIn
        ? 'opacity-100 transition-opacity duration-200 ease-out'
        : 'opacity-0';

    // ── Entwurf beim Bildwechsel laden ──────────────────────────────────────
    useEffect(() => {
        if (!selectedImage) return;
        if (selectedImage.id === lastSelectedIdRef.current) return;

        if (!isMulti) {
            // Ein erzeugtes Bild ist ein Ergebnis, kein Entwurf — das Panel
            // startet dort leer. Vorher wurden variableValues und
            // activeTemplateId auch für Kinder geladen, userDraftPrompt aber
            // nicht: Man sah Chips ohne Text und wusste nicht, was gelten soll.
            //
            // Die Felder bleiben am Bild gespeichert, sie werden hier nur nicht
            // als Entwurf angezeigt — "Mehr" liest sie weiterhin direkt vom
            // Bild und spielt die Anfrage unverändert nach.
            const isGeneratedChild = !!selectedImage.parentId || !!selectedImage.generationPrompt;
            if (isGeneratedChild) {
                setPrompt('');
                setActiveTemplateId(null);
                setControlValues({});
                setExpandedTemplateId(null);
            } else {
                setPrompt(selectedImage.userDraftPrompt || '');
                setActiveTemplateId(selectedImage.activeTemplateId || null);
                setControlValues(selectedImage.variableValues || {});
                // Auch aufgeklappt, nicht nur vermerkt: Sonst steht nach einem
                // Neuladen ein Text voller eingesetzter Zeilen da, und die
                // Chips, mit denen man eine davon aendert, sind nicht zu sehen.
                // Keine neue Speicherung dafuer — die Vorlage ist schon am Bild
                // vermerkt.
                setExpandedTemplateId(selectedImage.activeTemplateId || null);
            }
        }

        // Zustand von Dialogen und Beschriftungen darf nie zwischen Bildern
        // überlaufen — unabhängig davon, ob ein Entwurf geladen wurde.
        setIsInspirationOpen(false);
        setViewingRefAnn(null);
        setInspirationInitialSrc(null);
        setHiddenControlIds([]);
        setLabelOverrides({});

        // Nur vermerken, wenn auch wirklich geladen wurde. Im Mehrfachmodus
        // wurde die ID bisher trotzdem gesetzt; beim Rückwechsel auf dasselbe
        // Bild galt es dann als "schon geladen" und behielt die Werte aus der
        // Mehrfachauswahl.
        if (!isMulti) lastSelectedIdRef.current = selectedImage.id;
    }, [selectedImage?.id, isMulti]);

    // ── History initialization ──
    useEffect(() => {
        if (selectedImage?.id && !historyMap.has(selectedImage.id)) {
            const anns = selectedImage.annotations || [];
            setHistoryMap(prev => new Map(prev).set(selectedImage.id, [anns]));
            setHistoryIndexMap(prev => new Map(prev).set(selectedImage.id, 0));
        }
        if (selectedImage?.id && sideSheetMode === 'brush') {
            setInitialAnns(selectedImage.annotations || []);
        }
    }, [selectedImage?.id, sideSheetMode]);

    // ── Sync external annotation changes to history ──
    useEffect(() => {
        if (!selectedImage?.id) return;
        const currentHistory = historyMap.get(selectedImage.id);
        if (!currentHistory) return;
        const currentIndex = historyIndexMap.get(selectedImage.id) ?? -1;
        const historyAnns = currentHistory[currentIndex];
        const currentAnns = selectedImage.annotations || [];
        if (historyAnns !== currentAnns) {
            const newHistory = [...currentHistory.slice(0, currentIndex + 1), currentAnns];
            setHistoryMap(prev => new Map(prev).set(selectedImage.id, newHistory.slice(-50)));
            setHistoryIndexMap(prev => new Map(prev).set(selectedImage.id, newHistory.length - 1));
        }
    }, [selectedImage?.annotations]);

    // ── Annotation helpers ──
    const updateAnnotationsWithHistory = (newAnns: AnnotationObject[], force = false) => {
        if (!selectedImage) return;
        if (isInteracting.current && !force) {
            onUpdateAnnotations(selectedImage.id, newAnns);
            return;
        }
        const currentHistory = historyMap.get(selectedImage.id) || [];
        const currentIndex = historyIndexMap.get(selectedImage.id) ?? -1;
        const newHistory = [...currentHistory.slice(0, currentIndex + 1), newAnns].slice(-50);
        setHistoryMap(prev => new Map(prev).set(selectedImage.id, newHistory));
        setHistoryIndexMap(prev => new Map(prev).set(selectedImage.id, newHistory.length - 1));
        onUpdateAnnotations(selectedImage.id, newAnns);
    };

    const setActiveAnnotationId = (id: string | null) => {
        onActiveAnnotationChange?.(id);
    };

    const handleUndo = () => {
        if (!selectedImage || historyIndex <= 0) return;
        const h = historyMap.get(selectedImage.id) || [];
        const idx = historyIndex - 1;
        setHistoryIndexMap(prev => new Map(prev).set(selectedImage.id, idx));
        onUpdateAnnotations(selectedImage.id, h[idx]);
    };

    const handleRedo = () => {
        if (!selectedImage || historyIndex >= history.length - 1) return;
        const h = historyMap.get(selectedImage.id) || [];
        const idx = historyIndex + 1;
        setHistoryIndexMap(prev => new Map(prev).set(selectedImage.id, idx));
        onUpdateAnnotations(selectedImage.id, h[idx]);
    };

    React.useImperativeHandle(ref, () => ({
        handleInteractionStart: () => { isInteracting.current = true; onInteractionStartExt?.(); },
        handleInteractionEnd: () => {
            // Use ref instead of closure — selectedImage may be stale if a chip was deleted
            // during the interaction (e.g. brush stroke + chip delete race)
            const current = selectedImageRef.current;
            if (!current || !isInteracting.current) return;
            isInteracting.current = false;
            updateAnnotationsWithHistory(current.annotations || [], true);
            onInteractionEndExt?.();
        }
    }));

    const deleteAnnotation = (annId: string) => {
        if (!selectedImage?.annotations) return;
        updateAnnotationsWithHistory(selectedImage.annotations.filter(a => a.id !== annId));
    };

    const clearAllBrushStrokes = () => {
        if (!selectedImage?.annotations) return;
        updateAnnotationsWithHistory(selectedImage.annotations.filter(a => a.type !== 'mask_path'));
    };

    const handleAddShape = (shape: 'rect' | 'circle' | 'line') => {
        if (!selectedImage) return;
        const cx = selectedImage.width / 2;
        const cy = selectedImage.height / 2;
        const size = Math.min(selectedImage.width, selectedImage.height) * 0.3;
        const half = size / 2;
        let newShape: AnnotationObject;
        if (shape === 'line') {
            newShape = { id: generateId(), type: 'shape', shapeType: 'line', points: [{ x: cx - half, y: cy }, { x: cx + half, y: cy }], strokeWidth: 4, color: '#fff', createdAt: Date.now() };
        } else if (shape === 'rect') {
            const x = cx - half, y = cy - half;
            newShape = { id: generateId(), type: 'shape', shapeType: 'rect', points: [{ x, y }, { x: x + size, y }, { x: x + size, y: y + size }, { x, y: y + size }], strokeWidth: 4, color: '#fff', createdAt: Date.now() };
        } else {
            newShape = { id: generateId(), type: 'shape', shapeType: 'circle', x: cx - half, y: cy - half, width: size, height: size, points: [], strokeWidth: 4, color: '#fff', createdAt: Date.now() };
        }
        updateAnnotationsWithHistory([...(selectedImage.annotations || []), newShape]);
        setActiveAnnotationId(newShape.id);
        onMaskToolChange('select');
    };

    const handleClearControl = (controlId: string) => {
        // Side effect outside the updater (updaters must stay pure).
        const newState = { ...controlValues };
        delete newState[controlId];
        setControlValues(newState);
        onUpdateVariables?.(selectedImage?.id || '', activeTemplate?.id, newState);
        setHiddenControlIds(prev => [...prev, controlId]);
    };


    const startEditingControl = (id: string, currentLabel: string) => {
        setEditingControlId(id);
        setEditControlValue(labelOverrides[id] || currentLabel);
    };

    const saveControlLabel = () => {
        if (editingControlId) {
            setLabelOverrides(prev => ({ ...prev, [editingControlId]: editControlValue }));
        }
        setEditingControlId(null);
        setEditControlValue('');
    };

    const handleAddObjectCenter = (label: string, itemId: string, icon?: string) => {
        if (!selectedImage) return;
        const cx = selectedImage.width / 2;
        const cy = selectedImage.height / 2;
        if (itemId === 'util:clear_masks') {
            updateAnnotationsWithHistory((selectedImage.annotations || []).filter(a => a.type !== 'mask_path'));
            return;
        }
        const newAnn: AnnotationObject = { id: generateId(), type: itemId === 'util:remove' ? 'stamp' : 'stamp', x: cx, y: cy, text: label, itemId, emoji: icon, color: itemId === 'util:remove' ? '#ef4444' : '#fff', strokeWidth: 0, points: [], createdAt: Date.now() };
        updateAnnotationsWithHistory([...(selectedImage.annotations || []), newAnn]);
        onMaskToolChange('select');
    };

    const handleAddText = () => {
        if (!selectedImage) return;
        const newText: AnnotationObject = { id: generateId(), type: 'stamp', x: selectedImage.width / 2, y: selectedImage.height / 2, text: '', color: '#fff', strokeWidth: 4, points: [], createdAt: Date.now() };
        updateAnnotationsWithHistory([...(selectedImage.annotations || []), newText]);
    };

    // ── Entwurf speichern ───────────────────────────────────────────────────
    //
    // Prompt und Variablen liefen vorher auseinander: Der Prompt wurde bei
    // Mehrfachauswahl gar nicht gespeichert (!isMulti), die Variablen nur am
    // Hauptbild. Im Panel sah man danach Chips ohne Text, und die anderen
    // Bilder der Auswahl hatten überhaupt nichts.
    //
    // Beides geht jetzt über dieselbe Zielliste — bei Mehrfachauswahl auf alle
    // ausgewählten Bilder, sonst auf das eine. Was für den Prompt gilt, gilt
    // damit zwangsläufig auch für die Variablen.
    const draftTargets = React.useMemo<CanvasImage[]>(() => {
        if (isMulti && selectedImages) return selectedImages;
        return selectedImage ? [selectedImage] : [];
    }, [isMulti, selectedImages, selectedImage]);

    const persistPrompt = React.useCallback((text: string) => {
        draftTargets.forEach(img => onUpdatePrompt(img.id, text));
    }, [draftTargets, onUpdatePrompt]);

    const persistVariables = React.useCallback((templateId: string | undefined, values: Record<string, string[]>) => {
        draftTargets.forEach(img => onUpdateVariables(img.id, templateId, values));
    }, [draftTargets, onUpdateVariables]);

    // ── Prompt helpers ──
    const handlePromptChange = (val: string) => {
        setPrompt(val);
        persistPrompt(val);
    };

    const handleGenerate = () => {
        // Same upload-still-running guard as PromptTab — without storage_path
        // the edge function can't pull the source bytes, so silently failing is
        // worse than telling the user to wait one or two seconds.
        const stillUploading = !!selectedImage
            && !selectedImage.storage_path
            && typeof selectedImage.src === 'string'
            && selectedImage.src.startsWith('blob:');
        if (stillUploading) {
            showToast(t('image_still_uploading'), 'info');
            return;
        }
        let finalPrompt = prompt.trim();
        // Append standalone controls (voice-created) to prompt
        if (!activeTemplate && standaloneControls.length > 0) {
            const parts = standaloneControls
                .filter(c => !hiddenControlIds.includes(c.id))
                .map(c => {
                    const vals = controlValues[c.id];
                    if (!vals?.length) return null;
                    const label = labelOverrides[c.id] || c.label;
                    return `${label}: ${vals.join(', ')}`;
                })
                .filter(Boolean);
            if (parts.length) finalPrompt += '\n\n' + parts.join('. ');
        }
        if (onSaveRecentPrompt && finalPrompt) onSaveRecentPrompt(finalPrompt).catch(() => { });
        onGenerate(finalPrompt, prompt, activeTemplate?.id, controlValues);
    };

    /**
     * Generieren per Tastatur.
     *
     * Bewusst ⌘↵ statt ⏎ allein: Das Prompt-Feld ist mehrzeilig, ein blankes
     * Enter muss dort einen Zeilenumbruch machen. ⌘↵ ist ausserdem das, was
     * Nutzer aus Slack, Linear und GitHub mitbringen.
     *
     * Der Abgleich laeuft ueber die gesamte Seite, nicht nur ueber das
     * Textfeld: Wer gerade einen Variablen-Chip gesetzt hat, soll nicht erst
     * zurueck ins Feld klicken muessen.
     */
    // Am Knopf steht der einfachere der beiden Wege. Befehls-/Strg+Enter gilt
    // immer und greift ueberall auf der Seite; Enter allein laesst sich in den
    // Einstellungen abschalten, und dann steht dort wieder das laengere
    // Kuerzel — sonst verspraeche der Knopf etwas, das nicht mehr gilt.
    const enterGenerates = useEnterGenerates();
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    // Der Zeilenschalter als Symbol, nicht als Zeichen: ↵ ist ein
    // Schriftzeichen, dessen Groesse und Lage zur Grundlinie die Schrift
    // bestimmt — deshalb sass es nie mittig. Das Befehlstasten-Zeichen ⌘
    // bleibt Text, das ist in allen Systemschriften sauber gezeichnet.
    const enterIcon = <CornerDownLeft className="w-[1.05em] h-[1.05em]" strokeWidth={2} />;
    const generateShortcutLabel = enterGenerates
        ? enterIcon
        : <>{isMac ? '⌘' : 'Strg'}{enterIcon}</>;
    // Bewusst kein Hinweistext am Knopf: Das Zeichen im Knopf sagt es bereits,
    // und wer es nicht kennt, klickt — was ohnehin funktioniert. Ein Kasten,
    // der bei jedem Ueberfahren des wichtigsten Knopfes aufgeht, waere dauernd
    // im Weg.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
            // Modale Dialoge haben eigene Enter-Bedeutungen — denen nicht
            // dazwischenfunken.
            if (document.querySelector('[role="dialog"]')) return;
            e.preventDefault();
            handleGenerate();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    });

    // Voice: unified generation + prompt events (no more DOM hacks)
    useEffect(() => {
        const onTriggerGeneration = () => handleGenerate();
        const onSetPrompt = (e: Event) => {
            const { text } = (e as CustomEvent).detail as { text: string };
            setPrompt(text);
            persistPrompt(text);
        };

        window.addEventListener('expose:trigger-generation', onTriggerGeneration);
        window.addEventListener('expose:set-prompt', onSetPrompt);
        return () => {
            window.removeEventListener('expose:trigger-generation', onTriggerGeneration);
            window.removeEventListener('expose:set-prompt', onSetPrompt);
        };
    });

    const handleSelectTemplate = (tpl: PromptTemplate) => {
        // Nochmal auf dieselbe Vorlage: nur zuklappen. Der Prompt bleibt stehen —
        // was man geschrieben hat, verschwindet nicht, weil man die Liste
        // schliesst.
        if (expandedTemplateId === tpl.id) {
            setExpandedTemplateId(null);
            return;
        }
        setExpandedTemplateId(tpl.id);

        /**
         * Aufklappen darf den Text nicht ueberschreiben.
         *
         * Vorher ersetzte jeder Griff an eine Vorlage den ganzen Prompt durch
         * ihren eigenen. Nach einem Neuladen stand die Vorlage zugeklappt da —
         * wer sie oeffnete, um "modern" auf "klassisch" zu aendern, verlor
         * dabei "Raum: Wohnzimmer" und "viel Tageslicht" und musste alles neu
         * eintippen. Genau der Fall, der gemeldet wurde.
         *
         * Jetzt: Ist das Feld leer, steht danach der Text der Vorlage drin.
         * Ist etwas drin, kommt der Text der Vorlage dazu, einmal — und was
         * schon dasteht, bleibt stehen. Ein zweites Aufklappen fuegt nichts
         * erneut hinzu.
         */
        const tplText = (tpl.prompt || '').trim();
        const current = prompt.trim();
        if (tplText && !current.includes(tplText)) {
            const newText = current ? `${current}\n${tplText}` : tplText;
            setPrompt(newText);
            persistPrompt(newText);
        }

        // Merge controls if activeTemplate is a custom "merged" template or just replace activeTemplateId
        // but the prompt asked specifically to just paste the content.
        // If we set activeTemplateId = tpl.id, it will load its variables, but it won't show as active if we removed the check.
        setActiveTemplateId(tpl.id);
        // Die alten Werte fallen weiter weg: Sie waren Zustand NEBEN dem Text,
        // und nur die Bedienelemente der neuen Vorlage werden gezeichnet —
        // uebrig gebliebene Schluessel waeren unsichtbar, gingen aber mit zur
        // Generierung. Was der Nutzer gewaehlt hat, steht im Text und bleibt
        // davon unberuehrt.
        setControlValues({});
        persistVariables(tpl.id, {});
        textareaRef.current?.focus();
    };

    /**
     * Schreibt "Beschriftung: Wert" in den Prompt.
     *
     * Der Kern des neuen Ablaufs: Ein Chip setzt keinen Zustand mehr, er
     * schreibt Text. Danach gibt es nur noch EINE Quelle fuer das, was zum
     * Modell geht — das, was dasteht. Vorher waren es zwei, und was am Ende
     * ankam, setzte der Code zusammen, ohne dass es jemand sah.
     *
     * Gibt es die Zeile schon, wird sie fortgeschrieben statt verdoppelt:
     * - Bei einfacher Wahl ersetzt der neue Wert den alten. Wer von
     *   "Wohnzimmer" auf "Kueche" wechselt, will nicht beides.
     * - Bei Mehrfachwahl kommt er dazu, und ein zweiter Klick auf denselben
     *   Wert nimmt ihn wieder heraus. Bleibt nichts uebrig, verschwindet die
     *   ganze Zeile.
     *
     * Die Zeile wird ueber ihre Beschriftung gefunden, nicht ueber eine
     * gespeicherte Position: Der Nutzer darf den Text dazwischen beliebig
     * umbauen, und solange "Raum:" am Zeilenanfang steht, findet der naechste
     * Klick sie wieder.
     */
    const upsertVariableLine = (label: string, value: string, multi: boolean) => {
        const lines = prompt.split('\n');
        const head = `${VAR_LINE_PREFIX}${label}:`;
        // Beim Suchen ist der Strich egal: Wer ihn beim Bearbeiten entfernt,
        // soll seine Zeile trotzdem wiederfinden.
        const matches = (l: string) => l.trimStart().replace(VAR_LINE_PREFIX, '').toLowerCase()
            .startsWith(`${label.toLowerCase()}:`);
        const at = lines.findIndex(matches);

        if (at === -1) {
            const next = prompt.trimEnd();
            const text = next ? `${next}\n${head} ${value}` : `${head} ${value}`;
            handlePromptChange(text);
            return;
        }

        const current = lines[at].slice(lines[at].indexOf(':') + 1)
            .split(',').map(v => v.trim()).filter(Boolean);

        let updated: string[];
        if (!multi) {
            updated = current.length === 1 && current[0].toLowerCase() === value.toLowerCase() ? [] : [value];
        } else {
            updated = current.some(v => v.toLowerCase() === value.toLowerCase())
                ? current.filter(v => v.toLowerCase() !== value.toLowerCase())
                : [...current, value];
        }

        if (updated.length === 0) lines.splice(at, 1);
        else lines[at] = `${head} ${updated.join(', ')}`;
        handlePromptChange(lines.join('\n').replace(/\n{3,}/g, '\n\n').trimStart());
    };

    /** Steht dieser Wert schon im Prompt? Faerbt den Chip. */
    const isValueInPrompt = (label: string, value: string): boolean => {
        const line = prompt.split('\n').find(l => l.trimStart().replace(VAR_LINE_PREFIX, '')
            .toLowerCase().startsWith(`${label.toLowerCase()}:`));
        if (!line) return false;
        return line.slice(line.indexOf(':') + 1).split(',')
            .some(v => v.trim().toLowerCase() === value.toLowerCase());
    };

    /**
     * "Fuer dieses Bild": Vorschlaege, die aus dem Bild selbst kommen.
     *
     * Nur bei genau einem Bild. Bei einer Mehrfachauswahl gilt jeder Vorschlag
     * nur fuer eines davon — das waere ein Chip, der am falschen Bild etwas
     * anderes anstellt als am richtigen.
     */
    const suggestionTarget = (selectedImages && selectedImages.length > 1) ? null : selectedImage;
    // Der Ladezustand wird nicht angezeigt: Es gibt keinen Platzhalter mehr,
    // und ein Kreisel fuer etwas, das niemand angefordert hat, waere einer zu viel.
    const { suggestions: imageSuggestions } = useImageSuggestions(suggestionTarget, lang);

    /**
     * Ein Vorschlag ist eine ganze Zeile, kein Wert zu einer Beschriftung.
     *
     * "Rasen aufbereiten" hat keine Gegenstuecke, zwischen denen man waehlt —
     * es gilt oder es gilt nicht. Deshalb kein "Beschriftung: Wert", sondern
     * die Zeile selbst, und ein zweiter Klick nimmt sie wieder heraus. Danach
     * ist es gewoehnlicher Text wie alles andere im Feld.
     */
    const bareLine = (l: string) => l.trimStart().replace(VAR_LINE_PREFIX, '').trim().toLowerCase();

    const isLineInPrompt = (line: string): boolean =>
        prompt.split('\n').some(l => bareLine(l) === line.trim().toLowerCase());

    const toggleSuggestionLine = (line: string) => {
        const lines = prompt.split('\n');
        const at = lines.findIndex(l => bareLine(l) === line.trim().toLowerCase());
        if (at !== -1) {
            lines.splice(at, 1);
            handlePromptChange(lines.join('\n').replace(/\n{3,}/g, '\n\n').trim());
            return;
        }
        const next = prompt.trimEnd();
        handlePromptChange(next ? `${next}\n${VAR_LINE_PREFIX}${line}` : `${VAR_LINE_PREFIX}${line}`);
    };

    /**
     * Die Gruppen, die unter der aufgeklappten Vorlage stehen.
     *
     * Ohne aufgeklappte Vorlage die per Sprache angelegten Gruppen — sonst
     * waeren sie nirgends mehr zu sehen, seit die Eingabekarte sie nicht mehr
     * traegt.
     */
    const expandedControls = (expandedTemplate?.controls ?? (expandedTemplateId ? [] : standaloneControls))
        .filter(c => !hiddenControlIds.includes(c.id));

    const toggleControlOption = (controlId: string, value: string) => {
        const cur = controlValues[controlId] || [];
        const displayControls = activeTemplate?.controls ?? standaloneControls;
        const isSingle = displayControls?.find(c => c.id === controlId)?.type === 'single';

        const updated: string[] = isSingle
            ? (cur.includes(value) ? [] : [value])
            : (cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]);

        // Deselecting the last value must REMOVE the key, not leave an empty array:
        // an all-empty map still counts as "has variables" in the generate gate and
        // is persisted onto the job, so a removed variable kept showing up.
        const next = { ...controlValues };
        if (updated.length > 0) next[controlId] = updated;
        else delete next[controlId];

        // Side effect stays OUT of the state updater — updaters must be pure
        // (React may re-invoke them, which double-fired the persist call).
        setControlValues(next);
        persistVariables(activeTemplate?.id, next);
    };

    // ── Reference Image ──
    // Listen for global paste-reference-image events (Cmd+V with image in clipboard on detail page)
    React.useEffect(() => {
        const handler = (e: Event) => {
            const file = (e as CustomEvent<File>).detail;
            if (!file) return;
            // Erstellen-Ansicht: dort gibt es kein ausgewähltes Bild, das Referenzbild
            // geht direkt in die Liste der Referenzen (createReferenceFiles). Vorher
            // stieg der Handler hier aus und der globale Upload-Pfad legte
            // stattdessen ein neues Bild in der Galerie an.
            if (!selectedImage) {
                if (props.onAddReference) props.onAddReference(file);
                return;
            }
            const reader = new FileReader();
            reader.onload = ev => {
                if (typeof ev.target?.result === 'string') {
                    setViewingRefAnn(null);
                    setInspirationInitialSrc(ev.target.result);
                    setIsInspirationOpen(true);
                }
            };
            reader.readAsDataURL(file);
        };
        document.addEventListener('paste-reference-image', handler);
        return () => document.removeEventListener('paste-reference-image', handler);
    });

    const handleInspirationComplete = async (base64: string) => {
        if (!selectedImage) {
            // Create mode — no image yet, delegate to external handler
            if (props.onAddReference) {
                fetch(base64).then(r => r.blob()).then(blob => {
                    const file = new File([blob], 'reference.png', { type: 'image/png' });
                    props.onAddReference!(file);
                });
            }
            setIsInspirationOpen(false);
            return;
        }

        // Compress to max 1024px / 0.8 quality so the payload stays well under
        // Supabase's 6 MB edge-function body limit (raw iPhone photos are 7-13 MB).
        let compressed = base64;
        try {
            const blob = await compressImage(base64, 1024, 0.8);
            compressed = await new Promise<string>((res, rej) => {
                const r = new FileReader();
                r.onload = ev => res(ev.target?.result as string);
                r.onerror = rej;
                r.readAsDataURL(blob);
            });
        } catch { /* fallback to original if compression fails */ }

        const currentAnns = selectedImage.annotations || [];
        if (viewingRefAnn) {
            updateAnnotationsWithHistory(currentAnns.map(a => a.id === viewingRefAnn.id ? { ...a, referenceImage: compressed } : a));
        } else {
            const newRef: AnnotationObject = { id: generateId(), type: 'reference_image', points: [], strokeWidth: 0, color: '#fff', text: '', referenceImage: compressed, createdAt: Date.now() };
            updateAnnotationsWithHistory([...currentAnns, newRef]);
        }
        setViewingRefAnn(null);
        setInspirationInitialSrc(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Tell App.tsx's document-level drop listener to skip this — we're handling it as reference
        (e.nativeEvent as any).__sideSheetHandled = true;
        onGlobalDragLeave();
        setIsSideZoneActive(false);
        if (!selectedImage && !props.onAddReference) return;
        const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            const reader = new FileReader();
            reader.onload = ev => {
                if (typeof ev.target?.result === 'string') {
                    setViewingRefAnn(null);
                    setInspirationInitialSrc(ev.target.result);
                    setIsInspirationOpen(true);
                }
            };
            reader.readAsDataURL(files[0]);
        }
    };

    const handleExitBrushMode = async (forceSave = false) => {
        if (!selectedImage) { onModeChange('prompt'); return; }
        const currentAnns = selectedImage.annotations || [];
        const hasChanges = JSON.stringify(currentAnns) !== JSON.stringify(initialAnns);
        if (hasChanges && !forceSave) {
            const result = await confirm({ title: t('save_annotations'), description: t('save_discard_changes'), confirmLabel: t('save'), cancelLabel: t('discard'), variant: 'primary' });
            if (result === false) onUpdateAnnotations(selectedImage.id, initialAnns);
        }
        onModeChange('prompt');
    };

    // ── Mobile Sheet ──
    const handleSheetTouchStart = (e: React.TouchEvent) => {
        isDragging.current = true;
        dragStartY.current = e.touches[0].clientY;
        dragCurrentY.current = 0;
        if (sheetRef.current) sheetRef.current.style.transition = 'none';
    };

    const handleSheetTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current || !sheetRef.current) return;
        const delta = e.touches[0].clientY - dragStartY.current;
        dragCurrentY.current = delta;
        if (isSheetOpen) {
            sheetRef.current.style.transform = `translateY(${Math.max(0, delta)}px)`;
        } else {
            sheetRef.current.style.transform = `translateY(calc(100% - 10vh - ${-Math.min(0, delta)}px))`;
        }
    };

    const handleSheetTouchEnd = () => {
        if (!isDragging.current || !sheetRef.current) return;
        isDragging.current = false;
        sheetRef.current.style.transition = '';
        sheetRef.current.style.transform = '';
        if (isSheetOpen && dragCurrentY.current > 60) setIsSheetOpen(false);
        else if (!isSheetOpen && dragCurrentY.current < -60) setIsSheetOpen(true);
    };

    // ── Count of active visual annotations ──
    const visibleAnns = annotations.filter(a => ['mask_path', 'stamp', 'shape'].includes(a.type));
    const referenceAnns = annotations.filter(a => a.type === 'reference_image');

    /**
     * Was Anmerkungen und Referenzen BEDEUTEN, steht sichtbar im Prompt.
     *
     * Hintergrund dazu aus der Recherche zu Seedream: Das Markieren im Bild und
     * das Beschreiben der Markierung im Text ist die dokumentierte Technik
     * ("Insert a TV where the red area is marked"). Der Text ist dabei nicht
     * Beiwerk — ohne ihn weiss das Modell nicht, was die roten Striche sollen.
     * Ebenso empfohlen: die Aenderung nennen und danach aufzaehlen, was
     * unveraendert bleiben soll.
     *
     * Beides sind Urteile ueber DIESES Bild und gehoeren deshalb dem Nutzer:
     * ob die Markierung eine harte Grenze ist oder nur ein Hinweis, und was an
     * seinem Foto auf keinen Fall angefasst werden darf, kann niemand fuer ihn
     * entscheiden.
     *
     * Eingesetzt wird einmalig beim ersten Mal und nur, wenn die Zeile nicht
     * schon dasteht. Wer sie loescht, bekommt sie nicht wieder aufgedraengt —
     * sie ist ein Vorschlag, keine Pflicht.
     */
    const annHintRef = useRef<string | null>(null);
    useEffect(() => {
        if (!selectedImage?.id) return;
        const key = `${selectedImage.id}:${visibleAnns.length > 0}:${referenceAnns.length > 0}`;
        if (annHintRef.current === key) return;
        const wasSameImage = annHintRef.current?.startsWith(`${selectedImage.id}:`);
        annHintRef.current = key;
        // Nur reagieren, wenn sich am SELBEN Bild etwas geaendert hat. Beim
        // Blaettern soll nichts von selbst in den Prompt geschrieben werden.
        if (!wasSameImage) return;
        if (visibleAnns.length > 0 && !isValueInPrompt(ANN_LABEL, ANN_DEFAULT)) {
            upsertVariableLine(ANN_LABEL, ANN_DEFAULT, false);
        }
        if (referenceAnns.length > 0 && !isValueInPrompt(REF_LABEL, REF_DEFAULT)) {
            upsertVariableLine(REF_LABEL, REF_DEFAULT, false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedImage?.id, visibleAnns.length, referenceAnns.length]);
    const hasPromptText = !!prompt?.trim();
    const hasCommentAnnotations = visibleAnns.length > 0;

    // ─── PROMPT MODE (Main View) ───────────────────────────────────────────────

    const sheetContent = (
        <>
            <InspirationModal
                isOpen={isInspirationOpen}
                onClose={() => { setIsInspirationOpen(false); setViewingRefAnn(null); setInspirationInitialSrc(null); }}
                onComplete={handleInspirationComplete}
                initialSrc={inspirationInitialSrc ?? undefined}
                t={t}
                lang={lang}
            />
            <GenerationSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                value={previewSettings}
                onChange={handleSettingsChange}
                lang={lang}
            />
            {/* Drop overlay now lives inside the prompt card — see below */}

            <div className="flex flex-col h-full overflow-hidden text-zinc-900 dark:text-zinc-100">
                {/* ── Mobile drag handle ── */}
                {isMobileSheet && (
                    <div
                        className="h-10 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing"
                        style={{ touchAction: 'none' }}
                        onTouchStart={handleSheetTouchStart}
                        onTouchMove={handleSheetTouchMove}
                        onTouchEnd={handleSheetTouchEnd}
                        onClick={() => { if (Math.abs(dragCurrentY.current) <= 10) setIsSheetOpen(p => !p); }}
                    >
                        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                    </div>
                )}

                {/*
                    Im Zeilenmodus zwei Spalten statt einer langen Bahn.

                    Die Spaltenanordnung quer gestreckt ergab ein breites, fast
                    leeres Band: Die Eingabe lief ueber die ganze Breite, die
                    Knoepfe standen an den gegenueberliegenden Bildschirmraendern,
                    und die Vorlagen rutschten darunter aus dem Blick — auf
                    einem grossen Bildschirm musste man scrollen, um etwas zu
                    sehen, wofuer reichlich Platz da war.

                    Jetzt: Eingabe links, Vorlagen rechts, zusammen auf eine
                    lesbare Breite begrenzt und mittig gesetzt. Was an den
                    Seiten frei bleibt, bleibt frei — das ist ruhiger als eine
                    Zeile, die bis in beide Ecken reicht.
                */}
                {/* Der Kopf scrollt nicht mit: Name und Zurueck sind der feste
                    Bezugspunkt der Ansicht, nicht ihr erster Inhalt. */}
                {headerSlot && !isMobileSheet && (
                    <div className="shrink-0 px-5 pt-4">{headerSlot}</div>
                )}

                <div
                    /*
                        Scrollen tut auf dem Desktop das Blatt, auf schmalen
                        Geraeten die Seite.

                        Ein Kasten, der innerhalb einer scrollenden Seite selbst
                        scrollt, ist auf einem Handy kaum zu bedienen: Die Wischgeste
                        trifft mal den einen, mal den anderen, und man weiss nie, was
                        sich gleich bewegt. Deshalb dort overflow-visible und eine
                        Hoehe, die der Inhalt bestimmt.
                    */
                    className={`no-scrollbar px-5 pb-6 ${isMobile ? 'overflow-visible' : 'flex-1 overflow-y-auto'} ${headerSlot && !isMobileSheet ? 'pt-1' : 'pt-6'}`}>
                    {/* Eigene Ebene fuer die Anordnung, damit ihre Hoehe messbar
                        ist: Der Behaelter traegt den Innenabstand, der sich
                        aendert — sich selbst zu messen hiesse, das Ergebnis in
                        die Messung einzurechnen. */}
                    <div
                        // min-h-full, damit "nach unten andocken" einen Boden hat,
                        // gegen den es andocken kann. Auf dem Handy entfaellt das:
                        // Dort gibt es keine feste Hoehe, gegen die angedockt wird,
                        // und die Inhalte folgen einfach aufeinander.
                        className={`flex flex-col gap-5 ${isMobile ? '' : 'min-h-full'}`}
                    >

                    <>
                            {/* ── REFINE Section ── */}
                            <section className="space-y-3">

                                {/* Aus dem System statt eigener Werte:
                                    - RadiusLg (16 px) statt RadiusXl (24 px). Der Token
                                      sagt selbst, wofuer er da ist — "Cards/side-sheets"
                                      gegen "Modals/Overlays". Die Karte ist eine Karte.
                                    - SurfaceSubtle statt zinc-100/80 bzw. zinc-900/80.
                                      Letzteres lag im Dunkelmodus so dicht an der
                                      Hintergrundfarbe zinc-950, dass die Karte kaum
                                      abgesetzt war. */}
                                <div className={`${Theme.Colors.SurfaceSubtle} ${Theme.Geometry.RadiusLg} p-6 space-y-6 transition-all`}>
                                    {/* Prompt Textarea */}
                                    <div className={draftFadeClass}>
                                        <textarea
                                            ref={textareaRef}
                                            data-voice-action="prompt-input"
                                            value={prompt}
                                            onChange={e => handlePromptChange(e.target.value)}
                                            onKeyDown={e => {
                                                // Enter loest aus, Umschalt+Enter macht einen
                                                // Zeilenumbruch — so, wie es Nutzer aus jedem
                                                // Chatfenster kennen.
                                                //
                                                // Waehrend einer laufenden Umwandlung (IME, etwa
                                                // bei japanischer Eingabe) bestaetigt Enter das
                                                // Wort und darf nicht generieren.
                                                if (!enterGenerates) return;
                                                if (e.key !== 'Enter' || e.shiftKey || (e.nativeEvent as any).isComposing) return;
                                                if (e.metaKey || e.ctrlKey) return; // uebernimmt der globale Abgleich
                                                e.preventDefault();
                                                handleGenerate();
                                            }}
                                            placeholder={t('describe_changes') || 'Describe your changes…'}
                                            disabled={selectedImage?.isGenerating}
                                            autoComplete="off"
                                            autoCorrect="off"
                                            autoCapitalize="off"
                                            spellCheck={false}
                                            className={`w-full bg-transparent outline-none ${Typo.Prompt} resize-none no-scrollbar text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600`}
                                        />
                                    </div>

                                    {/* Reference images tray — edit mode */}
                                    {referenceAnns.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {referenceAnns.map(ann => (
                                                <div
                                                    key={ann.id}
                                                    className="group relative w-[88px] h-[88px] rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                                                    onClick={() => { setViewingRefAnn(ann); setInspirationInitialSrc(ann.referenceImage || null); setIsInspirationOpen(true); }}
                                                >
                                                    <img src={ann.referenceImage} className="w-full h-full object-cover" alt="ref" />
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                                                        className="absolute top-1 right-1 w-6 h-6 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Reference images tray — create mode */}
                                    {!selectedImage && props.createReferenceFiles && props.createReferenceFiles.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {props.createReferenceFiles.map((src, idx) => (
                                                <div
                                                    key={idx}
                                                    className="group relative w-[88px] h-[88px] rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                                                >
                                                    <img src={src} className="w-full h-full object-cover" alt="ref" />
                                                    <button
                                                        onClick={() => props.onRemoveCreateReference?.(idx)}
                                                        className="absolute top-1 right-1 w-6 h-6 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/*
                                        Die Anmerkungen: nur noch Chips, keine Ueberschrift.

                                        "Anmerkungen" stand ueber genau einem Chip, der
                                        "Pinselstriche" heisst — die Ueberschrift sagte nichts,
                                        was der Chip nicht selbst sagt. Das Kreuz daneben loeschte
                                        alle auf einmal; geloescht wird aber einzeln, und zwar am
                                        Chip. Beides weg.
                                    */}
                                    {!isMulti && visibleAnns.length > 0 && (
                                        <>
                                            <div className="relative">
                                                <div className="flex flex-wrap gap-2.5">
                                                    {/* Mask strokes — grouped as one chip */}
                                                    {(() => {
                                                        const masks = visibleAnns.filter(a => a.type === 'mask_path');
                                                        if (!masks.length) return null;
                                                        return (
                                                            <button
                                                                key="masks"
                                                                type="button"
                                                                onClick={() => onModeChange('brush')}
                                                                className={ANNOTATION_CHIP}
                                                            >
                                                                <span>{masks.length > 1 ? `${masks.length}× ` : ''}{t('brush_label')}</span>
                                                                <span
                                                                    role="button"
                                                                    onClick={e => { e.stopPropagation(); if (!selectedImage?.annotations) return; updateAnnotationsWithHistory(selectedImage.annotations.filter(a => a.type !== 'mask_path')); }}
                                                                    className={ANNOTATION_CHIP_CLOSE}
                                                                >
                                                                    <X className="w-3.5 h-3.5" strokeWidth={2.25} />
                                                                </span>
                                                            </button>
                                                        );
                                                    })()}
                                                    {/* Shapes & stamps — individual chips */}
                                                    {visibleAnns.filter(a => a.type !== 'mask_path').map(ann => {
                                                        const a = ann as any;
                                                        const label = ann.type === 'shape'
                                                            ? (a.shapeType === 'rect' ? t('shape_rect') : a.shapeType === 'circle' ? t('shape_circle') : t('shape_line'))
                                                            : (a.emoji || a.text || t('stamp_label'));
                                                        return (
                                                            <button
                                                                key={ann.id}
                                                                type="button"
                                                                onClick={() => onModeChange('brush')}
                                                                className={ANNOTATION_CHIP}
                                                            >
                                                                <span>{label}</span>
                                                                <span
                                                                    role="button"
                                                                    onClick={e => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                                                                    className={ANNOTATION_CHIP_CLOSE}
                                                                >
                                                                    <X className="w-3.5 h-3.5" strokeWidth={2.25} />
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Bottom Controls + Generate */}
                                    <div className="!mt-10 flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <Tooltip text={t('add_reference')} side="top">
                                                    <button
                                                        onClick={() => { setViewingRefAnn(null); setInspirationInitialSrc(null); setIsInspirationOpen(true); }}
                                                        disabled={selectedImage?.isGenerating}
                                                        data-voice-action="open-reference-image-picker"
                                                        className={`${PROMPT_ICON_BTN} ${PROMPT_ICON_BTN_IDLE}`}
                                                    >
                                                        <Camera className="w-4 h-4" />
                                                        {/* 16 Pixel waren fuer eine Ziffer mit Fettschrift zu eng,
                                                            die Zahl sass sichtbar ausser Mitte. Jetzt 18, mittig ueber
                                                            grid, und ein Ring in der Hintergrundfarbe, damit das
                                                            Abzeichen sich vom Knopf absetzt statt auf ihm zu kleben. */}
                                                        {(referenceAnns.length + (props.createReferenceFiles?.length ?? 0)) > 0 && (
                                                            <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-orange-500 text-white text-[10px] font-semibold tabular-nums leading-none grid place-items-center ring-2 ring-white dark:ring-zinc-950">
                                                                {referenceAnns.length + (props.createReferenceFiles?.length ?? 0)}
                                                            </span>
                                                        )}
                                                    </button>
                                                </Tooltip>
                                                {!selectedImage?.isGenerating && (
                                                    <ContextTip
                                                        storageKey="expose_tip_reference_image_button_live_v1"
                                                        text={lang === 'de'
                                                            ? 'Lade ein Referenzbild hoch, an dem sich die KI orientieren soll.'
                                                            : 'Upload a reference image the AI can use as guidance.'}
                                                        placement="auto"
                                                        enabled={hasPromptText && referenceAnns.length === 0 && (props.createReferenceFiles?.length ?? 0) === 0}
                                                    />
                                                )}
                                            </div>
                                            <div className="relative">
                                                <Tooltip text={t('tt_annotate')} shortcut="A" side="top">
                                                    <button
                                                        onClick={() => onModeChange(sideSheetMode === 'brush' ? 'prompt' : 'brush')}
                                                        disabled={selectedImage?.isGenerating || isMulti}
                                                        data-voice-action="toggle-annotation-mode"
                                                        className={`${PROMPT_ICON_BTN} ${sideSheetMode === 'brush' ? PROMPT_ICON_BTN_ON : PROMPT_ICON_BTN_IDLE}`}
                                                    >
                                                        <Pen className="w-4 h-4" />
                                                    </button>
                                                </Tooltip>
                                                {!selectedImage?.isGenerating && !isMulti && (
                                                    <ContextTip
                                                        storageKey="expose_tip_annotate_button_live_v1"
                                                        content={
                                                            <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                                                                {lang === 'de' ? 'Mit ' : 'With '}
                                                                <ContextTipChip icon={<Pen className="h-3.5 w-3.5" />} />
                                                                {lang === 'de'
                                                                    ? ' kannst du Anmerkung im Bild machen.'
                                                                    : ' you can make annotations in the image.'}
                                                            </p>
                                                        }
                                                        placement="auto"
                                                        enabled={hasPromptText && !hasCommentAnnotations}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Quality Dropdown + Generate */}
                                        <div className="ml-auto flex items-center gap-3">
                                            {/* Settings — round icon button with Tooltip, same pattern as the reference-image button. */}
                                            <div className="relative shrink-0">
                                                {showModelHint && (
                                                    <ContextTip
                                                        storageKey={MODEL_HINT_KEY}
                                                        content={
                                                            <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                                                                {lang === 'de'
                                                                    ? 'Neu: Seedream 5 Flash — bessere Bilder, günstiger.'
                                                                    : 'New: Seedream 5 Flash — better images, cheaper.'}
                                                            </p>
                                                        }
                                                        placement="auto"
                                                        enabled
                                                        onDismiss={dismissModelHint}
                                                    />
                                                )}
                                                <Tooltip text={lang === 'de' ? 'Bild-Einstellungen' : 'Image settings'} side="top">
                                                    <button
                                                        onClick={() => { dismissModelHint(); setIsSettingsModalOpen(true); }}
                                                        aria-label={lang === 'de' ? 'Bild-Einstellungen' : 'Image settings'}
                                                        className={`${PROMPT_ICON_BTN} ${PROMPT_ICON_BTN_IDLE}`}
                                                    >
                                                        <Settings2 className="w-4 h-4" />
                                                    </button>
                                                </Tooltip>
                                            </div>

                                            {/* Generate Button — collapses progressively as the sidesheet gets narrow */}
                                            {(() => {
                                                const w = width && !width.includes('%') ? parseInt(width) : Infinity;
                                                return w < 320 ? (
                                                    <RoundIconButton
                                                        icon={<Play className="w-[18px] h-[18px]" />}
                                                        onClick={handleGenerate}
                                                        data-voice-action="generate-button"
                                                        variant="primary"
                                                        tooltip={t('generate')}
                                                        tooltipShortcut={generateShortcutLabel}
                                                        tooltipSide="top"
                                                    />
                                                ) : (
                                                    <Button
                                                        onClick={handleGenerate}
                                                        data-voice-action="generate-button"
                                                        variant="generate"
                                                        size="m"
                                                        // Die Button-Komponente hat das schon: <kbd> in
                                                        // Monospace bei 40 % Deckkraft, auf dem Handy
                                                        // ausgeblendet. Kein eigener Stil noetig.
                                                        shortcut={w < 360 ? undefined : generateShortcutLabel}
                                                        className={`${w < 360 ? 'px-3 min-w-[44px]' : 'px-5'} shrink-0`}
                                                    >
                                                        {w < 360 ? (
                                                            <Play className="w-[18px] h-[18px]" />
                                                        ) : (
                                                            t('generate')
                                                        )}
                                                    </Button>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </section>

                                {/*
                                    EINE Gruppe fuer beides: die Vorschlaege zu diesem Bild
                                    und die Vorlagen.

                                    Sie tun dasselbe — ein Klick schreibt eine Zeile in den
                                    Prompt — und sahen seit dem letzten Durchgang auch gleich
                                    aus. Zwei Ueberschriften und zwei Bloecke darueber zu
                                    setzen, hiess denselben Unterschied zweimal zu behaupten.

                                    Sie sitzen unten am Rand des Blattes: Man greift danach,
                                    man liest sie nicht. Der freie Platz sammelt sich darueber,
                                    zwischen dem, was man schreibt, und dem, womit man es tut.
                                */}
                                <div className="pt-1 mt-auto text-zinc-800 dark:text-zinc-200">

                                    {/*
                                        Zu: eine Reihe Chips. Offen: AUS dem Chip wird die
                                        Flaeche.

                                        Vorher standen oben der Chip und darunter eine zweite
                                        Box mit seinem Inhalt — zwei Elemente fuer eine Sache,
                                        und der Zusammenhang musste ueber die Naehe erraten
                                        werden. Jetzt waechst der Chip selbst: dieselbe Farbe,
                                        dieselbe Form, nur gross, und der Inhalt liegt darin.
                                    */}
                                    {/*
                                        Die Vorschlaege bleiben stehen, auch wenn eine Vorlage
                                        offen ist: Sie sind keine Alternative zu ihr, sondern
                                        etwas, das man zusaetzlich einsetzt — Vorlage waehlen,
                                        Werte setzen, und trotzdem noch "Spiegelung entfernen"
                                        antippen. Nur die anderen VORLAGEN treten beiseite;
                                        die sind Alternativen, und eine Reihe davon neben der
                                        geoeffneten waere die Unruhe, die wir gerade loswerden.
                                    */}
                                    {/*
                                        Kein Platzhalter mehr, solange gesucht wird.

                                        Die pulsierenden Attrappen standen da und wackelten,
                                        bevor irgendetwas da war — ein Versprechen, das die
                                        Anwendung gar nicht halten muss, denn kommt nichts,
                                        verschwinden sie wieder. Jetzt ist dort nichts, und
                                        die Chips kommen, wenn sie da sind. Weil die Gruppe
                                        unten angedockt ist, waechst sie dabei nach oben: Die
                                        Vorlagen bleiben, wo sie sind.
                                    */}
                                    {suggestionTarget && imageSuggestions.length > 0 && (
                                        <div className="flex flex-wrap gap-2.5 pb-2.5">
                                            {imageSuggestions.map((sug, i) => {
                                                    const active = isLineInPrompt(sug.line);
                                                    return (
                                                        <Tooltip key={sug.line} text={sug.line} side="top">
                                                            {/*
                                                                Sie kommen nacheinander herein: der
                                                                Unterschied zwischen "war schon immer da"
                                                                und "wurde gerade fuer dieses Bild
                                                                gefunden".
                                                            */}
                                                            <button
                                                                type="button"
                                                                onClick={e => { e.preventDefault(); toggleSuggestionLine(sug.line); }}
                                                                style={{ animation: `chip-in 420ms cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both` }}
                                                                className={`${TEMPLATE_CHIP} ${active ? TEMPLATE_CHIP_OPEN : ''}`}
                                                            >
                                                                {sug.label}
                                                            </button>
                                                        </Tooltip>
                                                    );
                                                })}
                                        </div>
                                    )}

                                    {expandedTemplate ? (
                                        <div
                                            style={{ animation: 'panel-grow 260ms cubic-bezier(0.16,1,0.3,1) both' }}
                                            className="rounded-[22px] p-4 bg-orange-500/[0.11] dark:bg-orange-500/[0.12] origin-bottom"
                                        >
                                            {/* Die Kopfzeile IST der Chip: gleiche Schrift,
                                                gleiches Lesezeichen, nur ohne eigene Flaeche —
                                                die Flaeche ist jetzt das ganze Feld. */}
                                            <div className="flex items-center gap-2 px-1.5 pb-1 text-[14px] font-medium text-orange-950 dark:text-orange-50">
                                                {expandedTemplate.emoji
                                                    ? <span className="text-sm">{expandedTemplate.emoji}</span>
                                                    : expandedTemplate.isCustom && <Bookmark className="w-3 h-3 shrink-0 opacity-60" fill="currentColor" strokeWidth={0} />}
                                                <span className="truncate">{expandedTemplate.title}</span>
                                                <div className="flex-1" />
                                                <button
                                                    type="button"
                                                    aria-label={t('close') || 'Schließen'}
                                                    onClick={() => setExpandedTemplateId(null)}
                                                    /*
                                                        Ohne eigene Flaeche im Ruhezustand: In der Kopfzeile
                                                        steht links das Lesezeichen und der Name, rechts
                                                        soll nur ein Zeichen stehen, kein zweiter Knopf. Die
                                                        Farbe ist die der Ueberschrift, nur zurueckgenommen —
                                                        ein grauer Kreis auf Orange sah aus wie ein Loch,
                                                        ein oranger wie ein zweites Abzeichen.
                                                    */
                                                    className="w-8 h-8 -mr-0.5 rounded-full grid place-items-center
                                                        text-orange-950/55 dark:text-orange-50/55
                                                        hover:bg-orange-950/[0.10] dark:hover:bg-black/30
                                                        hover:text-orange-950 dark:hover:text-orange-50 transition-colors"
                                                >
                                                    <X className="w-4 h-4" strokeWidth={2.25} />
                                                </button>
                                            </div>

                                            <div
                                                style={{ animation: 'panel-content-in 260ms cubic-bezier(0.16,1,0.3,1) 80ms both' }}
                                                className="pt-3 space-y-5"
                                            >
                                                {expandedControls.map(ctrl => {
                                                    const ctrlLabel = labelOverrides[ctrl.id] || ctrl.label;
                                                    const multi = ctrl.type !== 'single';
                                                    return (
                                                        <div key={ctrl.id} className="space-y-2">
                                                            <div className="px-1.5 text-[12px] font-medium text-orange-950/50 dark:text-orange-50/50">
                                                                {ctrlLabel}
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {ctrl.options.map(opt => {
                                                                    const active = isValueInPrompt(ctrlLabel, opt.value);
                                                                    return (
                                                                        <button
                                                                            key={opt.id}
                                                                            type="button"
                                                                            onClick={e => { e.preventDefault(); upsertVariableLine(ctrlLabel, opt.value, multi); }}
                                                                            /*
                                                                                Ruhend in der Farbe des Blattes — auf der
                                                                                orangen Flaeche liegen sie dadurch wie
                                                                                Karten darauf, statt sich in ihr zu
                                                                                verlieren. Halbdurchsichtiges Weiss war
                                                                                beides nicht richtig: zu schwach gegen
                                                                                die Flaeche, zu schwach fuer die Schrift.

                                                                                Gewaehlt ist kein zweites Weiss, sondern
                                                                                die Flaeche selbst, nur kraeftiger.
                                                                            */
                                                                            className={`${VALUE_CHIP_BASE} ${active
                                                                                ? 'bg-orange-950/[0.14] dark:bg-white/[0.20] text-orange-950 dark:text-white'
                                                                                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'}`}
                                                                        >
                                                                            {opt.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2.5">
                                            {/* Die Vorlagen in derselben Reihe: gleiche Form,
                                                gleiche Farbe, das Lesezeichen als einziger
                                                Unterschied — es sagt "die hier hast du selbst
                                                angelegt". */}
                                            {displayTemplates.map((tpl) => (
                                                <button
                                                    key={tpl.id}
                                                    onClick={() => handleSelectTemplate(tpl)}
                                                    className={TEMPLATE_CHIP}
                                                >
                                                    {tpl.emoji
                                                        ? <span className="text-sm">{tpl.emoji}</span>
                                                        : tpl.isCustom && <Bookmark className="w-3 h-3 shrink-0 opacity-60" fill="currentColor" strokeWidth={0} />}
                                                    <span>{tpl.title}</span>
                                                </button>
                                            ))}

                                            {displayTemplates.length === 0 ? (
                                                <button
                                                    onClick={() => { setEditingTemplate(null); setIsPresetModalOpen(true); }}
                                                    className={`${TEMPLATE_CHIP} text-zinc-500 dark:text-zinc-400`}
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    {t('new_preset') || 'Neue Vorlage'}
                                                </button>
                                            ) : (
                                                <div className="relative inline-flex shrink-0">
                                                    <Tooltip text={t('edit_presets')} side="top">
                                                        <button
                                                            onClick={() => { setEditingTemplate(null); setIsPresetModalOpen(true); }}
                                                            data-voice-action="open-presets-manager"
                                                            aria-label={t('edit_presets')}
                                                            className={`${TEMPLATE_CHIP} text-zinc-500 dark:text-zinc-400`}
                                                        >
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
                                                    </Tooltip>
                                                    <ContextTip
                                                        storageKey="expose_tip_presets_manage_v1"
                                                        text={lang === 'de'
                                                            ? 'Hier kannst du Prompt-Vorlagen erstellen und bearbeiten.'
                                                            : 'Manage your presets here so you can reuse them later.'}
                                                        placement="auto"
                                                        enabled={hasPromptText}
                                                        anchorClassName="absolute inset-0 pointer-events-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                    </>
                    </div>
                </div>
            </div>
        </>
    );

    // ── Mobile Bottom Sheet Wrapper ──
    if (isMobileSheet) {
        return (
            <>
                <div className="lg:hidden fixed inset-0 z-[100] pointer-events-none">
                    <div
                        ref={sheetRef}
                        className={`absolute bottom-0 left-0 right-0 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-900 rounded-t-[28px] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-auto ${Theme.Effects.ShadowLg} ${isSheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-10vh)]'}`}
                        style={{ maxHeight: '90vh', overflow: 'hidden', paddingBottom: 'env(safe-area-inset-bottom)' }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        {sheetContent}
                    </div>
                </div>
                <ManagePresetsModal
                    isOpen={isPresetModalOpen}
                    onClose={() => setIsPresetModalOpen(false)}
                    currentLang={lang}
                    initialTemplateId={editingTemplate ? editingTemplate.id : null}
                    templates={templates || []}
                    onSave={onSaveTemplate}
                    onDelete={onDeleteTemplate}
                    t={t as any}
                />
            </>
        );
    }

    // ── Desktop ──
    return (
        <>
            <div
                className={`relative flex flex-col bg-white dark:bg-zinc-950 ${props.disableMobileSheet ? '' : 'h-full overflow-hidden'}`}
                style={{ width }}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onContextMenu={e => e.stopPropagation()}
            >
                {sheetContent}
            </div>
            {/* Modals */}
            <ManagePresetsModal
                isOpen={isPresetModalOpen}
                onClose={() => setIsPresetModalOpen(false)}
                currentLang={lang}
                initialTemplateId={editingTemplate ? editingTemplate.id : null}
                templates={templates || []}
                onSave={onSaveTemplate}
                onDelete={onDeleteTemplate}
                t={t as any}
            />
        </>
    );
});

SideSheet.displayName = 'SideSheet';
