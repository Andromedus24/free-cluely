#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Free-Cluely development environment...');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 20) {
  console.error('❌ Node.js 20+ is required. Current version:', nodeVersion);
  process.exit(1);
}

console.log('✅ Node.js version check passed:', nodeVersion);

// Check if pnpm is installed
try {
  execSync('pnpm --version', { stdio: 'pipe' });
  console.log('✅ PNPM is installed');
} catch (error) {
  console.error('❌ PNPM is not installed. Please install PNPM:');
  console.error('   npm install -g pnpm');
  process.exit(1);
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('pnpm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Build packages
console.log('🔨 Building packages...');
try {
  execSync('pnpm run build:packages', { stdio: 'inherit' });
  console.log('✅ Packages built successfully');
} catch (error) {
  console.error('❌ Failed to build packages:', error.message);
  process.exit(1);
}

// Create .env file if it doesn't exist
const envPath = path.resolve('.env');
const envExamplePath = path.resolve('.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully');
    console.log('⚠️  Please edit .env file with your configuration');
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
  }
} else {
  console.log('✅ .env file already exists');
}

// Create necessary directories
const directories = [
  'logs',
  'plugins',
  'assets',
  'temp',
  'cache'
];

directories.forEach(dir => {
  const fullPath = path.resolve(dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`📁 Creating directory: ${dir}`);
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Check if git is initialized
if (!fs.existsSync(path.resolve('.git'))) {
  console.log('🔧 Initializing git repository...');
  try {
    execSync('git init', { stdio: 'pipe' });
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Initial commit: Free-Cluely setup"', { stdio: 'pipe' });
    console.log('✅ Git repository initialized');
  } catch (error) {
    console.warn('⚠️  Failed to initialize git repository:', error.message);
  }
} else {
  console.log('✅ Git repository already exists');
}

// Create development scripts
const devScript = `#!/bin/bash

# Development script for Free-Cluely

echo "🚀 Starting Free-Cluely development environment..."

# Start dashboard in background
echo "📊 Starting dashboard..."
cd apps/dashboard
pnpm dev &
DASHBOARD_PID=$!

# Wait for dashboard to be ready
echo "⏳ Waiting for dashboard to start..."
sleep 10

# Start electron in background
echo "🖥️  Starting Electron app..."
cd ../apps/electron-host
pnpm dev &
ELECTRON_PID=$!

echo "✅ Development environment started!"
echo "📊 Dashboard: http://localhost:3000"
echo "🖥️  Electron app: Starting..."
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping development environment..."
    kill $DASHBOARD_PID 2>/dev/null
    kill $ELECTRON_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for processes
wait`;

fs.writeFileSync(path.resolve('dev.sh'), devScript);
try {
  execSync('chmod +x dev.sh', { stdio: 'pipe' });
  console.log('✅ Development script created: ./dev.sh');
} catch (error) {
  console.warn('⚠️  Failed to make dev.sh executable');
}

// Create build scripts
const buildScript = `#!/bin/bash

echo "🔨 Building Free-Cluely for production..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
pnpm run clean:all

# Build everything
echo "📦 Building all components..."
pnpm run build

# Package application
echo "📦 Packaging application..."
pnpm run package

echo "✅ Build completed successfully!"
echo "📁 Release files available in ./release/ directory`;

fs.writeFileSync(path.resolve('build.sh'), buildScript);
try {
  execSync('chmod +x build.sh', { stdio: 'pipe' });
  console.log('✅ Build script created: ./build.sh');
} catch (error) {
  console.warn('⚠️  Failed to make build.sh executable');
}

// Create README with setup instructions
const readmeContent = `# Free-Cluely Development Setup

## Prerequisites

- Node.js 20+
- PNPM package manager
- Git (optional)

## Quick Start

1. **Install dependencies and setup environment:**
   \`\`\`bash
   ./setup.sh
   \`\`\`

2. **Configure your environment:**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your API keys and preferences
   \`\`\`

3. **Start development environment:**
   \`\`\`bash
   ./dev.sh
   \`\`\`

4. **Build for production:**
   \`\`\`bash
   ./build.sh
   \`\`\`

## Manual Setup

If the setup script doesn't work, you can set up manually:

\`\`\`bash
# Install dependencies
pnpm install

# Build packages
pnpm run build:packages

# Create .env file
cp .env.example .env

# Start development
pnpm run dev:all
\`\`\`

## Development Commands

- \`pnpm run dev:all\` - Start all development servers
- \`pnpm run dev:dashboard\` - Start only dashboard
- \`pnpm run dev:electron\` - Start only electron app
- \`pnpm run build\` - Build all components
- \`pnpm run package\` - Package for distribution
- \`pnpm run clean\` - Clean build artifacts

## Configuration

Edit the \`.env\` file to configure:

- LLM API keys (Gemini, Ollama)
- Permission settings
- Dashboard configuration
- Build settings

## Project Structure

\`\`\`
free-cluely/
├── apps/
│   ├── dashboard/          # Next.js dashboard
│   └── electron-host/     # Electron main app
├── packages/
│   ├── shared/           # Shared types and utilities
│   ├── plugin-bus/       # Plugin communication system
│   ├── config/           # Configuration management
│   └── permissions/      # Permission system
├── plugins/
│   ├── puppeteer-worker/ # Browser automation plugin
│   └── vision-service/   # Image analysis plugin
└── scripts/             # Build and setup scripts
\`\`\`

## Troubleshooting

1. **Node.js version issues**: Ensure you're using Node.js 20+
2. **PNPM not found**: Install with \`npm install -g pnpm\`
3. **Build failures**: Run \`pnpm run clean:all\` and try again
4. **Permission issues**: Check file permissions on scripts

## Support

- Issues: https://github.com/free-cluely/free-cluely/issues
- Documentation: https://docs.free-cluely.com
- Discord: https://discord.gg/free-cluely

---

Happy coding! 🚀`;

fs.writeFileSync(path.resolve('SETUP.md'), readmeContent);
console.log('✅ Setup documentation created: SETUP.md');

console.log('\n🎉 Setup completed successfully!');
console.log('\nNext steps:');
console.log('1. Edit .env file with your configuration');
console.log('2. Run ./dev.sh to start development');
console.log('3. Check SETUP.md for detailed instructions');
console.log('\n📚 Documentation available in SETUP.md');