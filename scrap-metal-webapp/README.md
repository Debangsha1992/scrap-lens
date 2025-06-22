# Scrap Metal Image Analyzer

A Next.js web application that analyzes images using Alibaba Cloud's Qwen-VL-Max model. Upload images or provide URLs to get detailed AI-powered descriptions and analysis.

## Features

- 📁 **File Upload Support** - Upload images directly from your device
- 🔗 **URL Image Analysis** - Analyze images from any public URL
- 🎯 **Object Detection** - Advanced bounding box detection with Qwen-VL-Max
- 🎨 **Visual Overlays** - Interactive canvas with color-coded bounding boxes
- 🏷️ **Smart Labeling** - Confidence scores and object classification
- 📊 **Usage Tracking** - Monitor API token consumption in real-time
- 💎 **Ultra-Modern UI** - Beautiful, responsive interface with smooth interactions
- ⚡ **Real-time Analysis** - Instant processing with elegant loading states
- 🔒 **Secure** - API keys stored securely as environment variables

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Alibaba Cloud DashScope API key with Qwen-VL-Max access

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd scrap-metal-webapp
npm install
```

### 2. Configure API Key

Create a `.env.local` file in the root directory:

```bash
# Copy your Alibaba Cloud DashScope API key here
DASHSCOPE_API_KEY=sk-your-api-key-here
```

**Important Security Notes:**
- Never commit your API key to version control
- The `.env.local` file is already included in `.gitignore`
- Use environment variables for production deployment

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Test with Example Image

Click the "Example" button to load a test image, or use these URLs for testing:
- `https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg`
- Any publicly accessible image URL (JPEG, PNG, WebP, GIF under 10MB)

## API Endpoints

### POST /api/describe

Analyzes images and returns descriptions with optional object detection.

**File Upload Request (FormData):**
```
file: (image file)
enableBoundingBoxes: "true" | "false"
```

**URL Request (FormData):**
```
imageUrl: "https://example.com/image.jpg"
enableBoundingBoxes: "true" | "false"
```

**Response:**
```json
{
  "description": "AI-generated description of the image",
  "boxes": [
    {
      "label": "dog",
      "x": 120,
      "y": 100,
      "width": 150,
      "height": 200,
      "confidence": 0.95
    }
  ],
  "usage": {
    "prompt_tokens": 1234,
    "completion_tokens": 567,
    "total_tokens": 1801
  },
     "model": "qwen-vl-max",
  "boundingBoxesEnabled": true
}
```

## Project Structure

```
scrap-metal-webapp/
├── src/
│   └── app/
│       ├── api/
│       │   └── describe/
│       │       └── route.ts          # API endpoint for image analysis
│       ├── globals.css               # Global styles
│       ├── layout.tsx               # Root layout
│       └── page.tsx                 # Main UI component
├── .env.local                       # Environment variables (not committed)
├── .gitignore                       # Git ignore rules
├── package.json                     # Dependencies and scripts
└── README.md                        # This file
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DASHSCOPE_API_KEY` | Your Alibaba Cloud DashScope API key | Yes |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub/GitLab
2. Connect your repository to Vercel
3. Add the environment variable:
   - `DASHSCOPE_API_KEY`: Your API key

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t scrap-metal-analyzer .
docker run -p 3000:3000 -e DASHSCOPE_API_KEY=sk-your-key-here scrap-metal-analyzer
```

### Other Platforms

For AWS, Google Cloud, or other platforms:
1. Set the `DASHSCOPE_API_KEY` environment variable
2. Build the project: `npm run build`
3. Start the server: `npm start`

## Error Handling

The application includes comprehensive error handling:

- **Invalid URLs**: Client-side validation
- **API Failures**: Server error messages displayed to user
- **Network Issues**: Graceful degradation with error states
- **Rate Limiting**: Proper error messages for API limits

## API Limits and Costs

- **Image Size**: Maximum 10MB per image
- **Batch Limit**: Multiple images limited by token count
- **Rate Limits**: Subject to Alibaba Cloud DashScope limits
- **Costs**: Based on token usage (see Alibaba Cloud pricing)

## Supported Image Formats

- JPEG
- PNG  
- WebP
- GIF (static)
- Maximum size: 10MB per image
- Minimum dimensions: 10x10 pixels
- Aspect ratio: Between 1:200 and 200:1

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Tech Stack

- **Framework**: Next.js 14 with App Router
- **UI**: Tailwind CSS
- **HTTP Client**: Axios
- **AI Model**: Alibaba Cloud Qwen-VL-Max
- **API**: OpenAI-compatible SDK

## Troubleshooting

### Common Issues

1. **API Key Error**: Ensure your API key is correctly set in `.env.local`
2. **CORS Issues**: The API endpoint handles CORS automatically
3. **Image Load Failures**: Verify images are publicly accessible
4. **Build Errors**: Run `npm ci` to ensure clean dependencies

### Support

For issues with:
- **This Application**: Check the GitHub issues
- **Alibaba Cloud API**: Consult DashScope documentation
- **Qwen-VL-Max Model**: Check Alibaba Cloud support

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
