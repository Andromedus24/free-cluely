import * as fs from 'fs/promises';
import * as path from 'path';
import { PluginValidator, SecurityScan } from '../interfaces/MarketplaceInterfaces';
import { PluginManifest } from '@free-cluely/shared';

export class PluginValidatorImpl implements PluginValidator {
  async validateManifest(manifest: unknown): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic type validation
      if (!manifest || typeof manifest !== 'object') {
        errors.push('Manifest must be an object');
        return { valid: false, errors, warnings };
      }

      const pluginManifest = manifest as Record<string, unknown>;

      // Required fields
      const requiredFields = ['name', 'version', 'description', 'main'];
      for (const field of requiredFields) {
        if (!pluginManifest[field] || typeof pluginManifest[field] !== 'string') {
          errors.push(`Missing or invalid required field: ${field}`);
        }
      }

      // Name validation
      if (pluginManifest.name && typeof pluginManifest.name === 'string') {
        const name = pluginManifest.name;
        if (!/^[a-z0-9][a-z0-9-._]*[a-z0-9]$/.test(name)) {
          errors.push('Plugin name must be lowercase, alphanumeric with optional hyphens, dots, and underscores');
        }
        if (name.length < 2 || name.length > 50) {
          errors.push('Plugin name must be between 2 and 50 characters');
        }
      }

      // Version validation
      if (pluginManifest.version && typeof pluginManifest.version === 'string') {
        const version = pluginManifest.version;
        if (!/^\d+\.\d+\.\d+(-[a-z0-9.-]+)?(\+[a-z0-9.-]+)?$/.test(version)) {
          errors.push('Version must follow semantic versioning (semver)');
        }
      }

      // Description validation
      if (pluginManifest.description && typeof pluginManifest.description === 'string') {
        const description = pluginManifest.description;
        if (description.length < 10 || description.length > 500) {
          warnings.push('Description should be between 10 and 500 characters');
        }
      }

      // Main file validation
      if (pluginManifest.main && typeof pluginManifest.main === 'string') {
        const main = pluginManifest.main;
        if (!main.endsWith('.js') && !main.endsWith('.ts')) {
          warnings.push('Main file should have .js or .ts extension');
        }
        if (main.includes('..') || main.startsWith('/')) {
          errors.push('Main file path must be relative and not contain parent directory references');
        }
      }

      // Dependencies validation
      if (pluginManifest.dependencies && typeof pluginManifest.dependencies === 'object') {
        const dependencies = pluginManifest.dependencies as Record<string, unknown>;
        for (const [name, version] of Object.entries(dependencies)) {
          if (typeof name !== 'string' || typeof version !== 'string') {
            errors.push(`Invalid dependency entry: ${name}`);
          }
          if (!/^[a-z0-9][a-z0-9-._]*[a-z0-9]$/.test(name)) {
            warnings.push(`Dependency name ${name} may not be valid`);
          }
        }
      }

      // Permissions validation
      if (pluginManifest.permissions && Array.isArray(pluginManifest.permissions)) {
        const validPermissions = ['screen', 'clipboard', 'automation', 'network'];
        const permissions = pluginManifest.permissions;
        for (const permission of permissions) {
          if (!validPermissions.includes(permission as string)) {
            errors.push(`Invalid permission: ${permission}`);
          }
        }
      }

