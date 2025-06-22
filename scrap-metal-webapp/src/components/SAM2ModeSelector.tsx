'use client';

import React from 'react';
import { SAM2Mode } from '@/types/api';

interface SAM2ModeSelectorProps {
  selectedMode: SAM2Mode;
  onModeChange: (mode: SAM2Mode) => void;
  disabled?: boolean;
}

const SAM2_MODE_OPTIONS = [
  { 
    value: 'everything' as const, 
    label: 'Segment Everything', 
    description: 'Automatically segment all objects in the image',
    icon: '🎯'
  },
  { 
    value: 'points' as const, 
    label: 'Point Prompts', 
    description: 'Click on objects to segment them',
    icon: '👆'
  },
  { 
    value: 'boxes' as const, 
    label: 'Box Prompts', 
    description: 'Draw boxes around objects to segment them',
    icon: '📦'
  },
];

export const SAM2ModeSelector: React.FC<SAM2ModeSelectorProps> = ({
  selectedMode,
  onModeChange,
  disabled = false,
}) => {
  const selectedOption = SAM2_MODE_OPTIONS.find(option => option.value === selectedMode);
  
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        SAM 2 Segmentation Mode
      </label>
      
      {/* Current Selection Display */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{selectedOption?.icon}</span>
          <span className="text-sm font-medium text-green-800">Current Mode:</span>
          <span className="text-sm font-semibold text-green-900">{selectedOption?.label}</span>
        </div>
        <p className="text-xs text-green-600 mt-1 ml-7">
          {selectedOption?.description}
        </p>
      </div>
      
      {/* Mode Selection */}
      <div className="space-y-2">
        {SAM2_MODE_OPTIONS.map((option) => (
          <label key={option.value} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="sam2Mode"
              value={option.value}
              checked={selectedMode === option.value}
              onChange={() => onModeChange(option.value)}
              disabled={disabled}
              className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500 disabled:opacity-50"
            />
            <div className="flex items-center gap-2 flex-1">
              <span className="text-lg">{option.icon}</span>
              <div>
                <span className="font-medium text-gray-700 text-sm">{option.label}</span>
                <p className="text-xs text-gray-500">{option.description}</p>
              </div>
            </div>
          </label>
        ))}
      </div>
      
      {/* Interactive Instructions */}
      {selectedMode === 'points' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-600">ℹ️</span>
            <span className="text-sm font-medium text-blue-800">How to use Point Mode:</span>
          </div>
          <p className="text-xs text-blue-600 ml-6">
            Click on objects in the image to segment them. Each click will create a new segmentation.
          </p>
        </div>
      )}
      
      {selectedMode === 'boxes' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-600">ℹ️</span>
            <span className="text-sm font-medium text-blue-800">How to use Box Mode:</span>
          </div>
          <p className="text-xs text-blue-600 ml-6">
            Draw bounding boxes around objects to segment them. Drag from corner to corner.
          </p>
        </div>
      )}
    </div>
  );
}; 