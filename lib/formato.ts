import type { Moneda } from './types';

/**
 * Funciones puras de formato y transformación.
 *
 * Estaban repetidas dentro de los componentes (el precio, en cinco lugares).
 * Acá quedan en un solo sitio y, sobre todo, se pueden probar.
 */

/** "US$ 45,000" / "RD$ 2,500". Sin decimales: los precios son redondos. */
export function formatPrecio(monto: number, moneda: Moneda): string {
  const simbolo = moneda === 'USD' ? 'US$' : 'RD$';
  const numero = new Intl.NumberFormat('es-DO', { maximumFractionDigits: 0 }).format(
    Number.isFinite(monto) ? monto : 0,
  );
  return `${simbolo} ${numero}`;
}

/**
 * Título → slug para la URL: sin tildes, minúsculas, con guiones.
 *
 * NFD separa las letras de sus marcas diacríticas y el rango ̀-ͯ las
 * elimina, así "Campeón" da "campeon" y no "campen".
 */
export function aSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, ''); // el corte a 80 puede dejar un guion colgando
}

/** "S, M, L" → ['S','M','L']. Descarta vacíos y espacios sobrantes. */
export function aLista(texto: string): string[] {
  return texto
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Nombre legible de un auto, salteando las partes que falten. */
export function nombreAuto(a: {
  marca: string;
  modelo: string;
  version?: string | null;
  anio?: string | null;
}): string {
  return [a.marca, a.modelo, a.version, a.anio].filter(Boolean).join(' ');
}

/**
 * Deja solo los dígitos, para enlaces `tel:`.
 *
 * El teléfono se guarda con formato legible —"(829) 686-3273"— y algunos
 * marcadores no interpretan paréntesis ni espacios.
 */
export function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

/** Ordena fotos: la principal primero, después por `orden`. */
export function ordenarFotos<T extends { es_principal: boolean; orden: number }>(
  fotos: T[],
): T[] {
  return [...fotos].sort(
    (a, b) => Number(b.es_principal) - Number(a.es_principal) || a.orden - b.orden,
  );
}

/**
 * Divide un texto de textarea en párrafos.
 *
 * El contenido se escribe en textareas, donde los saltos de línea son la única
 * forma de separar párrafos. En HTML esos saltos colapsan, así que hay que
 * convertirlos en elementos separados o el texto se ve corrido.
 */
export function aParrafos(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
