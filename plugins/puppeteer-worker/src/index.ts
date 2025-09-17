import { PuppeteerWorkerPlugin } from './PuppeteerWorkerPlugin';

// Plugin manifest
const manifest = {
  name: 'puppeteer-worker',
  version: '1.0.0',
  description: 'Browser automation plugin for web scraping and testing',
  author: 'Free-Cluely Team',
  main: 'dist/index.js',
  permissions: ['automation', 'network'],
  config: {
    headless: true,
    timeout: 30000,
    allowlist: []
  }
};

// Export the plugin class
export { PuppeteerWorkerPlugin };

// Export manifest
export { manifest };

// Default export for easy importing
export default PuppeteerWorkerPlugin;