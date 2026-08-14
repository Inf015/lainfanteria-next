import { consultar } from './supabase';
import type { AutoConFotos, ClaveSeccion, Piloto, Seccion } from './types';

/**
 * Secciones por defecto, usadas solo si Supabase no responde o todavía no
 * está configurado. Refleja el seed de 0001_esquema_inicial.sql.
 */
const SECCIONES_FALLBACK: Seccion[] = [
  { clave: 'servicios', nombre: 'Servicios', ruta: '/servicios', activa: true, orden: 1 },
  { clave: 'equipo', nombre: 'Equipo', ruta: '/equipo', activa: true, orden: 2 },
  { clave: 'autos', nombre: 'Venta de Autos', ruta: '/autos', activa: true, orden: 3 },
  { clave: 'merch', nombre: 'Merch', ruta: '/merch', activa: false, orden: 4 },
  { clave: 'noticias', nombre: 'Noticias', ruta: '/noticias', activa: false, orden: 5 },
  { clave: 'nosotros', nombre: 'Nosotros', ruta: '/nosotros', activa: true, orden: 6 },
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

/** Pilotos activos, en el orden definido desde el backoffice. */
export async function getPilotos(): Promise<Piloto[]> {
  return consultar<Piloto[]>(
    'pilotos activos',
    (db) => db.from('pilotos').select('*').eq('activo', true).order('orden').order('id'),
    [],
  );
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

/** Ajustes globales (whatsapp_numero, email_contacto, ...) como diccionario. */
export async function getAjustes(): Promise<Record<string, string>> {
  const filas = await consultar<{ clave: string; valor: string }[]>(
    'ajustes',
    (db) => db.from('ajustes').select('clave, valor'),
    [],
  );
  return Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
}
