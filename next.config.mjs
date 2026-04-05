/** @type {import('next').NextConfig} */
const nextConfig = {
  // All CMS UI pages are fully client-rendered ('use client' components)
  // so we disable SSR for the root page by rendering through a client boundary.

  // Increase body size limit for API routes (for page content uploads)
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
