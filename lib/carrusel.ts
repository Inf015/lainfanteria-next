/**
 * Navegación de un carrusel que se mueve por scroll horizontal.
 *
 * El carrusel no traslada una pista con `transform`: scrollea un contenedor
 * con `scroll-snap`, así el deslizar con el dedo y la rueda del ratón salen
 * gratis y no hay que replicarlos a mano. Lo que sí hace falta es decidir a
 * qué posición saltar en cada paso, y eso es lo que vive acá: funciones puras
 * sobre los `offsetLeft` de las tarjetas, sin tocar el DOM, para poder
 * probarlas sin montar nada.
 */

/**
 * Margen en píxeles para comparar posiciones de scroll.
 *
 * `scrollLeft` no cae en el valor exacto que se pidió: el navegador lo redondea
 * a subpíxeles y el zoom lo corre una fracción. Sin tolerancia, "ya estoy en el
 * final" da falso a 0.5 px del final y el carrusel se traba en la última
 * tarjeta en vez de volver al principio.
 */
const TOLERANCIA = 2;

/**
 * A qué `scrollLeft` ir desde `scroll` en la dirección `dir`.
 *
 * Da la vuelta en los extremos: la rotación automática no debe frenarse al
 * llegar al final. `max` es `scrollWidth - clientWidth`, el tope real del
 * contenedor; la última tarjeta casi nunca arranca ahí, así que el último paso
 * se recorta a `max` en vez de quedar corto.
 */
export function proximaPosicion(
  scroll: number,
  inicios: number[],
  max: number,
  dir: 1 | -1,
): number {
  if (inicios.length === 0 || max <= 0) return 0;

  if (dir === 1) {
    if (scroll >= max - TOLERANCIA) return 0;
    const siguiente = inicios.find((x) => x > scroll + TOLERANCIA);
    return Math.min(siguiente ?? max, max);
  }

  if (scroll <= TOLERANCIA) return max;
  const anterior = [...inicios].reverse().find((x) => x < scroll - TOLERANCIA);
  return Math.max(anterior ?? 0, 0);
}

/**
 * Qué tarjeta está al frente: la que arranca más cerca de la posición actual.
 *
 * "La más cercana" y no "la última que ya pasó" porque en el tope del scroll la
 * última tarjeta puede no llegar a alinearse con el borde, y el indicador
 * quedaría marcando la anterior mientras se ve la última.
 */
export function indiceActivo(scroll: number, inicios: number[]): number {
  if (inicios.length === 0) return 0;
  return inicios.reduce(
    (mejor, x, i) =>
      Math.abs(x - scroll) < Math.abs(inicios[mejor] - scroll) ? i : mejor,
    0,
  );
}
