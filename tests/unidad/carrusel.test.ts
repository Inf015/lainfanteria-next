import { describe, expect, it } from 'vitest';
import { indiceActivo, proximaPosicion } from '@/lib/carrusel';

/**
 * Tres tarjetas de 300 px con 20 px de separación, en una ventana de 640 px:
 * la pista mide 940 px de contenido, así que el tope de scroll son 300 px.
 */
const INICIOS = [0, 320, 640];
const MAX = 300;

describe('proximaPosicion', () => {
  it('avanza a la tarjeta siguiente', () => {
    expect(proximaPosicion(0, INICIOS, MAX, 1)).toBe(300);
  });

  it('recorta el avance al tope real del scroll', () => {
    // La última tarjeta arranca en 640 pero el contenedor no scrollea más allá
    // de 300: pedir 640 dejaría el carrusel pidiendo una posición imposible.
    expect(proximaPosicion(100, INICIOS, MAX, 1)).toBe(300);
  });

  it('desde el final vuelve al principio', () => {
    expect(proximaPosicion(MAX, INICIOS, MAX, 1)).toBe(0);
  });

  it('vuelve al principio aunque falte una fracción de píxel para el final', () => {
    // El navegador redondea scrollLeft; sin tolerancia el carrusel se trababa
    // acá en vez de dar la vuelta.
    expect(proximaPosicion(MAX - 1, INICIOS, MAX, 1)).toBe(0);
  });

  it('retrocede a la tarjeta anterior', () => {
    expect(proximaPosicion(320, INICIOS, MAX, -1)).toBe(0);
  });

  it('desde el principio salta al final', () => {
    expect(proximaPosicion(0, INICIOS, MAX, -1)).toBe(MAX);
    expect(proximaPosicion(1, INICIOS, MAX, -1)).toBe(MAX);
  });

  it('sin tarjetas o sin desborde se queda en cero', () => {
    expect(proximaPosicion(0, [], 300, 1)).toBe(0);
    expect(proximaPosicion(0, INICIOS, 0, 1)).toBe(0);
  });
});

describe('indiceActivo', () => {
  it('marca la tarjeta alineada con el borde', () => {
    expect(indiceActivo(0, INICIOS)).toBe(0);
    expect(indiceActivo(320, INICIOS)).toBe(1);
  });

  it('marca la más cercana cuando el scroll quedó a mitad de camino', () => {
    expect(indiceActivo(180, INICIOS)).toBe(1);
  });

  it('en el tope del scroll marca la última aunque no llegue a alinearse', () => {
    // Con 300 de tope, la tercera tarjeta (640) se ve entera pero el scroll no
    // llega a su offset. "La última que ya pasó" habría marcado la segunda.
    expect(indiceActivo(MAX, [0, 150, 300])).toBe(2);
  });

  it('sin tarjetas no explota', () => {
    expect(indiceActivo(0, [])).toBe(0);
  });
});
