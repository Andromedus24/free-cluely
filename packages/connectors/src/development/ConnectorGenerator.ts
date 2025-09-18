import * as fs from 'fs/promises';
import * as path from 'path';
import { ConnectorBuilder, ConnectorUtils, IConnector, ConnectorCapabilities, DataSchema } from './ConnectorInterfaces';
import {
  ConnectorConfig,
  ConnectorType,
  AuthenticationMethod,
  SyncDirection,
  RateLimitConfig,
  ConnectionStatus
} from '../types/ConnectorTypes';

/**
 * Generator for creating connector scaffolding
 */
export class ConnectorGenerator {
  private readonly templatesDir: string;
  private readonly outputDir: string;

  constructor(outputDir: string = './generated-connectors') {
    this.outputDir = outputDir;
    this.templatesDir = path.join(__dirname, 'templates');
  }

  async generateConnector(options: ConnectorGenerationOptions): Promise<ConnectorGenerationResult> {
    const {
      id,
      name,
      type,
      description,
      version = '1.0.0',
      author,
      email,
      authentication = [],
      capabilities = {},
      includeTests = true,
      includeDocumentation = true,
      includeExamples = true,
      customTemplate
    } = options;

    const connectorDir = path.join(this.outputDir, id);
    const srcDir = path.join(connectorDir, 'src');
    const testDir = path.join(connectorDir, '__tests__');
    const docsDir = path.join(connectorDir, 'docs');

    // Create directory structure
    await this.createDirectoryStructure(connectorDir, srcDir, testDir, docsDir);

    // Generate connector files
    const files = await this.generateConnectorFiles({
      id,
      name,
      type,
      description,
      version,
      author,
      email,
      authentication,
      capabilities,
      srcDir,
      testDir,
      docsDir,
      includeTests,
      includeDocumentation,
      includeExamples,
      customTemplate
    });

    // Generate package.json
    await this.generatePackageJson(connectorDir, {
      name: `atlas-connector-${id}`,
      version,
      description,
      author: `${author} <${email}>`,
      main: 'dist/index.js',
      types: 'dist/index.d.ts'
    });

    // Generate TypeScript config
    await this.generateTsConfig(connectorDir);

    // Generate README
    await this.generateReadme(connectorDir, {
      name,
      description,
      type,
      author,
      email,
      version
    });

    return {
      success: true,
      connectorId: id,
      directory: connectorDir,
      files: files.map(f => path.relative(connectorDir, f)),
      nextSteps: [
        `cd ${connectorDir}`,
        'npm install',
        'npm run build',
        'npm test',
        'Read the documentation in docs/ for usage instructions'
      ]
    };
  }

  private async createDirectoryStructure(
    connectorDir: string,
    srcDir: string,
    testDir: string,
    docsDir: string
  ): Promise<void> {
    await fs.mkdir(connectorDir, { recursive: true });
    await fs.mkdir(srcDir, { recursive: true });
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(docsDir, { recursive: true });
  }

  private async generateConnectorFiles(options: {
    id: string;
    name: string;
    type: ConnectorType;
    description: string;
    version: string;
    author: string;
    email: string;
    authentication: AuthenticationMethod[];
    capabilities: Partial<ConnectorCapabilities>;
    srcDir: string;
    testDir: string;
    docsDir: string;
    includeTests: boolean;
    includeDocumentation: boolean;
    includeExamples: boolean;
    customTemplate?: string;
  }): Promise<string[]> {
    const {
      id,
      name,
      type,
      description,
      version,
      author,
      email,
      authentication,
      capabilities,
      srcDir,
      testDir,
      docsDir,
      includeTests,
      includeDocumentation,
      includeExamples,
      customTemplate
    } = options;

    const files: string[] = [];

    // Generate main connector file
    const mainConnectorFile = path.join(srcDir, `${id}.connector.ts`);
    await this.generateMainConnector(mainConnectorFile, {
      id,
      name,
      type,
      description,
      version,
      author,
      email,
      authentication,
      capabilities
    });
    files.push(mainConnectorFile);

    // Generate types file
    const typesFile = path.join(srcDir, 'types.ts');
    await this.generateTypesFile(typesFile, { id, type });
    files.push(typesFile);

    // Generate utils file
    const utilsFile = path.join(srcDir, 'utils.ts');
    await this.generateUtilsFile(utilsFile, { id });
    files.push(utilsFile);

    // Generate index file
    const indexFile = path.join(srcDir, 'index.ts');
    await this.generateIndexFile(indexFile, { id, name });
    files.push(indexFile);

    // Generate test files if requested
    if (includeTests) {
      const testFiles = await this.generateTestFiles(testDir, { id, type });
      files.push(...testFiles);
    }

    // Generate documentation if requested
    if (includeDocumentation) {
      const docFiles = await this.generateDocumentation(docsDir, {
        id,
        name,
        type,
        description,
        author,
        email,
        version
      });
      files.push(...docFiles);
    }

    // Generate examples if requested
    if (includeExamples) {
      const exampleFiles = await this.generateExamples(srcDir, { id, type });
      files.push(...exampleFiles);
    }

    return files;
  }

