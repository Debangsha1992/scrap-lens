#!/usr/bin/env python3
"""
Mock SAM 2 Segmentation Service
Simulates SAM 2 functionality for testing UI integration
"""

import os
import io
import base64
import logging
from typing import List, Dict, Any, Optional
import asyncio
import json

import numpy as np
import cv2
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Mock SAM 2 Segmentation Service",
    description="Mock image segmentation service for testing",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock model state
model_loaded = True

@app.on_event("startup")
async def startup_event():
    """Mock startup"""
    logger.info("Mock SAM 2 service started successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    """Mock cleanup"""
    logger.info("Mock SAM 2 service shutting down")

def process_image_data(image_data: bytes) -> np.ndarray:
    """Convert image bytes to numpy array"""
    try:
        image = Image.open(io.BytesIO(image_data))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        return np.array(image)
    except Exception as e:
        logger.error(f"Error processing image data: {e}")
        raise HTTPException(status_code=400, detail="Invalid image data")

def create_mock_mask(image_shape: tuple, mask_id: int) -> np.ndarray:
    """Create a mock segmentation mask"""
    height, width = image_shape[:2]
    mask = np.zeros((height, width), dtype=bool)
    
    # Create different mock shapes based on mask_id
    if mask_id == 0:
        # Rectangle in top-left
        mask[height//4:height//2, width//4:width//2] = True
    elif mask_id == 1:
        # Circle in center
        center_y, center_x = height//2, width//2
        radius = min(height, width) // 6
        y, x = np.ogrid[:height, :width]
        mask_circle = (x - center_x)**2 + (y - center_y)**2 <= radius**2
        mask[mask_circle] = True
    elif mask_id == 2:
        # Rectangle in bottom-right
        mask[height//2:3*height//4, width//2:3*width//4] = True
    
    return mask

def encode_mask_to_base64(mask: np.ndarray) -> str:
    """Encode mask array to base64 string"""
    try:
        mask_uint8 = (mask * 255).astype(np.uint8)
        mask_image = Image.fromarray(mask_uint8, mode='L')
        buffer = io.BytesIO()
        mask_image.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    except Exception as e:
        logger.error(f"Error encoding mask: {e}")
        return ""

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Mock SAM 2 Segmentation Service", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": model_loaded,
        "device": "cpu",
        "service_running": True,
        "mock": True
    }

@app.post("/load-model")
async def load_model_endpoint():
    """Mock model loading"""
    global model_loaded
    model_loaded = True
    return {"status": "success", "message": "Mock model loaded successfully"}

@app.post("/segment")
async def segment_image(
    file: UploadFile = File(...),
    mode: str = Form("everything"),
    points: Optional[str] = Form(None),
    boxes: Optional[str] = Form(None)
):
    """Mock image segmentation"""
    
    try:
        # Read and process image
        image_data = await file.read()
        image_array = process_image_data(image_data)
        
        # Create mock masks
        num_masks = 3 if mode == "everything" else 1
        encoded_masks = []
        
        for i in range(num_masks):
            mask = create_mock_mask(image_array.shape, i)
            mask_base64 = encode_mask_to_base64(mask)
            
            encoded_masks.append({
                'id': i,
                'mask': mask_base64,
                'score': 0.8 + (i * 0.05),  # Mock scores
                'area': int(np.sum(mask))
            })
        
        return JSONResponse({
            'success': True,
            'mode': mode,
            'num_masks': len(encoded_masks),
            'masks': encoded_masks,
            'image_shape': image_array.shape[:2],
            'mock': True
        })
        
    except Exception as e:
        logger.error(f"Mock segmentation request failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/segment-url")
async def segment_image_url(
    image_url: str = Form(...),
    mode: str = Form("everything"),
    points: Optional[str] = Form(None),
    boxes: Optional[str] = Form(None)
):
    """Mock image segmentation from URL"""
    
    try:
        import requests
        
        # Download image from URL
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        
        # Process image
        image_array = process_image_data(response.content)
        
        # Create mock masks
        num_masks = 3 if mode == "everything" else 1
        encoded_masks = []
        
        for i in range(num_masks):
            mask = create_mock_mask(image_array.shape, i)
            mask_base64 = encode_mask_to_base64(mask)
            
            encoded_masks.append({
                'id': i,
                'mask': mask_base64,
                'score': 0.8 + (i * 0.05),  # Mock scores
                'area': int(np.sum(mask))
            })
        
        return JSONResponse({
            'success': True,
            'mode': mode,
            'num_masks': len(encoded_masks),
            'masks': encoded_masks,
            'image_shape': image_array.shape[:2],
            'mock': True
        })
        
    except Exception as e:
        logger.error(f"Mock URL segmentation request failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "mock_sam2_service:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 