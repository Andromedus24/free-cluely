import * as fs from 'fs/promises';
import * as path from 'path';
import { IConnector, ConnectorMetadata, ConfigurationSchema, ConfigurationProperty } from './ConnectorInterfaces';
import { ConnectorType } from '../types/ConnectorTypes';

/**
 * Documentation generator for connectors
 */
export class ConnectorDocumentation {
  private readonly outputDir: string;
  private readonly templatesDir: string;

  constructor(outputDir: string = './docs') {
    this.outputDir = outputDir;
    this.templatesDir = path.join(__dirname, 'templates');
  }

  /**
   * Generate comprehensive documentation for a connector
   */
  async generateDocumentation(
    connector: IConnector,
    options: DocumentationOptions = {}
  ): Promise<DocumentationResult> {
    const {
      includeApi = true,
      includeExamples = true,
      includeChangelog = true,
      includeTroubleshooting = true,
      format = 'markdown',
      theme = 'default'
    } = options;

    const startTime = Date.now();
    const files: string[] = [];

    try {
      // Create output directory
      await fs.mkdir(this.outputDir, { recursive: true });

      // Get connector metadata
      const metadata = await connector.getMetadata();
      const capabilities = connector.capabilities;
      const schema = connector.schema;

      // Generate main documentation
      if (includeApi) {
        const apiDoc = await this.generateApiDocumentation(
          connector,
          metadata,
          capabilities,
          schema
        );
        const apiFile = path.join(this.outputDir, 'api.md');
        await fs.writeFile(apiFile, apiDoc);
        files.push(apiFile);
      }

      // Generate configuration documentation
      const configDoc = await this.generateConfigurationDocumentation(
        metadata.configurationSchema
      );
      const configFile = path.join(this.outputDir, 'configuration.md');
      await fs.writeFile(configFile, configDoc);
      files.push(configFile);

      // Generate examples
      if (includeExamples) {
        const examples = await this.generateExamples(connector, metadata);
        const examplesDir = path.join(this.outputDir, 'examples');
        await fs.mkdir(examplesDir, { recursive: true });

        for (const [filename, content] of Object.entries(examples)) {
          const exampleFile = path.join(examplesDir, filename);
          await fs.writeFile(exampleFile, content);
          files.push(exampleFile);
        }
      }

      // Generate changelog
      if (includeChangelog) {
        const changelog = await this.generateChangelog(metadata);
        const changelogFile = path.join(this.outputDir, 'CHANGELOG.md');
        await fs.writeFile(changelogFile, changelog);
        files.push(changelogFile);
      }

      // Generate troubleshooting guide
      if (includeTroubleshooting) {
        const troubleshooting = await this.generateTroubleshooting(connector);
        const troubleshootingFile = path.join(this.outputDir, 'troubleshooting.md');
        await fs.writeFile(troubleshootingFile, troubleshooting);
        files.push(troubleshootingFile);
      }

      // Generate README
      const readme = await this.generateReadme(connector, metadata, capabilities);
      const readmeFile = path.join(this.outputDir, 'README.md');
      await fs.writeFile(readmeFile, readme);
      files.push(readmeFile);

      // Generate additional documentation based on format
      if (format === 'html') {
        const htmlDocs = await this.generateHtmlDocumentation(connector, metadata);
        const htmlDir = path.join(this.outputDir, 'html');
        await fs.mkdir(htmlDir, { recursive: true });

        for (const [filename, content] of Object.entries(htmlDocs)) {
          const htmlFile = path.join(htmlDir, filename);
          await fs.writeFile(htmlFile, content);
          files.push(htmlFile);
        }
      }

      return {
        success: true,
        files: files.map(f => path.relative(process.cwd(), f)),
        directory: this.outputDir,
        duration: Date.now() - startTime,
        metadata: {
          connectorId: connector.id,
          connectorName: connector.name,
          connectorType: connector.type,
          connectorVersion: connector.version,
          documentationVersion: '1.0.0',
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        files: [],
        directory: this.outputDir,
        duration: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  /**
   * Generate API documentation
   */
  private async generateApiDocumentation(
    connector: IConnector,
    metadata: ConnectorMetadata,
    capabilities: any,
    schema: any
  ): Promise<string> {
    const sections = [
      this.generateHeader('API Documentation', connector.name),
      this.generateOverview(connector, metadata),
      this.generateQuickStart(connector),
      this.generateMethodsDocumentation(connector),
      this.generateCapabilitiesDocumentation(capabilities),
      this.generateSchemaDocumentation(schema),
      this.generateEventsDocumentation(),
      this.generateErrorHandling(),
      this.generateBestPractices()
    ];

    return sections.join('\n\n');
  }

  /**
   * Generate configuration documentation
   */
  private async generateConfigurationDocumentation(configSchema: ConfigurationSchema): Promise<string> {
    const sections = [
      this.generateHeader('Configuration', 'Connector Configuration'),
      this.generateConfigurationOverview(),
      this.generateConfigurationProperties(configSchema),
      this.generateEnvironmentVariables(),
      this.generateSecurityConsiderations()
    ];

    return sections.join('\n\n');
  }

  /**
   * Generate usage examples
   */
  private async generateExamples(connector: IConnector, metadata: ConnectorMetadata): Promise<Record<string, string>> {
    const examples: Record<string, string> = {
      'basic-usage.ts': await this.generateBasicUsageExample(connector),
      'advanced-usage.ts': await this.generateAdvancedUsageExample(connector),
      'error-handling.ts': await this.generateErrorHandlingExample(connector),
      'batch-operations.ts': await this.generateBatchOperationsExample(connector),
      'configuration.ts': await this.generateConfigurationExample(metadata)
    };

    return examples;
  }

  /**
   * Generate changelog
   */
  private async generateChangelog(metadata: ConnectorMetadata): Promise<string> {
    const changelog = `# Changelog

All notable changes to this connector will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [${metadata.version}] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial release of ${metadata.name} connector
- Support for ${Object.keys(metadata.configurationSchema.properties).join(', ')} configuration
- Full CRUD operations support
- Data synchronization capabilities
- Comprehensive error handling
- Event-driven architecture

### Changed
- Initial version

### Deprecated
- Nothing

### Removed
- Nothing

### Fixed
- Nothing

### Security
- Nothing

---

## [Unreleased]

### Added
- Nothing yet

### Changed
- Nothing yet

### Deprecated
- Nothing yet

### Removed
- Nothing yet

### Fixed
- Nothing yet

### Security
- Nothing yet
`;

    return changelog;
  }

  /**
   * Generate troubleshooting guide
   */
  private async generateTroubleshooting(connector: IConnector): Promise<string> {
    const troubleshooting = `# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the ${connector.name} connector.

## Common Issues

### Connection Problems

#### Issue: Unable to connect to the service
**Symptoms:**
- Connection timeout errors
- Authentication failures
- Network-related errors

**Solutions:**
1. **Check your credentials:**
   \`\`\`typescript
   const config = {
     apiKey: 'your-api-key',
     baseUrl: 'https://api.example.com'
   };
   \`\`\`

2. **Verify network connectivity:**
   \`\`\`bash
   # Test basic connectivity
   curl https://api.example.com/health
   \`\`\`

3. **Check firewall settings:**
   - Ensure port 443 (HTTPS) is open
   - Verify no proxy blocks the connection

4. **Enable debug mode:**
   \`\`\`typescript
   connector.on('error', (error) => {
     console.error('Detailed error:', error);
   });
   \`\`\`

#### Issue: Slow connection establishment
**Symptoms:**
- Connection takes more than 10 seconds
- Timeout errors during connection

**Solutions:**
1. **Increase timeout:**
   \`\`\`typescript
   const config = {
     apiKey: 'your-api-key',
     timeout: 30000 // 30 seconds
   };
   \`\`\`

2. **Check DNS resolution:**
   \`\`\`bash
   nslookup api.example.com
   \`\`\`

3. **Use a closer endpoint if available**

### Data Synchronization Issues

#### Issue: Sync operation fails
**Symptoms:**
- Sync operations return errors
- Incomplete data transfer
- Data corruption

**Solutions:**
1. **Check sync configuration:**
   \`\`\`typescript
   const syncConfig = {
     direction: 'import',
     fields: ['id', 'name', 'email'],
     filters: { status: 'active' }
   };
   \`\`\`

2. **Validate data schema:**
   \`\`\`typescript
   const schema = await connector.getSchema();
   console.log('Available fields:', schema.fields);
   \`\`\`

3. **Implement retry logic:**
   \`\`\`typescript
   async function syncWithRetry(connector, config, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await connector.sync(config);
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   }
   \`\`\`

#### Issue: Large dataset sync performance
**Symptoms:**
- Sync operations take too long
- Memory usage spikes
- Connection timeouts

**Solutions:**
1. **Use pagination:**
   \`\`\`typescript
   const syncConfig = {
     direction: 'import',
     fields: ['id', 'name'],
     pagination: {
       pageSize: 1000,
       maxPages: 10
     }
   };
   \`\`\`

2. **Implement batch processing:**
   \`\`\`typescript
   async function batchSync(connector, batchSize = 500) {
     let offset = 0;
     let hasMore = true;

     while (hasMore) {
       const results = await connector.query(
         'SELECT * FROM data LIMIT ? OFFSET ?',
         [batchSize, offset]
       );

       // Process batch
       await processBatch(results);

       offset += batchSize;
       hasMore = results.length === batchSize;
     }
   }
   \`\`\`

### Authentication Issues

#### Issue: Invalid API credentials
**Symptoms:**
- 401 Unauthorized errors
- Authentication failed messages

**Solutions:**
1. **Verify API key format:**
   \`\`\`typescript
   // Check if API key is properly formatted
   function validateApiKey(apiKey: string): boolean {
     return apiKey && apiKey.length > 10 && apiKey.startsWith('sk_');
   }
   \`\`\`

2. **Refresh expired tokens:**
   \`\`\`typescript
   async function refreshToken(connector) {
     try {
       const newToken = await connector.refreshAuthentication();
       connector.config.apiKey = newToken;
     } catch (error) {
       console.error('Failed to refresh token:', error);
     }
   }
   \`\`\`

3. **Check API permissions:**
   - Ensure the API key has required permissions
   - Verify the account is active and in good standing

### Performance Issues

#### Issue: High memory usage
**Symptoms:**
- Process memory grows continuously
- Garbage collection issues
- Node.js process crashes

**Solutions:**
1. **Implement data streaming:**
   \`\`\`typescript
   async function* streamData(connector) {
     let offset = 0;
     const batchSize = 100;

     while (true) {
       const results = await connector.query(
         'SELECT * FROM large_table LIMIT ? OFFSET ?',
         [batchSize, offset]
       );

       if (results.length === 0) break;

       for (const record of results) {
         yield record;
       }

       offset += batchSize;
     }
   }

   // Usage
   for await (const record of streamData(connector)) {
     await processRecord(record);
   }
   \`\`\`

2. **Clear large objects:**
   \`\`\`typescript
   // Clear large result sets when done
   let largeResult = await connector.query('SELECT * FROM huge_table');
   // Process data...
   largeResult = null; // Clear reference
   \`\`\`

#### Issue: Slow query performance
**Symptoms:**
- Queries take too long to execute
- Timeout errors on complex queries

**Solutions:**
1. **Optimize queries:**
   \`\`\`typescript
   // Bad: Select all columns
   const badQuery = 'SELECT * FROM users';

   // Good: Select only needed columns
   const goodQuery = 'SELECT id, name, email FROM users WHERE active = 1';
   \`\`\`

2. **Use indexes and filters:**
   \`\`\`typescript
   const results = await connector.query(
     'SELECT id, name FROM users WHERE created_at > ? AND status = ?',
     ['2023-01-01', 'active']
   );
   \`\`\`

### Error Handling and Debugging

#### Enable Debug Logging
\`\`\`typescript
// Enable detailed logging
connector.on('connected', () => {
  console.log('✅ Connected successfully');
});

connector.on('disconnected', () => {
  console.log('🔌 Disconnected');
});

connector.on('error', (error) => {
  console.error('❌ Error:', {
    message: error.message,
    code: error.code,
    context: error.context,
    timestamp: error.timestamp
  });
});

connector.on('syncCompleted', (result) => {
  console.log('📊 Sync completed:', {
    recordsProcessed: result.recordsProcessed,
    duration: result.endTime - result.startTime,
    success: result.success
  });
});
\`\`\`

#### Implement Health Checks
\`\`\`typescript
async function healthCheck(connector) {
  try {
    const isConnected = await connector.testConnection();
    if (!isConnected) {
      throw new Error('Connection test failed');
    }

    const stats = await connector.getStats();
    console.log('Health check passed:', {
      uptime: stats.performance.uptime,
      successRate: stats.performance.successRate,
      lastSync: stats.lastSync
    });

    return true;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Run health check every 5 minutes
setInterval(() => {
  healthCheck(connector);
}, 5 * 60 * 1000);
\`\`\`

## Getting Help

### Resources
- **Documentation**: ${metadata.documentation}
- **API Reference**: Check the generated API documentation
- **Examples**: See the \`examples/\` directory
- **Community**: Join our community forums

### Support Channels
- **Email**: ${metadata.email}
- **Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas

### Debug Information
When reporting issues, please include:

1. **Connector Information:**
   - Connector version: ${connector.version}
   - Atlas version: ${metadata.minimumAtlasVersion}
   - Node.js version: ${process.version}

2. **Configuration:**
   - Connector type: ${connector.type}
   - Authentication method: ${capabilities.authentication.join(', ')}

3. **Error Details:**
   - Full error message and stack trace
   - Timestamp of the error
   - Steps to reproduce

4. **Environment:**
   - Operating system
   - Network environment
   - Proxy settings (if any)

### Performance Monitoring
\`\`\`typescript
// Monitor connector performance
setInterval(async () => {
  const stats = await connector.getStats();

  // Alert on poor performance
  if (stats.performance.successRate < 95) {
    console.warn('Low success rate:', stats.performance.successRate);
  }

  if (stats.averageSyncTime > 5000) {
    console.warn('High sync time:', stats.averageSyncTime);
  }

  console.log('Performance stats:', {
    totalRecords: stats.totalRecords,
    syncCount: stats.syncCount,
    errorCount: stats.errorCount,
    averageSyncTime: stats.averageSyncTime
  );
}, 60000); // Check every minute
\`\`\`
`;

    return troubleshooting;
  }

  /**
   * Generate README
   */
  private async generateReadme(
    connector: IConnector,
    metadata: ConnectorMetadata,
    capabilities: any
  ): Promise<string> {
    const readme = `# ${connector.name} Connector

${connector.description}

## Features

- ${this.formatList(capabilities.data.read ? 'Data reading and querying' : '')}
- ${this.formatList(capabilities.data.write ? 'Data creation and updates' : '')}
- ${this.formatList(capabilities.data.delete ? 'Data deletion' : '')}
- ${this.formatList(capabilities.sync.realtime ? 'Real-time synchronization' : '')}
- ${this.formatList(capabilities.advanced.encryption ? 'Data encryption' : '')}
- ${this.formatList(capabilities.advanced.transformations ? 'Data transformations' : '')}
- Comprehensive error handling and retry logic
- Event-driven architecture
- Full TypeScript support

## Installation

\`\`\`bash
npm install ${metadata.name.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

## Quick Start

\`\`\`typescript
import { create${this.capitalize(connector.name.replace(/\s+/g, ''))}Connector } from '${metadata.name.toLowerCase().replace(/\s+/g, '-')}';

const connector = create${this.capitalize(connector.name.replace(/\s+/g, ''))}Connector({
  id: '${connector.id}-connector',
  name: '${connector.name}',
  type: '${connector.type}',
  apiKey: process.env.${connector.id.toUpperCase()}_API_KEY,
  baseUrl: 'https://api.example.com'
});

// Connect to the service
await connector.connect();

// Query some data
const results = await connector.query('SELECT * FROM users LIMIT 10');
console.log('Results:', results.length);

// Disconnect when done
await connector.disconnect();
\`\`\`

## Configuration

The connector requires the following configuration:

${this.generateConfigTable(metadata.configurationSchema)}

### Environment Variables

\`\`\`bash
${connector.id.toUpperCase()}_API_KEY=your_api_key_here
${connector.id.toUpperCase()}_BASE_URL=https://api.example.com
${connector.id.toUpperCase()}_TIMEOUT=30000
\`\`\`

## API Reference

See [API Documentation](api.md) for detailed API documentation.

## Examples

Check the \`examples/\` directory for comprehensive usage examples:

- \`basic-usage.ts\` - Basic connector usage
- \`advanced-usage.ts\` - Advanced features and patterns
- \`error-handling.ts\` - Error handling strategies
- \`batch-operations.ts\` - Batch processing examples
- \`configuration.ts\` - Configuration management

## Development

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd ${connector.id}-connector

# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build

# Run in development mode
npm run dev
\`\`\`

## Testing

The connector includes comprehensive tests:

\`\`\`bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
\`\`\`

## Troubleshooting

See [Troubleshooting Guide](troubleshooting.md) for common issues and solutions.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

${metadata.license} License - see [LICENSE](LICENSE) file for details.

## Support

- **Author**: ${metadata.author} <${metadata.email}>
- **Documentation**: [API Documentation](api.md)
- **Issues**: [GitHub Issues](https://github.com/example/atlas-connectors/issues)
- **Community**: [Community Forum](https://community.example.com)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.

## Version ${metadata.version}

Compatible with Atlas ${metadata.minimumAtlasVersion} and higher.
`;

    return readme;
  }

  /**
   * Generate HTML documentation
   */
  private async generateHtmlDocumentation(
    connector: IConnector,
    metadata: ConnectorMetadata
  ): Promise<Record<string, string>> {
    const htmlFiles: Record<string, string> = {};

    // Main index page
    htmlFiles['index.html'] = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${connector.name} Connector Documentation</title>
    <style>
        ${this.getCssStyles()}
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>${connector.name} Connector</h1>
            <p class="subtitle">${connector.description}</p>
            <div class="version">Version ${metadata.version}</div>
        </header>

        <nav class="sidebar">
            <h3>Documentation</h3>
            <ul>
                <li><a href="#overview">Overview</a></li>
                <li><a href="#quickstart">Quick Start</a></li>
                <li><a href="#configuration">Configuration</a></li>
                <li><a href="#api-reference">API Reference</a></li>
                <li><a href="#examples">Examples</a></li>
                <li><a href="#troubleshooting">Troubleshooting</a></li>
            </ul>
        </nav>

        <main class="content">
            <section id="overview">
                <h2>Overview</h2>
                <p>${connector.description}</p>
                <div class="features">
                    <h3>Features</h3>
                    <ul>
                        <li>Comprehensive data integration</li>
                        <li>Real-time synchronization</li>
                        <li>Advanced error handling</li>
                        <li>Event-driven architecture</li>
                    </ul>
                </div>
            </section>

            <section id="quickstart">
                <h2>Quick Start</h2>
                <pre><code>import { create${this.capitalize(connector.name.replace(/\s+/g, ''))}Connector } from '${metadata.name.toLowerCase().replace(/\s+/g, '-')}';

const connector = create${this.capitalize(connector.name.replace(/\s+/g, ''))}Connector({
  id: '${connector.id}-connector',
  name: '${connector.name}',
  type: '${connector.type}',
  apiKey: 'your-api-key'
});

await connector.connect();
const results = await connector.query('SELECT * FROM users');
await connector.disconnect();</code></pre>
            </section>

            <section id="configuration">
                <h2>Configuration</h2>
                ${this.generateHtmlConfigTable(metadata.configurationSchema)}
            </section>

            <section id="api-reference">
                <h2>API Reference</h2>
                <p>See the detailed API documentation for comprehensive method references.</p>
            </section>

            <section id="examples">
                <h2>Examples</h2>
                <p>Check the examples directory for comprehensive usage examples.</p>
            </section>

            <section id="troubleshooting">
                <h2>Troubleshooting</h2>
                <p>See the troubleshooting guide for common issues and solutions.</p>
            </section>
        </main>

        <footer class="footer">
            <p>Generated by Atlas Connector Documentation Generator</p>
            <p>Author: ${metadata.author} &lt;${metadata.email}&gt;</p>
            <p>License: ${metadata.license}</p>
        </footer>
    </div>

    <script>
        ${this.getJavaScript()}
    </script>
</body>
</html>
    `;

    return htmlFiles;
  }

  // Helper methods

  private generateHeader(title: string, subtitle?: string): string {
    let header = `# ${title}\n`;
    if (subtitle) {
      header += `## ${subtitle}\n`;
    }
    return header;
  }

  private generateOverview(connector: IConnector, metadata: ConnectorMetadata): string {
    return `## Overview

${connector.description}

### Key Features
- **Connector ID**: \`${connector.id}\`
- **Type**: \`${connector.type}\`
- **Version**: \`${connector.version}\`
- **Author**: ${metadata.author} <${metadata.email}>
- **License**: ${metadata.license}

### Compatibility
- **Minimum Atlas Version**: ${metadata.minimumAtlasVersion}
- **Node.js Version**: >= 16.0.0
- **TypeScript Version**: >= 4.5.0
`;
  }

  private generateQuickStart(connector: IConnector): string {
    return `## Quick Start

### Installation

\`\`\`bash
npm install @atlas/connectors
\`\`\`

### Basic Usage

\`\`\`typescript
import { create${this.capitalize(connector.name.replace(/\s+/g, ''))}Connector } from '@atlas/connectors';

const connector = create${this.capitalize(connector.name.replace(/\s+/g, ''))}Connector({
  id: '${connector.id}',
  name: '${connector.name}',
  type: '${connector.type}',
  apiKey: 'your-api-key'
});

// Connect to the service
await connector.connect();

// Query some data
const results = await connector.query('SELECT * FROM users LIMIT 10');
console.log(\`Found \${results.length} records\`);

// Disconnect when done
await connector.disconnect();
\`\`\`

### Event Handling

\`\`\`typescript
connector.on('connected', () => {
  console.log('✅ Connected to service');
});

connector.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

connector.on('syncCompleted', (result) => {
  console.log('📊 Sync completed:', result.recordsProcessed, 'records');
});
\`\`\`
`;
  }

  private generateMethodsDocumentation(connector: IConnector): string {
    return `## API Methods

### Connection Methods

#### \`connect(): Promise<void>\`
Connects to the ${connector.name} service.

\`\`\`typescript
await connector.connect();
\`\`\`

#### \`disconnect(): Promise<void>\`
Disconnects from the ${connector.name} service.

\`\`\`typescript
await connector.disconnect();
\`\`\`

#### \`testConnection(): Promise<boolean>\`
Tests the connection to the ${connector.name} service.

\`\`\`typescript
const isConnected = await connector.testConnection();
console.log('Connection status:', isConnected);
\`\`\`

### Data Methods

#### \`query(query: string, params?: Record<string, any>): Promise<DataRecord[]>\`
Executes a query against the ${connector.name} service.

\`\`\`typescript
const results = await connector.query('SELECT * FROM users WHERE active = ?', [true]);
console.log('Active users:', results.length);
\`\`\`

#### \`create(record: DataRecord): Promise<DataRecord>\`
Creates a new record in the ${connector.name} service.

\`\`\`typescript
const newRecord = await connector.create({
  id: 'user-123',
  data: {
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date().toISOString()
  }
});
\`\`\`

#### \`update(id: string, record: Partial<DataRecord>): Promise<DataRecord>\`
Updates an existing record in the ${connector.name} service.

\`\`\`typescript
const updated = await connector.update('user-123', {
  data: {
    name: 'John Smith'
  }
});
\`\`\`

#### \`delete(id: string): Promise<boolean>\`
Deletes a record from the ${connector.name} service.

\`\`\`typescript
const deleted = await connector.delete('user-123');
console.log('Deleted:', deleted);
\`\`\`

### Synchronization Methods

#### \`sync(config: SyncConfig): Promise<SyncResult>\`
Synchronizes data with the ${connector.name} service.

\`\`\`typescript
const result = await connector.sync({
  direction: 'import',
  fields: ['id', 'name', 'email'],
  filters: { status: 'active' }
});

console.log('Synced', result.recordsProcessed, 'records');
\`\`\`

### Schema Methods

#### \`getSchema(): Promise<DataSchema>\`
Returns the data schema for the ${connector.name} service.

\`\`\`typescript
const schema = await connector.getSchema();
console.log('Schema fields:', schema.fields);
\`\`\`

#### \`validateSchema(schema: DataSchema): Promise<boolean>\`
Validates a schema against the ${connector.name} service requirements.

\`\`\`typescript
const isValid = await connector.validateSchema(schema);
console.log('Schema valid:', isValid);
\`\`\`

### Metadata Methods

#### \`getMetadata(): Promise<ConnectorMetadata>\`
Returns metadata about the connector.

\`\`\`typescript
const metadata = await connector.getMetadata();
console.log('Connector version:', metadata.version);
\`\`\`

#### \`getStats(): Promise<ConnectorStats>\`
Returns usage statistics for the connector.

\`\`\`typescript
const stats = await connector.getStats();
console.log('Total records:', stats.totalRecords);
console.log('Success rate:', stats.performance.successRate);
\`\`\`
`;
  }

  private generateCapabilitiesDocumentation(capabilities: any): string {
    return `## Capabilities

### Authentication Methods
${capabilities.authentication.map((method: string) => `- \`${method}\``).join('\n')}

### Data Operations
- **Read**: \`${capabilities.data.read}\`
- **Write**: \`${capabilities.data.write}\`
- **Delete**: \`${capabilities.data.delete}\`
- **Bulk Operations**: \`${capabilities.data.bulkOperations}\`
- **Filtering**: \`${capabilities.data.filtering}\`
- **Sorting**: \`${capabilities.data.sorting}\`
- **Aggregation**: \`${capabilities.data.aggregation}\`

### Synchronization
- **Directions**: ${capabilities.sync.directions.map((d: string) => `\`${d}\``).join(', ')}
- **Real-time**: \`${capabilities.sync.realtime}\`
- **Batching**: \`${capabilities.sync.batching}\`
- **Delta Sync**: \`${capabilities.sync.deltaSync}\`
- **Conflict Resolution**: \`${capabilities.sync.conflictResolution}\`

### Advanced Features
- **Webhooks**: \`${capabilities.advanced.webhooks}\`
- **Transformations**: \`${capabilities.advanced.transformations}\`
- **Custom Fields**: \`${capabilities.advanced.customFields}\`
- **Validation**: \`${capabilities.advanced.validation}\`
- **Encryption**: \`${capabilities.advanced.encryption}\`
- **Compression**: \`${capabilities.advanced.compression}\`

### Limitations
${Object.entries(capabilities.limitations).map(([key, value]) => {
  if (value !== undefined && value !== null) {
    return `- **${key}**: \`${value}\``;
  }
  return '';
}).filter(Boolean).join('\n')}
`;
  }

  private generateSchemaDocumentation(schema: any): string {
    return `## Data Schema

