/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove the static export
  // output: 'export',
  images: {
    unoptimized: true,
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // Skip type checking during build for production
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // This disables dynamic route checking for export
  // https://nextjs.org/docs/messages/export-dynamic-pages
  trailingSlash: true,
}

export default nextConfig

