/** @type {import('next').NextConfig} */

const backendUrl = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:4000'
).replace(/\/+$/, '');

const nextConfig = {
  /**
   * Railway runs this application with `next start`.
   * Keep a normal Next.js server build and proxy browser /api traffic to NestJS.
   */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'localhost' },
      { protocol: 'http', hostname: '*.railway.internal' },
      { protocol: 'https', hostname: '*.railway.app' },
      { protocol: 'https', hostname: '*.onrender.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
    unoptimized: true,
  },

  staticPageGenerationTimeout: 1000,
  compress: true,
};

module.exports = nextConfig;
