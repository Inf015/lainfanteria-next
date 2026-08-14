import { describe, expect, it } from 'vitest';
import { parsearFeed } from '@/lib/youtube';

/**
 * El feed se parsea con expresiones regulares en vez de un parser XML, así que
 * conviene fijar su comportamiento: si YouTube cambia el formato, estas pruebas
 * avisan antes de que la página quede vacía en silencio.
 *
 * El XML de ejemplo respeta la forma real del feed, incluidos los prefijos de
 * espacio de nombres (yt:, media:) y las entidades escapadas.
 */
const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
  <title>La Infanteria Motorsport</title>
  <entry>
    <yt:videoId>7uS-pJczL5A</yt:videoId>
    <title>La Infanteria Podcast #22 | La Naranjita vs La infanteria</title>
    <published>2026-08-12T18:00:07+00:00</published>
    <media:group>
      <media:title>La Infanteria Podcast #22 | La Naranjita vs La infanteria</media:title>
      <media:thumbnail url="https://i.ytimg.com/vi/7uS-pJczL5A/hqdefault.jpg" width="480" height="360"/>
      <media:description>Episodio con &quot;La Naranjita&quot; &amp; el equipo</media:description>
    </media:group>
  </entry>
  <entry>
    <yt:videoId>bKPztH1YVz8</yt:videoId>
    <title>Dominican Roll Race 2026</title>
    <published>2026-03-01T12:00:00+00:00</published>
    <media:group>
      <media:title>Dominican Roll Race 2026 | RD Javi VS Shan2</media:title>
      <media:thumbnail url="https://i.ytimg.com/vi/bKPztH1YVz8/hqdefault.jpg" width="480" height="360"/>
      <media:description>Eliminatorias</media:description>
    </media:group>
  </entry>
</feed>`;

describe('parsearFeed', () => {
  it('extrae todos los videos del feed', () => {
    expect(parsearFeed(FEED)).toHaveLength(2);
  });

  it('no toma el <title> del canal como si fuera un video', () => {
    // El feed abre con el título del canal antes de la primera <entry>
    const titulos = parsearFeed(FEED).map((v) => v.titulo);
    expect(titulos).not.toContain('La Infanteria Motorsport');
  });

  it('arma la URL del video desde su id', () => {
    expect(parsearFeed(FEED)[0].url).toBe('https://www.youtube.com/watch?v=7uS-pJczL5A');
  });

  it('normaliza la miniatura al host canónico', () => {
    // Bug real: el feed reparte entre i1/i2/i3/i4.ytimg.com y next/image
    // rechazaba los subdominios no declarados, rompiendo las 15 miniaturas
    const conSubdominio = FEED.replace(
      'https://i.ytimg.com/vi/7uS-pJczL5A/hqdefault.jpg',
      'https://i4.ytimg.com/vi/7uS-pJczL5A/hqdefault.jpg',
    );
    expect(parsearFeed(conSubdominio)[0].miniatura).toBe(
      'https://i.ytimg.com/vi/7uS-pJczL5A/hqdefault.jpg',
    );
  });

  it('siempre da miniatura, aunque el feed no la traiga', () => {
    const sinThumb = FEED.replace(/<media:thumbnail[^>]*\/>/g, '');
    expect(parsearFeed(sinThumb)[0].miniatura).toBe(
      'https://i.ytimg.com/vi/7uS-pJczL5A/hqdefault.jpg',
    );
  });

  it('ninguna miniatura usa un subdominio rotativo', () => {
    for (const v of parsearFeed(FEED)) {
      expect(v.miniatura).toMatch(/^https:\/\/i\.ytimg\.com\//);
    }
  });

  it('conserva el título con caracteres especiales', () => {
    expect(parsearFeed(FEED)[0].titulo).toContain('#22');
    expect(parsearFeed(FEED)[0].titulo).toContain('|');
  });

  it('decodifica las entidades XML de la descripción', () => {
    // El feed escapa una vez: &quot; es una comilla y &amp; un ampersand.
    // Decodificar de más convertiría "&amp;quot;" en comillas, corrompiendo
    // una descripción que literalmente diga &quot;.
    const desc = parsearFeed(FEED)[0].descripcion;
    expect(desc).toBe('Episodio con "La Naranjita" & el equipo');
  });

  it('no decodifica dos veces', () => {
    const xml = FEED.replace(
      'Episodio con &quot;La Naranjita&quot; &amp; el equipo',
      'El texto &amp;quot; se muestra tal cual',
    );
    expect(parsearFeed(xml)[0].descripcion).toBe('El texto &quot; se muestra tal cual');
  });

  it('respeta el orden del feed: lo más nuevo primero', () => {
    const [primero, segundo] = parsearFeed(FEED);
    expect(new Date(primero.publicado).getTime()).toBeGreaterThan(
      new Date(segundo.publicado).getTime(),
    );
  });

  it('devuelve lista vacía si el XML está vacío o es basura', () => {
    expect(parsearFeed('')).toEqual([]);
    expect(parsearFeed('<html>error 500</html>')).toEqual([]);
  });

  it('descarta entradas incompletas en vez de romperse', () => {
    const roto = FEED.replace('<yt:videoId>7uS-pJczL5A</yt:videoId>', '');
    const videos = parsearFeed(roto);
    expect(videos).toHaveLength(1);
    expect(videos[0].id).toBe('bKPztH1YVz8');
  });
});
