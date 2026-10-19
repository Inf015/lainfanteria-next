import { describe, expect, it } from 'vitest';
import {
  crearCandado,
  enExclusiva,
  moverFoto,
  normalizarGaleria,
  type FotoOrdenable,
} from '@/lib/galeria';

/** Galería de cuatro fotos tal como la deja la RPC: la 10 es la principal. */
function galeria(): FotoOrdenable[] {
  return [
    { id: 10, es_principal: true, orden: 0 },
    { id: 20, es_principal: false, orden: 1 },
    { id: 30, es_principal: false, orden: 2 },
    { id: 40, es_principal: false, orden: 3 },
  ];
}

const ids = (fotos: FotoOrdenable[]) => fotos.map((f) => f.id);

describe('moverFoto', () => {
  it('lleva la primera al final y corre las demás un lugar hacia adelante', () => {
    expect(ids(moverFoto(galeria(), 0, 3))).toEqual([20, 30, 40, 10]);
  });

  it('lleva la última al principio y corre las demás un lugar hacia atrás', () => {
    expect(ids(moverFoto(galeria(), 3, 0))).toEqual([40, 10, 20, 30]);
  });

  it('mueve un lugar a la izquierda y a la derecha (los botones ◀ ▶)', () => {
    expect(ids(moverFoto(galeria(), 2, 1))).toEqual([10, 30, 20, 40]);
    expect(ids(moverFoto(galeria(), 1, 2))).toEqual([10, 30, 20, 40]);
  });

  it('mover a la misma posición no cambia nada', () => {
    expect(ids(moverFoto(galeria(), 2, 2))).toEqual([10, 20, 30, 40]);
  });

  it('con una posición fuera de rango devuelve la misma galería, sin lanzar', () => {
    const original = ids(galeria());
    expect(ids(moverFoto(galeria(), -1, 0))).toEqual(original);
    expect(ids(moverFoto(galeria(), 0, -1))).toEqual(original);
    expect(ids(moverFoto(galeria(), 4, 0))).toEqual(original);
    expect(ids(moverFoto(galeria(), 0, 4))).toEqual(original);
    expect(ids(moverFoto(galeria(), 0.5, 2))).toEqual(original);
    expect(ids(moverFoto(galeria(), 0, Number.NaN))).toEqual(original);
  });

  it('en una galería de una foto no hay a dónde moverla', () => {
    const una = [{ id: 7, es_principal: true, orden: 0 }];
    expect(moverFoto(una, 0, 0)).toEqual(una);
    expect(moverFoto(una, 0, 1)).toEqual(una);
  });

  it('en una galería vacía devuelve una lista vacía', () => {
    expect(moverFoto([], 0, 0)).toEqual([]);
  });

  it('no muta la entrada: la lista anterior hace falta para volver atrás', () => {
    const entrada = galeria();
    const copia = structuredClone(entrada);
    const salida = moverFoto(entrada, 0, 3);

    expect(entrada).toEqual(copia);
    expect(salida).not.toBe(entrada);
  });

  it('devuelve una lista nueva aunque no cambie nada', () => {
    const entrada = galeria();
    expect(moverFoto(entrada, 1, 1)).not.toBe(entrada);
    expect(moverFoto(entrada, 9, 1)).not.toBe(entrada);
  });
});

