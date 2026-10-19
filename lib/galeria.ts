/**
 * Orden de una galería de fotos en el panel.
 *
 * La regla es una sola: **la primera foto de la galería es la principal.** El
 * panel calcula el orden nuevo acá, lo muestra al instante y le manda la lista
 * de ids a la RPC `reordenar_fotos` (migración 0014), que deja en la base
 * exactamente lo mismo que `normalizarGaleria` deja en memoria: `orden` igual
 * a la posición (base 0) y `es_principal` solo en la primera. Son funciones
 * puras para poder probarlas sin montar el componente.
 */

/** Lo mínimo que necesita una foto para ordenarse. */
export interface FotoOrdenable {
  id: number;
  es_principal: boolean;
  orden: number;
}

/**
 * La lista con la foto de la posición `desde` movida a la posición `hasta`;
 * las demás se corren un lugar para hacerle espacio.
 *
 * Una posición fuera de rango (negativa, más allá del final o no entera)
 * devuelve una copia sin cambios en vez de lanzar: viene de un clic o de un
 * arrastre, y un gesto inválido —soltar fuera de la grilla, un índice viejo
 * después de un borrado— no tiene que romper el panel, solo no hacer nada.
 *
 * Nunca muta la entrada: la lista es estado de React y la anterior hace falta
 * intacta para volver atrás si la RPC falla.
 */
export function moverFoto<T>(fotos: readonly T[], desde: number, hasta: number): T[] {
  const copia = [...fotos];
  if (!enRango(desde, copia.length) || !enRango(hasta, copia.length)) return copia;
  if (desde === hasta) return copia;

  const [movida] = copia.splice(desde, 1);
  copia.splice(hasta, 0, movida);
  return copia;
}

/**
 * La galería como queda en la base después de `reordenar_fotos`: `orden`
 * igual a la posición y `es_principal` solo en la primera.
 *
 * El panel la aplica antes de llamar a la RPC (actualización optimista), así
 * que lo que se ve y lo que recibe `onCambio` ya es lo que la base va a
 * guardar. Devuelve objetos nuevos; la entrada queda intacta.
 */
export function normalizarGaleria<T extends FotoOrdenable>(fotos: readonly T[]): T[] {
  return fotos.map((foto, i) => ({ ...foto, orden: i, es_principal: i === 0 }));
}

function enRango(posicion: number, largo: number): boolean {
  return Number.isInteger(posicion) && posicion >= 0 && posicion < largo;
}
