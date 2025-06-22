#!/usr/bin/env python3
"""
Setup script for SAM 2 backend
Installs dependencies and SAM 2 from GitHub
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return result
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return None

def main():
    """Main setup function"""
    print("🚀 Setting up SAM 2 Backend...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    
    print(f"✅ Python {sys.version} detected")
    
    # Install basic requirements
    run_command(
        "pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu",
        "Installing PyTorch (CPU version)"
    )
    
    # Install other requirements
    run_command(
        "pip install -r requirements.txt",
        "Installing Python dependencies"
    )
    
    # Clone and install SAM 2
    sam2_dir = Path("sam2_repo")
    if not sam2_dir.exists():
        run_command(
            "git clone https://github.com/facebookresearch/segment-anything-2.git sam2_repo",
            "Cloning SAM 2 repository"
        )
    
    # Install SAM 2
    original_dir = os.getcwd()
    try:
        os.chdir("sam2_repo")
        run_command(
            "pip install -e .",
            "Installing SAM 2 package"
        )
    finally:
        os.chdir(original_dir)
    
    print("\n🎉 SAM 2 Backend setup completed!")
    print("\n📋 Next steps:")
    print("1. Run: cd python-backend/sam2_service")
    print("2. Run: python main.py")
    print("3. The SAM 2 service will be available at http://localhost:8000")

if __name__ == "__main__":
    main() 