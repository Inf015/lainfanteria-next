/**
 * Índice de la foto que muestra una galería (T-012-D01/D02).
 *
 * La galería puede cambiar con el detalle abierto —otro auto, fotos que
 * terminan de subirse, fotos borradas—, así que el índice guardado puede
 * quedar fuera de rango. Estas funciones lo devuelven siempre dentro de
 * `[0, total - 1]`, o 0 si la galería está vacía: nunca `NaN`, nunca un
 * índice que haga leer `fotos[i]` inexistente.
 */

/** `i` llevado a un índice válido para `total` fotos (0 si no hay ninguna). */
export function indiceValido(i: number, total: number): number {
  if (!Number.isInteger(total) || total <= 0) return 0;
  if (!Number.isFinite(i)) return 0;
  return Math.min(Math.max(Math.trunc(i), 0), total - 1);
}

/** La foto siguiente, dando la vuelta al final. Sin fotos, 0. */
export function fotoSiguiente(i: number, total: number): number {
  if (total <= 0) return 0;
  return (indiceValido(i, total) + 1) % total;
}

/** La foto anterior, dando la vuelta al principio. Sin fotos, 0. */
export function fotoAnterior(i: number, total: number): number {
  if (total <= 0) return 0;
  return (indiceValido(i, total) - 1 + total) % total;
}
