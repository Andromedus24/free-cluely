import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { SecurityScanner, SecurityScan } from '../interfaces/MarketplaceInterfaces';
import { SecurityError } from '../types/MarketplaceTypes';

export class SecurityScannerImpl implements SecurityScanner {
  private progressCallbacks: Map<string, (progress: number) => void> = new Map();
  private completeCallbacks: Map<string, (scan: SecurityScan) => void> = new Map();
  private errorCallbacks: Map<string, (error: SecurityError) => void> = new Map();

  async scanPlugin(pluginId: string, pluginData: Buffer | string): Promise<SecurityScan> {
    const scanId = crypto.randomUUID();
    const scan: SecurityScan = {
      id: scanId,
      pluginId,
      scanDate: new Date(),
      status: 'pending',
    };

    try {
      this.notifyProgress(10);

      // Convert to buffer if needed
      const data = typeof pluginData === 'string' ? Buffer.from(pluginData) : pluginData;

      scan.status = 'scanning';
      this.notifyProgress(20);

      // Extract plugin for analysis
      const tempDir = path.join(process.cwd(), 'temp', 'scans', scanId);
      await fs.mkdir(tempDir, { recursive: true });

      this.notifyProgress(30);

      // Analyze package.json and dependencies
      const vulnerabilities = await this.scanDependencies(data);
      scan.vulnerabilities = vulnerabilities;

      this.notifyProgress(60);

      // Scan for malicious patterns
      const maliciousPatterns = await this.scanMaliciousPatterns(data);
      scan.vulnerabilities.push(...maliciousPatterns);

      this.notifyProgress(80);

      // Calculate security score
      const score = this.calculateSecurityScore(scan.vulnerabilities);
      scan.score = score;

      // Generate recommendations
      scan.recommendations = this.generateRecommendations(scan.vulnerabilities);

      scan.status = 'completed';
      this.notifyProgress(100);

      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });

