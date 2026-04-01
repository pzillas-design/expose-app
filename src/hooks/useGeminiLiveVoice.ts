import { GoogleGenAI, Modality, Type, type FunctionCall, type FunctionDeclaration, type LiveServerMessage } from '@google/genai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import type { VoiceUiState } from '@/components/voice/VoiceModeIndicator';
import type { VoiceAdminConfig, VoiceToolCallLog, VoiceTranscriptLog } from '@/types';

type VoiceAppRoute = 'grid' | 'detail' | 'create' | 'other';

export interface VoiceAppContext {
    viewLevel: 'gallery' | 'stack' | 'detail' | 'create' | 'other';
    gridColumns?: number;
    currentImageTitle?: string;
    images?: Array<{ index: number; title?: string }>;
}

export interface VoiceVisualFrame {
    id: string;
    src: string;
    mimeType?: string;
    label?: string;
}

export interface VoiceVisualContext {
    summary: string;
    frames: VoiceVisualFrame[];
    contextKey: string;
}

interface VoiceActionResult {
    ok: boolean;
    message: string;
}

interface VoiceCommandHandlers {
    getAppContext: () => VoiceAppContext;
    getVisualContext: () => VoiceVisualContext | null;
    openGallery: () => Promise<VoiceActionResult> | VoiceActionResult;
    openCreate: () => Promise<VoiceActionResult> | VoiceActionResult;
    openCreateNew: () => Promise<VoiceActionResult> | VoiceActionResult;
    openUpload: () => Promise<VoiceActionResult> | VoiceActionResult;
    openSettings: () => Promise<VoiceActionResult> | VoiceActionResult;
    repeatCurrentImage: () => Promise<VoiceActionResult> | VoiceActionResult;
    openPresets: () => Promise<VoiceActionResult> | VoiceActionResult;
    openReferenceImagePicker: () => Promise<VoiceActionResult> | VoiceActionResult;
    downloadCurrentImage: () => Promise<VoiceActionResult> | VoiceActionResult;
    startAnnotationMode: () => Promise<VoiceActionResult> | VoiceActionResult;
    setPromptText: (text: string) => Promise<VoiceActionResult> | VoiceActionResult;
    triggerGeneration: () => Promise<VoiceActionResult> | VoiceActionResult;
    nextImage: () => Promise<VoiceActionResult> | VoiceActionResult;
    previousImage: () => Promise<VoiceActionResult> | VoiceActionResult;
    goBack: () => Promise<VoiceActionResult> | VoiceActionResult;
    stopVoiceMode: () => void;
    setAspectRatio: (ratio: string) => Promise<VoiceActionResult> | VoiceActionResult;
    openStack: () => Promise<VoiceActionResult> | VoiceActionResult;
    createVariables: (controls: Array<{ label: string; options: string[] }>) => Promise<VoiceActionResult> | VoiceActionResult;
    selectVariableOption: (label: string, option: string) => Promise<VoiceActionResult> | VoiceActionResult;
    setQuality: (quality: string) => Promise<VoiceActionResult> | VoiceActionResult;
    selectImageByIndex: (index: number) => Promise<VoiceActionResult> | VoiceActionResult;
    selectImageByPosition: (row: number, column: number) => Promise<VoiceActionResult> | VoiceActionResult;
    applyPreset: (title: string) => Promise<VoiceActionResult> | VoiceActionResult;
}

interface UseGeminiLiveVoiceOptions extends VoiceCommandHandlers {
    enabled: boolean;
    lang: string;
    config: VoiceAdminConfig;
    onSessionConfig?: (details: { model: string; voiceName: string }) => void;
    onAppContextChange?: (summary: string) => void;
    onVisualContextChange?: (summary: string, frameCount: number) => void;
    onToolCall?: (entry: VoiceToolCallLog) => void;
    onTranscript?: (entry: VoiceTranscriptLog) => void;
}

interface TokenResponse {
    token: string;
    model: string;
    expiresAt: string;
}

interface UseGeminiLiveVoiceResult {
    isAvailable: boolean;
    state: VoiceUiState;
    isActive: boolean;
    level: number;
    error: string | null;
    start: () => Promise<void>;
    stop: () => void;
}

