import { GoogleGenAI, Modality, Type, type FunctionCall, type FunctionDeclaration, type LiveServerMessage } from '@google/genai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import type { VoiceUiState } from '@/components/voice/VoiceModeIndicator';

type VoiceAppRoute = 'grid' | 'detail' | 'create' | 'other';

export interface VoiceAppContext {
    route: VoiceAppRoute;
    viewLevel: 'gallery' | 'stack' | 'detail' | 'create' | 'other';
    isSelectMode: boolean;
    imageCount: number;
    detailHasPrompt: boolean;
    canOpenPresets: boolean;
    canAddReferenceImage: boolean;
    canAnnotateImage: boolean;
    images?: Array<{ id: string; timestamp: string; prompt?: string }>;
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
    enterMultiSelect: () => Promise<VoiceActionResult> | VoiceActionResult;
    leaveMultiSelect: () => Promise<VoiceActionResult> | VoiceActionResult;
    repeatCurrentImage: () => Promise<VoiceActionResult> | VoiceActionResult;
    showDetailPanel: () => Promise<VoiceActionResult> | VoiceActionResult;
    hideDetailPanel: () => Promise<VoiceActionResult> | VoiceActionResult;
    openPresets: () => Promise<VoiceActionResult> | VoiceActionResult;
    openReferenceImagePicker: () => Promise<VoiceActionResult> | VoiceActionResult;
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
    highlightImage: (index: number) => Promise<VoiceActionResult> | VoiceActionResult;
    toggleImageSelection: (index: number) => Promise<VoiceActionResult> | VoiceActionResult;
}

interface UseGeminiLiveVoiceOptions extends VoiceCommandHandlers {
    enabled: boolean;
    lang: string;
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
        description: 'Read the current Expose app screen (Gallery, Stack, or Detail View) and what actions are currently possible.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'open_gallery',
        description: 'Go to the main gallery/feed view (Level 1).',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'open_create',
        description: 'Open the create/generate view.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'open_settings',
        description: 'Open the settings dialog.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'enter_multi_select',
        description: 'Enter multi-select mode in the gallery to work with multiple images.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'leave_multi_select',
        description: 'Leave multi-select mode in the gallery.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'repeat_current_image',
        description: 'Generate more variations from the currently open image.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'show_detail_panel',
        description: 'Show the edit/info panel on the current screen if it exists.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'hide_detail_panel',
        description: 'Hide the edit/info panel on the current screen if it exists.',
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
        name: 'open_create_new',
        description: 'Open the create page in creation mode with aspect ratio selection, ready for a new image.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'open_upload',
        description: 'Open the file upload dialog so the user can upload an image to edit.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'set_prompt_text',
        description: 'Set or replace the text in the prompt input field for image generation.',
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
        description: 'Go back to the previous view — like pressing the back/chevron button in the header. From detail view goes to stack, from stack goes to gallery.',
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
        name: 'open_stack',
        description: 'Navigate to the stack/group view of the current image. Shows all versions and variations of the image in the feed grid.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'highlight_image',
        description: 'Visually highlight (hover effect) an image in the gallery or stack so the user can verify which one you mean.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                index: { type: Type.NUMBER, description: '1-based index of the image' }
            },
            required: ['index']
        }
    },
    {
        name: 'toggle_image_selection',
        description: 'Mark or unmark an image for multi-selection. Indices are 1-based.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                index: { type: Type.NUMBER, description: '1-based index of the image' }
            },
            required: ['index']
        }
    },
    {
        name: 'create_variables',
        description: 'Create creative variable controls for the current prompt so the user can explore variations. ONLY call when the user explicitly asks for options, variables, or variations. Generate 3-6 controls with 3-6 options each that are creative and meaningful for the prompt context (e.g. Color, Style, Scene, Mood, Perspective, Lighting).',
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
        description: 'Toggle a variable option on or off. Use when the user says which option to activate or deactivate.',
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
        description: 'Set the generation quality/resolution. Available: "1k" (1024px, fast, 0.10€), "2k" (2048px, fast, 0.20€), "4k" (4096px, fast, 0.40€).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                quality: { type: Type.STRING, description: 'Quality level: "1k", "2k", or "4k"' }
            },
            required: ['quality']
        }
    },
    {
        name: 'select_image_by_index',
        description: 'Open the image at a specific numeric index in the current gallery or stack (1-based index).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                index: { type: Type.NUMBER, description: 'The 1-based index of the image to open, e.g. 5' }
            },
            required: ['index']
        }
    },
    {
        name: 'select_image_by_position',
        description: 'Open the image at a specific grid position (row and column, both 1-based).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                row: { type: Type.NUMBER, description: 'The 1-based row number' },
                column: { type: Type.NUMBER, description: 'The 1-based column number' }
            },
            required: ['row', 'column']
        }
    }
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

