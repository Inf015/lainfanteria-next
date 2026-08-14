/**
 * Lectura del canal de YouTube vía su feed RSS público.
 *
 * Se usa el feed y no la Data API a propósito: no necesita API key, no tiene
 * cuota y por lo tanto no hay ningún secreto que guardar ni rotar. A cambio
 * devuelve solo los últimos 15 videos, que para una portada es de sobra.
 */

export interface Video {
  id: string;
  titulo: string;
  descripcion: string;
  publicado: string;
  miniatura: string;
  url: string;
}

/** Decodifica las entidades XML que aparecen en títulos y descripciones. */
function decodificar(texto: string): string {
  return texto
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&'); // último: si no, re-decodifica lo anterior
}

function extraer(bloque: string, etiqueta: string): string {
  const m = bloque.match(new RegExp(`<${etiqueta}[^>]*>([\\s\\S]*?)</${etiqueta}>`));
  return m ? decodificar(m[1].trim()) : '';
}

/**
 * Convierte el XML del feed en una lista de videos.
 *
 * Separada de la descarga para poder probarla sin red.
 */
export function parsearFeed(xml: string): Video[] {
  const entradas = xml.split('<entry>').slice(1);

  return entradas
    .map((entrada): Video | null => {
      const id = extraer(entrada, 'yt:videoId');
      const titulo = extraer(entrada, 'media:title') || extraer(entrada, 'title');
      if (!id || !titulo) return null;

      // El feed reparte las miniaturas entre subdominios rotativos —i1, i2,
      // i3, i4.ytimg.com— así que la URL que trae no es estable. Se arma la
      // canónica desde el id: siempre el mismo host, y next/image necesita
      // tener declarado uno solo en vez de adivinar cuántos son.
      const miniatura = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

      return {
        id,
        titulo,
        descripcion: extraer(entrada, 'media:description'),
        publicado: extraer(entrada, 'published'),
        miniatura,
        url: `https://www.youtube.com/watch?v=${id}`,
      };
    })
    .filter((v): v is Video => v !== null);
}

/**
 * Últimos videos del canal.
 *
 * Se cachea una hora: el feed cambia cuando se sube un video, no cada minuto,
 * y no tiene sentido golpear a YouTube en cada regeneración.
 *
 * Ante cualquier fallo devuelve lista vacía en vez de tirar la página, igual
 * que el resto de las consultas del sitio: la página muestra su estado vacío
 * con un enlace al canal.
 */
export async function getVideos(channelId: string, limite?: number): Promise<Video[]> {
  if (!channelId) return [];

  try {
    const r = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
      { next: { revalidate: 3600 } },
    );

    if (!r.ok) {
      console.error(`[youtube] el feed respondió ${r.status}`);
      return [];
    }

    const videos = parsearFeed(await r.text());
    return limite ? videos.slice(0, limite) : videos;
  } catch (e) {
    console.error('[youtube] no se pudo leer el feed:', e);
    return [];
  }
}
