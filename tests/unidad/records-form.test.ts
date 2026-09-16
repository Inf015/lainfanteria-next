import { describe, expect, it } from 'vitest';
import {
  aFilaRecord,
  aplicarBorrado,
  aplicarGuardado,
  aplicarRecordsDeMiembro,
  formDesdeRecord,
  formVacio,
  validarRecord,
  type FormRecord,
} from '@/lib/records-form';
import type { Miembro, RecordDeportivo } from '@/lib/types';

function form(overrides: Partial<FormRecord> = {}): FormRecord {
  return {
    ...formVacio(),
    titulo: '1/4 de milla',
    alcance: 'nacional',
    ...overrides,
  };
}

function record(overrides: Partial<RecordDeportivo> = {}): RecordDeportivo {
  return {
    id: 1,
    miembro_id: 7,
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

function miembro(overrides: Partial<Miembro> = {}): Miembro {
  return {
    id: 1,
    nombre: 'T002 Piloto',
    slug: 't002-piloto',
    numero: null,
    roles: ['Piloto'],
    biografia: '',
    foto_url: null,
    foto_public_id: null,
    instagram_url: null,
    youtube_url: null,
    trofeos_total: null,
    palmares: [],
    records: [],
    orden: 0,
    activo: true,
    creado_en: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('formVacio', () => {
  it('alcance sin elegir, unidad mph por defecto, vigente marcado', () => {
    const f = formVacio();
    expect(f.alcance).toBe('');
    expect(f.unidad_velocidad).toBe('mph');
    expect(f.vigente).toBe(true);
    expect(f.titulo).toBe('');
  });
});

describe('validarRecord — título', () => {
  it('vacío o solo espacios es inválido', () => {
    expect(validarRecord(form({ titulo: '' }))).toBe('Escribí el título del récord.');
    expect(validarRecord(form({ titulo: '   ' }))).toBe('Escribí el título del récord.');
  });

  it('con contenido es válido (resto del form completo)', () => {
    expect(validarRecord(form())).toBeNull();
  });
});

describe('validarRecord — alcance', () => {
  it('sin elegir (\'\') es inválido', () => {
    expect(validarRecord(form({ alcance: '' }))).toBe(
      'Elegí el alcance: si no suma como récord nacional, elegí Ninguno.',
    );
  });

  it('"ninguno" es válido: elegido a propósito, no suma', () => {
    expect(validarRecord(form({ alcance: 'ninguno' }))).toBeNull();
  });

  it('pista y evento son válidos', () => {
    expect(validarRecord(form({ alcance: 'pista' }))).toBeNull();
    expect(validarRecord(form({ alcance: 'evento' }))).toBeNull();
  });
});

describe('validarRecord — tiempo', () => {
  const MSG = 'El tiempo tiene que ser un número mayor que cero, con hasta 3 decimales.';

  it('vacío es válido: es un hito', () => {
    expect(validarRecord(form({ tiempo_s: '' }))).toBeNull();
  });

  it('0 es inválido', () => {
    expect(validarRecord(form({ tiempo_s: '0' }))).toBe(MSG);
  });

  it('0.001 es válido (límite de 3 decimales)', () => {
    expect(validarRecord(form({ tiempo_s: '0.001' }))).toBeNull();
  });

  it('0.0001 es inválido: más de 3 decimales', () => {
    expect(validarRecord(form({ tiempo_s: '0.0001' }))).toBe(MSG);
  });

  it('-1 es inválido', () => {
    expect(validarRecord(form({ tiempo_s: '-1' }))).toBe(MSG);
  });

  it('99999.999 es válido (límite superior)', () => {
    expect(validarRecord(form({ tiempo_s: '99999.999' }))).toBeNull();
  });

  it('100000 es inválido: supera el límite', () => {
    expect(validarRecord(form({ tiempo_s: '100000' }))).toBe(MSG);
  });

  it('"abc" es inválido', () => {
    expect(validarRecord(form({ tiempo_s: 'abc' }))).toBe(MSG);
  });
});

describe('validarRecord — velocidad', () => {
  const MSG = 'La velocidad tiene que ser un número mayor que cero, con hasta 2 decimales.';

  it('vacía es válida: es un hito', () => {
    expect(validarRecord(form({ velocidad: '' }))).toBeNull();
  });

  it('0.01 es válida (límite de 2 decimales)', () => {
    expect(validarRecord(form({ velocidad: '0.01' }))).toBeNull();
  });

  it('0.001 es inválida: más de 2 decimales', () => {
    expect(validarRecord(form({ velocidad: '0.001' }))).toBe(MSG);
  });

  it('9999.99 es válida (límite superior)', () => {
    expect(validarRecord(form({ velocidad: '9999.99' }))).toBeNull();
  });

  it('10000 es inválida: supera el límite', () => {
    expect(validarRecord(form({ velocidad: '10000' }))).toBe(MSG);
  });
});

describe('validarRecord — separador decimal', () => {
  it('acepta coma o punto, y espacios alrededor', () => {
    expect(validarRecord(form({ tiempo_s: '9,874' }))).toBeNull();
    expect(validarRecord(form({ tiempo_s: '9.874' }))).toBeNull();
    expect(validarRecord(form({ tiempo_s: ' 9.874 ' }))).toBeNull();
  });

  it('no acepta separador de miles', () => {
    expect(validarRecord(form({ tiempo_s: '1.234,5' }))).toBe(
      'El tiempo tiene que ser un número mayor que cero, con hasta 3 decimales.',
    );
  });
});

describe('validarRecord — mes y año', () => {
  it('mes sin año es inválido', () => {
    expect(validarRecord(form({ mes: '3', anio: '' }))).toBe(
      'Si ponés el mes, poné también el año.',
    );
  });

  it('mes con año es válido', () => {
    expect(validarRecord(form({ mes: '3', anio: '2024' }))).toBeNull();
  });

  it('año sin mes es válido', () => {
    expect(validarRecord(form({ anio: '2024', mes: '' }))).toBeNull();
  });

  it('1949 es inválido: fuera del rango', () => {
    expect(validarRecord(form({ anio: '1949' }))).toBe('El año tiene que estar entre 1950 y 2100.');
  });

  it('1950 es válido (límite inferior)', () => {
    expect(validarRecord(form({ anio: '1950' }))).toBeNull();
  });

  it('2100 es válido (límite superior)', () => {
    expect(validarRecord(form({ anio: '2100' }))).toBeNull();
  });

  it('2101 es inválido: fuera del rango', () => {
    expect(validarRecord(form({ anio: '2101' }))).toBe('El año tiene que estar entre 1950 y 2100.');
  });

  it('año vacío es válido', () => {
    expect(validarRecord(form({ anio: '' }))).toBeNull();
  });
});

describe('validarRecord — fuente', () => {
  const MSG = 'La fuente tiene que ser un enlace http(s).';

  it('vacía es válida', () => {
    expect(validarRecord(form({ fuente_url: '' }))).toBeNull();
  });

  it('https:// es válida', () => {
    expect(validarRecord(form({ fuente_url: 'https://youtube.com/x' }))).toBeNull();
  });

  it('HTTP:// (mayúsculas) es válida', () => {
    expect(validarRecord(form({ fuente_url: 'HTTP://example.com' }))).toBeNull();
  });

  it('ftp:// es inválida', () => {
    expect(validarRecord(form({ fuente_url: 'ftp://example.com' }))).toBe(MSG);
  });

  it('javascript: es inválida', () => {
    expect(validarRecord(form({ fuente_url: 'javascript:alert(1)' }))).toBe(MSG);
  });
});

describe('aFilaRecord', () => {
  it('recorta espacios y convierte vacíos a null', () => {
    const fila = aFilaRecord(
      form({
        titulo: '  1/4 de milla  ',
        categoria: '  Street  ',
        auto: '',
        lugar: '  ',
        fuente_url: '',
      }),
      7,
    );
    expect(fila.titulo).toBe('1/4 de milla');
    expect(fila.categoria).toBe('Street');
    expect(fila.auto).toBeNull();
    expect(fila.lugar).toBeNull();
    expect(fila.fuente_url).toBeNull();
  });

  it('anio y mes vacíos son null; con valor, number', () => {
    const vacio = aFilaRecord(form({ anio: '', mes: '' }), 7);
    expect(vacio.anio).toBeNull();
    expect(vacio.mes).toBeNull();

    const cargado = aFilaRecord(form({ anio: '2024', mes: '3' }), 7);
    expect(cargado.anio).toBe(2024);
    expect(cargado.mes).toBe(3);
  });

  it('tiempo y velocidad vacíos son null; con valor, number (acepta coma)', () => {
    const vacio = aFilaRecord(form({ tiempo_s: '', velocidad: '' }), 7);
    expect(vacio.tiempo_s).toBeNull();
    expect(vacio.velocidad).toBeNull();

    const cargado = aFilaRecord(form({ tiempo_s: '9,874', velocidad: '142.5' }), 7);
    expect(cargado.tiempo_s).toBe(9.874);
    expect(cargado.velocidad).toBe(142.5);
  });

  it("alcance 'ninguno' se guarda como null", () => {
    const fila = aFilaRecord(form({ alcance: 'ninguno' }), 7);
    expect(fila.alcance).toBeNull();
  });

  it('alcance nacional/pista/evento se guarda tal cual', () => {
    expect(aFilaRecord(form({ alcance: 'nacional' }), 7).alcance).toBe('nacional');
    expect(aFilaRecord(form({ alcance: 'pista' }), 7).alcance).toBe('pista');
    expect(aFilaRecord(form({ alcance: 'evento' }), 7).alcance).toBe('evento');
  });

  it('velocidad vacía da unidad null aunque el select tenga mph', () => {
    const fila = aFilaRecord(form({ velocidad: '', unidad_velocidad: 'mph' }), 7);
    expect(fila.velocidad).toBeNull();
    expect(fila.unidad_velocidad).toBeNull();
  });

  it('velocidad cargada conserva la unidad elegida', () => {
    const fila = aFilaRecord(form({ velocidad: '238', unidad_velocidad: 'km_h' }), 7);
    expect(fila.velocidad).toBe(238);
    expect(fila.unidad_velocidad).toBe('km_h');
  });

  it('acepta miembroId null, para T-004', () => {
    const fila = aFilaRecord(form(), null);
    expect(fila.miembro_id).toBeNull();
  });

  it('conserva vigente y fuente válida', () => {
    const fila = aFilaRecord(
      form({ vigente: false, fuente_url: 'https://youtube.com/x' }),
      7,
    );
    expect(fila.vigente).toBe(false);
    expect(fila.fuente_url).toBe('https://youtube.com/x');
  });
});

describe('formDesdeRecord → aFilaRecord: ida y vuelta', () => {
  it('tiempo + velocidad nacional', () => {
    const r = record({
      miembro_id: 7,
      titulo: '1/4 de milla',
      tiempo_s: 9.874,
      velocidad: 142.5,
      unidad_velocidad: 'mph',
      alcance: 'nacional',
      vigente: true,
    });
    const fila = aFilaRecord(formDesdeRecord(r), r.miembro_id);
    expect(fila).toEqual({
      miembro_id: 7,
      titulo: '1/4 de milla',
      categoria: null,
      tiempo_s: 9.874,
      velocidad: 142.5,
      unidad_velocidad: 'mph',
      alcance: 'nacional',
      auto: null,
      lugar: null,
      anio: null,
      mes: null,
      vigente: true,
      fuente_url: null,
    });
  });

  it('solo tiempo (sin velocidad, sin unidad)', () => {
    const r = record({
      miembro_id: 7,
      titulo: '1/8 de milla',
      tiempo_s: 6.12,
      velocidad: null,
      unidad_velocidad: null,
      alcance: 'pista',
    });
    const fila = aFilaRecord(formDesdeRecord(r), r.miembro_id);
    expect(fila.tiempo_s).toBe(6.12);
    expect(fila.velocidad).toBeNull();
    expect(fila.unidad_velocidad).toBeNull();
    expect(fila.alcance).toBe('pista');
  });

  it('hito sin alcance', () => {
    const r = record({
      miembro_id: 7,
      titulo: 'Primer dominicano en correr el ROC',
      alcance: null,
    });
    const fila = aFilaRecord(formDesdeRecord(r), r.miembro_id);
    expect(fila.titulo).toBe('Primer dominicano en correr el ROC');
    expect(fila.tiempo_s).toBeNull();
    expect(fila.velocidad).toBeNull();
    expect(fila.alcance).toBeNull();
  });

  it('hito nacional', () => {
    const r = record({
      miembro_id: 7,
      titulo: 'Piloto más joven en ganar el nacional',
      alcance: 'nacional',
    });
    const f = formDesdeRecord(r);
    expect(f.alcance).toBe('nacional');
    const fila = aFilaRecord(f, r.miembro_id);
    expect(fila.alcance).toBe('nacional');
    expect(fila.tiempo_s).toBeNull();
    expect(fila.velocidad).toBeNull();
  });
});

describe('formDesdeRecord — alcance nulo muestra "ninguno", no ""', () => {
  it('alcance null → \'ninguno\'', () => {
    const r = record({ alcance: null });
    expect(formDesdeRecord(r).alcance).toBe('ninguno');
  });
});

describe('aplicarGuardado', () => {
  it('reemplaza por id cuando ya existe', () => {
    const lista = [record({ id: 11, titulo: 'Uno' }), record({ id: 12, titulo: 'Dos' })];
    const actualizado = aplicarGuardado(lista, record({ id: 11, titulo: 'Uno editado' }));
    expect(actualizado).toHaveLength(2);
    expect(actualizado.find((r) => r.id === 11)?.titulo).toBe('Uno editado');
    expect(actualizado.find((r) => r.id === 12)?.titulo).toBe('Dos');
  });

  it('inserta cuando el id no está en la lista', () => {
    const lista = [record({ id: 11 })];
    const actualizado = aplicarGuardado(lista, record({ id: 99, titulo: 'Nuevo' }));
    expect(actualizado.map((r) => r.id).sort()).toEqual([11, 99]);
  });

  it('reordena con ordenarRecords (vigentes primero)', () => {
    const lista = [record({ id: 11, vigente: false })];
    const actualizado = aplicarGuardado(lista, record({ id: 12, vigente: true }));
    expect(actualizado.map((r) => r.id)).toEqual([12, 11]);
  });
});

describe('aplicarBorrado', () => {
  it('saca la fila por id', () => {
    const lista = [record({ id: 11 }), record({ id: 12 })];
    expect(aplicarBorrado(lista, 11).map((r) => r.id)).toEqual([12]);
  });

  it('no falla si el id ya no está (borrado concurrente)', () => {
    const lista = [record({ id: 11 })];
    expect(aplicarBorrado(lista, 99)).toEqual(lista);
  });
});

describe('aplicarRecordsDeMiembro — T-002-D01: respuesta tardía no contamina otro miembro', () => {
  it('actualizar los records de A no toca los de B en la lista de miembros', () => {
    const recordA = record({ id: 11, miembro_id: 1, vigente: true });
    const recordB = record({ id: 21, miembro_id: 2, vigente: true });
    const miembros = [miembro({ id: 1, records: [recordA] }), miembro({ id: 2, records: [recordB] })];

    const filaA = record({ id: 11, miembro_id: 1, vigente: false });
    const actualizados = aplicarRecordsDeMiembro(miembros, 1, (records) =>
      aplicarGuardado(records, filaA),
    );

    expect(actualizados.find((m) => m.id === 1)?.records).toEqual([filaA]);
    expect(actualizados.find((m) => m.id === 2)?.records).toEqual([recordB]);
  });

  it('el modal abierto de B no cambia cuando llega la respuesta de A (misma lógica que MiembrosAdmin)', () => {
    const recordB = record({ id: 21, miembro_id: 2, vigente: true });
    const abiertoB = miembro({ id: 2, records: [recordB] });
    const filaA = record({ id: 11, miembro_id: 1, vigente: false });

    const miembroIdDeLaRespuesta = 1;
    const actualizar = (records: RecordDeportivo[]) => aplicarGuardado(records, filaA);
    const resultado =
      abiertoB.id === miembroIdDeLaRespuesta
        ? { ...abiertoB, records: actualizar(abiertoB.records ?? []) }
        : abiertoB;

    expect(resultado).toBe(abiertoB);
    expect(resultado.records).toEqual([recordB]);
  });
});

describe('aplicarGuardado / aplicarBorrado — T-002-D02: acciones rápidas concurrentes no se pisan', () => {
  const inicial = [
    record({ id: 11, miembro_id: 1, vigente: true }),
    record({ id: 12, miembro_id: 1, vigente: true }),
  ];

  it('dos "marcar superado" en cualquier orden dejan ambas filas aplicadas', () => {
    const r11Superado = { ...inicial[0], vigente: false };
    const r12Superado = { ...inicial[1], vigente: false };

    const ordenAB = aplicarGuardado(aplicarGuardado(inicial, r11Superado), r12Superado);
    const ordenBA = aplicarGuardado(aplicarGuardado(inicial, r12Superado), r11Superado);

    for (const resultado of [ordenAB, ordenBA]) {
      expect(resultado).toHaveLength(2);
      expect(resultado.find((r) => r.id === 11)?.vigente).toBe(false);
      expect(resultado.find((r) => r.id === 12)?.vigente).toBe(false);
    }
  });

  it('borrar una fila y actualizar otra durante la espera: la borrada no reaparece', () => {
    const trasBorrado = aplicarBorrado(inicial, 11);
    const r12Superado = { ...inicial[1], vigente: false };
    const resultado = aplicarGuardado(trasBorrado, r12Superado);

    expect(resultado.map((r) => r.id)).toEqual([12]);
    expect(resultado.find((r) => r.id === 12)?.vigente).toBe(false);
  });

  it('actualizar y luego borrar la misma fila: queda borrada, sin importar el orden de llegada', () => {
    const r11Superado = { ...inicial[0], vigente: false };
    const resultado = aplicarBorrado(aplicarGuardado(inicial, r11Superado), 11);
    expect(resultado.map((r) => r.id)).toEqual([12]);
  });
});
