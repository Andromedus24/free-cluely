import { VisionServicePlugin } from './VisionServicePlugin';

// Plugin manifest
const manifest = {
  name: 'vision-service',
  version: '1.0.0',
  description: 'AI-powered image analysis and text extraction',
  author: 'Free-Cluely Team',
  main: 'dist/index.js',
  permissions: ['screen', 'network'],
  config: {
    ocrLanguage: 'eng',
    preprocessing: true,
    confidenceThreshold: 0.7
  }
};

// Export the plugin class
export { VisionServicePlugin };

// Export manifest
export { manifest };

// Default export for easy importing
export default VisionServicePlugin;