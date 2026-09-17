import { describe, expect, it } from 'vitest';
import {
  MS_ANIMACION,
  animarScroll,
  indiceActivo,
  paginas,
  posicionAnimada,
  proximaPosicion,
  type RelojCuadros,
} from '@/lib/carrusel';

/**
 * Tres tarjetas de 300 px con 20 px de separación, en una ventana de 640 px:
 * la pista mide 940 px de contenido, así que el tope de scroll son 300 px.
 * Con esa geometría solo la primera tarjeta llega a pegarse al borde, así que
 * las paradas alcanzables son dos: el inicio y el tope.
 */
const INICIOS = [0, 320, 640];
const MAX = 300;
const DESTINOS = paginas(INICIOS, MAX).map((p) => p.destino);

describe('paginas', () => {
  it('descarta los inicios a los que el scroll no llega y termina en el tope', () => {
    expect(paginas(INICIOS, MAX)).toEqual([
      { destino: 0, tarjeta: 0 },
      { destino: 300, tarjeta: 2 },
    ]);
  });

  it('la última parada es de la última tarjeta: es la que se ve al llegar', () => {
    // Ocho tarjetas de 384 px con 24 px de separación en 1200 px de ventana:
    // entran tres, el tope son 2040 y los dos últimos inicios son inalcanzables.
    const inicios = [0, 408, 816, 1224, 1632, 2040, 2448, 2856];
    const paradas = paginas(inicios, 2040);

    expect(paradas).toHaveLength(6);
    expect(paradas.at(-1)).toEqual({ destino: 2040, tarjeta: 7 });
    // Sin esto, el último punto pedía 2856 —imposible— y nunca podía marcarse
    // como el actual, porque el scroll se topa en 2040.
    expect(indiceActivo(2040, paradas.map((p) => p.destino))).toBe(paradas.length - 1);
  });

  it('una sola parada cuando no hay nada que scrollear', () => {
    expect(paginas([0], 0)).toEqual([{ destino: 0, tarjeta: 0 }]);
    expect(paginas([0, 320], -1)).toEqual([{ destino: 0, tarjeta: 0 }]);
  });

  it('sin tarjetas no hay paradas', () => {
    expect(paginas([], 300)).toEqual([]);
  });
});

describe('proximaPosicion', () => {
  it('avanza a la parada siguiente', () => {
    expect(proximaPosicion(0, DESTINOS, MAX, 1)).toBe(300);
  });

  it('no propone una posición más allá del tope del scroll', () => {
    expect(proximaPosicion(100, DESTINOS, MAX, 1)).toBe(300);
    expect(proximaPosicion(100, INICIOS, MAX, 1)).toBe(300);
  });

  it('desde el final vuelve al principio', () => {
    expect(proximaPosicion(MAX, DESTINOS, MAX, 1)).toBe(0);
  });

  it('vuelve al principio aunque falte una fracción de píxel para el final', () => {
    // El navegador redondea scrollLeft; sin tolerancia el carrusel se trababa
    // acá en vez de dar la vuelta.
    expect(proximaPosicion(MAX - 1, DESTINOS, MAX, 1)).toBe(0);
    expect(proximaPosicion(MAX - 2.1, DESTINOS, MAX, 1)).toBe(300);
  });

  it('retrocede a la parada anterior', () => {
    expect(proximaPosicion(300, DESTINOS, MAX, -1)).toBe(0);
  });

  it('desde el principio salta al final', () => {
    expect(proximaPosicion(0, DESTINOS, MAX, -1)).toBe(MAX);
    expect(proximaPosicion(2, DESTINOS, MAX, -1)).toBe(MAX);
    expect(proximaPosicion(2.1, DESTINOS, MAX, -1)).toBe(0);
  });

  it('no devuelve una posición pasada del tope aunque el scroll lo esté', () => {
    // El rebote de iOS deja `scrollLeft` por encima del máximo durante el gesto.
    expect(proximaPosicion(700, INICIOS, MAX, -1)).toBe(MAX);
    expect(proximaPosicion(700, INICIOS, MAX, 1)).toBe(0);
  });

  it('con una sola tarjeta o sin desborde se queda en cero', () => {
    expect(proximaPosicion(0, [], 300, 1)).toBe(0);
    expect(proximaPosicion(0, [0], 0, 1)).toBe(0);
    expect(proximaPosicion(0, [0], 0, -1)).toBe(0);
    expect(proximaPosicion(0, DESTINOS, 0, 1)).toBe(0);
  });
});