const toolDeclarations: FunctionDeclaration[] = [
    {
        name: 'get_app_context',
        description: 'Read current screen state: view level, image list, and available presets (in detail/create view). Call this to understand context before suggesting edits. In detail view, the response includes preset titles and tags — suggest a fitting preset when it matches the image.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'open_create_new',
        description: 'Öffnet die Erstellen-Ansicht, um ein ganz neues Bild zu erstellen.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'open_settings',
        description: 'Open the settings dialog.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'repeat_current_image',
        description: 'Generate more variations from the currently open image.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'download_current_image',
        description: 'Download the currently viewed image. Opens a download dialog so the user can save it.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'open_presets',
        description: 'Open prompt presets inside the current editing panel.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'open_reference_image_picker',
        description: 'Open the reference image picker in the current editing panel.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'start_annotation_mode',
        description: 'Activate image annotation mode in the current editing panel.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'open_upload',
        description: 'Open the file upload dialog so the user can upload a BRAND NEW image from their device. Use ONLY when the user explicitly says "upload", "import", or wants to add a new file from their device. NEVER use this when the user wants to edit an existing image already in the gallery — instead ask which image they mean.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'set_prompt_text',
        description: 'Write a prompt for image generation or editing. Write in the user\'s language. For edits: describe ONLY the desired change, never the current state. Keep prompts short and professional.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                text: {
                    type: Type.STRING,
                    description: 'The prompt text to write into the input field'
                }
            },
            required: ['text']
        }
    },
    {
        name: 'trigger_generation',
        description: 'PROTECTED: Start image generation. ONLY call this when the user explicitly says "generiere", "generate", "los", "start generation" or similar direct command. NEVER call this automatically after writing a prompt — always present the prompt first and wait for the user to confirm or ask to generate.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'next_image',
        description: 'Navigate to the next image in the current stack or gallery.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'previous_image',
        description: 'Navigate to the previous image in the current stack or gallery.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'go_back',
        description: 'Go back to the previous view. From detail: goes to stack (if image has versions) or gallery. From stack: goes to gallery. From create: goes to gallery.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'stop_voice_mode',
        description: 'End the voice assistant session and stop listening.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'set_aspect_ratio',
        description: 'Set the aspect ratio for a new image on the create page. Available ratios: 16:9, 4:3, 1:1, 3:4, 9:16.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                ratio: {
                    type: Type.STRING,
                    description: 'The aspect ratio to select, e.g. "16:9", "4:3", "1:1", "3:4", "9:16"'
                }
            },
            required: ['ratio']
        }
    },
    {
        name: 'create_variables',
        description: 'Create variable controls so the user can explore creative directions. Call this proactively with every edit suggestion — 2-4 variables with 3-4 options each. Existing selections are preserved when a label stays the same. When the user describes something that fits no existing option, call create_variables again with updated options that match their request — the app merges selections automatically.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                controls: {
                    type: Type.ARRAY,
                    description: 'Array of variable controls to create',
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            label: { type: Type.STRING, description: 'Variable label, e.g. "Farbe" or "Stil"' },
                            options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Option values, e.g. ["Rot", "Blau", "Gold"]' }
                        },
                        required: ['label', 'options']
                    }
                }
            },
            required: ['controls']
        }
    },
    {
        name: 'select_variable_option',
        description: 'Toggle an existing variable option on or off. Only use this for options that already exist and match what the user wants. When the user describes something new that has no matching option, call create_variables instead to add it.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                label: { type: Type.STRING, description: 'The variable label to target, e.g. "Farbe"' },
                option: { type: Type.STRING, description: 'The option value to toggle, e.g. "Rot"' }
            },
            required: ['label', 'option']
        }
    },
    {
        name: 'set_quality',
        description: 'Set the generation quality/resolution. Available: "0.5k" (512px, fastest, 0.05€), "1k" (1024px, fast, 0.10€), "2k" (2048px, fast, 0.20€), "4k" (4096px, fast, 0.40€).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                quality: { type: Type.STRING, description: 'Quality level: "0.5k", "1k", "2k", or "4k"' }
            },
            required: ['quality']
        }
    },
    {
        name: 'select_image',
        description: 'Open an image in the current gallery or stack. Use EITHER index (flat number, e.g. 5th image) OR row+column (grid position). Both are 1-based.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                index: { type: Type.NUMBER, description: 'Flat 1-based index of the image, e.g. 5' },
                row: { type: Type.NUMBER, description: 'Grid row (1-based). Use with column.' },
                column: { type: Type.NUMBER, description: 'Grid column (1-based). Use with row.' }
            }
        }
    },
    {
        name: 'apply_preset',
        description: 'Apply a preset/template by its title. Sets the prompt and variables from the preset. Use when a preset from the context matches the image well. The user can then adjust variables before generating.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: 'The exact title of the preset to apply, as shown in the context' }
            },
            required: ['title']
        }
    },
];

