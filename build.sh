#!/bin/bash

# Free-Cluely Build Script

echo "🔨 Building Free-Cluely for production..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Clean previous builds
echo "🧹 Cleaning previous builds..."
pnpm run clean:all

# Install dependencies
echo "📦 Installing dependencies..."
if pnpm install; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Build shared package first
echo "📦 Building shared package..."
cd packages/shared
if npx tsc; then
    print_success "Shared package built"
else
    print_error "Failed to build shared package"
    exit 1
fi
cd ../..

# Build other packages
echo "📦 Building remaining packages..."
if pnpm --filter "@free-cluely/config" run build; then
    print_success "Config package built"
else
    print_warning "Config package build failed, continuing..."
fi

if pnpm --filter "@free-cluely/plugin-bus" run build; then
    print_success "Plugin-bus package built"
else
    print_warning "Plugin-bus package build failed, continuing..."
fi

# Build dashboard
echo "📊 Building dashboard..."
if pnpm run build:dashboard; then
    print_success "Dashboard built"
else
    print_error "Failed to build dashboard"
    exit 1
fi

# Build electron
echo "🖥️  Building electron..."
if pnpm run build:electron; then
    print_success "Electron built"
else
    print_error "Failed to build electron"
    exit 1
fi

# Package application
echo "📦 Packaging application..."
if pnpm run package; then
    print_success "Application packaged"
else
    print_error "Failed to package application"
    exit 1
fi

echo ""
print_success "🎉 Build completed successfully!"
echo "📁 Release files available in ./release/ directory"
