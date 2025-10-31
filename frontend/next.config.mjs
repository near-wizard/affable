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
  async rewrites() {
    return {
      beforeFiles: [
        // Proxy API requests to backend
        {
          source: '/v1/:path*',
          destination: 'http://localhost:8000/v1/:path*',
        }
      ],
    }
  },
}

export default nextConfig
