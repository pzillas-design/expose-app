
import { translations } from './data/locales';

export type TranslationKey = keyof typeof translations.en;
export type TranslationFunction = (key: TranslationKey) => string;

export interface AnnotationObject {
  id: string;
  type: 'mask_path' | 'stamp' | 'reference_image' | 'shape';
  points: { x: number, y: number }[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  shapeType?: 'rect' | 'circle' | 'line' | 'path';
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
  activeTemplateId?: string; // Currently active preset template ID
  variableValues?: Record<string, string[]>; // Selected variable options for the active template

  maskSrc?: string | null;
  annotations?: AnnotationObject[];
  drawingState?: ImageData;

  quality?: GenerationQuality; // Stores the model quality used for generation
  modelVersion?: string; // Verified model version from API response
  estimatedDuration?: number; // Estimated time in ms, accounting for concurrency

  boardId?: string; // Link to board
  userId?: string; // Owner ID (mapped from DB user_id)
  createdAt?: number; // DB Prep
  updatedAt?: number; // DB Prep
}

export interface ImageRow {
  id: string;
  board_id?: string; // Link to board
  title: string;
  items: CanvasImage[];
  createdAt?: number; // DB Prep
}

export interface Board {
  id: string;
  userId: string;
  name: string;
  thumbnail?: string;
  previewImages?: string[]; // Added for dynamic multi-thumbnails
  itemCount?: number;
  createdAt: number;
  updatedAt: number;
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
