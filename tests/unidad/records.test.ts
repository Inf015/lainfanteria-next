import { describe, expect, it } from 'vitest';
import {
  NOMBRE_ALCANCE,
  SIMBOLO_VELOCIDAD,
  etiquetaRecord,
  formatearMarca,
  formatearTiempo,
  formatearVelocidad,
  ordenarRecords,
  recordsNacionalesVigentes,
  recordsVigentes,
  tieneCifras,
} from '@/lib/records';
import type { RecordDeportivo } from '@/lib/types';

function record(overrides: Partial<RecordDeportivo> = {}): RecordDeportivo {
  return {
    id: 1,
    miembro_id: 1,
    titulo: '1/4 de milla',
    categoria: null,
    tiempo_s: null,
    velocidad: null,
    unidad_velocidad: null,
    alcance: null,
    auto: null,
    lugar: null,
    anio: null,
    mes: null,
    vigente: true,
    fuente_url: null,
    creado_en: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('formatearTiempo', () => {
  it('siempre muestra tres decimales', () => {
    expect(formatearTiempo(9.874)).toBe('9.874 s');
    expect(formatearTiempo(10)).toBe('10.000 s');
  });

  it('respeta los límites de la columna numeric(8,3)', () => {
    expect(formatearTiempo(0.001)).toBe('0.001 s');
    expect(formatearTiempo(99999.999)).toBe('99999.999 s');
  });

  it('acepta el valor como string, como puede serializarlo PostgREST', () => {
    expect(formatearTiempo('9.874')).toBe('9.874 s');
  });

  it('nulo, cero, negativo, NaN o texto no numérico → null', () => {
    expect(formatearTiempo(null)).toBeNull();
    expect(formatearTiempo(0)).toBeNull();
    expect(formatearTiempo(-1)).toBeNull();
    expect(formatearTiempo(NaN)).toBeNull();
    expect(formatearTiempo('abc')).toBeNull();
  });
});

describe('formatearVelocidad', () => {
  it('hasta dos decimales, sin ceros sobrantes', () => {
    expect(formatearVelocidad(142.5, 'mph')).toBe('142.5 mph');
    expect(formatearVelocidad(238, 'km_h')).toBe('238 km/h');
    expect(formatearVelocidad(199.999, 'mph')).toBe('200 mph');
  });

  it('acepta el valor como string', () => {
    expect(formatearVelocidad('142.5', 'mph')).toBe('142.5 mph');
  });

  it('sin unidad → null, tenga o no un valor', () => {
    expect(formatearVelocidad(142.5, null)).toBeNull();
    expect(formatearVelocidad(null, null)).toBeNull();
  });

  it('nulo, cero, negativo, NaN o texto no numérico → null', () => {
    expect(formatearVelocidad(null, 'mph')).toBeNull();
    expect(formatearVelocidad(0, 'mph')).toBeNull();
    expect(formatearVelocidad(-5, 'mph')).toBeNull();
    expect(formatearVelocidad(NaN, 'mph')).toBeNull();
    expect(formatearVelocidad('abc', 'mph')).toBeNull();
  });
});

describe('formatearMarca', () => {
  /**
   * Tabla de decisión completa (T-001-D01, QA ronda 1): tiempo {válido, nulo,
   * inválido} × velocidad {válida, nula, inválida-con-unidad, sin-unidad},
   * las 12 celdas de la sección 5 del brief, con el resultado esperado
   * literal y, en la misma fila, si esa combinación cuenta como cifra.
   * Incluye explícitamente una velocidad negativa con unidad válida: es
   * inválida por el valor (≤ 0), no por faltarle la unidad.
   */
  const MATRIZ = [
    {
      tiempoEtq: 'válido (9.874)',
      tiempo_s: 9.874,
      velEtq: 'válida (142.5 mph)',
      velocidad: 142.5,
      unidad_velocidad: 'mph' as const,
      esperado: '9.874 s @ 142.5 mph',
      cifras: true,
    },
    {
      tiempoEtq: 'válido (9.874)',
      tiempo_s: 9.874,
      velEtq: 'nula',
      velocidad: null,
      unidad_velocidad: null,
      esperado: '9.874 s',
      cifras: true,
    },
    {
      tiempoEtq: 'válido (9.874)',
      tiempo_s: 9.874,
      velEtq: 'inválida (-1 con unidad mph)',
      velocidad: -1,
      unidad_velocidad: 'mph' as const,
      esperado: '9.874 s',
      cifras: true,
    },
    {
      tiempoEtq: 'válido (9.874)',
      tiempo_s: 9.874,
      velEtq: 'sin unidad (142.5)',
      velocidad: 142.5,
      unidad_velocidad: null,
      esperado: '9.874 s',
      cifras: true,
    },
    {
      tiempoEtq: 'nulo',
      tiempo_s: null,
      velEtq: 'válida (142.5 mph)',
      velocidad: 142.5,
      unidad_velocidad: 'mph' as const,
      esperado: '142.5 mph',
      cifras: true,
    },
    {
      tiempoEtq: 'nulo',
      tiempo_s: null,
      velEtq: 'nula',
      velocidad: null,
      unidad_velocidad: null,
      esperado: null,
      cifras: false,
    },
    {
      tiempoEtq: 'nulo',
      tiempo_s: null,
      velEtq: 'inválida (-1 con unidad mph)',
      velocidad: -1,
      unidad_velocidad: 'mph' as const,
      esperado: null,
      cifras: false,
    },
    {
      tiempoEtq: 'nulo',
      tiempo_s: null,
      velEtq: 'sin unidad (142.5)',
      velocidad: 142.5,
      unidad_velocidad: null,
      esperado: null,
      cifras: false,
    },
    {
      tiempoEtq: 'inválido (0)',
      tiempo_s: 0,
      velEtq: 'válida (142.5 mph)',
      velocidad: 142.5,
      unidad_velocidad: 'mph' as const,
      esperado: '142.5 mph',
      cifras: true,
    },
    {
      tiempoEtq: 'inválido (0)',
      tiempo_s: 0,
      velEtq: 'nula',
      velocidad: null,
      unidad_velocidad: null,
      esperado: null,
      cifras: false,
    },
    {
      tiempoEtq: 'inválido (0)',
      tiempo_s: 0,
      velEtq: 'inválida (-1 con unidad mph)',
      velocidad: -1,
      unidad_velocidad: 'mph' as const,
      esperado: null,
      cifras: false,
    },
    {
      tiempoEtq: 'inválido (0)',
      tiempo_s: 0,
      velEtq: 'sin unidad (142.5)',
      velocidad: 142.5,
      unidad_velocidad: null,
      esperado: null,
      cifras: false,
    },
  ];

  it.each(MATRIZ)(
    'tiempo $tiempoEtq × velocidad $velEtq → $esperado',
    ({ tiempo_s, velocidad, unidad_velocidad, esperado, cifras }) => {
      const r = { tiempo_s, velocidad, unidad_velocidad };
      expect(formatearMarca(r)).toBe(esperado);
      expect(tieneCifras(r)).toBe(cifras);
    },
  );
});

describe('tieneCifras y etiquetaRecord', () => {
  it('sin alcance y con cifras → "Récord"', () => {
    const r = record({ alcance: null, tiempo_s: 9.874, velocidad: null, unidad_velocidad: null });
    expect(tieneCifras(r)).toBe(true);
    expect(etiquetaRecord(r)).toBe('Récord');
  });

  it('sin alcance y sin cifras → "Hito"', () => {
    const r = record({ alcance: null, tiempo_s: null, velocidad: null, unidad_velocidad: null });
    expect(tieneCifras(r)).toBe(false);
    expect(etiquetaRecord(r)).toBe('Hito');
  });

  it('con alcance → el nombre del alcance, tenga o no cifras', () => {
    const conCifras = record({
      alcance: 'pista',
      tiempo_s: null,
      velocidad: 198,
      unidad_velocidad: 'mph',
    });
    expect(tieneCifras(conCifras)).toBe(true);
    expect(etiquetaRecord(conCifras)).toBe('Récord de pista');
  });

  it('hito con alcance nacional → "Récord nacional": el alcance manda sobre las cifras', () => {
    const hito = record({ alcance: 'nacional', tiempo_s: null, velocidad: null, unidad_velocidad: null });
    expect(tieneCifras(hito)).toBe(false);
    expect(etiquetaRecord(hito)).toBe('Récord nacional');
  });
});

describe('NOMBRE_ALCANCE y SIMBOLO_VELOCIDAD', () => {
  it('traducen cada valor de los enums de la base', () => {
    expect(NOMBRE_ALCANCE).toEqual({
      nacional: 'Récord nacional',
      pista: 'Récord de pista',
      evento: 'Récord de evento',
    });
    expect(SIMBOLO_VELOCIDAD).toEqual({ mph: 'mph', km_h: 'km/h' });
  });
});

describe('ordenarRecords', () => {
  it('vigentes antes que superados', () => {
    const superado = record({ id: 1, vigente: false });
    const vigente = record({ id: 2, vigente: true });
    expect(ordenarRecords([superado, vigente]).map((r) => r.id)).toEqual([2, 1]);
  });

  it('entre vigentes: nacional > pista > evento > sin alcance', () => {
    const sinAlcance = record({ id: 1, alcance: null });
    const evento = record({ id: 2, alcance: 'evento' });
    const pista = record({ id: 3, alcance: 'pista' });
    const nacional = record({ id: 4, alcance: 'nacional' });
    expect(ordenarRecords([sinAlcance, evento, pista, nacional]).map((r) => r.id)).toEqual([
      4, 3, 2, 1,
    ]);
  });

  it('mismo alcance: año más reciente primero, sin año al final', () => {
    const sinAnio = record({ id: 1, alcance: 'nacional', anio: null });
    const anio2020 = record({ id: 2, alcance: 'nacional', anio: 2020 });
    const anio2024 = record({ id: 3, alcance: 'nacional', anio: 2024 });
    expect(ordenarRecords([sinAnio, anio2020, anio2024]).map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it('mismo año: mes más reciente primero, sin mes al final', () => {
    const sinMes = record({ id: 1, alcance: 'nacional', anio: 2024, mes: null });
    const mes3 = record({ id: 2, alcance: 'nacional', anio: 2024, mes: 3 });
    const mes8 = record({ id: 3, alcance: 'nacional', anio: 2024, mes: 8 });
    expect(ordenarRecords([sinMes, mes3, mes8]).map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it('mismo alcance, año y mes: id descendente, el cargado más reciente primero', () => {
    const a = record({ id: 5, alcance: 'nacional', anio: 2024, mes: 3 });
    const b = record({ id: 9, alcance: 'nacional', anio: 2024, mes: 3 });
    expect(ordenarRecords([a, b]).map((r) => r.id)).toEqual([9, 5]);
  });

  it('no muta el arreglo original', () => {
    const records = [record({ id: 1, vigente: false }), record({ id: 2, vigente: true })];
    const copia = [...records];
    ordenarRecords(records);
    expect(records).toEqual(copia);
  });
});

describe('recordsVigentes', () => {
  it('vacío da vacío', () => {
    expect(recordsVigentes([])).toEqual([]);
  });

  it('deja afuera los superados y conserva el orden recibido', () => {
    const vigente1 = record({ id: 1, vigente: true });
    const superado = record({ id: 2, vigente: false });
    const vigente2 = record({ id: 3, vigente: true });
    expect(recordsVigentes([vigente1, superado, vigente2]).map((r) => r.id)).toEqual([1, 3]);
  });
});

describe('recordsNacionalesVigentes', () => {
  it('vacío da vacío', () => {
    expect(recordsNacionalesVigentes([])).toEqual([]);
  });

  it('nacional superado queda afuera', () => {
    const r = record({ alcance: 'nacional', vigente: false });
    expect(recordsNacionalesVigentes([r])).toEqual([]);
  });

  it('pista vigente queda afuera: solo nacional suma', () => {
    const r = record({ alcance: 'pista', vigente: true });
    expect(recordsNacionalesVigentes([r])).toEqual([]);
  });

  it('hito nacional vigente cuenta', () => {
    const hito = record({
      alcance: 'nacional',
      vigente: true,
      tiempo_s: null,
      velocidad: null,
      unidad_velocidad: null,
    });
    expect(recordsNacionalesVigentes([hito])).toEqual([hito]);
  });

  it('hito sin alcance no cuenta', () => {
    const hito = record({
      alcance: null,
      vigente: true,
      tiempo_s: null,
      velocidad: null,
      unidad_velocidad: null,
    });
    expect(recordsNacionalesVigentes([hito])).toEqual([]);
  });

  it('conserva el orden recibido', () => {
    const a = record({ id: 1, alcance: 'nacional', vigente: true });
    const b = record({ id: 2, alcance: 'nacional', vigente: true });
    expect(recordsNacionalesVigentes([b, a]).map((r) => r.id)).toEqual([2, 1]);
  });
});