      this.notifyComplete(scan);
      return scan;
    } catch (error) {
      scan.status = 'failed';
      const securityError = new SecurityError(
        `Security scan failed: ${(error as Error).message}`,
        pluginId
      );
      this.notifyError(securityError);
      throw securityError;
    }
  }

  async scanDependencies(dependencies: Record<string, string>): Promise<SecurityScan> {
    const scan: SecurityScan = {
      id: crypto.randomUUID(),
      pluginId: 'dependency-scan',
      scanDate: new Date(),
      status: 'scanning',
      vulnerabilities: [],
    };

    try {
      // Simulate dependency vulnerability scanning
      // In a real implementation, this would use npm audit, snyk, or similar tools
      const depVulnerabilities: SecurityScan['vulnerabilities'] = [];

      for (const [name, version] of Object.entries(dependencies)) {
        // Simulate finding vulnerabilities
        if (name.includes('lodash') && version.startsWith('4.')) {
          depVulnerabilities.push({
            severity: 'medium',
            description: 'Prototype pollution vulnerability in lodash',
            cve: 'CVE-2021-23337',
            file: `package.json`,
            remediation: 'Update to lodash 4.17.21 or later'
          });
        }

        if (name.includes('express') && version.startsWith('4.')) {
          depVulnerabilities.push({
            severity: 'low',
            description: 'Express.js CSRF protection missing',
            file: `package.json`,
            remediation: 'Use csurf middleware or consider alternatives'
          });
        }
      }

      scan.vulnerabilities = depVulnerabilities;
      scan.status = 'completed';
      scan.score = this.calculateSecurityScore(depVulnerabilities);

      return scan;
    } catch (error) {
      scan.status = 'failed';
      throw new SecurityError(
        `Dependency scan failed: ${(error as Error).message}`,
        'dependency-scan'
      );
    }
  }

  async getVulnerabilities(): Promise<Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedPackages: string[];
    fixedIn?: string[];
  }>> {
    // Simulate getting known vulnerabilities
    return [
      {
        id: 'CVE-2021-23337',
        severity: 'medium',
        description: 'Prototype pollution vulnerability in lodash',
        affectedPackages: ['lodash'],
        fixedIn: ['4.17.21']
      },
      {
        id: 'CVE-2022-24999',
        severity: 'high',
        description: 'Node.js open redirect vulnerability',
        affectedPackages: ['express'],
        fixedIn: ['4.18.0']
      },
      {
        id: 'CVE-2023-45803',
        severity: 'critical',
        description: 'Remote code execution in popular package',
        affectedPackages: ['example-package'],
        fixedIn: ['2.0.0']
      }
    ];
  }

  onScanProgress(callback: (progress: number) => void): () => void {
    const id = crypto.randomUUID();
    this.progressCallbacks.set(id, callback);
    return () => this.progressCallbacks.delete(id);
  }

  onScanComplete(callback: (scan: SecurityScan) => void): () => void {
    const id = crypto.randomUUID();
    this.completeCallbacks.set(id, callback);
    return () => this.completeCallbacks.delete(id);
  }

  onScanError(callback: (error: SecurityError) => void): () => void {
    const id = crypto.randomUUID();
    this.errorCallbacks.set(id, callback);
    return () => this.errorCallbacks.delete(id);
  }

  private async scanMaliciousPatterns(data: Buffer): Promise<SecurityScan['vulnerabilities']> {
    const vulnerabilities: SecurityScan['vulnerabilities'] = [];
    const content = data.toString();

    // Check for common malicious patterns
    const patterns = [
      {
        pattern: /eval\s*\(/gi,
        severity: 'high' as const,
        description: 'Use of eval() function detected',
        remediation: 'Avoid using eval() for security reasons'
      },
      {
        pattern: /exec\s*\(/gi,
        severity: 'critical' as const,
        description: 'Use of exec() function detected',
        remediation: 'Avoid using exec() for security reasons'
      },
      {
        pattern: /require\s*\(\s*['"]child_process['"]\s*\)/gi,
        severity: 'high' as const,
        description: 'Child process module detected',
        remediation: 'Ensure child process usage is properly secured'
      },
      {
        pattern: /require\s*\(\s*['"]fs['"]\s*\)/gi,
        severity: 'medium' as const,
        description: 'File system module detected',
        remediation: 'Ensure file system access is properly restricted'
      },
      {
        pattern: /https?:\/\/[^\\s'"<>]+/gi,
        severity: 'low' as const,
        description: 'URL detected in code',
        remediation: 'Ensure all external URLs are validated and secure'
      }
    ];

    const lines = content.split('\n');
    patterns.forEach(({ pattern, severity, description, remediation }) => {
      let match;
      const regex = new RegExp(pattern);

      while ((match = regex.exec(content)) !== null) {
        const lineIndex = content.substring(0, match.index).split('\n').length - 1;
        vulnerabilities.push({
          severity,
          description,
          file: 'plugin-code',
          line: lineIndex + 1,
          remediation
        });
      }
    });

    return vulnerabilities;
  }

  private calculateSecurityScore(vulnerabilities: SecurityScan['vulnerabilities']): number {
    if (vulnerabilities.length === 0) {
      return 100;
    }

    const severityWeights = {
      critical: 40,
      high: 20,
      medium: 10,
      low: 5
    };

    let totalDeduction = 0;
    vulnerabilities.forEach(vuln => {
      totalDeduction += severityWeights[vuln.severity];
    });

    return Math.max(0, 100 - totalDeduction);
  }

  private generateRecommendations(vulnerabilities: SecurityScan['vulnerabilities']): string[] {
    const recommendations: string[] = [];

    if (vulnerabilities.some(v => v.severity === 'critical')) {
      recommendations.push('Critical vulnerabilities found. Immediate action required.');
    }

    if (vulnerabilities.some(v => v.severity === 'high')) {
      recommendations.push('High severity vulnerabilities should be addressed promptly.');
    }

    if (vulnerabilities.some(v => v.description.includes('eval') || v.description.includes('exec'))) {
      recommendations.push('Consider alternative approaches to dynamic code execution.');
    }

    if (vulnerabilities.some(v => v.description.includes('child_process'))) {
      recommendations.push('Ensure proper input validation and sandboxing for child processes.');
    }

    if (vulnerabilities.some(v => v.description.includes('fs'))) {
      recommendations.push('Restrict file system access to only necessary directories.');
    }

    if (vulnerabilities.length > 0) {
      recommendations.push('Regular security audits are recommended for this plugin.');
    }

    return recommendations;
  }

  private notifyProgress(progress: number): void {
    this.progressCallbacks.forEach(callback => callback(progress));
  }

  private notifyComplete(scan: SecurityScan): void {
    this.completeCallbacks.forEach(callback => callback(scan));
  }

  private notifyError(error: SecurityError): void {
    this.errorCallbacks.forEach(callback => callback(error));
  }
}