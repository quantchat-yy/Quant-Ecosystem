/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@quant/shared-ui', '@quant/common'],
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', 'prisma', 'nats'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        dns: false,
        fs: false,
        http: false,
        https: false,
        stream: false,
        crypto: false,
        zlib: false,
        child_process: false,
        os: false,
        path: false,
        events: false,
        buffer: false,
        url: false,
        util: false,
      };
      config.externals = [...(config.externals || []), 'nats', 'ws', 'ioredis', '@prisma/client'];
    }
    return config;
  },
};
export default nextConfig;
