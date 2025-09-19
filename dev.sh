#!/bin/bash

# Free-Cluely Development Script

echo "🚀 Starting Free-Cluely development environment..."

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping development environment..."
    # Kill all child processes
    jobs -p | xargs -r kill 2>/dev/null || true
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env file created from template"
        echo "📝 Please edit .env file with your configuration"
    else
        echo "❌ .env.example not found. Please create a .env file manually"
        exit 1
    fi
fi

# Start dashboard in background
echo "📊 Starting dashboard..."
cd apps/dashboard
pnpm dev &
DASHBOARD_PID=$!

# Wait a moment for dashboard to start
sleep 5

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
