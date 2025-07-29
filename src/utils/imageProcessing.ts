import { BoundingBox, ImageProcessingConfig, SegmentationPolygon } from '@/types/api';

// Configuration constants
export const IMAGE_CONFIG: ImageProcessingConfig = {
  maxWidth: 640,  // Reduced from 800 to 640 (20% reduction)
  maxHeight: 480, // Reduced from 600 to 480 (20% reduction)
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
 * Draws animated radiating circles on detected objects with description lines
 */
export const drawBoundingBoxes = (
  ctx: CanvasRenderingContext2D,
  boxes: BoundingBox[],
  selectedBoxIndices?: Set<number>
): void => {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  
  // Filter boxes based on selection (show all if none selected or only selected ones)
  const filteredBoxes = selectedBoxIndices && selectedBoxIndices.size > 0 
    ? boxes.filter((_, index) => selectedBoxIndices.has(index))
    : boxes;
  
  filteredBoxes.forEach((box, filteredIndex) => {
    // Find the original index for color consistency
    const originalIndex = boxes.findIndex(b => b === box);
    const color = DETECTION_COLORS[originalIndex % DETECTION_COLORS.length];

    // Scale coordinates from normalized format (0-1000) to canvas coordinates
    const normalizedX = box.x / 1000;
    const normalizedY = box.y / 1000;
    const normalizedWidth = box.width / 1000;
    const normalizedHeight = box.height / 1000;
    
    // Calculate center point of the detected object
    const centerX = (normalizedX + normalizedWidth / 2) * canvasWidth;
    const centerY = (normalizedY + normalizedHeight / 2) * canvasHeight;
    
    // Draw animated radiating circle
    drawRadiatingCircle(ctx, centerX, centerY, color, originalIndex);
    
    // Draw description line extending to the right
    drawDescriptionLine(ctx, centerX, centerY, box.label, color, originalIndex, canvasWidth);
  });
};

/**
 * Draws an animated radiating circle at the specified position
 */
const drawRadiatingCircle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  index: number
): void => {
  const time = Date.now() * 0.003; // Slow animation speed
  const baseRadius = 8;
  const pulseRadius = 4;
  
  // Create multiple concentric circles with different phases
  for (let i = 0; i < 3; i++) {
    const phase = (time + index * 0.5 + i * 0.8) % (Math.PI * 2);
    const radius = baseRadius + Math.sin(phase) * pulseRadius + i * 6;
    const alpha = 0.4 - i * 0.1;
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  // Draw solid center circle
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 1;
  ctx.fill();
};

/**
 * Draws a description line extending to the right with object label
 */
const drawDescriptionLine = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  label: string,
  color: string,
  index: number,
  canvasWidth: number
): void => {
  const rightMargin = 20;
  const lineEndX = canvasWidth - rightMargin;
  const verticalSpacing = 30;
  
  // Calculate description position (spread vertically on the right side)
  const descriptionY = 40 + (index * verticalSpacing);
  
  // Draw line from circle to description area
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(lineEndX - 150, descriptionY);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw description background
  const labelText = label.length > 20 ? label.substring(0, 20) + '...' : label;
  ctx.font = 'bold 12px Inter, system-ui, sans-serif';
  const textMetrics = ctx.measureText(labelText);
  const textWidth = textMetrics.width;
  const textHeight = 18;
  
  // Background rectangle
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(lineEndX - 150, descriptionY - textHeight/2, textWidth + 12, textHeight);
  
  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(labelText, lineEndX - 150 + 6, descriptionY);
  
  // Reset global alpha
  ctx.globalAlpha = 1;
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