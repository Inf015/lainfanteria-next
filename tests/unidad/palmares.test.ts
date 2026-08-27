import { describe, expect, it } from 'vitest';
import {
  contexto,
  fechaLogro,
  hayMasQueFichas,
  porAnio,
  resumirPalmares,
  totalTrofeos,
} from '@/lib/palmares';
import type { Logro, Miembro } from '@/lib/types';

function logro(parcial: Partial<Logro>): Logro {
  return {
    id: 1,
    miembro_id: 1,
    posicion: 'primero',
    tipo: 'evento',
    titulo: 'Un logro',
    anio: null,
    mes: null,
    ronda: null,
    destacado: false,
    foto_url: null,
    creado_en: '2026-01-01T00:00:00Z',
    ...parcial,
  };
}

function miembro(parcial: Partial<Miembro>): Miembro {
  return {
    id: 1,
    nombre: 'Piloto',
    slug: 'piloto',
    numero: null,
    roles: ['Piloto'],
    biografia: '',
    foto_url: null,
    foto_public_id: null,
    instagram_url: null,
    youtube_url: null,
    trofeos_total: null,
    palmares: [],
    orden: 0,
    activo: true,
    creado_en: '2026-01-01T00:00:00Z',
    ...parcial,
  };
}

describe('fechaLogro', () => {
  it('escribe el mes cuando se conoce', () => {
    expect(fechaLogro(logro({ anio: 2025, mes: 7 }))).toBe('Julio 2025');
  });

  it('deja solo el año cuando no hay mes, que es el caso común', () => {
    expect(fechaLogro(logro({ anio: 2025 }))).toBe('2025');
  });

  it('devuelve vacío si el logro se cargó sin fecha', () => {
    expect(fechaLogro(logro({}))).toBe('');
  });
});

describe('contexto', () => {
  it('numera la puntuable, que es lo que distingue cuatro primeros lugares iguales', () => {
    expect(contexto(logro({ tipo: 'puntuable', ronda: 3 }))).toBe('3ª puntuable');
  });

  it('no inventa número cuando la puntuable no lo trae', () => {
    expect(contexto(logro({ tipo: 'puntuable' }))).toBe('Puntuable');
  });

  it('distingue campeonato de evento suelto', () => {
    expect(contexto(logro({ tipo: 'campeonato' }))).toBe('Campeonato');
    expect(contexto(logro({ tipo: 'evento' }))).toBe('Evento');
  });
});

describe('resumirPalmares', () => {
  it('cuenta por posición y por tipo de competencia', () => {
    const r = resumirPalmares([
      logro({ posicion: 'campeon', tipo: 'campeonato' }),
      logro({ posicion: 'primero', tipo: 'puntuable' }),
      logro({ posicion: 'primero', tipo: 'puntuable' }),
      logro({ posicion: 'tercero', tipo: 'evento' }),
      logro({ posicion: 'otro', tipo: 'evento' }),
    ]);

    expect(r).toEqual({
      campeonatos: 1,
      primeros: 2,
      podios: 4,
      puntuables: 2,
      eventos: 2,
    });
  });

  it('no cuenta como podio un trofeo que no es un puesto', () => {
    expect(resumirPalmares([logro({ posicion: 'otro' })]).podios).toBe(0);
  });
});

describe('totalTrofeos', () => {
  it('manda el total declarado a mano', () => {
    const m = miembro({ trofeos_total: 128, palmares: [logro({}), logro({})] });
    expect(totalTrofeos(m)).toBe(128);
    expect(hayMasQueFichas(m)).toBe(true);
  });

  it('sin total declarado cuenta las fichas cargadas', () => {
    const m = miembro({ palmares: [logro({}), logro({})] });
    expect(totalTrofeos(m)).toBe(2);
    expect(hayMasQueFichas(m)).toBe(false);
  });

  it('un total declarado igual a las fichas no promete nada de más', () => {
    const m = miembro({ trofeos_total: 1, palmares: [logro({})] });
    expect(hayMasQueFichas(m)).toBe(false);
  });
});

describe('porAnio', () => {
  it('agrupa del año más reciente al más viejo', () => {
    const grupos = porAnio([
      logro({ id: 1, anio: 2023 }),
      logro({ id: 2, anio: 2025 }),
      logro({ id: 3, anio: 2025 }),
    ]);

    expect(grupos.map(([anio, ls]) => [anio, ls.length])).toEqual([
      ['2025', 2],
      ['2023', 1],
    ]);
  });

  it('manda al final los que no tienen fecha, no al principio', () => {
    const grupos = porAnio([logro({ id: 1 }), logro({ id: 2, anio: 2020 })]);
    expect(grupos.map(([anio]) => anio)).toEqual(['2020', 'Sin fecha']);
  });
});
