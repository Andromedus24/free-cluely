#!/usr/bin/env node

const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD) {
    console.warn('⚠️  Skipping notarization: APPLE_ID and APPLE_ID_PASSWORD environment variables are required');
    return;
  }

  console.log('🔐 Starting macOS notarization...');

  const appName = context.packager.appInfo.productFilename;

  try {
    await notarize({
      appBundleId: 'com.atlas.assistant',
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.TEAM_ID
    });

    console.log('✅ Notarization completed successfully!');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
};