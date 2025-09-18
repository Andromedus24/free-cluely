import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as chokidar from 'chokidar';
import { PluginManifest, PluginManifestSchema } from './PluginSDK';

export interface TestConfig {
  coverage?: boolean;
  verbose?: boolean;
  watch?: boolean;
  timeout?: number;
  testFiles?: string[];
  testPattern?: string;
  excludePattern?: string;
  reporters?: string[];
  environment?: Record<string, string>;
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  assertions?: {
    passed: number;
    failed: number;
    total: number;
  };
}

export interface TestSuiteResult {
  name: string;
  tests: TestResult[];
  status: 'passed' | 'failed';
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage?: {
    total: number;
    covered: number;
    percentage: number;
    files: Record<string, {
      statements: { total: number; covered: number; percentage: number };
      branches: { total: number; covered: number; percentage: number };
      functions: { total: number; covered: number; percentage: number };
      lines: { total: number; covered: number; percentage: number };
    }>;
  };
}

export class PluginTester {
  private pluginDir: string;
  private manifest: PluginManifest;
  private testWatcher: chokidar.FSWatcher | null = null;
  private testProcess: ChildProcess | null = null;

  constructor(pluginDir: string) {
    this.pluginDir = pluginDir;
  }

  async run(config: TestConfig = {}): Promise<TestSuiteResult> {
    // Load and validate manifest
    await this.loadManifest();

    // Set up test environment
    const testEnv = this.setupTestEnvironment(config.environment);

    // Find test files
    const testFiles = await this.findTestFiles(config);

    // Run tests
    const results = await this.executeTests(testFiles, config);

    // Generate coverage report if requested
    if (config.coverage) {
      results.coverage = await this.generateCoverageReport();
    }

    return results;
  }

  async watch(config: TestConfig = {}): Promise<void> {
    await this.loadManifest();

    console.log('🔍 Starting test watcher...');

    // Watch for file changes
    this.testWatcher = chokidar.watch(this.pluginDir, {
      ignored: /node_modules|dist|\.git/,
      persistent: true
    });

    this.testWatcher.on('change', async (filePath) => {
      console.log(`📄 File changed: ${filePath}`);
      console.log('🧪 Running tests...');

      try {
        const results = await this.run(config);
        this.displayResults(results);
      } catch (error) {
        console.error('❌ Test run failed:', error);
      }
    });

    this.testWatcher.on('add', async (filePath) => {
      if (filePath.includes('.test.') || filePath.includes('.spec.')) {
        console.log(`📄 New test file: ${filePath}`);
        console.log('🧪 Running tests...');

        try {
          const results = await this.run(config);
          this.displayResults(results);
        } catch (error) {
          console.error('❌ Test run failed:', error);
        }
      }
    });

    // Initial run
    console.log('🧪 Running initial test suite...');
    try {
      const results = await this.run(config);
      this.displayResults(results);
    } catch (error) {
      console.error('❌ Initial test run failed:', error);
    }

    // Handle process exit
    process.on('SIGINT', () => this.stopWatching());
    process.on('SIGTERM', () => this.stopWatching());
  }

  stopWatching(): void {
    if (this.testWatcher) {
      this.testWatcher.close();
      this.testWatcher = null;
    }

    if (this.testProcess) {
      this.testProcess.kill();
      this.testProcess = null;
    }

    console.log('🛑 Test watcher stopped');
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

  private setupTestEnvironment(customEnv?: Record<string, string>): Record<string, string> {
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      ATLAS_PLUGIN_ID: this.manifest.id,
      ATLAS_PLUGIN_VERSION: this.manifest.version,
      ATLAS_PLUGIN_MODE: 'test',
      ...customEnv
    };

    return env;
  }

  private async findTestFiles(config: TestConfig): Promise<string[]> {
    const testDirs = ['test', 'tests', '__tests__', 'src/test', 'src/tests'];
    const extensions = ['.test.ts', '.test.js', '.spec.ts', '.spec.js'];

    let testFiles: string[] = [];

    for (const dir of testDirs) {
      const testDir = path.join(this.pluginDir, dir);

      try {
        await fs.access(testDir);
        const files = await this.findFilesInDir(testDir, extensions, config);
        testFiles = testFiles.concat(files);
      } catch {
        // Test directory doesn't exist, skip
      }
    }

    // Also look for test files in src directory
    const srcDir = path.join(this.pluginDir, 'src');
    try {
      await fs.access(srcDir);
      const files = await this.findFilesInDir(srcDir, extensions, config);
      testFiles = testFiles.concat(files);
    } catch {
      // Src directory doesn't exist, skip
    }

    return testFiles;
  }

