/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@merqent/shared-types',
    '@merqent/validation',
    '@merqent/ui',
    '@merqent/config',
  ],
};

module.exports = nextConfig;
