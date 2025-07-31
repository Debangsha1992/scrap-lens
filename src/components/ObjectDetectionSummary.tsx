import { BoundingBox } from '@/types/api';
import { DETECTION_COLORS } from '@/utils/imageProcessing';

interface ObjectDetectionSummaryProps {
  boxes?: BoundingBox[];
  selectedBoxIndices?: Set<number>;
  onToggleBox?: (index: number) => void;
}

/**
 * Component displaying detected objects in a grid layout
 * Shows object labels, positions, sizes, and confidence scores
 */
export const ObjectDetectionSummary: React.FC<ObjectDetectionSummaryProps> = ({ 
  boxes = [], 
  selectedBoxIndices, 
  onToggleBox 
}) => {
  const hasObjects = boxes.length > 0;
  
  if (!hasObjects) return null;

  return (
    <div className="mt-6 p-5 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <h4 className="font-semibold text-gray-800">
          Detected Objects ({boxes.length})
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {boxes.map((box, index) => (
          <ObjectCard 
            key={`${box.label}-${index}`} 
            box={box} 
            colorIndex={index}
            isSelected={selectedBoxIndices?.has(index) || false}
            onToggle={() => onToggleBox?.(index)}
          />
        ))}
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
      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: color }}
            />
            <div className="font-medium text-gray-800 truncate" title={box.label}>
              {box.label.replace(/^plaintext\s*/i, "")}
            </div>
          </div>
          
          <div className="text-xs text-gray-500 space-y-1">
            <div>Position: ({Math.round(box.x)}, {Math.round(box.y)})</div>
            <div>Size: {Math.round(box.width)} × {Math.round(box.height)}</div>
            {box.confidence && (
              <div className="font-medium text-green-600">
                {(box.confidence * 100).toFixed(0)}% confidence
              </div>
            )}
          </div>
        </div>
        
        <div className="ml-2 flex-shrink-0">
          <div className={`w-4 h-4 rounded border-2 ${
            isSelected 
              ? 'bg-blue-500 border-blue-500' 
              : 'border-gray-300'
          }`}>
            {isSelected && (
              <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};