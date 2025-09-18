import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createHash } from 'crypto';
import { PluginManifest, PluginManifestSchema } from './PluginSDK';
import { execSync } from 'child_process';
import * as tar from 'tar';
import * as zlib from 'zlib';

export interface PackageConfig {
  outputPath?: string;
  minify?: boolean;
  includeSourceMaps?: boolean;
  includeTests?: boolean;
  includeDevDependencies?: boolean;
  ignorePatterns?: string[];
  signature?: boolean;
  compress?: boolean;
}

export interface PackageManifest {
  manifest: PluginManifest;
  files: PackageFile[];
  checksums: Record<string, string>;
  signature?: string;
  packageVersion: string;
  createdAt: string;
  compressed?: boolean;
}

export interface PackageFile {
  path: string;
  size: number;
  hash: string;
  executable?: boolean;
  encoding?: 'utf8' | 'base64';
}

export interface PackageResult {
  packagePath: string;
  manifest: PackageManifest;
  size: number;
  files: number;
  warnings: string[];
}

export class PluginPackager {
  private pluginDir: string;
  private manifest: PluginManifest;

  constructor(pluginDir: string) {
    this.pluginDir = pluginDir;
  }

  async package(config: PackageConfig = {}): Promise<string> {
    // Load and validate manifest
    await this.loadManifest();

    // Validate plugin structure
    await this.validatePluginStructure();

    // Build the plugin if needed
    await this.buildPlugin();

    // Create package
    const packageResult = await this.createPackage(config);

    return packageResult.packagePath;
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

  private async validatePluginStructure(): Promise<void> {
    const requiredFiles = [
      'package.json',
      this.manifest.main || 'dist/index.js',
      'atlas.json'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.pluginDir, file);
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`Required file not found: ${file}`);
      }
    }

    // Check main entry point
    const mainPath = path.join(this.pluginDir, this.manifest.main || 'dist/index.js');
    try {
      await fs.access(mainPath);
    } catch {
      throw new Error(`Main entry point not found: ${this.manifest.main || 'dist/index.js'}`);
    }
  }

  private async buildPlugin(): Promise<void> {
    const packageJsonPath = path.join(this.pluginDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    // Check if build script exists
    if (packageJson.scripts?.build) {
      console.log('🔨 Building plugin...');
      try {
        execSync('npm run build', { cwd: this.pluginDir, stdio: 'pipe' });
      } catch (error) {
        throw new Error(`Build failed: ${error}`);
      }
    }

    // Check if dist directory exists
    const distPath = path.join(this.pluginDir, 'dist');
    try {
      await fs.access(distPath);
    } catch {
      throw new Error('Build output directory (dist) not found');
    }
  }

  private async createPackage(config: PackageConfig): Promise<PackageResult> {
    const outputDir = config.outputDir || this.pluginDir;
    const packageName = `${this.manifest.id}-${this.manifest.version}.atlas`;
    const packagePath = path.join(outputDir, packageName);

    console.log('📦 Creating package...');

    // Collect files to include
    const files = await this.collectFiles(config);

    // Create package manifest
    const packageManifest: PackageManifest = {
      manifest: this.manifest,
      files,
      checksums: this.generateChecksums(files),
      packageVersion: '1.0.0',
      createdAt: new Date().toISOString()
    };

    // Create package directory
    await fs.mkdir(packagePath, { recursive: true });

    // Copy files
    await this.copyFiles(files, packagePath);

    // Write package manifest
    await fs.writeFile(
      path.join(packagePath, 'package.json'),
      JSON.stringify(packageManifest, null, 2)
    );

    // Create package archive
    const archivePath = await this.createArchive(packagePath, config);

    // Clean up temporary directory
    await fs.rm(packagePath, { recursive: true });

    return {
      packagePath: archivePath,
      manifest: packageManifest,
      size: (await fs.stat(archivePath)).size,
      files: files.length,
      warnings: []
    };
  }

  private async collectFiles(config: PackageConfig): Promise<PackageFile[]> {
    const files: PackageFile[] = [];
    const ignorePatterns = [
      'node_modules',
      '.git',
      '.vscode',
      '.idea',
      'dist',
      'coverage',
      '*.log',
      '.DS_Store',
      'Thumbs.db',
      ...(config.ignorePatterns || [])
    ];

    // Always include required files
    const requiredFiles = [
      'atlas.json',
      'package.json',
      this.manifest.main || 'dist/index.js',
      'README.md',
      'LICENSE'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.pluginDir, file);
      try {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          files.push({
            path: file,
            size: stats.size,
            hash: await this.hashFile(filePath)
          });
        }
      } catch {
        // File doesn't exist, skip
      }
    }

    // Include dist directory
    const distPath = path.join(this.pluginDir, 'dist');
    try {
      await fs.access(distPath);
      const distFiles = await this.collectFilesFromDir(distPath, 'dist', ignorePatterns);
      files.push(...distFiles);
    } catch {
      // Dist directory doesn't exist
    }

    // Include source maps if requested
    if (config.includeSourceMaps) {
      const sourceMapFiles = await this.findFiles('*.js.map', ignorePatterns);
      for (const file of sourceMapFiles) {
        const stats = await fs.stat(file);
        files.push({
          path: path.relative(this.pluginDir, file),
          size: stats.size,
          hash: await this.hashFile(file)
        });
      }
    }

    // Include tests if requested
    if (config.includeTests) {
      const testFiles = await this.findFiles('{test,tests,src/**/*.{test,spec}.*', ignorePatterns);
      for (const file of testFiles) {
        const stats = await fs.stat(file);
        files.push({
          path: path.relative(this.pluginDir, file),
          size: stats.size,
          hash: await this.hashFile(file)
        });
      }
    }

    // Include additional assets
    const assetFiles = await this.findFiles('{icons,assets,static}/**/*', ignorePatterns);
    for (const file of assetFiles) {
      const stats = await fs.stat(file);
      files.push({
        path: path.relative(this.pluginDir, file),
        size: stats.size,
        hash: await this.hashFile(file)
      });
    }

    return files;
  }

  private async collectFilesFromDir(
    dirPath: string,
    basePath: string,
    ignorePatterns: string[]
  ): Promise<PackageFile[]> {
    const files: PackageFile[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.join(basePath, entry.name);

      // Skip ignored files
      if (ignorePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(relativePath);
      })) {
        continue;
      }

      if (entry.isDirectory()) {
        const subFiles = await this.collectFilesFromDir(fullPath, relativePath, ignorePatterns);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        files.push({
          path: relativePath,
          size: entry.size,
          hash: await this.hashFile(fullPath)
        });
      }
    }

    return files;
  }

  private async findFiles(pattern: string, ignorePatterns: string[]): Promise<string[]> {
    // This is a simplified implementation
    // In a real implementation, you would use glob or similar
    return [];
  }

  private async hashFile(filePath: string): Promise<string> {
    const hash = createHash('sha256');
    const content = await fs.readFile(filePath);
    hash.update(content);
    return hash.digest('hex');
  }

  private generateChecksums(files: PackageFile[]): Record<string, string> {
    const checksums: Record<string, string> = {};
    files.forEach(file => {
      checksums[file.path] = file.hash;
    });
    return checksums;
  }

  private async copyFiles(files: PackageFile[], packagePath: string): Promise<void> {
    for (const file of files) {
      const sourcePath = path.join(this.pluginDir, file.path);
      const destPath = path.join(packagePath, file.path);

      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(destPath), { recursive: true });

      // Copy file
      await fs.copyFile(sourcePath, destPath);

      // Set executable flag if needed
      if (file.executable) {
        // This would be implemented based on the platform
      }
    }
  }

  private async createArchive(packagePath: string, config: PackageConfig): Promise<string> {
    const packageName = `${this.manifest.id}-${this.manifest.version}.atlas`;
    const archivePath = path.join(path.dirname(packagePath), `${packageName}.tar.gz`);

    console.log('📦 Creating archive...');

    // Create tar.gz archive
    await tar.create(
      {
        gzip: config.compress !== false,
        file: archivePath,
        cwd: path.dirname(packagePath)
      },
      [path.basename(packagePath)]
    );

    return archivePath;
  }

  // Utility methods
  async verifyPackage(packagePath: string): Promise<boolean> {
    try {
      // Extract package
      const extractPath = packagePath + '.extracted';
      await fs.mkdir(extractPath, { recursive: true });

      await tar.extract({
        file: packagePath,
        cwd: extractPath
      });

      // Load package manifest
      const manifestPath = path.join(extractPath, this.manifest.id + '-' + this.manifest.version, 'package.json');
      const packageManifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

      // Verify checksums
      for (const [filePath, expectedHash] of Object.entries(packageManifest.checksums)) {
        const actualPath = path.join(extractPath, this.manifest.id + '-' + this.manifest.version, filePath);
        const actualHash = await this.hashFile(actualPath);

        if (actualHash !== expectedHash) {
          console.error(`Checksum mismatch for ${filePath}`);
          await fs.rm(extractPath, { recursive: true });
          return false;
        }
      }

      // Clean up
      await fs.rm(extractPath, { recursive: true });

      return true;
    } catch (error) {
      console.error('Package verification failed:', error);
      return false;
    }
  }

  async extractPackage(packagePath: string, outputDir?: string): Promise<string> {
    const extractDir = outputDir || packagePath + '.extracted';
    await fs.mkdir(extractDir, { recursive: true });

    await tar.extract({
      file: packagePath,
      cwd: extractDir
    });

    return path.join(extractDir, this.manifest.id + '-' + this.manifest.version);
  }

  async getInfo(packagePath: string): Promise<PackageManifest> {
    // Extract package to temp directory
    const tempDir = packagePath + '.temp';
    await fs.mkdir(tempDir, { recursive: true });

    await tar.extract({
      file: packagePath,
      cwd: tempDir
    });

    // Load package manifest
    const manifestPath = path.join(tempDir, this.manifest.id + '-' + this.manifest.version, 'package.json');
    const packageManifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

    // Clean up
    await fs.rm(tempDir, { recursive: true });

    return packageManifest;
  }

  async createSignature(packagePath: string, privateKey: string): Promise<string> {
    const packageContent = await fs.readFile(packagePath);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(packageContent);
    return sign.sign(privateKey, 'base64');
  }

  async verifySignature(packagePath: string, signature: string, publicKey: string): Promise<boolean> {
    try {
      const packageContent = await fs.readFile(packagePath);
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(packageContent);
      return verify.verify(publicKey, signature, 'base64');
    } catch {
      return false;
    }
  }
}