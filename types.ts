
export interface AnnotationObject {
  id: string;
  type: 'mask_path' | 'stamp'; // Consolidated type for brush strokes and stamps
  points: { x: number, y: number }[]; // The raw path for reconstruction (brush)
  x?: number; // X coordinate for stamp center
  y?: number; // Y coordinate for stamp center
  strokeWidth: number;
  text?: string; // The specific prompt for this mask

  // Variation Logic
  itemId?: string; // Reference to library item (e.g. 'sofa')
  variantIndex?: number; // Which variant of the item is selected

  isRemove?: boolean; // Quick action flag: "Remove this"
  color: string; // Visual differentiation
}

export interface CanvasImage {
  id: string;
  src: string; // Base64 data URI
  width: number; // Intrinsic width
  height: number; // Intrinsic height
  title: string;

  // Naming & Versioning
  baseName?: string; // The original root name (e.g. "LivingRoom")
  version?: number; // The version number (e.g. 1, 2, 3)

  isGenerating: boolean;
  generationStartTime?: number; // Timestamp for duration tracking
  originalSrc?: string;

  // Lineage Tracking for Action Buttons
  parentId?: string;
  generationPrompt?: string;

  // Annotation State
  maskSrc?: string | null; // The flattened binary mask for AI
  annotations?: AnnotationObject[]; // Vector objects
  drawingState?: ImageData; // Legacy support (can be removed later or kept for cache)
}

export interface ImageRow {
  id: string;
  title: string;
  items: CanvasImage[];
}

export interface PromptTemplate {
  id: string;
  title: string;
  prompt: string;
  emoji?: string;
  tags: string[];
  isPinned: boolean;
  isCustom: boolean; // True if created by user
  usageCount: number; // For sorting by popularity
  lastUsed?: number; // Timestamp for recency
}
