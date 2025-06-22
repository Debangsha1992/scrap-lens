import { BoundingBox, SegmentationPolygon } from '@/types/api';
import { DETECTION_COLORS } from '@/utils/imageProcessing';

interface ObjectDetectionSummaryProps {
  boxes?: BoundingBox[];
  segments?: SegmentationPolygon[];
  selectedBoxIndices?: Set<number>;
  onToggleBox?: (index: number) => void;
}

/**
 * Component displaying detected objects or segmented regions in a grid layout
 * Shows object labels, positions, sizes, confidence scores, and pixel coverage
 */
export const ObjectDetectionSummary: React.FC<ObjectDetectionSummaryProps> = ({ 
  boxes = [], 
  segments = [], 
  selectedBoxIndices, 
  onToggleBox 
}) => {
  const hasObjects = boxes.length > 0 || segments.length > 0;
  const isSegmentation = segments.length > 0;
  const itemCount = isSegmentation ? segments.length : boxes.length;
  
  if (!hasObjects) return null;

  return (
    <div className="mt-6 p-5 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d={isSegmentation 
              ? "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              : "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            } 
          />
        </svg>
        <h4 className="font-semibold text-gray-800">
          {isSegmentation ? `Segmented Objects (${itemCount})` : `Detected Objects (${itemCount})`}
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {isSegmentation ? (
          segments.map((segment, index) => (
            <SegmentCard 
              key={`${segment.label}-${index}`} 
              segment={segment} 
              colorIndex={index} 
              isSelected={selectedBoxIndices?.has(index) || false}
              onToggle={() => onToggleBox?.(index)}
            />
          ))
        ) : (
          boxes.map((box, index) => (
            <ObjectCard 
              key={`${box.label}-${index}`} 
              box={box} 
              colorIndex={index} 
              isSelected={selectedBoxIndices?.has(index) || false}
              onToggle={() => onToggleBox?.(index)}
            />
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Individual object card component for bounding boxes
 */
interface ObjectCardProps {
  box: BoundingBox;
  colorIndex: number;
  isSelected: boolean;
  onToggle: () => void;
}

const ObjectCard: React.FC<ObjectCardProps> = ({ box, colorIndex, isSelected, onToggle }) => {
  const color = DETECTION_COLORS[colorIndex % DETECTION_COLORS.length];

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg shadow-sm border cursor-pointer transition-all hover:shadow-md ${
        isSelected 
          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
          : 'bg-white border-gray-100 hover:bg-gray-50'
      }`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
    >
      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 truncate" title={box.label}>
          {box.label.replace(/^plaintext\s*/i, "")}
        </div>
        <div className="text-xs text-gray-500">
          Position: ({box.x}, {box.y}) • Size: {box.width}×{box.height}
          {box.confidence && (
            <span className="ml-2 text-blue-600 font-medium">
              {(box.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      {isSelected && (
        <div className="text-blue-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

/**
 * Individual segment card component for segmentation polygons
 */
interface SegmentCardProps {
  segment: SegmentationPolygon;
  colorIndex: number;
  isSelected: boolean;
  onToggle: () => void;
}

const SegmentCard: React.FC<SegmentCardProps> = ({ segment, colorIndex, isSelected, onToggle }) => {
  const color = DETECTION_COLORS[colorIndex % DETECTION_COLORS.length];

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg shadow-sm border cursor-pointer transition-all hover:shadow-md ${
        isSelected 
          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
          : 'bg-white border-gray-100 hover:bg-gray-50'
      }`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
    >
      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 truncate" title={segment.label}>
          {segment.label.replace(/^plaintext\s*/i, "")}
        </div>
        <div className="text-xs text-gray-500">
          Polygon: {segment.points.length} points
          {segment.pixelCoverage !== undefined && (
            <span className="ml-2 text-green-600 font-medium">
              {segment.pixelCoverage.toFixed(1)}% coverage
            </span>
          )}
          {segment.confidence && (
            <span className="ml-2 text-blue-600 font-medium">
              {(segment.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      {isSelected && (
        <div className="text-blue-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}; 