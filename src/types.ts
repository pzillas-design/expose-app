
import { translations } from './data/locales';

export type TranslationKey = keyof typeof translations.en;
export type TranslationFunction = (key: TranslationKey) => string;

export interface AnnotationObject {
  id: string;
  type: 'mask_path' | 'stamp' | 'reference_image';
  points: { x: number, y: number }[];
  x?: number;
  y?: number;
  strokeWidth: number;
  text?: string;
  itemId?: string;
  variantIndex?: number;
  color: string;
  referenceImage?: string;
  createdAt?: number; // DB Prep
}

export interface CanvasImage {
  id: string;
  src: string;
  thumbSrc?: string; // Low-res thumbnail for LOD performance
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
  generationPrompt?: string;
  userDraftPrompt?: string;

  maskSrc?: string | null;
  annotations?: AnnotationObject[];
  drawingState?: ImageData;

  quality?: GenerationQuality; // Stores the model quality used for generation
  modelVersion?: string; // Verified model version from API response
  estimatedDuration?: number; // Estimated time in ms, accounting for concurrency

  createdAt?: number; // DB Prep
  updatedAt?: number; // DB Prep
}

export interface ImageRow {
  id: string;
  title: string;
  items: CanvasImage[];
  createdAt?: number; // DB Prep
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
  title: string;
  prompt: string;
  emoji?: string; // Optional
  tags: string[];
  isPinned: boolean;
  isCustom: boolean;
  usageCount: number;
  lastUsed?: number;
  controls?: PresetControl[];
  lang?: 'de' | 'en'; // Localization
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
  icon: string;
  isUserCreated?: boolean; // New
}

export interface LibraryCategory {
  id: string;
  label: string;
  icon: string;
  items: LibraryItem[];
  lang?: 'de' | 'en'; // Localization
  isUserCreated?: boolean; // New
}

export type GenerationQuality = 'fast' | 'pro-1k' | 'pro-2k' | 'pro-4k';

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
