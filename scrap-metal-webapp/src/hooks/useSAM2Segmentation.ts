import { useState, useCallback } from 'react';
import axios from 'axios';
import { SAM2SegmentationResult, SAM2Mask, SAM2Point, SAM2Box, SAM2Mode } from '@/types/api';

interface UseSAM2SegmentationReturn {
  masks: SAM2Mask[];
  loading: boolean;
  error: string;
  segmentImage: (
    file: File | null,
    imageUrl: string,
    mode: SAM2Mode,
    points?: SAM2Point[],
    boxes?: SAM2Box[]
  ) => Promise<void>;
  clearResults: () => void;
  isServiceAvailable: boolean;
  checkServiceHealth: () => Promise<boolean>;
}

/**
 * Custom hook for SAM 2 segmentation functionality
 * Handles communication with the Python SAM 2 backend service
 */
export const useSAM2Segmentation = (
  serviceUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
): UseSAM2SegmentationReturn => {
  const [masks, setMasks] = useState<SAM2Mask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isServiceAvailable, setIsServiceAvailable] = useState(false);

  const clearResults = useCallback(() => {
    setMasks([]);
    setError('');
  }, []);

  const checkServiceHealth = useCallback(async (): Promise<boolean> => {
    try {
      // Use /status endpoint which includes model_loaded information
      const response = await axios.get(`${serviceUrl}/status`, { timeout: 5000 });
      const isHealthy = response.data.status === 'healthy' && response.data.model_loaded;
      setIsServiceAvailable(isHealthy);
      return isHealthy;
    } catch (err) {
      console.warn('SAM 2 service not available:', err);
      setIsServiceAvailable(false);
      return false;
    }
  }, [serviceUrl]);

  const segmentImage = useCallback(async (
    file: File | null,
    imageUrl: string,
    mode: SAM2Mode,
    points?: SAM2Point[],
    boxes?: SAM2Box[]
  ): Promise<void> => {
    // Input validation
    if (!file && !imageUrl.trim()) {
      setError('Please select an image file or enter an image URL');
      return;
    }

    // Check if service is available
    const serviceHealthy = await checkServiceHealth();
    if (!serviceHealthy) {
      setError('SAM 2 service is not available. Please ensure the Python backend is running.');
      return;
    }

    setLoading(true);
    setError('');
    setMasks([]);

    try {
      const formData = new FormData();
      formData.append('mode', mode);

      // Add image data
      if (file) {
        formData.append('file', file);
      } else if (imageUrl.trim()) {
        // Use URL endpoint
        const urlResponse = await axios.post(`${serviceUrl}/segment-url`, {
          image_url: imageUrl.trim(),
          mode,
          points: points ? JSON.stringify(points.map(p => [p.x, p.y])) : undefined,
          boxes: boxes ? JSON.stringify(boxes.map(b => [b.x1, b.y1, b.x2, b.y2])) : undefined,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120000,
        });

        const result: SAM2SegmentationResult = urlResponse.data;
        setMasks(result.masks || []);
        return;
      }

      // Add prompts if provided
      if (points && points.length > 0) {
        formData.append('points', JSON.stringify(points.map(p => [p.x, p.y])));
      }

      if (boxes && boxes.length > 0) {
        formData.append('boxes', JSON.stringify(boxes.map(b => [b.x1, b.y1, b.x2, b.y2])));
      }

      // Make request to SAM 2 service
      const response = await axios.post<SAM2SegmentationResult>(
        `${serviceUrl}/segment`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000, // 120 second timeout for segmentation
          maxContentLength: 50 * 1024 * 1024, // 50MB max content length
          maxBodyLength: 50 * 1024 * 1024, // 50MB max body length
        }
      );

      const result = response.data;
      
      if (result.success) {
        setMasks(result.masks || []);
      } else {
        setError('Segmentation failed');
      }

    } catch (err: unknown) {
      console.error('SAM 2 segmentation error:', err);
      
      let errorMessage = 'Failed to segment image';
      
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          errorMessage = 'Request timeout - segmentation took too long';
        } else if (err.code === 'ERR_NETWORK') {
          errorMessage = 'Network error - check your connection and try again';
        } else if (err.response?.status === 413) {
          errorMessage = 'Image too large - please use a smaller image';
        } else if (err.response?.status === 500) {
          errorMessage = 'Server error during segmentation';
        } else if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.message) {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [serviceUrl, checkServiceHealth]);

  return {
    masks,
    loading,
    error,
    segmentImage,
    clearResults,
    isServiceAvailable,
    checkServiceHealth,
  };
}; 