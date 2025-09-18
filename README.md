# Atlas: All in one assistant

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0-brightgreen.svg)](https://nodejs.org/)
[![PNPM](https://img.shields.io/badge/pnpm-%3E%3D9.0-orange.svg)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/electron-33.2.0-9ff4ff.svg)](https://www.electronjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

🌟 **Atlas: All in one assistant** is an advanced AI-powered personal assistant that integrates cutting-edge technologies from multiple innovative projects, including voice control, productivity monitoring, educational tools, social messaging, and 3D modeling capabilities.

## ✨ Features

### 🏗️ Modern Architecture
- **Monorepo Structure**: PNPM + Turborepo for efficient development
- **TypeScript Strict**: Full type safety across all components
- **Electron Security**: Context isolation, no nodeIntegration, sandboxed renderer
- **Plugin System**: Extensible architecture with typed IPC communication

### 🗣️ Voice Assistant (Tango Integration)
- **Hotword Detection**: Wake word activation for hands-free control
- **Speech Recognition**: Natural language processing with AI responses
- **Memory System**: Context-aware conversations with persistence
- **Clipboard Integration**: Smart clipboard management and automation
- **Voice Commands**: Customizable voice-triggered actions

### 📊 Productivity Monitoring (HackTheNorth Integration)
- **Computer Vision**: AI-powered activity tracking and analysis
- **Productivity Scoring**: Real-time productivity metrics and insights
- **Session Management**: Automated work session tracking with breaks
- **Real-time Communication**: WebSocket-based live monitoring
- **Analytics Dashboard**: Comprehensive productivity analytics and reporting

### 🎓 Educational Tools (SigmaScholar Integration)
- **Knowledge Management**: Organized learning content and resources
- **Quiz Generation**: AI-powered question generation from content
- **Spaced Repetition**: Optimized learning schedules and retention
- **Chrome Extension**: Web content integration and highlighting
- **Learning Sessions**: Structured educational experiences with progress tracking

### 💬 Social Messaging (Stray-Sender Integration)
- **Real-time Messaging**: Instant communication with multiple channels
- **AI Content Ranking**: Intelligent message prioritization and filtering
- **Automation**: Scheduled messaging and response templates
- **Sentiment Analysis**: Emotional tone detection and insights
- **Collaboration**: Team communication and task management

### 🎨 3D Modeling (ShapeShift Integration)
- **Gesture Control**: Webcam-based hand gesture recognition
- **Real-time Rendering**: Advanced 3D visualization with Canvas/WebGL
- **Object Manipulation**: Comprehensive 3D object editing tools
- **Layout Presets**: Pre-built 3D scene templates and arrangements
- **AI Assistance**: Intelligent 3D modeling suggestions and automation

### 🖥️ Dashboard Interface
- **Unified Interface**: Single dashboard for all integrated features
- **Real-time Monitoring**: Live updates across all systems
- **Modular Design**: Configurable widget-based layout
- **Cross-platform**: Web-based dashboard with Electron integration
- **Performance Metrics**: System usage and analytics tracking

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
- Modern web browser with WebGL support
- Microphone (for voice assistant features)
- Webcam (for gesture control and productivity monitoring)

### One-Click Setup
```bash
# Clone and setup automatically
git clone https://github.com/Andromedus24/free-cluely.git
cd free-cluely
./setup.sh
```

### Manual Setup
```bash
# Install dependencies
pnpm install

# Build all packages and integrated features
pnpm run build:packages

# Copy environment template
cp .env.example .env

# Configure environment variables
nano .env

# Start development with all features
pnpm run dev:all
```

### Feature-Specific Setup
```bash
# Voice assistant setup
pnpm run dev:voice

# Productivity monitoring setup
pnpm run dev:productivity

# 3D modeling with gesture control
pnpm run dev:modeling

# Educational tools setup
pnpm run dev:education

# Social messaging setup
pnpm run dev:messaging
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
atlas/
├── apps/
│   ├── dashboard/          # Next.js dashboard application
│   │   ├── src/
│   │   │   ├── app/        # App router pages
│   │   │   │   ├── voice/          # Voice assistant pages
│   │   │   │   ├── productivity/   # Productivity monitoring pages
│   │   │   │   ├── education/      # Educational tools pages
│   │   │   │   ├── messaging/      # Social messaging pages
│   │   │   │   ├── modeling/       # 3D modeling pages
│   │   │   │   └── api/           # API routes
│   │   │   ├── components/        # React components
│   │   │   │   ├── voice-assistant/     # Voice UI components
│   │   │   │   ├── productivity/        # Productivity UI components
│   │   │   │   ├── education/           # Educational UI components
│   │   │   │   ├── messaging/           # Messaging UI components
│   │   │   │   ├── 3d-modeling/         # 3D modeling UI components
│   │   │   │   └── ui/                  # Shared UI components
│   │   │   ├── contexts/        # React contexts
│   │   │   ├── services/        # Service layer
│   │   │   └── lib/            # Utilities
│   │   └── out/               # Static export output
│   └── electron-host/         # Electron main application
│       ├── src/
│       │   ├── main.ts         # Main process
│       │   ├── preload.ts      # Preload script
│       │   └── fallback.html   # Fallback UI
│       └── dist/              # Compiled TypeScript
├── packages/
│   ├── shared/              # Shared types and utilities
│   ├── database/            # Database and storage services
│   ├── plugin-bus/          # Plugin communication system
│   ├── config/              # Configuration management
│   ├── permissions/         # Permission system
│   ├── boards/              # Board management system
│   ├── connectors/          # External service connectors
│   ├── moderation/          # Content moderation
│   ├── observability/       # Monitoring and logging
│   ├── offline/             # Offline functionality
│   ├── plugin-marketplace/  # Plugin marketplace
│   ├── settings/            # Settings management
│   └── workflow-builder/    # Workflow automation
├── plugins/
│   ├── puppeteer-worker/    # Browser automation plugin
│   ├── vision-service/      # Image analysis plugin
│   ├── voice-processor/     # Voice processing plugin
│   ├── gesture-recognition/ # Gesture recognition plugin
│   └── ai-assistant/        # AI assistant plugin
├── scripts/
│   ├── setup.sh            # Development setup script
│   ├── build-prod.js       # Production build script
│   ├── before-build.js     # Pre-build validation
│   └── migrate-data.js     # Data migration scripts
├── assets/
│   ├── icons/              # Application icons
│   ├── entitlements.mac.plist # macOS security
│   ├── installer.nsh       # Windows installer script
│   └── models/             # 3D models and assets
└── release/                # Built applications
```

## ⚙️ Configuration

### Environment Variables
Create a `.env` file based on `.env.example`:

```env
# LLM Configuration
GEMINI_API_KEY=your_gemini_api_key_here
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
OPENAI_API_KEY=your_openai_api_key_here

# Voice Assistant (Tango)
VOICE_HOTWORD="hey atlas"
VOICE_LANGUAGE="en-US"
VOICE_PITCH=1.0
VOICE_RATE=1.0

# Productivity Monitoring (HackTheNorth)
PRODUCTIVITY_CAMERA_ENABLED=true
PRODUCTIVITY_SESSION_DURATION=25
PRODUCTIVITY_BREAK_DURATION=5
PRODUCTIVITY_ANALYTICS_ENABLED=true

# Educational Tools (SigmaScholar)
EDUCATION_SPACED_REPETITION=true
EDUCATION_QUIZ_DIFFICULTY=medium
EDUCATION_PROGRESS_TRACKING=true

# Social Messaging (Stray-Sender)
MESSAGING_REALTIME_ENABLED=true
MESSAGING_AI_RANKING=true
MESSAGING_SENTIMENT_ANALYSIS=true

# 3D Modeling (ShapeShift)
MODELING_GESTURE_CONTROL=true
MODELING_WEBCAM_ENABLED=true
MODELING_RENDER_QUALITY=high

# Permissions
PERMISSION_SCREEN=true
PERMISSION_CLIPBOARD=true
PERMISSION_AUTOMATION=true
PERMISSION_NETWORK=true
PERMISSION_CAMERA=true
PERMISSION_MICROPHONE=true

# Automation Security
AUTOMATION_ALLOWLIST=example.com,*.trusted-domain.com

# Dashboard
DASHBOARD_PORT=3000
DASHBOARD_ENABLED=true

# Database
DATABASE_URL=sqlite:///atlas.db
DATABASE_BACKUP_ENABLED=true

# Security
SESSION_SECRET=your_secure_session_secret_here
ENCRYPTION_KEY=your_encryption_key_here

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
pnpm run dev:voice         # Voice assistant only
pnpm run dev:productivity  # Productivity monitoring only
pnpm run dev:education     # Educational tools only
pnpm run dev:messaging     # Social messaging only
pnpm run dev:modeling      # 3D modeling only
```

### Building
```bash
pnpm run build              # Build all components
pnpm run build:prod        # Production build
pnpm run build:static      # Static export
pnpm run build:packages    # Build packages only
pnpm run build:voice       # Voice assistant build
pnpm run build:modeling    # 3D modeling build
```

### Testing
```bash
pnpm run test               # Run all tests
pnpm run test:unit         # Unit tests only
pnpm run test:integration  # Integration tests only
pnpm run test:e2e          # End-to-end tests only
pnpm run test:voice        # Voice assistant tests
pnpm run test:modeling     # 3D modeling tests
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
pnpm run format             # Format code with Prettier
pnpm run clean              # Clean build artifacts
pnpm run migrate            # Run database migrations
pnpm run backup             # Backup data and configurations
```

## 📊 Dashboard Features

### Settings Management
- **LLM Configuration**: Gemini, OpenAI, and Ollama provider setup
- **Permission Controls**: Granular permission management for all features
- **Automation Settings**: Domain allowlist configuration
- **Voice Settings**: Hotword, language, pitch, and rate configuration
- **Productivity Settings**: Session duration, camera permissions, analytics
- **Educational Settings**: Quiz difficulty, spaced repetition, progress tracking
- **Messaging Settings**: Real-time features, AI ranking, sentiment analysis
- **3D Modeling Settings**: Gesture control, webcam, render quality
- **Dashboard Options**: Port and enable/disable settings
- **Telemetry**: Anonymous usage statistics

### Voice Assistant Features
- **Hotword Detection**: Configure wake words and sensitivity
- **Speech Recognition**: Language and accent settings
- **Memory Management**: Conversation history and context
- **Voice Commands**: Custom command creation and management
- **Audio Settings**: Microphone selection and audio output
- **Privacy Controls**: Voice data storage and deletion

### Productivity Monitoring
- **Activity Tracking**: Real-time productivity metrics and scoring
- **Session Management**: Work session timing and break reminders
- **Camera Integration**: Computer vision-based activity monitoring
- **Analytics Dashboard**: Productivity trends and insights
- **Goal Setting**: Custom productivity targets and tracking
- **Focus Mode**: Distraction blocking and concentration tools

### Educational Tools
- **Knowledge Base**: Organized learning content and resources
- **Quiz Generation**: AI-powered question creation from content
- **Learning Sessions**: Structured educational experiences
- **Progress Tracking**: Learning analytics and achievement tracking
- **Spaced Repetition**: Optimized review schedules
- **Content Import**: Web page and document integration

### Social Messaging
- **Real-time Communication**: Instant messaging with multiple channels
- **AI Content Ranking**: Intelligent message prioritization
- **Automation**: Scheduled messages and response templates
- **Sentiment Analysis**: Emotional tone detection and insights
- **Collaboration**: Team communication and task management
- **Privacy Controls**: Message encryption and data retention

### 3D Modeling & Gesture Control
- **Gesture Recognition**: Webcam-based hand tracking
- **3D Object Manipulation**: Comprehensive editing tools
- **Scene Management**: Multiple 3D scenes and layouts
- **Real-time Rendering**: Advanced visualization options
- **AI Assistance**: Intelligent modeling suggestions
- **Export Options**: Multiple format support

### Logs & Monitoring
- **Real-time Logs**: Live log streaming with filtering
- **Feature Activity**: Individual system monitoring
- **Error Tracking**: Error aggregation and analysis
- **Performance Metrics**: System resource usage
- **Export Options**: JSON and CSV log export

### System Management
- **Feature Discovery**: Browse and enable/disable features
- **Resource Usage**: Memory and CPU monitoring
- **System Status**: Real-time health monitoring
- **Backup & Recovery**: Data backup and restoration
- **Update Management**: Automatic and manual updates

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

**Voice Assistant Issues**
```bash
# Check microphone permissions
# On macOS: System Preferences > Security & Privacy > Microphone
# On Windows: Settings > Privacy > Microphone

# Test microphone access
pnpm run test:audio

# Reset voice assistant
pnpm run reset:voice
```

**Camera/Gesture Control Issues**
```bash
# Check camera permissions
# On macOS: System Preferences > Security & Privacy > Camera
# On Windows: Settings > Privacy > Camera

# Test webcam access
pnpm run test:camera

# Reset gesture recognition
pnpm run reset:gestures
```

**Database Issues**
```bash
# Check database connection
pnpm run test:database

# Migrate database
pnpm run migrate

# Backup database
pnpm run backup:database

# Restore database
pnpm run restore:database
```

**Performance Issues**
```bash
# Check system resources
pnpm run monitor:resources

# Clear cache
pnpm run clean:cache

# Optimize database
pnpm run optimize:database

# Restart services
pnpm run restart:all
```

### Getting Help

- **Documentation**: [docs.atlas-assistant.com](https://docs.atlas-assistant.com)
- **Issues**: [GitHub Issues](https://github.com/atlas-assistant/atlas/issues)
- **Discord**: [Community Server](https://discord.gg/atlas-assistant)
- **Discussions**: [GitHub Discussions](https://github.com/atlas-assistant/atlas/discussions)

### Feature-Specific Help

**Voice Assistant**
- Microphone permission setup
- Hotword detection troubleshooting
- Speech recognition accuracy
- Memory system management

**Productivity Monitoring**
- Camera setup and calibration
- Productivity scoring algorithms
- Session management issues
- Analytics interpretation

**Educational Tools**
- Content import and formatting
- Quiz generation settings
- Learning schedule optimization
- Progress tracking issues

**Social Messaging**
- Real-time connectivity
- AI ranking configuration
- Template creation
- Privacy and security settings

**3D Modeling**
- Webcam gesture calibration
- 3D object manipulation
- Rendering performance
- Export and import issues

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
- Comprehensive testing coverage

### Feature Contributions
We especially welcome contributions to:
- **Voice Assistant**: New voice commands, improved recognition
- **Productivity Monitoring**: Better activity tracking algorithms
- **Educational Tools**: New quiz types, learning strategies
- **Social Messaging**: Enhanced AI ranking, new automation features
- **3D Modeling**: Additional gesture controls, rendering improvements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Electron Team** for the amazing desktop framework
- **Next.js Team** for the excellent React framework
- **PNPM Team** for the fast package manager
- **TypeScript Team** for type safety
- **Tango Project** for the voice assistant architecture
- **HackTheNorth Team** for productivity monitoring insights
- **SigmaScholar Team** for educational technology inspiration
- **Stray-Sender Team** for social messaging innovations
- **ShapeShift Team** for 3D modeling and gesture control concepts
- **Community Contributors** for making this project better

---

🌟 **Built with ❤️ by the Atlas Team**

## 📘 Documentation

- Product Requirements Document (PRD): [PRD.md](./PRD.md)
- Implementation Tasks: [TASKS.md](./TASKS.md)
- API Documentation: [docs/api](./docs/api)
- Feature Guides: [docs/features](./docs/features)

## 🚀 Roadmap

### Upcoming Features
- **Enhanced AI Integration**: GPT-4, Claude, and local model support
- **Mobile App**: iOS and Android companion applications
- **Browser Extensions**: Enhanced web integration features
- **Advanced 3D Features**: Three.js integration, complex 3D operations
- **Voice Marketplace**: Community-created voice commands and skills
- **Educational Marketplace**: Shared learning content and courses
- **Productivity API**: Integration with popular productivity tools
- **Social Features**: Enhanced collaboration and community features

### Long-term Vision
Atlas aims to become the definitive AI-powered personal assistant platform, integrating the best features from multiple innovative projects into a cohesive, user-friendly experience that enhances productivity, learning, communication, and creativity.