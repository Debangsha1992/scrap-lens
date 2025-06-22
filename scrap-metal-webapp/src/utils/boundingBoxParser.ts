import { BoundingBox } from '@/types/api';

/**
 * Parses bounding box coordinates from AI response text
 * Supports multiple coordinate formats and labeled objects
 */
export const parseBoundingBoxes = (description: string): BoundingBox[] => {
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
        boxes.push({
          label: cleanLabel,
          x: parseInt(x, 10),
          y: parseInt(y, 10),
          width: parseInt(width, 10),
          height: parseInt(height, 10),
          confidence: 0.85,
        });
      }
    });

    // Also look for object descriptions followed by coordinates on the same line
    // Pattern: ObjectName at `[x, y, width, height]` or ObjectName located at `[x, y, width, height]`
    const objectAtCoordinateRegex = /([A-Za-z][A-Za-z\s]+?)(?:\s+(?:at|located at|positioned at|found at))\s+`\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]`/g;
    const objectMatches = Array.from(description.matchAll(objectAtCoordinateRegex));

    objectMatches.forEach((match) => {
      const [, label, x, y, width, height] = match;
      const cleanLabel = sanitizeLabel(label);
      
      // Check if this object isn't already added and is a valid object
      if (isValidObjectLabel(cleanLabel) && !boxes.some(box => box.label === cleanLabel)) {
        boxes.push({
          label: cleanLabel,
          x: parseInt(x, 10),
          y: parseInt(y, 10),
          width: parseInt(width, 10),
          height: parseInt(height, 10),
          confidence: 0.8,
        });
      }
    });

    return boxes;
  } catch (parseError) {
    console.error('Error parsing bounding box data from text:', parseError);
    return [];
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
    'bounding box coordinate',
    'coordinates',
    'coordinate',
    'position',
    'location',
    'bbox',
    'box coordinates',
    'object coordinates',
    'detection coordinates',
    'coordinate data',
    'coordinate information'
  ];
  
  const normalizedLabel = label.toLowerCase().trim();
  
  // Filter out generic coordinate references
  if (invalidLabels.includes(normalizedLabel)) {
    return false;
  }
  
  // Filter out very short labels that are likely not real objects
  if (normalizedLabel.length < 3) {
    return false;
  }
  
  // Filter out labels that are just numbers or coordinates
  if (/^\d+$/.test(normalizedLabel) || /^[\d\s,\[\]]+$/.test(normalizedLabel)) {
    return false;
  }
  
  return true;
};

/**
 * Validates parsed bounding box coordinates
 */
export const validateBoundingBox = (box: BoundingBox): boolean => {
  return (
    box.x >= 0 &&
    box.y >= 0 &&
    box.width > 0 &&
    box.height > 0 &&
    box.label.length > 0
  );
}; 