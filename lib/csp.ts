/**
 * Content-Security-Policy del sitio.
 *
 * Se arman dos políticas distintas a propósito:
 *
 * - **Panel**: estricta, con nonce. Next solo pone el nonce en sus scripts si
 *   la página se renderiza por request, y el panel ya es `force-dynamic`, así
 *   que ahí el nonce no cuesta nada. Es además la superficie autenticada, donde
 *   una inyección haría verdadero daño.
 *
 * - **Sitio público**: sin nonce, con 'unsafe-inline' en scripts. Exigir nonce
 *   obligaría a renderizar cada visita en el servidor y se perdería el
 *   prerenderizado, que es lo que hace al sitio rápido y barato. El resto de
 *   las directivas sí se aprietan igual: sin nonce se pierde parte de la
 *   protección contra XSS, pero se conserva toda la de exfiltración —a dónde
 *   puede hablar la página y de dónde puede cargar.
 *
 * `style-src` lleva 'unsafe-inline' en ambas: React aplica estilos con el
 * atributo `style` y esa directiva no admite nonces para atributos.
 */

/** Host de Supabase, derivado de la URL del proyecto. */
function hostSupabase(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return '';
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

export function construirCSP(nonce?: string): string {
  const supa = hostSupabase();
  const supaWs = supa.replace(/^https:/, 'wss:');

  /*
   * React en desarrollo usa eval() para reconstruir pilas de llamada, y sin este
   * permiso la consola se llena de cientos de errores de CSP que tapan los
   * de verdad. En producción React nunca lo usa, así que solo se concede
   * mientras corre `next dev`.
   */
  const evalEnDesarrollo =
    process.env.NODE_ENV === 'production' ? '' : ` 'unsafe-eval'`;

  const scriptSrc = nonce
    ? // strict-dynamic: los scripts que cargue uno ya autorizado heredan el
      // permiso, sin tener que enumerar cada archivo generado por el build
      `'self' 'nonce-${nonce}' 'strict-dynamic'${evalEnDesarrollo}`
    : `'self' 'unsafe-inline'${evalEnDesarrollo}`;

  const directivas = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    // blob: y data: los usa el optimizador de imágenes de Next
    `img-src 'self' data: blob: ${supa} https://i.ytimg.com https://res.cloudinary.com`,
    `font-src 'self' data:`,
    // A dónde puede hablar la página: solo a su propio origen y a Supabase
    `connect-src 'self' ${supa} ${supaWs}`,
    // El reproductor de videos del canal
    `frame-src https://www.youtube-nocookie.com https://www.youtube.com`,
    `media-src 'self' ${supa}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    // Los formularios solo pueden enviarse al propio sitio
    `form-action 'self'`,
    // Nadie puede embeber el sitio: refuerza X-Frame-Options
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ];

  return directivas
    .map((d) => d.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('; ');
}
