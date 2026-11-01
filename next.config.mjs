/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type errors should fail the build rather than ship silently.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
