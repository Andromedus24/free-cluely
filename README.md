# Free-Cluely - AI-Powered Desktop Assistant

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0-brightgreen.svg)](https://nodejs.org/)
[![PNPM](https://img.shields.io/badge/pnpm-%3E%3D9.0-orange.svg)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/electron-33.2.0-9ff4ff.svg)](https://www.electronjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

🤖 **Free-Cluely** is a modern, extensible AI-powered desktop assistant built with Electron, featuring a plugin architecture, web dashboard, and intelligent automation capabilities.

## ✨ Features

### 🏗️ Modern Architecture
- **Monorepo Structure**: PNPM + Turborepo for efficient development
- **TypeScript Strict**: Full type safety across all components
- **Electron Security**: Context isolation, no nodeIntegration, sandboxed renderer
- **Plugin System**: Extensible architecture with typed IPC communication

### 🖥️ Dashboard Interface
- **Settings Management**: Comprehensive configuration UI
- **Real-time Logs**: Live monitoring and filtering
- **Plugin Management**: Install, configure, and monitor plugins
- **Performance Metrics**: System statistics and usage analytics

### 🔌 Smart Plugins
- **Puppeteer Worker**: Browser automation with domain allowlist security
- **Vision Service**: AI-powered image analysis and OCR capabilities
- **Plugin Bus**: Typed inter-process communication with child processes

### 🔒 Security & Permissions
- **Opt-in Permissions**: Screen, Clipboard, Automation, Network access controls
- **Domain Allowlist**: Secure automation with configurable domain restrictions
- **No Telemetry**: Privacy-first design with optional anonymous usage statistics
- **Electron Security**: Context isolation, sandboxed renderer process

### 🌍 Cross-Platform
- **macOS**: Universal binaries with Apple Silicon support
- **Windows**: NSIS installer with portable option
- **Linux**: AppImage and DEB packages

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PNPM 9+
- Git (optional)

### One-Click Setup
```bash
# Clone and setup automatically
git clone https://github.com/free-cluely/free-cluely.git
cd free-cluely
./setup.sh
```

### Manual Setup
```bash
# Install dependencies
pnpm install

# Build packages
pnpm run build:packages

# Copy environment template
cp .env.example .env

# Start development
pnpm run dev:all
```

### Production Build
```bash
# Standard build (dynamic dashboard)
pnpm run build:prod

# Static export (embedded dashboard)
pnpm run build:static

# Package only (no rebuild)
pnpm run build:packages-only
```

## 📁 Project Structure

```
free-cluely/
├── apps/
│   ├── dashboard/          # Next.js dashboard application
│   │   ├── src/
│   │   │   ├── app/        # App router pages
│   │   │   └── components/ # UI components
│   │   └── out/           # Static export output
│   └── electron-host/     # Electron main application
│       ├── src/
│       │   ├── main.ts     # Main process
│       │   ├── preload.ts  # Preload script
│       │   └── fallback.html # Fallback UI
│       └── dist/          # Compiled TypeScript
├── packages/
│   ├── shared/           # Shared types and utilities
│   ├── plugin-bus/       # Plugin communication system
│   ├── config/           # Configuration management
│   └── permissions/      # Permission system
├── plugins/
│   ├── puppeteer-worker/ # Browser automation plugin
│   │   ├── src/
│   │   │   ├── PuppeteerWorkerPlugin.ts
│   │   │   └── index.ts
│   │   └── dist/
│   └── vision-service/   # Image analysis plugin
│       ├── src/
│       │   ├── VisionServicePlugin.ts
│       │   └── index.ts
│       └── dist/
├── scripts/
│   ├── setup.sh          # Development setup script
│   ├── build-prod.js     # Production build script
│   └── before-build.js   # Pre-build validation
├── assets/
│   ├── icons/            # Application icons
│   ├── entitlements.mac.plist # macOS security
│   └── installer.nsh     # Windows installer script
└── release/              # Built applications
```

## ⚙️ Configuration

### Environment Variables
Create a `.env` file based on `.env.example`:

```env
# LLM Configuration
GEMINI_API_KEY=your_gemini_api_key_here
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Permissions
PERMISSION_SCREEN=true
PERMISSION_CLIPBOARD=false
PERMISSION_AUTOMATION=false
PERMISSION_NETWORK=true

# Automation Security
AUTOMATION_ALLOWLIST=example.com,*.trusted-domain.com

# Dashboard
DASHBOARD_PORT=3000
DASHBOARD_ENABLED=true

# Telemetry (disabled by default)
TELEMETRY_ENABLED=false
```

### Configuration Management
- **File-based**: JSON configuration in `config.json`
- **Environment**: Override with `.env` variables
- **Runtime**: Update through dashboard or API
- **Validation**: Automatic schema validation

## 🔌 Plugin Development

### Creating a Plugin
1. Create plugin directory in `plugins/`
2. Implement plugin interface:
   ```typescript
   export class MyPlugin implements Plugin {
     name = 'my-plugin';
     version = '1.0.0';
     permissions = ['network'];
     
     async initialize(bus: PluginBus, config: ConfigManager, logger: Logger): Promise<void> {
       // Plugin initialization
     }
     
     async destroy(): Promise<void> {
       // Cleanup
     }
   }
   ```
3. Add to `package.json` with proper manifest
4. Build with `pnpm run build:plugins`

### Plugin Communication
```typescript
// Send message to plugin
const response = await bus.send({
  id: uuidv4(),
  type: 'request',
  plugin: 'puppeteer-worker',
  method: 'navigate',
  payload: { url: 'https://example.com' },
  timestamp: Date.now()
});

// Broadcast event
bus.broadcast({
  plugin: 'system',
  method: 'screenshot',
  payload: { imageData: 'base64...' }
});
```

## 🛡️ Security Features

### Permission System
- **Screen Capture**: Screenshot and analysis capabilities
- **Clipboard Access**: Read/write clipboard operations
- **Browser Automation**: Control web browser with domain restrictions
- **Network Access**: API calls and external requests

### Automation Security
- **Domain Allowlist**: Configurable domain restrictions
- **Permission Validation**: Runtime permission checks
- **User Prompts**: Interactive permission requests
- **Audit Logging**: Complete action logging

### Electron Security
- **Context Isolation**: Prevent renderer access to Node.js
- **Sandboxed Renderer**: Restricted renderer process
- **Content Security Policy**: Prevent XSS attacks
- **Native Module Validation**: Secure native module loading

## 🎯 Development Commands

### Development
```bash
pnpm run dev:all          # Start all services
pnpm run dev:dashboard     # Dashboard only
pnpm run dev:electron      # Electron app only
```

### Building
```bash
pnpm run build              # Build all components
pnpm run build:prod        # Production build
pnpm run build:static      # Static export
pnpm run build:packages    # Build packages only
```

### Packaging
```bash
pnpm run package            # Package for current platform
pnpm run package:mac        # macOS package
pnpm run package:win        # Windows package
pnpm run package:linux      # Linux package
```

### Maintenance
```bash
pnpm run lint               # Lint all code
pnpm run type-check         # Type checking
pnpm run test               # Run tests
pnpm run clean              # Clean build artifacts
```

## 📊 Dashboard Features

### Settings Management
- **LLM Configuration**: Gemini and Ollama provider setup
- **Permission Controls**: Granular permission management
- **Automation Settings**: Domain allowlist configuration
- **Dashboard Options**: Port and enable/disable settings
- **Telemetry**: Anonymous usage statistics

### Logs & Monitoring
- **Real-time Logs**: Live log streaming with filtering
- **Plugin Activity**: Individual plugin monitoring
- **Error Tracking**: Error aggregation and analysis
- **Performance Metrics**: System resource usage
- **Export Options**: JSON and CSV log export

### Plugin Management
- **Plugin Discovery**: Browse and install plugins
- **Plugin Configuration**: Per-plugin settings
- **Status Monitoring**: Running/stopped/error states
- **Resource Usage**: Memory and CPU monitoring
- **Plugin Lifecycle**: Start/stop/restart controls

## 🔧 Troubleshooting

### Common Issues

**Node.js Version**
```bash
# Check Node.js version
node --version
# Must be 20.0.0 or higher
```

**PNPM Installation**
```bash
# Install PNPM globally
npm install -g pnpm@latest
```

**Build Failures**
```bash
# Clean and rebuild
pnpm run clean:all
pnpm run build
```

**Permission Issues**
```bash
# Fix script permissions
chmod +x setup.sh
chmod +x scripts/*.js
```

**Plugin Development**
```bash
# Build plugins only
pnpm run build:plugins

# Watch plugin changes
cd plugins/your-plugin
pnpm dev
```

### Getting Help

- **Documentation**: [docs.free-cluely.com](https://docs.free-cluely.com)
- **Issues**: [GitHub Issues](https://github.com/free-cluely/free-cluely/issues)
- **Discord**: [Community Server](https://discord.gg/free-cluely)
- **Discussions**: [GitHub Discussions](https://github.com/free-cluely/free-cluely/discussions)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Standards
- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting
- Conventional Commits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Electron Team** for the amazing desktop framework
- **Next.js Team** for the excellent React framework
- **PNPM Team** for the fast package manager
- **TypeScript Team** for type safety
- **Community Contributors** for making this project better

---

🚀 **Built with ❤️ by the Free-Cluely Team**

## 📘 Documentation

- Product Requirements Document (PRD): [PRD.md](./PRD.md)
- Implementation Tasks: [TASKS.md](./TASKS.md)