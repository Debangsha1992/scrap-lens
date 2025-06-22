import React from 'react';

interface ClickableTextProps {
  text: string;
  boxes: Array<{ label: string; x: number; y: number; width: number; height: number; confidence?: number }>;
  onToggleBox: (index: number) => void;
  className?: string;
}

/**
 * Component that renders text with clickable bounding box coordinates
 * Coordinates in the format [x, y, width, height] become clickable buttons
 */
export const ClickableText: React.FC<ClickableTextProps> = ({ 
  text, 
  boxes, 
  onToggleBox, 
  className = '' 
}) => {
  const parseAndMakeClickable = (text: string): React.ReactNode => {
    // Regex to match coordinate patterns like [x, y, width, height]
    const coordinateRegex = /\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]/g;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = coordinateRegex.exec(text)) !== null) {
      // Add text before the coordinate
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Parse the coordinates
      const [, x, y, width, height] = match;
      const coords = [parseInt(x), parseInt(y), parseInt(width), parseInt(height)];
      
      // Find matching box index
      const boxIndex = boxes.findIndex(box => 
        box.x === coords[0] && box.y === coords[1] && 
        box.width === coords[2] && box.height === coords[3]
      );

      if (boxIndex !== -1) {
        // Make clickable
        parts.push(
          <button
            key={`coord-${match.index}`}
            onClick={() => onToggleBox(boxIndex)}
            className="inline-flex items-center px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md text-xs font-mono cursor-pointer transition-colors border border-blue-300"
            title={`Click to toggle ${boxes[boxIndex].label} on image`}
          >
            [{coords.join(', ')}]
          </button>
        );
      } else {
        // Not clickable if no matching box found
        parts.push(
          <code key={`coord-${match.index}`} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono border">
            [{coords.join(', ')}]
          </code>
        );
      }

      lastIndex = coordinateRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <span className={className}>
      {parseAndMakeClickable(text)}
    </span>
  );
}; 