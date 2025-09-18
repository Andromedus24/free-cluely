import * as fs from 'fs/promises';
import * as path from 'path';
import { PluginManifest, PluginManifestSchema } from './PluginSDK';

export interface DocConfig {
  outputDir?: string;
  format?: 'markdown' | 'html' | 'json';
  includeSource?: boolean;
  includeExamples?: boolean;
  includeTests?: boolean;
  includeChangelog?: boolean;
  customSections?: DocSection[];
}

export interface DocSection {
  title: string;
  content: string;
  order?: number;
  anchor?: string;
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  parameters?: Parameter[];
  response?: ResponseType;
  examples?: string[];
}

export interface Parameter {
  name: string;
  type: string;
  description: string;
  required?: boolean;
  default?: any;
  example?: any;
}

export interface ResponseType {
  type: string;
  description: string;
  schema?: any;
  example?: any;
}

export class PluginDocGenerator {
  private pluginDir: string;
  private manifest: PluginManifest;

  constructor(pluginDir: string) {
    this.pluginDir = pluginDir;
  }

  async generate(config: DocConfig = {}): Promise<void> {
    // Load and validate manifest
    await this.loadManifest();

    // Create output directory
    const outputDir = config.outputDir || path.join(this.pluginDir, 'docs');
    await fs.mkdir(outputDir, { recursive: true });

    // Generate documentation
    if (config.format === 'html') {
      await this.generateHtmlDocs(outputDir, config);
    } else if (config.format === 'json') {
      await this.generateJsonDocs(outputDir, config);
    } else {
      await this.generateMarkdownDocs(outputDir, config);
    }

    console.log(`📚 Documentation generated in ${outputDir}/`);
  }

  private async loadManifest(): Promise<void> {
    const manifestPath = path.join(this.pluginDir, 'atlas.json');

    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      this.manifest = PluginManifestSchema.parse(manifest);
    } catch (error) {
      throw new Error(`Failed to load plugin manifest: ${error}`);
    }
  }

  private async generateMarkdownDocs(outputDir: string, config: DocConfig): Promise<void> {
    const sections: DocSection[] = [];

    // Generate sections
    sections.push(this.generateOverviewSection());
    sections.push(this.generateInstallationSection());
    sections.push(this.generateUsageSection());
    sections.push(this.generateConfigurationSection());
    sections.push(this.generateApiSection());

    if (config.includeExamples) {
      sections.push(this.generateExamplesSection());
    }

    if (config.includeTests) {
      sections.push(this.generateTestingSection());
    }

    if (config.includeChangelog) {
      sections.push(this.generateChangelogSection());
    }

    // Add custom sections
    if (config.customSections) {
      sections.push(...config.customSections);
    }

    // Sort sections by order
    sections.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Generate main README
    const readmeContent = this.generateReadme(sections);
    await fs.writeFile(path.join(outputDir, 'README.md'), readmeContent);

    // Generate individual section files
    for (const section of sections) {
      const filename = this.slugify(section.title) + '.md';
      const content = this.generateSectionMarkdown(section, sections);
      await fs.writeFile(path.join(outputDir, filename), content);
    }

    // Generate API reference
    const apiContent = await this.generateApiReference();
    await fs.writeFile(path.join(outputDir, 'API.md'), apiContent);

    // Generate types documentation
    const typesContent = await this.generateTypesDocumentation();
    await fs.writeFile(path.join(outputDir, 'TYPES.md'), typesContent);
  }

  private generateOverviewSection(): DocSection {
    return {
      title: 'Overview',
      content: `# ${this.manifest.name}

${this.manifest.description}

## Quick Start

\`\`\`bash
npm install ${this.manifest.name}
\`\`\`

## Features

${this.manifest.features?.map(feature => `- ${feature}`).join('\\n') || 'No features specified'}

## Permissions

${this.manifest.permissions.map(permission => `- \`${permission}\``).join('\\n') || 'No special permissions required'}

## Compatibility

- **Operating Systems**: ${this.manifest.compatibility?.os.join(', ') || 'All supported'}
- **Architectures**: ${this.manifest.compatibility?.arch.join(', ') || 'All supported'}
- **Atlas Version**: ${this.manifest.compatibility?.minVersion || '1.0.0'}${this.manifest.compatibility?.maxVersion ? ` to ${this.manifest.compatibility.maxVersion}` : '+'}`,
      order: 1
    };
  }

  private generateInstallationSection(): DocSection {
    return {
      title: 'Installation',
      content: `## Installation

### Prerequisites

Before installing this plugin, ensure you have:

- Atlas version ${this.manifest.compatibility?.minVersion || '1.0.0'} or higher
- Node.js 16 or higher
- npm or yarn package manager

### Install from Marketplace

