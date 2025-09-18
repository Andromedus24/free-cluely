import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { PluginManifest, PluginManifestSchema } from './PluginSDK';

export interface TemplateConfig {
  name: string;
  description: string;
  category: string;
  author: {
    name: string;
    email?: string;
    website?: string;
  };
  version?: string;
  template?: string;
  permissions?: string[];
  dependencies?: Record<string, string>;
  features?: string[];
  outputDir?: string;
  force?: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  files: TemplateFile[];
  manifest: Partial<PluginManifest>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface TemplateFile {
  path: string;
  content: string;
  encoding?: 'utf8' | 'base64';
  executable?: boolean;
}

export const TemplateConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  author: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    website: z.string().url().optional()
  }),
  version: z.string().default('1.0.0'),
  template: z.string().default('basic'),
  permissions: z.array(z.string()).default([]),
  dependencies: z.record(z.string()).optional(),
  features: z.array(z.string()).optional(),
  outputDir: z.string().optional(),
  force: z.boolean().default(false)
});

export type TemplateConfigType = z.infer<typeof TemplateConfigSchema>;

export class TemplateGenerator {
  private templates: Map<string, Template> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  private registerDefaultTemplates(): void {
    // Basic template
    this.templates.set('basic', {
      id: 'basic',
      name: 'Basic Plugin',
      description: 'A basic plugin template with minimal functionality',
      files: [
        {
          path: 'src/index.ts',
          content: `import { PluginBase, PluginContext } from '@atlas/plugin-sdk';

export default class BasicPlugin extends PluginBase {
  async onActivate(context: PluginContext): Promise<void> {
    context.logger.info('Basic plugin activated');

    // Create a simple panel
    const panel = context.ui.createPanel({
      id: 'basic-panel',
      title: 'Basic Plugin',
      content: '<h1>Hello from Basic Plugin!</h1>',
      position: 'right',
      size: 300
    });

    panel.show();
  }

  async onDeactivate(context: PluginContext): Promise<void> {
    context.logger.info('Basic plugin deactivated');
  }
}
`
        },
        {
          path: 'package.json',
          content: `{
  "name": "{{name}}",
  "version": "{{version}}",
  "description": "{{description}}",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "package": "npm run build && atlas-plugin package"
  },
  "keywords": ["atlas", "plugin"],
  "author": "{{author.name}}",
  "license": "MIT",
  "devDependencies": {
    "@atlas/plugin-sdk": "^1.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  }
}`
        },
        {
          path: 'tsconfig.json',
          content: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}`
        },
        {
          path: 'README.md',
          content: `# {{name}}

{{description}}

## Installation

1. Clone this repository
2. Install dependencies: \`npm install\`
3. Build the plugin: \`npm run build\`
4. Install the plugin: \`atlas-plugin install\`

## Development

- Build: \`npm run build\`
- Watch mode: \`npm run dev\`
- Test: \`npm run test\`
- Lint: \`npm run lint\`

## Usage

[Describe how to use your plugin here]

## Configuration

[Describe any configuration options here]

## API Reference

[Document your plugin's API here]

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT`
        },
        {
          path: '.gitignore',
          content: `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production
dist/
build/

# Testing
coverage/
.nyc_output/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp`
        }
      ],
      manifest: {
        permissions: [],
        config: {},
        features: []
      }
    });

