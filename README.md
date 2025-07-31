# ScrapLens AI 🔍

A powerful AI-powered scrap metal analysis tool that uses advanced computer vision models to identify and categorize different types of scrap metal in images.

## Features

- **AI-Powered Analysis**: Uses OpenAI GPT-4o and Alibaba Qwen-VL models for precise scrap metal identification
- **Multiple Analysis Modes**: Generic taxonomy classification and granular/in-depth analysis
- **Real-time Processing**: Fast analysis with immediate visual feedback
- **Multiple Input Modes**: Support for file uploads and image URLs
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- **User Authentication**: Secure user management with Supabase

## Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **AI Models**: OpenAI GPT-4o and Alibaba Qwen-VL-Max
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- OpenAI API key
- Alibaba Cloud DashScope API key
- Supabase project (for authentication and database)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd scrap-lens
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Add your API keys and Supabase configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Deployment

### Production Deployment

The application is designed for cloud deployment:

- **Frontend**: Deployed on Vercel
- **Database & Auth**: Supabase (managed PostgreSQL and authentication)
- **AI APIs**: OpenAI and Alibaba Cloud DashScope

## Tech Stack

### Frontend
- Next.js 14
- TypeScript
- Tailwind CSS
- React Hooks
- Framer Motion (animations)
- Supabase (authentication & database)

### AI Models
- OpenAI GPT-4o (Generic Taxonomy)
- Alibaba Qwen-VL-Max (Granular Analysis)
- Custom scrap metal taxonomy classification

## API Reference

### Qwen Analysis
```
POST /api/analyze
Content-Type: multipart/form-data

Parameters:
- file: Image file (or imageUrl)
- enableBoundingBoxes: boolean
- model: qwen-vl-max
```

### OpenAI Analysis
```
POST /api/openai-analyze
Content-Type: multipart/form-data

Parameters:
- file: Image file (or imageUrl)
- enableBoundingBoxes: boolean
- model: gpt-4o
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

- OpenAI for the GPT-4o vision model
- Alibaba Cloud for the Qwen-VL-Max model
- Supabase for the authentication and database platform
- The open-source community for various tools and libraries 