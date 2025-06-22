#!/bin/bash

# Railway Startup Script for SAM2 Service
echo "Starting SAM2 Service on Railway..."

# Set environment variables
export PYTHONPATH=/app
export MODEL_PATH=/app/models
export QT_QPA_PLATFORM=offscreen
export DISPLAY=:99

# Print environment info
echo "Python path: $PYTHONPATH"
echo "Model path: $MODEL_PATH"
echo "Port: $PORT"

# Start the FastAPI application
echo "Starting uvicorn server..."
exec uvicorn sam2_service.main:app --host 0.0.0.0 --port ${PORT:-8000} 