  private async generateMainConnector(
    filePath: string,
    options: {
      id: string;
      name: string;
      type: ConnectorType;
      description: string;
      version: string;
      author: string;
      email: string;
      authentication: AuthenticationMethod[];
      capabilities: Partial<ConnectorCapabilities>;
    }
  ): Promise<void> {
    const {
      id,
      name,
      type,
      description,
      version,
      author,
      email,
      authentication,
      capabilities
    } = options;

    const content = `
import { BaseConnector, ConnectorUtils } from './BaseConnector';
import { ${type}Types } from './types';
import type {
  ConnectorConfig,
  DataRecord,
  SyncResult,
  SyncConfig,
  DataSchema,
  ConnectorMetadata,
  ConnectorStats
} from '../types/ConnectorTypes';

/**
 * ${name} Connector
 *
 * ${description}
 *
 * @version ${version}
 * @author ${author} <${email}>
 */
export class ${this.capitalize(id)}Connector extends BaseConnector {
  readonly id = '${id}';
  readonly name = '${name}';
  readonly type = ConnectorType.${type};
  readonly version = '${version}';
  readonly description = '${description}';

  private client: any; // Replace with actual client type
  private isConnected = false;

  get capabilities() {
    return {
      authentication: ${JSON.stringify(authentication || [])},
      sync: {
        directions: ${JSON.stringify(capabilities.sync?.directions || [SyncDirection.Bidirectional])},
        realtime: ${capabilities.sync?.realtime || false},
        batching: ${capabilities.sync?.batching || true},
        deltaSync: ${capabilities.sync?.deltaSync || false},
        conflictResolution: ${capabilities.sync?.conflictResolution || false}
      },
      data: {
        read: ${capabilities.data?.read || true},
        write: ${capabilities.data?.write || false},
        delete: ${capabilities.data?.delete || false},
        bulkOperations: ${capabilities.data?.bulkOperations || false},
        filtering: ${capabilities.data?.filtering || true},
        sorting: ${capabilities.data?.sorting || true},
        aggregation: ${capabilities.data?.aggregation || false}
      },
      advanced: {
        webhooks: ${capabilities.advanced?.webhooks || false},
        transformations: ${capabilities.advanced?.transformations || true},
        customFields: ${capabilities.advanced?.customFields || false},
        validation: ${capabilities.advanced?.validation || true},
        encryption: ${capabilities.advanced?.encryption || false},
        compression: ${capabilities.advanced?.compression || false}
      },
      limitations: ${JSON.stringify(capabilities.limitations || {})}
    };
  }

  get schema(): DataSchema {
    return {
      name: '${name} Schema',
      version: '1.0.0',
      fields: [
        // Define your schema fields here
        // {
        //   name: 'id',
        //   type: 'string',
        //   required: true,
        //   unique: true
        // }
      ]
    };
  }

  protected initializeStats(): ConnectorStats {
    return {
      totalRecords: 0,
      syncCount: 0,
      errorCount: 0,
      averageSyncTime: 0,
      dataVolume: { uploaded: 0, downloaded: 0, unit: 'bytes' },
      performance: { responseTime: 0, successRate: 0, uptime: 0 }
    };
  }

  async connect(): Promise<void> {
    try {
      // Implement your connection logic here
      // Example:
      // this.client = new ${this.capitalize(type)}Client(this.config.apiKey);
      // await this.client.authenticate();

      this.isConnected = true;
      this.status = ConnectionStatus.Connected;
      this.emit('connected');
    } catch (error) {
      this.handleError(error as Error, 'connect');
      this.status = ConnectionStatus.Error;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // Implement your disconnection logic here
      // Example:
      // if (this.client) {
      //   await this.client.close();
      // }

      this.isConnected = false;
      this.status = ConnectionStatus.Disconnected;
      this.emit('disconnected');
    } catch (error) {
      this.handleError(error as Error, 'disconnect');
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Implement your connection test logic here
      // Example:
      // const result = await this.client.test();
      // return result.success;

      return true;
    } catch (error) {
      this.handleError(error as Error, 'testConnection');
      return false;
    }
  }

  async sync(config: SyncConfig): Promise<SyncResult> {
    const startTime = new Date();
    let recordsProcessed = 0;
    let errors: Error[] = [];

    try {
      // Implement your sync logic here
      // Example:
      // const data = await this.fetchData(config);
      // recordsProcessed = data.length;

      const result: SyncResult = {
        connectorId: this.id,
        startTime,
        endTime: new Date(),
        recordsProcessed,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        errors,
        success: errors.length === 0
      };

      this.logSync(result);
      return result;
    } catch (error) {
      this.handleError(error as Error, 'sync');
      throw error;
    }
  }

  async query(query: string, params?: Record<string, any>): Promise<DataRecord[]> {
    try {
      // Implement your query logic here
      // Example:
      // return await this.client.query(query, params);

      return [];
    } catch (error) {
      this.handleError(error as Error, 'query');
      throw error;
    }
  }

  async create(record: DataRecord): Promise<DataRecord> {
    try {
      // Implement your create logic here
      // Example:
      // const result = await this.client.create(record);
      // return result;

      return record;
    } catch (error) {
      this.handleError(error as Error, 'create');
      throw error;
    }
  }

  async update(id: string, record: Partial<DataRecord>): Promise<DataRecord> {
    try {
      // Implement your update logic here
      // Example:
      // const result = await this.client.update(id, record);
      // return result;

      return { id, ...record };
    } catch (error) {
      this.handleError(error as Error, 'update');
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Implement your delete logic here
      // Example:
      // return await this.client.delete(id);

      return true;
    } catch (error) {
      this.handleError(error as Error, 'delete');
      throw error;
    }
  }

  async getSchema(): Promise<DataSchema> {
    try {
      // Implement your schema fetching logic here
      // Example:
      // return await this.client.getSchema();

      return this.schema;
    } catch (error) {
      this.handleError(error as Error, 'getSchema');
      throw error;
    }
  }

  async getMetadata(): Promise<ConnectorMetadata> {
    return {
      author: '${author}',
      email: '${email}',
      documentation: 'https://docs.example.com/connectors/${id}',
      license: 'MIT',
      tags: ['${type}', 'atlas', 'connector'],
      categories: ['${type}'],
      minimumAtlasVersion: '1.0.0',
      configurationSchema: {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            title: 'API Key',
            description: 'Your ${name} API key'
          },
          baseUrl: {
            type: 'string',
            title: 'Base URL',
            description: 'Base URL for ${name} API',
            default: 'https://api.example.com'
          }
        },
        required: ['apiKey'],
        additionalProperties: false
      }
    };
  }

  // Helper methods
  private async fetchData(config: SyncConfig): Promise<DataRecord[]> {
    // Implement data fetching logic
    return [];
  }

  private transformData(rawData: any[]): DataRecord[] {
    // Implement data transformation logic
    return rawData.map(item => ({
      id: item.id,
      data: item,
      metadata: {
        source: this.id,
        timestamp: new Date().toISOString()
      }
    }));
  }
}
`;

    await fs.writeFile(filePath, content.trim());
  }

