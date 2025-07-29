import { BoundingBox } from '@/types/api';

/**
 * Parses bounding box coordinates from AI response text
 * Returns coordinates in normalized format (0-1000) - scaling is handled by ImageCanvas
 */
export const parseBoundingBoxes = (
  description: string
): BoundingBox[] => {
  const boxes: BoundingBox[] = [];

  try {
    // Look for labeled coordinates only - coordinates that follow a clear object label
    // Pattern: **ObjectName**: `[x, y, width, height]` or similar variations
    const labeledCoordinateRegex = /\*\*([^*]+)\*\*[^`]*`\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]`(?:\s*\([^)]+\))?/g;
    const labelMatches = Array.from(description.matchAll(labeledCoordinateRegex));

    // Extract from labeled matches only
    labelMatches.forEach((match) => {
      const [, label, x, y, width, height] = match;
      const cleanLabel = sanitizeLabel(label);
      
      // Filter out generic coordinate references that aren't actual objects
      if (isValidObjectLabel(cleanLabel)) {
        // Keep coordinates in normalized format (0-1000) - ImageCanvas will handle scaling
        const box: BoundingBox = {
          label: cleanLabel,
          x: parseInt(x, 10),
          y: parseInt(y, 10),
          width: parseInt(width, 10),
          height: parseInt(height, 10),
          confidence: extractConfidence(description, cleanLabel)
        };
        
        boxes.push(box);
      }
    });

    // Fallback: Look for alternative coordinate patterns
    if (boxes.length === 0) {
      const alternativeRegex = /([^[\]]+)\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]/g;
      const altMatches = Array.from(description.matchAll(alternativeRegex));
      
      altMatches.forEach((match) => {
        const [, label, x, y, width, height] = match;
        const cleanLabel = sanitizeLabel(label);
        
        if (isValidObjectLabel(cleanLabel)) {
          const box: BoundingBox = {
            label: cleanLabel,
            x: parseInt(x, 10),
            y: parseInt(y, 10),
            width: parseInt(width, 10),
            height: parseInt(height, 10),
            confidence: extractConfidence(description, cleanLabel)
          };
          
          boxes.push(box);
        }
      });
    }

    return boxes;
  } catch (error) {
    console.error('Error parsing bounding boxes:', error);
    return [];
  }
};

/**
 * Extracts confidence score for a given label from the description
 */
const extractConfidence = (description: string, label: string): number => {
  try {
    // Escape special regex characters in the label
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Look for confidence patterns like (85.0%) or 85% near the label
    const confidenceRegex = new RegExp(`${escapedLabel}[^()]*\\(?(\\d+(?:\\.\\d+)?)%\\)?`, 'i');
    const match = description.match(confidenceRegex);
    
    if (match) {
      const confidence = parseFloat(match[1]);
      return confidence / 100; // Convert to 0-1 range
    }
    
    return 0.8; // Default confidence if not found
  } catch (error) {
    console.warn('Error extracting confidence for label:', label, error);
    return 0.8; // Default confidence on error
  }
};

/**
 * Sanitizes label text by removing trailing numbers and extra whitespace
 */
const sanitizeLabel = (label: string): string => {
  return label.replace(/\d+$/, '').trim();
};

/**
 * Validates if a label represents an actual object rather than coordinate metadata
 */
const isValidObjectLabel = (label: string): boolean => {
  const invalidLabels = [
    'bounding box coordinates',
    'coordinates',
    'position',
    'location',
    'box',
    'coordinate',
    'summary',
    'objects',
    'their',
    'analysis',
    'covers',
    'visible',
    'image',
    'along',
    'with',
    'respective',
    'this',
    'overall scene',
    'scene',
    'overall',
    'background',
    'setting',
    'environment',
    'context',
    'photo',
    'picture',
    'general scene',
    'main scene',
    'entire scene',
    'full scene',
    'complete scene',
    'whole scene',
    'scene description',
    'scene analysis'
  ];
  
  const cleanLabel = label.toLowerCase().trim();
  
  // Remove common prefixes that might interfere with filtering
  const cleanedLabel = cleanLabel
    .replace(/^plaintext\s*/i, '')
    .replace(/^text\s*/i, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/^[-*]\s*/, '')
    .trim();
  
  // Filter out invalid labels using multiple matching strategies
  const isInvalid = invalidLabels.some(unwanted => 
    cleanedLabel === unwanted || 
    cleanedLabel.includes(unwanted) ||
    cleanedLabel.startsWith(unwanted) ||
    cleanedLabel.endsWith(unwanted)
  );
  
  if (isInvalid) {
    return false;
  }
  
  // Must be at least 2 characters and contain letters
  if (cleanedLabel.length < 2 || !/[a-z]/.test(cleanedLabel)) {
    return false;
  }
  
  return true;
};

/**
 * Validates a bounding box object
 */
export const validateBoundingBox = (box: BoundingBox): boolean => {
  return (
    !!box.label &&
    box.label.length > 0 &&
    typeof box.x === 'number' &&
    typeof box.y === 'number' &&
    typeof box.width === 'number' &&
    typeof box.height === 'number' &&
    box.x >= 0 &&
    box.y >= 0 &&
    box.width > 0 &&
    box.height > 0 &&
    box.x <= 1000 &&
    box.y <= 1000 &&
    box.width <= 1000 &&
    box.height <= 1000
  );
}; 