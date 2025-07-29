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
  usage?: ApiUsage;
  model?: string;
  boundingBoxesEnabled?: boolean;
  segmentationEnabled?: boolean;
}

export interface ImageProcessingConfig {
  maxWidth: number;
  maxHeight: number;
  supportedFormats: string[];
  maxFileSize: number;
}

// New type definitions for proper typing
export interface CachedImageMetadata {
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  hash: string;
  uploadedAt: string;
}

export interface UserSessionData {
  userId: string;
  email: string;
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  apiUsageCount: number;
  apiUsageResetDate: string;
  lastActivity: string;
}

export interface ConfidenceScores {
  boxes?: number[];
  segments?: number[];
  overall?: number;
}

export interface UserCorrections {
  addedBoxes?: BoundingBox[];
  removedBoxes?: BoundingBox[];
  modifiedBoxes?: Array<{ original: BoundingBox; modified: BoundingBox }>;
  addedSegments?: SegmentationPolygon[];
  removedSegments?: SegmentationPolygon[];
  modifiedSegments?: Array<{ original: SegmentationPolygon; modified: SegmentationPolygon }>;
}

export interface TrainingDataExport {
  id: string;
  imageId: string;
  userId: string | null;
  groundTruthBoxes: BoundingBox[] | null;
  groundTruthLabels: string[] | null;
  userCorrections: UserCorrections | null;
  feedbackScore: number | null;
  isApprovedForTraining: boolean;
  createdAt: string;
}

export type InputMethod = 'url' | 'file';
export type AnalysisMode = 'detection' | 'segmentation';
export type ModelType = 'qwen-vl-max' | 'qwen-vl-plus' | 'qwen-vl-max-2025-04-08'; 