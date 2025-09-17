import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { SecurityScan, PluginValidator } from '../interfaces/MarketplaceInterfaces';
import { PluginSandbox, SandboxConfig } from './PluginSandbox';
import { SecurityError } from '../types/MarketplaceTypes';

export interface SecurityEvent {
  id: string;
  type: 'access_violation' | 'resource_limit' | 'code_injection' | 'network_access' | 'file_access' | 'process_creation';
  pluginId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  action: 'block' | 'warn' | 'log' | 'quarantine';
}

export interface SecurityPolicy {
  allowedModules: string[];
  blockedModules: string[];
  allowedDomains: string[];
  blockedDomains: string[];
  allowedPaths: string[];
  blockedPaths: string[];
  resourceLimits: {
    memory: number;
    cpu: number;
    network: number;
    disk: number;
  };
  executionLimits: {
    timeout: number;
    maxCalls: number;
    recursionLimit: number;
  };
  scanFrequency: number; // in hours
  autoQuarantine: boolean;
  alertThreshold: number;
}

export class SecurityMonitor extends EventEmitter {
  private securityEvents: Map<string, SecurityEvent[]> = new Map();
  private sandbox: PluginSandbox;
  private validator: PluginValidator;
  private policies: Map<string, SecurityPolicy> = new Map();
  private activeScans: Map<string, Promise<SecurityScan>> = new Map();
  private quarantinedPlugins: Set<string> = new Set();

  constructor(
    sandbox: PluginSandbox,
    validator: PluginValidator,
    defaultPolicy?: Partial<SecurityPolicy>
  ) {
    super();
    this.sandbox = sandbox;
    this.validator = validator;

    // Default security policy
    const defaultSecurityPolicy: SecurityPolicy = {
      allowedModules: [],
      blockedModules: ['child_process', 'fs', 'net', 'http', 'https', 'dgram', 'tls', 'cluster', 'vm'],
      allowedDomains: [],
      blockedDomains: [],
      allowedPaths: [],
      blockedPaths: ['/etc', '/usr', '/System', '/Windows', '/var', '/tmp'],
      resourceLimits: {
        memory: 50 * 1024 * 1024, // 50MB
        cpu: 80, // 80% CPU
        network: 10 * 1024 * 1024, // 10MB network
        disk: 100 * 1024 * 1024 // 100MB disk
      },
      executionLimits: {
        timeout: 5000,
        maxCalls: 1000,
        recursionLimit: 100
      },
      scanFrequency: 24, // 24 hours
      autoQuarantine: true,
      alertThreshold: 3 // 3 violations before quarantine
    };

    this.policies.set('default', { ...defaultSecurityPolicy, ...defaultPolicy });
  }

  async monitorPluginExecution(
    pluginId: string,
    code: string,
    context: Record<string, any> = {}
  ): Promise<any> {
    const policy = this.policies.get(pluginId) || this.policies.get('default')!;

    // Validate code before execution
    const validation = await this.validator.validateSecurity(code);
    if (!validation.valid) {
      await this.createSecurityEvent({
        type: 'code_injection',
        pluginId,
        severity: 'critical',
        message: `Security validation failed: ${validation.vulnerabilities.map(v => v.description).join(', ')}`,
        metadata: { vulnerabilities: validation.vulnerabilities },
        action: 'block'
      });

      if (policy.autoQuarantine) {
        await this.quarantinePlugin(pluginId);
      }

      throw new SecurityError('Plugin failed security validation', pluginId);
    }

    // Configure sandbox with security policy
    const sandboxConfig: SandboxConfig = {
      timeout: policy.executionLimits.timeout,
      memoryLimit: policy.resourceLimits.memory,
      allowedModules: policy.allowedModules,
      blockedApis: policy.blockedModules,
      enableFileSystem: false,
      enableNetwork: false,
      enableChildProcess: false,
      restrictedPaths: policy.blockedPaths,
      maxExecutionTime: policy.executionLimits.timeout * 6,
      enableDebugging: false
    };

    this.sandbox.updateConfig(sandboxConfig);

    try {
      // Execute in sandbox with monitoring
      const result = await this.sandbox.executeInWorkerSandbox(pluginId, code, context);

      if (!result.success) {
        await this.createSecurityEvent({
          type: 'access_violation',
          pluginId,
          severity: 'high',
          message: `Sandbox execution failed: ${result.error}`,
          metadata: { result },
          action: 'block'
        });

        throw new SecurityError(`Plugin execution blocked: ${result.error}`, pluginId);
      }

      return result.result;
    } catch (error) {
      await this.createSecurityEvent({
        type: 'access_violation',
        pluginId,
        severity: 'critical',
        message: `Plugin execution error: ${(error as Error).message}`,
        metadata: { error: error instanceof Error ? error.stack : error },
        action: 'block'
      });

      throw error;
    }
  }

