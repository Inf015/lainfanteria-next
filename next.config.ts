import type { NextConfig } from 'next';

/**
 * Host de Supabase Storage, derivado de la URL del proyecto para que no haya
 * que tocar este archivo si algún día se cambia de proyecto.
 */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    // next/image solo optimiza imágenes de hosts declarados.
    remotePatterns: [
      // Fotos nuevas: bucket público de Supabase Storage
      ...(supabaseHost
        ? [
            {
              protocol: 'https' as const,
              hostname: supabaseHost,
              pathname: '/storage/v1/object/public/**',
            },
          ]
        : []),
      // Fotos heredadas del proyecto Blazor, todavía servidas desde Cloudinary
      {
        protocol: 'https' as const,
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
