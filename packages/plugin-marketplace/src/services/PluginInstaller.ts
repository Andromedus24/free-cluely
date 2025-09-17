import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { PluginInstaller, InstallationStatus, InstallationRequest } from '../interfaces/MarketplaceInterfaces';
import { InstallationError } from '../types/MarketplaceTypes';
import { PluginManifest } from '@free-cluely/shared';

export class PluginInstallerImpl implements PluginInstaller {
  private installationDir: string;
  private progressCallbacks: Map<string, (status: InstallationStatus) => void> = new Map();
  private completeCallbacks: Map<string, (pluginId: string) => void> = new Map();
  private errorCallbacks: Map<string, (error: InstallationError) => void> = new Map();

  constructor(installationDir: string) {
    this.installationDir = installationDir;
  }

  async install(request: InstallationRequest): Promise<InstallationStatus> {
    const installationId = crypto.randomUUID();
    const status: InstallationStatus = {
      id: installationId,
      pluginId: request.pluginId,
      status: 'pending',
      progress: 0,
    };

    try {
      // Notify about installation start
      this.notifyProgress(status);

      // Create installation directory if it doesn't exist
      await fs.mkdir(this.installationDir, { recursive: true });

      status.status = 'downloading';
      status.progress = 10;
      this.notifyProgress(status);

      let pluginData: Buffer;
      let manifest: PluginManifest;

      if (request.source === 'marketplace') {
        // Download from marketplace
        pluginData = await this.downloadFromMarketplace(request.pluginId, request.version);
      } else if (request.source === 'url') {
        // Download from URL
        pluginData = await this.downloadFromUrl(request.url!);
      } else if (request.source === 'local') {
        // Load from local file
        pluginData = await fs.readFile(request.localPath!);
      } else {
        throw new InstallationError('Invalid installation source', request.pluginId);
      }

      status.status = 'installing';
      status.progress = 50;
      this.notifyProgress(status);

      // Extract and install plugin
      const pluginPath = await this.extractPlugin(pluginData, request.pluginId);

      // Verify plugin manifest
      manifest = await this.verifyPlugin(pluginPath);

      // Run installation hooks
      await this.runInstallationHooks(pluginPath, manifest);

      status.status = 'verifying';
      status.progress = 90;
      this.notifyProgress(status);

      // Verify installation
      await this.verifyInstallation(pluginPath, manifest);

      status.status = 'completed';
      status.progress = 100;
      status.installedAt = new Date();
      this.notifyProgress(status);

      // Notify completion
      this.notifyComplete(request.pluginId);

      return status;
    } catch (error) {
      status.status = 'failed';
      status.error = (error as Error).message;
      this.notifyProgress(status);

      const installError = new InstallationError(
        `Installation failed: ${(error as Error).message}`,
        request.pluginId,
        error as Error
      );

      this.notifyError(installError);
      throw installError;
    }
  }

  async uninstall(pluginId: string): Promise<void> {
    try {
      const pluginPath = path.join(this.installationDir, pluginId);

      // Check if plugin exists
      try {
        await fs.access(pluginPath);
      } catch {
        // Plugin not installed
        return;
      }

      // Run uninstallation hooks
      const manifestPath = path.join(pluginPath, 'package.json');
      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent) as PluginManifest;
        await this.runUninstallationHooks(pluginPath, manifest);
      } catch {
        // No manifest found, continue with uninstallation
      }

      // Remove plugin directory
      await fs.rm(pluginPath, { recursive: true, force: true });