  async scanPluginSecurity(pluginId: string, code: string): Promise<SecurityScan> {
    // Check if scan is already running
    if (this.activeScans.has(pluginId)) {
      return this.activeScans.get(pluginId)!;
    }

    const scanPromise = this.performSecurityScan(pluginId, code);
    this.activeScans.set(pluginId, scanPromise);

    try {
      const result = await scanPromise;
      return result;
    } finally {
      this.activeScans.delete(pluginId);
    }
  }

  private async performSecurityScan(pluginId: string, code: string): Promise<SecurityScan> {
    const scanId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Validate plugin code
      const codeValidation = await this.validator.validateSecurity(code);

      // Check for malicious patterns
      const patternScan = await this.scanForMaliciousPatterns(code);

      // Combine all vulnerabilities
      const allVulnerabilities = [
        ...codeValidation.vulnerabilities,
        ...patternScan.vulnerabilities
      ];

      // Calculate security score
      const score = this.calculateSecurityScore(allVulnerabilities);

      // Generate recommendations
      const recommendations = this.generateSecurityRecommendations(allVulnerabilities, score);

      // Create security scan result
      const scan: SecurityScan = {
        id: scanId,
        pluginId,
        scanDate: new Date(),
        status: 'completed',
        score,
        vulnerabilities: allVulnerabilities,
        dependencies: [
          {
            name: 'example-dependency',
            version: '1.0.0',
            vulnerabilities: []
          }
        ],
        recommendations
      };

      // Store scan results
      this.storeSecurityScan(pluginId, scan);

      // Emit security scan completed event
      this.emit('securityScanCompleted', { pluginId, scan });

      return scan;
    } catch (error) {
      const failedScan: SecurityScan = {
        id: scanId,
        pluginId,
        scanDate: new Date(),
        status: 'failed',
        vulnerabilities: [{
          severity: 'high',
          description: `Security scan failed: ${(error as Error).message}`,
          remediation: 'Retry security scan or contact security team'
        }],
        recommendations: ['Retry security scan']
      };

      this.emit('securityScanFailed', { pluginId, error });

      return failedScan;
    }
  }

  private async scanForMaliciousPatterns(code: string): Promise<{
    vulnerabilities: SecurityScan['vulnerabilities'];
  }> {
    const vulnerabilities: SecurityScan['vulnerabilities'] = [];

    const maliciousPatterns = [
      {
        pattern: /require\s*\(\s*['"]child_process['"]\s*\)/gi,
        severity: 'critical' as const,
        description: 'Child process module detected - potential code execution risk',
        remediation: 'Remove child_process usage or implement proper sandboxing'
      },
      {
        pattern: /require\s*\(\s*['"]fs['"]\s*\)/gi,
        severity: 'high' as const,
        description: 'File system module detected - potential data access risk',
        remediation: 'Use secure file system alternatives or request proper permissions'
      },
      {
        pattern: /eval\s*\(/gi,
        severity: 'critical' as const,
        description: 'eval() function detected - potential code injection risk',
        remediation: 'Replace eval() with safer alternatives like JSON.parse() or Function constructor with restricted scope'
      },
      {
        pattern: /new\s+Function\s*\(/gi,
        severity: 'high' as const,
        description: 'Dynamic function creation detected - potential code injection risk',
        remediation: 'Use static functions or proper validation for dynamic code'
      },
      {
        pattern: /require\s*\(\s*['"]net['"]\s*\)/gi,
        severity: 'high' as const,
        description: 'Network module detected - potential data exfiltration risk',
        remediation: 'Use secure network alternatives or implement proper validation'
      },
      {
        pattern: /require\s*\(\s*['"]http['"]\s*\)/gi,
        severity: 'medium' as const,
        description: 'HTTP module detected - potential data leakage risk',
        remediation: 'Use HTTPS or implement proper security headers'
      },
      {
        pattern: /require\s*\(\s*['"]https['"]\s*\)/gi,
        severity: 'low' as const,
        description: 'HTTPS module detected - ensure proper certificate validation',
        remediation: 'Implement proper certificate validation and error handling'
      },
      {
        pattern: /process\.env/gi,
        severity: 'medium' as const,
        description: 'Environment variable access detected - potential information disclosure',
        remediation: 'Validate and sanitize all environment variable usage'
      },
      {
        pattern: /global\./gi,
        severity: 'medium' as const,
        description: 'Global object access detected - potential scope pollution',
        remediation: 'Avoid global object access or use proper isolation'
      },
      {
        pattern: /globalThis\./gi,
        severity: 'medium' as const,
        description: 'GlobalThis access detected - potential scope pollution',
        remediation: 'Avoid globalThis access or use proper isolation'
      }
    ];

    const lines = code.split('\n');
    for (const { pattern, severity, description, remediation } of maliciousPatterns) {
      let match;
      const regex = new RegExp(pattern);

      while ((match = regex.exec(code)) !== null) {
        const lineIndex = code.substring(0, match.index).split('\n').length - 1;
        vulnerabilities.push({
          severity,
          description,
          file: 'plugin-code',
          line: lineIndex + 1,
          remediation
        });
      }
    }

    return { vulnerabilities };
  }

  private calculateSecurityScore(vulnerabilities: SecurityScan['vulnerabilities']): number {
    if (vulnerabilities.length === 0) {
      return 100;
    }

    const severityWeights = {
      critical: 50,
      high: 30,
      medium: 15,
      low: 5
    };

    let totalDeduction = 0;
    vulnerabilities.forEach(vuln => {
      totalDeduction += severityWeights[vuln.severity];
    });

    return Math.max(0, 100 - totalDeduction);
  }

  private generateSecurityRecommendations(
    vulnerabilities: SecurityScan['vulnerabilities'],
    score: number
  ): string[] {
    const recommendations: string[] = [];

    if (score < 30) {
      recommendations.push('Critical security issues detected. Plugin should not be used.');
      recommendations.push('Immediate security audit required.');
    } else if (score < 60) {
      recommendations.push('Significant security issues detected. Use with caution.');
      recommendations.push('Security audit recommended before deployment.');
    } else if (score < 80) {
      recommendations.push('Minor security issues detected. Consider improvements.');
    }

    // Specific recommendations based on vulnerability types
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;

    if (criticalCount > 0) {
      recommendations.push('Address all critical vulnerabilities immediately.');
    }

    if (highCount > 2) {
      recommendations.push('Multiple high-severity issues require attention.');
    }

    if (vulnerabilities.some(v => v.description.includes('eval'))) {
      recommendations.push('Replace eval() usage with safer alternatives.');
    }

    if (vulnerabilities.some(v => v.description.includes('child_process'))) {
      recommendations.push('Implement proper sandboxing for child process usage.');
    }

    if (vulnerabilities.some(v => v.description.includes('fs'))) {
      recommendations.push('Restrict file system access to necessary directories only.');
    }

    recommendations.push('Regular security audits are recommended.');
    recommendations.push('Consider implementing automated security testing.');

    return recommendations;
  }

  private async createSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    // Store event
    const pluginEvents = this.securityEvents.get(event.pluginId) || [];
    pluginEvents.push(securityEvent);
    this.securityEvents.set(event.pluginId, pluginEvents);

    // Emit event
    this.emit('securityEvent', securityEvent);

    // Check if quarantine is needed
    const recentEvents = pluginEvents.filter(e =>
      e.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );

    const criticalEvents = recentEvents.filter(e => e.severity === 'critical').length;
    const highEvents = recentEvents.filter(e => e.severity === 'high').length;

    const policy = this.policies.get(event.pluginId) || this.policies.get('default')!;

    if (criticalEvents >= 1 || highEvents >= policy.alertThreshold) {
      await this.quarantinePlugin(event.pluginId);
    }
  }

  async quarantinePlugin(pluginId: string): Promise<void> {
    this.quarantinedPlugins.add(pluginId);

    await this.createSecurityEvent({
      type: 'access_violation',
      pluginId,
      severity: 'critical',
      message: 'Plugin has been quarantined due to security violations',
      metadata: { quarantineReason: 'security_violations' },
      action: 'quarantine'
    });

    this.emit('pluginQuarantined', { pluginId, reason: 'security_violations' });
  }

  async unquarantinePlugin(pluginId: string): Promise<void> {
    this.quarantinedPlugins.delete(pluginId);

    await this.createSecurityEvent({
      type: 'access_violation',
      pluginId,
      severity: 'medium',
      message: 'Plugin has been released from quarantine',
      metadata: { unquarantineReason: 'manual_release' },
      action: 'warn'
    });

    this.emit('pluginUnquarantined', { pluginId, reason: 'manual_release' });
  }

  isPluginQuarantined(pluginId: string): boolean {
    return this.quarantinedPlugins.has(pluginId);
  }

  getQuarantinedPlugins(): string[] {
    return Array.from(this.quarantinedPlugins);
  }

  setPluginPolicy(pluginId: string, policy: Partial<SecurityPolicy>): void {
    const existingPolicy = this.policies.get(pluginId) || this.policies.get('default')!;
    this.policies.set(pluginId, { ...existingPolicy, ...policy });
  }

  getPluginPolicy(pluginId: string): SecurityPolicy {
    return this.policies.get(pluginId) || this.policies.get('default')!;
  }

  getSecurityEvents(pluginId?: string): SecurityEvent[] {
    if (pluginId) {
      return this.securityEvents.get(pluginId) || [];
    }

    const allEvents: SecurityEvent[] = [];
    for (const events of this.securityEvents.values()) {
      allEvents.push(...events);
    }

    return allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private storeSecurityScan(pluginId: string, scan: SecurityScan): void {
    // Store scan results (in a real implementation, this would be persisted to database)
    console.log(`Security scan stored for plugin ${pluginId}: score ${scan.score}`);
  }

  getSecurityStats(): {
    totalPlugins: number;
    quarantinedPlugins: number;
    activeScans: number;
    securityEvents: {
      total: number;
      last24h: number;
      bySeverity: Record<string, number>;
    };
    averageSecurityScore: number;
  } {
    const allEvents = this.getSecurityEvents();
    const last24hEvents = allEvents.filter(e =>
      e.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const eventsBySeverity: Record<string, number> = {};
    ['low', 'medium', 'high', 'critical'].forEach(severity => {
      eventsBySeverity[severity] = allEvents.filter(e => e.severity === severity).length;
    });

    return {
      totalPlugins: this.policies.size - 1, // Subtract default policy
      quarantinedPlugins: this.quarantinedPlugins.size,
      activeScans: this.activeScans.size,
      securityEvents: {
        total: allEvents.length,
        last24h: last24hEvents.length,
        bySeverity: eventsBySeverity
      },
      averageSecurityScore: 85 // Mock value
    };
  }
}