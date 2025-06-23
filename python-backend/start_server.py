#!/usr/bin/env python3
"""
Startup script for SAM2 service with proper error handling
"""

import sys
import os
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_imports():
    """Test all required imports before starting the server"""
    logger.info("Testing imports...")
    
    try:
        # Test basic imports
        import numpy as np
        import torch
        from PIL import Image
        import cv2
        from fastapi import FastAPI
        logger.info("✓ Basic imports successful")
        
        # Test SAM2 imports
        from sam2.build_sam import build_sam2
        from sam2.sam2_image_predictor import SAM2ImagePredictor
        from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator
        logger.info("✓ SAM2 imports successful")
        
        # Test local imports
        from sam2_service.sam2_predictor import SAM2Predictor
        logger.info("✓ Local imports successful")
        
        return True
        
    except ImportError as e:
        logger.error(f"Import error: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during import test: {e}")
        return False

def start_server():
    """Start the uvicorn server"""
    logger.info("Starting SAM2 service...")
    
    try:
        import uvicorn
        
        # Use Railway's PORT environment variable if available
        port = int(os.getenv("PORT", "8000"))
        logger.info(f"Starting server on port {port}")
        
        uvicorn.run(
            "sam2_service.main:app",
            host="0.0.0.0",
            port=port,
            log_level="info",
            access_log=True
        )
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    logger.info("SAM2 Service Startup")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Working directory: {os.getcwd()}")
    logger.info(f"Python path: {sys.path}")
    
    # Test imports first
    if not test_imports():
        logger.error("Import tests failed. Exiting.")
        sys.exit(1)
    
    logger.info("All imports successful. Starting server...")
    start_server() 