    // UI Component template
    this.templates.set('ui-component', {
      id: 'ui-component',
      name: 'UI Component Plugin',
      description: 'A plugin template focused on UI components',
      files: [
        {
          path: 'src/index.ts',
          content: `import { PluginBase, PluginContext } from '@atlas/plugin-sdk';

export default class UIComponentPlugin extends PluginBase {
  private panel: any;
  private button: any;

  async onActivate(context: PluginContext): Promise<void> {
    context.logger.info('UI Component plugin activated');

    // Create a panel
    this.panel = context.ui.createPanel({
      id: 'ui-panel',
      title: 'UI Component Plugin',
      content: this.createPanelContent(),
      position: 'right',
      size: 400,
      resizable: true
    });

    // Create a toolbar button
    this.button = context.ui.createButton({
      id: 'ui-button',
      label: 'UI Plugin',
      icon: '🎨',
      type: 'primary',
      onClick: () => this.togglePanel()
    });

    this.panel.show();
  }

  async onDeactivate(context: PluginContext): Promise<void> {
    context.logger.info('UI Component plugin deactivated');
    if (this.panel) {
      this.panel.close();
    }
  }

  private createPanelContent(): string {
    return \`
      <div style="padding: 20px;">
        <h2>UI Component Plugin</h2>
        <p>This is a sample UI component plugin.</p>

        <div style="margin-top: 20px;">
          <button id="sample-button" style="
            background: #007acc;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
          ">Click Me</button>
        </div>

        <div id="result" style="margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 4px;"></div>
      </div>
    \`;
  }

  private togglePanel(): void {
    if (this.panel) {
      if (this.panel.visible) {
        this.panel.hide();
      } else {
        this.panel.show();
      }
    }
  }
}
`
        },
        {
          path: 'src/styles.css',
          content: `/* UI Component Plugin Styles */

.plugin-panel {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 20px;
  max-width: 100%;
  box-sizing: border-box;
}

.plugin-panel h2 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
}

.plugin-panel p {
  margin: 0 0 20px 0;
  color: #666;
  line-height: 1.6;
}

.plugin-button {
  background: #007acc;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.plugin-button:hover {
  background: #005a9e;
}

.plugin-button:active {
  background: #004d8a;
}

.plugin-result {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.5;
}

.plugin-result.success {
  background: #d4edda;
  border-color: #c3e6cb;
  color: #155724;
}

.plugin-result.error {
  background: #f8d7da;
  border-color: #f5c6cb;
  color: #721c24;
}`
        },
        {
          path: 'package.json',
          content: `{
  "name": "{{name}}",
  "version": "{{version}}",
  "description": "{{description}}",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "package": "npm run build && atlas-plugin package"
  },
  "keywords": ["atlas", "plugin", "ui"],
  "author": "{{author.name}}",
  "license": "MIT",
  "devDependencies": {
    "@atlas/plugin-sdk": "^1.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  }
}`
        },
        {
          path: 'tsconfig.json',
          content: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}`
        }
      ],
      manifest: {
        permissions: ['ui'],
        config: {},
        features: ['ui-components']
      }
    });

    // API Service template
    this.templates.set('api-service', {
      id: 'api-service',
      name: 'API Service Plugin',
      description: 'A plugin template for API integration services',
      files: [
        {
          path: 'src/index.ts',
          content: `import { PluginBase, PluginContext } from '@atlas/plugin-sdk';

export interface ApiServiceConfig {
  apiKey?: string;
  baseUrl: string;
  timeout?: number;
}

export default class ApiServicePlugin extends PluginBase {
  private config: ApiServiceConfig;

  async onActivate(context: PluginContext): Promise<void> {
    context.logger.info('API Service plugin activated');

    // Load configuration
    this.config = {
      ...context.config,
      timeout: context.config.timeout || 5000
    };

    // Create API client
    const apiClient = context.api;

    // Test connection
    try {
      const response = await apiClient.get('/health');
      context.logger.info('API connection successful', response);
    } catch (error) {
      context.logger.error('API connection failed', error as Error);
    }

    // Create menu item
    const menuItem = context.ui.createMenuItem({
      id: 'api-menu-item',
      label: 'API Service',
      icon: '🔌',
      onClick: () => this.showApiDialog(context)
    });
  }

  async onDeactivate(context: PluginContext): Promise<void> {
    context.logger.info('API Service plugin deactivated');
  }

  private async showApiDialog(context: PluginContext): Promise<void> {
    const dialog = context.ui.createDialog({
      id: 'api-dialog',
      title: 'API Service',
      content: \`
        <div style="padding: 20px;">
          <h3>API Service Plugin</h3>
          <p>Base URL: \${this.config.baseUrl}</p>
          <p>Timeout: \${this.config.timeout}ms</p>
          <button id="test-api-btn">Test API</button>
          <div id="api-result" style="margin-top: 20px;"></div>
        </div>
      \`,
      width: 500,
      height: 400,
      modal: true,
      buttons: [
        {
          id: 'close',
          label: 'Close',
          type: 'default'
        }
      ]
    });

    dialog.show();

    // Handle button click (this would be implemented by the host)
    dialog.on('button-click', (buttonId: string) => {
      if (buttonId === 'close') {
        dialog.close();
      }
    });
  }

  async callApi(endpoint: string, options?: any): Promise<any> {
    const response = await fetch(\`\${this.config.baseUrl}\${endpoint}\`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.config.apiKey ? \`Bearer \${this.config.apiKey}\` : undefined,
        ...options?.headers
      },
      timeout: this.config.timeout
    });

    if (!response.ok) {
      throw new Error(\`API request failed: \${response.status}\`);
    }

    return response.json();
  }
}
`
        },
        {
          path: 'src/services/ApiService.ts',
          content: `import { ApiClient } from '@atlas/plugin-sdk';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

export class ApiService {
  constructor(
    private apiClient: ApiClient,
    private baseUrl: string,
    private apiKey?: string
  ) {}

  async get<T = any>(endpoint: string, config?: any): Promise<ApiResponse<T>> {
    const response = await this.apiClient.get<T>(\`\${this.baseUrl}\${endpoint}\`, {
      ...config,
      headers: {
        'Authorization': this.apiKey ? \`Bearer \${this.apiKey}\` : undefined,
        ...config?.headers
      }
    });

    return {
      data: response.data!,
      status: response.status,
      headers: response.headers
    };
  }

  async post<T = any>(endpoint: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.apiClient.post<T>(\`\${this.baseUrl}\${endpoint}\`, data, {
      ...config,
      headers: {
        'Authorization': this.apiKey ? \`Bearer \${this.apiKey}\` : undefined,
        ...config?.headers
      }
    });

    return {
      data: response.data!,
      status: response.status,
      headers: response.headers
    };
  }

  async put<T = any>(endpoint: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.apiClient.put<T>(\`\${this.baseUrl}\${endpoint}\`, data, {
      ...config,
      headers: {
        'Authorization': this.apiKey ? \`Bearer \${this.apiKey}\` : undefined,
        ...config?.headers
      }
    });

    return {
      data: response.data!,
      status: response.status,
      headers: response.headers
    };
  }

  async delete<T = any>(endpoint: string, config?: any): Promise<ApiResponse<T>> {
    const response = await this.apiClient.delete<T>(\`\${this.baseUrl}\${endpoint}\`, {
      ...config,
      headers: {
        'Authorization': this.apiKey ? \`Bearer \${this.apiKey}\` : undefined,
        ...config?.headers
      }
    });

    return {
      data: response.data!,
      status: response.status,
      headers: response.headers
    };
  }
}
`
        },
        {
          path: 'src/types/index.ts',
          content: `export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  createdAt: string;
}
`
        }
      ],
      manifest: {
        permissions: ['network', 'storage'],
        config: {
          baseUrl: '',
          timeout: 5000
        },
        features: ['api-integration']
      }
    });

    // Tool/Utility template
    this.templates.set('tool', {
      id: 'tool',
      name: 'Tool/Utility Plugin',
      description: 'A plugin template for utility tools and functions',
      files: [
        {
          path: 'src/index.ts',
          content: `import { PluginBase, PluginContext } from '@atlas/plugin-sdk';

export default class ToolPlugin extends PluginBase {
  private tools: Map<string, Function> = new Map();

  async onActivate(context: PluginContext): Promise<void> {
    context.logger.info('Tool plugin activated');

    // Register tools
    this.registerTools();

    // Create menu items for tools
    this.createToolMenus(context);
  }

  async onDeactivate(context: PluginContext): Promise<void> {
    context.logger.info('Tool plugin deactivated');
  }

  private registerTools(): void {
    // Text processing tools
    this.tools.set('uppercase', (text: string) => text.toUpperCase());
    this.tools.set('lowercase', (text: string) => text.toLowerCase());
    this.tools.set('capitalize', (text: string) =>
      text.replace(/\\b\\w/g, l => l.toUpperCase())
    );
    this.tools.set('reverse', (text: string) => text.split('').reverse().join(''));
    this.tools.set('trim', (text: string) => text.trim());
    this.tools.set('wordCount', (text: string) => text.split(/\\s+/).filter(word => word.length > 0).length);
    this.tools.set('charCount', (text: string) => text.length);

    // JSON tools
    this.tools.set('formatJson', (json: string) => JSON.stringify(JSON.parse(json), null, 2));
    this.tools.set('minifyJson', (json: string) => JSON.stringify(JSON.parse(json)));
    this.tools.set('validateJson', (json: string) => {
      try {
        JSON.parse(json);
        return { valid: true, error: null };
      } catch (error) {
        return { valid: false, error: (error as Error).message };
      }
    });

    // Utility tools
    this.tools.set('generateUuid', () => crypto.randomUUID());
    this.tools.set('generateRandomNumber', (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min
    );
    this.tools.set('getCurrentTimestamp', () => new Date().toISOString());
  }

  private createToolMenus(context: PluginContext): void {
    // Text processing submenu
    context.ui.createMenuItem({
      id: 'text-tools',
      label: 'Text Tools',
      icon: '📝',
      submenu: [
        {
          id: 'uppercase-tool',
          label: 'Uppercase',
          onClick: () => this.executeTool('uppercase')
        },
        {
          id: 'lowercase-tool',
          label: 'Lowercase',
          onClick: () => this.executeTool('lowercase')
        },
        {
          id: 'capitalize-tool',
          label: 'Capitalize',
          onClick: () => this.executeTool('capitalize')
        }
      ]
    });

    // JSON tools submenu
    context.ui.createMenuItem({
      id: 'json-tools',
      label: 'JSON Tools',
      icon: '🔧',
      submenu: [
        {
          id: 'format-json-tool',
          label: 'Format JSON',
          onClick: () => this.executeTool('formatJson')
        },
        {
          id: 'minify-json-tool',
          label: 'Minify JSON',
          onClick: () => this.executeTool('minifyJson')
        },
        {
          id: 'validate-json-tool',
          label: 'Validate JSON',
          onClick: () => this.executeTool('validateJson')
        }
      ]
    });
  }

  private async executeTool(toolName: string): Promise<void> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      console.error(\`Tool \${toolName} not found\`);
      return;
    }

    try {
      // Get input from user (this would be implemented by the host)
      const input = await this.getUserInput(toolName);
      const result = tool(input);

      // Show result
      this.showResult(toolName, result);
    } catch (error) {
      console.error(\`Tool \${toolName} failed:\`, error);
      this.showError(toolName, error as Error);
    }
  }

  private async getUserInput(toolName: string): Promise<any> {
    // This would be implemented by the host to get user input
    return prompt(\`Enter input for \${toolName}:\`);
  }

  private showResult(toolName: string, result: any): void {
    // This would be implemented by the host to show results
    console.log(\`\${toolName} result:\`, result);
  }

  private showError(toolName: string, error: Error): void {
    // This would be implemented by the host to show errors
    console.error(\`\${toolName} error:\`, error.message);
  }

  // Public API for other plugins
  getTool(toolName: string): Function | undefined {
    return this.tools.get(toolName);
  }

  getAllTools(): string[] {
    return Array.from(this.tools.keys());
  }
}
`
        }
      ],
      manifest: {
        permissions: ['ui'],
        config: {},
        features: ['tools', 'utilities']
      }
    });
  }

  async generate(config: TemplateConfigType): Promise<void> {
    const validatedConfig = TemplateConfigSchema.parse(config);
    const template = this.templates.get(validatedConfig.template);

    if (!template) {
      throw new Error(\`Template \${validatedConfig.template} not found\`);
    }

    // Generate plugin directory name
    const pluginName = validatedConfig.name.toLowerCase().replace(/\\s+/g, '-');
    const outputDir = validatedConfig.outputDir || path.join(process.cwd(), pluginName);

    // Check if directory exists
    try {
      await fs.access(outputDir);
      if (!validatedConfig.force) {
        throw new Error(\`Directory \${outputDir} already exists. Use --force to overwrite.\`);
      }
    } catch {
      // Directory doesn't exist, continue
    }

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Generate manifest
    const manifest = this.generateManifest(validatedConfig, template);
    await fs.writeFile(
      path.join(outputDir, 'atlas.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Generate files
    for (const file of template.files) {
      const filePath = path.join(outputDir, file.path);
      const fileDir = path.dirname(filePath);

      // Create directory if it doesn't exist
      await fs.mkdir(fileDir, { recursive: true });

      // Process template variables
      const content = this.processTemplate(file.content, validatedConfig);

      // Write file
      await fs.writeFile(filePath, content, file.encoding || 'utf8');

      // Set executable flag if needed
      if (file.executable) {
        // This would be implemented based on the platform
      }
    }

    console.log(\`Plugin \${validatedConfig.name} generated successfully in \${outputDir}\`);
  }

  private generateManifest(config: TemplateConfigType, template: Template): PluginManifest {
    const manifest: PluginManifest = {
      id: config.name.toLowerCase().replace(/\\s+/g, '-'),
      name: config.name,
      version: config.version || '1.0.0',
      description: config.description,
      author: config.author,
      category: config.category,
      main: 'dist/index.js',
      permissions: [...(template.manifest.permissions || []), ...(config.permissions || [])],
      config: { ...(template.manifest.config || {}), ...config },
      features: [...(template.manifest.features || []), ...(config.features || [])],
      entry: 'dist/index.js',
      tags: ['atlas', 'plugin', config.category.toLowerCase()],
      compatibility: {
        os: ['windows', 'macos', 'linux'],
        arch: ['x64', 'arm64'],
        minVersion: '1.0.0'
      }
    };

    // Validate manifest
    return PluginManifestSchema.parse(manifest);
  }

  private processTemplate(content: string, config: TemplateConfigType): string {
    return content
      .replace(/{{name}}/g, config.name)
      .replace(/{{description}}/g, config.description)
      .replace(/{{version}}/g, config.version || '1.0.0')
      .replace(/{{category}}/g, config.category)
      .replace(/{{author.name}}/g, config.author.name)
      .replace(/{{author.email}}/g, config.author.email || '')
      .replace(/{{author.website}}/g, config.author.website || '');
  }

  getTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  addTemplate(template: Template): void {
    this.templates.set(template.id, template);
  }

  removeTemplate(id: string): boolean {
    return this.templates.delete(id);
  }
}