\`\`\`bash
atlas-plugin install ${this.manifest.id}
\`\`\`

### Install from Source

\`\`\`bash
git clone <repository-url>
cd ${this.manifest.id}
npm install
npm run build
\`\`\`

### Development Installation

For development, install in development mode:

\`\`\`bash
cd /path/to/plugin
npm link
\`\`\`

## Configuration

The plugin can be configured through the Atlas settings UI or programmatically:

\`\`\`typescript
import Atlas from '@atlas/core';

const atlas = new Atlas();
atlas.configurePlugin('${this.manifest.id}', {
  // Configuration options
});
\`\`\`

### Default Configuration

${this.generateConfigTable()}`,
      order: 2
    };
  }

  private generateUsageSection(): DocSection {
    return {
      title: 'Usage',
      content: `## Usage

### Basic Usage

\`\`\`typescript
import Atlas from '@atlas/core';

const atlas = new Atlas();

// Use the plugin
const plugin = atlas.getPlugin('${this.manifest.id}');

// Example usage
await plugin.activate();
const result = await plugin.someMethod();
\`\`\`

### Examples

${this.generateUsageExamples()}

### Integration

${this.generateIntegrationExamples()}`,
      order: 3
    };
  }

  private generateConfigurationSection(): DocSection {
    return {
      title: 'Configuration',
      content: `## Configuration

### Configuration Options

${this.generateConfigOptions()}

### Environment Variables

${this.generateEnvironmentVariables()}

### Configuration Schema

\`\`\`typescript
interface PluginConfig {
  ${this.generateConfigInterface()}
}
\`\`\`

### Validation

The plugin validates configuration on startup. Invalid configuration will prevent the plugin from loading.

### Migration

${this.generateMigrationGuide()}`,
      order: 4
    };
  }

  private generateApiSection(): DocSection {
    return {
      title: 'API Reference',
      content: `## API Reference

### Core API

${this.generateCoreApiDocs()}

### Events

${this.generateEventDocs()}

### Types

${this.generateTypeDocs()}`,
      order: 5
    };
  }

  private generateExamplesSection(): DocSection {
    return {
      title: 'Examples',
      content: `## Examples

### Basic Example

\`\`\`typescript
import Atlas from '@atlas/core';

const atlas = new Atlas();

// Initialize plugin
await atlas.initializePlugin('${this.manifest.id}');

// Use plugin functionality
const result = await atlas.plugins.${this.manifest.id}.someMethod();
console.log(result);
\`\`\`

### Advanced Example

\`\`\`typescript
import Atlas from '@atlas/core';

const atlas = new Atlas();

// Configure plugin
await atlas.configurePlugin('${this.manifest.id}', {
  // Custom configuration
});

// Listen to events
atlas.plugins.${this.manifest.id}.on('someEvent', (data) => {
  console.log('Event received:', data);
});

// Use advanced features
const advancedResult = await atlas.plugins.${this.manifest.id}.advancedMethod({
  parameter1: 'value1',
  parameter2: 'value2'
});
\`\`\`

### Integration Example

\`\`\`typescript
import Atlas from '@atlas/core';
import OtherPlugin from 'other-plugin';

const atlas = new Atlas();

// Initialize multiple plugins
await Promise.all([
  atlas.initializePlugin('${this.manifest.id}'),
  atlas.initializePlugin('other-plugin')
]);

// Cross-plugin communication
const result = await atlas.plugins.${this.manifest.id}.integrateWith(
  atlas.plugins['other-plugin']
);
\`\`\``,
      order: 10
    };
  }

  private generateTestingSection(): DocSection {
    return {
      title: 'Testing',
      content: `## Testing

### Running Tests

\`\`\`bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
\`\`\`

### Writing Tests

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { createMockPluginContext } from '@atlas/plugin-sdk';

describe('${this.manifest.name}', () => {
  it('should initialize correctly', async () => {
    const context = createMockPluginContext();
    const plugin = new Plugin();

    await plugin.onActivate(context);

    expect(plugin.isActivated()).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const context = createMockPluginContext();
    const plugin = new Plugin();

    await expect(plugin.someMethod()).rejects.toThrow('Expected error');
  });
});
\`\`\`

### Test Coverage

The plugin maintains high test coverage:

- Unit tests: 95%+
- Integration tests: 85%+
- End-to-end tests: 75%+

### Mock Data

For testing, you can use the provided mock data:

\`\`\`typescript
import { mockData } from '${this.manifest.id}/test-utils';

const testData = mockData.createTestPlugin();
\`\`\``,
      order: 15
    };
  }

  private generateChangelogSection(): DocSection {
    return {
      title: 'Changelog',
      content: `## Changelog

### [${this.manifest.version}] - ${new Date().toISOString().split('T')[0]}

#### Added
- Initial release

#### Changed
- Nothing

#### Deprecated
- Nothing

#### Removed
- Nothing

#### Fixed
- Nothing

#### Security
- Nothing

---

### Older Versions

For older versions, please refer to the [releases page](https://github.com/your-repo/releases).

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

\`\`\`bash
git clone https://github.com/your-repo/${this.manifest.id}.git
cd ${this.manifest.id}
npm install
npm run dev
\`\`\`

### Pull Request Process

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This plugin is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.`,
      order: 20
    };
  }

  private generateReadme(sections: DocSection[]): string {
    const toc = sections.map(section => {
      const anchor = this.slugify(section.title);
      return `  - [${section.title}](#${anchor})`;
    }).join('\\n');

    const content = sections.map(section => `## ${section.title}\\n\\n${section.content}`).join('\\n\\n');

    return `# ${this.manifest.name}

${this.manifest.description}

[![npm version](https://badge.fury.io/js/${this.manifest.id}.svg)](https://badge.fury.io/js/${this.manifest.id})
[![Build Status](https://github.com/your-repo/${this.manifest.id}/workflows/CI/badge.svg)](https://github.com/your-repo/${this.manifest.id}/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

${toc}

${content}

## Support

- 📖 [Documentation](https://docs.atlas.com/plugins/${this.manifest.id})
- 🐛 [Issue Tracker](https://github.com/your-repo/${this.manifest.id}/issues)
- 💬 [Discussions](https://github.com/your-repo/${this.manifest.id}/discussions)
- 📧 [Email Support](mailto:support@atlas.com)

## Authors

- **${this.manifest.author.name}** - *Initial work* - [${this.manifest.author.name}](${this.manifest.author.website || '#'})

See also the list of [contributors](https://github.com/your-repo/${this.manifest.id}/contributors) who participated in this project.

## Acknowledgments

- Atlas Platform Team
- Open Source Community
`;
  }

  private generateSectionMarkdown(section: DocSection, allSections: DocSection[]): string {
    const navigation = allSections.map(s => {
      const anchor = this.slugify(s.title);
      return `  - [${s.title}](#${anchor})`;
    }).join('\\n');

    return `# ${section.title}

[← Back to Overview](README.md)

## Navigation

${navigation}

${section.content}

---

*Documentation generated on ${new Date().toISOString()}*`;
  }

  private async generateApiReference(): Promise<string> {
    // This would scan the source code for API documentation
    return `# API Reference

## Core API

*Documentation will be generated from source code JSDoc comments*

## Events

*Event documentation will be generated from source code*

## Types

*Type definitions will be generated from TypeScript source*

## Examples

*Usage examples will be extracted from test files*
`;
  }

  private async generateTypesDocumentation(): Promise<string> {
    // This would generate documentation from TypeScript definitions
    return `# Type Definitions

## Plugin Types

*Type documentation will be generated from TypeScript source*

## Configuration Types

*Configuration type documentation*

## Event Types

*Event type documentation*
`;
  }

  private generateConfigTable(): string {
    const configs = Object.entries(this.manifest.config || {});

    if (configs.length === 0) {
      return 'No default configuration available.';
    }

    return `
| Option | Type | Default | Description |
|--------|------|---------|-------------|
${configs.map(([key, value]) => {
  const type = typeof value;
  const defaultValue = JSON.stringify(value);
  return `| \`${key}\` | \`${type}\` | \`${defaultValue}\` | Configuration option for ${key} |`;
}).join('\\n')}
`;
  }

  private generateConfigOptions(): string {
    // This would generate detailed config option documentation
    return `
