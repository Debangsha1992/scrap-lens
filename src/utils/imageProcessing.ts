import { BoundingBox, ImageProcessingConfig } from '@/types/api';

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
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
];

/**
 * Validates image file type and size
 */
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  if (!IMAGE_CONFIG.supportedFormats.includes(file.type)) {
    return { 
      isValid: false, 
      error: `Unsupported file type. Please use: ${IMAGE_CONFIG.supportedFormats.join(', ')}` 
    };
  }

  // Check file size
  if (file.size > IMAGE_CONFIG.maxFileSize) {
    const maxSizeMB = IMAGE_CONFIG.maxFileSize / (1024 * 1024);
    return { 
      isValid: false, 
      error: `File too large. Maximum size is ${maxSizeMB}MB` 
    };
  }

  return { isValid: true };
};

/**
 * Calculates optimal canvas dimensions while maintaining aspect ratio
 */
export const calculateCanvasDimensions = (
  imageWidth: number, 
  imageHeight: number,
  maxWidth: number = IMAGE_CONFIG.maxWidth,
  maxHeight: number = IMAGE_CONFIG.maxHeight
): { width: number; height: number; scale: number } => {
  const aspectRatio = imageWidth / imageHeight;
  
  let width = imageWidth;
  let height = imageHeight;
  
  // Scale down if image is larger than max dimensions
  if (width > maxWidth || height > maxHeight) {
    if (aspectRatio > 1) {
      // Landscape
      width = Math.min(width, maxWidth);
      height = width / aspectRatio;
    } else {
      // Portrait
      height = Math.min(height, maxHeight);
      width = height * aspectRatio;
    }
  }
  
  const scale = width / imageWidth;
  
  return { width: Math.round(width), height: Math.round(height), scale };
};

/**
 * Draws animated radiating circles without labels for the main canvas
 */
export const drawRadiatingCircles = (
  ctx: CanvasRenderingContext2D,
  filteredBoxes: BoundingBox[],
  allBoxes: BoundingBox[]
): void => {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  
  // Only draw boxes that are in the filtered list
  const boxesToDraw = filteredBoxes.length > 0 
    ? filteredBoxes 
    : allBoxes;
  
  boxesToDraw.forEach((box) => {
    // Find the original index for color consistency
    const originalIndex = allBoxes.findIndex(b => b === box);
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
  
  // Reset global alpha
  ctx.globalAlpha = 1;
};

// Removed unused drawDescriptionLine function

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