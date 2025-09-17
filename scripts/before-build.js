#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting pre-build process...');

// Ensure required directories exist
const requiredDirs = [
  'dist',
  'release',
  'apps/dashboard/out',
  'apps/electron-host/dist',
  'packages/*/dist',
  'plugins/*/dist'
];

requiredDirs.forEach(dir => {
  const fullPath = path.resolve(dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`📁 Creating directory: ${fullPath}`);
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Copy plugin manifests to dist
const pluginsDir = path.resolve('plugins');
if (fs.existsSync(pluginsDir)) {
  const plugins = fs.readdirSync(pluginsDir);
  
  plugins.forEach(plugin => {
    const pluginPath = path.join(pluginsDir, plugin);
    const manifestPath = path.join(pluginPath, 'package.json');
    
    if (fs.existsSync(manifestPath)) {
      const distDir = path.join(pluginPath, 'dist');
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      
      // Copy manifest to dist
      fs.copyFileSync(manifestPath, path.join(distDir, 'package.json'));
      console.log(`📦 Copied manifest for plugin: ${plugin}`);
    }
  });
}

// Check if dashboard is built
const dashboardOutDir = path.resolve('apps/dashboard/out');
if (!fs.existsSync(dashboardOutDir) || fs.readdirSync(dashboardOutDir).length === 0) {
  console.log('⚠️  Dashboard not built. Running build...');
  require('child_process').spawnSync('npm', ['run', 'build:dashboard'], {
    stdio: 'inherit',
    shell: true
  });
}

// Check if electron host is built
const electronDistDir = path.resolve('apps/electron-host/dist');
if (!fs.existsSync(electronDistDir) || fs.readdirSync(electronDistDir).length === 0) {
  console.log('⚠️  Electron host not built. Running build...');
  require('child_process').spawnSync('npm', ['run', 'build:electron'], {
    stdio: 'inherit',
    shell: true
  });
}

// Create version info
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const versionInfo = {
  version: packageJson.version,
  buildDate: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch
};

fs.writeFileSync(
  path.resolve('version.json'),
  JSON.stringify(versionInfo, null, 2)
);

console.log('✅ Pre-build completed successfully!');