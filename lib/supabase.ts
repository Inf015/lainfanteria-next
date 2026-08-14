import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// En producción, arrancar sin credenciales significa publicar un sitio que
// parece sano pero está desconectado de la base: los links de WhatsApp salen
// vacíos y todo el contenido cae al respaldo. Preferimos que el build falle.
if (process.env.NODE_ENV === 'production' && !(url && anonKey)) {
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Cargalas en las variables de entorno de Vercel y volvé a desplegar: ' +
      'sin ellas el sitio se publica sin conexión a la base.',
  );
}

/**
 * Cliente de solo lectura para el sitio público.
 *
 * En desarrollo puede ser null (para poder trabajar sin credenciales); en
 * producción el chequeo de arriba garantiza que no lo sea. Quien lo use debe
 * contemplar el null igual — ver `consultar()`.
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
