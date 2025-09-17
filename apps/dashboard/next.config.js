/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.STATIC_EXPORT === 'true' ? 'export' : undefined,
  trailingSlash: process.env.STATIC_EXPORT === 'true' ? true : undefined,
  images: {
    unoptimized: process.env.STATIC_EXPORT === 'true',
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  experimental: {
    serverComponentsExternalPackages: ['@free-cluely/shared'],
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({
      '@free-cluely/shared': '@free-cluely/shared',
    });
    return config;
  },
};

module.exports = nextConfig;