  private async generateTypesFile(filePath: string, options: { id: string; type: string }): Promise<void> {
    const { id, type } = options;

    const content = `
import type { DataRecord, ConnectorConfig } from '../types/ConnectorTypes';

/**
 * Types specific to the ${id} connector
 */

export interface ${this.capitalize(id)}Config extends ConnectorConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  // Add your connector-specific config here
}

export interface ${this.capitalize(type)}Record extends DataRecord {
  // Add your connector-specific record type here
  customField?: string;
}

export interface ${this.capitalize(type)}QueryOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  filter?: Record<string, any>;
  // Add your query options here
}

// Additional types as needed
`;

    await fs.writeFile(filePath, content.trim());
  }

  private async generateUtilsFile(filePath: string, options: { id: string }): Promise<void> {
    const { id } = options;

    const content = `
import { ConnectorUtils } from './ConnectorInterfaces';

/**
 * Utility functions for the ${id} connector
 */

export class ${this.capitalize(id)}Utils {
  /**
   * Format a date for ${id} API
   */
  static formatDate(date: Date): string {
    return date.toISOString();
  }

  /**
   * Parse a date from ${id} API response
   */
  static parseDate(dateString: string): Date {
    return new Date(dateString);
  }

  /**
   * Validate ${id} specific data
   */
  static validateData(data: any): boolean {
    // Implement validation logic
    return data && typeof data === 'object';
  }

  /**
   * Transform ${id} API response to standard format
   */
  static transformResponse(response: any): any {
    // Implement response transformation
    return response;
  }

  /**
   * Handle ${id} API errors
   */
  static handleApiError(error: any): Error {
    // Implement error handling
    return new Error(error.message || 'Unknown error');
  }

  /**
   * Generate unique ID for ${id} records
   */
  static generateId(): string {
    return ConnectorUtils.generateId();
  }

  /**
   * Sanitize ${id} data
   */
  static sanitizeData(data: any): any {
    // Implement data sanitization
    return data;
  }
}
`;

    await fs.writeFile(filePath, content.trim());
  }