      // Config validation
      if (pluginManifest.config && typeof pluginManifest.config === 'object') {
        // Config structure validation could be expanded based on requirements
        warnings.push('Plugin configuration should be properly documented');
      }

    } catch (error) {
      errors.push(`Manifest validation failed: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateSecurity(pluginData: Buffer | string): Promise<{
    valid: boolean;
    score: number;
    vulnerabilities: SecurityScan['vulnerabilities'];
    recommendations: string[];
  }> {
    // Convert to buffer if needed
    const data = typeof pluginData === 'string' ? Buffer.from(pluginData) : pluginData;
    const content = data.toString();

    const vulnerabilities: SecurityScan['vulnerabilities'] = [];
    const recommendations: string[] = [];

    // Security checks
    const securityChecks = [
      {
        pattern: /require\s*\(\s*['"]child_process['"]\s*\)/gi,
        severity: 'high' as const,
        description: 'Child process module detected',
        recommendation: 'Ensure child process usage is properly secured and isolated'
      },
      {
        pattern: /require\s*\(\s*['"]fs['"]\s*\)/gi,
        severity: 'medium' as const,
        description: 'File system module detected',
        recommendation: 'Restrict file system access to plugin-specific directories'
      },
      {
        pattern: /require\s*\(\s*['"]net['"]\s*\)/gi,
        severity: 'medium' as const,
        description: 'Network module detected',
        recommendation: 'Validate all network connections and implement proper security headers'
      },
      {
        pattern: /require\s*\(\s*['"]http['"]\s*\)/gi,
        severity: 'medium' as const,
        description: 'HTTP module detected',
        recommendation: 'Use HTTPS and implement proper request validation'
      },
      {
        pattern: /require\s*\(\s*['"]https['"]\s*\)/gi,
        severity: 'low' as const,
        description: 'HTTPS module detected',
        recommendation: 'Implement proper certificate validation and error handling'
      },
      {
        pattern: /eval\s*\(/gi,
        severity: 'critical' as const,
        description: 'Use of eval() function',
        recommendation: 'Replace eval() with safer alternatives'
      },
      {
        pattern: /Function\s*\(/gi,
        severity: 'high' as const,
        description: 'Dynamic function creation detected',
        recommendation: 'Avoid dynamic function creation for security'
      },
      {
        pattern: /setTimeout\s*\([^,]+,\s*['"]\s*[^'"]*['"]\s*\)/gi,
        severity: 'medium' as const,
        description: 'Dynamic setTimeout detected',
        recommendation: 'Validate all dynamic timeout values'
      },
      {
        pattern: /setInterval\s*\([^,]+,\s*['"]\s*[^'"]*['"]\s*\)/gi,
        severity: 'medium' as const,
        description: 'Dynamic setInterval detected',
        recommendation: 'Validate all dynamic interval values'
      },
      {
        pattern: /document\.write/gi,
        severity: 'high' as const,
        description: 'Document.write usage detected',
        recommendation: 'Avoid document.write for security and performance'
      },
      {
        pattern: /innerHTML/gi,
        severity: 'medium' as const,
        description: 'innerHTML usage detected',
        recommendation: 'Use textContent or proper DOM manipulation instead'
      },
      {
        pattern: /process\.env/gi,
        severity: 'low' as const,
        description: 'Environment variable access detected',
        recommendation: 'Validate and sanitize all environment variable usage'
      }
    ];

    const lines = content.split('\n');
    securityChecks.forEach(({ pattern, severity, description, recommendation }) => {
      let match;
      const regex = new RegExp(pattern);

      while ((match = regex.exec(content)) !== null) {
        const lineIndex = content.substring(0, match.index).split('\n').length - 1;
        vulnerabilities.push({
          severity,
          description,
          file: 'plugin-code',
          line: lineIndex + 1,
          remediation: recommendation
        });
        recommendations.push(recommendation);
      }
    });

    // Calculate security score
    const score = this.calculateSecurityScore(vulnerabilities);

    // Additional recommendations
    if (vulnerabilities.length > 0) {
      recommendations.push('Regular security audits are recommended for this plugin');
      recommendations.push('Consider implementing proper input validation');
      recommendations.push('Use security-focused libraries and frameworks');
    }

    return {
      valid: score >= 70, // Require minimum score of 70
      score,
      vulnerabilities,
      recommendations
    };
  }

  async validateCompatibility(
    plugin: any,
    systemInfo: {
      os: string;
      arch: string;
      version: string;
    }
  ): Promise<{
    compatible: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // OS compatibility
      if (plugin.compatibility && plugin.compatibility.os) {
        const supportedOS = plugin.compatibility.os;
        if (!supportedOS.includes(systemInfo.os)) {
          errors.push(`Plugin is not compatible with ${systemInfo.os} operating system`);
        }
      }

      // Architecture compatibility
      if (plugin.compatibility && plugin.compatibility.arch) {
        const supportedArch = plugin.compatibility.arch;
        if (!supportedArch.includes(systemInfo.arch)) {
          errors.push(`Plugin is not compatible with ${systemInfo.arch} architecture`);
        }
      }

      // Version compatibility
      if (plugin.compatibility) {
        if (plugin.compatibility.minVersion) {
          if (!this.isVersionCompatible(systemInfo.version, plugin.compatibility.minVersion, '>=')) {
            errors.push(`Plugin requires minimum version ${plugin.compatibility.minVersion}, current version is ${systemInfo.version}`);
          }
        }

        if (plugin.compatibility.maxVersion) {
          if (!this.isVersionCompatible(systemInfo.version, plugin.compatibility.maxVersion, '<=')) {
            errors.push(`Plugin requires maximum version ${plugin.compatibility.maxVersion}, current version is ${systemInfo.version}`);
          }
        }
      }

      // Node.js version compatibility (if specified)
      if (plugin.engines && plugin.engines.node) {
        const nodeVersion = process.version;
        const nodeRequirement = plugin.engines.node;

        if (!this.isVersionCompatible(nodeVersion, nodeRequirement)) {
          warnings.push(`Node.js version requirement (${nodeRequirement}) may not be compatible with current version (${nodeVersion})`);
        }
      }

    } catch (error) {
      errors.push(`Compatibility validation failed: ${(error as Error).message}`);
    }

    return {
      compatible: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateDependencies(dependencies: Record<string, string>): Promise<{
    valid: boolean;
    outdated: Array<{ name: string; current: string; latest: string }>;
    insecure: Array<{ name: string; version: string; vulnerability: string }>;
  }> {
    const outdated: Array<{ name: string; current: string; latest: string }> = [];
    const insecure: Array<{ name: string; version: string; vulnerability: string }> = [];

    try {
      // Simulate checking for outdated dependencies
      // In a real implementation, this would query npm registry
      for (const [name, version] of Object.entries(dependencies)) {
        // Simulate finding outdated versions
        if (name === 'lodash' && version.startsWith('4.17.')) {
          outdated.push({
            name,
            current: version,
            latest: '4.17.21'
          });
        }

        if (name === 'express' && version.startsWith('4.17.')) {
          outdated.push({
            name,
            current: version,
            latest: '4.18.2'
          });
        }

        // Simulate finding insecure versions
        if (name === 'lodash' && version === '4.17.15') {
          insecure.push({
            name,
            current: version,
            vulnerability: 'CVE-2021-23337: Prototype pollution vulnerability'
          });
        }

        if (name === 'axios' && version.startsWith('0.21.')) {
          insecure.push({
            name,
            current: version,
            vulnerability: 'CVE-2021-3749: Server-Side Request Forgery vulnerability'
          });
        }
      }

    } catch (error) {
      // Log error but don't fail the entire validation
      console.error('Dependency validation error:', error);
    }

    return {
      valid: insecure.length === 0,
      outdated,
      insecure
    };
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

  private isVersionCompatible(currentVersion: string, requiredVersion: string, operator?: string): boolean {
    try {
      // Simple version comparison (semver-aware implementation would be more robust)
      const cleanCurrent = currentVersion.replace(/^v/, '');
      const cleanRequired = requiredVersion.replace(/^v/, '');

      if (operator === '>=') {
        return cleanCurrent >= cleanRequired;
      } else if (operator === '<=') {
        return cleanCurrent <= cleanRequired;
      } else {
        return cleanCurrent === cleanRequired;
      }
    } catch {
      return false;
    }
  }
}