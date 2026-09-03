import { describe, expect, it } from 'vitest';
import { rutaEnBucket } from '@/lib/storage';

/**
 * De acá sale qué archivo se borra del bucket cuando una foto deja de estar
 * referenciada. Equivocarse para el lado del `null` deja un huérfano; para el
 * otro, borra algo que no es nuestro.
 */

const ORIGEN = 'https://abc.supabase.co';
const PUBLICA = `${ORIGEN}/storage/v1/object/public/fotos`;

// La función deriva de acá cuál es el proyecto propio; sin esto no reconoce
// ninguna URL como nuestra.
process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGEN;

describe('rutaEnBucket', () => {
  it('saca la ruta de una URL pública del bucket', () => {
    expect(rutaEnBucket(`${PUBLICA}/noticias/uuid.jpg`)).toBe('noticias/uuid.jpg');
    expect(rutaEnBucket(`${PUBLICA}/auto/12/uuid.webp`)).toBe('auto/12/uuid.webp');
  });

  it('descarta la query, que no es parte del objeto', () => {
    expect(rutaEnBucket(`${PUBLICA}/miembros/uuid.png?t=1730`)).toBe('miembros/uuid.png');
    expect(rutaEnBucket(`${PUBLICA}/miembros/uuid.png#x`)).toBe('miembros/uuid.png');
  });

  it('ignora las fotos que no viven en nuestro bucket', () => {
    // Quedan fotos viejas en Cloudinary y URLs cargadas a mano: sobre esas no
    // hay nada que borrar
    expect(rutaEnBucket('https://res.cloudinary.com/demo/image/upload/v1/foto.jpg')).toBeNull();
    expect(rutaEnBucket('https://ejemplo.com/foto.jpg')).toBeNull();
    expect(rutaEnBucket('/images/logo.png')).toBeNull();
  });

  it('ignora otros buckets del mismo proyecto', () => {
    expect(rutaEnBucket(`${ORIGEN}/storage/v1/object/public/otro/foto.jpg`)).toBeNull();
  });

  it('ignora una URL ajena que lleve la marca adentro', () => {
    // Si alcanzara con encontrar la marca en cualquier posición, esto pediría
    // borrar `miembros/victima.jpg` de NUESTRO bucket: una foto legítima
    // eliminada por una URL que cargó cualquiera.
    expect(
      rutaEnBucket(
        'https://externo.example/storage/v1/object/public/fotos/miembros/victima.jpg',
      ),
    ).toBeNull();
    expect(rutaEnBucket(`https://externo.example/redir?u=${PUBLICA}/a/b.jpg`)).toBeNull();
  });

  it('ignora otro proyecto de Supabase', () => {
    expect(
      rutaEnBucket('https://otro.supabase.co/storage/v1/object/public/fotos/a/b.jpg'),
    ).toBeNull();
    // Mismo host, otro esquema o puerto: tampoco es el mismo origen.
    expect(
      rutaEnBucket('http://abc.supabase.co/storage/v1/object/public/fotos/a/b.jpg'),
    ).toBeNull();
  });

  it('exige que el path arranque con el prefijo público del bucket', () => {
    expect(rutaEnBucket(`${ORIGEN}/otra/cosa/storage/v1/object/public/fotos/a/b.jpg`)).toBeNull();
    expect(rutaEnBucket(`${ORIGEN}/storage/v1/object/sign/fotos/a/b.jpg`)).toBeNull();
    expect(rutaEnBucket(`${ORIGEN}/rest/v1/miembros`)).toBeNull();
  });

  it('no rompe con nulo, vacío ni con la URL sin ruta', () => {
    expect(rutaEnBucket(null)).toBeNull();
    expect(rutaEnBucket(undefined)).toBeNull();
    expect(rutaEnBucket('')).toBeNull();
    expect(rutaEnBucket(`${PUBLICA}/`)).toBeNull();
  });
});
