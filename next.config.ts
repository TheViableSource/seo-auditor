import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Production optimizations
  poweredByHeader: false, // Hide X-Powered-By header for security
  compress: true, // Enable gzip compression

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development'
    }
  },
};

export default nextConfig;
