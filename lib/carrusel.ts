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

/** Una parada del carrusel: a dónde scrollear y qué tarjeta queda al frente. */
export interface Pagina {
  /** `scrollLeft` de esta parada. */
  destino: number;
  /** Índice de la tarjeta que queda pegada al borde izquierdo. */
  tarjeta: number;
}

/**
 * Las paradas **alcanzables** del carrusel.
 *
 * No hay una parada por tarjeta: cuando entran tres a la vez, las últimas dos
 * nunca llegan a pegarse al borde izquierdo porque el scroll se topa antes. Si
 * los indicadores se hicieran una por tarjeta, los últimos puntos apuntarían a
 * una posición imposible y nunca podrían quedar marcados como el actual.
 *
 * Así que las paradas son los inicios que el scroll sí puede alcanzar, más el
 * tope; el tope se atribuye a la última tarjeta, que es la que se ve al llegar.
 */
export function paginas(inicios: number[], max: number): Pagina[] {
  if (inicios.length === 0) return [];
  if (max <= 0) return [{ destino: 0, tarjeta: 0 }];

  const alcanzables = inicios
    .map((destino, tarjeta) => ({ destino, tarjeta }))
    .filter((p) => p.destino < max - TOLERANCIA);

  return [...alcanzables, { destino: max, tarjeta: inicios.length - 1 }];
}

/**
 * A qué `scrollLeft` ir desde `scroll` en la dirección `dir`.
 *
 * Da la vuelta en los extremos: la rotación automática no debe frenarse al
 * llegar al final. `destinos` son las paradas alcanzables (ver `paginas`), así
 * que el último paso ya cae en el tope y no queda corto.
 */
export function proximaPosicion(
  scroll: number,
  destinos: number[],
  max: number,
  dir: 1 | -1,
): number {
  if (destinos.length === 0 || max <= 0) return 0;

  if (dir === 1) {
    if (scroll >= max - TOLERANCIA) return 0;
    const siguiente = destinos.find((x) => x > scroll + TOLERANCIA);
    return Math.min(siguiente ?? max, max);
  }

  if (scroll <= TOLERANCIA) return max;
  const anterior = [...destinos].reverse().find((x) => x < scroll - TOLERANCIA);
  return Math.min(Math.max(anterior ?? 0, 0), max);
}

/** Cuánto dura el desplazamiento de un paso. */
export const MS_ANIMACION = 450;

/**
 * Dónde está el scroll a mitad de camino entre `desde` y `hasta`, con `t` de 0
 * a 1.
 *
 * El carrusel anima el desplazamiento cuadro a cuadro en vez de pedir
 * `scrollTo({ behavior: 'smooth' })`: esa animación no arranca cuando el paso
 * lo dispara un temporizador y no un clic —así quedó el carrusel quieto la
 * primera vez, aunque el temporizador corría y calculaba bien el destino—.
 *
 * La suavidad es un ease-out cúbico: arranca rápido y frena al llegar, que es
 * como se lee un carrusel que avanza solo.
 */
export function posicionAnimada(desde: number, hasta: number, t: number): number {
  const avance = Math.min(Math.max(t, 0), 1);
  const suavizado = 1 - (1 - avance) ** 3;
  return desde + (hasta - desde) * suavizado;
}

/**
 * En qué parada está el carrusel: la que queda más cerca de la posición actual.
 *
 * "La más cercana" y no "la última que ya pasó" porque el scroll se detiene
 * entre dos paradas mientras se arrastra con el dedo, y el indicador tiene que
 * marcar la que se está viendo.
 */
export function indiceActivo(scroll: number, destinos: number[]): number {
  if (destinos.length === 0) return 0;
  return destinos.reduce(
    (mejor, x, i) =>
      Math.abs(x - scroll) < Math.abs(destinos[mejor] - scroll) ? i : mejor,
    0,
  );
}

/**
 * El reloj y los cuadros que usa `animarScroll`.
 *
 * Se inyectan en vez de llamar a `performance` y `requestAnimationFrame`
 * directamente para poder probar la animación sin navegador: el defecto que
 * dejó el carrusel quieto vivía justo acá, en quién mueve el scroll.
 */
export interface RelojCuadros {
  ahora: () => number;
  pedirCuadro: (cb: (ahora: number) => void) => number;
  cancelarCuadro: (id: number) => void;
}

/** El reloj real del navegador. */
export const RELOJ_NAVEGADOR: RelojCuadros = {
  ahora: () => performance.now(),
  pedirCuadro: (cb) => requestAnimationFrame(cb),
  cancelarCuadro: (id) => cancelAnimationFrame(id),
};

/**
 * Lleva el scroll de `desde` a `hasta` escribiendo la posición en cada cuadro.
 *
 * No usa `scrollTo({ behavior: 'smooth' })`: el navegador no arranca esa
 * animación cuando el paso lo dispara un temporizador en vez de un clic, y el
 * carrusel se quedaba quieto aunque el temporizador corriera y calculara bien
 * el destino. Escribir `scrollLeft` cuadro a cuadro sí se mueve siempre.
 *
 * Devuelve la función que corta la animación a mitad de camino —hace falta al
 * pausar, al desmontar y cuando llega un paso nuevo encima del anterior.
 */
export function animarScroll(
  aplicar: (posicion: number) => void,
  desde: number,
  hasta: number,
  reloj: RelojCuadros,
): () => void {
  const arranque = reloj.ahora();
  let pendiente: number | null = null;

  const cuadro = (ahora: number) => {
    const t = (ahora - arranque) / MS_ANIMACION;
    aplicar(posicionAnimada(desde, hasta, t));
    pendiente = t < 1 ? reloj.pedirCuadro(cuadro) : null;
  };

  pendiente = reloj.pedirCuadro(cuadro);

  return () => {
    if (pendiente === null) return;
    reloj.cancelarCuadro(pendiente);
    pendiente = null;
  };
}
