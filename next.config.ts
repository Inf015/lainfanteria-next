import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Las fotos de pilotos, autos y productos viven en Cloudinary desde el
    // proyecto Blazor. next/image necesita el host declarado para optimizarlas.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
