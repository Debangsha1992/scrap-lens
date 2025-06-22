#!/usr/bin/env python3
"""
SAM 2 Predictor Class
Handles model loading, inference, and different segmentation modes
"""

import os
import logging
from typing import List, Dict, Any, Optional, Tuple
import asyncio
from pathlib import Path

import numpy as np
import torch
from PIL import Image
import requests
from tqdm import tqdm

logger = logging.getLogger(__name__)

class SAM2Predictor:
    """SAM 2 Predictor for image segmentation"""
    
    def __init__(self, model_size: str = "tiny"):
        """
        Initialize SAM 2 Predictor
        
        Args:
            model_size: Model size ('tiny', 'small', 'base_plus', 'large')
        """
        self.model_size = model_size
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.predictor = None
        
        # Model configurations
        self.model_configs = {
            "tiny": {
                "config": "sam2_hiera_t.yaml",
                "checkpoint": "sam2_hiera_tiny.pt",
                "url": "https://dl.fbaipublicfiles.com/segment_anything_2/072824/sam2_hiera_tiny.pt"
            },
            "small": {
                "config": "sam2_hiera_s.yaml", 
                "checkpoint": "sam2.1_hiera_small.pt",
                "url": "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_small.pt"
            },
            "base_plus": {
                "config": "sam2_hiera_b+.yaml",
                "checkpoint": "sam2.1_hiera_base_plus.pt", 
                "url": "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_base_plus.pt"
            },
            "large": {
                "config": "sam2_hiera_l.yaml",
                "checkpoint": "sam2.1_hiera_large.pt",
                "url": "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt"
            }
        }
        
        # Create models directory
        self.models_dir = Path(__file__).parent.parent / "models"
        self.models_dir.mkdir(exist_ok=True)
        
        logger.info(f"Initialized SAM 2 Predictor with {model_size} model on {self.device}")
    
    async def download_model(self, url: str, filename: str) -> Path:
        """Download model checkpoint if not exists"""
        
        model_path = self.models_dir / filename
        
        if model_path.exists():
            logger.info(f"Model {filename} already exists")
            return model_path
        
        logger.info(f"Downloading {filename} from {url}")
        
        def _download():
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            
            with open(model_path, 'wb') as f:
                with tqdm(total=total_size, unit='B', unit_scale=True, desc=filename) as pbar:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                            pbar.update(len(chunk))
            
            return model_path
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _download)
    
    async def load_model(self):
        """Load SAM 2 model"""
        try:
            # Import SAM 2 modules (assuming they're installed)
            try:
                from sam2.build_sam import build_sam2
                from sam2.sam2_image_predictor import SAM2ImagePredictor
            except ImportError:
                logger.error("SAM 2 not installed. Please install from: https://github.com/facebookresearch/segment-anything-2")
                raise ImportError("SAM 2 package not found")
            
            # Get model configuration
            if self.model_size not in self.model_configs:
                raise ValueError(f"Invalid model size: {self.model_size}")
            
            config = self.model_configs[self.model_size]
            
            # Download model checkpoint
            checkpoint_path = await self.download_model(
                config["url"], 
                config["checkpoint"]
            )
            
            # Build model
            logger.info("Building SAM 2 model...")
            self.model = build_sam2(
                config_file=config["config"],
                ckpt_path=str(checkpoint_path),
                device=self.device
            )
            
            # Create predictor
            self.predictor = SAM2ImagePredictor(self.model)
            
            logger.info(f"SAM 2 {self.model_size} model loaded successfully!")
            
        except Exception as e:
            logger.error(f"Failed to load SAM 2 model: {e}")
            raise
    
    def segment_everything(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Segment everything in the image
        
        Args:
            image: Input image as numpy array (H, W, 3)
            
        Returns:
            Dictionary with masks and scores
        """
        if not self.predictor:
            raise RuntimeError("Model not loaded")
        
        try:
            # Import automatic mask generator
            from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator
            
            # Create mask generator with balanced parameters for better coverage
            mask_generator = SAM2AutomaticMaskGenerator(
                model=self.model,
                points_per_side=28,  # Moderate increase for better coverage
                pred_iou_thresh=0.65,  # Balanced threshold for quality vs coverage
                stability_score_thresh=0.88,  # Balanced stability threshold
                box_nms_thresh=0.65,  # Moderate NMS for better coverage
                crop_n_layers=1,  # Keep crop layers for better coverage
                crop_nms_thresh=0.65,  # Moderate NMS between crops
                min_mask_region_area=200,  # Balanced minimum area
                multimask_output=True,  # Enable multiple masks per point
            )
            
            # Generate masks
            masks = mask_generator.generate(image)
            
            # Post-process to remove overlapping masks
            filtered_masks = self._filter_overlapping_masks(masks)
            
            # Sort by score and limit number of masks
            filtered_masks.sort(key=lambda x: x['predicted_iou'], reverse=True)
            max_masks = 25  # Increased to 25 masks for better coverage
            filtered_masks = filtered_masks[:max_masks]
            
            # Extract masks and scores
            result_masks = []
            result_scores = []
            
            for mask_data in filtered_masks:
                result_masks.append(mask_data['segmentation'])
                result_scores.append(mask_data['predicted_iou'])
            
            logger.info(f"Generated {len(result_masks)} masks after filtering (from {len(masks)} original)")
            
            return {
                'masks': result_masks,
                'scores': result_scores
            }
            
        except Exception as e:
            logger.error(f"Error in segment_everything: {e}")
            raise
    
    def _filter_overlapping_masks(self, masks: List[Dict]) -> List[Dict]:
        """
        Filter out overlapping masks using IoU threshold
        
        Args:
            masks: List of mask dictionaries from SAM2
            
        Returns:
            Filtered list of masks with reduced overlaps
        """
        if len(masks) <= 1:
            return masks
        
        # Sort masks by predicted IoU (quality) in descending order
        sorted_masks = sorted(masks, key=lambda x: x['predicted_iou'], reverse=True)
        
        filtered_masks = []
        overlap_threshold = 0.6  # IoU threshold for considering masks as overlapping (balanced)
        
        for current_mask in sorted_masks:
            current_segmentation = current_mask['segmentation']
            
            # Check if current mask overlaps significantly with any already selected mask
            is_overlapping = False
            
            for selected_mask in filtered_masks:
                selected_segmentation = selected_mask['segmentation']
                
                # Calculate IoU between current and selected mask
                iou = self._calculate_mask_iou(current_segmentation, selected_segmentation)
                
                if iou > overlap_threshold:
                    is_overlapping = True
                    break
            
            # Only add mask if it doesn't overlap significantly with existing masks
            if not is_overlapping:
                filtered_masks.append(current_mask)
        
        return filtered_masks
    
    def _calculate_mask_iou(self, mask1: np.ndarray, mask2: np.ndarray) -> float:
        """
        Calculate Intersection over Union (IoU) between two binary masks
        
        Args:
            mask1: First binary mask
            mask2: Second binary mask
            
        Returns:
            IoU value between 0 and 1
        """
        try:
            # Ensure masks are boolean
            mask1_bool = mask1.astype(bool)
            mask2_bool = mask2.astype(bool)
            
            # Calculate intersection and union
            intersection = np.logical_and(mask1_bool, mask2_bool).sum()
            union = np.logical_or(mask1_bool, mask2_bool).sum()
            
            # Avoid division by zero
            if union == 0:
                return 0.0
            
            return float(intersection) / float(union)
        except Exception as e:
            logger.warning(f"Error calculating IoU: {e}")
            return 0.0
    
    def segment_with_points(self, image: np.ndarray, points: List[List[int]]) -> Dict[str, Any]:
        """
        Segment image with point prompts
        
        Args:
            image: Input image as numpy array (H, W, 3)
            points: List of [x, y] coordinates
            
        Returns:
            Dictionary with masks and scores
        """
        if not self.predictor:
            raise RuntimeError("Model not loaded")
        
        try:
            # Set image
            self.predictor.set_image(image)
            
            # Convert points to numpy array
            input_points = np.array(points)
            input_labels = np.ones(len(points))  # All positive points
            
            # Predict masks
            masks, scores, logits = self.predictor.predict(
                point_coords=input_points,
                point_labels=input_labels,
                multimask_output=True,
            )
            
            return {
                'masks': masks,  # Keep as numpy arrays
                'scores': scores.tolist()
            }
            
        except Exception as e:
            logger.error(f"Error in segment_with_points: {e}")
            raise
    
    def segment_with_boxes(self, image: np.ndarray, boxes: List[List[int]]) -> Dict[str, Any]:
        """
        Segment image with bounding box prompts
        
        Args:
            image: Input image as numpy array (H, W, 3)
            boxes: List of [x1, y1, x2, y2] coordinates
            
        Returns:
            Dictionary with masks and scores
        """
        if not self.predictor:
            raise RuntimeError("Model not loaded")
        
        try:
            # Set image
            self.predictor.set_image(image)
            
            all_masks = []
            all_scores = []
            
            # Process each box
            for box in boxes:
                input_box = np.array(box)
                
                # Predict masks
                masks, scores, logits = self.predictor.predict(
                    box=input_box,
                    multimask_output=False,
                )
                
                all_masks.extend(masks)  # Keep as numpy arrays
                all_scores.extend(scores.tolist())
            
            return {
                'masks': all_masks,
                'scores': all_scores
            }
            
        except Exception as e:
            logger.error(f"Error in segment_with_boxes: {e}")
            raise
    
    def cleanup(self):
        """Cleanup resources"""
        if self.model:
            del self.model
        if self.predictor:
            del self.predictor
        
        # Clear CUDA cache if using GPU
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        logger.info("SAM 2 predictor cleaned up") 