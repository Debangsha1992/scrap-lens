# Use official Python runtime as base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
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
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Create models directory
RUN mkdir -p models

# Download SAM2 models (you may want to do this during build or at runtime)
# For now, we'll assume models are copied or downloaded at runtime

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONPATH=/app
ENV MODEL_PATH=/app/models

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "sam2_service.main:app", "--host", "0.0.0.0", "--port", "8000"] 