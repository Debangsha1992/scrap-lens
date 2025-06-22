# Use official Python runtime as base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies including curl for healthcheck
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    wget \
    curl \
    git \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libxcb1 \
    libxkbcommon-x11-0 \
    libxcb-icccm4 \
    libxcb-image0 \
    libxcb-keysyms1 \
    libxcb-randr0 \
    libxcb-render-util0 \
    libxcb-xinerama0 \
    libxcb-xfixes0 \
    libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY python-backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code from python-backend directory
COPY python-backend/ .

# Install SAM2 from the included repository
RUN cd sam2_repo && pip install -e .

# Create models directory and copy existing models
RUN mkdir -p models
COPY python-backend/models/ models/

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONPATH=/app
ENV MODEL_PATH=/app/models
ENV QT_QPA_PLATFORM=offscreen
ENV DISPLAY=:99

# Health check - extended timeouts for model loading
HEALTHCHECK --interval=60s --timeout=30s --start-period=180s --retries=5 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "sam2_service.main:app", "--host", "0.0.0.0", "--port", "8000"] 