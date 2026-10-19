import { describe, expect, it } from 'vitest';
import { fotoAnterior, fotoSiguiente, indiceValido } from '@/lib/indice-foto';

/**
 * T-012-D01/D02: el índice de foto del detalle tiene que ser siempre válido
 * para la galería que se muestra, cambie como cambie (otro auto, fotos que
 * llegan, fotos que se borran).
 */

describe('fotoSiguiente', () => {
  it('sin fotos no hace nada: 0, nunca NaN', () => {
    expect(fotoSiguiente(0, 0)).toBe(0);
    expect(fotoSiguiente(5, 0)).toBe(0);
    expect(fotoSiguiente(NaN, 0)).toBe(0);
  });

  it('con una foto se queda en la misma', () => {
    expect(fotoSiguiente(0, 1)).toBe(0);
  });

  it('con tres avanza y da la vuelta al final', () => {
    expect(fotoSiguiente(0, 3)).toBe(1);
    expect(fotoSiguiente(1, 3)).toBe(2);
    expect(fotoSiguiente(2, 3)).toBe(0);
  });

  it('parte de un índice fuera de rango ya ajustado, no del guardado', () => {
    // Estaba en la 3 de 3 y la galería se achicó a 2: se ve la 2, → va a la 1.
    expect(fotoSiguiente(2, 2)).toBe(0);
    expect(fotoSiguiente(9, 3)).toBe(0);
    expect(fotoSiguiente(NaN, 3)).toBe(1);
    expect(fotoSiguiente(-4, 3)).toBe(1);
  });
});

describe('fotoAnterior', () => {
  it('sin fotos no hace nada: 0, nunca NaN', () => {
    expect(fotoAnterior(0, 0)).toBe(0);
    expect(fotoAnterior(3, 0)).toBe(0);
    expect(fotoAnterior(NaN, 0)).toBe(0);
  });

  it('con una foto se queda en la misma', () => {
    expect(fotoAnterior(0, 1)).toBe(0);
  });

  it('con tres retrocede y da la vuelta al principio', () => {
    expect(fotoAnterior(2, 3)).toBe(1);
    expect(fotoAnterior(1, 3)).toBe(0);
    expect(fotoAnterior(0, 3)).toBe(2);
  });

  it('parte de un índice fuera de rango ya ajustado', () => {
    expect(fotoAnterior(9, 3)).toBe(1);
    expect(fotoAnterior(NaN, 3)).toBe(2);
  });
});

describe('indiceValido', () => {
  it('dentro de rango no cambia', () => {
    expect(indiceValido(0, 3)).toBe(0);
    expect(indiceValido(2, 3)).toBe(2);
  });

  it('si la galería se achica, se ajusta a la última foto', () => {
    expect(indiceValido(2, 1)).toBe(0); // otro auto con una sola foto (D01)
    expect(indiceValido(4, 3)).toBe(2);
  });

  it('sin fotos es 0', () => {
    expect(indiceValido(0, 0)).toBe(0);
    expect(indiceValido(2, 0)).toBe(0);
  });

  it('NaN, infinito o negativo vuelven a un índice válido (D02)', () => {
    expect(indiceValido(NaN, 3)).toBe(0);
    expect(indiceValido(Infinity, 3)).toBe(0);
    expect(indiceValido(-1, 3)).toBe(0);
  });

  it('con fotos que llegan a una galería vacía, arranca en la primera', () => {
    // Galería vacía: las flechas dejan el índice en 0, y al llegar fotos es válido.
    const tras = fotoSiguiente(fotoAnterior(0, 0), 0);
    expect(indiceValido(tras, 2)).toBe(0);
  });

  it.each([0, 1, 3])('para %i fotos, cualquier entrada da un índice usable', (total) => {
    for (const i of [-10, -1, 0, 1, 2, 3, 10, NaN, Infinity, -Infinity, 1.7]) {
      const r = indiceValido(i, total);
      expect(Number.isInteger(r)).toBe(true);
      if (total === 0) expect(r).toBe(0);
      else {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(total);
      }
      for (const f of [fotoSiguiente(i, total), fotoAnterior(i, total)]) {
        expect(Number.isInteger(f)).toBe(true);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThan(Math.max(total, 1));
      }
    }
  });
});