  private async findFilesInDir(
    dir: string,
    extensions: string[],
    config: TestConfig
  ): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subFiles = await this.findFilesInDir(path.join(dir, entry.name), extensions, config);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const filePath = path.join(dir, entry.name);

        // Check if file matches test extensions
        if (extensions.some(ext => entry.name.endsWith(ext))) {
          // Apply include/exclude patterns if specified
          if (config.testPattern && !filePath.includes(config.testPattern)) {
            continue;
          }

          if (config.excludePattern && filePath.includes(config.excludePattern)) {
            continue;
          }

          files.push(filePath);
        }
      }
    }

    return files;
  }

  private async executeTests(testFiles: string[], config: TestConfig): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const testResults: TestResult[] = [];

    console.log(`🧪 Running ${testFiles.length} test files...`);

    for (const testFile of testFiles) {
      try {
        const result = await this.runSingleTest(testFile, config);
        testResults.push(result);
      } catch (error) {
        testResults.push({
          name: testFile,
          status: 'failed',
          duration: 0,
          error: (error as Error).message
        });
      }
    }

    const duration = Date.now() - startTime;
    const passed = testResults.filter(t => t.status === 'passed').length;
    const failed = testResults.filter(t => t.status === 'failed').length;
    const skipped = testResults.filter(t => t.status === 'skipped').length;

    return {
      name: this.manifest.name,
      tests: testResults,
      status: failed > 0 ? 'failed' : 'passed',
      duration,
      passed,
      failed,
      skipped
    };
  }

  private async runSingleTest(testFile: string, config: TestConfig): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Check if Jest is available
      const packageJsonPath = path.join(this.pluginDir, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      if (packageJson.devDependencies?.jest || packageJson.dependencies?.jest) {
        return await this.runJestTest(testFile, config);
      } else {
        // Fallback to simple test runner
        return await this.runSimpleTest(testFile, config);
      }
    } catch (error) {
      return {
        name: testFile,
        status: 'failed',
        duration: Date.now() - startTime,
        error: (error as Error).message
      };
    }
  }

  private async runJestTest(testFile: string, config: TestConfig): Promise<TestResult> {
    const jestPath = path.join(this.pluginDir, 'node_modules', '.bin', 'jest');
    const args = [testFile, '--json', '--verbose'];

    if (config.coverage) {
      args.push('--coverage');
    }

    return new Promise((resolve, reject) => {
      const child = spawn(jestPath, args, {
        cwd: this.pluginDir,
        env: this.setupTestEnvironment(config.environment),
        stdio: 'pipe'
      });

      let output = '';
      let error = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        try {
          const result = JSON.parse(output);

          if (result.testResults && result.testResults.length > 0) {
            const testResult = result.testResults[0];

            resolve({
              name: testFile,
              status: testResult.numFailingTests > 0 ? 'failed' : 'passed',
              duration: testResult.perfStats?.runtime || 0,
              assertions: {
                passed: testResult.numPassingTests,
                failed: testResult.numFailingTests,
                total: testResult.numPassingTests + testResult.numFailingTests
              }
            });
          } else {
            resolve({
              name: testFile,
              status: code === 0 ? 'passed' : 'failed',
              duration: 0
            });
          }
        } catch (parseError) {
          reject(new Error(\`Failed to parse Jest output: ${parseError}\`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async runSimpleTest(testFile: string, config: TestConfig): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Dynamic import the test file
      const testModule = await import(path.resolve(testFile));

      // Look for test functions
      const testFunctions = Object.getOwnPropertyNames(testModule)
        .filter(name => name.startsWith('test') || name.startsWith('it'));

      let passed = 0;
      let failed = 0;

      for (const testName of testFunctions) {
        try {
          await testModule[testName]();
          passed++;
        } catch (error) {
          failed++;
          if (config.verbose) {
            console.error(`❌ ${testName}:`, error);
          }
        }
      }

      return {
        name: testFile,
        status: failed > 0 ? 'failed' : 'passed',
        duration: Date.now() - startTime,
        assertions: {
          passed,
          failed,
          total: passed + failed
        }
      };
    } catch (error) {
      return {
        name: testFile,
        status: 'failed',
        duration: Date.now() - startTime,
        error: (error as Error).message
      };
    }
  }

  private async generateCoverageReport(): Promise<TestSuiteResult['coverage']> {
    // This would integrate with coverage tools like Istanbul or NYC
    // For now, return a mock coverage report
    return {
      total: 100,
      covered: 85,
      percentage: 85,
      files: {}
    };
  }

  private displayResults(results: TestSuiteResult): void {
    console.log('\\n🧪 Test Results:');
    console.log(\`  Tests: \${results.passed + results.failed + results.skipped} total\`);
    console.log(\`  ✅ Passed: \${results.passed}\`);
    console.log(\`  ❌ Failed: \${results.failed}\`);
    console.log(\`  ⏭️  Skipped: \${results.skipped}\`);
    console.log(\`  ⏱️  Duration: \${results.duration}ms\`);

    if (results.coverage) {
      console.log('\\n📊 Coverage:');
      console.log(\`  Coverage: \${results.coverage.percentage}%\`);
    }

    if (results.failed > 0) {
      console.log('\\n❌ Failed tests:');
      results.tests
        .filter(t => t.status === 'failed')
        .forEach(test => {
          console.log(\`  - \${test.name}: \${test.error}\`);
        });
    }

    console.log(\`\\n🎯 Overall: \${results.status.toUpperCase()}\`);
  }

  // Utility methods for testing
  async createMockPluginContext() {
    return {
      pluginId: this.manifest.id,
      version: this.manifest.version,
      config: {},
      logger: {
        info: (msg: string, data?: any) => console.log('[INFO]', msg, data),
        warn: (msg: string, data?: any) => console.warn('[WARN]', msg, data),
        error: (msg: string, error?: Error, data?: any) => console.error('[ERROR]', msg, error, data),
        debug: (msg: string, data?: any) => console.debug('[DEBUG]', msg, data)
      },
      storage: this.createMockStorage(),
      api: this.createMockApi(),
      ui: this.createMockUI(),
      permissions: this.manifest.permissions,
      sandbox: true
    };
  }

  private createMockStorage() {
    const storage = new Map();

    return {
      get: async (key: string) => storage.get(key),
      set: async (key: string, value: any) => storage.set(key, value),
      delete: async (key: string) => storage.delete(key),
      keys: async () => Array.from(storage.keys()),
      clear: async () => storage.clear()
    };
  }

  private createMockApi() {
    return {
      request: async (config: any) => ({ success: true, data: {}, status: 200, headers: {} }),
      get: async (url: string, config?: any) => ({ success: true, data: {}, status: 200, headers: {} }),
      post: async (url: string, data?: any, config?: any) => ({ success: true, data: {}, status: 200, headers: {} }),
      put: async (url: string, data?: any, config?: any) => ({ success: true, data: {}, status: 200, headers: {} }),
      delete: async (url: string, config?: any) => ({ success: true, data: {}, status: 200, headers: {} })
    };
  }

  private createMockUI() {
    return {
      createPanel: (config: any) => ({
        id: config.id,
        show: () => {},
        hide: () => {},
        close: () => {},
        setContent: () => {},
        on: () => {},
        off: () => {}
      }),
      createDialog: (config: any) => ({
        id: config.id,
        show: () => {},
        hide: () => {},
        close: () => {},
        setContent: () => {},
        on: () => {},
        off: () => {}
      }),
      createMenuItem: (config: any) => ({
        id: config.id,
        enabled: true,
        visible: true,
        setEnabled: () => {},
        setVisible: () => {},
        onClick: () => {}
      }),
      createButton: (config: any) => ({
        id: config.id,
        enabled: true,
        visible: true,
        setEnabled: () => {},
        setVisible: () => {},
        setLabel: () => {},
        onClick: () => {}
      }),
      createInput: (config: any) => ({
        id: config.id,
        value: '',
        enabled: true,
        visible: true,
        setValue: () => {},
        getValue: () => '',
        setEnabled: () => {},
        setVisible: () => {},
        onChange: () => {}
      }),
      createSelect: (config: any) => ({
        id: config.id,
        value: '',
        enabled: true,
        visible: true,
        setValue: () => {},
        getValue: () => '',
        setEnabled: () => {},
        setVisible: () => {},
        onChange: () => {}
      }),
      createNotification: (config: any) => ({
        id: config.id,
        show: () => {},
        hide: () => {},
        close: () => {}
      })
    };
  }
}