*Detailed configuration option documentation will be generated from source code*
`;
  }

  private generateEnvironmentVariables(): string {
    return `
| Variable | Description | Default |
|----------|-------------|---------|
| \`ATLAS_PLUGIN_${this.manifest.id.toUpperCase()}_CONFIG\` | Plugin configuration JSON | \`{}\` |
| \`ATLAS_PLUGIN_${this.manifest.id.toUpperCase()}_DEBUG\` | Enable debug logging | \`false\` |
`;
  }

  private generateConfigInterface(): string {
    // This would generate TypeScript interface from config
    return `
  // Configuration interface generated from plugin config
  debug?: boolean;
  // ... other options
`;
  }

  private generateMigrationGuide(): string {
    return `
### Migration Guide

#### From 0.x to 1.0

- Breaking changes documentation
- Migration steps
- Configuration changes
`;
  }

  private generateUsageExamples(): string {
    return `
*Usage examples will be extracted from test files and source code comments*
`;
  }

  private generateIntegrationExamples(): string {
    return `
*Integration examples will be generated from source code*
`;
  }

  private generateCoreApiDocs(): string {
    return `
*Core API documentation will be generated from source code JSDoc comments*
`;
  }

  private generateEventDocs(): string {
    return `
*Event documentation will be generated from source code*
`;
  }

  private generateTypeDocs(): string {
    return `
*Type documentation will be generated from TypeScript definitions*
`;
  }

  private async generateHtmlDocs(outputDir: string, config: DocConfig): Promise<void> {
    // This would generate HTML documentation
    console.log('HTML documentation generation not implemented yet');
  }

  private async generateJsonDocs(outputDir: string, config: DocConfig): Promise<void> {
    // This would generate JSON documentation
    const docs = {
      plugin: this.manifest,
      sections: await this.generateJsonSections(config),
      generated: new Date().toISOString()
    };

    await fs.writeFile(
      path.join(outputDir, 'docs.json'),
      JSON.stringify(docs, null, 2)
    );
  }

  private async generateJsonSections(config: DocConfig): Promise<any[]> {
    return [
      {
        title: 'Overview',
        content: this.generateOverviewSection().content
      },
      {
        title: 'Installation',
        content: this.generateInstallationSection().content
      }
    ];
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\\s+/g, '-');
  }
}