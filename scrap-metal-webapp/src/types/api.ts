export interface ApiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface BoundingBox {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

export interface SegmentationPolygon {
  label: string;
  points: Array<{ x: number; y: number }>;
  confidence?: number;
  pixelCoverage?: number; // Percentage of image covered by this segment
}

// New SAM 2 types
export interface SAM2Mask {
  id: number;
  mask: string; // Base64 encoded mask image
  score: number;
  area: number;
  label?: string; // Optional label for the mask
}

export interface SAM2SegmentationResult {
  success: boolean;
  mode: 'everything' | 'points' | 'boxes';
  num_masks: number;
  masks: SAM2Mask[];
  image_shape: [number, number]; // [height, width]
}

export interface SAM2Point {
  x: number;
  y: number;
  label: 1 | 0; // 1 for positive, 0 for negative
}

export interface SAM2Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ErrorResponse {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export interface AnalysisResponse {
  description: string;
  boxes?: BoundingBox[];
  segments?: SegmentationPolygon[];
  sam2_masks?: SAM2Mask[]; // New field for SAM 2 masks
  usage?: ApiUsage;
  model?: string;
  boundingBoxesEnabled?: boolean;
  segmentationEnabled?: boolean;
  sam2Enabled?: boolean; // New field for SAM 2 mode
}

export interface ImageProcessingConfig {
  maxWidth: number;
  maxHeight: number;
  supportedFormats: string[];
  maxFileSize: number;
}

export type InputMethod = 'url' | 'file';
export type AnalysisMode = 'detection' | 'segmentation' | 'sam2'; // Added SAM 2 mode
export type ModelType = 'qwen-vl-max' | 'qwen-vl-plus' | 'qwen-vl-max-2025-04-08';
export type SAM2Mode = 'everything' | 'points' | 'boxes';
export type SAM2ModelSize = 'tiny' | 'small' | 'base_plus' | 'large'; 