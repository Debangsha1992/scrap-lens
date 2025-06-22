import { BoundingBox, ImageProcessingConfig, SegmentationPolygon } from '@/types/api';

// Configuration constants
export const IMAGE_CONFIG: ImageProcessingConfig = {
  maxWidth: 800,
  maxHeight: 600,
  supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
};

// Color palette for object detection visualization
export const DETECTION_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
] as const;

/**
 * Validates if a file is a supported image format
 */
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  if (!IMAGE_CONFIG.supportedFormats.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported file format. Please use: ${IMAGE_CONFIG.supportedFormats.join(', ')}`
    };
  }

  if (file.size > IMAGE_CONFIG.maxFileSize) {
    return {
      isValid: false,
      error: `File size exceeds ${IMAGE_CONFIG.maxFileSize / (1024 * 1024)}MB limit`
    };
  }

  return { isValid: true };
};

/**
 * Converts a file to base64 data URL
 */
export const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Calculates optimal canvas dimensions maintaining aspect ratio
 */
export const calculateCanvasDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = IMAGE_CONFIG.maxWidth,
  maxHeight: number = IMAGE_CONFIG.maxHeight
): { width: number; height: number; scale: number } => {
  let { width, height } = { width: originalWidth, height: originalHeight };

  if (width > maxWidth || height > maxHeight) {
    const scale = Math.min(maxWidth / width, maxHeight / height);
    width *= scale;
    height *= scale;
    return { width, height, scale };
  }

  return { width, height, scale: 1 };
};

/**
 * Draws bounding boxes on canvas with labels
 */
export const drawBoundingBoxes = (
  ctx: CanvasRenderingContext2D,
  boxes: BoundingBox[],
  scale: number
): void => {
  boxes.forEach((box, index) => {
    const color = DETECTION_COLORS[index % DETECTION_COLORS.length];

    // Calculate scaled coordinates
    const x = box.x * scale;
    const y = box.y * scale;
    const width = box.width * scale;
    const height = box.height * scale;

    // Draw bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    // Draw label background and text
    const labelText = box.confidence 
      ? `${box.label} (${(box.confidence * 100).toFixed(1)}%)`
      : box.label;
    
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    const textMetrics = ctx.measureText(labelText);
    const labelWidth = textMetrics.width + 8;
    const labelHeight = 20;

    // Label background
    ctx.fillStyle = color;
    ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);

    // Label text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(labelText, x + 4, y - labelHeight + 3);
  });
};

/**
 * Draws segmentation polygons on canvas with labels and pixel coverage
 */
export const drawSegmentationPolygons = (
  ctx: CanvasRenderingContext2D,
  segments: SegmentationPolygon[],
  scale: number
): void => {
  segments.forEach((segment, index) => {
    const color = DETECTION_COLORS[index % DETECTION_COLORS.length];
    
    if (segment.points.length < 3) return; // Need at least 3 points for a polygon

    // Draw polygon outline
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    // Move to first point
    const firstPoint = segment.points[0];
    ctx.moveTo(firstPoint.x * scale, firstPoint.y * scale);
    
    // Draw lines to all other points
    for (let i = 1; i < segment.points.length; i++) {
      const point = segment.points[i];
      ctx.lineTo(point.x * scale, point.y * scale);
    }
    
    // Close the polygon
    ctx.closePath();
    
    // Fill with semi-transparent color
    ctx.fillStyle = color + '40'; // Add 40 for 25% opacity
    ctx.fill();
    
    // Stroke the outline
    ctx.stroke();
    
    // Calculate polygon center for label placement
    const centerX = segment.points.reduce((sum, point) => sum + point.x, 0) / segment.points.length * scale;
    const centerY = segment.points.reduce((sum, point) => sum + point.y, 0) / segment.points.length * scale;
    
    // Draw label with pixel coverage information
    const labelText = segment.pixelCoverage !== undefined
      ? `${segment.label} (${segment.pixelCoverage.toFixed(1)}%)`
      : segment.label;
    
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    const textMetrics = ctx.measureText(labelText);
    const labelWidth = textMetrics.width + 8;
    const labelHeight = 18;
    
    // Label background
    ctx.fillStyle = color;
    ctx.fillRect(centerX - labelWidth/2, centerY - labelHeight/2, labelWidth, labelHeight);
    
    // Label text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, centerX, centerY);
  });
  
  // Reset text alignment
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
};

/**
 * Validates URL format
 */
export const isValidImageUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

/**
 * Draws SAM 2 segmentation masks on canvas with different colors
 */
export const drawSAM2Masks = async (
  ctx: CanvasRenderingContext2D,
  masks: Array<{ id: number; mask: string; score: number; area: number; label?: string }>,
  scale: number
): Promise<void> => {
  console.log(`Drawing ${masks.length} SAM 2 masks with scale ${scale}`);
  
  // Limit the number of masks to prevent overwhelming the display
  const maxMasks = 25; // Increased to match backend limit for better coverage
  const sortedMasks = masks
    .sort((a, b) => b.score - a.score) // Sort by score (highest first)
    .slice(0, maxMasks); // Take only the top masks
  
  console.log(`Processing top ${sortedMasks.length} masks (sorted by score)`);
  
  // Process masks sequentially to avoid overwhelming the browser
  for (let i = 0; i < sortedMasks.length; i++) {
    const maskData = sortedMasks[i];
    
    try {
      console.log(`Processing mask ${maskData.id} (${i + 1}/${sortedMasks.length}) - Score: ${maskData.score.toFixed(3)}, Area: ${maskData.area}`);
      
      // Create image from base64 mask data
      const maskImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          console.log(`Mask ${maskData.id} loaded: ${img.width}x${img.height}`);
          resolve(img);
        };
        
        img.onerror = (error) => {
          console.error(`Failed to load mask ${maskData.id}:`, error);
          reject(new Error(`Failed to load mask ${maskData.id}`));
        };
        
        // Ensure proper base64 format
        const base64Data = maskData.mask.startsWith('data:') 
          ? maskData.mask 
          : `data:image/png;base64,${maskData.mask}`;
        img.src = base64Data;
      });
      
      // Get color for this mask
      const color = DETECTION_COLORS[i % DETECTION_COLORS.length];
      
      // Create a temporary canvas for processing the mask
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) continue;
      
      // Set canvas size to match the mask image
      tempCanvas.width = maskImage.width;
      tempCanvas.height = maskImage.height;
      
      // Draw the mask image to get pixel data
      tempCtx.drawImage(maskImage, 0, 0);
      
      // Get image data
      const imageData = tempCtx.getImageData(0, 0, maskImage.width, maskImage.height);
      const data = imageData.data;
      
      // Convert hex color to RGB
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 255, g: 0, b: 0 };
      };
      
      const rgb = hexToRgb(color);
      let pixelCount = 0;
      
      // Process mask pixels - look for white pixels (mask areas)
      for (let j = 0; j < data.length; j += 4) {
        const r = data[j];
        const g = data[j + 1];
        const b = data[j + 2];
        const a = data[j + 3];
        
        // Check if pixel is part of the mask (white or high intensity)
        const isWhite = r > 200 && g > 200 && b > 200 && a > 200;
        const isHighIntensity = (r + g + b) / 3 > 128 && a > 128;
        
        if (isWhite || isHighIntensity) {
          // Apply mask color with transparency based on mask quality and position
          const alphaValue = Math.max(60, 120 - (i * 8)); // Decrease alpha for lower-ranked masks
          data[j] = rgb.r;         // Red
          data[j + 1] = rgb.g;     // Green
          data[j + 2] = rgb.b;     // Blue
          data[j + 3] = alphaValue; // Alpha (more transparent for overlapping masks)
          pixelCount++;
        } else {
          // Make non-mask areas transparent
          data[j + 3] = 0;
        }
      }
      
      console.log(`Mask ${maskData.id} has ${pixelCount} visible pixels`);
      
      // Only draw masks that have visible pixels
      if (pixelCount > 0) {
        // Put the modified image data back
        tempCtx.putImageData(imageData, 0, 0);
        
        // Draw the colored mask on the main canvas with proper scaling
        ctx.globalCompositeOperation = 'source-over';
        // Adjust global alpha based on mask ranking to reduce overlap visibility
        const globalAlpha = Math.max(0.3, 0.7 - (i * 0.05));
        ctx.globalAlpha = globalAlpha;
        
        // Calculate scaled dimensions
        const scaledWidth = maskImage.width * scale;
        const scaledHeight = maskImage.height * scale;
        
        ctx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight);
        
        // Reset alpha
        ctx.globalAlpha = 1.0;
        
        // Draw mask label for high-confidence masks (reduced threshold to show more labels)
        if (maskData.score > 0.75 && pixelCount > 500) { // Only label significant masks
          const labelText = maskData.label || `Mask ${maskData.id + 1}`;
          const scoreText = `${(maskData.score * 100).toFixed(1)}%`;
          const fullText = `${labelText} (${scoreText})`;
          
          // Find center of mask bounds
          const maskBounds = getMaskBounds(maskImage);
          if (maskBounds) {
            const centerX = (maskBounds.x + maskBounds.width / 2) * scale;
            const centerY = (maskBounds.y + maskBounds.height / 2) * scale;
            
            // Draw label
            ctx.font = 'bold 11px Inter, system-ui, sans-serif';
            const textMetrics = ctx.measureText(fullText);
            const labelWidth = textMetrics.width + 8;
            const labelHeight = 16;
            
            // Label background with rounded corners
            ctx.fillStyle = color + 'CC'; // Semi-transparent background
            ctx.fillRect(centerX - labelWidth/2, centerY - labelHeight/2, labelWidth, labelHeight);
            
            // Label text
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(fullText, centerX, centerY);
          }
        }
      }
      
    } catch (error) {
      console.error(`Error processing mask ${maskData.id}:`, error);
      continue; // Skip this mask and continue with others
    }
  }
  
  console.log('Finished drawing all SAM 2 masks');
};

/**
 * Helper function to get bounding box of a mask image
 */
const getMaskBounds = (maskImage: HTMLImageElement): { x: number; y: number; width: number; height: number } | null => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  canvas.width = maskImage.width;
  canvas.height = maskImage.height;
  ctx.drawImage(maskImage, 0, 0);
  
  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    let hasPixels = false;
    
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];
        
        // Check if pixel is part of the mask (white or high intensity)
        const isWhite = r > 200 && g > 200 && b > 200 && a > 200;
        const isHighIntensity = (r + g + b) / 3 > 128 && a > 128;
        
        if (isWhite || isHighIntensity) {
          hasPixels = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    return hasPixels ? {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY)
    } : null;
  } catch (error) {
    console.error('Error getting mask bounds:', error);
    return null;
  }
}; 