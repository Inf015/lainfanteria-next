import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { construirCSP } from '@/lib/csp';

/**
 * Refresca la sesión de Supabase en cada request y protege /admin.
 *
 * El middleware es la primera línea: evita que una página del panel llegue a
 * renderizarse sin sesión. La segunda línea son las políticas RLS de la base,
 * que rechazan cualquier consulta de quien no esté en `admins` aunque llegue
 * a saltarse esta.
 */
export async function middleware(request: NextRequest) {
  const esPanel = request.nextUrl.pathname.startsWith('/admin');

  // Nonce solo en el panel: obliga a renderizar por request, y el panel ya es
  // dinámico. En el sitio público eso costaría el prerenderizado.
  const nonce = esPanel
    ? Buffer.from(crypto.randomUUID()).toString('base64')
    : undefined;
  const csp = construirCSP(nonce);

  // Next lee el nonce desde la CSP que llega en la petición y lo pone en sus
  // propios scripts. Sin esta cabecera de request, el nonce del header de
  // respuesta no coincidiría con nada y la página quedaría sin scripts.
  const cabecerasPeticion = new Headers(request.headers);
  cabecerasPeticion.set('content-security-policy', csp);
  if (nonce) cabecerasPeticion.set('x-nonce', nonce);

  const conCSP = (r: NextResponse) => {
    r.headers.set('content-security-policy', csp);
    return r;
  };

  let response = NextResponse.next({ request: { headers: cabecerasPeticion } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: cabecerasPeticion } });
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() valida el token contra Supabase. getSession() solo lee la
  // cookie, que el cliente podría manipular: no sirve para autorizar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  const esLogin = ruta === '/admin/login';

  if (ruta.startsWith('/admin') && !esLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('redirigir', ruta);
    return conCSP(NextResponse.redirect(url));
  }

  // Ya logueado entrando al login: al panel
  if (esLogin && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return conCSP(NextResponse.redirect(url));
  }

  return conCSP(response);
}

export const config = {
  matcher: [
    /*
     * Todo salvo assets estáticos y el optimizador de imágenes: correr el
     * middleware ahí sería puro costo.
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