### Schema Information
- **Name**: \`${schema.name}\`
- **Version**: \`${schema.version}\`
- **Total Fields**: \`${schema.fields.length}\`

### Field Definitions

| Name | Type | Required | Unique | Description |
|------|------|----------|---------|-------------|
${schema.fields.map((field: any) => {
  return `| ${field.name} | ${field.type} | ${field.required ? 'Yes' : 'No'} | ${field.unique ? 'Yes' : 'No'} | ${field.description || ''} |`;
}).join('\n')}
`;
  }

  private generateEventsDocumentation(): string {
    return `## Events

The connector emits the following events:

### \`connected\`
Emitted when successfully connected to the service.

\`\`\`typescript
connector.on('connected', () => {
  console.log('Connected successfully');
});
\`\`\`

### \`disconnected\`
Emitted when disconnected from the service.

\`\`\`typescript
connector.on('disconnected', () => {
  console.log('Disconnected');
});
\`\`\`

### \`error\`
Emitted when an error occurs.

\`\`\`typescript
connector.on('error', (error) => {
  console.error('Error:', error.message);
  console.error('Context:', error.context);
  console.error('Timestamp:', error.timestamp);
});
\`\`\`

### \`syncCompleted\`
Emitted when a synchronization operation completes.

\`\`\`typescript
connector.on('syncCompleted', (result) => {
  console.log('Sync completed:', {
    recordsProcessed: result.recordsProcessed,
    duration: result.endTime - result.startTime,
    success: result.success
  });
});
\`\`\`

### \`statsUpdated\`
Emitted when usage statistics are updated.

\`\`\`typescript
connector.on('statsUpdated', (stats) => {
  console.log('Stats updated:', {
    totalRecords: stats.totalRecords,
    syncCount: stats.syncCount,
    errorCount: stats.errorCount
  });
});
\`\`\`
`;
  }

  private generateErrorHandling(): string {
    return `## Error Handling

### Error Types

The connector may throw the following types of errors:

- **ConnectionError**: Failed to connect to the service
- **AuthenticationError**: Invalid credentials or authentication failure
- **QueryError**: Invalid query or database error
- **SyncError**: Synchronization operation failed
- **ValidationError**: Invalid data or schema validation failed
- **RateLimitError**: API rate limit exceeded
- **NetworkError**: Network connectivity issues

### Error Handling Patterns

#### Basic Error Handling
\`\`\`typescript
try {
  await connector.connect();
  const results = await connector.query('SELECT * FROM users');
  console.log(results);
} catch (error) {
  console.error('Operation failed:', error.message);
  if (error.code === 'AUTHENTICATION_ERROR') {
    console.error('Please check your API credentials');
  } else if (error.code === 'NETWORK_ERROR') {
    console.error('Please check your network connection');
  }
} finally {
  await connector.disconnect();
}
\`\`\`

#### Retry Logic
\`\`\`typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(\`Attempt \${i + 1} failed, retrying in \${delay}ms\`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const results = await withRetry(() => connector.query('SELECT * FROM users'));
\`\`\`

#### Graceful Degradation
\`\`\`typescript
async function robustQuery(connector: IConnector, query: string, fallback?: DataRecord[]) {
  try {
    return await connector.query(query);
  } catch (error) {
    console.warn('Query failed, using fallback:', error.message);
    return fallback || [];
  }
}
\`\`\`
`;
  }

  private generateBestPractices(): string {
    return `## Best Practices

### Connection Management

#### Always Disconnect
\`\`\`typescript
async function withConnection<T>(connector: IConnector, operation: () => Promise<T>): Promise<T> {
  await connector.connect();
  try {
    return await operation();
  } finally {
    await connector.disconnect();
  }
}

// Usage
const results = await withConnection(connector, () => {
  return connector.query('SELECT * FROM users');
});
\`\`\`

#### Use Connection Pooling
\`\`\`typescript
class ConnectionPool {
  private connectors: IConnector[] = [];
  private available: boolean[] = [];

  constructor(factory: () => IConnector, size: number = 5) {
    for (let i = 0; i < size; i++) {
      this.connectors.push(factory());
      this.available.push(true);
    }
  }

  async acquire(): Promise<IConnector> {
    const index = this.available.findIndex(available => available);
    if (index === -1) {
      throw new Error('No connections available');
    }
    this.available[index] = false;
    return this.connectors[index];
  }

  async release(connector: IConnector): Promise<void> {
    const index = this.connectors.indexOf(connector);
    if (index !== -1) {
      this.available[index] = true;
    }
  }
}
\`\`\`

### Performance Optimization

#### Use Batching
\`\`\`typescript
async function batchOperation<T, R>(
  items: T[],
  batchSize: number,
  operation: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await operation(batch);
    results.push(...batchResults);
  }

  return results;
}

// Usage
const users = await batchOperation(
  userData,
  100,
  async (batch) => {
    return Promise.all(batch.map(user => connector.create(user)));
  }
);
\`\`\`

#### Implement Caching
\`\`\`typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  set(key: string, data: T, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }
}

// Usage
const cache = new SimpleCache<DataRecord[]>();

async function cachedQuery(query: string): Promise<DataRecord[]> {
  const cached = cache.get(query);
  if (cached) return cached;

  const results = await connector.query(query);
  cache.set(query, results, 5 * 60 * 1000); // 5 minutes
  return results;
}
\`\`\`

### Security Considerations

#### Secure Credential Storage
\`\`\`typescript
import { keytar } from 'keytar';

async function getSecureCredentials(service: string): Promise<{ apiKey: string }> {
  const credentials = await keytar.getPassword(service, 'api-key');
  if (!credentials) {
    throw new Error('No credentials found');
  }
  return { apiKey: credentials };
}

// Usage
const credentials = await getSecureCredentials('atlas-connector');
const connector = createConnector({ apiKey: credentials.apiKey });
\`\`\`

#### Validate Input Data
\`\`\`typescript
function validateUserData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required and must be a string');
  }

  if (!data.email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email)) {
    errors.push('Valid email is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Usage
const validation = validateUserData(userData);
if (!validation.isValid) {
  throw new Error('Invalid data: ' + validation.errors.join(', '));
}
\`\`\`
`;
  }

  private generateConfigurationOverview(): string {
    return `## Configuration Overview

The connector uses a flexible configuration system that supports:

- **Required parameters**: Essential settings for connector operation
- **Optional parameters**: Additional customization options
- **Environment variables**: Secure configuration via environment
- **Validation**: Automatic validation of configuration values
- **Defaults**: Sensible default values for optional settings

All configuration values can be provided through:
1. Constructor parameters
2. Environment variables
3. Configuration files
`;
  }

  private generateConfigurationProperties(configSchema: ConfigurationSchema): string {
    const properties = Object.entries(configSchema.properties);

    let table = `## Configuration Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
`;

    properties.forEach(([key, prop]) => {
      const required = configSchema.required.includes(key) ? 'Yes' : 'No';
      const defaultValue = prop.default !== undefined ? `\`${prop.default}\`` : 'None';
      const description = prop.description || 'No description';
      const type = Array.isArray(prop.type) ? prop.type.join(' \| ') : prop.type;

      table += `| ${key} | ${type} | ${required} | ${defaultValue} | ${description} |\n`;
    });

    return table;
  }

  private generateEnvironmentVariables(): string {
    return `## Environment Variables

You can configure the connector using environment variables:

### Required Variables
- \`${process.env.CONNECTOR_ID?.toUpperCase() || 'CONNECTOR'}_API_KEY\`: Your API key for the service

### Optional Variables
- \`${process.env.CONNECTOR_ID?.toUpperCase() || 'CONNECTOR'}_BASE_URL\`: Base URL for the API (default: https://api.example.com)
- \`${process.env.CONNECTOR_ID?.toUpperCase() || 'CONNECTOR'}_TIMEOUT\`: Request timeout in milliseconds (default: 30000)
- \`${process.env.CONNECTOR_ID?.toUpperCase() || 'CONNECTOR'}_MAX_RETRIES\`: Maximum number of retry attempts (default: 3)
- \`${process.env.CONNECTOR_ID?.toUpperCase() || 'CONNECTOR'}_LOG_LEVEL\`: Logging level (debug, info, warn, error)

### Example .env file
\`\`\`
# Required
CONNECTOR_API_KEY=your_api_key_here

# Optional
CONNECTOR_BASE_URL=https://api.example.com
CONNECTOR_TIMEOUT=30000
CONNECTOR_MAX_RETRIES=3
CONNECTOR_LOG_LEVEL=info
\`\`\`
`;
  }

  private generateSecurityConsiderations(): string {
    return `## Security Considerations

### API Key Security
- Never commit API keys to version control
- Use environment variables or secure secret management
- Rotate API keys regularly
- Use the least privileged API key possible

### Data Security
- Enable encryption in transit (HTTPS)
- Validate all input data
- Implement proper authentication and authorization
- Log security-relevant events

### Network Security
- Use firewall rules to restrict access
- Implement rate limiting
- Monitor for unusual activity
- Use VPNs or private networks when possible
`;
  }

  private async generateBasicUsageExample(connector: IConnector): Promise<string> {
    return `// Basic usage example for ${connector.name} connector
import { create${this.capitalize(connector.name.replace(/\s+/g, ''))}Connector } from './index';

async function basicUsageExample() {
  // Initialize connector
  const connector = create${this.capitalize(connector.name.replace(/\s+/g, ''))}Connector({
    id: '${connector.id}-example',
    name: '${connector.name} Example',
    type: '${connector.type}',
    apiKey: process.env.${connector.id.toUpperCase()}_API_KEY || 'your-api-key',
    baseUrl: 'https://api.example.com'
  });

  try {
    // Connect to the service
    await connector.connect();
    console.log('✅ Connected successfully');

    // Test the connection
    const isConnected = await connector.testConnection();
    console.log('Connection test:', isConnected ? 'Success' : 'Failed');

    // Query some data
    const results = await connector.query('SELECT * FROM users LIMIT 10');
    console.log('📊 Query results:', results.length, 'records');

    // Get schema information
    const schema = await connector.getSchema();
    console.log('📋 Schema:', schema.name, schema.fields.length, 'fields');

    // Get connector metadata
    const metadata = await connector.getMetadata();
    console.log('📝 Connector version:', metadata.version);

    // Get usage statistics
    const stats = await connector.getStats();
    console.log('📈 Total records processed:', stats.totalRecords);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Always disconnect when done
    await connector.disconnect();
    console.log('🔌 Disconnected');
  }
}

// Run the example
if (require.main === module) {
  basicUsageExample().catch(console.error);
}

export { basicUsageExample };
`;
  }

  private async generateAdvancedUsageExample(connector: IConnector): Promise<string> {
    return `// Advanced usage example for ${connector.name} connector
import { create${this.capitalize(connector.name.replace(/\s+/g, ''))}Connector } from './index';

async function advancedUsageExample() {
  const connector = create${this.capitalize(connector.name.replace(/\s+/g, ''))}Connector({
    id: '${connector.id}-advanced',
    name: '${connector.name} Advanced',
    type: '${connector.type}',
    apiKey: process.env.${connector.id.toUpperCase()}_API_KEY,
    baseUrl: 'https://api.example.com',
    timeout: 30000
  });

  // Set up event listeners
  connector.on('connected', () => {
    console.log('✅ Connected to ${connector.id}');
  });

  connector.on('disconnected', () => {
    console.log('✓ Disconnected from ${connector.id}');
  });

  connector.on('error', (error) => {
    console.error('✗ Error:', error.message);
  });

  connector.on('syncCompleted', (result) => {
    console.log('✓ Sync completed:', result.recordsProcessed, 'records');
  });

  try {
    await connector.connect();

    // Example: Create a new record
    const newRecord = {
      id: 'example-record',
      data: {
        name: 'Example User',
        email: 'user@example.com',
        createdAt: new Date().toISOString()
      }
    };

    const created = await connector.create(newRecord);
    console.log('📝 Created record:', created.id);

    // Example: Update the record
    const updated = await connector.update(created.id, {
      data: {
        ...created.data,
        name: 'Updated User'
      }
    });
    console.log('🔄 Updated record:', updated.data.name);

    // Example: Query with parameters
    const queryResults = await connector.query(
      'SELECT * FROM users WHERE email = ?',
      ['user@example.com']
    );
    console.log('🔍 Query results:', queryResults.length);

    // Example: Sync data
    const syncResult = await connector.sync({
      direction: 'import',
      fields: ['id', 'name', 'email'],
      filters: {
        status: 'active'
      }
    });
    console.log('🔄 Sync result:', syncResult);

    // Example: Get connector stats
    const stats = await connector.getStats();
    console.log('📊 Performance stats:', {
      syncCount: stats.syncCount,
      successRate: stats.performance.successRate,
      averageSyncTime: stats.averageSyncTime
    });

  } catch (error) {
    console.error('❌ Advanced example failed:', error);
  } finally {
    await connector.disconnect();
  }
}

// Advanced patterns

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      console.warn(\`Attempt \${i + 1} failed, retrying in \${delay}ms\`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Batch processing utility
 */
async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

// Run the example
if (require.main === module) {
  advancedUsageExample().catch(console.error);
}

export { advancedUsageExample, withRetry, processBatch };
`;
  }

  private async generateErrorHandlingExample(connector: IConnector): Promise<string> {
    return `// Error handling example for ${connector.name} connector
import { create${this.capitalize(connector.name.replace(/\s+/g, ''))}Connector } from './index';

async function errorHandlingExample() {
  const connector = create${this.capitalize(connector.name.replace(/\s+/g, ''))}Connector({
    id: '${connector.id}-error-handling',
    name: '${connector.name} Error Handling',
    type: '${connector.type}',
    apiKey: process.env.${connector.id.toUpperCase()}_API_KEY,
    baseUrl: 'https://api.example.com'
  });

  // Comprehensive error handling setup
  connector.on('error', (error) => {
    console.error('🔥 Connector Error:', {
      message: error.message,
      code: error.code,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString()
    });

    // Log to external monitoring service
    logErrorToMonitoring(error);
  });

  try {
    await connector.connect();
    console.log('✅ Connected');

    // Example 1: Basic try-catch
    try {
      const results = await connector.query('SELECT * FROM non_existent_table');
      console.log('Results:', results);
    } catch (error) {
      console.error('Query failed:', error.message);
      // Fallback to empty array
      const fallbackResults = [];
      console.log('Using fallback results:', fallbackResults.length);
    }

    // Example 2: Specific error handling
    try {
      await connector.query('INVALID SQL SYNTAX');
    } catch (error) {
      if (error.code === 'QUERY_ERROR') {
        console.error('Query syntax error:', error.message);
      } else if (error.code === 'AUTHENTICATION_ERROR') {
        console.error('Authentication failed:', error.message);
      } else {
        console.error('Unexpected error:', error.message);
      }
    }

    // Example 3: Retry logic
    const results = await withRetry(
      () => connector.query('SELECT * FROM users'),
      3,
      1000
    );
    console.log('Retry results:', results.length);

  } catch (error) {
    console.error('❌ Critical error:', error);
    await handleCriticalError(error);
  } finally {
    await connector.disconnect();
  }
}

/**
 * Retry with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(\`Attempt \${attempt} failed, retrying in \${delay}ms\`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Circuit breaker pattern
 */
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

/**
 * Error monitoring utility
 */
function logErrorToMonitoring(error: any): void {
  // In a real implementation, this would send to Sentry, Datadog, etc.
  console.log('[MONITORING]', JSON.stringify({
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      code: error.code,
      stack: error.stack
    },
    context: error.context
  }));
}

/**
 * Critical error handler
 */
async function handleCriticalError(error: Error): Promise<void> {
  console.error('🚨 Critical error detected:', error);

  // Alert administrators
  await alertAdministrators(error);

  // Attempt graceful degradation
  await gracefulDegradation();
}

/**
 * Alert administrators
 */
async function alertAdministrators(error: Error): Promise<void> {
  // In a real implementation, this would send email, Slack, etc.
  console.log('[ALERT] Critical error:', error.message);
}

/**
 * Graceful degradation
 */
async function gracefulDegradation(): Promise<void> {
  console.log('[DEGRADATION] Initiating graceful degradation...');

  // Switch to backup systems
  // Reduce functionality
  // Notify users
}

// Run the example
if (require.main === module) {
  errorHandlingExample().catch(console.error);
}

export { errorHandlingExample, withRetry, CircuitBreaker };
`;
  }

  private async generateBatchOperationsExample(connector: IConnector): Promise<string> {
    return `// Batch operations example for ${connector.name} connector
import { create${this.capitalize(connector.name.replace(/\s+/g, ''))}Connector } from './index';

async function batchOperationsExample() {
  const connector = create${this.capitalize(connector.name.replace(/\s+/g, ''))}Connector({
    id: '${connector.id}-batch',
    name: '${connector.name} Batch Operations',
    type: '${connector.type}',
    apiKey: process.env.${connector.id.toUpperCase()}_API_KEY,
    baseUrl: 'https://api.example.com'
  });

  try {
    await connector.connect();
    console.log('✅ Connected');

    // Generate test data
    const testData = generateTestData(1000);
    console.log('📊 Generated', testData.length, 'test records');

    // Example 1: Batch create with progress tracking
    console.log('🔄 Starting batch creation...');
    const createdRecords = await batchCreate(connector, testData, 100);
    console.log('✅ Created', createdRecords.length, 'records');

    // Example 2: Batch update with transformation
    console.log('🔄 Starting batch update...');
    const updatedRecords = await batchUpdate(connector, createdRecords, 50);
    console.log('✅ Updated', updatedRecords.length, 'records');

    // Example 3: Batch query with pagination
    console.log('🔄 Starting batch query...');
    const queriedRecords = await batchQuery(connector, 'SELECT * FROM test_data', 200);
    console.log('✅ Queried', queriedRecords.length, 'records');

    // Example 4: Batch delete with confirmation
    console.log('🔄 Starting batch delete...');
    const deletedCount = await batchDelete(connector, createdRecords.slice(0, 100), 25);
    console.log('✅ Deleted', deletedCount, 'records');

  } catch (error) {
    console.error('❌ Batch operations failed:', error);
  } finally {
    await connector.disconnect();
  }
}

/**
 * Batch create with progress tracking and error handling
 */
async function batchCreate(
  connector: any,
  records: any[],
  batchSize: number = 100
): Promise<any[]> {
  const results: any[] = [];
  const errors: Error[] = [];
  let processed = 0;

  console.log(\`📊 Processing \${records.length} records in batches of \${batchSize}\`);

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      const batchResults = await Promise.allSettled(
        batch.map(record => connector.create(record))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push(result.reason as Error);
          console.warn(\`❌ Failed to create record \${i + index}:\`, result.reason.message);
        }
      });

      processed += batch.length;

      // Progress tracking
      const progress = (processed / records.length) * 100;
      console.log(\`📈 Progress: \${progress.toFixed(1)}% (\${processed}/\${records.length})\`);

      // Rate limiting - prevent overwhelming the API
      if (i + batchSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error(\`❌ Batch create failed at index \${i}:\`, error);
      errors.push(error as Error);
    }
  }

  console.log(\`📊 Batch create completed: \${results.length} successful, \${errors.length} failed\`);
  return results;
}

/**
 * Batch update with data transformation
 */
async function batchUpdate(
  connector: any,
  records: any[],
  batchSize: number = 50
): Promise<any[]> {
  const results: any[] = [];
  const errors: Error[] = [];

  console.log(\`🔄 Updating \${records.length} records in batches of \${batchSize}\`);

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      // Transform data before update
      const updatePromises = batch.map(record => {
        const updateData = {
          ...record,
          data: {
            ...record.data,
            updatedAt: new Date().toISOString(),
            processed: true
          }
        };

        return connector.update(record.id, updateData);
      });

      const batchResults = await Promise.allSettled(updatePromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push(result.reason as Error);
          console.warn(\`❌ Failed to update record \${i + index}:\`, result.reason.message);
        }
      });

      // Progress tracking
      const progress = ((i + batch.length) / records.length) * 100;
      console.log(\`📈 Update progress: \${progress.toFixed(1)}%\`);

      // Rate limiting
      if (i + batchSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } catch (error) {
      console.error(\`❌ Batch update failed at index \${i}:\`, error);
      errors.push(error as Error);
    }
  }

  console.log(\`📊 Batch update completed: \${results.length} successful, \${errors.length} failed\`);
  return results;
}

/**
 * Batch query with pagination and result aggregation
 */
async function batchQuery(
  connector: any,
  baseQuery: string,
  batchSize: number = 200
): Promise<any[]> {
  const allResults: any[] = [];
  let offset = 0;
  let hasMore = true;
  let page = 1;

  console.log(\`🔍 Executing batch query: \${baseQuery}\`);

  while (hasMore) {
    try {
      const paginatedQuery = \`\${baseQuery} LIMIT \${batchSize} OFFSET \${offset}\`;
      const results = await connector.query(paginatedQuery);

      if (results.length === 0) {
        hasMore = false;
        break;
      }

      allResults.push(...results);
      offset += batchSize;

      console.log(\`📄 Page \${page}: \${results.length} records (total: \${allResults.length})\`);
      page++;

      // Prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      console.error(\`❌ Batch query failed at offset \${offset}:\`, error);
      hasMore = false;
    }
  }

  console.log(\`📊 Batch query completed: \${allResults.length} total records\`);
  return allResults;
}

/**
 * Batch delete with safety checks and confirmation
 */
async function batchDelete(
  connector: any,
  records: any[],
  batchSize: number = 25
): Promise<number> {
  let deletedCount = 0;
  const errors: Error[] = [];

  console.log(\`🗑️  Preparing to delete \${records.length} records in batches of \${batchSize}\`);

  // Safety confirmation
  console.log('⚠️  WARNING: This will permanently delete records');
  console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...');

  await new Promise(resolve => setTimeout(resolve, 5000));

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      console.log(\`🗑️  Deleting batch \${Math.floor(i / batchSize) + 1} (\${batch.length} records)\`);

      const deletePromises = batch.map(record =>
        connector.delete(record.id).catch(error => {
          console.warn(\`❌ Failed to delete record \${record.id}:\`, error.message);
          return false;
        })
      );

      const batchResults = await Promise.all(deletePromises);
      const batchDeleted = batchResults.filter(Boolean).length;

      deletedCount += batchDeleted;
      console.log(\`✅ Deleted \${batchDeleted} records in this batch\`);

      // Safety delay
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(\`❌ Batch delete failed at index \${i}:\`, error);
      errors.push(error as Error);
    }
  }

  console.log(\`📊 Batch delete completed: \${deletedCount} records deleted\`);
  return deletedCount;
}

/**
 * Generate test data
 */
function generateTestData(count: number): any[] {
  const records = [];

  for (let i = 0; i < count; i++) {
    records.push({
      id: \`test-record-\${i}\`,
      data: {
        name: \`Test User \${i}\`,
        email: \`user\${i}@example.com\`,
        value: Math.floor(Math.random() * 1000),
        active: Math.random() > 0.5,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      },
      metadata: {
        source: 'test-generator',
        batch: Math.floor(i / 100) + 1,
        index: i
      }
    });
  }

  return records;
}

/**
 * Batch operation with comprehensive monitoring
 */
async function monitoredBatchOperation<T, R>(
  operation: string,
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = 100
): Promise<{ results: R[]; errors: Error[]; metrics: any }> {
  const startTime = Date.now();
  const results: R[] = [];
  const errors: Error[] = [];
  const metrics = {
    totalItems: items.length,
    processedItems: 0,
    successfulItems: 0,
    failedItems: 0,
    batches: 0,
    duration: 0,
    averageBatchTime: 0
  };

  console.log(\`🚀 Starting monitored batch operation: \${operation}\`);

  for (let i = 0; i < items.length; i += batchSize) {
    const batchStartTime = Date.now();
    const batch = items.slice(i, i + batchSize);
    metrics.batches++;

    try {
      const batchResults = await processor(batch);
      results.push(...batchResults);
      metrics.successfulItems += batchResults.length;

      const batchDuration = Date.now() - batchStartTime;
      console.log(\`📊 Batch \${metrics.batches}: \${batchResults.length} items in \${batchDuration}ms\`);

    } catch (error) {
      console.error(\`❌ Batch \${metrics.batches} failed:\`, error);
      errors.push(error as Error);
      metrics.failedItems += batch.length;
    }

    metrics.processedItems += batch.length;

    // Progress update
    const progress = (metrics.processedItems / metrics.totalItems) * 100;
    console.log(\`📈 Overall progress: \${progress.toFixed(1)}% (\${metrics.processedItems}/\${metrics.totalItems})\`);
  }

  metrics.duration = Date.now() - startTime;
  metrics.averageBatchTime = metrics.duration / metrics.batches;

  console.log(\`📊 Monitored batch operation completed:\`);
  console.log(\`  - Total items: \${metrics.totalItems}\`);
  console.log(\`  - Successful: \${metrics.successfulItems}\`);
  console.log(\`  - Failed: \${metrics.failedItems}\`);
  console.log(\`  - Duration: \${metrics.duration}ms\`);
  console.log(\`  - Average batch time: \${metrics.averageBatchTime.toFixed(2)}ms\`);

  return { results, errors, metrics };
}

// Run the example
if (require.main === module) {
  batchOperationsExample().catch(console.error);
}

export {
  batchOperationsExample,
  batchCreate,
  batchUpdate,
  batchQuery,
  batchDelete,
  monitoredBatchOperation
};
`;
  }

  private async generateConfigurationExample(metadata: ConnectorMetadata): Promise<string> {
    return `// Configuration example for connector
import { create${this.capitalize(metadata.name.replace(/\s+/g, ''))}Connector } from './index';

/**
 * Environment-based configuration
 */
function createConnectorFromEnv() {
  return create${this.capitalize(metadata.name.replace(/\s+/g, ''))}Connector({
    id: process.env.${metadata.name.toUpperCase().replace(/\s+/g, '_')}_CONNECTOR_ID || '${metadata.name.toLowerCase().replace(/\s+/g, '-')}-connector',
    name: process.env.${metadata.name.toUpperCase().replace(/\s+/g, '_')}_CONNECTOR_NAME || '${metadata.name}',
    type: '${metadata.type}',
    apiKey: process.env.${metadata.name.toUpperCase().replace(/\s+/g, '_')}_API_KEY,
    baseUrl: process.env.${metadata.name.toUpperCase().replace(/\s+/g, '_')}_BASE_URL || 'https://api.example.com',
    timeout: parseInt(process.env.${metadata.name.toUpperCase().replace(/\s+/g, '_')}_TIMEOUT || '30000')
  });
}

/**
 * Configuration validation
 */
function validateConfiguration(config: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!config.apiKey) {
    errors.push('API key is required');
  }

  if (!config.id) {
    errors.push('Connector ID is required');
  }

  // Type validation
  if (config.timeout && typeof config.timeout !== 'number') {
    errors.push('Timeout must be a number');
  }

  // Format validation
  if (config.baseUrl && !config.baseUrl.startsWith('http')) {
    errors.push('Base URL must start with http:// or https://');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Configuration with defaults
 */
function createConnectorWithDefaults(customConfig?: Partial<any>) {
  const defaultConfig = {
    id: '${metadata.name.toLowerCase().replace(/\s+/g, '-')}-connector',
    name: '${metadata.name}',
    type: '${metadata.type}',
    baseUrl: 'https://api.example.com',
    timeout: 30000,
    maxRetries: 3,
    logLevel: 'info'
  };

  const config = { ...defaultConfig, ...customConfig };

  // Validate configuration
  const validation = validateConfiguration(config);
  if (!validation.isValid) {
    throw new Error('Invalid configuration: ' + validation.errors.join(', '));
  }

  return create${this.capitalize(metadata.name.replace(/\s+/g, ''))}Connector(config);
}

/**
 * Configuration for different environments
 */
const environmentConfigs = {
  development: {
    baseUrl: 'https://dev-api.example.com',
    timeout: 10000,
    logLevel: 'debug'
  },
  staging: {
    baseUrl: 'https://staging-api.example.com',
    timeout: 20000,
    logLevel: 'info'
  },
  production: {
    baseUrl: 'https://api.example.com',
    timeout: 30000,
    logLevel: 'warn'
  }
};

function createConnectorForEnvironment(environment: keyof typeof environmentConfigs) {
  const envConfig = environmentConfigs[environment];
  return createConnectorWithDefaults(envConfig);
}

/**
 * Dynamic configuration loading
 */
async function loadConfiguration(configPath: string): Promise<any> {
  try {
    const fs = require('fs').promises;
    const path = require('path');

    const configData = await fs.readFile(path.resolve(configPath), 'utf-8');
    const config = JSON.parse(configData);

    // Validate configuration
    const validation = validateConfiguration(config);
    if (!validation.isValid) {
      throw new Error('Configuration validation failed: ' + validation.errors.join(', '));
    }

    return config;
  } catch (error) {
    console.error('Failed to load configuration:', error);
    throw error;
  }
}

/**
 * Configuration management class
 */
class ConfigurationManager {
  private config: any;
  private watchers: Set<Function> = new Set();

  constructor(initialConfig: any) {
    this.config = initialConfig;
  }

  getConfig(): any {
    return { ...this.config };
  }

  updateConfig(updates: Partial<any>): void {
    this.config = { ...this.config, ...updates };
    this.notifyWatchers();
  }

  watchConfig(callback: Function): () => void {
    this.watchers.add(callback);

    // Return unsubscribe function
    return () => {
      this.watchers.delete(callback);
    };
  }

  private notifyWatchers(): void {
    this.watchers.forEach(callback => {
      try {
        callback(this.getConfig());
      } catch (error) {
        console.error('Error in config watcher:', error);
      }
    });
  }
}

/**
 * Usage examples
 */
async function configurationExamples() {
  // Example 1: Environment-based configuration
  console.log('🔧 Environment-based configuration:');
  const envConnector = createConnectorFromEnv();
  console.log('Created connector from environment variables');

  // Example 2: Configuration with defaults
  console.log('\\n🔧 Configuration with defaults:');
  const defaultConnector = createConnectorWithDefaults({
    apiKey: 'custom-api-key',
    timeout: 15000
  });
  console.log('Created connector with custom configuration');

  // Example 3: Environment-specific configuration
  console.log('\\n🔧 Environment-specific configuration:');
  const stagingConnector = createConnectorForEnvironment('staging');
  console.log('Created staging environment connector');

  // Example 4: Configuration management
  console.log('\\n🔧 Configuration management:');
  const configManager = new ConfigurationManager({
    id: 'managed-connector',
    name: 'Managed Connector',
    type: '${metadata.type}',
    apiKey: 'initial-key',
    timeout: 30000
  });

  // Watch for configuration changes
  const unsubscribe = configManager.watchConfig((newConfig: any) => {
    console.log('Configuration updated:', newConfig);
  });

  // Update configuration
  configManager.updateConfig({
    timeout: 45000,
    logLevel: 'debug'
  });

  // Stop watching
  unsubscribe();

  // Example 5: Configuration from file
  console.log('\\n🔧 Configuration from file:');
  try {
    const fileConfig = await loadConfiguration('./connector-config.json');
    const fileConnector = createConnectorWithDefaults(fileConfig);
    console.log('Created connector from file configuration');
  } catch (error) {
    console.log('Could not load file configuration:', error.message);
  }

  console.log('\\n✅ Configuration examples completed');
}

// Configuration template generator
function generateConfigurationTemplate(): string {
  return JSON.stringify({
    id: '${metadata.name.toLowerCase().replace(/\s+/g, '-')}-connector',
    name: '${metadata.name}',
    type: '${metadata.type}',
    apiKey: 'your-api-key-here',
    baseUrl: 'https://api.example.com',
    timeout: 30000,
    maxRetries: 3,
    logLevel: 'info',
    // Add your custom configuration here
    customSettings: {
      // example: 'value'
    }
  }, null, 2);
}

// Export for use
export {
  createConnectorFromEnv,
  validateConfiguration,
  createConnectorWithDefaults,
  createConnectorForEnvironment,
  loadConfiguration,
  ConfigurationManager,
  configurationExamples,
  generateConfigurationTemplate
};

// Run examples if called directly
if (require.main === module) {
  configurationExamples().catch(console.error);
}
`;
  }

  private generateConfigTable(configSchema: ConfigurationSchema): string {
    let table = '| Property | Type | Required | Default | Description |\n';
    table += '|----------|------|----------|---------|-------------|\n';

    Object.entries(configSchema.properties).forEach(([key, prop]) => {
      const required = configSchema.required.includes(key) ? 'Yes' : 'No';
      const defaultValue = prop.default !== undefined ? `\`${prop.default}\`` : 'None';
      const description = prop.description || 'No description';
      const type = Array.isArray(prop.type) ? prop.type.join(' | ') : prop.type;

      table += `| ${key} | ${type} | ${required} | ${defaultValue} | ${description} |\n`;
    });

    return table;
  }

  private generateHtmlConfigTable(configSchema: ConfigurationSchema): string {
    let table = '<table class="config-table">\n';
    table += '<thead>\n';
    table += '<tr>\n';
    table += '<th>Property</th>\n';
    table += '<th>Type</th>\n';
    table += '<th>Required</th>\n';
    table += '<th>Default</th>\n';
    table += '<th>Description</th>\n';
    table += '</tr>\n';
    table += '</thead>\n';
    table += '<tbody>\n';

    Object.entries(configSchema.properties).forEach(([key, prop]) => {
      const required = configSchema.required.includes(key);
      const defaultValue = prop.default !== undefined ? prop.default : 'None';
      const description = prop.description || 'No description';
      const type = Array.isArray(prop.type) ? prop.type.join(' | ') : prop.type;

      table += '<tr>\n';
      table += `<td><code>${key}</code></td>\n`;
      table += `<td>${type}</td>\n`;
      table += `<td>${required ? 'Yes' : 'No'}</td>\n`;
      table += `<td>${defaultValue}</td>\n`;
      table += `<td>${description}</td>\n`;
      table += '</tr>\n';
    });

    table += '</tbody>\n';
    table += '</table>\n';

    return table;
  }

  private getCssStyles(): string {
    return `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f5f5f5;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar content";
  grid-template-columns: 250px 1fr;
  gap: 20px;
}

.header {
  grid-area: header;
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 2.5em;
}

.subtitle {
  color: #7f8c8d;
  font-size: 1.2em;
  margin-bottom: 10px;
}

.version {
  background: #3498db;
  color: white;
  padding: 5px 15px;
  border-radius: 20px;
  display: inline-block;
  font-size: 0.9em;
}

.sidebar {
  grid-area: sidebar;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  height: fit-content;
  position: sticky;
  top: 20px;
}

.sidebar h3 {
  color: #2c3e50;
  margin-bottom: 15px;
  font-size: 1.2em;
}

.sidebar ul {
  list-style: none;
}

.sidebar li {
  margin-bottom: 8px;
}

.sidebar a {
  color: #3498db;
  text-decoration: none;
  padding: 5px 10px;
  border-radius: 4px;
  display: block;
  transition: background-color 0.3s;
}

.sidebar a:hover {
  background-color: #ecf0f1;
}

.content {
  grid-area: content;
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.content h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #ecf0f1;
}

.content h3 {
  color: #34495e;
  margin: 25px 0 15px 0;
}

.content p {
  margin-bottom: 15px;
  line-height: 1.8;
}

.content pre {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 15px;
  overflow-x: auto;
  margin: 15px 0;
}

.content code {
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
}

.features ul {
  list-style: none;
  padding-left: 0;
}

.features li {
  padding: 8px 0;
  padding-left: 25px;
  position: relative;
}

.features li:before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #27ae60;
  font-weight: bold;
}

.config-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

.config-table th,
.config-table td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

.config-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.config-table tr:nth-child(even) {
  background-color: #f8f9fa;
}

.footer {
  grid-area: header;
  text-align: center;
  padding: 20px;
  color: #7f8c8d;
  font-size: 0.9em;
}

.footer p {
  margin: 5px 0;
}

@media (max-width: 768px) {
  .container {
    grid-template-areas:
      "header"
      "content"
      "sidebar";
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }
}
`;
  }

  private getJavaScript(): string {
    return `
// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Highlight active section in sidebar
window.addEventListener('scroll', () => {
  const sections = document.querySelectorAll('section[id]');
  const sidebarLinks = document.querySelectorAll('.sidebar a');

  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (scrollY >= sectionTop - 100) {
      current = section.getAttribute('id');
    }
  });

  sidebarLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === \`#\${current}\`) {
      link.classList.add('active');
    }
  });
});

// Copy code blocks
document.querySelectorAll('pre code').forEach(block => {
  const button = document.createElement('button');
  button.textContent = 'Copy';
  button.style.cssText = \`
    position: absolute;
    top: 10px;
    right: 10px;
    background: #3498db;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  \`;

  const pre = block.parentElement;
  pre.style.position = 'relative';
  pre.appendChild(button);

  button.addEventListener('click', () => {
    navigator.clipboard.writeText(block.textContent).then(() => {
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = 'Copy';
      }, 2000);
    });
  });
});
`;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private formatList(item: string): string {
    return item ? item : '';
  }
}

/**
 * Documentation options
 */
export interface DocumentationOptions {
  includeApi?: boolean;
  includeExamples?: boolean;
  includeChangelog?: boolean;
  includeTroubleshooting?: boolean;
  format?: 'markdown' | 'html';
  theme?: 'default' | 'dark' | 'minimal';
}

/**
 * Documentation result
 */
export interface DocumentationResult {
  success: boolean;
  files: string[];
  directory: string;
  duration: number;
  metadata: {
    connectorId: string;
    connectorName: string;
    connectorType: string;
    connectorVersion: string;
    documentationVersion: string;
    generatedAt: string;
  };
  error?: Error;
}