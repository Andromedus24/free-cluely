#!/bin/bash

# Free-Cluely Development Setup Script
# This script sets up the development environment for Free-Cluely

set -e  # Exit on any error

echo "🚀 Setting up Free-Cluely development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Check Node.js version
echo "🔍 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js 20+ is required. Current version: $(node --version)"
    print_info "Please update Node.js from https://nodejs.org/"
    exit 1
fi

print_success "Node.js version check passed: $(node --version)"

# Check if PNPM is installed
echo "🔍 Checking PNPM installation..."
if ! command -v pnpm &> /dev/null; then
    print_error "PNPM is not installed. Installing PNPM..."
    npm install -g pnpm
    print_success "PNPM installed successfully"
else
    print_success "PNPM is already installed: $(pnpm --version)"
fi

# Install dependencies
echo "📦 Installing dependencies..."
if pnpm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Build shared package first
echo "🔨 Building shared package..."
if pnpm --filter "@free-cluely/shared" run build; then
    print_success "Shared package built successfully"
else
    print_error "Failed to build shared package"
    exit 1
fi

# Build other packages
echo "🔨 Building remaining packages..."
if pnpm run build:packages; then
    print_success "All packages built successfully"
else
    print_warning "Some packages failed to build, but continuing..."
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📝 Creating .env file from template..."
        cp .env.example .env
        print_success ".env file created successfully"
        print_warning "Please edit .env file with your API keys and configuration"
    else
        print_warning ".env.example not found, creating basic .env file..."
        cat > .env << EOF
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
DASHBOARD_PORT=3000
PERMISSION_SCREEN=true
PERMISSION_CLIPBOARD=false
PERMISSION_AUTOMATION=false
PERMISSION_NETWORK=true
EOF
        print_success "Basic .env file created"
    fi
else
    print_success ".env file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
DIRS=("logs" "temp" "cache" "release")
for dir in "${DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        print_info "Created directory: $dir"
    fi
done

# Make scripts executable
echo "🔧 Setting up scripts..."
if [ -f "dev.sh" ]; then
    chmod +x dev.sh
    print_success "dev.sh script is executable"
fi

if [ -f "build.sh" ]; then
    chmod +x build.sh
    print_success "build.sh script is executable"
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "🔧 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: Free-Cluely setup" || print_warning "Git commit failed (this is okay)"
    print_success "Git repository initialized"
else
    print_success "Git repository already exists"
fi

# Create development script if it doesn't exist
if [ ! -f "dev.sh" ]; then
    echo "📝 Creating development script..."
    cat > dev.sh << 'EOF'
#!/bin/bash

# Free-Cluely Development Script

echo "🚀 Starting Free-Cluely development environment..."

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping development environment..."
    # Kill all child processes
    jobs -p | xargs -r kill
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start dashboard in background
echo "📊 Starting dashboard..."
cd apps/dashboard
pnpm dev &
DASHBOARD_PID=$!

# Wait a moment for dashboard to start
sleep 3

# Go back to root
cd ../..

# Start electron app
echo "🖥️  Starting Electron app..."
cd apps/electron-host
pnpm dev &
ELECTRON_PID=$!

# Go back to root
cd ../..

echo "✅ Development environment started!"
echo "📊 Dashboard: http://localhost:3000"
echo "🖥️  Electron app: Starting..."
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for processes
wait
EOF
    chmod +x dev.sh
    print_success "Development script created: ./dev.sh"
fi

# Create build script if it doesn't exist
if [ ! -f "build.sh" ]; then
    echo "📝 Creating build script..."
    cat > build.sh << 'EOF'
#!/bin/bash

echo "🔨 Building Free-Cluely for production..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
pnpm run clean:all

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build packages
echo "📦 Building packages..."
pnpm run build:packages

# Build dashboard
echo "📊 Building dashboard..."
pnpm run build:dashboard

# Build electron
echo "🖥️  Building electron..."
pnpm run build:electron

# Package application
echo "📦 Packaging application..."
pnpm run package

echo "✅ Build completed successfully!"
echo "📁 Release files available in ./release/ directory"
EOF
    chmod +x build.sh
    print_success "Build script created: ./build.sh"
fi

# Final success message
echo ""
print_success "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your API keys and configuration"
echo "2. Run ./dev.sh to start development environment"
echo "3. Visit http://localhost:3000 for the dashboard"
echo ""
echo "📚 Available commands:"
echo "  ./dev.sh          - Start development environment"
echo "  ./build.sh        - Build for production"
echo "  pnpm run dev:all  - Alternative development start"
echo "  pnpm run build    - Build all packages"
echo "  pnpm run package  - Package for distribution"
echo ""
print_info "Happy coding! 🚀"