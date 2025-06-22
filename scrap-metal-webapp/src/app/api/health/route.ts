import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check - could be extended with more checks
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'scrap-lens-frontend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    const errorHealth = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'scrap-lens-frontend',
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorHealth, { status: 503 });
  }
} 