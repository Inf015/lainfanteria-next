import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Cliente de solo lectura para el sitio público.
 *
 * Devuelve null si faltan las variables de entorno, en vez de tirar al
 * importar: así el build no se cae y las páginas pueden mostrar su estado
 * vacío. Quien lo use debe contemplar el null — ver `consultar()`.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const supabaseConfigurado = supabase !== null;

/**
 * Envuelve una query para que un fallo nunca voltee la página.
 *
 * El sitio es de contenido: si Supabase no responde, es preferible renderizar
 * la sección vacía antes que un 500. El error se registra para que no pase
 * inadvertido.
 */
export async function consultar<T>(
  descripcion: string,
  fn: (db: SupabaseClient) => PromiseLike<{ data: T | null; error: unknown }>,
  fallback: T,
): Promise<T> {
  if (!supabase) {
    console.warn(
      `[supabase] "${descripcion}" omitida: faltan NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY`,
    );
    return fallback;
  }

  try {
    const { data, error } = await fn(supabase);
    if (error) {
      console.error(`[supabase] "${descripcion}" falló:`, error);
      return fallback;
    }
    return data ?? fallback;
  } catch (e) {
    console.error(`[supabase] "${descripcion}" lanzó:`, e);
    return fallback;
  }
}
