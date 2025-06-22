import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Server external packages for better performance
  serverExternalPackages: ['openai'],
  
  // Image optimization settings
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'development',
    // Allow external image domains for analysis
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  
  // Experimental features
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

export default nextConfig;