describe('posicionAnimada', () => {
  it('arranca en el origen y termina exactamente en el destino', () => {
    expect(posicionAnimada(0, 590, 0)).toBe(0);
    expect(posicionAnimada(0, 590, 1)).toBe(590);
  });

  it('avanza más de la mitad a mitad de camino: frena al llegar, no al salir', () => {
    const mitad = posicionAnimada(0, 590, 0.5);
    expect(mitad).toBeGreaterThan(295);
    expect(mitad).toBeLessThan(590);
  });

  it('nunca se pasa del destino aunque el cuadro llegue tarde', () => {
    // El último cuadro puede caer después del tiempo previsto (una pestaña que
    // vuelve del fondo). Sin recortar, el scroll se iría más allá del destino.
    expect(posicionAnimada(0, 590, 1.8)).toBe(590);
    expect(posicionAnimada(0, 590, -0.3)).toBe(0);
  });

  it('funciona hacia atrás', () => {
    expect(posicionAnimada(590, 0, 1)).toBe(0);
    expect(posicionAnimada(590, 0, 0.5)).toBeLessThan(295);
  });
});

/**
 * Reloj de mentira: guarda el cuadro pendiente en vez de pedírselo al
 * navegador, así se puede avanzar el tiempo a mano.
 */
function relojFalso() {
  let tiempo = 0;
  let siguienteId = 1;
  const pendientes = new Map<number, (ahora: number) => void>();

  const reloj: RelojCuadros = {
    ahora: () => tiempo,
    pedirCuadro: (cb) => {
      const id = siguienteId++;
      pendientes.set(id, cb);
      return id;
    },
    cancelarCuadro: (id) => {
      pendientes.delete(id);
    },
  };

  return {
    reloj,
    /** Corre el cuadro pendiente, si queda alguno, con el tiempo indicado. */
    avanzarA(ms: number) {
      tiempo = ms;
      const [id, cb] = [...pendientes.entries()][0] ?? [];
      if (cb === undefined || id === undefined) return false;
      pendientes.delete(id);
      cb(ms);
      return true;
    },
    /**
     * Corre el cuadro pendiente **ejecutado tarde**: el navegador le pasa el
     * timestamp del principio del cuadro (`timestampCuadro`) pero, si el hilo
     * venía ocupado, para cuando el callback corre el reloj ya va por
     * `relojEn`. Las dos lecturas no coinciden, y ahí vivía T-007-D01.
     */
    correrCuadroTarde(timestampCuadro: number, relojEn: number) {
      tiempo = relojEn;
      const [id, cb] = [...pendientes.entries()][0] ?? [];
      if (cb === undefined || id === undefined) return false;
      pendientes.delete(id);
      cb(timestampCuadro);
      return true;
    },
    get pendientes() {
      return pendientes.size;
    },
  };
}

