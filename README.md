# Free-Cluely: AI-Powered Personal Assistant

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0-brightgreen.svg)](https://nodejs.org/)
[![PNPM](https://img.shields.io/badge/pnpm-%3E%3D9.0-orange.svg)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/electron-33.4.11-9ff4ff.svg)](https://www.electronjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

🤖 **Free-Cluely** is a modern, secure AI-powered desktop assistant built with TypeScript, Electron, and Next.js. It features a robust plugin architecture, comprehensive security measures, and a beautiful dashboard interface.

## ✨ Key Features

### 🏗️ **Modern Architecture**
- **Monorepo Structure**: Efficient development with PNPM workspaces and Turbo
- **TypeScript Strict**: Full type safety across all components
- **Plugin System**: Extensible architecture with secure IPC communication
- **Security First**: Context isolation, permission system, and secure IPC

### 🖥️ **Desktop Application**
- **Electron-based**: Native desktop experience across platforms
- **Secure IPC**: Validated inter-process communication with user consent
- **Permission Management**: Granular control over system access
- **Configuration Management**: Centralized, validated configuration system

### 📊 **Dashboard Interface**
- **Next.js Dashboard**: Modern React-based web interface
- **Real-time Updates**: Live system monitoring and control
- **Authentication**: Secure user authentication with OTP
- **Responsive Design**: Works on desktop and mobile browsers

### 🔒 **Security & Privacy**
- **Permission System**: Screen, clipboard, automation, and network access controls
- **Domain Allowlist**: Secure automation with configurable restrictions
- **No Telemetry by Default**: Privacy-first design
- **Secure Authentication**: OTP-based login with rate limiting and encryption

### 🧩 **Plugin Architecture**
- **Vision Service**: AI-powered image analysis and processing
- **Puppeteer Worker**: Secure browser automation with domain restrictions
- **Extensible**: Easy plugin development with TypeScript support

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+** (LTS recommended)
- **PNPM 9+** package manager
- **Git** (optional, for cloning)

### One-Command Setup
```bash
# Clone and setup automatically
git clone https://github.com/Andromedus24/free-cluely.git
cd free-cluely
chmod +x setup.sh
./setup.sh
```

### Manual Setup
```bash
# 1. Install dependencies
pnpm install

# 2. Build packages
pnpm run build:packages

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys and preferences

# 4. Start development
pnpm run dev:all
```

### Production Build
```bash
# Build everything for production
pnpm run build:prod

# Package for current platform
pnpm run package

# Package for specific platforms
pnpm run package:mac
pnpm run package:win
pnpm run package:linux
```

## 📁 Project Structure

```
free-cluely/
├── apps/
│   ├── dashboard/              # Next.js web dashboard
│   │   ├── src/
│   │   │   ├── app/           # App router pages and API routes
│   │   │   ├── components/    # React components
│   │   │   ├── contexts/      # React contexts
│   │   │   ├── lib/           # Utilities and services
│   │   │   └── styles/        # CSS and styling
│   │   └── public/           # Static assets
│   └── electron-host/         # Electron main application
│       ├── src/
│       │   ├── main.ts        # Electron main process
│       │   ├── preload.ts     # Secure preload script
│       │   ├── ipc-security.ts # IPC security layer
│       │   └── env-validator.ts # Environment validation
│       └── assets/           # Electron assets
├── packages/
│   ├── shared/               # Shared types and schemas
│   ├── config/               # Configuration management
│   ├── plugin-bus/           # Plugin communication system
│   ├── permissions/          # Permission management
│   ├── adapters/             # LLM provider adapters
│   └── [other packages]/    # Additional packages
├── plugins/
│   ├── vision-service/       # AI image analysis plugin
│   ├── puppeteer-worker/     # Browser automation plugin
│   └── [other plugins]/     # Additional plugins
├── scripts/
│   ├── build-prod.js         # Production build script
│   └── setup.sh             # Development setup script
└── release/                 # Built applications
```

## ⚙️ Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

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

# Dashboard
DASHBOARD_PORT=3000
DASHBOARD_ENABLED=true

# Security
AUTOMATION_ALLOWLIST=example.com,*.trusted-domain.com

# Authentication (for dashboard)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
```

### LLM Providers
Free-Cluely supports multiple AI providers:

1. **Google Gemini** (recommended)
   - Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Set `GEMINI_API_KEY` in your `.env` file

2. **Ollama** (local, private)
   - Install [Ollama](https://ollama.ai/)
   - Configure `OLLAMA_HOST` and `OLLAMA_MODEL`

3. **OpenAI** (optional)
   - Get API key from [OpenAI](https://platform.openai.com/api-keys)
   - Set `OPENAI_API_KEY` for additional features

## 🎯 Development Commands

### Development
```bash
pnpm run dev:all          # Start dashboard + electron
pnpm run dev:dashboard    # Dashboard only (http://localhost:3000)
pnpm run dev:electron     # Electron app only
pnpm run start:dev        # Start development with concurrency
```

### Building
```bash
pnpm run build:packages   # Build all packages
pnpm run build:dashboard  # Build dashboard
pnpm run build:electron   # Build electron app
pnpm run build:prod       # Full production build
pnpm run build:static     # Static export build
```

### Testing & Quality
```bash
pnpm run type-check       # TypeScript type checking
pnpm run lint             # ESLint checking
pnpm run lint:fix         # Auto-fix linting issues
pnpm run test             # Run tests
pnpm run clean            # Clean build artifacts
pnpm run clean:all        # Deep clean (including node_modules)
```

### Packaging
```bash
pnpm run package          # Package for current platform
pnpm run package:dir      # Package without installer
pnpm run package:mac      # macOS package
pnpm run package:win      # Windows package  
pnpm run package:linux    # Linux package
```

## 🔌 Plugin Development

### Creating a Plugin
1. Create a new directory in `plugins/`
2. Implement the plugin interface:
   ```typescript
   export class MyPlugin implements Plugin {
     name = 'my-plugin';
     version = '1.0.0';
     permissions = ['network'];
     
     async initialize(bus: PluginBus): Promise<void> {
       // Plugin initialization
     }
     
     async destroy(): Promise<void> {
       // Cleanup
     }
   }
   ```

### Plugin Communication
```typescript
// Send message to plugin
const response = await bus.send({
  id: generateId(),
  type: 'request',
  plugin: 'vision-service',
  method: 'analyze',
  payload: { imageData: 'base64...' }
});

// Listen for events
bus.on('screenshot:captured', (data) => {
  console.log('Screenshot captured:', data);
});
```

## 🛡️ Security Features

### Permission System
- **Screen Capture**: Screenshot and screen recording capabilities
- **Clipboard Access**: Read/write clipboard operations
- **Browser Automation**: Controlled web browser automation
- **Network Access**: External API calls and requests

### Security Measures
- **IPC Validation**: All inter-process communication is validated
- **User Consent**: Interactive permission requests with user dialogs
- **Domain Restrictions**: Configurable allowlist for automation
- **Context Isolation**: Secure Electron renderer process
- **OTP Authentication**: Secure dashboard login with rate limiting

### Privacy
- **No Telemetry by Default**: Optional anonymous usage statistics
- **Local Processing**: AI processing can be done locally with Ollama
- **Secure Storage**: Encrypted configuration and sensitive data

## 🔧 Troubleshooting

### Common Issues

**Build Failures**
```bash
# Clean and rebuild
pnpm run clean:all
pnpm install
pnpm run build:packages
```

**Permission Errors**
```bash
# Fix script permissions
chmod +x setup.sh
chmod +x scripts/*.js
```

**TypeScript Errors**
```bash
# Check types across all packages
pnpm run type-check
```

**Dashboard Not Loading**
```bash
# Check if dashboard is running
curl http://localhost:3000
# Check environment variables
cat .env | grep DASHBOARD
```

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/Andromedus24/free-cluely/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Andromedus24/free-cluely/discussions)
- **Documentation**: Check the `docs/` directory

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Run `pnpm run type-check` and `pnpm run lint`
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format
- **Testing**: Add tests for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Electron Team** for the amazing desktop framework
- **Next.js Team** for the excellent React framework
- **PNPM Team** for the fast package manager
- **TypeScript Team** for type safety
- **Open Source Community** for inspiration and tools

---

🌟 **Built with ❤️ by the Free-Cluely Team**

**Happy coding!** 🚀