async function fetchVoiceToken() {
    const response = await fetch('/api/gemini-live-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Unable to create voice session');
    }
    return response.json() as Promise<TokenResponse>;
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
    getAppContext,
    getVisualContext,
    openGallery,
    openCreate,
    openCreateNew,
    openUpload,
    openSettings,
    enterMultiSelect,
    leaveMultiSelect,
    repeatCurrentImage,
    showDetailPanel,
    hideDetailPanel,
    openPresets,
    openReferenceImagePicker,
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
    highlightImage,
    toggleImageSelection
}: UseGeminiLiveVoiceOptions): UseGeminiLiveVoiceResult {
    const { showToast } = useToast();
    const [state, setState] = useState<VoiceUiState>('off');
    const [level, setLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);

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

    const isAvailable = enabled && typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

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

        // Schedule all queued chunks back-to-back
        const now = ctx.currentTime;
        let startAt = Math.max(playbackScheduledUntilRef.current, now);

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

        const visualContext = getVisualContext();
        if (!visualContext || visualContext.contextKey === lastVisualContextKeyRef.current) return;
        lastVisualContextKeyRef.current = visualContext.contextKey;

        try {
            sessionRef.current.sendRealtimeInput({ text: visualContext.summary });

            for (const frame of visualContext.frames.slice(0, 4)) {
                const payload = await fetchFramePayload(frame);
                sessionRef.current.sendRealtimeInput({ video: payload });
            }
        } catch (syncError) {
            console.error('[voice] visual context sync failed', syncError);
        }
    }, [getVisualContext]);

    // --- Tool execution ---

    const executeToolCall = useCallback(async (call: FunctionCall) => {
        const name = call.name || '';
        const result = (() => {
            switch (name) {
                case 'get_app_context':
                    return { ok: true, message: 'Fetched current app context.', context: getAppContext() };
                case 'open_gallery': return openGallery();
                case 'open_create': return openCreate();
                case 'open_settings': return openSettings();
                case 'enter_multi_select': return enterMultiSelect();
                case 'leave_multi_select': return leaveMultiSelect();
                case 'repeat_current_image': return repeatCurrentImage();
                case 'show_detail_panel': return showDetailPanel();
                case 'hide_detail_panel': return hideDetailPanel();
                case 'open_presets': return openPresets();
                case 'open_reference_image_picker': return openReferenceImagePicker();
                case 'start_annotation_mode': return startAnnotationMode();
                case 'open_create_new': return openCreateNew();
                case 'open_upload': return openUpload();
                case 'set_prompt_text': return setPromptText((call.args as Record<string, unknown>)?.text as string || '');
                case 'trigger_generation': return triggerGeneration();
                case 'next_image': return nextImage();
                case 'previous_image': return previousImage();
                case 'go_back': return goBack();
                case 'stop_voice_mode':
                    // Use internal stop() directly — no need for external handler
                    setTimeout(() => stop(), 50);
                    return { ok: true, message: 'Voice mode ended.' };
                case 'set_aspect_ratio': return setAspectRatio((call.args as Record<string, unknown>)?.ratio as string || '4:3');
                case 'open_stack': return openStack();
                case 'create_variables': return createVariables((call.args as Record<string, unknown>)?.controls as Array<{ label: string; options: string[] }> || []);
                case 'select_variable_option': {
                    const args = call.args as Record<string, unknown>;
                    return selectVariableOption(args?.label as string || '', args?.option as string || '');
                }
                case 'set_quality': return setQuality((call.args as Record<string, unknown>)?.quality as string || '2k');
                case 'select_image_by_index': return selectImageByIndex((call.args as Record<string, unknown>)?.index as number || 1);
                case 'select_image_by_position': {
                    const args = call.args as Record<string, unknown>;
                    return selectImageByPosition(args?.row as number || 1, args?.column as number || 1);
                }
                case 'highlight_image': return highlightImage((call.args as any)?.index as number || 0);
                case 'toggle_image_selection': return toggleImageSelection((call.args as any)?.index as number || 0);
                default: return { ok: false, message: `Unknown tool: ${name}` };
            }
        })();

        const awaitedResult = await Promise.resolve(result);

        return {
            id: call.id,
            name,
            response: awaitedResult.ok
                ? { output: awaitedResult }
                : { error: awaitedResult.message }
        };
    }, [
        createVariables, enterMultiSelect, getAppContext, goBack, hideDetailPanel,
        leaveMultiSelect, nextImage, openCreate, openCreateNew, openGallery,
        openPresets, openReferenceImagePicker, openSettings, openStack, openUpload,
        previousImage, repeatCurrentImage, selectVariableOption, setAspectRatio,
        setPromptText, setQuality, showDetailPanel, startAnnotationMode,
        stopVoiceMode, triggerGeneration, selectImageByIndex, selectImageByPosition
    ]);

    // --- Message handling ---

    const handleLiveMessage = useCallback(async (message: LiveServerMessage) => {
        console.debug('[voice] message:', JSON.stringify({
            hasToolCall: !!message.toolCall?.functionCalls?.length,
            hasModelTurn: !!message.serverContent?.modelTurn?.parts?.length,
            interrupted: !!message.serverContent?.interrupted,
            turnComplete: !!message.serverContent?.turnComplete,
            generationComplete: !!message.serverContent?.generationComplete,
            hasTranscription: !!message.serverContent?.outputTranscription?.text,
            text: message.serverContent?.modelTurn?.parts?.map(p => p.text).filter(Boolean).join(' ').slice(0, 50),
        }));

        // Tool calls
        if (message.toolCall?.functionCalls?.length) {
            setState('thinking');
            const functionResponses = await Promise.all(message.toolCall.functionCalls.map(executeToolCall));
            sessionRef.current?.sendToolResponse({ functionResponses });
            return;
        }

        // Barge-in: model was interrupted by user speech
        if (message.serverContent?.interrupted) {
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
                }
            }
        }

        // Transcription text (for potential UI display / logging)
        if (message.serverContent?.outputTranscription?.text) {
            // Could surface this to UI in the future
            console.debug('[voice] transcript:', message.serverContent.outputTranscription.text);
        }

        // Turn complete
        if (message.serverContent?.turnComplete || message.serverContent?.generationComplete) {
            // Audio playback timer handles the speaking→listening transition
            if (!speakingRef.current) {
                setState('listening');
            }
        }
    }, [cancelPlayback, enqueueAudio, executeToolCall]);

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

            if (!sessionRef.current || speakingRef.current || stateRef.current === 'starting' || stateRef.current === 'greeting') {
                return;
            }

            sessionRef.current.sendRealtimeInput({ audio: encodePcm16(samples) });
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

            const { token, model } = await fetchVoiceToken();
            const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });

            console.log('[voice] connecting with model:', model);
            const session = await ai.live.connect({
                model,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Charon' }
                        }
                    },
                    systemInstruction: lang === 'de'
                        ? 'Du bist Exposé, Sprachassistent einer KI-Bildgenerator-App. Navigation: Galerie (L1) -> Stapel (L2) -> Detailansicht (L3). Nutze Begriffe "Galerie", "Stapel", "Detailansicht" konsistent. Sprich knapp. Aktionen: Vor/Zurück (in L3) navigiert linear im aktuellen Kontext (Stapel oder Galerie). "Zurück" (go_back) geht eine Ebene höher. Nutze Funktionen still. Prompts kurz & pragmatisch. Bei Edits nur Änderung beschreiben. Nie eigenständig generieren — erst Prompt setzen, kurz begründen, auf Kommando generieren. Nach trigger_generation sage "wird generiert", nicht "fertig".'
                        : 'You are Exposé, voice assistant of an AI image generation app. Hierarchy: Gallery (L1) -> Stack (2) -> Detail View (L3). Use these terms consistently. Speak briefly. Next/Prev (in L3) navigates within current context (Stack or Gallery). "Back" (go_back) goes up one level. Use functions silently. Prompts short and pragmatic. Never generate on your own — set prompt, briefly explain, generate only on command. After trigger_generation say "generating", not "done".',
                    tools: [{ functionDeclarations: toolDeclarations }],
                },
                callbacks: {
                    onopen: () => {
                        console.log('[voice] session opened');
                        playSound('voice-start');
                        setVoiceState('greeting');
                    },
                    onmessage: (message: LiveServerMessage) => {
                        void handleLiveMessage(message);
                    },
                    onerror: (event: ErrorEvent) => {
                        console.error('[voice] live api error', event);
                        setError(event.message || 'Voice session error');
                        setVoiceState('error');
                    },
                    onclose: (e: CloseEvent) => {
                        console.log('[voice] session closed', JSON.stringify({ code: e?.code, reason: e?.reason, wasClean: e?.wasClean }));
                        setVoiceState(prev => (prev === 'off' ? prev : 'off'));
                        sessionRef.current = null;
                    }
                }
            });

            sessionRef.current = session;

            // Send greeting BEFORE starting mic
            const greeting = lang === 'de'
                ? 'Begrüße den Nutzer als Exposé. Sage sinngemäß: "Willkommen bei Exposé. Möchtest du ein Bild hochladen, bearbeiten oder etwas Neues erstellen?" Variiere leicht, halte es kurz.'
                : 'Greet the user as Exposé. Say: "Welcome to Exposé. Upload, edit, or create something new?" Vary slightly, keep it brief.';
            console.log('[voice] sending greeting via sendRealtimeInput');
            session.sendRealtimeInput({ text: greeting });
            console.log('[voice] greeting sent ok');

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
    }, [handleLiveMessage, isAvailable, lang, setVoiceState, showToast, startMicrophone, stop, syncVisualContext]);

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

    // Debounced visual context sync — wait 3s after image change before sending to model
    // This prevents flooding the model when user quickly navigates through images
    const visualSyncTimerRef = useRef<number | null>(null);
    useEffect(() => {
        if (state === 'off') return;
        if (visualSyncTimerRef.current) window.clearTimeout(visualSyncTimerRef.current);
        visualSyncTimerRef.current = window.setTimeout(() => {
            void syncVisualContext();
        }, 3000);
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
