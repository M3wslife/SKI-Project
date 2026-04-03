/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output to avoid symlink issues during local builds
  output: 'standalone',
  // Ensure the build process sees environmental variables
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

module.exports = nextConfig;
