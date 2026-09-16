/** El cliente que usan los formularios del panel; se tipa así para no duplicarlo. */
type ClienteNavegador = ReturnType<
  typeof import('./supabase/navegador').crearClienteNavegador
>;

/**
 * Utilidades del bucket de imágenes.
 *
 * Las fotos se guardan en Supabase Storage y en la base queda solo la URL
 * pública. Cuando una URL deja de estar referenciada —se reemplaza la imagen o
 * se borra el registro— el archivo sigue ocupando lugar en el bucket para
 * siempre: nadie lo ve y nadie lo borra. De acá salen las dos piezas para
 * evitarlo: sacar la ruta desde la URL y borrar el objeto.
 */

export const BUCKET_FOTOS = 'fotos';

/** Lo que Supabase antepone a la ruta dentro del bucket en la URL pública. */
const MARCA_PUBLICA = `/storage/v1/object/public/${BUCKET_FOTOS}/`;

/**
 * Origen del proyecto de Supabase, o `null` si la variable no está o no es una
 * URL. Se lee en cada llamada y no al cargar el módulo para que se pueda fijar
 * desde los tests; en el bundle del navegador Next reemplaza la expresión por
 * el literal igual, esté donde esté.
 */
function origenSupabase(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

/**
 * Ruta dentro del bucket a partir de la URL pública, o `null` si la URL no es
 * de este bucket.
 *
 * El `null` es la parte importante: quedan fotos viejas alojadas en Cloudinary
 * y URLs cargadas a mano que no son nuestras. Sobre esas no hay nada que
 * borrar, y confundirlas con una ruta local sería pedirle a Storage que borre
 * cualquier cosa.
 *
 * Por eso no alcanza con buscar la marca dentro del texto: una URL ajena que la
 * lleve en cualquier posición —`https://externo.example/storage/v1/object/
 * public/fotos/miembros/victima.jpg`— daría una ruta que sí existe en nuestro
 * bucket, y borraríamos una foto legítima por pedido de un tercero. Tienen que
 * coincidir el origen del proyecto y el principio del path.
 */
export function rutaEnBucket(url: string | null | undefined): string | null {
  if (!url) return null;

  const origen = origenSupabase();
  if (!origen) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null; // relativas y basura: no son nuestras
  }

  if (parsed.origin !== origen) return null;
  if (!parsed.pathname.startsWith(MARCA_PUBLICA)) return null;

  // `pathname` ya deja afuera la query (`?t=…` del cache-buster) y el fragmento,
  // que no son parte de la ruta del objeto.
  const ruta = parsed.pathname.slice(MARCA_PUBLICA.length);
  return ruta || null;
}

/**
 * Borra del bucket el objeto al que apunta la URL, si es nuestro.
 *
 * Es "mejor esfuerzo" a propósito: se llama siempre después de haber guardado
 * o borrado la fila, así que si esto falla queda un archivo huérfano —molesto,
 * pero invisible—. Al revés dejaría una foto rota en el sitio.
 */
export async function borrarDelBucket(
  db: ClienteNavegador,
  url: string | null | undefined,
): Promise<void> {
  const ruta = rutaEnBucket(url);
  if (!ruta) return;

  const { error } = await db.storage.from(BUCKET_FOTOS).remove([ruta]);
  if (error) console.error(`No se pudo borrar ${ruta} del bucket:`, error.message);
}