describe('animarScroll', () => {
  it('mueve la posición en cada cuadro y termina en el destino', () => {
    // Esta es la prueba de regresión del defecto que dejó el carrusel quieto:
    // pedía `scrollTo({ behavior: 'smooth' })`, que el navegador no arranca
    // cuando el paso lo dispara un temporizador y no un clic. Acá la animación
    // la escribe el propio carrusel, y se comprueba que escribe.
    const posiciones: number[] = [];
    const { reloj, avanzarA } = relojFalso();

    animarScroll((x) => posiciones.push(x), 0, 590, reloj);

    avanzarA(0);
    avanzarA(MS_ANIMACION / 3);
    avanzarA(MS_ANIMACION);

    expect(posiciones).toHaveLength(3);
    expect(posiciones[0]).toBe(0);
    expect(posiciones[1]).toBeGreaterThan(0);
    expect(posiciones[1]).toBeLessThan(590);
    expect(posiciones.at(-1)).toBe(590);
  });

  it('no pide más cuadros una vez que llegó', () => {
    const { reloj, avanzarA } = relojFalso();
    animarScroll(() => {}, 0, 590, reloj);

    avanzarA(0);
    expect(avanzarA(MS_ANIMACION)).toBe(true);
    expect(avanzarA(MS_ANIMACION + 100)).toBe(false);
  });

  it('cortar deja de mover a mitad de camino', () => {
    // Es lo que pasa cuando el puntero entra en el carrusel mientras un paso
    // está corriendo: el intervalo se limpia, pero el cuadro ya estaba pedido.
    const posiciones: number[] = [];
    const { reloj, avanzarA } = relojFalso();

    const cortar = animarScroll((x) => posiciones.push(x), 0, 590, reloj);

    avanzarA(0);
    avanzarA(MS_ANIMACION / 3);
    cortar();

    expect(avanzarA(MS_ANIMACION)).toBe(false);
    expect(posiciones).toHaveLength(2);
    expect(posiciones.at(-1)).toBeLessThan(590);
  });

  // El aviso de fin existe por T-007-D01. El carrusel apaga el `scroll-snap`
  // de la pista mientras anima —si no, el navegador reajusta cada posición
  // intermedia a la parada más cercana y el paso se ve como un salto— y lo
  // vuelve a encender al terminar. Encenderlo un cuadro antes de tiempo, con
  // el scroll todavía entre dos tarjetas, provoca exactamente el salto que se
  // quería eliminar: de ahí que "terminó" tenga que decirlo quien escribe las
  // posiciones, y no deducirlo el llamador leyendo el reloj por su cuenta.
  it('avisa el fin una sola vez, después de escribir la última posición', () => {
    const eventos: string[] = [];
    const { reloj, avanzarA } = relojFalso();

    animarScroll(
      (x) => eventos.push(`escribe ${x}`),
      0,
      590,
      reloj,
      () => eventos.push('fin'),
    );

    avanzarA(0);
    avanzarA(MS_ANIMACION / 3);
    expect(eventos).not.toContain('fin');

    avanzarA(MS_ANIMACION);
    expect(eventos.filter((e) => e === 'fin')).toHaveLength(1);
    expect(eventos.at(-1)).toBe('fin');
    expect(eventos.at(-2)).toBe('escribe 590');
  });

  it('no avisa el fin con un cuadro todavía pendiente, aunque el reloj ya haya pasado los MS_ANIMACION', () => {
    // El caso exacto que reportó QA: el cuadro trae el timestamp de los 300 ms
    // (t = 0,67 del recorrido) pero se ejecuta tan tarde que el reloj ya marca
    // 460, más que los 450 que dura el paso. Quien dedujera el fin releyendo el
    // reloj daría el paso por terminado con el scroll en 397,7 de 413 y otro
    // cuadro pedido.
    const posiciones: number[] = [];
    let fines = 0;
    // Sin desestructurar `pendientes`: es un getter y hay que leerlo vivo.
    const falso = relojFalso();

    animarScroll((x) => posiciones.push(x), 0, 413, falso.reloj, () => {
      fines += 1;
    });

    falso.avanzarA(0);
    falso.correrCuadroTarde(300, MS_ANIMACION + 10);

    expect(posiciones.at(-1)).toBeCloseTo(397.7, 1);
    expect(fines, 'avisó el fin con la animación todavía a mitad de camino').toBe(0);
    expect(falso.pendientes, 'no dejó pedido el cuadro que falta').toBe(1);

    // Y cuando llega el cuadro que sí completa el recorrido, ahí sí avisa.
    falso.correrCuadroTarde(MS_ANIMACION, MS_ANIMACION * 3);
    expect(posiciones.at(-1)).toBe(413);
    expect(fines).toBe(1);
  });

  it('no avisa el fin si se cortó antes de llegar', () => {
    let fines = 0;
    const { reloj, avanzarA } = relojFalso();

    const cortar = animarScroll(() => {}, 0, 590, reloj, () => {
      fines += 1;
    });

    avanzarA(0);
    avanzarA(MS_ANIMACION / 3);
    cortar();

    expect(avanzarA(MS_ANIMACION)).toBe(false);
    expect(fines).toBe(0);
  });

  it('cortar dos veces, o después de terminar, no rompe nada', () => {
    const { reloj, avanzarA } = relojFalso();
    const cortar = animarScroll(() => {}, 0, 590, reloj);

    avanzarA(0);
    avanzarA(MS_ANIMACION);

    expect(() => {
      cortar();
      cortar();
    }).not.toThrow();
  });
});

describe('indiceActivo', () => {
  it('marca la parada alineada con el borde', () => {
    expect(indiceActivo(0, DESTINOS)).toBe(0);
    expect(indiceActivo(300, DESTINOS)).toBe(1);
  });

  it('marca la más cercana cuando el scroll quedó a mitad de camino', () => {
    expect(indiceActivo(200, DESTINOS)).toBe(1);
    expect(indiceActivo(100, DESTINOS)).toBe(0);
  });

  it('en un empate exacto gana la primera', () => {
    expect(indiceActivo(150, DESTINOS)).toBe(0);
  });

  it('sin paradas no explota', () => {
    expect(indiceActivo(0, [])).toBe(0);
  });
});