  private async generateIndexFile(filePath: string, options: { id: string; name: string }): Promise<void> {
    const { id, name } = options;

    const content = `
/**
 * ${name} Connector
 *
 * Main entry point for the ${id} connector
 */

export { ${this.capitalize(id)}Connector } from './${id}.connector';
export type {
  ${this.capitalize(id)}Config,
  ${this.capitalize(id)}Record,
  ${this.capitalize(type)}QueryOptions
} from './types';
export { ${this.capitalize(id)}Utils } from './utils';

// Re-export common types
export type {
  ConnectorConfig,
  DataRecord,
  SyncConfig,
  SyncResult,
  DataSchema,
  ConnectionStatus
} from '../types/ConnectorTypes';

// Factory function
export function create${this.capitalize(id)}Connector(config: ${this.capitalize(id)}Config): ${this.capitalize(id)}Connector {
  return new ${this.capitalize(id)}Connector(config);
}

// Default export
export default create${this.capitalize(id)}Connector;
`;

    await fs.writeFile(filePath, content.trim());
  }

  private async generateTestFiles(testDir: string, options: { id: string; type: string }): Promise<string[]> {
    const { id, type } = options;
    const files: string[] = [];

    // Main test file
    const mainTestFile = path.join(testDir, `${id}.connector.test.ts`);
    const mainTestContent = `
import { ${this.capitalize(id)}Connector } from '../src/${id}.connector';
import type { ${this.capitalize(id)}Config } from '../src/types';

describe('${this.capitalize(id)}Connector', () => {
  let connector: ${this.capitalize(id)}Connector;
  let config: ${this.capitalize(id)}Config;

  beforeEach(() => {
    config = {
      id: 'test-${id}',
      name: 'Test ${this.capitalize(id)}',
      type: '${type}',
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com'
    };
    connector = new ${this.capitalize(id)}Connector(config);
  });

  describe('Initialization', () => {
    it('should initialize with correct properties', () => {
      expect(connector.id).toBe('test-${id}');
      expect(connector.name).toBe('Test ${this.capitalize(id)}');
      expect(connector.type).toBe('${type}');
      expect(connector.version).toBeDefined();
    });

    it('should have required capabilities', () => {
      const capabilities = connector.capabilities;
      expect(capabilities).toBeDefined();
      expect(capabilities.authentication).toBeDefined();
      expect(capabilities.data.read).toBe(true);
    });
  });

  describe('Connection', () => {
    it('should connect successfully', async () => {
      await expect(connector.connect()).resolves.not.toThrow();
      expect(connector.status).toBe('connected');
    });

    it('should disconnect successfully', async () => {
      await connector.connect();
      await expect(connector.disconnect()).resolves.not.toThrow();
      expect(connector.status).toBe('disconnected');
    });

    it('should test connection', async () => {
      const result = await connector.testConnection();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Data Operations', () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it('should query data', async () => {
      const result = await connector.query('SELECT * FROM test');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should create record', async () => {
      const record = { id: 'test-1', data: { name: 'Test' } };
      const result = await connector.create(record);
      expect(result).toBeDefined();
      expect(result.id).toBe('test-1');
    });

    it('should update record', async () => {
      const result = await connector.update('test-1', { name: 'Updated' });
      expect(result).toBeDefined();
      expect(result.id).toBe('test-1');
    });

    it('should delete record', async () => {
      const result = await connector.delete('test-1');
      expect(typeof result).toBe('boolean');
    });

    it('should sync data', async () => {
      const syncConfig = {
        direction: 'import' as const,
        fields: ['id', 'name'],
        filters: {}
      };
      const result = await connector.sync(syncConfig);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('Schema Operations', () => {
    it('should return schema', async () => {
      const schema = await connector.getSchema();
      expect(schema).toBeDefined();
      expect(schema.name).toBeDefined();
      expect(schema.fields).toBeDefined();
    });

    it('should validate schema', async () => {
      const validSchema = {
        name: 'Test Schema',
        version: '1.0.0',
        fields: [{ name: 'id', type: 'string', required: true }]
      };
      const result = await connector.validateSchema(validSchema);
      expect(result).toBe(true);
    });
  });

  describe('Metadata', () => {
    it('should return metadata', async () => {
      const metadata = await connector.getMetadata();
      expect(metadata).toBeDefined();
      expect(metadata.author).toBeDefined();
      expect(metadata.email).toBeDefined();
      expect(metadata.configurationSchema).toBeDefined();
    });

    it('should return stats', async () => {
      const stats = await connector.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalRecords).toBeGreaterThanOrEqual(0);
      expect(stats.syncCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      // Mock connection error
      jest.spyOn(connector as any, 'connect').mockRejectedValueOnce(new Error('Connection failed'));

      await expect(connector.connect()).rejects.toThrow('Connection failed');
      expect(connector.status).toBe('error');
    });

    it('should emit error events', (done) => {
      const testError = new Error('Test error');

      connector.on('error', (error) => {
        expect(error.error).toBe(testError);
        expect(error.context).toBe('test');
        done();
      });

      // Trigger error
      (connector as any).handleError(testError, 'test');
    });
  });
});
`;

    await fs.writeFile(mainTestFile, mainTestContent);
    files.push(mainTestFile);

    // Utils test file
    const utilsTestFile = path.join(testDir, 'utils.test.ts');
    const utilsTestContent = `
import { ${this.capitalize(id)}Utils } from '../src/utils';

describe('${this.capitalize(id)}Utils', () => {
  describe('formatDate', () => {
    it('should format date to ISO string', () => {
      const date = new Date('2023-01-01T00:00:00.000Z');
      const result = ${this.capitalize(id)}Utils.formatDate(date);
      expect(result).toBe('2023-01-01T00:00:00.000Z');
    });
  });

  describe('parseDate', () => {
    it('should parse ISO string to date', () => {
      const dateString = '2023-01-01T00:00:00.000Z';
      const result = ${this.capitalize(id)}Utils.parseDate(dateString);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(dateString);
    });
  });

  describe('validateData', () => {
    it('should validate valid data', () => {
      const validData = { id: 'test', name: 'Test' };
      expect(${this.capitalize(id)}Utils.validateData(validData)).toBe(true);
    });

    it('should reject invalid data', () => {
      const invalidData = null;
      expect(${this.capitalize(id)}Utils.validateData(invalidData)).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = ${this.capitalize(id)}Utils.generateId();
      const id2 = ${this.capitalize(id)}Utils.generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
    });
  });
});
`;

    await fs.writeFile(utilsTestFile, utilsTestContent);
    files.push(utilsTestFile);

    return files;
  }

