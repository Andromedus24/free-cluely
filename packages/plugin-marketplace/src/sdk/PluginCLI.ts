#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TemplateGenerator, TemplateConfigType } from './TemplateGenerator';
import { PluginManifest, PluginManifestSchema } from './PluginSDK';
import { PluginPackager } from './PluginPackager';
import { PluginTester } from './PluginTester';
import { PluginDocGenerator } from './PluginDocGenerator';

const program = new Command();

program
  .name('atlas-plugin')
  .description('Atlas Plugin Development CLI')
  .version('1.0.0');

// Create command
program
  .command('create')
  .description('Create a new plugin from a template')
  .requiredOption('-n, --name <name>', 'Plugin name')
  .requiredOption('-d, --description <description>', 'Plugin description')
  .requiredOption('-c, --category <category>', 'Plugin category')
  .option('-a, --author <name>', 'Author name')
  .option('-e, --email <email>', 'Author email')
  .option('-w, --website <website>', 'Author website')
  .option('-t, --template <template>', 'Template to use', 'basic')
  .option('-p, --permissions <permissions>', 'Required permissions (comma-separated)')
  .option('-o, --output <dir>', 'Output directory')
  .option('--force', 'Overwrite existing directory')
  .action(async (options) => {
    try {
      const config: TemplateConfigType = {
        name: options.name,
        description: options.description,
        category: options.category,
        author: {
          name: options.author || 'Anonymous',
          email: options.email,
          website: options.website
        },
        template: options.template,
        permissions: options.permissions ? options.permissions.split(',').map((p: string) => p.trim()) : [],
        outputDir: options.output,
        force: options.force
      };

      const generator = new TemplateGenerator();
      await generator.generate(config);

      console.log('✅ Plugin created successfully!');
      console.log('📦 Next steps:');
      console.log('   1. cd ' + (options.output || options.name.toLowerCase().replace(/\s+/g, '-')));
      console.log('   2. npm install');
      console.log('   3. npm run dev');
    } catch (error) {
      console.error('❌ Error creating plugin:', error);
      process.exit(1);
    }
  });

// Build command
program
  .command('build')
  .description('Build the plugin')
  .option('-w, --watch', 'Watch mode')
  .option('-m, --minify', 'Minify output')
  .action(async (options) => {
    try {
      const pluginDir = process.cwd();
      const packageJsonPath = path.join(pluginDir, 'package.json');

      // Check if package.json exists
      try {
        await fs.access(packageJsonPath);
      } catch {
        throw new Error('package.json not found. Please run this command in a plugin directory.');
      }

      // Read package.json
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      if (options.watch) {
        console.log('🔍 Starting build in watch mode...');
        // This would implement watch mode with file system watchers
        console.log('⚠️  Watch mode not implemented yet. Use npm run dev instead.');
      } else {
        console.log('🔨 Building plugin...');
        // This would run the build process
        console.log('⚠️  Build process not implemented yet. Use npm run build instead.');
      }
    } catch (error) {
      console.error('❌ Error building plugin:', error);
      process.exit(1);
    }
  });

// Test command
program
  .command('test')
  .description('Run plugin tests')
  .option('-w, --watch', 'Watch mode')
  .option('--coverage', 'Generate coverage report')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const pluginDir = process.cwd();
      const tester = new PluginTester(pluginDir);

      if (options.watch) {
        console.log('🔍 Starting tests in watch mode...');
        await tester.watch();
      } else {
        console.log('🧪 Running plugin tests...');
        const results = await tester.run({
          coverage: options.coverage,
          verbose: options.verbose
        });

        if (results.success) {
          console.log('✅ All tests passed!');
        } else {
          console.log('❌ Some tests failed!');
          process.exit(1);
        }
      }
    } catch (error) {
      console.error('❌ Error running tests:', error);
      process.exit(1);
    }
  });

