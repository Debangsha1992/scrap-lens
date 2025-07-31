import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Server external packages for better performance
  serverExternalPackages: ['openai'],
  
  // Experimental features
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // Image optimization settings
  images: {
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
  
  // Exclude directories from build
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.watchOptions = {
      ignored: ['**/python-backend/**', '**/scrap-metal-webapp/**', '**/Taxonomy/**', '**/docs/**', '**/database/**'],
    };
    return config;
  },
};

export default nextConfig;
