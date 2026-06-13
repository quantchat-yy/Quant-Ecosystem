/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@quant/shared-ui', '@quant/common'],
  output: 'standalone',
  productionBrowserSourceMaps: false,
  webpack(config, { isServer }) {
    const TerserPlugin = config.optimization?.minimizer?.find(
      (p) => p.constructor.name === 'TerserPlugin',
    );
    if (TerserPlugin) {
      TerserPlugin.options.parallel = 1;
    }
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        minSize: 30000,
        maxSize: 500000,
      };
    }
    config.parallelism = 2;
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=()',
          },
        ],
      },
    ];
  },
};
export default nextConfig;