  private async generateDocumentation(docsDir: string, options: {
    id: string;
    name: string;
    type: string;
    description: string;
    author: string;
    email: string;
    version: string;
  }): Promise<string[]> {
    const { id, name, type, description, author, email, version } = options;
    const files: string[] = [];

    // API documentation
    const apiDocFile = path.join(docsDir, 'api.md');
    const apiDocContent = `# ${name} Connector API Documentation

## Overview

${description}

## Installation

\`\`\`bash
npm install @atlas/connectors
\`\`\`

## Usage

### Basic Usage

\`\`\`typescript
import { create${this.capitalize(id)}Connector } from '@atlas/connectors';

const connector = create${this.capitalize(id)}Connector({
  id: '${id}-connector',
  name: '${name} Connector',
  type: '${type}',
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com'
});

// Connect to the service
await connector.connect();

// Query data
const results = await connector.query('SELECT * FROM users');
console.log(results);

// Disconnect when done
await connector.disconnect();
\`\`\`

### Configuration

The connector requires the following configuration:

- \`apiKey\` (string, required): Your ${name} API key
- \`baseUrl\` (string, optional): Base URL for the ${name} API
- \`timeout\` (number, optional): Request timeout in milliseconds

### Methods

#### \`connect()\`
Connects to the ${name} service.

#### \`disconnect()\`
Disconnects from the ${name} service.

#### \`testConnection()\`
Tests the connection to the ${name} service.

#### \`query(query: string, params?: Record<string, any>)\`
Executes a query against the ${name} service.

#### \`create(record: DataRecord)\`
Creates a new record in the ${name} service.

#### \`update(id: string, record: Partial<DataRecord>)\`
Updates an existing record in the ${name} service.

#### \`delete(id: string)\`
Deletes a record from the ${name} service.

#### \`sync(config: SyncConfig)\`
Synchronizes data with the ${name} service.

#### \`getSchema()\`
Returns the data schema for the ${name} service.

#### \`getMetadata()\`
Returns metadata about the connector.

#### \`getStats()\`
Returns statistics about the connector usage.

### Events

The connector emits the following events:

- \`connected\`: Emitted when successfully connected
- \`disconnected\`: Emitted when disconnected
- \`error\`: Emitted when an error occurs
- \`statsUpdated\`: Emitted when statistics are updated
- \`syncCompleted\`: Emitted when a sync operation completes

### Error Handling

The connector includes built-in error handling and will emit \`error\` events for any issues that occur. You should listen for these events to handle errors appropriately.

\`\`\`typescript
connector.on('error', (error) => {
  console.error('Connector error:', error);
});
\`\`\`

## Examples

See the \`examples/\` directory for more detailed usage examples.

## Support

For support, please contact:
- Author: ${author} <${email}>
- Documentation: [API Documentation](https://docs.example.com)
- Issues: [GitHub Issues](https://github.com/example/atlas-connectors/issues)
`;

    await fs.writeFile(apiDocFile, apiDocContent);
    files.push(apiDocFile);

    // Development guide
    const devGuideFile = path.join(docsDir, 'development.md');
    const devGuideContent = `# ${name} Connector Development Guide

## Getting Started

This guide will help you understand how to develop and customize the ${name} connector.

## Prerequisites

- Node.js 16 or higher
- TypeScript 4.5 or higher
- ${name} API access and credentials

## Project Structure

\`\`\`
${id}-connector/
├── src/
│   ├── ${id}.connector.ts      # Main connector implementation
│   ├── types.ts                 # Type definitions
│   ├── utils.ts                 # Utility functions
│   └── index.ts                 # Entry point
├── __tests__/
│   ├── ${id}.connector.test.ts  # Main tests
│   └── utils.test.ts           # Utils tests
├── docs/
│   ├── api.md                  # API documentation
│   └── development.md          # Development guide
├── package.json
├── tsconfig.json
└── README.md
\`\`\`

## Development Workflow

1. **Clone the repository**
2. **Install dependencies**: \`npm install\`
3. **Make changes**
4. **Run tests**: \`npm test\`
5. **Build**: \`npm run build\`
6. **Test locally**: \`npm link\`

## Testing

The connector includes a comprehensive test suite. To run tests:

\`\`\`bash
npm test
\`\`\`

To run tests in watch mode:

\`\`\`bash
npm run test:watch
\`\`\`

## Building

To build the connector:

\`\`\`bash
npm run build
\`\`\`

This will compile the TypeScript code to the \`dist/\` directory.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Code Style

- Use TypeScript for all code
- Follow the existing code style
- Add JSDoc comments for all public methods
- Write comprehensive tests
- Use meaningful commit messages

## Debugging

To debug the connector:

1. Set breakpoints in your code
2. Run in debug mode: \`npm run debug\`
3. Use the Chrome DevTools or your preferred debugger

## Performance Considerations

- Use batching for bulk operations
- Implement proper error handling and retries
- Cache frequently accessed data
- Use streaming for large datasets
- Monitor memory usage

## Security Considerations

- Never commit API keys or sensitive data
- Use environment variables for configuration
- Validate all input data
- Implement proper authentication
- Use HTTPS for all communications
`;

    await fs.writeFile(devGuideFile, devGuideContent);
    files.push(devGuideFile);

    return files;
  }

