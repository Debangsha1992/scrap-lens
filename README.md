# Scrap Lens 🔍

A powerful AI-powered image segmentation tool built with SAM2 (Segment Anything Model 2) that allows you to intelligently segment and analyze images.

## Features

- **AI-Powered Segmentation**: Uses Meta's SAM2 model for precise image segmentation
- **Interactive Selection**: Click to select objects or draw bounding boxes
- **Real-time Processing**: Fast segmentation with immediate visual feedback
- **Multiple Input Modes**: Support for file uploads and image URLs
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS

## Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Python FastAPI service with SAM2 integration
- **AI Model**: Meta's Segment Anything Model 2 (SAM2)

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.8+ and pip
- CUDA-compatible GPU (recommended for optimal performance)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd scrap-lens
   ```

2. **Start the backend service**
   ```bash
   cd python-backend
   pip install -r requirements.txt
   chmod +x start_service.sh
   ./start_service.sh
   ```

3. **Start the frontend**
   ```bash
   cd scrap-metal-webapp
   npm install
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## Deployment

### Production Deployment

The application is designed for cloud deployment:

- **Frontend**: Deployed on Vercel
- **Backend**: Deployed on Railway (GPU support)

See deployment guide in `docs/DEPLOYMENT.md` for detailed instructions.

## Tech Stack

### Frontend
- Next.js 14
- TypeScript
- Tailwind CSS
- React Hooks
- Axios for API calls

### Backend
- FastAPI
- SAM2 (Segment Anything Model 2)
- PyTorch
- OpenCV
- NumPy

## API Reference

### Health Check
```
GET /health
```

### Image Segmentation
```
POST /segment
Content-Type: multipart/form-data

Parameters:
- file: Image file
- mode: Segmentation mode
- points: Click coordinates (JSON)
- boxes: Bounding boxes (JSON)
```

### URL-based Segmentation
```
POST /segment-url
Content-Type: application/json

Body:
{
  "image_url": "string",
  "mode": "string",
  "points": "string",
  "boxes": "string"
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Meta AI for the SAM2 model
- The open-source community for various tools and libraries 