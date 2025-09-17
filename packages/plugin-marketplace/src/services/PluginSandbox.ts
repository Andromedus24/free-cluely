import * as vm from 'vm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { SecurityError } from '../types/MarketplaceTypes';

export interface SandboxConfig {
  timeout: number;
  memoryLimit: number;
  allowedModules: string[];
  blockedApis: string[];
  enableFileSystem: boolean;
  enableNetwork: boolean;
  enableChildProcess: boolean;
  restrictedPaths: string[];
  maxExecutionTime: number;
  enableDebugging: boolean;
}

export interface SandboxResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  memoryUsed: number;
  logs: string[];
  warnings: string[];
}

export class PluginSandbox {
  private config: SandboxConfig;
  private activeSandboxes: Map<string, vm.Context> = new Map();

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = {
      timeout: 5000,
      memoryLimit: 50 * 1024 * 1024, // 50MB
      allowedModules: [],
      blockedApis: ['fs', 'child_process', 'net', 'http', 'https', 'dgram', 'tls', 'cluster'],
      enableFileSystem: false,
      enableNetwork: false,
      enableChildProcess: false,
      restrictedPaths: ['/etc', '/usr', '/System', '/Windows'],
      maxExecutionTime: 30000,
      enableDebugging: false,
      ...config
    };
  }

  async executeInSandbox(
    pluginId: string,
    code: string,
    context: Record<string, any> = {}
  ): Promise<SandboxResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const warnings: string[] = [];

    try {
      // Create isolated context
      const sandboxContext = this.createSandboxContext(pluginId, context, logs, warnings);

      // Create script with timeout
      const script = new vm.Script(code, {
        timeout: this.config.timeout,
        filename: `${pluginId}.js`
      });

      // Execute in sandbox
      const result = script.runInNewContext(sandboxContext, {
        timeout: this.config.timeout,
        displayErrors: false,
        breakOnSigint: true
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result,
        executionTime,
        memoryUsed: process.memoryUsage().heapUsed,
        logs,
        warnings
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: this.formatError(error as Error),
        executionTime,
        memoryUsed: process.memoryUsage().heapUsed,
        logs,
        warnings
      };
    }
  }

  async executeInWorkerSandbox(
    pluginId: string,
    code: string,
    context: Record<string, any> = {}
  ): Promise<SandboxResult> {
    return new Promise((resolve) => {
      const worker = new Worker(__filename, {
        workerData: {
          pluginId,
          code,
          context,
          config: this.config
        },
        resourceLimits: {
          maxOldGenerationSizeMb: this.config.memoryLimit / (1024 * 1024),
          maxYoungGenerationSizeMb: 16,
          codeRangeSizeMb: 16,
          stackSizeMb: 8
        }
      });

      const timeout = setTimeout(() => {
        worker.terminate();
        resolve({
          success: false,
          error: 'Execution timeout exceeded',
          executionTime: this.config.timeout,
          memoryUsed: 0,
          logs: [],
          warnings: []
        });
      }, this.config.maxExecutionTime);

      worker.on('message', (result: SandboxResult) => {
        clearTimeout(timeout);
        worker.terminate();
        resolve(result);
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        worker.terminate();
        resolve({
          success: false,
          error: this.formatError(error),
          executionTime: Date.now() - Date.now(),
          memoryUsed: 0,
          logs: [],
          warnings: []
        });
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          resolve({
            success: false,
            error: `Worker exited with code ${code}`,
            executionTime: Date.now() - Date.now(),
            memoryUsed: 0,
            logs: [],
            warnings: []
          });
        }
      });
    });
  }

  async validatePluginCode(pluginId: string, code: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    securityScore: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let securityScore = 100;

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/gi, severity: 'critical', deduction: 40 },
      { pattern: /Function\s*\(/gi, severity: 'high', deduction: 30 },
      { pattern: /new\s+Function\s*\(/gi, severity: 'high', deduction: 30 },
      { pattern: /setImmediate\s*\(/gi, severity: 'medium', deduction: 15 },
      { pattern: /setInterval\s*\(/gi, severity: 'medium', deduction: 15 },
      { pattern: /setTimeout\s*\(/gi, severity: 'medium', deduction: 15 },
      { pattern: /process\.exit/gi, severity: 'critical', deduction: 50 },
      { pattern: /process\.kill/gi, severity: 'critical', deduction: 50 },
      { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/gi, severity: 'critical', deduction: 40 },
      { pattern: /require\s*\(\s*['"]fs['"]\s*\)/gi, severity: 'high', deduction: 25 },
      { pattern: /require\s*\(\s*['"]net['"]\s*\)/gi, severity: 'high', deduction: 25 },
      { pattern: /require\s*\(\s*['"]http['"]\s*\)/gi, severity: 'high', deduction: 25 },
      { pattern: /require\s*\(\s*['"]https['"]\s*\)/gi, severity: 'medium', deduction: 20 },
      { pattern: /global\./gi, severity: 'medium', deduction: 15 },
      { pattern: /globalThis\./gi, severity: 'medium', deduction: 15 },
      { pattern: /window\./gi, severity: 'medium', deduction: 15 },
      { pattern: /document\./gi, severity: 'medium', deduction: 15 }
    ];

    const lines = code.split('\n');
    dangerousPatterns.forEach(({ pattern, severity, deduction }) => {
      let match;
      const regex = new RegExp(pattern);

      while ((match = regex.exec(code)) !== null) {
        const lineIndex = code.substring(0, match.index).split('\n').length - 1;
        const line = lines[lineIndex] || '';

        if (severity === 'critical') {
          errors.push(`Critical security risk at line ${lineIndex + 1}: ${line.trim()}`);
        } else if (severity === 'high') {
          errors.push(`High security risk at line ${lineIndex + 1}: ${line.trim()}`);
        } else {
          warnings.push(`Medium security risk at line ${lineIndex + 1}: ${line.trim()}`);
        }

        securityScore -= deduction;
      }
    });

    // Check for access to restricted modules
    const restrictedModules = this.config.blockedApis;
    restrictedModules.forEach(module => {
      if (code.includes(`require('${module}')`) || code.includes(`require("${module}")`)) {
        errors.push(`Restricted module access detected: ${module}`);
        securityScore -= 30;
      }
    });

    // Check for file system access attempts
    if (!this.config.enableFileSystem) {
      const fsPatterns = [
        /fs\.readFile/gi,
        /fs\.writeFile/gi,
        /fs\.access/gi,
        /fs\.exists/gi,
        /fs\.readdir/gi,
        /fs\.stat/gi
      ];

      fsPatterns.forEach(pattern => {
        if (pattern.test(code)) {
          errors.push('File system access is not allowed in this sandbox');
          securityScore -= 35;
        }
      });
    }

    // Check for network access attempts
    if (!this.config.enableNetwork) {
      const networkPatterns = [
        /fetch\s*\(/gi,
        /XMLHttpRequest/gi,
        /WebSocket/gi,
        /\.connect\s*\(/gi,
        /\.listen\s*\(/gi
      ];

      networkPatterns.forEach(pattern => {
        if (pattern.test(code)) {
          errors.push('Network access is not allowed in this sandbox');
          securityScore -= 35;
        }
      });
    }

    // Check for code size
    if (code.length > 100000) { // 100KB
      warnings.push('Plugin code is very large, may impact performance');
      securityScore -= 5;
    }

    // Check for infinite loops
    const loopPatterns = [
      /for\s*\([^;]*;[^;]*;[^)]*\)\s*{/gi,
      /while\s*\([^)]*\)\s*{/gi,
      /do\s*{/gi
    ];

    let loopCount = 0;
    loopPatterns.forEach(pattern => {
      const matches = code.match(pattern);
      loopCount += matches ? matches.length : 0;
    });

    if (loopCount > 10) {
      warnings.push('Multiple loops detected, potential performance impact');
      securityScore -= 10;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      securityScore: Math.max(0, securityScore)
    };
  }

  async createSecurePluginEnvironment(pluginId: string): Promise<vm.Context> {
    const context = vm.createContext({
      console: {
        log: (...args: any[]) => {
          // Capture logs instead of outputting
          console.log(`[${pluginId}]`, ...args);
        },
        error: (...args: any[]) => {
          console.error(`[${pluginId}]`, ...args);
        },
        warn: (...args: any[]) => {
          console.warn(`[${pluginId}]`, ...args);
        },
        info: (...args: any[]) => {
          console.info(`[${pluginId}]`, ...args);
        }
      },
      setTimeout: this.config.enableDebugging ? setTimeout : undefined,
      clearTimeout: this.config.enableDebugging ? clearTimeout : undefined,
      setInterval: this.config.enableDebugging ? setInterval : undefined,
      clearInterval: this.config.enableDebugging ? clearInterval : undefined,
      Buffer: Buffer,
      URL: URL,
      URLSearchParams: URLSearchParams,
      TextDecoder: TextDecoder,
      TextEncoder: TextEncoder,
      atob: atob,
      btoa: btoa,
      performance: performance,
      crypto: {
        getRandomValues: (array: any) => {
          // Provide secure random values
          return crypto.getRandomValues(array);
        },
        subtle: null // Disable Web Crypto API
      }
    });

    // Add allowed modules
    for (const module of this.config.allowedModules) {
      try {
        context[module] = require(module);
      } catch {
        // Module not available
      }
    }

    return context;
  }

  private createSandboxContext(
    pluginId: string,
    context: Record<string, any>,
    logs: string[],
    warnings: string[]
  ): vm.Context {
    const sandboxContext = vm.createContext({
      // Core safe globals
      console: {
        log: (...args: any[]) => logs.push(args.map(arg => String(arg)).join(' ')),
        error: (...args: any[]) => logs.push('ERROR: ' + args.map(arg => String(arg)).join(' ')),
        warn: (...args: any[]) => warnings.push(args.map(arg => String(arg)).join(' ')),
        info: (...args: any[]) => logs.push('INFO: ' + args.map(arg => String(arg)).join(' '))
      },
      Math: Math,
      JSON: JSON,
      Date: Date,
      RegExp: RegExp,
      Array: Array,
      Object: Object,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Error: Error,
      TypeError: TypeError,
      SyntaxError: SyntaxError,
      ReferenceError: ReferenceError,
      RangeError: RangeError,
      EvalError: EvalError,
      URIError: URIError,
      Promise: Promise,
      Symbol: Symbol,
      Map: Map,
      Set: Set,
      WeakMap: WeakMap,
      WeakSet: WeakSet,
      ArrayBuffer: ArrayBuffer,
      DataView: DataView,
      Int8Array: Int8Array,
      Uint8Array: Uint8Array,
      Uint8ClampedArray: Uint8ClampedArray,
      Int16Array: Int16Array,
      Uint16Array: Uint16Array,
      Int32Array: Int32Array,
      Uint32Array: Uint32Array,
      Float32Array: Float32Array,
      Float64Array: Float64Array,
      BigInt64Array: BigInt64Array,
      BigUint64Array: BigUint64Array,
      BigInt: BigInt,
      Proxy: Proxy,
      Reflect: Reflect,
      Atomics: Atomics,
      SharedArrayBuffer: this.config.enableDebugging ? SharedArrayBuffer : undefined,

      // Safe utility functions
      isNaN: isNaN,
      isFinite: isFinite,
      parseFloat: parseFloat,
      parseInt: parseInt,
      decodeURI: decodeURI,
      decodeURIComponent: decodeURIComponent,
      encodeURI: encodeURI,
      encodeURIComponent: encodeURIComponent,
      escape: escape,
      unescape: unescape,

      // Plugin context
      ...context,

      // Plugin-specific utilities
      __pluginId: pluginId,
      __sandbox: true,
      __version: '1.0.0'
    });

    this.activeSandboxes.set(pluginId, sandboxContext);
    return sandboxContext;
  }

  private formatError(error: Error): string {
    if (error instanceof vm.Script) {
      return `Script execution error: ${error.message}`;
    }
    return error.message || 'Unknown error occurred';
  }

  cleanupSandbox(pluginId: string): void {
    this.activeSandboxes.delete(pluginId);
  }

  cleanupAllSandboxes(): void {
    this.activeSandboxes.clear();
  }

  getActiveSandboxes(): string[] {
    return Array.from(this.activeSandboxes.keys());
  }

  updateConfig(newConfig: Partial<SandboxConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): SandboxConfig {
    return { ...this.config };
  }
}

// Worker thread execution
if (!isMainThread && parentPort) {
  const { pluginId, code, context, config } = workerData;
  const sandbox = new PluginSandbox(config);

  sandbox.executeInSandbox(pluginId, code, context)
    .then(result => {
      parentPort!.postMessage(result);
    })
    .catch(error => {
      parentPort!.postMessage({
        success: false,
        error: sandbox.formatError(error),
        executionTime: 0,
        memoryUsed: 0,
        logs: [],
        warnings: []
      });
    });
}