  private async generateExamples(srcDir: string, options: { id: string; type: string }): Promise<string[]> {
    const { id, type } = options;
    const exampleDir = path.join(srcDir, 'examples');
    await fs.mkdir(exampleDir, { recursive: true });
    const files: string[] = [];

    // Basic usage example
    const basicExampleFile = path.join(exampleDir, 'basic-usage.ts');
    const basicExampleContent = `
import { create${this.capitalize(id)}Connector } from '../index';

async function basicUsageExample() {
  // Initialize the connector
  const connector = create${this.capitalize(id)}Connector({
    id: '${id}-example',
    name: '${this.capitalize(id)} Example',
    type: '${type}',
    apiKey: process.env.${id.toUpperCase()}_API_KEY || 'your-api-key',
    baseUrl: 'https://api.example.com'
  });

  try {
    // Connect to the service
    await connector.connect();
    console.log('Connected successfully');

    // Test the connection
    const isConnected = await connector.testConnection();
    console.log('Connection test:', isConnected ? 'Success' : 'Failed');

    // Query some data
    const results = await connector.query('SELECT * FROM users LIMIT 10');
    console.log('Query results:', results.length, 'records');

    // Get schema information
    const schema = await connector.getSchema();
    console.log('Schema:', schema.name, schema.fields.length, 'fields');

    // Get connector metadata
    const metadata = await connector.getMetadata();
    console.log('Connector version:', metadata.version);

    // Get usage statistics
    const stats = await connector.getStats();
    console.log('Total records processed:', stats.totalRecords);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Always disconnect when done
    await connector.disconnect();
    console.log('Disconnected');
  }
}

// Run the example
basicUsageExample().catch(console.error);
`;

    await fs.writeFile(basicExampleFile, basicExampleContent);
    files.push(basicExampleFile);

    // Advanced usage example
    const advancedExampleFile = path.join(exampleDir, 'advanced-usage.ts');
    const advancedExampleContent = `
import { create${this.capitalize(id)}Connector } from '../index';

async function advancedUsageExample() {
  const connector = create${this.capitalize(id)}Connector({
    id: '${id}-advanced',
    name: '${this.capitalize(id)} Advanced',
    type: '${type}',
    apiKey: process.env.${id.toUpperCase()}_API_KEY,
    baseUrl: 'https://api.example.com',
    timeout: 30000
  });

  // Set up event listeners
  connector.on('connected', () => {
    console.log('✓ Connected to ${id}');
  });

  connector.on('disconnected', () => {
    console.log('✓ Disconnected from ${id}');
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
    console.log('Created record:', created.id);

    // Example: Update the record
    const updated = await connector.update(created.id, {
      data: {
        ...created.data,
        name: 'Updated User'
      }
    });
    console.log('Updated record:', updated.data.name);

    // Example: Query with parameters
    const queryResults = await connector.query(
      'SELECT * FROM users WHERE email = ?',
      ['user@example.com']
    );
    console.log('Query results:', queryResults.length);

    // Example: Sync data
    const syncResult = await connector.sync({
      direction: 'import',
      fields: ['id', 'name', 'email'],
      filters: {
        status: 'active'
      }
    });
    console.log('Sync result:', syncResult);

    // Example: Get connector stats
    const stats = await connector.getStats();
    console.log('Performance stats:', {
      syncCount: stats.syncCount,
      successRate: stats.performance.successRate,
      averageSyncTime: stats.averageSyncTime
    });

  } catch (error) {
    console.error('Advanced example failed:', error);
  } finally {
    await connector.disconnect();
  }
}

advancedUsageExample().catch(console.error);
`;

    await fs.writeFile(advancedExampleFile, advancedExampleContent);
    files.push(advancedExampleFile);

    return files;
  }