      // Clean up any related files
      await this.cleanupPluginFiles(pluginId);
    } catch (error) {
      throw new InstallationError(
        `Uninstallation failed: ${(error as Error).message}`,
        pluginId,
        error as Error
      );
    }
  }

  async update(pluginId: string, version?: string): Promise<InstallationStatus> {
    try {
      // First, uninstall current version
      await this.uninstall(pluginId);

      // Then install new version
      return await this.install({
        pluginId,
        version,
        source: 'marketplace'
      });
    } catch (error) {
      throw new InstallationError(
        `Update failed: ${(error as Error).message}`,
        pluginId,
        error as Error
      );
    }
  }

  async verify(pluginId: string): Promise<boolean> {
    try {
      const pluginPath = path.join(this.installationDir, pluginId);
      const manifestPath = path.join(pluginPath, 'package.json');

      // Check if plugin directory exists
      await fs.access(pluginPath);

      // Verify manifest exists and is valid
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // Verify required files exist
      const mainFile = path.join(pluginPath, manifest.main);
      await fs.access(mainFile);

      // Verify dependencies are installed
      const nodeModulesPath = path.join(pluginPath, 'node_modules');
      await fs.access(nodeModulesPath);

      return true;
    } catch {
      return false;
    }
  }

  async getInstalledPlugins(): Promise<Array<{
    id: string;
    name: string;
    version: string;
    installedAt: Date;
    source: 'marketplace' | 'url' | 'local';
  }>> {
    try {
      const entries = await fs.readdir(this.installationDir, { withFileTypes: true });
      const plugins = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const manifestPath = path.join(this.installationDir, entry.name, 'package.json');
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);

            const stats = await fs.stat(path.join(this.installationDir, entry.name));

            plugins.push({
              id: entry.name,
              name: manifest.name,
              version: manifest.version,
              installedAt: stats.birthtime,
              source: 'marketplace' // Default source, could be stored in metadata
            });
          } catch {
            // Skip invalid plugin directories
          }
        }
      }

      return plugins;
    } catch {
      return [];
    }
  }

  async getInstallationStatus(pluginId: string): Promise<InstallationStatus> {
    // Check if plugin is installed
    const isInstalled = await this.verify(pluginId);

    return {
      id: crypto.randomUUID(),
      pluginId,
      status: isInstalled ? 'completed' : 'failed',
      progress: isInstalled ? 100 : 0,
    };
  }

  onInstallationProgress(callback: (status: InstallationStatus) => void): () => void {
    const id = crypto.randomUUID();
    this.progressCallbacks.set(id, callback);
    return () => this.progressCallbacks.delete(id);
  }

  onInstallationComplete(callback: (pluginId: string) => void): () => void {
    const id = crypto.randomUUID();
    this.completeCallbacks.set(id, callback);
    return () => this.completeCallbacks.delete(id);
  }

  onInstallationError(callback: (error: InstallationError) => void): () => void {
    const id = crypto.randomUUID();
    this.errorCallbacks.set(id, callback);
    return () => this.errorCallbacks.delete(id);
  }

  private async downloadFromMarketplace(pluginId: string, version?: string): Promise<Buffer> {
    // This would download the plugin from the marketplace API
    // For now, simulate the download
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Buffer.from('simulated plugin data'));
      }, 1000);
    });
  }

  private async downloadFromUrl(url: string): Promise<Buffer> {
    // This would download the plugin from a URL
    // For now, simulate the download
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Buffer.from('simulated plugin data from url'));
      }, 1000);
    });
  }

  private async extractPlugin(pluginData: Buffer, pluginId: string): Promise<string> {
    const pluginPath = path.join(this.installationDir, pluginId);

    // Create plugin directory
    await fs.mkdir(pluginPath, { recursive: true });

    // In a real implementation, this would extract a ZIP or tar.gz file
    // For now, just save the data as is
    const mainFile = path.join(pluginPath, 'index.js');
    await fs.writeFile(mainFile, pluginData);

    return pluginPath;
  }

  private async verifyPlugin(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginPath, 'package.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Basic validation
    if (!manifest.name || !manifest.version || !manifest.main) {
      throw new Error('Invalid plugin manifest');
    }

    // Verify main file exists
    const mainFile = path.join(pluginPath, manifest.main);
    await fs.access(mainFile);

    return manifest;
  }

  private async runInstallationHooks(pluginPath: string, manifest: PluginManifest): Promise<void> {
    // Run npm install if there are dependencies
    if (manifest.dependencies && Object.keys(manifest.dependencies).length > 0) {
      // In a real implementation, this would run npm install
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Check for install script
    if (manifest.scripts?.install) {
      // In a real implementation, this would run the install script
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  private async runUninstallationHooks(pluginPath: string, manifest: PluginManifest): Promise<void> {
    // Check for uninstall script
    if (manifest.scripts?.uninstall) {
      // In a real implementation, this would run the uninstall script
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  private async verifyInstallation(pluginPath: string, manifest: PluginManifest): Promise<void> {
    // Verify all required files exist
    const mainFile = path.join(pluginPath, manifest.main);
    await fs.access(mainFile);

    // Verify dependencies are installed
    if (manifest.dependencies && Object.keys(manifest.dependencies).length > 0) {
      const nodeModulesPath = path.join(pluginPath, 'node_modules');
      await fs.access(nodeModulesPath);
    }

    // Additional verification steps could be added here
  }

  private async cleanupPluginFiles(pluginId: string): Promise<void> {
    // Clean up any temporary files or caches
    const tempPath = path.join(this.installationDir, 'temp', pluginId);
    try {
      await fs.rm(tempPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }

  private notifyProgress(status: InstallationStatus): void {
    this.progressCallbacks.forEach(callback => callback(status));
  }

  private notifyComplete(pluginId: string): void {
    this.completeCallbacks.forEach(callback => callback(pluginId));
  }

  private notifyError(error: InstallationError): void {
    this.errorCallbacks.forEach(callback => callback(error));
  }
}