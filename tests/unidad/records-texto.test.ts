import { describe, expect, it } from 'vitest';
import { lineaHistorial, textoDistintivoNacional } from '@/app/(sitio)/_componentes/records-texto';
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
    vigente: false,
    fuente_url: null,
    creado_en: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('textoDistintivoNacional', () => {
  it('uno solo: singular sin número', () => {
    expect(textoDistintivoNacional(1)).toBe('RÉCORD NACIONAL');
  });

  it('dos o más: número y plural', () => {
    expect(textoDistintivoNacional(2)).toBe('2 RÉCORDS NACIONALES');
    expect(textoDistintivoNacional(3)).toBe('3 RÉCORDS NACIONALES');
  });
});

describe('lineaHistorial', () => {
  it('con cifras: marca · título · fecha', () => {
    const r = record({ titulo: '1/4 de milla', tiempo_s: 9.874, anio: 2024, mes: 5 });
    expect(lineaHistorial(r)).toBe('9.874 s · 1/4 de milla · Mayo 2024');
  });

  it('hito (sin cifras): título · fecha', () => {
    const r = record({ titulo: 'Primer dominicano en correr el ROC', anio: 2022 });
    expect(lineaHistorial(r)).toBe('Primer dominicano en correr el ROC · 2022');
  });

  it('sin fecha: no deja un separador colgando', () => {
    const r = record({ titulo: 'Piloto más joven en ganar el nacional' });
    expect(lineaHistorial(r)).toBe('Piloto más joven en ganar el nacional');
  });

  it('con cifras y sin fecha: marca · título, sin colgar', () => {
    const r = record({ titulo: '1/4 de milla', velocidad: 198, unidad_velocidad: 'mph' });
    expect(lineaHistorial(r)).toBe('198 mph · 1/4 de milla');
  });
});
