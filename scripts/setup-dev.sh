#!/bin/bash

# Affable Development Setup Script
# This script sets up the complete development environment with Docker Compose and frontend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Main setup
print_header "Affable Development Environment Setup"

# Check prerequisites
print_header "Checking Prerequisites"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    echo "Please install Docker from https://docs.docker.com/install/"
    exit 1
fi
print_success "Docker is installed ($(docker --version))"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi
print_success "Docker Compose is installed ($(docker-compose --version))"

# Check Docker daemon is running
if ! docker ps > /dev/null 2>&1; then
    print_error "Docker daemon is not running"
    echo "Please start Docker Desktop or the Docker daemon"
    exit 1
fi
print_success "Docker daemon is running"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_warning "Node.js is not installed (required for frontend)"
    echo "Install from https://nodejs.org/ or continue with backend only"
fi
print_success "Node.js is installed ($(node --version))"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

print_header "Setting Up Environment"

# Change to project root
cd "$PROJECT_ROOT"
print_success "Working in: $PROJECT_ROOT"

# Copy environment file if it doesn't exist
if [ ! -f "$PROJECT_ROOT/.env.dev" ]; then
    if [ -f "$PROJECT_ROOT/.env.local" ]; then
        cp "$PROJECT_ROOT/.env.local" "$PROJECT_ROOT/.env.dev"
        print_success "Created .env.dev from .env.local"
    elif [ -f "$PROJECT_ROOT/.env.example" ]; then
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env.dev"
        print_warning "Created .env.dev from .env.example (please update with actual values)"
    else
        print_error "No environment file found (.env.local or .env.example) in $PROJECT_ROOT"
        exit 1
    fi
else
    print_success ".env.dev already exists"
fi

# Make entrypoint.sh executable
if [ -f "backend/entrypoint.sh" ]; then
    chmod +x backend/entrypoint.sh
    print_success "Made backend/entrypoint.sh executable"
fi

# Build images
print_header "Building Docker Images"

print_info "Building backend image (this may take a few minutes)..."
if docker-compose build backend > /dev/null 2>&1; then
    print_success "Backend image built successfully"
else
    print_error "Failed to build backend image"
    exit 1
fi

# Start services
print_header "Starting Services"

print_info "Starting PostgreSQL..."
docker-compose up -d postgres

print_info "Starting Redis..."
docker-compose up -d redis

print_info "Starting Backend..."
docker-compose up -d backend

# Wait for services to be ready
print_info "Waiting for services to be ready..."
sleep 5

# Check services
print_header "Verifying Services"

services_ok=true

if docker-compose ps postgres | grep -q "healthy"; then
    print_success "PostgreSQL is healthy"
else
    print_warning "PostgreSQL status unknown, waiting for startup..."
fi

if docker-compose ps redis | grep -q "healthy"; then
    print_success "Redis is healthy"
else
    print_warning "Redis status unknown, waiting for startup..."
fi

if docker-compose ps backend | grep -q "Up"; then
    print_success "Backend is running"
    sleep 2
    # Try to verify backend is responsive
    if curl -s http://localhost:8000/v1/partners > /dev/null 2>&1; then
        print_success "Backend API is responsive"
    else
        print_info "Backend is starting up, may take a moment to be responsive..."
    fi
else
    print_error "Backend failed to start"
    print_info "Check logs with: docker-compose logs backend"
    services_ok=false
fi

# Setup frontend
print_header "Setting Up Frontend"

if [ ! -d "frontend/node_modules" ]; then
    print_info "Installing frontend dependencies (npm install)..."
    cd frontend
    if npm install > /dev/null 2>&1; then
        print_success "Frontend dependencies installed"
    else
        print_warning "Failed to install frontend dependencies"
        print_info "Try running manually: cd frontend && npm install"
    fi
    cd ..
else
    print_success "Frontend dependencies already installed"
fi

# Create environment file for frontend if needed
if [ ! -f "frontend/.env.local" ]; then
    cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000/api
EOF
    print_success "Created frontend/.env.local"
else
    print_success "frontend/.env.local already exists"
fi

# Final status
print_header "Setup Complete! 🎉"

if [ "$services_ok" = true ]; then
    echo ""
    echo -e "${GREEN}✓ All backend services are running${NC}"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Start Frontend (in a new terminal):"
    echo -e "   ${BLUE}cd frontend && npm run dev${NC}"
    echo ""
    echo "2. Open in your browser:"
    echo -e "   ${BLUE}http://localhost:3000${NC}"
    echo ""
    echo "3. API documentation:"
    echo -e "   ${BLUE}http://localhost:8000/docs${NC}"
    echo ""
    echo "Useful commands:"
    echo -e "   View logs:        ${BLUE}docker-compose logs -f${NC}"
    echo -e "   Stop services:    ${BLUE}docker-compose down${NC}"
    echo -e "   Database shell:   ${BLUE}docker-compose exec postgres psql -U affuser -d affdb${NC}"
    echo -e "   Redis CLI:        ${BLUE}docker-compose exec redis redis-cli${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Some services failed to start${NC}"
    echo ""
    echo "Check logs with:"
    echo -e "   ${BLUE}docker-compose logs backend${NC}"
    echo -e "   ${BLUE}docker-compose logs postgres${NC}"
    echo ""
fi

print_info "For detailed setup information, see CLAUDE/DOCKER_SETUP_GUIDE.md"
