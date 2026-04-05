/** @type {import('next').NextConfig} */
const nextConfig = {
  // All CMS UI pages are fully client-rendered ('use client' components)
  // so we disable SSR for the root page by rendering through a client boundary.

  // Increase body size limit for API routes (asset uploads can be up to 8 MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },

  // Serve all pages with a trailing slash so relative asset URLs in the
  // generated site previews resolve correctly from the browser.
  trailingSlash: true,
};

export default nextConfig;
