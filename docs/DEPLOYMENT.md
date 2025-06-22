# Deployment Guide for Scrap Lens

This guide covers the deployment of Scrap Lens to production environments.

## Architecture Overview

- **Frontend**: Next.js application deployed on Vercel
- **Backend**: Python FastAPI service with SAM2 deployed on Railway
- **Models**: SAM2 models loaded at runtime or during build

## Prerequisites

- GitHub account
- Vercel account
- Railway account
- Docker (for local testing)

## Quick Deployment

### 1. Backend Deployment (Railway)

1. **Connect to Railway**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   ```

2. **Create Railway Project**
   ```bash
   # Navigate to backend directory
   cd python-backend
   
   # Initialize Railway project
   railway init
   
   # Deploy
   railway up
   ```

3. **Configure Environment Variables**
   Set these variables in Railway dashboard:
   ```
   PYTHONPATH=/app
   MODEL_PATH=/app/models
   PORT=8000
   ```

4. **Note the Backend URL**
   Railway will provide a URL like: `https://your-app.railway.app`

### 2. Frontend Deployment (Vercel)

1. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Connect your GitHub repository
   - Import the `scrap-metal-webapp` directory

2. **Configure Build Settings**
   ```
   Framework Preset: Next.js
   Root Directory: scrap-metal-webapp
   Build Command: npm run build
   Output Directory: .next
   ```

3. **Environment Variables**
   Set in Vercel dashboard:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```

4. **Deploy**
   Vercel will automatically deploy on every push to main branch.

## Advanced Deployment Options

### Option 1: Docker Compose (Self-hosted)

1. **Prepare Server**
   ```bash
   # On your server
   sudo apt update
   sudo apt install docker.io docker-compose
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

2. **Deploy with Docker Compose**
   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd scrap-lens
   
   # Build and run
   docker-compose up -d --build
   ```

3. **Configure Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /api/ {
           proxy_pass http://localhost:8000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Option 2: AWS/GCP/Azure

1. **Container Registry**
   - Build and push Docker images to your cloud provider's registry
   - Use cloud-specific container services (ECS, Cloud Run, Container Instances)

2. **Database/Storage** (if needed)
   - Set up cloud storage for models
   - Configure environment variables

## Environment Variables

### Backend
- `PYTHONPATH`: Python path (default: `/app`)
- `MODEL_PATH`: Path to SAM2 models (default: `/app/models`)
- `PORT`: Server port (default: `8000`)
- `UVICORN_HOST`: Host binding (default: `0.0.0.0`)
- `UVICORN_PORT`: Port binding (default: `8000`)

### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NODE_ENV`: Environment (production/development)
- `PORT`: Server port (default: `3000`)

## Model Management

### Option 1: Build-time Download
Modify the backend Dockerfile to download models during build:
```dockerfile
# Add to Dockerfile
RUN wget -O models/sam2_hiera_tiny.pt https://dl.fbaipublicfiles.com/segment_anything_2/072824/sam2_hiera_tiny.pt
```

### Option 2: Runtime Download
Models are downloaded when the service starts (slower startup, smaller image).

### Option 3: Cloud Storage
Store models in cloud storage and download at runtime:
```python
# Add to your service
import boto3
s3 = boto3.client('s3')
s3.download_file('your-bucket', 'sam2_hiera_tiny.pt', 'models/sam2_hiera_tiny.pt')
```

## Monitoring and Logging

### Health Checks
Both services include health check endpoints:
- Backend: `GET /health`
- Frontend: `GET /api/health`

### Logging
- Railway: Built-in logging dashboard
- Vercel: Function logs and analytics
- Docker: Use `docker-compose logs` or centralized logging

## Scaling Considerations

### Backend Scaling
- Use Railway's auto-scaling features
- Consider GPU instances for faster inference
- Implement model caching for better performance

### Frontend Scaling
- Vercel automatically scales
- Consider CDN for static assets
- Implement image optimization

## Security

1. **Environment Variables**
   - Never commit secrets to repository
   - Use platform-specific secret management

2. **CORS Configuration**
   - Configure proper CORS headers in backend
   - Whitelist frontend domain

3. **Rate Limiting**
   - Implement rate limiting in backend
   - Use platform-specific DDoS protection

## Troubleshooting

### Common Issues

1. **Backend Not Starting**
   - Check model files are accessible
   - Verify Python dependencies
   - Check memory/disk space limits

2. **Frontend Can't Connect to Backend**
   - Verify NEXT_PUBLIC_API_URL is correct
   - Check CORS configuration
   - Ensure backend is healthy

3. **Model Loading Errors**
   - Check model file paths
   - Verify model file integrity
   - Check memory limits

### Debugging Commands

```bash
# Check backend health
curl https://your-backend.railway.app/health

# Check frontend build
npm run build

# Test Docker containers locally
docker-compose up --build
```

## Cost Optimization

1. **Railway**
   - Use sleep mode for development environments
   - Monitor resource usage
   - Consider smaller model variants

2. **Vercel**
   - Optimize bundle size
   - Use image optimization
   - Monitor function execution time

## Backup and Recovery

1. **Code Backup**
   - Use Git with multiple remotes
   - Regular commits and tags

2. **Configuration Backup**
   - Export environment variables
   - Document deployment steps

3. **Model Backup**
   - Store models in cloud storage
   - Version control model configurations

## Support

For deployment issues:
1. Check service logs
2. Verify environment variables
3. Test locally with Docker Compose
4. Check platform-specific documentation 