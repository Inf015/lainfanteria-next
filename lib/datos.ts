import { consultar } from './supabase';
import type {
  AutoConFotos,
  ClaveSeccion,
  Logro,
  Miembro,
  Noticia,
  ProductoConFotos,
  Seccion,
} from './types';

/**
 * Secciones por defecto, usadas solo si Supabase no responde o todavía no
 * está configurado. Refleja el seed de 0001_esquema_inicial.sql.
 */
const SECCIONES_FALLBACK: Seccion[] = [
  { clave: 'servicios', nombre: 'Servicios', ruta: '/servicios', activa: true, orden: 1 },
  { clave: 'equipo', nombre: 'Equipo', ruta: '/equipo', activa: true, orden: 2 },
  { clave: 'autos', nombre: 'Venta de Autos', ruta: '/autos', activa: true, orden: 3 },
  { clave: 'merch', nombre: 'Merch', ruta: '/merch', activa: false, orden: 4 },
  { clave: 'videos', nombre: 'Videos', ruta: '/videos', activa: false, orden: 5 },
  { clave: 'noticias', nombre: 'Noticias', ruta: '/noticias', activa: false, orden: 6 },
  { clave: 'nosotros', nombre: 'Nosotros', ruta: '/nosotros', activa: true, orden: 7 },
];

/** Todas las secciones activas, ordenadas para el navbar. */
export async function getSeccionesActivas(): Promise<Seccion[]> {
  return consultar<Seccion[]>(
    'secciones activas',
    (db) => db.from('secciones').select('*').eq('activa', true).order('orden'),
    SECCIONES_FALLBACK.filter((s) => s.activa),
  );
}

/**
 * Si una sección está prendida. Las páginas la usan para devolver 404 cuando
 * está apagada, así no quedan accesibles por URL directa.
 */
export async function seccionActiva(clave: ClaveSeccion): Promise<boolean> {
  const filas = await consultar<{ activa: boolean }[]>(
    `sección ${clave}`,
    (db) => db.from('secciones').select('activa').eq('clave', clave).limit(1),
    SECCIONES_FALLBACK.filter((s) => s.clave === clave).map((s) => ({ activa: s.activa })),
  );
  return filas[0]?.activa ?? false;
}

/*
 * Columnas del miembro más su palmarés.
 *
 * Se enumeran en vez de usar `*` por dos razones: `miembros.logros` es la
 * columna vieja de texto que ya no lee nadie y no hace falta traerla, y el
 * embebido tiene que ir con alias porque comparte nombre con ella —`logros(*)`
 * junto a la columna `logros` es ambiguo—.
 */
/* Una sola línea a propósito: partida o concatenada, supabase-js pierde el tipo
   literal del select y deja de inferir la forma de la respuesta. */
// prettier-ignore
const COLUMNAS_MIEMBRO =
  'id, nombre, slug, numero, roles, biografia, foto_url, foto_public_id, instagram_url, youtube_url, trofeos_total, orden, activo, creado_en, palmares:logros(*)' as const;

/**
 * Ordena un palmarés de lo más reciente a lo más viejo, dejando al final lo que
 * no tiene fecha.
 *
 * Se ordena acá y no en la consulta a propósito: ordenar un embebido depende de
 * cómo PostgREST nombre la relación aliasada, y son unos cientos de filas por
 * miembro. En memoria es exacto y no depende de esa sutileza.
 */
function ordenarPalmares(logros: Logro[]): Logro[] {
  return [...logros].sort((a, b) => {
    if (a.anio !== b.anio) return (b.anio ?? -Infinity) - (a.anio ?? -Infinity);
    if (a.mes !== b.mes) return (b.mes ?? -Infinity) - (a.mes ?? -Infinity);
    return b.id - a.id;
  });
}

/** Miembros activos del equipo, en el orden definido desde el backoffice. */
export async function getMiembros(): Promise<Miembro[]> {
  const miembros = await consultar<Miembro[]>(
    'miembros activos',
    (db) =>
      db
        .from('miembros')
        .select(COLUMNAS_MIEMBRO)
        .eq('activo', true)
        .order('orden')
        .order('id'),
    [],
  );

  return miembros.map((m) => ({ ...m, palmares: ordenarPalmares(m.palmares ?? []) }));
}

/** Un miembro por su slug, para su página propia. Null si no existe o está inactivo. */
export async function getMiembro(slug: string): Promise<Miembro | null> {
  const filas = await consultar<Miembro[]>(
    `miembro ${slug}`,
    (db) =>
      db
        .from('miembros')
        .select(COLUMNAS_MIEMBRO)
        .eq('slug', slug)
        .eq('activo', true)
        .limit(1),
    [],
  );

  const miembro = filas[0];
  return miembro ? { ...miembro, palmares: ordenarPalmares(miembro.palmares ?? []) } : null;
}

/**
 * Autos del inventario con sus fotos. Excluye los vendidos: la página solo
 * ofrece filtrar entre disponibles y reservados.
 */
export async function getAutos(): Promise<AutoConFotos[]> {
  const autos = await consultar<AutoConFotos[]>(
    'autos en inventario',
    (db) =>
      db
        .from('autos')
        .select('*, auto_fotos(*)')
        .eq('activo', true)
        .neq('estado', 'vendido')
        .order('orden')
        .order('id'),
    [],
  );

  // Las fotos vienen sin orden garantizado desde el join.
  return autos.map((a) => ({
    ...a,
    precio: Number(a.precio),
    auto_fotos: [...(a.auto_fotos ?? [])].sort(
      (x, y) => Number(y.es_principal) - Number(x.es_principal) || x.orden - y.orden,
    ),
  }));
}

/** Productos activos con sus fotos. `limite` acota para el bloque de la home. */
export async function getProductos(limite?: number): Promise<ProductoConFotos[]> {
  const productos = await consultar<ProductoConFotos[]>(
    'productos activos',
    (db) => {
      const q = db
        .from('productos')
        .select('*, producto_fotos(*)')
        .eq('activo', true)
        .order('orden')
        .order('id');
      return limite ? q.limit(limite) : q;
    },
    [],
  );

  return productos.map((p) => ({
    ...p,
    precio: Number(p.precio),
    producto_fotos: [...(p.producto_fotos ?? [])].sort(
      (x, y) => Number(y.es_principal) - Number(x.es_principal) || x.orden - y.orden,
    ),
  }));
}

/** Noticias publicadas, de la más reciente a la más vieja. */
export async function getNoticias(limite?: number): Promise<Noticia[]> {
  return consultar<Noticia[]>(
    'noticias publicadas',
    (db) => {
      const q = db
        .from('noticias')
        .select('*')
        .eq('publicada', true)
        .order('fecha_publicacion', { ascending: false, nullsFirst: false });
      return limite ? q.limit(limite) : q;
    },
    [],
  );
}

/** Una noticia publicada por su slug, o null si no existe o es borrador. */
export async function getNoticiaPorSlug(slug: string): Promise<Noticia | null> {
  const filas = await consultar<Noticia[]>(
    `noticia ${slug}`,
    (db) =>
      db.from('noticias').select('*').eq('slug', slug).eq('publicada', true).limit(1),
    [],
  );
  return filas[0] ?? null;
}

/** Ajustes globales (whatsapp_numero, email_contacto, ...) como diccionario. */
export async function getAjustes(): Promise<Record<string, string>> {
  const filas = await consultar<{ clave: string; valor: string }[]>(
    'ajustes',
    (db) => db.from('ajustes').select('clave, valor'),
    [],
  );
  return Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
}
