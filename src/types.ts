
import { translations } from './data/locales';

export type TranslationKey = keyof typeof translations.en;
export type TranslationFunction = (key: TranslationKey) => string;

export interface AnnotationObject {
  id: string;
  type: 'mask_path' | 'stamp' | 'reference_image' | 'shape';
  points?: { x: number, y: number }[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  shapeType?: 'rect' | 'circle' | 'line';
  rotation?: number; // In degrees
  strokeWidth: number;
  text?: string;
  itemId?: string;
  variantIndex?: number;
  color: string;
  emoji?: string; // New: editable emoji for the object
  referenceImage?: string;
  _tempSrc?: string; // Client-side preview for paths
  createdAt?: number; // DB Prep
}

export interface CanvasImage {
  id: string;
  src: string;
  storage_path: string;
  thumbSrc?: string; // Low-res thumbnail for LOD performance (Supabase on-the-fly transform URL)
  width: number;
  height: number;
  realWidth?: number;
  realHeight?: number;
  title: string;

  baseName?: string;
  version?: number;

  isGenerating: boolean;
  generationStartTime?: number;
  originalSrc?: string;

  parentId?: string;
  folderId?: string; // Immutable root of the stack — shared by all variants
  generationPrompt?: string;
  userDraftPrompt?: string;
  activeTemplateId?: string; // Currently active preset template ID
  variableValues?: Record<string, string[]>; // Selected variable options for the active template

  maskSrc?: string | null;
  annotations?: AnnotationObject[];
  drawingState?: ImageData;

  quality?: GenerationQuality; // Stores the model quality used for generation
  modelVersion?: string; // Verified model version from API response
  estimatedDuration?: number; // Estimated time in ms, accounting for concurrency

  userId?: string; // Owner ID (mapped from DB user_id)
  jobId?: string; // generation_jobs FK — used for download tracking
  createdAt?: number; // DB Prep
  updatedAt?: number; // DB Prep
}

export interface ImageRow {
  id: string;
  title: string;
  items: CanvasImage[];
  createdAt?: number; // DB Prep
}

export interface Board {
  id: string;
  name: string;
  updatedAt: Date | string | number;
  previewImages?: string[];
  thumbnail?: string;
  itemCount?: number;
  lastActivityAt?: Date | string | number;
}


export interface PresetOption {
  id: string;
  label: string;
  value: string;
}

export interface PresetControl {
  id: string;
  label: string;
  options: PresetOption[];
  defaultValue?: string;
}

export interface PromptTemplate {
  id: string;
  slug?: string; // New: for sharing
  title: string;
  prompt: string;
  emoji?: string; // Optional
  tags: string[];
  isPinned: boolean;
  isCustom: boolean;
  usageCount: number;
  controls?: PresetControl[];
  lang?: 'de' | 'en'; // Localization
  isHistory?: boolean; // New: to distinguish on-the-fly prompts
  isDefault?: boolean; // New: to mark as default system bookmark
  createdAt?: number; // DB Prep
}

// --- PRESET TAGS (Bilingual) ---
export interface PresetTag {
  id: string;
  de: string;
  en: string;
}

export interface LibraryItem {
  id: string;
  label: string;
  icon?: string;
  isUserCreated?: boolean; // New
}

export interface LibraryCategory {
  id: string;
  label: string;
  icon?: string;
  items: LibraryItem[];
  lang?: 'de' | 'en'; // Localization
  isUserCreated?: boolean; // New
}

export type GenerationQuality = 'nb2-05k' | 'nb2-1k' | 'nb2-2k' | 'nb2-4k';

// --- Generation settings (modal) ---
// Resolution piggybacks the legacy GenerationQuality enum so backend cost
// tables and existing image rows keep working. Fields beyond resolution
// (quality / aspectRatio / outputFormat) are new and only meaningful when
// the active provider supports them (gpt-image-2 currently).
export type ImageQualityLevel = 'low' | 'medium' | 'high';
export type ImageAspectRatio = 'auto' | '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '21:9' | '5:4' | '4:5';
export type ImageOutputFormat = 'jpeg' | 'png' | 'webp';

export type ImageModelProvider = 'fal-nb2' | 'openai';

export interface GenerationSettings {
  provider: ImageModelProvider;        // 'openai' (gpt-image-2) | 'fal-nb2' (Google Nano Banana 2)
  resolution: GenerationQuality;       // 'nb2-1k' | 'nb2-2k' | 'nb2-4k' — drives our COSTS table + tier label
  quality: ImageQualityLevel;          // gpt-image-2 detail/adherence knob (ignored on NB2)
  aspectRatio: ImageAspectRatio;       // 'auto' lets the model infer from source
  outputFormat: ImageOutputFormat;     // jpeg = small/photo, png = lossless, webp = small + modern
}

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  // Reverted to NB2 + 1K after gpt-image-2 quality felt off in real use —
  // NB2 is faster, cheaper, and produces consistently usable real-estate edits.
  // Users who prefer GPT Image 2 can switch in the settings modal; once they do,
  // the migration flag prevents auto-revert on next reload.
  provider:     'fal-nb2',
  resolution:   'nb2-1k',
  quality:      'high',
  aspectRatio:  'auto',
  outputFormat: 'jpeg',
};