  private async generatePackageJson(dir: string, options: {
    name: string;
    version: string;
    description: string;
    author: string;
    main: string;
    types: string;
  }): Promise<void> {
    const { name, version, description, author, main, types } = options;

    const packageJson = {
      name,
      version,
      description,
      author,
      main,
      types,
      scripts: {
        build: 'tsc',
        test: 'jest',
        'test:watch': 'jest --watch',
        'test:coverage': 'jest --coverage',
        lint: 'eslint src --ext .ts',
        'lint:fix': 'eslint src --ext .ts --fix',
        clean: 'rimraf dist'
      },
      dependencies: {
        '@atlas/connectors': '^1.0.0'
      },
      devDependencies: {
        '@types/node': '^16.0.0',
        '@types/jest': '^27.0.0',
        '@typescript-eslint/eslint-plugin': '^5.0.0',
        '@typescript-eslint/parser': '^5.0.0',
        eslint: '^8.0.0',
        jest: '^27.0.0',
        'rimraf': '^3.0.0',
        'ts-jest': '^27.0.0',
        typescript: '^4.5.0'
      },
      jest: {
        preset: 'ts-jest',
        testEnvironment: 'node',
        collectCoverageFrom: [
          'src/**/*.ts',
          '!src/**/*.d.ts',
          '!src/examples/**'
        ],
        coverageDirectory: 'coverage',
        coverageReporters: ['text', 'lcov', 'html']
      },
      eslintConfig: {
        parser: '@typescript-eslint/parser',
        extends: [
          'eslint:recommended',
          '@typescript-eslint/recommended'
        ],
        parserOptions: {
          ecmaVersion: 2020,
          sourceType: 'module'
        }
      }
    };

    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }

