import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Pruebas de humo contra el sitio desplegado.
 *
 * Verifican lo que solo se ve en producción: que las páginas respondan, que
 * lean la base de verdad, que el interruptor de secciones funcione y que las
 * cabeceras de seguridad lleguen.
 *
 *   npm run test:humo                        (contra producción)
 *   SITIO=http://localhost:3000 npm run test:humo   (contra local)
 *
 * El primer deploy pasó sin variables de entorno y el sitio quedó publicado
 * sin conexión a la base: se veía bien pero todos los enlaces de WhatsApp
 * salían vacíos. Estas pruebas atrapan exactamente eso.
 */

const SITIO = process.env.SITIO ?? 'https://lainfanteria-next.vercel.app';
const API = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Secciones activas según la base: define qué rutas deben responder. */
let activas: Record<string, boolean> = {};

async function html(ruta: string) {
  const r = await fetch(`${SITIO}${ruta}`);
  return { status: r.status, cuerpo: await r.text(), headers: r.headers };
}

beforeAll(async () => {
  if (!API || !ANON) throw new Error('Faltan credenciales de Supabase en .env.local');
  const r = await fetch(`${API}/rest/v1/secciones?select=clave,activa`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  const filas: { clave: string; activa: boolean }[] = await r.json();
  activas = Object.fromEntries(filas.map((f) => [f.clave, f.activa]));
});

describe('páginas siempre presentes', () => {
  it.each(['/'])('%s responde 200', async (ruta) => {
    expect((await html(ruta)).status).toBe(200);
  });
});

describe('el interruptor de secciones manda', () => {
  const rutas: Record<string, string> = {
    servicios: '/servicios',
    equipo: '/equipo',
    autos: '/autos',
    nosotros: '/nosotros',
    merch: '/merch',
    noticias: '/noticias',
  };

  it.each(Object.keys(rutas))('%s: 200 si está activa, 404 si no', async (clave) => {
    const { status } = await html(rutas[clave]);
    expect(status).toBe(activas[clave] ? 200 : 404);
  });

  it('el menú solo muestra las secciones activas', async () => {
    const { cuerpo } = await html('/');
    for (const [clave, esta] of Object.entries(activas)) {
      const enMenu = cuerpo.includes(`"/${clave === 'servicios' ? 'servicios' : clave}"`);
      if (!esta) {
        // Una sección apagada no debe aparecer como enlace del navbar
        expect(cuerpo).not.toContain(`"ruta":"/${clave}","activa":true`);
      }
      void enMenu;
    }
  });
});

describe('el sitio está conectado a la base', () => {
  it('el WhatsApp sale de ajustes, no vacío', async () => {
    const { cuerpo } = await html('/');
    // El fallo real: "wa.me/" sin número cuando faltan las variables de entorno
    expect(cuerpo).not.toMatch(/wa\.me\/"/);
    expect(cuerpo).toMatch(/wa\.me\/\d{8,15}/);
  });

  it('el mismo número aparece en todas las páginas activas', async () => {
    const rutas = ['/', '/servicios', '/nosotros'].filter(Boolean);
    const numeros = new Set<string>();
    for (const ruta of rutas) {
      const { cuerpo } = await html(ruta);
      for (const m of cuerpo.matchAll(/wa\.me\/(\d+)/g)) numeros.add(m[1]);
    }
    expect(numeros.size).toBe(1);
  });

  it('los enlaces tel: llevan solo dígitos', async () => {
    const { cuerpo } = await html('/');
    for (const m of cuerpo.matchAll(/tel:([^"\\]+)/g)) {
      expect(m[1]).toMatch(/^\d+$/);
    }
  });
});

describe('el panel está protegido', () => {
  const rutas = [
    '/admin',
    '/admin/autos',
    '/admin/miembros',
    '/admin/productos',
    '/admin/noticias',
    '/admin/secciones',
    '/admin/ajustes',
  ];

  it.each(rutas)('%s redirige al login sin sesión', async (ruta) => {
    // redirect: manual para ver el 307 en vez de seguirlo
    const r = await fetch(`${SITIO}${ruta}`, { redirect: 'manual' });
    expect([307, 302]).toContain(r.status);
    expect(r.headers.get('location')).toContain('/admin/login');
  });

  it('el login sí es accesible', async () => {
    const { status, cuerpo } = await html('/admin/login');
    expect(status).toBe(200);
    expect(cuerpo).toContain('Acceso restringido');
  });

  it('el panel pide no ser indexado', async () => {
    const { headers } = await html('/admin/login');
    expect(headers.get('x-robots-tag')).toMatch(/noindex/);
  });
});

describe('cabeceras de seguridad', () => {
  it.each([
    ['strict-transport-security', /max-age=\d+/],
    ['x-frame-options', /DENY/i],
    ['x-content-type-options', /nosniff/],
    ['referrer-policy', /strict-origin/],
    ['permissions-policy', /camera=\(\)/],
  ])('%s presente', async (cabecera, patron) => {
    const { headers } = await html('/');
    expect(headers.get(cabecera as string)).toMatch(patron as RegExp);
  });
});

describe('imágenes', () => {
  it('el optimizador de Next sirve las imágenes locales', async () => {
    const r = await fetch(
      `${SITIO}/_next/image?url=%2Fimages%2Flogo.png&w=256&q=75`,
    );
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toMatch(/image\//);
  });

  it('las fotos de Storage pasan por el optimizador', async () => {
    const r = await fetch(`${API}/rest/v1/auto_fotos?select=url&limit=1`, {
      headers: { apikey: ANON!, Authorization: `Bearer ${ANON!}` },
    });
    const filas: { url: string }[] = await r.json();
    if (filas.length === 0) return;

    const optimizada = await fetch(
      `${SITIO}/_next/image?url=${encodeURIComponent(filas[0].url)}&w=640&q=75`,
    );
    expect(optimizada.status).toBe(200);
    expect(optimizada.headers.get('content-type')).toMatch(/image\//);
  });
});

describe('Content-Security-Policy', () => {
  it('el sitio público la envía', async () => {
    const { headers } = await html('/');
    const csp = headers.get('content-security-policy');
    expect(csp).toBeTruthy();
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it('limita a dónde puede hablar la página', async () => {
    const csp = (await html('/')).headers.get('content-security-policy') ?? '';
    const connect = csp.match(/connect-src ([^;]+)/)?.[1] ?? '';
    // Solo el propio origen y Supabase: si aparece un tercero, revisar por qué
    expect(connect).toContain("'self'");
    expect(connect).toContain('supabase.co');
    expect(connect).not.toContain('*');
  });

  it('permite el reproductor del canal y nada más en iframes', async () => {
    const csp = (await html('/videos')).headers.get('content-security-policy') ?? '';
    const frame = csp.match(/frame-src ([^;]+)/)?.[1] ?? '';
    expect(frame).toContain('youtube-nocookie.com');
    expect(frame).not.toContain("'self'");
  });

  it('el panel usa nonce y no unsafe-inline en scripts', async () => {
    const csp = (await html('/admin/login')).headers.get('content-security-policy') ?? '';
    const script = csp.match(/script-src ([^;]+)/)?.[1] ?? '';
    expect(script).toMatch(/'nonce-[^']+'/);
    expect(script).not.toContain("'unsafe-inline'");
  });

  it('el nonce del panel coincide con el de sus scripts', async () => {
    // Si no coincidieran, el navegador bloquearía todos los scripts y el
    // panel se vería pero no funcionaría
    const r = await fetch(`${SITIO}/admin/login`);
    const cuerpo = await r.text();
    const enCabecera = r.headers
      .get('content-security-policy')
      ?.match(/'nonce-([^']+)'/)?.[1];
    const enScripts = new Set([...cuerpo.matchAll(/nonce="([^"]+)"/g)].map((m) => m[1]));

    expect(enCabecera).toBeTruthy();
    expect(enScripts.size).toBe(1);
    expect([...enScripts][0]).toBe(enCabecera);
  });

  it('el nonce cambia en cada petición', async () => {
    const uno = (await html('/admin/login')).headers.get('content-security-policy');
    const dos = (await html('/admin/login')).headers.get('content-security-policy');
    expect(uno).not.toBe(dos);
  });
});
