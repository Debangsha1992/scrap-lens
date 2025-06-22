#!/usr/bin/env python3
"""
Test script to verify all imports work correctly
"""

import sys
import os
from pathlib import Path

print("Python path:")
for p in sys.path:
    print(f"  {p}")

print("\nCurrent working directory:", os.getcwd())

try:
    print("\nTesting basic imports...")
    import numpy as np
    print("✓ numpy imported successfully")
    
    import torch
    print("✓ torch imported successfully")
    
    from PIL import Image
    print("✓ PIL imported successfully")
    
    import cv2
    print("✓ opencv imported successfully")
    
    from fastapi import FastAPI
    print("✓ fastapi imported successfully")
    
    print("\nTesting SAM2 imports...")
    try:
        from sam2.build_sam import build_sam2
        print("✓ sam2.build_sam imported successfully")
    except ImportError as e:
        print(f"✗ sam2.build_sam import failed: {e}")
    
    try:
        from sam2.sam2_image_predictor import SAM2ImagePredictor
        print("✓ sam2.sam2_image_predictor imported successfully")
    except ImportError as e:
        print(f"✗ sam2.sam2_image_predictor import failed: {e}")
    
    try:
        from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator
        print("✓ sam2.automatic_mask_generator imported successfully")
    except ImportError as e:
        print(f"✗ sam2.automatic_mask_generator import failed: {e}")
    
    print("\nTesting local imports...")
    try:
        from sam2_service.sam2_predictor import SAM2Predictor
        print("✓ sam2_service.sam2_predictor imported successfully")
    except ImportError as e:
        print(f"✗ sam2_service.sam2_predictor import failed: {e}")
        
    print("\nAll import tests completed!")
    
except Exception as e:
    print(f"Import test failed: {e}")
    sys.exit(1) 