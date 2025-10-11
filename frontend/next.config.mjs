/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/vendor',
        destination: '/vendor/dashboard',
        permanent: true,
      },
      {
        source: '/partner',
        destination: '/partner/dashboard',
        permanent: true,
      }
    ]
  },
}

export default nextConfig
