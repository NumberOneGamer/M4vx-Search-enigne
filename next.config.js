/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['cheerio', 'ioredis'],
  },
};

module.exports = nextConfig;