// --- Sound effects ---

/** Pre-load UI sound effects (lazy singletons) */
const soundCache: Record<string, HTMLAudioElement> = {};
export function playVoiceSound(name: 'voice-start' | 'voice-end') {
    playSound(name);
}
function playSound(name: 'voice-start' | 'voice-end') {
    try {
        if (!soundCache[name]) {
            soundCache[name] = new Audio(`/sounds/${name}.mp3`);
            soundCache[name].volume = 0.85;
        }
        soundCache[name].currentTime = 0;
        void soundCache[name].play();
    } catch { /* ignore if autoplay blocked */ }
}

// --- Audio helpers ---

const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

/** Encode Float32 mic samples to base64 PCM16 for the Live API. */
function encodePcm16(samples: Float32Array): { data: string; mimeType: string } {
    const buffer = new ArrayBuffer(samples.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < samples.length; i += 1) {
        const sample = clamp(samples[i], -1, 1);
        view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return { data: btoa(binary), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` };
}

/** Decode base64 PCM16 (24 kHz) into Float32Array for AudioContext playback. */
function decodePcm16(base64: string): Float32Array {
    const binary = atob(base64);
    const numSamples = binary.length / 2;
    const float32 = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
        const lo = binary.charCodeAt(i * 2);
        const hi = binary.charCodeAt(i * 2 + 1);
        const int16 = (hi << 8) | lo;
        float32[i] = int16 >= 0x8000 ? (int16 - 0x10000) / 0x8000 : int16 / 0x7fff;
    }
    return float32;
}

async function fetchVoiceToken(modelOverride?: string) {
    // Get current Supabase session token for auth
    const { supabase } = await import('@/services/supabaseClient');
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch('/api/gemini-live-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify(modelOverride ? { model: modelOverride } : {}),
            signal: controller.signal,
        });
        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || 'Unable to create voice session');
        }
        return response.json() as Promise<TokenResponse>;
    } finally {
        window.clearTimeout(timeout);
    }
}

async function blobToBase64(blob: Blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

async function fetchFramePayload(frame: VoiceVisualFrame) {
    const response = await fetch(frame.src);
    if (!response.ok) {
        throw new Error(`Failed to load visual context frame: ${frame.id}`);
    }
    const blob = await response.blob();
    return {
        data: await blobToBase64(blob),
        mimeType: frame.mimeType || blob.type || 'image/jpeg'
    };
}

// --- Hook ---

export function useGeminiLiveVoice({
    enabled,
    lang,
    config,
    getAppContext,
    getVisualContext,
    openGallery,
    openCreate,
    openCreateNew,
    openUpload,
    openSettings,
    repeatCurrentImage,
    openPresets,
    openReferenceImagePicker,
    downloadCurrentImage,
    startAnnotationMode,
    setPromptText,
    triggerGeneration,
    nextImage,
    previousImage,
    goBack,
    stopVoiceMode,
    setAspectRatio,
    openStack,
    createVariables,
    selectVariableOption,
    setQuality,
    selectImageByIndex,
    selectImageByPosition,
    applyPreset,
    onSessionConfig,
    onAppContextChange,
    onVisualContextChange,
    onToolCall,
    onTranscript
}: UseGeminiLiveVoiceOptions): UseGeminiLiveVoiceResult {
    const { showToast } = useToast();
    const [state, setState] = useState<VoiceUiState>('off');
    const [level, setLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Current session ID — set when a new session starts
    const sessionIdRef = useRef<string>('');

    // Transcript buffers — Gemini sends tokens one by one; we accumulate and
    // flush as a single message so the UI shows one bubble per turn, not one
    // bubble per token.
    const outputBufRef = useRef<{ text: string; ts: number } | null>(null);
    const inputBufRef  = useRef<{ text: string; ts: number } | null>(null);

    // Always-fresh ref to handleLiveMessage — onmessage captures this ref at connect()
    // time but always calls the CURRENT handleLiveMessage, so handler props that
    // change after navigation (previousImage, getAppContext, etc.) are never stale.
    const handleLiveMessageRef = useRef<((msg: LiveServerMessage) => Promise<void>) | null>(null);

    // Always-fresh ref to getAppContext — used in the visual sync debounce effect
    // to read the current viewLevel without adding getAppContext as a dep.
    const getAppContextRef = useRef(getAppContext);
    useEffect(() => { getAppContextRef.current = getAppContext; });

    // Ref mirror of state — avoids stale closures in async callbacks
    const stateRef = useRef<VoiceUiState>('off');
    const setVoiceState = useCallback((next: VoiceUiState | ((prev: VoiceUiState) => VoiceUiState)) => {
        setState(prev => {
            const resolved = typeof next === 'function' ? next(prev) : next;
            stateRef.current = resolved;
            return resolved;
        });
    }, []);

    const sessionRef = useRef<any>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const micAudioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
    const sinkGainNodeRef = useRef<GainNode | null>(null);

    // Playback: separate AudioContext at 24 kHz for model audio output
    const playbackCtxRef = useRef<AudioContext | null>(null);
    const playbackQueueRef = useRef<Float32Array[]>([]);
    const playbackScheduledUntilRef = useRef(0);
    const playbackDrainTimerRef = useRef<number | null>(null);

    const speakingRef = useRef(false);
    const greetingTimeoutRef = useRef<number | null>(null);
    const lastVisualContextKeyRef = useRef<string | null>(null);
    const lastRequestTimeRef = useRef<number>(0);
    const firstAudioReceivedRef = useRef<boolean>(false);

    const isAvailable = enabled && config.enabled && typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
    const enabledToolNames = useMemo(() => new Set(config.tools.filter(tool => tool.enabled).map(tool => tool.name)), [config.tools]);
    const activeToolDeclarations = useMemo(
        () => toolDeclarations
            .filter(tool => enabledToolNames.has(tool.name || ''))
            .map(tool => {
                const override = config.tools.find(t => t.name === tool.name)?.description;
                return override ? { ...tool, description: override } : tool;
            }),
        [enabledToolNames, config.tools]
    );

    // --- Native audio playback ---

    const ensurePlaybackCtx = useCallback(() => {
        if (!playbackCtxRef.current || playbackCtxRef.current.state === 'closed') {
            playbackCtxRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
        }
        if (playbackCtxRef.current.state === 'suspended') {
            void playbackCtxRef.current.resume();
        }
        return playbackCtxRef.current;
    }, []);

    const drainPlaybackQueue = useCallback(() => {
        const ctx = playbackCtxRef.current;
        if (!ctx || ctx.state === 'closed') return;

        const queue = playbackQueueRef.current;
        if (queue.length === 0) return;

        // Schedule all queued chunks back-to-back with a tiny safety buffer (30ms)
        // to prevent clicking/pops if the network jitter is high.
        const now = ctx.currentTime;
        let startAt = Math.max(playbackScheduledUntilRef.current, now + 0.03);

        while (queue.length > 0) {
            const samples = queue.shift()!;
            const buffer = ctx.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
            buffer.copyToChannel(samples, 0);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(startAt);
            startAt += buffer.duration;
        }

        playbackScheduledUntilRef.current = startAt;

        // Transition to 'listening' when playback finishes
        const remaining = startAt - ctx.currentTime;
        if (playbackDrainTimerRef.current) window.clearTimeout(playbackDrainTimerRef.current);
        playbackDrainTimerRef.current = window.setTimeout(() => {
            if (speakingRef.current) {
                speakingRef.current = false;
                setLevel(0);
                setState(prev => (prev === 'speaking' ? 'listening' : prev));
            }
        }, remaining * 1000 + 80);
    }, []);

    const enqueueAudio = useCallback((base64Pcm: string) => {
        console.debug('[voice] audio chunk received, length:', base64Pcm.length);
        ensurePlaybackCtx();
        const samples = decodePcm16(base64Pcm);
        playbackQueueRef.current.push(samples);
        speakingRef.current = true;
        // Clear greeting timeout on first audio response
        if (greetingTimeoutRef.current) {
            window.clearTimeout(greetingTimeoutRef.current);
            greetingTimeoutRef.current = null;
        }
        setState('speaking');
        drainPlaybackQueue();
    }, [drainPlaybackQueue, ensurePlaybackCtx]);

    /** Immediately stop all scheduled playback (barge-in). */
    const cancelPlayback = useCallback(() => {
        if (playbackDrainTimerRef.current) {
            window.clearTimeout(playbackDrainTimerRef.current);
            playbackDrainTimerRef.current = null;
        }
        playbackQueueRef.current = [];
        playbackScheduledUntilRef.current = 0;
        // Close and recreate context to cancel all scheduled sources
        if (playbackCtxRef.current && playbackCtxRef.current.state !== 'closed') {
            void playbackCtxRef.current.close();
        }
        playbackCtxRef.current = null;
        speakingRef.current = false;
    }, []);

    // --- Lifecycle ---

    const stop = useCallback(() => {
        if (greetingTimeoutRef.current) {
            window.clearTimeout(greetingTimeoutRef.current);
            greetingTimeoutRef.current = null;
        }

        // Play end sound only if we were actually active
        if (stateRef.current !== 'off') playSound('voice-end');

        sessionRef.current?.close?.();
        sessionRef.current = null;

        if (processorNodeRef.current) {
            processorNodeRef.current.disconnect();
            processorNodeRef.current.onaudioprocess = null;
            processorNodeRef.current = null;
        }
        sourceNodeRef.current?.disconnect();
        sourceNodeRef.current = null;
        sinkGainNodeRef.current?.disconnect();
        sinkGainNodeRef.current = null;

        micStreamRef.current?.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;

        if (micAudioContextRef.current) {
            void micAudioContextRef.current.close();
            micAudioContextRef.current = null;
        }

        cancelPlayback();
        lastVisualContextKeyRef.current = null;
        setLevel(0);
        setError(null);
        setState('off');
    }, [cancelPlayback]);

    useEffect(() => stop, [stop]);

    // --- Visual context ---

    const syncVisualContext = useCallback(async () => {
        if (!sessionRef.current) return;
        if (!config.visualContextEnabled) return;

        const visualContext = getVisualContext();
        if (!visualContext || visualContext.contextKey === lastVisualContextKeyRef.current) return;
        lastVisualContextKeyRef.current = visualContext.contextKey;
        onVisualContextChange?.(visualContext.summary, visualContext.frames.length);

        try {
            sessionRef.current.sendRealtimeInput({ text: visualContext.summary });

            for (const frame of visualContext.frames.slice(0, 4)) {
                const payload = await fetchFramePayload(frame);
                sessionRef.current.sendRealtimeInput({ video: payload });
            }

            // Log which image was visually sent — visible in Live Monitor for debugging
            onToolCall?.({
                id: `visual-sync-${Date.now()}`,
                sessionId: sessionIdRef.current,
                name: '📷 visual_context_synced',
                status: 'ok',
                argsSummary: visualContext.frames.map(f => `${f.id} (${f.label})`).join(', '),
                message: visualContext.summary,
                timestamp: Date.now(),
            });
        } catch (syncError) {
            console.error('[voice] visual context sync failed', syncError);
            onToolCall?.({
                id: `visual-sync-err-${Date.now()}`,
                sessionId: sessionIdRef.current,
                name: '📷 visual_context_synced',
                status: 'error',
                argsSummary: visualContext.frames.map(f => f.id).join(', '),
                message: String(syncError),
                timestamp: Date.now(),
            });
        }
    }, [config.visualContextEnabled, getVisualContext, onToolCall, onVisualContextChange]);

    // --- Tool execution ---

    const executeToolCall = useCallback(async (call: FunctionCall) => {
        const name = call.name || '';
        const args = (call.args || {}) as Record<string, unknown>;
        const argsSummary = (() => {
            try {
                return JSON.stringify(args);
            } catch {
                return '{}';
            }
        })();

        // Sanitize helpers
        const str = (key: string, fallback = ''): string => {
            const v = args[key];
            return typeof v === 'string' ? v.slice(0, 2000) : fallback;
        };
        const num = (key: string, fallback = 1): number => {
            const v = args[key];
            return typeof v === 'number' && Number.isFinite(v) ? Math.max(1, Math.round(v)) : fallback;
        };

        const result = (() => {
            switch (name) {
                case 'get_app_context':
                    return { ok: true, message: 'Fetched current app context.', context: getAppContext() };
                case 'open_gallery': return goBack();
                case 'open_create_new':
                case 'open_create': return openCreate();
                case 'open_settings': return openSettings();
                case 'repeat_current_image': return repeatCurrentImage();
                case 'download_current_image': return downloadCurrentImage();
                case 'open_presets': return openPresets();
                case 'open_reference_image_picker': return openReferenceImagePicker();
                case 'start_annotation_mode': return startAnnotationMode();
                case 'open_upload': return openUpload();
                case 'set_prompt_text': return setPromptText(str('text'));
                case 'trigger_generation': return triggerGeneration();
                case 'next_image': return nextImage();
                case 'previous_image': return previousImage();
                case 'go_back': return goBack();
                case 'stop_voice_mode':
                    setTimeout(() => stop(), 50);
                    return { ok: true, message: 'Voice mode ended.' };
                case 'set_aspect_ratio': {
                    const ratio = str('ratio', '4:3');
                    const allowed = ['16:9', '4:3', '1:1', '3:4', '9:16'];
                    return allowed.includes(ratio) ? setAspectRatio(ratio) : { ok: false, message: `Invalid ratio: ${ratio}. Allowed: ${allowed.join(', ')}` };
                }
                case 'open_stack': return goBack(); // consolidated into go_back
                case 'create_variables': {
                    const controls = Array.isArray(args.controls) ? args.controls as Array<{ label: string; options: string[] }> : [];
                    return controls.length > 0 ? createVariables(controls) : { ok: false, message: 'No controls provided.' };
                }
                case 'select_variable_option':
                    return selectVariableOption(str('label'), str('option'));
                case 'set_quality': return setQuality(str('quality', '2k'));
                case 'select_image':
                case 'select_image_by_index':
                case 'select_image_by_position': {
                    // Unified: accept index OR row+column
                    const rowVal = args.row as number | undefined;
                    const colVal = args.column as number | undefined;
                    if (typeof rowVal === 'number' && typeof colVal === 'number') {
                        return selectImageByPosition(Math.max(1, Math.round(rowVal)), Math.max(1, Math.round(colVal)));
                    }
                    return selectImageByIndex(num('index'));
                }
                case 'apply_preset': return applyPreset(str('title'));
                default: return { ok: false, message: `Unknown tool: ${name}` };
            }
        })();

        const awaitedResult = await Promise.resolve(result);
        onToolCall?.({
            id: call.id || `${name}-${Date.now()}`,
            sessionId: sessionIdRef.current,
            name,
            status: awaitedResult.ok ? 'ok' : 'error',
            argsSummary,
            message: awaitedResult.message,
            timestamp: Date.now(),
        });

        return {
            id: call.id,
            name,
            response: awaitedResult.ok
                ? { output: awaitedResult }
                : { error: awaitedResult.message }
        };
    }, [
        createVariables, downloadCurrentImage, getAppContext, goBack,
        nextImage, openCreate, openCreateNew, openGallery,
        openPresets, openReferenceImagePicker, openSettings, openStack, openUpload,
        previousImage, repeatCurrentImage, selectVariableOption, setAspectRatio,
        setPromptText, setQuality, startAnnotationMode,
        stopVoiceMode, triggerGeneration, selectImageByIndex, selectImageByPosition,
        applyPreset, onToolCall
    ]);

    // --- Message handling ---

    const handleLiveMessage = useCallback(async (message: LiveServerMessage) => {
        console.debug('[voice] message:', JSON.stringify({
            hasToolCall: !!message.toolCall?.functionCalls?.length,
            hasModelTurn: !!message.serverContent?.modelTurn?.parts?.length,
            interrupted: !!message.serverContent?.interrupted,
            turnComplete: !!message.serverContent?.turnComplete,
            generationComplete: !!message.serverContent?.generationComplete,
            hasOutputTranscription: !!message.serverContent?.outputTranscription?.text,
            hasInputTranscription: !!message.serverContent?.inputTranscription?.text,
            text: message.serverContent?.modelTurn?.parts?.map((p: any) => p.text).filter(Boolean).join(' ').slice(0, 50),
        }));

        // ── Flush helpers ────────────────────────────────────────────────────
        // Emit buffered input transcript as one message (called when model starts responding)
        const flushInput = () => {
            if (!inputBufRef.current) return;
            const { text, ts } = inputBufRef.current;
            inputBufRef.current = null;
            if (text.trim()) {
                onTranscript?.({
                    id: `user-${ts}-${Math.random().toString(36).slice(2, 7)}`,
                    sessionId: sessionIdRef.current,
                    source: 'user',
                    text: text.trim(),
                    timestamp: ts,
                });
            }
        };

        // Emit buffered output transcript as one message (called on turnComplete)
        const flushOutput = () => {
            if (!outputBufRef.current) return;
            const { text, ts } = outputBufRef.current;
            outputBufRef.current = null;
            if (text.trim()) {
                onTranscript?.({
                    id: `assistant-${ts}-${Math.random().toString(36).slice(2, 7)}`,
                    sessionId: sessionIdRef.current,
                    source: 'assistant',
                    text: text.trim(),
                    timestamp: ts,
                });
            }
        };

        // Latency tracking: If this is the first server part after a user input
        if (message.serverContent?.modelTurn && !firstAudioReceivedRef.current) {
            const latency = performance.now() - lastRequestTimeRef.current;
            console.log(`[voice] First response latency: ${Math.round(latency)}ms`);
            firstAudioReceivedRef.current = true;
            // Model is now responding — flush whatever user said
            flushInput();
        }

        // Tool calls — flush user input first, then handle
        if (message.toolCall?.functionCalls?.length) {
            flushInput();
            setState('thinking');
            const functionResponses = await Promise.all(message.toolCall.functionCalls.map(executeToolCall));
            sessionRef.current?.sendToolResponse({ functionResponses });
            return;
        }

        // Barge-in: model was interrupted by user speech
        if (message.serverContent?.interrupted) {
            flushOutput();
            cancelPlayback();
            setState('listening');
            return;
        }

        // Native audio data from model
        const parts = message.serverContent?.modelTurn?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData?.data) {
                    enqueueAudio(part.inlineData.data);
                } else if (part.text) {
                    // Model thought/chain-of-thought text — log but don't surface as transcript
                    console.log(`[voice] Model thought: ${part.text}`);
                }
            }
        }

        // User speech transcription — accumulate tokens into one buffer
        if (message.serverContent?.inputTranscription?.text) {
            const token = message.serverContent.inputTranscription.text;
            if (inputBufRef.current) {
                inputBufRef.current.text += token;
            } else {
                inputBufRef.current = { text: token, ts: Date.now() };
            }
        }

        // Model speech transcription — accumulate tokens into one buffer
        if (message.serverContent?.outputTranscription?.text) {
            const token = message.serverContent.outputTranscription.text;
            if (outputBufRef.current) {
                outputBufRef.current.text += token;
            } else {
                outputBufRef.current = { text: token, ts: Date.now() };
            }
        }

        // Turn complete — flush the accumulated output transcript as one message
        if (message.serverContent?.turnComplete || message.serverContent?.generationComplete) {
            flushOutput();
            // Audio playback timer handles the speaking→listening transition
            if (!speakingRef.current) {
                setState('listening');
            }
        }
    }, [cancelPlayback, enqueueAudio, executeToolCall, onTranscript]);

    // Keep the ref in sync — no deps array so it runs after every render,
    // ensuring onmessage always calls the latest closure.
    useEffect(() => {
        handleLiveMessageRef.current = handleLiveMessage;
    });

    // --- Microphone ---

    const startMicrophone = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        const audioContext = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
        const sourceNode = audioContext.createMediaStreamSource(stream);
        // 512 samples @ 16 kHz ≈ 32 ms — within Google's recommended 20-40 ms range
        const processorNode = audioContext.createScriptProcessor(512, 1, 1);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;

        processorNode.onaudioprocess = event => {
            const samples = event.inputBuffer.getChannelData(0);
            let energy = 0;
            for (let i = 0; i < samples.length; i += 1) {
                energy += samples[i] * samples[i];
            }

            const rms = Math.sqrt(energy / samples.length);
            setLevel(prev => (speakingRef.current ? prev : Math.max(rms * 8, prev * 0.45)));

            if (!sessionRef.current || stateRef.current === 'starting' || stateRef.current === 'greeting') {
                return;
            }

            // Always send mic data to enable server-side VAD (Voice Activity Detection) and barge-in.
            // If we're speaking, we still send audio so the server knows the user is interrupting.
            const payload = encodePcm16(samples);
            sessionRef.current.sendRealtimeInput({ audio: payload });
            
            // Track last active mic input for latency measurement
            if (energy > 0.0001) {
                lastRequestTimeRef.current = performance.now();
                firstAudioReceivedRef.current = false;
            }
        };

        sourceNode.connect(processorNode);
        processorNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        await audioContext.resume();

        micStreamRef.current = stream;
        micAudioContextRef.current = audioContext;
        sourceNodeRef.current = sourceNode;
        processorNodeRef.current = processorNode;
        sinkGainNodeRef.current = gainNode;
    }, []); // stateRef used instead of state — no dependency needed

    // --- Session start ---

    const start = useCallback(async () => {
        if (!isAvailable || stateRef.current !== 'off') return;

        try {
            setError(null);
            setVoiceState('starting');
            sessionIdRef.current = `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

            const { token, model } = await fetchVoiceToken(config.model);
            const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });

            console.log('[voice] connecting with model:', model);
            onSessionConfig?.({ model, voiceName: config.voiceName });
            onAppContextChange?.(JSON.stringify(getAppContext()));
            const session = await ai.live.connect({
                model,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: config.voiceName }
                        }
                    },
                    ...(config.inputTranscriptionEnabled ? { inputAudioTranscription: {} } : {}),
                    ...(config.outputTranscriptionEnabled ? { outputAudioTranscription: {} } : {}),
                    generationConfig: { temperature: config.temperature ?? 1.1 },
                    ...(config.thinkingLevel && config.thinkingLevel !== 'none' ? { thinkingConfig: { thinkingLevel: config.thinkingLevel } as any } : {}),
                    systemInstruction: `${config.systemPrompt}\n\nSession language: ${lang === 'de' ? 'German (Deutsch) — respond in German' : 'English — respond in English'}.`,
                    ...(activeToolDeclarations.length > 0 ? { tools: [{ functionDeclarations: activeToolDeclarations }] } : {}),
                },
                callbacks: {
                    onopen: () => {
                        console.log('[voice] session opened');
                        playSound('voice-start');
                        setVoiceState('greeting');
                    },
                    onmessage: (message: LiveServerMessage) => {
                        // Use ref so we always dispatch to the latest handleLiveMessage,
                        // even if handler props (navigation, getAppContext, etc.) changed
                        // after a route change since session start.
                        void (handleLiveMessageRef.current ?? handleLiveMessage)(message);
                    },
                    onerror: (event: ErrorEvent) => {
                        console.error('[voice] live api error', event);
                        setError(event.message || 'Voice session error');
                        setVoiceState('error');
                    },
                    onclose: (e: CloseEvent) => {
                        console.log('[voice] session closed', JSON.stringify({ code: e?.code, reason: e?.reason, wasClean: e?.wasClean }));
                        sessionRef.current = null;
                        // Always run full cleanup so mic stream is released
                        stop();
                    }
                }
            });

            sessionRef.current = session;

            // Send greeting BEFORE starting mic
            const greeting = config.greeting;
            console.log('[voice] sending greeting via sendRealtimeInput');
            session.sendRealtimeInput({ text: greeting });
            console.log('[voice] greeting sent ok');

            // Greeting timeout: if no audio response within 10s, show error
            greetingTimeoutRef.current = window.setTimeout(() => {
                if (stateRef.current === 'greeting') {
                    console.warn('[voice] greeting timeout — no response from Gemini');
                    setError(lang === 'de' ? 'Keine Antwort erhalten' : 'No response received');
                    setVoiceState('error');
                }
            }, 10000) as unknown as number;

            // Start mic AFTER greeting is sent
            await startMicrophone();
            setVoiceState('listening');
        } catch (err) {
            console.error('[voice] failed to start', err);
            const message = err instanceof Error ? err.message : 'Voice mode could not be started';
            setError(message);
            setVoiceState('error');
            showToast(lang === 'de' ? 'Sprachmodus konnte nicht gestartet werden' : 'Voice mode could not be started', 'error');
            stop();
        }
    }, [
        activeToolDeclarations,
        config.greeting,
        config.inputTranscriptionEnabled,
        config.outputTranscriptionEnabled,
        config.systemPrompt,
        config.voiceName,
        getAppContext,
        handleLiveMessage,
        isAvailable,
        lang,
        onAppContextChange,
        onSessionConfig,
        setVoiceState,
        showToast,
        startMicrophone,
        stop,
        syncVisualContext
    ]);

    // Animated level for speaking/listening states
    useEffect(() => {
        if (state !== 'speaking' && state !== 'listening') return;

        const id = window.setInterval(() => {
            setLevel(prev => {
                if (state === 'speaking') return 0.22 + Math.random() * 0.38;
                return prev * 0.82;
            });
        }, 120);

        return () => window.clearInterval(id);
    }, [state]);

    // Debounced visual context sync:
    // - Detail view (gallery → image): send instantly — user just opened an image
    // - Gallery/stack navigation: 2s debounce — prevents flooding during quick nav
    const visualSyncTimerRef = useRef<number | null>(null);
    useEffect(() => {
        if (state === 'off') return;
        if (visualSyncTimerRef.current) window.clearTimeout(visualSyncTimerRef.current);
        const isDetail = getAppContextRef.current().viewLevel === 'detail';
        const delay = isDetail ? 0 : 2000;
        visualSyncTimerRef.current = window.setTimeout(() => {
            void syncVisualContext();
        }, delay);
        return () => { if (visualSyncTimerRef.current) window.clearTimeout(visualSyncTimerRef.current); };
    }, [state, syncVisualContext]);

    const result = useMemo(() => ({
        isAvailable,
        state,
        isActive: state !== 'off',
        level,
        error,
        start,
        stop
    }), [error, isAvailable, level, start, state, stop]);

    return result;
}
