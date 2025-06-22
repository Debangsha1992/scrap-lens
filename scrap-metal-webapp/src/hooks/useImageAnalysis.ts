import { useState, useCallback } from 'react';
import axios from 'axios';
import { AnalysisResponse, ErrorResponse, BoundingBox, SegmentationPolygon, ApiUsage, AnalysisMode, ModelType } from '@/types/api';
import { validateImageFile, isValidImageUrl } from '@/utils/imageProcessing';

interface RateLimitInfo {
  resetIn: string;
  resetTime: string;
  remaining: number;
}

interface UseImageAnalysisReturn {
  description: string;
  boxes: BoundingBox[];
  segments: SegmentationPolygon[];
  usage: ApiUsage | null;
  loading: boolean;
  error: string;
  rateLimitInfo: RateLimitInfo | null;
  analyzeImage: (
    file: File | null,
    imageUrl: string,
    analysisMode: AnalysisMode,
    model?: ModelType,
    imageWidth?: number,
    imageHeight?: number
  ) => Promise<void>;
  clearResults: () => void;
}

/**
 * Custom hook for image analysis functionality
 * Handles API calls and state management for image analysis with both object detection and segmentation
 */
export const useImageAnalysis = (): UseImageAnalysisReturn => {
  const [description, setDescription] = useState('');
  const [boxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
  const [segments, setSegments] = useState<SegmentationPolygon[]>([]);
  const [usage, setUsage] = useState<ApiUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);

  const clearResults = useCallback(() => {
    setDescription('');
    setBoundingBoxes([]);
    setSegments([]);
    setUsage(null);
    setError('');
  }, []);

  const analyzeImage = useCallback(async (
    file: File | null,
    imageUrl: string,
    analysisMode: AnalysisMode,
    model: ModelType = 'qwen-vl-max',
    imageWidth: number = 800,
    imageHeight: number = 600
  ): Promise<void> => {
    // Input validation
    if (!file && !imageUrl.trim()) {
      setError('Please select an image file or enter an image URL');
      return;
    }

    if (file) {
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid file');
        return;
      }
    } else if (imageUrl.trim() && !isValidImageUrl(imageUrl.trim())) {
      setError('Please enter a valid image URL');
      return;
    }

    setLoading(true);
    setError('');
    setDescription('');
    setBoundingBoxes([]);
    setSegments([]);
    setUsage(null);

    try {
      const formData = new FormData();

      if (file) {
        formData.append('file', file);
      } else {
        formData.append('imageUrl', imageUrl.trim());
      }

      // Set analysis mode flags
      const enableBoundingBoxes = analysisMode === 'detection';
      const enableSegmentation = analysisMode === 'segmentation';
      
      formData.append('enableBoundingBoxes', enableBoundingBoxes.toString());
      formData.append('enableSegmentation', enableSegmentation.toString());
      formData.append('model', model);
      formData.append('imageWidth', imageWidth.toString());
      formData.append('imageHeight', imageHeight.toString());

      const response = await axios.post<AnalysisResponse>('/api/describe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 second timeout for image processing
      });

      const data = response.data;
      setDescription(data.description);
      setBoundingBoxes(data.boxes || []);
      setSegments(data.segments || []);
      setUsage(data.usage || null);

      // Extract rate limit info from headers
      const remaining = response.headers['x-ratelimit-remaining'];
      const resetTime = response.headers['x-ratelimit-reset'];
      
      if (remaining && resetTime) {
        const resetTimeMs = parseInt(resetTime) * 1000;
        const now = Date.now();
        const timeUntilReset = resetTimeMs - now;
        
        let resetIn = 'now';
        if (timeUntilReset > 0) {
          const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
          const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
          if (hours > 0) {
            resetIn = `${hours}h ${minutes}m`;
          } else {
            resetIn = `${minutes}m`;
          }
        }
        
        setRateLimitInfo({
          remaining: parseInt(remaining),
          resetTime: new Date(resetTimeMs).toISOString(),
          resetIn
        });
      }
    } catch (err: unknown) {
      const errorResponse = err as ErrorResponse;
      const errorMessage = errorResponse.response?.data?.error || 'Failed to analyze image';
      setError(errorMessage);
      console.error('Image analysis error:', errorResponse);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    description,
    boxes,
    segments,
    usage,
    loading,
    error,
    rateLimitInfo,
    analyzeImage,
    clearResults,
  };
}; 