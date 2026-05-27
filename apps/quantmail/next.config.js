/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@quant/shared-ui', '@quant/common'],
  output: 'standalone',
};
export default nextConfig;
