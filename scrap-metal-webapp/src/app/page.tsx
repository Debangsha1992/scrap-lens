'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { InputMethod, AnalysisMode, ModelType, SAM2Mode, SAM2Mask, SAM2Point, SAM2Box } from '@/types/api';
import { useImageAnalysis } from '@/hooks/useImageAnalysis';
import { useSAM2Segmentation } from '@/hooks/useSAM2Segmentation';
import { ImageCanvas } from '@/components/ImageCanvas';
import { ObjectDetectionSummary } from '@/components/ObjectDetectionSummary';
import { ImageInputCard } from '@/components/ImageInputCard';
import { RateLimitCounter } from '@/components/RateLimitCounter';
import { ModelSelector } from '@/components/ModelSelector';
import { SAM2ModeSelector } from '@/components/SAM2ModeSelector';
import { BoxSelectionProvider } from '@/context/BoxSelectionContext';
// import { SAM2PromptsCard } from '@/components/SAM2PromptsCard';

// Inline SAM2PromptsCard component for now
const SAM2PromptsCard: React.FC<{
  mode: SAM2Mode;
  points: SAM2Point[];
  boxes: SAM2Box[];
  onPointsChange: (points: SAM2Point[]) => void;
  onBoxesChange: (boxes: SAM2Box[]) => void;
}> = ({ mode, points, boxes, onPointsChange, onBoxesChange }) => {
  const [newPoint, setNewPoint] = useState({ x: '', y: '', label: 1 as 1 | 0 });
  const [newBox, setNewBox] = useState({ x1: '', y1: '', x2: '', y2: '' });

  const addPoint = () => {
    const x = parseInt(newPoint.x);
    const y = parseInt(newPoint.y);
    
    if (!isNaN(x) && !isNaN(y) && x >= 0 && y >= 0) {
      onPointsChange([...points, { x, y, label: newPoint.label }]);
      setNewPoint({ x: '', y: '', label: 1 });
    }
  };

  const addBox = () => {
    const x1 = parseInt(newBox.x1);
    const y1 = parseInt(newBox.y1);
    const x2 = parseInt(newBox.x2);
    const y2 = parseInt(newBox.y2);
    
    if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2) && 
        x1 >= 0 && y1 >= 0 && x2 > x1 && y2 > y1) {
      onBoxesChange([...boxes, { x1, y1, x2, y2 }]);
      setNewBox({ x1: '', y1: '', x2: '', y2: '' });
    }
  };

  const removePoint = (index: number) => {
    onPointsChange(points.filter((_, i) => i !== index));
  };

  const removeBox = (index: number) => {
    onBoxesChange(boxes.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    onPointsChange([]);
    onBoxesChange([]);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          SAM 2 {mode === 'points' ? 'Point' : 'Box'} Prompts
        </h3>
        {(points.length > 0 || boxes.length > 0) && (
          <button
            onClick={clearAll}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            Clear All
          </button>
        )}
      </div>

      {mode === 'points' && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-3">Add Point Prompt</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">X Coordinate</label>
                <input
                  type="number"
                  value={newPoint.x}
                  onChange={(e) => setNewPoint({ ...newPoint, x: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 100"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Y Coordinate</label>
                <input
                  type="number"
                  value={newPoint.y}
                  onChange={(e) => setNewPoint({ ...newPoint, y: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 150"
                  min="0"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-2">Point Type</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={newPoint.label === 1}
                    onChange={() => setNewPoint({ ...newPoint, label: 1 })}
                    className="mr-2"
                  />
                  <span className="text-sm text-green-600">✓ Positive (include)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={newPoint.label === 0}
                    onChange={() => setNewPoint({ ...newPoint, label: 0 })}
                    className="mr-2"
                  />
                  <span className="text-sm text-red-600">✗ Negative (exclude)</span>
                </label>
              </div>
            </div>
            <button
              onClick={addPoint}
              disabled={!newPoint.x || !newPoint.y}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Point
            </button>
          </div>

          {points.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Current Points ({points.length})</h4>
              <div className="space-y-2">
                {points.map((point, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${point.label === 1 ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm text-gray-700">
                        ({point.x}, {point.y}) - {point.label === 1 ? 'Positive' : 'Negative'}
                      </span>
                    </div>
                    <button
                      onClick={() => removePoint(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'boxes' && (
        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-3">Add Bounding Box</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Top-Left X</label>
                <input
                  type="number"
                  value={newBox.x1}
                  onChange={(e) => setNewBox({ ...newBox, x1: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 50"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Top-Left Y</label>
                <input
                  type="number"
                  value={newBox.y1}
                  onChange={(e) => setNewBox({ ...newBox, y1: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 50"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Bottom-Right X</label>
                <input
                  type="number"
                  value={newBox.x2}
                  onChange={(e) => setNewBox({ ...newBox, x2: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 200"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Bottom-Right Y</label>
                <input
                  type="number"
                  value={newBox.y2}
                  onChange={(e) => setNewBox({ ...newBox, y2: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 200"
                  min="0"
                />
              </div>
            </div>
            <button
              onClick={addBox}
              disabled={!newBox.x1 || !newBox.y1 || !newBox.x2 || !newBox.y2}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Bounding Box
            </button>
          </div>

          {boxes.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Current Boxes ({boxes.length})</h4>
              <div className="space-y-2">
                {boxes.map((box, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-700">
                      Box {index + 1}: ({box.x1}, {box.y1}) → ({box.x2}, {box.y2})
                      <div className="text-xs text-gray-500">
                        Size: {box.x2 - box.x1} × {box.y2 - box.y1} pixels
                      </div>
                    </div>
                    <button
                      onClick={() => removeBox(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Tip:</strong> {mode === 'points' 
            ? 'Click on the image to get coordinates, then add positive points for areas to include and negative points for areas to exclude.'
            : 'Define bounding boxes around objects you want to segment. Use image coordinates (top-left is 0,0).'
          }
        </p>
      </div>
    </div>
  );
};

const EXAMPLE_IMAGE_URL = 'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg';

/**
 * Main application component for AI image analysis
 * Provides file upload, URL input, object detection, segmentation, and SAM 2 capabilities
 */
export default function Home(): React.JSX.Element {
  // State management
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('detection');
  const [selectedModel, setSelectedModel] = useState<ModelType>('qwen-vl-max');
  const [sam2Mode, setSam2Mode] = useState<SAM2Mode>('everything');
  const [currentImage, setCurrentImage] = useState<string>('');
  const [inputMethod, setInputMethod] = useState<InputMethod>('file');
  const [selectedBoxIndices, setSelectedBoxIndices] = useState<Set<number>>(new Set());
  const [selectedMaskIndices, setSelectedMaskIndices] = useState<Set<number>>(new Set());
  const [sam2Points, setSam2Points] = useState<SAM2Point[]>([]);
  const [sam2Boxes, setSam2Boxes] = useState<SAM2Box[]>([]);

  // Hooks
  const { description, boxes, segments, usage, loading, error, rateLimitInfo, analyzeImage, clearResults } = useImageAnalysis();
  const { 
    masks: sam2Masks, 
    loading: sam2Loading, 
    error: sam2Error, 
    segmentImage: sam2SegmentImage, 
    clearResults: clearSam2Results,
    isServiceAvailable: sam2ServiceAvailable,
    checkServiceHealth: checkSam2Health
  } = useSAM2Segmentation();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Event handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setCurrentImage(previewUrl);
    clearResults();
    clearSam2Results();
  };

  const handleImageUrlChange = (url: string): void => {
    setImageUrl(url);
    if (url.trim()) {
      setCurrentImage(url.trim());
      setSelectedFile(null);
      clearResults();
      clearSam2Results();
    }
  };

  const handleAnalyze = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (analysisMode === 'sam2') {
      // Use SAM 2 for segmentation with prompts
      const points = sam2Mode === 'points' ? sam2Points : undefined;
      const boxes = sam2Mode === 'boxes' ? sam2Boxes : undefined;
      await sam2SegmentImage(selectedFile, imageUrl, sam2Mode, points, boxes);
    } else {
      // Use existing Qwen-VL analysis
      await analyzeImage(selectedFile, imageUrl, analysisMode, selectedModel);
    }
  };

  const handleExampleImage = (): void => {
    setImageUrl(EXAMPLE_IMAGE_URL);
    setCurrentImage(EXAMPLE_IMAGE_URL);
    setSelectedFile(null);
    setInputMethod('url');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearImage = (): void => {
    setImageUrl('');
    setSelectedFile(null);
    setCurrentImage('');
    clearResults();
    clearSam2Results();
    setSelectedBoxIndices(new Set());
    setSelectedMaskIndices(new Set());
    setSam2Points([]);
    setSam2Boxes([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleBoxSelection = (index: number): void => {
    setSelectedBoxIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.clear(); // Only show one box at a time
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleMaskSelection = (index: number): void => {
    setSelectedMaskIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.clear(); // Only show one mask at a time
        newSet.add(index);
      }
      return newSet;
    });
  };

  const clearBoxSelection = (): void => {
    setSelectedBoxIndices(new Set());
  };

  const clearMaskSelection = (): void => {
    setSelectedMaskIndices(new Set());
  };

  // Auto-trigger segmentation when points or boxes are added in SAM2 mode
  useEffect(() => {
    if (analysisMode === 'sam2' && currentImage && 
        ((sam2Mode === 'points' && sam2Points.length > 0) || 
         (sam2Mode === 'boxes' && sam2Boxes.length > 0))) {
      // Automatically trigger segmentation when prompts are added
      const points = sam2Mode === 'points' ? sam2Points : undefined;
      const boxes = sam2Mode === 'boxes' ? sam2Boxes : undefined;
      sam2SegmentImage(selectedFile, imageUrl, sam2Mode, points, boxes);
    }
  }, [sam2Points, sam2Boxes, sam2Mode, analysisMode, currentImage, selectedFile, imageUrl, sam2SegmentImage]);

  // Determine current loading state and error
  const isLoading = loading || sam2Loading;
  const currentError = error || sam2Error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-2 py-4 max-w-[95vw]">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Header />
        </motion.div>
        
        {/* Top Section - Input, Options, API Usage, and Analyze Button */}
        <motion.div 
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="grid xl:grid-cols-3 gap-4">
            <div className="xl:col-span-1">
              <ImageInputCard
                inputMethod={inputMethod}
                setInputMethod={setInputMethod}
                imageUrl={imageUrl}
                selectedFile={selectedFile}
                fileInputRef={fileInputRef}
                onFileSelect={handleFileSelect}
                onImageUrlChange={handleImageUrlChange}
                onExampleImage={handleExampleImage}
              />
            </div>
            
            <div className="xl:col-span-1">
              <OptionsCard
                analysisMode={analysisMode}
                selectedModel={selectedModel}
                sam2Mode={sam2Mode}
                sam2ServiceAvailable={sam2ServiceAvailable}
                onAnalysisModeChange={setAnalysisMode}
                onModelChange={setSelectedModel}
                onSam2ModeChange={setSam2Mode}
                onCheckSam2Health={checkSam2Health}
              />
              
              {analysisMode === 'sam2' && (sam2Mode === 'points' || sam2Mode === 'boxes') && (
                <SAM2PromptsCard
                  mode={sam2Mode}
                  points={sam2Points}
                  boxes={sam2Boxes}
                  onPointsChange={setSam2Points}
                  onBoxesChange={setSam2Boxes}
                />
              )}
            </div>
            
            <div className="xl:col-span-1 space-y-4">
              <RateLimitCounter
                remaining={rateLimitInfo?.remaining}
                total={10}
                resetTime={rateLimitInfo ? new Date(rateLimitInfo.resetTime).getTime() : undefined}
              />
              <ActionButtons
                loading={isLoading}
                hasInput={!!(selectedFile || imageUrl)}
                analysisMode={analysisMode}
                onAnalyze={handleAnalyze}
                onClearImage={clearImage}
              />
            </div>
          </div>
        </motion.div>
        
        {/* Main Content Section */}
        <BoxSelectionProvider
          boxes={analysisMode === 'detection' ? boxes : []}
          selectedBoxIndices={selectedBoxIndices}
          onToggleBox={toggleBoxSelection}
        >
          <motion.div 
            className="grid xl:grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Sticky Image Section - Spans Two Columns */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="xl:col-span-2"
            >
              <div className="sticky top-4">
                <ImageDisplayCard
                  currentImage={currentImage}
                  boxes={analysisMode === 'detection' ? boxes : []}
                  segments={analysisMode === 'segmentation' ? segments : []}
                  sam2Masks={analysisMode === 'sam2' ? sam2Masks : []}
                  analysisMode={analysisMode}
                  selectedBoxIndices={selectedBoxIndices}
                  selectedMaskIndices={selectedMaskIndices}
                  onToggleBox={toggleBoxSelection}
                  onToggleMask={toggleMaskSelection}
                  onClearSelection={analysisMode === 'sam2' ? clearMaskSelection : clearBoxSelection}
                  sam2Mode={sam2Mode}
                  sam2Points={sam2Points}
                  sam2Boxes={sam2Boxes}
                  onSam2PointsChange={setSam2Points}
                  onSam2BoxesChange={setSam2Boxes}
                />
              </div>
            </motion.div>
            
            {/* Scrollable Analysis Section - Right Column */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="xl:col-span-1"
            >
              <AnalysisSection
                loading={isLoading}
                error={currentError}
                description={description}
                usage={usage}
                boxes={analysisMode === 'detection' ? boxes : []}
                segments={analysisMode === 'segmentation' ? segments : []}
                sam2Masks={analysisMode === 'sam2' ? sam2Masks : []}
                selectedBoxIndices={selectedBoxIndices}
                selectedMaskIndices={selectedMaskIndices}
                onToggleMask={toggleMaskSelection}
              />
            </motion.div>
          </motion.div>
        </BoxSelectionProvider>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <InstructionsSection />
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Application header component
 */
const Header: React.FC = () => (
  <div className="text-center mb-6">
    <div className="inline-flex items-center gap-3 mb-3">
      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
        AI Image Analyzer
      </h1>
    </div>
    <p className="text-lg text-gray-600 mb-4">
      Powered by Alibaba Cloud Qwen-VL-Max with Object Detection & Segmentation
    </p>
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
      <span className="text-sm font-medium text-emerald-700">AI Ready</span>
    </div>
  </div>
);

/**
 * Analysis section props interface
 */
interface AnalysisSectionProps {
  loading: boolean;
  error: string;
  description: string;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  boxes: Array<{ label: string; x: number; y: number; width: number; height: number; confidence?: number }>;
  segments: Array<{ label: string; points: Array<{ x: number; y: number }>; confidence?: number; pixelCoverage?: number }>;
  sam2Masks: SAM2Mask[];
  selectedBoxIndices: Set<number>;
  selectedMaskIndices: Set<number>;
  onToggleMask: (index: number) => void;
}

/**
 * Analysis section for scrollable content
 */
const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  loading,
  error,
  description,
  usage,
  segments,
}) => (
  <div className="space-y-6">
    {loading && <LoadingCard />}
    {error && <ErrorCard error={error} />}
          {description && <AnalysisResultsCard description={description} usage={usage} segments={segments} />}
  </div>
);

const OptionsCard: React.FC<{ 
  analysisMode: AnalysisMode; 
  selectedModel: ModelType;
  sam2Mode: SAM2Mode;
  sam2ServiceAvailable: boolean;
  onAnalysisModeChange: (mode: AnalysisMode) => void; 
  onModelChange: (model: ModelType) => void;
  onSam2ModeChange: (mode: SAM2Mode) => void;
  onCheckSam2Health: () => Promise<boolean>;
}> = ({ 
  analysisMode, 
  selectedModel, 
  sam2Mode, 
  sam2ServiceAvailable,
  onAnalysisModeChange, 
  onModelChange, 
  onSam2ModeChange,
  onCheckSam2Health
}) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Analysis Options</h3>
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="analysisMode"
            value="detection"
            checked={analysisMode === 'detection'}
            onChange={() => onAnalysisModeChange('detection')}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
          />
          <div>
            <span className="font-medium text-gray-700">Object Detection</span>
            <p className="text-sm text-gray-500">Detect objects with bounding boxes and coordinates</p>
          </div>
        </label>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="analysisMode"
            value="segmentation"
            checked={analysisMode === 'segmentation'}
            onChange={() => onAnalysisModeChange('segmentation')}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
          />
          <div>
            <span className="font-medium text-gray-700">Segmentation (Qwen-VL)</span>
            <p className="text-sm text-gray-500">Segment objects with precise boundaries and pixel coverage</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="analysisMode"
            value="sam2"
            checked={analysisMode === 'sam2'}
            onChange={() => onAnalysisModeChange('sam2')}
            className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">SAM 2 Segmentation</span>
              <div className={`w-2 h-2 rounded-full ${sam2ServiceAvailable ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className={`text-xs ${sam2ServiceAvailable ? 'text-green-600' : 'text-red-600'}`}>
                {sam2ServiceAvailable ? 'Available' : 'Offline'}
              </span>
            </div>
            <p className="text-sm text-gray-500">High-precision segmentation using Meta&apos;s SAM 2</p>
            {!sam2ServiceAvailable && (
              <button
                onClick={onCheckSam2Health}
                className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
              >
                Check Service Status
              </button>
            )}
          </div>
        </label>
      </div>
      
      {analysisMode === 'detection' && (
        <div className="pt-2 border-t border-gray-200">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            disabled={false}
          />
        </div>
      )}

      {analysisMode === 'sam2' && (
        <div className="pt-2 border-t border-gray-200">
          <SAM2ModeSelector
            selectedMode={sam2Mode}
            onModeChange={onSam2ModeChange}
            disabled={!sam2ServiceAvailable}
          />
        </div>
      )}
    </div>
  </div>
);

const ActionButtons: React.FC<{
  loading: boolean;
  hasInput: boolean;
  analysisMode: AnalysisMode;
  onAnalyze: (e: React.FormEvent) => void;
  onClearImage: () => void;
}> = ({ loading, hasInput, analysisMode, onAnalyze, onClearImage }) => (
  <div className="flex gap-3">
    <button
      onClick={onAnalyze}
      disabled={loading || !hasInput}
      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Analyzing...
        </span>
      ) : (
        `🔍 ${analysisMode === 'segmentation' ? 'Segment Image' : 'Detect Objects'}`
      )}
    </button>
    
    {hasInput && (
      <button
        onClick={onClearImage}
        className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
      >
        ✕
      </button>
    )}
  </div>
);

const ImageDisplayCard: React.FC<{
  currentImage: string;
  boxes: Array<{ label: string; x: number; y: number; width: number; height: number; confidence?: number }>;
  segments: Array<{ label: string; points: Array<{ x: number; y: number }>; confidence?: number; pixelCoverage?: number }>;
  sam2Masks: SAM2Mask[];
  analysisMode: AnalysisMode;
  selectedBoxIndices: Set<number>;
  selectedMaskIndices: Set<number>;
  onToggleBox: (index: number) => void;
  onToggleMask: (index: number) => void;
  onClearSelection: () => void;
  sam2Mode: SAM2Mode;
  sam2Points: SAM2Point[];
  sam2Boxes: SAM2Box[];
  onSam2PointsChange: (points: SAM2Point[]) => void;
  onSam2BoxesChange: (boxes: SAM2Box[]) => void;
}> = ({ currentImage, boxes, segments, sam2Masks, analysisMode, selectedBoxIndices, selectedMaskIndices, onToggleBox, onToggleMask, onClearSelection, sam2Mode, sam2Points, sam2Boxes, onSam2PointsChange, onSam2BoxesChange }) => {
  const hasResults = (analysisMode === 'detection' && boxes.length > 0) || 
                     (analysisMode === 'segmentation' && segments.length > 0) ||
                     (analysisMode === 'sam2' && sam2Masks.length > 0);
  
  const getDisplayTitle = () => {
    if (analysisMode === 'sam2') return 'SAM 2 Segmentation';
    if (analysisMode === 'segmentation') return 'Segmentation';
    return 'Object Detection';
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Image {hasResults && `+ ${getDisplayTitle()}`}
        </h3>
        {(selectedBoxIndices.size > 0 || selectedMaskIndices.size > 0) && (
          <button
            onClick={onClearSelection}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Show All {analysisMode === 'sam2' ? 'Masks' : analysisMode === 'segmentation' ? 'Segments' : 'Boxes'}
          </button>
        )}
      </div>
      <div className="flex justify-center">
        <ImageCanvas 
          imageUrl={currentImage} 
          boxes={analysisMode === 'detection' ? (selectedBoxIndices.size > 0 ? boxes.filter((_, index) => selectedBoxIndices.has(index)) : boxes) : []}
          segments={analysisMode === 'segmentation' ? (selectedBoxIndices.size > 0 ? segments.filter((_, index) => selectedBoxIndices.has(index)) : segments) : []}
          sam2Masks={analysisMode === 'sam2' ? (selectedMaskIndices.size > 0 ? sam2Masks.filter((_, index) => selectedMaskIndices.has(index)) : sam2Masks) : []}
          sam2Mode={sam2Mode}
          showPrompts={analysisMode === 'sam2' && (sam2Mode === 'points' || sam2Mode === 'boxes')}
          points={sam2Points}
          promptBoxes={sam2Boxes}
          onPointClick={(point) => onSam2PointsChange([...sam2Points, point])}
          onBoxDraw={(box) => onSam2BoxesChange([...sam2Boxes, box])}
        />
      </div>
      <ObjectDetectionSummary 
        boxes={analysisMode === 'detection' ? boxes : []}
        segments={analysisMode === 'segmentation' ? segments : []}
        selectedBoxIndices={selectedBoxIndices}
        onToggleBox={onToggleBox}
      />
      {analysisMode === 'sam2' && sam2Masks.length > 0 && (
        <div className="mt-4">
          <h4 className="text-md font-semibold text-gray-700 mb-2">SAM 2 Masks ({sam2Masks.length})</h4>
          <div className="grid grid-cols-2 gap-2">
            {sam2Masks.map((mask, index) => {
              const totalArea = sam2Masks.reduce((sum, m) => sum + m.area, 0);
              const areaPercentage = totalArea > 0 ? (mask.area / totalArea * 100) : 0;
              const isSelected = selectedMaskIndices.has(index);
              
              return (
                <div 
                  key={mask.id} 
                  className={`rounded-lg p-2 cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'bg-blue-100 border-2 border-blue-400 shadow-md' 
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                  onClick={() => onToggleMask(index)}
                >
                  <div className="text-xs text-gray-600">
                    Mask {mask.id + 1} - Score: {(mask.score * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    Area: {mask.area.toLocaleString()} pixels
                  </div>
                  <div className="text-xs text-gray-500">
                    Coverage: {areaPercentage.toFixed(1)}% of total masks
                  </div>
                  {isSelected && (
                    <div className="text-xs text-blue-600 font-medium mt-1">
                      ✓ Selected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const LoadingCard: React.FC = () => (
  <motion.div 
    className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center justify-center space-x-2">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      <motion.span 
        className="text-lg text-gray-600"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Analyzing image(s)...
      </motion.span>
    </div>
  </motion.div>
);

const ErrorCard: React.FC<{ error: string }> = ({ error }) => (
  <motion.div 
    className="bg-red-50 border border-red-200 rounded-2xl p-6"
    initial={{ opacity: 0, scale: 0.95, x: -20 }}
    animate={{ opacity: 1, scale: 1, x: 0 }}
    transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
  >
    <div className="flex items-center gap-3">
      <motion.div 
        className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center"
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </motion.div>
      <div>
        <h3 className="font-semibold text-red-800">Analysis Failed</h3>
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    </div>
  </motion.div>
);

const AnalysisResultsCard: React.FC<{
  description: string;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  segments: Array<{ label: string; points: Array<{ x: number; y: number }>; confidence?: number; pixelCoverage?: number }>;
}> = ({ description, usage, segments }) => {

  return (
    <motion.div 
      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
    >
      <motion.div 
        className="flex items-center gap-3 mb-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <motion.div 
          className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a9 9 0 117.072 0l-.548.547A3.374 3.374 0 0014.846 21H9.154a3.374 3.374 0 00-2.53-1.098l-.548-.549z" />
          </svg>
        </motion.div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">AI Analysis</h3>
          <p className="text-xs text-gray-600">
            {segments.length > 0 ? 'Detailed segmentation and pixel coverage' : 'Detailed object detection and description'}
          </p>
        </div>
      </motion.div>
      
      <div className="prose prose-slate max-w-none text-gray-700 leading-relaxed text-sm">
        <div 
          dangerouslySetInnerHTML={{ 
            __html: description
              .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>')
              .replace(/### (.*?)(\n|$)/g, '<h3 class="text-base font-semibold text-gray-800 mt-4 mb-2 flex items-center gap-2"><span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>$1</h3>')
              .replace(/#### (.*?)(\n|$)/g, '<h4 class="text-sm font-medium text-gray-700 mt-3 mb-1">$1</h4>')
              .replace(/^\* (.*?)(\n|$)/gm, '<li class="text-gray-600 text-sm ml-4">$1</li>')
              .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 rounded p-2 overflow-x-auto my-2"><code>$1</code></pre>')
              .replace(/((\[\d+,\s*\d+\](,?\s*)?)+)/g, '<pre class="bg-gray-100 rounded p-2 overflow-x-auto my-2"><code>$1</code></pre>')
              .replace(/\n\n/g, '</p><p class="mb-2 text-gray-700 leading-relaxed text-sm">')
              .replace(/^(?!<[hlp])/gm, '<p class="mb-2 text-gray-700 leading-relaxed text-sm">')
              .replace(/$(?!<\/p>)/gm, '</p>')
          }}
        />
      </div>
      
      {usage && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-600 mb-2">API Usage</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-sm font-bold text-gray-800">{isNaN(usage.prompt_tokens || 0) ? 0 : (usage.prompt_tokens || 0)}</div>
              <div className="text-xs text-gray-500">Prompt</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-sm font-bold text-gray-800">{isNaN(usage.completion_tokens || 0) ? 0 : (usage.completion_tokens || 0)}</div>
              <div className="text-xs text-gray-500">Response</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="text-sm font-bold text-blue-600">{isNaN(usage.total_tokens || 0) ? 0 : (usage.total_tokens || 0)}</div>
              <div className="text-xs text-blue-500">Total</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const InstructionsSection: React.FC = () => (
  <div className="mt-12 bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
    <h3 className="text-xl font-semibold text-gray-800 mb-4">How to Use</h3>
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h4 className="font-medium text-gray-700 mb-2">📁 File Upload</h4>
        <ul className="space-y-1 text-gray-600 text-sm">
          <li>• Upload images directly from your device</li>
          <li>• Supports JPEG, PNG, WebP, GIF (up to 10MB)</li>
          <li>• Drag & drop or click to browse</li>
        </ul>
      </div>
      <div>
        <h4 className="font-medium text-gray-700 mb-2">🔗 URL Input</h4>
        <ul className="space-y-1 text-gray-600 text-sm">
          <li>• Enter any publicly accessible image URL</li>
          <li>• Use the example image for testing</li>
          <li>• Perfect for online images</li>
        </ul>
      </div>
      <div>
        <h4 className="font-medium text-gray-700 mb-2">🎯 Object Detection</h4>
        <ul className="space-y-1 text-gray-600 text-sm">
          <li>• Detect objects with bounding boxes</li>
          <li>• Shows exact coordinates and sizes</li>
          <li>• Click objects to highlight in analysis</li>
        </ul>
      </div>
      <div>
        <h4 className="font-medium text-gray-700 mb-2">🧩 Segmentation</h4>
        <ul className="space-y-1 text-gray-600 text-sm">
          <li>• Precise object boundaries with polygons</li>
          <li>• Calculate pixel coverage percentages</li>
          <li>• Perfect for detailed analysis</li>
        </ul>
      </div>
    </div>
  </div>
);