describe('normalizarGaleria', () => {
  it('deja orden igual a la posición, base 0, como la RPC', () => {
    const desordenada = [
      { id: 30, es_principal: false, orden: 7 },
      { id: 10, es_principal: true, orden: 0 },
      { id: 20, es_principal: false, orden: 7 },
    ];
    expect(normalizarGaleria(desordenada).map((f) => f.orden)).toEqual([0, 1, 2]);
  });

  it('la principal es siempre la primera, y solo ella', () => {
    // La principal vieja (10) quedó al final: deja de serlo.
    const resultado = normalizarGaleria(moverFoto(galeria(), 0, 3));

    expect(resultado[0]).toMatchObject({ id: 20, es_principal: true });
    expect(resultado.filter((f) => f.es_principal)).toHaveLength(1);
    expect(resultado.at(-1)).toMatchObject({ id: 10, es_principal: false });
  });

  it('corrige una galería vieja sin principal o con la principal fuera de lugar', () => {
    const sinPrincipal = [
      { id: 1, es_principal: false, orden: 0 },
      { id: 2, es_principal: false, orden: 1 },
    ];
    const principalSegunda = [
      { id: 1, es_principal: false, orden: 0 },
      { id: 2, es_principal: true, orden: 1 },
    ];

    expect(normalizarGaleria(sinPrincipal).map((f) => f.es_principal)).toEqual([true, false]);
    expect(normalizarGaleria(principalSegunda).map((f) => f.es_principal)).toEqual([
      true,
      false,
    ]);
  });

  it('después de cualquier movimiento hay exactamente una principal y es la primera', () => {
    const n = galeria().length;
    for (let desde = 0; desde < n; desde++) {
      for (let hasta = 0; hasta < n; hasta++) {
        const resultado = normalizarGaleria(moverFoto(galeria(), desde, hasta));
        expect(resultado.map((f) => f.es_principal)).toEqual([true, false, false, false]);
        expect(resultado.map((f) => f.orden)).toEqual([0, 1, 2, 3]);
      }
    }
  });

  it('borrar la principal deja como principal a la que era segunda', () => {
    const restantes = galeria().filter((f) => f.id !== 10);
    expect(normalizarGaleria(restantes)[0]).toMatchObject({
      id: 20,
      es_principal: true,
      orden: 0,
    });
  });

  it('una galería de una foto queda con esa foto como principal en la posición 0', () => {
    expect(normalizarGaleria([{ id: 5, es_principal: false, orden: 3 }])).toEqual([
      { id: 5, es_principal: true, orden: 0 },
    ]);
  });

  it('una galería vacía queda vacía', () => {
    expect(normalizarGaleria([])).toEqual([]);
  });

  it('conserva el resto de los campos y no muta la entrada', () => {
    const entrada = [
      { id: 1, url: 'https://x/1.jpg', es_principal: false, orden: 4 },
      { id: 2, url: 'https://x/2.jpg', es_principal: true, orden: 0 },
    ];
    const copia = structuredClone(entrada);
    const salida = normalizarGaleria(entrada);

    expect(entrada).toEqual(copia);
    expect(salida[0]).not.toBe(entrada[0]);
    expect(salida).toEqual([
      { id: 1, url: 'https://x/1.jpg', es_principal: true, orden: 0 },
      { id: 2, url: 'https://x/2.jpg', es_principal: false, orden: 1 },
    ]);
  });
});

/** Una promesa que se resuelve o rechaza cuando la prueba lo decide. */
function pendiente() {
  let resolver!: () => void;
  let rechazar!: (e: Error) => void;
  const promesa = new Promise<void>((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
}

describe('crearCandado', () => {
  it('se toma una sola vez hasta que se suelta', () => {
    const candado = crearCandado();
    expect(candado.tomar()).toBe(true);
    expect(candado.tomar()).toBe(false);
    candado.soltar();
    expect(candado.tomar()).toBe(true);
  });

  it('avisa cada transición, y soltar dos veces no avisa dos veces', () => {
    const avisos: boolean[] = [];
    const candado = crearCandado((tomado) => avisos.push(tomado));

    candado.tomar();
    candado.tomar(); // rechazado: no es una transición
    candado.soltar();
    candado.soltar();

    expect(avisos).toEqual([true, false]);
  });
});

describe('enExclusiva', () => {
  it('toma el candado en el acto, sin esperar un tick (doble clic)', () => {
    const candado = crearCandado();
    const primera = pendiente();

    void enExclusiva(candado, () => primera.promesa);

    // Todavía no corrió ningún microtask: el candado ya tiene que estar tomado.
    expect(candado.tomado).toBe(true);
    primera.resolver();
  });

  it('dos subidas superpuestas: la segunda se rechaza y no corre (T-011-D01)', async () => {
    const candado = crearCandado();
    const subidaA = pendiente();
    let corrioB = false;

    const a = enExclusiva(candado, () => subidaA.promesa);
    const b = await enExclusiva(candado, async () => {
      corrioB = true;
    });

    expect(b).toBe(false);
    expect(corrioB).toBe(false);

    subidaA.resolver();
    expect(await a).toBe(true);
  });

  it('el candado sigue tomado hasta que la operación TERMINA, no cuando arranca otra', async () => {
    // La secuencia del defecto: A en vuelo, B intenta y rebota, y recién
    // cuando A termina se puede reordenar. Antes, el fin de cualquier subida
    // liberaba el bloqueo aunque hubiera otra pendiente.
    const candado = crearCandado();
    const subidaA = pendiente();
    const a = enExclusiva(candado, () => subidaA.promesa);

    expect(await enExclusiva(candado, async () => {})).toBe(false);
    expect(candado.tomado).toBe(true);

    subidaA.resolver();
    await a;

    expect(candado.tomado).toBe(false);
    expect(await enExclusiva(candado, async () => {})).toBe(true);
  });

  it('una operación que lanza suelta el candado y propaga el error', async () => {
    const candado = crearCandado();
    const op = pendiente();
    const corrida = enExclusiva(candado, () => op.promesa);

    op.rechazar(new Error('red caída'));

    await expect(corrida).rejects.toThrow('red caída');
    expect(candado.tomado).toBe(false);
  });

  it('un rechazo no suelta el candado de la operación que sí está en vuelo', async () => {
    const candado = crearCandado();
    const enVuelo = pendiente();
    const a = enExclusiva(candado, () => enVuelo.promesa);

    await enExclusiva(candado, async () => {});
    await enExclusiva(candado, async () => {});

    expect(candado.tomado).toBe(true);
    enVuelo.resolver();
    await a;
  });
});
