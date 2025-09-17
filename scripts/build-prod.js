#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🏗️  Starting production build process...');

// Parse command line arguments
const args = process.argv.slice(2);
const staticExport = args.includes('--static');
const skipDashboard = args.includes('--skip-dashboard');
const packageOnly = args.includes('--package-only');

// Set environment for production
process.env.NODE_ENV = 'production';
process.env.STATIC_EXPORT = staticExport ? 'true' : 'false';

console.log('📋 Build configuration:');
console.log(`   Static Export: ${staticExport}`);
console.log(`   Skip Dashboard: ${skipDashboard}`);
console.log(`   Package Only: ${packageOnly}`);

try {
  // Clean previous builds
  if (!packageOnly) {
    console.log('🧹 Cleaning previous builds...');
    execSync('pnpm run clean:all', { stdio: 'inherit' });
  }

  // Build packages first
  console.log('🔨 Building packages...');
  execSync('pnpm run build:packages', { stdio: 'inherit' });

  // Build plugins
  console.log('🔌 Building plugins...');
  execSync('pnpm run build:plugins', { stdio: 'inherit' });

  // Build dashboard (unless skipped)
  if (!skipDashboard && !packageOnly) {
    console.log('📊 Building dashboard...');
    if (staticExport) {
      // Static export
      process.env.STATIC_EXPORT = 'true';
      execSync('cd apps/dashboard && npm run static-build', { stdio: 'inherit' });
    } else {
      // Regular build
      process.env.STATIC_EXPORT = 'false';
      execSync('cd apps/dashboard && npm run build', { stdio: 'inherit' });
    }
  }

  // Build electron host
  if (!packageOnly) {
    console.log('🖥️  Building Electron host...');
    execSync('cd apps/electron-host && npm run build', { stdio: 'inherit' });
  }

  // Copy necessary files
  console.log('📋 Copying distribution files...');
  
  // Copy plugin manifests
  const pluginsDir = path.resolve('plugins');
  if (fs.existsSync(pluginsDir)) {
    const plugins = fs.readdirSync(pluginsDir);
    
    plugins.forEach(plugin => {
      const pluginPath = path.join(pluginsDir, plugin);
      const manifestPath = path.join(pluginPath, 'package.json');
      
      if (fs.existsSync(manifestPath)) {
        const distDir = path.join(pluginPath, 'dist');
        if (fs.existsSync(distDir)) {
          fs.copyFileSync(manifestPath, path.join(distDir, 'package.json'));
          console.log(`   📦 Copied manifest for plugin: ${plugin}`);
        }
      }
    });
  }

  // Create build info
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const buildInfo = {
    version: packageJson.version,
    buildDate: new Date().toISOString(),
    buildType: staticExport ? 'static' : 'dynamic',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    components: {
      dashboard: !skipDashboard,
      electronHost: !packageOnly,
      packages: true,
      plugins: true
    }
  };

  fs.writeFileSync(
    path.resolve('build-info.json'),
    JSON.stringify(buildInfo, null, 2)
  );

  // Package the application
  if (!packageOnly) {
    console.log('📦 Packaging application...');
    
    if (staticExport) {
      console.log('   🌐 Static export mode - packaging with embedded dashboard');
    } else {
      console.log('   🔗 Dynamic mode - packaging with dashboard server');
    }
    
    execSync('pnpm run package', { stdio: 'inherit' });
  }

  console.log('\n✅ Build completed successfully!');
  
  if (!packageOnly) {
    console.log('📁 Release files available in:');
    console.log('   ./release/');
    
    // List generated files
    const releaseDir = path.resolve('release');
    if (fs.existsSync(releaseDir)) {
      const files = fs.readdirSync(releaseDir);
      files.forEach(file => {
        const filePath = path.join(releaseDir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          const innerFiles = fs.readdirSync(filePath);
          const executable = innerFiles.find(f => 
            f.endsWith('.exe') || f.endsWith('.app') || f.endsWith('.AppImage')
          );
          if (executable) {
            console.log(`   📦 ${file}/${executable}`);
          }
        } else {
          console.log(`   📄 ${file}`);
        }
      });
    }
  }

  console.log('\n🚀 Ready for distribution!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}