  private async generateTsConfig(dir: string): Promise<void> {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        removeComments: false
      },
      include: [
        'src/**/*'
      ],
      exclude: [
        'node_modules',
        'dist',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    };

    await fs.writeFile(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );
  }

  private async generateReadme(dir: string, options: {
    name: string;
    description: string;
    type: string;
    author: string;
    email: string;
    version: string;
  }): Promise<void> {
    const { name, description, type, author, email, version } = options;

    const readme = `# ${name} Connector

${description}

## Features

- Seamless integration with ${type} services
- Comprehensive data synchronization
- Advanced error handling and retries
- Event-driven architecture
- Full TypeScript support
- Comprehensive test coverage

## Installation

\`\`\`bash
npm install ${name.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

## Quick Start

\`\`\`typescript
import { create${this.capitalize(name.replace(/\s+/g, ''))}Connector } from '${name.toLowerCase().replace(/\s+/g, '-')}';

const connector = create${this.capitalize(name.replace(/\s+/g, ''))}Connector({
  id: '${type.toLowerCase()}-connector',
  name: '${name} Connector',
  type: '${type}',
  apiKey: 'your-api-key'
});

await connector.connect();
const results = await connector.query('SELECT * FROM users');
await connector.disconnect();
\`\`\`

## Documentation

- [API Documentation](docs/api.md)
- [Development Guide](docs/development.md)
- [Examples](src/examples/)

## Configuration

The connector requires the following configuration:

\`\`\`typescript
{
  id: string;           // Unique connector identifier
  name: string;         // Human-readable name
  type: '${type}';      // Connector type
  apiKey: string;       // Your API key
  baseUrl?: string;     // Base URL (optional)
  timeout?: number;     // Request timeout in milliseconds
}
\`\`\`

## Development

\`\`\`bash
# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build

# Run linter
npm run lint
\`\`\`

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details.

## Support

- Author: ${author} <${email}>
- Issues: [GitHub Issues](https://github.com/example/atlas-connectors/issues)
- Documentation: [API Docs](docs/api.md)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Version ${version}
`;

    await fs.writeFile(path.join(dir, 'README.md'), readme);
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

/**
 * Options for connector generation
 */
export interface ConnectorGenerationOptions {
  id: string;
  name: string;
  type: ConnectorType;
  description: string;
  version?: string;
  author: string;
  email: string;
  authentication?: AuthenticationMethod[];
  capabilities?: Partial<ConnectorCapabilities>;
  includeTests?: boolean;
  includeDocumentation?: boolean;
  includeExamples?: boolean;
  customTemplate?: string;
}

/**
 * Result of connector generation
 */
export interface ConnectorGenerationResult {
  success: boolean;
  connectorId: string;
  directory: string;
  files: string[];
  nextSteps: string[];
  error?: string;
}