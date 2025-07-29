import { SegmentationPolygon } from '@/types/api';

/**
 * Parses segmentation polygon data from the AI response text
 * Looks for polygon coordinates in various formats
 */
export const parseSegmentationPolygons = (text: string): SegmentationPolygon[] => {
  const polygons: SegmentationPolygon[] = [];
  
  // Updated regex to match polygon coordinates in format like:
  // "Object Name: [[x1,y1],[x2,y2],[x3,y3],...]" or similar variations
  const polygonRegex = /(\w+(?:\s+\w+)*)\s*:?\s*\[?\[?(\d+(?:,\s*\d+)*(?:\],?\[?\d+(?:,\s*\d+)*)*)\]?\]?/g;
  
  let match;
  while ((match = polygonRegex.exec(text)) !== null) {
    const label = match[1].trim();
    const coordString = match[2];
    
    try {
      // Parse coordinate pairs
      const points = parseCoordinateString(coordString);
      
      if (points.length >= 3) { // A polygon needs at least 3 points
        polygons.push({
          label,
          points,
          confidence: 0.9, // Default confidence
        });
      }
    } catch (error) {
      console.warn(`Failed to parse polygon for ${label}:`, error);
    }
  }
  
  return polygons;
};

/**
 * Parses a coordinate string into an array of points
 */
const parseCoordinateString = (coordString: string): Array<{ x: number; y: number }> => {
  const points: Array<{ x: number; y: number }> = [];
  
  // Handle different coordinate formats
  const normalizedString = coordString.replace(/[\[\]]/g, '').trim();
  const pairs = normalizedString.split(/[,;]\s*/).filter(s => s.length > 0);
  
  for (let i = 0; i < pairs.length - 1; i += 2) {
    const x = parseInt(pairs[i].trim());
    const y = parseInt(pairs[i + 1].trim());
    
    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x, y });
    }
  }
  
  return points;
};

/**
 * Calculates the area of a polygon using the shoelace formula
 */
export const calculatePolygonArea = (points: Array<{ x: number; y: number }>): number => {
  if (points.length < 3) return 0;
  
  let area = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area) / 2;
};

/**
 * Calculates pixel coverage percentage for each segment
 */
export const calculatePixelCoverage = (
  segments: SegmentationPolygon[],
  imageWidth: number,
  imageHeight: number
): SegmentationPolygon[] => {
  const totalImagePixels = imageWidth * imageHeight;
  
  return segments.map(segment => ({
    ...segment,
    pixelCoverage: (calculatePolygonArea(segment.points) / totalImagePixels) * 100
  }));
};

/**
 * Validates a segmentation polygon
 */
export const validateSegmentationPolygon = (polygon: SegmentationPolygon): boolean => {
  if (!polygon.label || polygon.points.length < 3) {
    return false;
  }
  
  // Check if all points have valid coordinates
  return polygon.points.every(point => 
    typeof point.x === 'number' && 
    typeof point.y === 'number' && 
    !isNaN(point.x) && 
    !isNaN(point.y) &&
    point.x >= 0 && 
    point.y >= 0
  );
}; 