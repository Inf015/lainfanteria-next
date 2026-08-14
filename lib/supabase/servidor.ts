import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cliente de Supabase para componentes de servidor del backoffice.
 *
 * A diferencia del cliente público de lib/supabase.ts, este lee la sesión
 * desde las cookies, así que las consultas viajan como el usuario logueado y
 * RLS le aplica sus políticas de admin.
 */
export async function crearClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies) {
          try {
            cookies.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Los componentes de servidor no pueden escribir cookies. Es
            // esperable: el middleware ya refresca la sesión en cada request.
          }
        },
      },
    },
  );
}

/** El usuario logueado, o null. */
export async function getUsuario() {
  const db = await crearClienteServidor();
  const {
    data: { user },
  } = await db.auth.getUser();
  return user;
}

/**
 * Si el usuario está en la tabla `admins`.
 *
 * Estar logueado no alcanza: Supabase Auth permite registro público, así que
 * el acceso al panel se decide por pertenencia explícita a esa lista.
 */
export async function esAdmin() {
  const db = await crearClienteServidor();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return false;

  const { data } = await db.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  return data !== null;
}
