#!/bin/bash

# Scrap Lens Deployment Script
# This script helps deploy Scrap Lens to various platforms

set -e

echo "🔍 Scrap Lens Deployment Script"
echo "================================"

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_error "Please install the missing dependencies and try again."
        exit 1
    fi
    
    print_success "All dependencies are installed!"
}

# Test local deployment with Docker Compose
test_local() {
    print_status "Testing local deployment with Docker Compose..."
    
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found!"
        exit 1
    fi
    
    print_status "Building and starting services..."
    docker-compose up --build -d
    
    print_status "Waiting for services to start..."
    sleep 30
    
    # Test backend health
    if curl -f http://localhost:8000/health &> /dev/null; then
        print_success "Backend is healthy!"
    else
        print_warning "Backend health check failed"
    fi
    
    # Test frontend health
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        print_success "Frontend is healthy!"
    else
        print_warning "Frontend health check failed"
    fi
    
    print_success "Local deployment test completed!"
    print_status "Access your app at: http://localhost:3000"
    print_status "Backend API at: http://localhost:8000"
    
    echo ""
    print_status "To stop the services, run: docker-compose down"
}

# Deploy to Railway (Backend)
deploy_railway() {
    print_status "Deploying backend to Railway..."
    
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI not found. Install it with: npm install -g @railway/cli"
        exit 1
    fi
    
    print_status "Checking Railway login status..."
    if ! railway whoami &> /dev/null; then
        print_error "Not logged in to Railway. Run: railway login"
        exit 1
    fi
    
    cd python-backend
    print_status "Deploying to Railway..."
    railway up
    cd ..
    
    print_success "Backend deployed to Railway!"
    print_status "Get your Railway URL from the Railway dashboard"
}

# Deploy to Vercel (Frontend)
deploy_vercel() {
    print_status "Deploying frontend to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI not found. Install it with: npm install -g vercel"
        exit 1
    fi
    
    cd scrap-metal-webapp
    print_status "Deploying to Vercel..."
    vercel --prod
    cd ..
    
    print_success "Frontend deployed to Vercel!"
}

# Main deployment function
deploy_production() {
    print_status "Starting production deployment..."
    
    # Check if we have the backend URL
    read -p "Enter your Railway backend URL (e.g., https://your-app.railway.app): " BACKEND_URL
    
    if [ -z "$BACKEND_URL" ]; then
        print_error "Backend URL is required!"
        exit 1
    fi
    
    # Update environment variable for frontend
    print_status "Updating frontend environment variable..."
    cd scrap-metal-webapp
    
    # Create or update .env.production.local
    echo "NEXT_PUBLIC_API_URL=$BACKEND_URL" > .env.production.local
    
    cd ..
    
    # Deploy both services
    deploy_railway
    deploy_vercel
    
    print_success "Production deployment completed!"
    print_status "Don't forget to update your Vercel environment variables with the Railway URL"
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  test     - Test local deployment with Docker Compose"
    echo "  railway  - Deploy backend to Railway"
    echo "  vercel   - Deploy frontend to Vercel"
    echo "  prod     - Deploy to production (Railway + Vercel)"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 test     # Test locally"
    echo "  $0 prod     # Deploy to production"
}

# Main script logic
main() {
    case "${1:-help}" in
        "test")
            check_dependencies
            test_local
            ;;
        "railway")
            check_dependencies
            deploy_railway
            ;;
        "vercel")
            check_dependencies
            deploy_vercel
            ;;
        "prod")
            check_dependencies
            deploy_production
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function
main "$@" 