// Core interfaces and base classes
export {
  IConnector,
  BaseConnector,
  IConnectorFactory,
  ConnectorBuilder,
  ConnectorUtils,
  type ConnectorCapabilities,
  type ConnectorMetadata,
  type ConfigurationSchema,
  type ConfigurationProperty,
  type ConnectorStats,
  type TestScenario,
  type ValidationResult,
  type ConnectorDevUtils
} from './ConnectorInterfaces';

// Code generator
export { ConnectorGenerator } from './ConnectorGenerator';
export type {
  ConnectorGenerationOptions,
  ConnectorGenerationResult
} from './ConnectorGenerator';

// Testing framework
export { ConnectorTester } from './ConnectorTester';
export type {
  TestSuiteResult,
  TestResult,
  PerformanceMetric,
  SecurityFinding,
  TestOptions
} from './ConnectorTester';

// CLI tool
export { ConnectorCLI } from './ConnectorCLI';

// Documentation generator
export { ConnectorDocumentation } from './ConnectorDocumentation';
export type {
  DocumentationOptions,
  DocumentationResult
} from './ConnectorDocumentation';

// Development utilities
export class ConnectorDevKit {
  /**
   * Create a new connector generator
   */
  static createGenerator(outputDir?: string): ConnectorGenerator {
    return new ConnectorGenerator(outputDir);
  }

  /**
   * Create a new connector tester
   */
  static createTester(connector: any): ConnectorTester {
    return new ConnectorTester(connector);
  }

  /**
   * Create a new documentation generator
   */
  static createDocumentationGenerator(outputDir?: string): ConnectorDocumentation {
    return new ConnectorDocumentation(outputDir);
  }

  /**
   * Create a new CLI instance
   */
  static createCLI(): ConnectorCLI {
    return new ConnectorCLI();
  }

  /**
   * Quick start: Generate, test, and document a connector
   */
  static async quickStart(options: QuickStartOptions): Promise<QuickStartResult> {
    const {
      id,
      name,
      type,
      description,
      author,
      email,
      outputDir = './generated-connectors',
      includeTests = true,
      includeDocumentation = true
    } = options;

    try {
      console.log('🚀 Starting connector development quick start...');

      // Step 1: Generate connector
      console.log('📝 Generating connector code...');
      const generator = this.createGenerator(outputDir);
      const generationResult = await generator.generateConnector({
        id,
        name,
        type,
        description,
        author,
        email,
        includeTests,
        includeDocumentation
      });

      if (!generationResult.success) {
        throw new Error('Connector generation failed');
      }

      console.log('✅ Connector generated successfully');

      // Step 2: Test the connector (if possible)
      console.log('🧪 Testing connector...');
      let testResults: any = null;
      try {
        const connectorModule = await import(path.join(generationResult.directory, 'dist', 'index.js'));
        const ConnectorClass = connectorModule.default || connectorModule;
        const connector = new ConnectorClass({
          id: `${id}-test`,
          name: `${name} Test`,
          type,
          apiKey: 'test-key'
        });

        const tester = this.createTester(connector);
        testResults = await tester.runFullTestSuite({
          includePerformanceTests: false,
          includeStressTests: false,
          includeSecurityTests: false
        });

        console.log(`✅ Connector testing completed: ${testResults.success ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.log('⚠️  Connector testing skipped:', (error as Error).message);
      }

      // Step 3: Generate documentation
      console.log('📚 Generating documentation...');
      const docGenerator = this.createDocumentationGenerator(path.join(generationResult.directory, 'docs'));
      const docResult = await docGenerator.generateDocumentation(
        // We can't easily instantiate the connector here for docs
        // This would need to be done by the user after implementation
        null as any,
        { format: 'markdown' }
      );

      console.log('✅ Documentation generated successfully');

      return {
        success: true,
        connectorId: id,
        directory: generationResult.directory,
        testResults,
        documentationFiles: docResult.files,
        nextSteps: [
          `cd ${generationResult.directory}`,
          'npm install',
          'Implement the connector methods in src/' + id + '.connector.ts',
          'npm run build',
          'npm test',
          'Review the documentation in docs/'
        ]
      };

    } catch (error) {
      console.error('❌ Quick start failed:', error);
      return {
        success: false,
        connectorId: id,
        directory: outputDir,
        error: error as Error,
        nextSteps: [
          'Check the error message above',
          'Ensure you have valid permissions',
          'Try running the generator manually'
        ]
      };
    }
  }
}

/**
 * Quick start options
 */
export interface QuickStartOptions {
  id: string;
  name: string;
  type: any; // ConnectorType
  description: string;
  author: string;
  email: string;
  outputDir?: string;
  includeTests?: boolean;
  includeDocumentation?: boolean;
}

/**
 * Quick start result
 */
export interface QuickStartResult {
  success: boolean;
  connectorId: string;
  directory: string;
  testResults?: any;
  documentationFiles?: string[];
  nextSteps: string[];
  error?: Error;
}

// Re-export for convenience
export * from '../types/ConnectorTypes';