// USD price matrix per (resolution × quality). Quality affects price now —
// higher quality = more model compute = more cost, passed on transparently.
// Margins target ~40–60% across the matrix.
export const PRICES_USD: Record<string, Record<ImageQualityLevel, number>> = {
  'nb2-1k': { low: 0.10, medium: 0.20, high: 0.30 },
  'nb2-2k': { low: 0.15, medium: 0.30, high: 0.40 },
  'nb2-4k': { low: 0.25, medium: 0.50, high: 0.60 },
};

/** Convenience getter for the matrix above. Defaults to 0 if unknown. */
export const getGenerationPriceUsd = (resolution: string, quality: ImageQualityLevel): number =>
  PRICES_USD[resolution]?.[quality] ?? 0;

// Legacy export — keeps callers that only know "high quality" pricing working.
// Prefer getGenerationPriceUsd() in new code.
export const RESOLUTION_PRICES_USD: Record<string, number> = {
  'nb2-1k': PRICES_USD['nb2-1k'].high,
  'nb2-2k': PRICES_USD['nb2-2k'].high,
  'nb2-4k': PRICES_USD['nb2-4k'].high,
};

// --- ADMIN TYPES ---

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'pro';
  credits: number;
  totalSpent: number;
  joinedAt: number;
  lastActiveAt: number;
  stripeCustomerId?: string;
}

export interface AdminJob {
  id: string;
  userId: string;
  userName: string;
  type: 'generate' | 'edit' | 'video';
  model: string;
  status: 'completed' | 'failed' | 'processing';
  cost: number;
  apiCost?: number;
  durationMs: number;
  createdAt: number;
  thumbnail?: string; // Mock thumbnail url
  promptPreview: string;
}

export interface VoiceAdminToolConfig {
  name: string;
  enabled: boolean;
  description?: string; // description sent to the API — admin panel is the sole source of truth
}

export interface PromptAlternative {
  id: string;
  label: string; // e.g. "Standard", "Kurz", "B"
  text: string;
}

export interface PromptBlock {
  id: string;
  label: string;       // e.g. "ANTWORTEN", "KREATIV"
  activeId: string | null; // ID of active alternative — null = block disabled
  alternatives: PromptAlternative[];
}

export interface VoiceAdminConfig {
  enabled: boolean;
  model: string;
  voiceName: string;
  inputTranscriptionEnabled: boolean;
  outputTranscriptionEnabled: boolean;
  visualContextEnabled: boolean;
  systemPrompt: string;
  systemPromptBlocks?: PromptBlock[]; // structured blocks — assembled into systemPrompt on save
  greeting: string;
  tools: VoiceAdminToolConfig[];
  temperature?: number;
  thinkingLevel?: 'none' | 'minimal' | 'low' | 'medium' | 'high';
}

export interface VoiceToolCallLog {
  id: string;
  sessionId: string;
  name: string;
  status: 'ok' | 'error';
  argsSummary: string;
  message: string;
  timestamp: number;
  contextSnapshot?: string; // JSON of app context at the time of the call
}

export interface VoiceTranscriptLog {
  id: string;
  sessionId: string;
  source: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface VoiceDiagnostics {
  sessionModel: string | null;
  sessionVoice: string | null;
  appContextSummary: string | null;
  visualContextSummary: string | null;
  visualFrameCount: number;
  toolCalls: VoiceToolCallLog[];
  transcripts: VoiceTranscriptLog[];
}

// --- GENERATION TYPES ---

export interface StructuredReference {
  src: string;
  instruction: string;
}

export interface StructuredGenerationRequest {
  type: 'create' | 'edit';
  prompt: string;
  variables: Record<string, string[]>;
  originalImage?: string; // base64
  annotationImage?: string; // base64
  references: StructuredReference[];
}
