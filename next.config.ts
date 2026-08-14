import type { NextConfig } from 'next';

/**
 * Host de Supabase Storage, derivado de la URL del proyecto para que no haya
 * que tocar este archivo si algún día se cambia de proyecto.
 */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

/**
 * Cabeceras de seguridad. Vercel ya envía HSTS; estas cubren el resto de lo
 * básico sin requerir mantenimiento.
 *
 * No se agrega Content-Security-Policy: hacerla bien con Next exige nonces por
 * request, y una mal armada rompe la página sin avisar. Queda como mejora
 * aparte, no como algo a improvisar.
 */
const cabecerasSeguridad = [
  // Nadie puede meter el sitio en un iframe: evita clickjacking sobre el panel
  { key: 'X-Frame-Options', value: 'DENY' },
  // El navegador respeta el Content-Type declarado en vez de adivinarlo
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Al salir del sitio solo se envía el origen, no la URL completa
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // El sitio no usa cámara, micrófono ni ubicación: se niegan explícitamente
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: '/:path*', headers: cabecerasSeguridad },
      {
        // El panel nunca debe aparecer en buscadores
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },

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
