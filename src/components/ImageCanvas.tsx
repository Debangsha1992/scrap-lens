import { useEffect, useRef, useCallback } from 'react';
import { BoundingBox } from '@/types/api';
import { calculateCanvasDimensions, DETECTION_COLORS } from '@/utils/imageProcessing';

interface ImageCanvasProps {
  imageUrl: string;
  boxes?: BoundingBox[];
  selectedBoxIndices?: Set<number>;
  className?: string;
}

/**
 * Canvas component for displaying images with side panel labels for object detection
 * Handles image rendering and object detection visualization with animations
 */
export const ImageCanvas: React.FC<ImageCanvasProps> = ({
  imageUrl,
  boxes = [],
  selectedBoxIndices = new Set(),
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Filter boxes based on selection
  const filteredBoxes = selectedBoxIndices && selectedBoxIndices.size > 0 
    ? boxes.filter((_, index) => selectedBoxIndices.has(index))
    : boxes;

  // Animation loop for radiating circles with connecting lines
  const animate = useCallback(() => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and redraw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Draw overlays for object detection
    if (filteredBoxes.length > 0) {
      // Draw animated radiating circles only (no labels on canvas)
      drawRadiatingCircles(ctx, filteredBoxes, boxes);
    }

    // Continue animation loop if there are boxes to animate
    if (filteredBoxes.length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [filteredBoxes, boxes]);

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cancel any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Calculate optimal canvas dimensions
      const { width, height } = calculateCanvasDimensions(
        img.naturalWidth,
        img.naturalHeight
      );

      canvas.width = width;
      canvas.height = height;

      // Store image reference for animation
      imageRef.current = img;

      // Start animation loop if there are boxes, otherwise draw static content
      if (filteredBoxes.length > 0) {
        animate();
      } else {
        // Clear and draw image
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Segmentation functionality removed
      }
    };

    img.onerror = () => {
      console.error('Failed to load image:', imageUrl);
    };

    img.src = imageUrl;

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [imageUrl, filteredBoxes, animate]);

  return (
    <div className={`flex gap-4 ${className} relative`}>
      {/* Image Canvas */}
      <div className="flex-shrink-0">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto rounded-lg shadow-md border border-gray-200"
          aria-label="Image analysis canvas with object detection overlays"
        />
      </div>

      {/* Side Panel for Labels */}
      {filteredBoxes.length > 0 && (
        <div className="flex-1 min-w-0 relative">
          <div className="space-y-4 p-4">
            {filteredBoxes.map((box) => {
              const originalIndex = boxes.findIndex(b => b === box);
              const color = DETECTION_COLORS[originalIndex % DETECTION_COLORS.length];
              return (
                <LabelCard
                  key={`${box.label}-${originalIndex}`}
                  box={box}
                  color={color}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Connecting Lines Overlay */}
      {filteredBoxes.length > 0 && (
        <ConnectingLinesOverlay
          boxes={filteredBoxes}
          allBoxes={boxes}
          canvasRef={canvasRef}
        />
      )}
    </div>
  );
};

/**
 * Draws animated radiating circles without labels
 */
const drawRadiatingCircles = (
  ctx: CanvasRenderingContext2D,
  filteredBoxes: BoundingBox[],
  allBoxes: BoundingBox[]
): void => {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  
  filteredBoxes.forEach((box) => {
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

/**
 * Overlay component that draws connecting lines from object centers to labels
 */
interface ConnectingLinesOverlayProps {
  boxes: BoundingBox[];
  allBoxes: BoundingBox[];
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const ConnectingLinesOverlay: React.FC<ConnectingLinesOverlayProps> = ({ boxes, allBoxes, canvasRef }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const drawLines = () => {
      if (!canvasRef.current || !overlayRef.current) return;

      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      
      // Clear previous lines
      overlay.innerHTML = '';
      
      // Create SVG element
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.pointerEvents = 'none';
      svg.style.overflow = 'visible';

      // Get the container element (the flex container)
      const container = overlay.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();

      // Find the label panel (the side panel containing labels)
      const labelPanel = container.querySelector('.flex-1.min-w-0.relative');
      if (!labelPanel) return;

      // Get all the actual label cards
      const labelCards = labelPanel.querySelectorAll('.flex.items-center.gap-2.p-2');

      boxes.forEach((box, filteredIndex) => {
        // Find the original index for color consistency
        const originalIndex = allBoxes.findIndex(b => b === box);
        const color = DETECTION_COLORS[originalIndex % DETECTION_COLORS.length];

        // Calculate object center position on canvas
        const normalizedX = box.x / 1000;
        const normalizedY = box.y / 1000;
        const normalizedWidth = box.width / 1000;
        const normalizedHeight = box.height / 1000;
        
        // Canvas coordinates relative to container
        const canvasLeft = canvasRect.left - containerRect.left;
        const canvasTop = canvasRect.top - containerRect.top;
        
        // Center of the object on canvas
        const centerX = canvasLeft + (normalizedX + normalizedWidth / 2) * canvasRect.width;
        const centerY = canvasTop + (normalizedY + normalizedHeight / 2) * canvasRect.height;
        
        // Get the actual label card element and its position
        const labelCard = labelCards[filteredIndex];
        if (!labelCard) return;

        const labelCardRect = labelCard.getBoundingClientRect();
        
        // Calculate label position relative to the container
        const labelLeft = labelCardRect.left - containerRect.left;
        const labelTop = labelCardRect.top - containerRect.top;
        const labelCenterY = labelTop + (labelCardRect.height / 2);
        
        // End position at the left edge center of the actual label card
        const endX = labelLeft;
        const endY = labelCenterY;

        // Create line element
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', centerX.toString());
        line.setAttribute('y1', centerY.toString());
        line.setAttribute('x2', endX.toString());
        line.setAttribute('y2', endY.toString());
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '2');
        line.setAttribute('opacity', '0.7');
        line.setAttribute('stroke-linecap', 'round');

        svg.appendChild(line);
      });

      overlay.appendChild(svg);
    };

    // Initial draw with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(drawLines, 100);

    // Update lines continuously
    const animationInterval = setInterval(drawLines, 100);

    // Handle resize
    const handleResize = () => {
      setTimeout(drawLines, 50);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(animationInterval);
      window.removeEventListener('resize', handleResize);
    };
  }, [boxes, allBoxes, canvasRef]);

  return (
    <div 
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
};

/**
 * Individual label card component positioned beside the image
 */
interface LabelCardProps {
  box: BoundingBox;
  color: string;
}

const LabelCard: React.FC<LabelCardProps> = ({ box, color }) => {
  return (
    <div
      className="flex items-center gap-2 p-2 bg-white rounded-md shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
      style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 text-sm truncate" title={box.label}>
          {box.label.replace(/^plaintext\s*/i, "")}
        </div>
      </div>
    </div>
  );
}; 