/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * API Rewrites - Proxy all /api/* requests to the NestJS backend
   *
   * LOCAL:
   *   - Frontend: http://localhost:3000
   *   - Backend: http://localhost:4000
   *   - Proxy: /api/* → http://localhost:4000/api/*
   *
   * PRODUCTION (Railway):
   *   - Frontend: https://<your-railway-frontend-url>
   *   - Backend: https://<your-railway-backend-url>
   *   - Uses internal domain: http://scintillating-strength.railway.internal:8080
   *
   * Set NEXT_PUBLIC_BACKEND_URL in .env to control backend URL
   */
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

    // Use rewrites for all environments
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  // Allowed domains for images
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
    unoptimized: true, // Unoptimize all images for better compatibility
  },

  // Ensure static files in public folder are served correctly
  staticPageGenerationTimeout: 1000,
  compress: true,
};

module.exports = nextConfig;
// Force rebuild - Demo gallery deployment fix
