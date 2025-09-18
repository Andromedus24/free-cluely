#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConnectorGenerator } from './ConnectorGenerator';
import { ConnectorTester } from './ConnectorTester';
import { IConnector } from './ConnectorInterfaces';
import { ConnectorType } from '../types/ConnectorTypes';

/**
 * CLI for connector development
 */
class ConnectorCLI {
  private program: Command;
  private generator: ConnectorGenerator;

  constructor() {
    this.program = new Command();
    this.generator = new ConnectorGenerator();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('atlas-connector')
      .description('Atlas Connector Development CLI')
      .version('1.0.0');

    // Generate command
    this.program
      .command('generate')
      .alias('gen')
      .alias('g')
      .description('Generate a new connector')
      .requiredOption('-i, --id <id>', 'Connector ID (e.g., salesforce, hubspot)')
      .requiredOption('-n, --name <name>', 'Connector display name')
      .requiredOption('-t, --type <type>', 'Connector type', this.validateConnectorType)
      .requiredOption('-d, --description <description>', 'Connector description')
      .requiredOption('-a, --author <author>', 'Author name')
      .requiredOption('-e, --email <email>', 'Author email', this.validateEmail)
      .option('-o, --output <output>', 'Output directory', './generated-connectors')
      .option('--no-tests', 'Skip test generation')
      .option('--no-docs', 'Skip documentation generation')
      .option('--no-examples', 'Skip example generation')
      .action(this.handleGenerate.bind(this));

    // Test command
    this.program
      .command('test')
      .alias('t')
      .description('Test a connector')
      .requiredOption('-c, --connector <path>', 'Path to connector module')
      .option('-o, --output <output>', 'Output directory for test results', './test-results')
      .option('--no-performance', 'Skip performance tests')
      .option('--no-stress', 'Skip stress tests')
      .option('--no-security', 'Skip security tests')
      .option('--mock-size <size>', 'Mock data size for performance tests', '1000')
      .option('--concurrency <count>', 'Concurrency for stress tests', '10')
      .option('--format <format>', 'Output format (json|html|console)', 'console')
      .action(this.handleTest.bind(this));

    // Validate command
    this.program
      .command('validate')
      .alias('v')
      .description('Validate connector implementation')
      .requiredOption('-c, --connector <path>', 'Path to connector module')
      .option('--strict', 'Strict validation mode')
      .action(this.handleValidate.bind(this));

    // Build command
    this.program
      .command('build')
      .alias('b')
      .description('Build a connector')
      .requiredOption('-d, --directory <directory>', 'Connector directory')
      .option('-w, --watch', 'Watch mode for development')
      .option('-m, --minify', 'Minify output')
      .action(this.handleBuild.bind(this));

    // Package command
    this.program
      .command('package')
      .alias('p')
      .description('Package a connector for distribution')
      .requiredOption('-d, --directory <directory>', 'Connector directory')
      .option('-o, --output <output>', 'Output directory', './dist')
      .option('--version <version>', 'Package version')
      .option('--include-source', 'Include source maps')
      .action(this.handlePackage.bind(this));

    // Publish command
    this.program
      .command('publish')
      .description('Publish a connector to the registry')
      .requiredOption('-d, --directory <directory>', 'Connector directory')
      .option('--registry <registry>', 'Registry URL', 'https://registry.atlas.sh')
      .option('--dry-run', 'Dry run without publishing')
      .action(this.handlePublish.bind(this));

    // List command
    this.program
      .command('list')
      .alias('ls')
      .description('List available connectors and templates')
      .option('-t, --type <type>', 'Filter by connector type')
      .option('--templates', 'List available templates')
      .action(this.handleList.bind(this));

    // Info command
    this.program
      .command('info')
      .description('Get information about a connector')
      .requiredOption('-c, --connector <path>', 'Path to connector module')
      .option('--detailed', 'Show detailed information')
      .action(this.handleInfo.bind(this));

    // Init command
    this.program
      .command('init')
      .description('Initialize a new connector project')
      .requiredOption('-d, --directory <directory>', 'Project directory')
      .option('-t, --template <template>', 'Project template', 'basic')
      .option('--interactive', 'Interactive mode')
      .action(this.handleInit.bind(this));
  }

