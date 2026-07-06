/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Ensure server-only modules like mongoose work correctly
  serverExternalPackages: ['mongoose'],
}

export default nextConfig
