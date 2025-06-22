import { useEffect, useRef, useState } from 'react';
import { BoundingBox, SegmentationPolygon, SAM2Mask, SAM2Point, SAM2Box, SAM2Mode } from '@/types/api';
import { calculateCanvasDimensions, drawBoundingBoxes, drawSegmentationPolygons, drawSAM2Masks } from '@/utils/imageProcessing';

interface ImageCanvasProps {
  imageUrl: string;
  boxes?: BoundingBox[];
  segments?: SegmentationPolygon[];
  sam2Masks?: SAM2Mask[];
  className?: string;
  // SAM2 prompt props
  sam2Mode?: SAM2Mode;
  onPointClick?: (point: SAM2Point) => void;
  onBoxDraw?: (box: SAM2Box) => void;
  showPrompts?: boolean;
  points?: SAM2Point[];
  promptBoxes?: SAM2Box[];
}

/**
 * Canvas component for displaying images with bounding box, segmentation, or SAM 2 mask overlays
 * Handles image rendering and object detection/segmentation/SAM 2 visualization
 */
export const ImageCanvas: React.FC<ImageCanvasProps> = ({
  imageUrl,
  boxes = [],
  segments = [],
  sam2Masks = [],
  className = '',
  sam2Mode,
  onPointClick,
  onBoxDraw,
  showPrompts = false,
  points = [],
  promptBoxes = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingBox, setIsDrawingBox] = useState(false);
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [currentScale, setCurrentScale] = useState(1);

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('ImageCanvas: Loading image and overlays', {
      imageUrl,
      boxesCount: boxes.length,
      segmentsCount: segments.length,
      sam2MasksCount: sam2Masks.length
    });

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        console.log('ImageCanvas: Image loaded', {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        });

        // Calculate optimal canvas dimensions
        const { width, height, scale } = calculateCanvasDimensions(
          img.naturalWidth,
          img.naturalHeight
        );

        console.log('ImageCanvas: Canvas dimensions calculated', {
          width,
          height,
          scale
        });

        canvas.width = width;
        canvas.height = height;
        setCurrentScale(scale);

        // Clear and draw image first
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        console.log('ImageCanvas: Base image drawn, now drawing overlays...');

        // Draw overlays based on what data is available (priority: SAM 2 > segments > boxes)
        if (sam2Masks.length > 0) {
          console.log('ImageCanvas: Drawing SAM 2 masks...');
          console.log(`ImageCanvas: Processing ${sam2Masks.length} masks with improved overlap filtering`);
          await drawSAM2Masks(ctx, sam2Masks, scale);
          console.log('ImageCanvas: SAM 2 masks drawing completed with reduced overlaps');
        } else if (segments.length > 0) {
          console.log('ImageCanvas: Drawing segmentation polygons...');
          drawSegmentationPolygons(ctx, segments, scale);
        } else if (boxes.length > 0) {
          console.log('ImageCanvas: Drawing bounding boxes...');
          drawBoundingBoxes(ctx, boxes, scale);
        }

        // Draw SAM2 prompts if enabled
        if (showPrompts) {
          drawSAM2Prompts(ctx, points, promptBoxes, scale);
        }

        console.log('ImageCanvas: All overlays completed');
      } catch (error) {
        console.error('ImageCanvas: Error during rendering:', error);
      }
    };

    img.onerror = (error) => {
      console.error('ImageCanvas: Failed to load image:', imageUrl, error);
    };

    img.src = imageUrl;
  }, [imageUrl, boxes, segments, sam2Masks, showPrompts, points, promptBoxes]);

  const drawSAM2Prompts = (ctx: CanvasRenderingContext2D, points: SAM2Point[], boxes: SAM2Box[], scale: number) => {
    // Draw points
    points.forEach((point, index) => {
      ctx.fillStyle = '#ff0000';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x * scale, point.y * scale, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      // Add label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(`P${index + 1}`, point.x * scale + 8, point.y * scale - 8);
    });

    // Draw boxes
    boxes.forEach((box, index) => {
      const width = (box.x2 - box.x1) * scale;
      const height = (box.y2 - box.y1) * scale;
      
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x1 * scale, box.y1 * scale, width, height);
      
      // Add label
      ctx.fillStyle = '#00ff00';
      ctx.font = '12px Arial';
      ctx.fillText(`B${index + 1}`, box.x1 * scale, box.y1 * scale - 5);
    });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !showPrompts) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((event.clientX - rect.left) / currentScale);
    const y = Math.round((event.clientY - rect.top) / currentScale);

    if (sam2Mode === 'points' && onPointClick) {
      onPointClick({ x, y, label: 1 }); // Default to positive point
    } else if (sam2Mode === 'boxes') {
      if (!isDrawingBox) {
        // Start drawing box
        setIsDrawingBox(true);
        setBoxStart({ x, y });
      } else {
        // Finish drawing box
        if (boxStart && onBoxDraw) {
          onBoxDraw({
            x1: Math.min(boxStart.x, x),
            y1: Math.min(boxStart.y, y),
            x2: Math.max(boxStart.x, x),
            y2: Math.max(boxStart.y, y),
          });
        }
        setIsDrawingBox(false);
        setBoxStart(null);
      }
    }
  };

  const getOverlayType = () => {
    if (sam2Masks.length > 0) return 'SAM 2 masks';
    if (segments.length > 0) return 'segmentation';
    return 'object detection';
  };

  return (
    <canvas
      ref={canvasRef}
      className={`max-w-full h-auto rounded-lg shadow-md border border-gray-200 ${className} ${showPrompts ? 'cursor-crosshair' : ''}`}
      aria-label={`Image analysis canvas with ${getOverlayType()} overlays`}
      onClick={handleCanvasClick}
    />
  );
}; 