  private async handleGenerate(options: any): Promise<void> {
    try {
      console.log('🚀 Generating connector...');
      console.log(`ID: ${options.id}`);
      console.log(`Name: ${options.name}`);
      console.log(`Type: ${options.type}`);
      console.log(`Output: ${options.output}`);

      const result = await this.generator.generateConnector({
        id: options.id,
        name: options.name,
        type: options.type,
        description: options.description,
        author: options.author,
        email: options.email,
        includeTests: options.tests,
        includeDocumentation: options.docs,
        includeExamples: options.examples
      });

      if (result.success) {
        console.log('✅ Connector generated successfully!');
        console.log(`📁 Location: ${result.directory}`);
        console.log(`📄 Files created: ${result.files.length}`);
        console.log();
        console.log('📋 Next steps:');
        result.nextSteps.forEach((step, index) => {
          console.log(`   ${index + 1}. ${step}`);
        });
      } else {
        console.error('❌ Connector generation failed:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error generating connector:', error);
      process.exit(1);
    }
  }

  private async handleTest(options: any): Promise<void> {
    try {
      console.log('🧪 Testing connector...');
      console.log(`Connector: ${options.connector}`);

      // Load connector module
      const connectorModule = await import(path.resolve(options.connector));
      const ConnectorClass = connectorModule.default || connectorModule;
      const connector: IConnector = new ConnectorClass({
        id: 'test-connector',
        name: 'Test Connector',
        type: 'custom',
        apiKey: 'test-key'
      });

      // Initialize tester
      const tester = new ConnectorTester(connector);

      // Run tests
      const results = await tester.runFullTestSuite({
        includePerformanceTests: options.performance,
        includeStressTests: options.stress,
        includeSecurityTests: options.security,
        mockDataSize: parseInt(options.mockSize),
        stressTestConcurrency: parseInt(options.concurrency)
      });

      // Output results
      if (options.format === 'json') {
        await this.outputJsonResults(results, options.output);
      } else if (options.format === 'html') {
        await this.outputHtmlResults(results, options.output);
      } else {
        this.outputConsoleResults(results);
      }

      if (!results.success) {
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error testing connector:', error);
      process.exit(1);
    }
  }

  private async handleValidate(options: any): Promise<void> {
    try {
      console.log('🔍 Validating connector...');
      console.log(`Connector: ${options.connector}`);

      // Load connector module
      const connectorModule = await import(path.resolve(options.connector));
      const ConnectorClass = connectorModule.default || connectorModule;
      const connector: IConnector = new ConnectorClass({
        id: 'validation-connector',
        name: 'Validation Connector',
        type: 'custom',
        apiKey: 'test-key'
      });

      // Initialize tester
      const tester = new ConnectorTester(connector);

      // Run validation tests
      const configResult = await tester.testConfiguration();
      const schemaResult = await tester.testSchema();

      const results = {
        configuration: configResult,
        schema: schemaResult,
        overall: configResult.passed && schemaResult.passed
      };

      this.outputValidationResults(results, options.strict);

      if (!results.overall) {
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error validating connector:', error);
      process.exit(1);
    }
  }

  private async handleBuild(options: any): Promise<void> {
    try {
      console.log('🔨 Building connector...');
      console.log(`Directory: ${options.directory}`);

      // Check if directory exists
      await fs.access(options.directory);

      // Run build command
      const { execSync } = require('child_process');
      const buildCommand = options.watch
        ? 'npm run build:watch'
        : 'npm run build';

      execSync(buildCommand, {
        cwd: options.directory,
        stdio: 'inherit'
      });

      console.log('✅ Build completed successfully!');
    } catch (error) {
      console.error('❌ Error building connector:', error);
      process.exit(1);
    }
  }

  private async handlePackage(options: any): Promise<void> {
    try {
      console.log('📦 Packaging connector...');
      console.log(`Directory: ${options.directory}`);
      console.log(`Output: ${options.output}`);

      // Create output directory
      await fs.mkdir(options.output, { recursive: true });

      // Read package.json
      const packageJsonPath = path.join(options.directory, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      // Update version if specified
      if (options.version) {
        packageJson.version = options.version;
        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      }

      // Build the project
      await this.handleBuild({ directory: options.directory });

      // Copy built files
      const distDir = path.join(options.directory, 'dist');
      const packageDir = path.join(options.output, packageJson.name);

      await fs.mkdir(packageDir, { recursive: true });
      await this.copyDirectory(distDir, packageDir);

      // Copy package.json and README
      await fs.copyFile(
        packageJsonPath,
        path.join(packageDir, 'package.json')
      );

      const readmePath = path.join(options.directory, 'README.md');
      try {
        await fs.copyFile(readmePath, path.join(packageDir, 'README.md'));
      } catch {
        // README.md might not exist
      }

      console.log('✅ Connector packaged successfully!');
      console.log(`📦 Package: ${packageDir}`);
    } catch (error) {
      console.error('❌ Error packaging connector:', error);
      process.exit(1);
    }
  }

  private async handlePublish(options: any): Promise<void> {
    try {
      console.log('🚀 Publishing connector...');
      console.log(`Directory: ${options.directory}`);
      console.log(`Registry: ${options.registry}`);

      if (options.dryRun) {
        console.log('🔍 Dry run mode - skipping actual publish');
        return;
      }

      // Package first
      await this.handlePackage({
        directory: options.directory,
        output: './publish-temp'
      });

      // Publish to registry
      const { execSync } = require('child_process');
      execSync(`npm publish --registry ${options.registry}`, {
        cwd: './publish-temp',
        stdio: 'inherit'
      });

      // Cleanup
      await fs.rm('./publish-temp', { recursive: true, force: true });

      console.log('✅ Connector published successfully!');
    } catch (error) {
      console.error('❌ Error publishing connector:', error);
      process.exit(1);
    }
  }

  private async handleList(options: any): Promise<void> {
    try {
      if (options.templates) {
        console.log('📋 Available Templates:');
        console.log('  • basic    - Basic connector template');
        console.log('  • advanced - Advanced connector with all features');
        console.log('  • rest     - REST API connector template');
        console.log('  • graphql  - GraphQL connector template');
        console.log('  • database - Database connector template');
        console.log('  • file     - File-based connector template');
      } else {
        console.log('📋 Connector Types:');
        const types = Object.values(ConnectorType);
        types.forEach(type => {
          if (!options.typeFilter || type === options.typeFilter) {
            console.log(`  • ${type}`);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error listing connectors:', error);
      process.exit(1);
    }
  }

  private async handleInfo(options: any): Promise<void> {
    try {
      console.log('📊 Connector Information:');
      console.log(`Path: ${options.connector}`);

      // Load connector module
      const connectorModule = await import(path.resolve(options.connector));
      const ConnectorClass = connectorModule.default || connectorModule;
      const connector: IConnector = new ConnectorClass({
        id: 'info-connector',
        name: 'Info Connector',
        type: 'custom',
        apiKey: 'test-key'
      });

      // Get metadata
      const metadata = await connector.getMetadata();
      const capabilities = connector.capabilities;
      const schema = connector.schema;

      console.log();
      console.log('📝 Metadata:');
      console.log(`  Author: ${metadata.author}`);
      console.log(`  Email: ${metadata.email}`);
      console.log(`  Version: ${metadata.version}`);
      console.log(`  License: ${metadata.license}`);
      console.log(`  Tags: ${metadata.tags.join(', ')}`);

      if (options.detailed) {
        console.log();
        console.log('🔧 Capabilities:');
        console.log(`  Authentication: ${capabilities.authentication.join(', ')}`);
        console.log(`  Sync Directions: ${capabilities.sync.directions.join(', ')}`);
        console.log(`  Real-time Sync: ${capabilities.sync.realtime}`);
        console.log(`  Batching: ${capabilities.sync.batching}`);
        console.log(`  Read: ${capabilities.data.read}`);
        console.log(`  Write: ${capabilities.data.write}`);
        console.log(`  Delete: ${capabilities.data.delete}`);
        console.log(`  Encryption: ${capabilities.advanced.encryption}`);
        console.log(`  Transformations: ${capabilities.advanced.transformations}`);

        console.log();
        console.log('📊 Schema:');
        console.log(`  Name: ${schema.name}`);
        console.log(`  Version: ${schema.version}`);
        console.log(`  Fields: ${schema.fields.length}`);

        if (schema.fields.length > 0) {
          console.log('  Field Definitions:');
          schema.fields.slice(0, 5).forEach(field => {
            console.log(`    • ${field.name} (${field.type})${field.required ? ' required' : ''}`);
          });
          if (schema.fields.length > 5) {
            console.log(`    ... and ${schema.fields.length - 5} more`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error getting connector info:', error);
      process.exit(1);
    }
  }

  private async handleInit(options: any): Promise<void> {
    try {
      console.log('🚀 Initializing new connector project...');
      console.log(`Directory: ${options.directory}`);
      console.log(`Template: ${options.template}`);

      // Create project directory
      await fs.mkdir(options.directory, { recursive: true });

      if (options.interactive) {
        await this.initInteractive(options.directory);
      } else {
        await this.initFromTemplate(options.directory, options.template);
      }

      console.log('✅ Project initialized successfully!');
      console.log();
      console.log('📋 Next steps:');
      console.log(`   1. cd ${options.directory}`);
      console.log('   2. npm install');
      console.log('   3. Start developing your connector');
    } catch (error) {
      console.error('❌ Error initializing project:', error);
      process.exit(1);
    }
  }

  private async initInteractive(directory: string): Promise<void> {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const questions = [
      { key: 'id', question: 'Connector ID (e.g., salesforce): ' },
      { key: 'name', question: 'Connector display name: ' },
      { key: 'type', question: 'Connector type (crm, database, api, file): ' },
      { key: 'description', question: 'Description: ' },
      { key: 'author', question: 'Author name: ' },
      { key: 'email', question: 'Author email: ' }
    ];

    const answers: Record<string, string> = {};

    for (const question of questions) {
      answers[question.key] = await new Promise(resolve => {
        rl.question(question.question, resolve);
      });
    }

    rl.close();

    await this.generator.generateConnector({
      id: answers.id,
      name: answers.name,
      type: answers.type as ConnectorType,
      description: answers.description,
      author: answers.author,
      email: answers.email
    });
  }

  private async initFromTemplate(directory: string, template: string): Promise<void> {
    // Create basic project structure
    const structure = {
      'src': {},
      '__tests__': {},
      'docs': {},
      'examples': {},
      'package.json': this.getPackageJsonTemplate(),
      'tsconfig.json': this.getTsConfigTemplate(),
      'README.md': this.getReadmeTemplate(),
      '.gitignore': this.getGitignoreTemplate()
    };

    await this.createProjectStructure(directory, structure);
  }

  private getPackageJsonTemplate(): string {
    return JSON.stringify({
      name: "my-connector",
      version: "1.0.0",
      description: "My custom connector",
      main: "dist/index.js",
      types: "dist/index.d.ts",
      scripts: {
        build: "tsc",
        test: "jest",
        "test:watch": "jest --watch",
        lint: "eslint src --ext .ts"
      },
      dependencies: {
        "@atlas/connectors": "^1.0.0"
      },
      devDependencies: {
        "@types/node": "^16.0.0",
        "@types/jest": "^27.0.0",
        "typescript": "^4.5.0",
        "jest": "^27.0.0",
        "ts-jest": "^27.0.0"
      }
    }, null, 2);
  }

  private getTsConfigTemplate(): string {
    return JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        lib: ["ES2020"],
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        sourceMap: true
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist", "**/*.test.ts"]
    }, null, 2);
  }

  private getReadmeTemplate(): string {
    return `# My Connector

A custom connector for Atlas.

## Installation

\`\`\`bash
npm install my-connector
\`\`\`

## Usage

\`\`\`typescript
import { createMyConnector } from 'my-connector';

const connector = createMyConnector({
  id: 'my-connector',
  name: 'My Connector',
  type: 'custom',
  apiKey: 'your-api-key'
});

await connector.connect();
const results = await connector.query('SELECT * FROM users');
await connector.disconnect();
\`\`\`

## Development

\`\`\`bash
npm install
npm run build
npm test
\`\`\`
`;
  }

  private getGitignoreTemplate(): string {
    return `# Dependencies
node_modules/

# Build outputs
dist/
build/

# Environment variables
.env
.env.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Test coverage
coverage/
.nyc_output/

# Logs
logs/
*.log

# Temporary files
tmp/
temp/
`;
  }

  private async createProjectStructure(baseDir: string, structure: any): Promise<void> {
    for (const [name, content] of Object.entries(structure)) {
      const fullPath = path.join(baseDir, name);
      if (typeof content === 'object') {
        await fs.mkdir(fullPath, { recursive: true });
        await this.createProjectStructure(fullPath, content);
      } else {
        await fs.writeFile(fullPath, content);
      }
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    const entries = await fs.readdir(src, { withFileTypes: true });
    await fs.mkdir(dest, { recursive: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async outputJsonResults(results: any, outputDir: string): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `test-results-${Date.now()}.json`);
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
    console.log(`📊 Test results saved to: ${outputPath}`);
  }

  private async outputHtmlResults(results: any, outputDir: string): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `test-results-${Date.now()}.html`);

    const html = this.generateHtmlReport(results);
    await fs.writeFile(outputPath, html);
    console.log(`📊 Test results saved to: ${outputPath}`);
  }

  private generateHtmlReport(results: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Connector Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { margin: 20px 0; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .passed { background: #d4edda; border: 1px solid #c3e6cb; }
        .failed { background: #f8d7da; border: 1px solid #f5c6cb; }
        .metrics { background: #e2e3e5; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Connector Test Results</h1>
        <div class="summary">
            <p><strong>Total Tests:</strong> ${results.totalTests}</p>
            <p><strong>Passed:</strong> ${results.passedTests}</p>
            <p><strong>Failed:</strong> ${results.failedTests}</p>
            <p><strong>Duration:</strong> ${results.duration}ms</p>
            <p><strong>Success:</strong> ${results.success ? '✅ Yes' : '❌ No'}</p>
        </div>
    </div>
    <div class="results">
        ${results.testResults.map((result: any) => `
            <div class="test-result ${result.passed ? 'passed' : 'failed'}">
                <h3>${result.name}</h3>
                <p>${result.description}</p>
                <p><strong>Duration:</strong> ${result.duration}ms</p>
                <p><strong>Passed:</strong> ${result.passed ? '✅ Yes' : '❌ No'}</p>
                ${result.metrics ? `<div class="metrics">${JSON.stringify(result.metrics, null, 2)}</div>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;
  }

  private outputConsoleResults(results: any): void {
    console.log();
    console.log('📊 Test Results:');
    console.log('═'.repeat(50));
    console.log(`Total Tests: ${results.totalTests}`);
    console.log(`Passed: ${results.passedTests} ✅`);
    console.log(`Failed: ${results.failedTests} ${results.failedTests > 0 ? '❌' : ''}`);
    console.log(`Duration: ${results.duration}ms`);
    console.log(`Success: ${results.success ? '✅' : '❌'}`);
    console.log('═'.repeat(50));

    if (results.testResults.length > 0) {
      console.log();
      console.log('🔍 Test Details:');
      results.testResults.forEach((result: any) => {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${result.name} (${result.duration}ms)`);

        if (result.subResults) {
          result.subResults.forEach((subResult: any) => {
            const subStatus = subResult.passed ? '✅' : '❌';
            console.log(`  ${subStatus} ${subResult.name} (${subResult.duration}ms)`);
          });
        }
      });
    }

    if (results.performanceMetrics.length > 0) {
      console.log();
      console.log('⚡ Performance Metrics:');
      results.performanceMetrics.forEach((metric: any) => {
        console.log(`${metric.testName}: ${metric.duration}ms (${metric.success ? '✅' : '❌'})`);
      });
    }

    if (results.securityFindings.length > 0) {
      console.log();
      console.log('🔒 Security Findings:');
      results.securityFindings.forEach((finding: any) => {
        console.log(`  ${finding.severity.toUpperCase()}: ${finding.description}`);
        console.log(`    Recommendation: ${finding.recommendation}`);
      });
    }
  }

  private outputValidationResults(results: any, strict: boolean): void {
    console.log();
    console.log('🔍 Validation Results:');
    console.log('═'.repeat(50));

    const overallStatus = results.overall ? '✅' : '❌';
    console.log(`Overall: ${overallStatus}`);

    console.log();
    console.log('Configuration:');
    const configStatus = results.configuration.passed ? '✅' : '❌';
    console.log(`  ${configStatus} ${results.configuration.name}`);
    results.configuration.validations.forEach((validation: any) => {
      const severity = validation.severity === 'error' ? '❌' :
                       validation.severity === 'warning' ? '⚠️' : '✅';
      console.log(`    ${severity} ${validation.message}`);
    });

    console.log();
    console.log('Schema:');
    const schemaStatus = results.schema.passed ? '✅' : '❌';
    console.log(`  ${schemaStatus} ${results.schema.name}`);
    results.schema.validations.forEach((validation: any) => {
      const severity = validation.severity === 'error' ? '❌' :
                       validation.severity === 'warning' ? '⚠️' : '✅';
      console.log(`    ${severity} ${validation.message}`);
    });

    if (!results.overall && strict) {
      console.log();
      console.log('❌ Validation failed in strict mode');
      process.exit(1);
    }
  }

  private validateConnectorType(type: string): ConnectorType {
    const validTypes = Object.values(ConnectorType);
    if (validTypes.includes(type as ConnectorType)) {
      return type as ConnectorType;
    }
    console.error(`❌ Invalid connector type: ${type}`);
    console.error(`Valid types: ${validTypes.join(', ')}`);
    process.exit(1);
  }

  private validateEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email)) {
      return email;
    }
    console.error('❌ Invalid email address');
    process.exit(1);
  }

  public async run(args: string[]): Promise<void> {
    await this.program.parseAsync(args);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new ConnectorCLI();
  cli.run(process.argv).catch(error => {
    console.error('❌ CLI Error:', error);
    process.exit(1);
  });
}

export { ConnectorCLI };