// Package command
program
  .command('package')
  .description('Package the plugin for distribution')
  .option('-o, --output <file>', 'Output file path')
  .option('--minify', 'Minify output')
  .option('--include-source', 'Include source maps')
  .action(async (options) => {
    try {
      const pluginDir = process.cwd();
      const packager = new PluginPackager(pluginDir);

      console.log('📦 Packaging plugin...');
      const packagePath = await packager.package({
        outputPath: options.output,
        minify: options.minify,
        includeSourceMaps: options.includeSource
      });

      console.log(`✅ Plugin packaged successfully: ${packagePath}`);
    } catch (error) {
      console.error('❌ Error packaging plugin:', error);
      process.exit(1);
    }
  });

// Install command
program
  .command('install')
  .description('Install a plugin')
  .argument('<path>', 'Path to plugin package')
  .option('--dev', 'Install in development mode')
  .option('--force', 'Force reinstall')
  .action(async (pluginPath, options) => {
    try {
      console.log('🔧 Installing plugin...');
      // This would implement plugin installation
      console.log('⚠️  Plugin installation not implemented yet.');
    } catch (error) {
      console.error('❌ Error installing plugin:', error);
      process.exit(1);
    }
  });

// Uninstall command
program
  .command('uninstall')
  .description('Uninstall a plugin')
  .argument('<plugin-id>', 'Plugin ID')
  .action(async (pluginId) => {
    try {
      console.log(`🔧 Uninstalling plugin ${pluginId}...`);
      // This would implement plugin uninstallation
      console.log('⚠️  Plugin uninstallation not implemented yet.');
    } catch (error) {
      console.error('❌ Error uninstalling plugin:', error);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List installed plugins')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      console.log('📋 Listing installed plugins...');
      // This would list installed plugins
      console.log('⚠️  Plugin listing not implemented yet.');
    } catch (error) {
      console.error('❌ Error listing plugins:', error);
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate plugin manifest and structure')
  .action(async () => {
    try {
      const pluginDir = process.cwd();
      const manifestPath = path.join(pluginDir, 'atlas.json');

      // Read and validate manifest
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      try {
        PluginManifestSchema.parse(manifest);
        console.log('✅ Plugin manifest is valid!');
      } catch (error) {
        console.error('❌ Plugin manifest validation failed:', error);
        process.exit(1);
      }

      // Check required files
      const requiredFiles = ['package.json', manifest.main || 'dist/index.js'];
      for (const file of requiredFiles) {
        try {
          await fs.access(path.join(pluginDir, file));
        } catch {
          console.error(`❌ Required file not found: ${file}`);
          process.exit(1);
        }
      }

      console.log('✅ Plugin structure is valid!');
    } catch (error) {
      console.error('❌ Error validating plugin:', error);
      process.exit(1);
    }
  });

// Docs command
program
  .command('docs')
  .description('Generate plugin documentation')
  .option('-o, --output <dir>', 'Output directory', 'docs')
  .option('--format <format>', 'Output format', 'markdown')
  .action(async (options) => {
    try {
      const pluginDir = process.cwd();
      const docGenerator = new PluginDocGenerator(pluginDir);

      console.log('📚 Generating documentation...');
      await docGenerator.generate({
        outputDir: options.output,
        format: options.format
      });

      console.log(`✅ Documentation generated in ${options.output}/`);
    } catch (error) {
      console.error('❌ Error generating documentation:', error);
      process.exit(1);
    }
  });

// Templates command
program
  .command('templates')
  .description('List available templates')
  .action(async () => {
    try {
      const generator = new TemplateGenerator();
      const templates = generator.getTemplates();

      console.log('📋 Available templates:');
      templates.forEach(template => {
        console.log(`\n🔧 ${template.id}: ${template.name}`);
        console.log(`   ${template.description}`);
      });
    } catch (error) {
      console.error('❌ Error listing templates:', error);
      process.exit(1);
    }
  });

// Info command
program
  .command('info')
  .description('Show plugin information')
  .action(async () => {
    try {
      const pluginDir = process.cwd();
      const manifestPath = path.join(pluginDir, 'atlas.json');
      const packageJsonPath = path.join(pluginDir, 'package.json');

      // Read manifest
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // Read package.json
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      console.log('📊 Plugin Information:');
      console.log(`Name: ${manifest.name}`);
      console.log(`Version: ${manifest.version}`);
      console.log(`Description: ${manifest.description}`);
      console.log(`Author: ${manifest.author.name}`);
      console.log(`Category: ${manifest.category}`);
      console.log(`Main: ${manifest.main}`);
      console.log(`Permissions: ${manifest.permissions.join(', ')}`);
      console.log(`Features: ${manifest.features?.join(', ') || 'None'}`);
    } catch (error) {
      console.error('❌ Error reading plugin info:', error);
      process.exit(1);
    }
  });

// Dev command
program
  .command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Development server port', '3000')
  .option('--host <host>', 'Development server host', 'localhost')
  .action(async (options) => {
    try {
      console.log(`🚀 Starting development server at http://${options.host}:${options.port}`);
      console.log('⚠️  Development server not implemented yet. Use npm run dev instead.');
    } catch (error) {
      console.error('❌ Error starting development server:', error);
      process.exit(1);
    }
  });

// Lint command
program
  .command('lint')
  .description('Lint plugin code')
  .option('--fix', 'Fix issues automatically')
  .action(async (options) => {
    try {
      console.log('🔍 Linting plugin code...');
      // This would run the linter
      console.log('⚠️  Linting not implemented yet. Use npm run lint instead.');
    } catch (error) {
      console.error('❌ Error linting plugin:', error);
      process.exit(1);
    }
  });

// Format command
program
  .command('format')
  .description('Format plugin code')
  .option('--check', 'Check if code is formatted')
  .option('--write', 'Write formatted code to files')
  .action(async (options) => {
    try {
      console.log('🎨 Formatting plugin code...');
      // This would run the code formatter
      console.log('⚠️  Code formatting not implemented yet.');
    } catch (error) {
      console.error('❌ Error formatting plugin:', error);
      process.exit(1);
    }
  });

// Publish command
program
  .command('publish')
  .description('Publish plugin to marketplace')
  .option('--dry-run', 'Simulate publish without uploading')
  .option('--beta', 'Publish as beta version')
  .action(async (options) => {
    try {
      console.log('📤 Publishing plugin to marketplace...');
      if (options.dryRun) {
        console.log('🔍 Dry run mode - no actual upload');
      }
      if (options.beta) {
        console.log('🧪 Publishing as beta version');
      }
      // This would implement plugin publishing
      console.log('⚠️  Plugin publishing not implemented yet.');
    } catch (error) {
      console.error('❌ Error publishing plugin:', error);
      process.exit(1);
    }
  });

// Help command
program
  .command('help')
  .description('Show help information')
  .action(() => {
    console.log(`
🔧 Atlas Plugin Development CLI

Available commands:
  create      Create a new plugin from a template
  build       Build the plugin
  test        Run plugin tests
  package     Package the plugin for distribution
  install     Install a plugin
  uninstall   Uninstall a plugin
  list        List installed plugins
  validate    Validate plugin manifest and structure
  docs        Generate plugin documentation
  templates   List available templates
  info        Show plugin information
  dev         Start development server
  lint        Lint plugin code
  format      Format plugin code
  publish     Publish plugin to marketplace
  help        Show this help information

Examples:
  atlas-plugin create -n "My Plugin" -d "My awesome plugin" -c "utilities"
  atlas-plugin build --watch
  atlas-plugin test --coverage
  atlas-plugin package --output my-plugin.atlas
  atlas-plugin publish --dry-run

For more information, visit: https://docs.atlas.com/plugins
`);
  });

program.parse();