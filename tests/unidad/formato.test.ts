import { describe, expect, it } from 'vitest';
import {
  aInputFechaHora,
  aLista,
  aParrafos,
  aSlug,
  deInputFechaHora,
  fechaCorta,
  fechaLarga,
  formatPrecio,
  nombreAuto,
  ordenarFotos,
  slugUnico,
  soloDigitos,
} from '@/lib/formato';

describe('formatPrecio', () => {
  it('usa US$ para dólares y RD$ para pesos', () => {
    expect(formatPrecio(45000, 'USD')).toBe('US$ 45,000');
    expect(formatPrecio(2500, 'DOP')).toBe('RD$ 2,500');
  });

  it('separa los miles', () => {
    expect(formatPrecio(1234567, 'USD')).toBe('US$ 1,234,567');
  });

  it('redondea: los precios del sitio no llevan decimales', () => {
    expect(formatPrecio(90000.4, 'USD')).toBe('US$ 90,000');
    expect(formatPrecio(90000.5, 'USD')).toBe('US$ 90,001');
  });

  it('no rompe con cero ni con valores inválidos', () => {
    expect(formatPrecio(0, 'USD')).toBe('US$ 0');
    expect(formatPrecio(NaN, 'USD')).toBe('US$ 0');
    expect(formatPrecio(Infinity, 'DOP')).toBe('RD$ 0');
  });
});

describe('aSlug', () => {
  it('saca las tildes en vez de comerse la letra', () => {
    // El bug clásico: un rango mal escrito devuelve "campen"
    expect(aSlug('Campeón DADR 2024')).toBe('campeon-dadr-2024');
    expect(aSlug('La Infantería')).toBe('la-infanteria');
    expect(aSlug('Ñandú')).toBe('nandu');
  });

  it('pasa a minúsculas y une con guiones', () => {
    expect(aSlug('La Infantería gana en Santo Domingo')).toBe(
      'la-infanteria-gana-en-santo-domingo',
    );
  });

  it('descarta signos y espacios de los extremos', () => {
    expect(aSlug('  ¿Qué pasó en la pista?  ')).toBe('que-paso-en-la-pista');
    expect(aSlug('Ñandú & Co.')).toBe('nandu-co');
    expect(aSlug('---hola---')).toBe('hola');
  });

  it('nunca deja un guion al final aunque tenga que cortar', () => {
    const largo = aSlug('a'.repeat(60) + ' ' + 'b'.repeat(60));
    expect(largo.length).toBeLessThanOrEqual(80);
    expect(largo.endsWith('-')).toBe(false);
  });

  it('devuelve cadena vacía si no queda nada utilizable', () => {
    expect(aSlug('¿¡...!?')).toBe('');
    expect(aSlug('')).toBe('');
  });
});

describe('slugUnico', () => {
  it('deja el slug tal cual si está libre', () => {
    expect(slugUnico('jose-perez', [])).toBe('jose-perez');
    expect(slugUnico('jose-perez', ['maria-gomez'])).toBe('jose-perez');
  });

  it('numera los homónimos, como hizo la migración', () => {
    // "José Pérez" y "Jose Perez" dan el mismo slug y la columna es única
    expect(slugUnico('jose-perez', ['jose-perez'])).toBe('jose-perez-2');
    expect(slugUnico('jose-perez', ['jose-perez', 'jose-perez-2'])).toBe('jose-perez-3');
  });

  it('salta los huecos en vez de reusar un sufijo ocupado', () => {
    expect(slugUnico('jose-perez', ['jose-perez', 'jose-perez-3'])).toBe('jose-perez-2');
  });

  it('no se confunde con slugs que solo empiezan igual', () => {
    expect(slugUnico('jose', ['jose-perez'])).toBe('jose');
  });

  it('nunca devuelve uno ya ocupado', () => {
    const ocupados = ['a', 'a-2', 'a-3', 'a-4'];
    expect(ocupados).not.toContain(slugUnico('a', ocupados));
  });
});

describe('aLista', () => {
  it('separa por coma y limpia espacios', () => {
    expect(aLista('S, M, L, XL')).toEqual(['S', 'M', 'L', 'XL']);
    expect(aLista('Negro,Rojo')).toEqual(['Negro', 'Rojo']);
  });

  it('descarta vacíos por comas de más', () => {
    expect(aLista('S,,M, ,L')).toEqual(['S', 'M', 'L']);
    expect(aLista('')).toEqual([]);
    expect(aLista('   ')).toEqual([]);
  });
});

describe('nombreAuto', () => {
  it('arma el nombre con lo que haya', () => {
    expect(
      nombreAuto({ marca: 'Ford', modelo: 'Mustang', version: 'GT500', anio: '2024' }),
    ).toBe('Ford Mustang GT500 2024');
  });

  it('saltea las partes faltantes sin dejar espacios dobles', () => {
    expect(nombreAuto({ marca: 'Ford', modelo: 'Mustang', version: null, anio: null })).toBe(
      'Ford Mustang',
    );
    expect(
      nombreAuto({ marca: 'Ford', modelo: 'Mustang', version: null, anio: '2024' }),
    ).toBe('Ford Mustang 2024');
  });
});

describe('soloDigitos', () => {
  it('deja el número usable en un enlace tel:', () => {
    // Este fue un bug real: se generaba "tel:(829) 686-3273"
    expect(soloDigitos('(829) 686-3273')).toBe('8296863273');
    expect(soloDigitos('+1 829-686-3273')).toBe('18296863273');
  });

  it('no rompe con cadena vacía', () => {
    expect(soloDigitos('')).toBe('');
  });
});

describe('ordenarFotos', () => {
  it('pone la principal primero', () => {
    const fotos = [
      { id: 1, es_principal: false, orden: 0 },
      { id: 2, es_principal: true, orden: 5 },
      { id: 3, es_principal: false, orden: 1 },
    ];
    expect(ordenarFotos(fotos).map((f) => f.id)).toEqual([2, 1, 3]);
  });

  it('sin principal, respeta el orden', () => {
    const fotos = [
      { id: 1, es_principal: false, orden: 2 },
      { id: 2, es_principal: false, orden: 0 },
    ];
    expect(ordenarFotos(fotos).map((f) => f.id)).toEqual([2, 1]);
  });

  it('no muta el arreglo original', () => {
    const fotos = [
      { id: 1, es_principal: false, orden: 1 },
      { id: 2, es_principal: true, orden: 0 },
    ];
    ordenarFotos(fotos);
    expect(fotos[0].id).toBe(1);
  });
});

describe('aParrafos', () => {
  it('separa por saltos de línea', () => {
    expect(aParrafos('uno\ndos')).toEqual(['uno', 'dos']);
  });

  it('trata el doble salto como un solo corte, sin dejar vacíos', () => {
    // Caso real: una biografía escrita con línea en blanco entre párrafos
    expect(aParrafos('Primero.\n\nSegundo.')).toEqual(['Primero.', 'Segundo.']);
  });

  it('soporta saltos de Windows', () => {
    expect(aParrafos('uno\r\ndos')).toEqual(['uno', 'dos']);
  });

  it('descarta espacios sobrantes y líneas en blanco', () => {
    expect(aParrafos('  uno  \n\n\n   \n dos ')).toEqual(['uno', 'dos']);
  });

  it('devuelve lista vacía si no hay contenido', () => {
    expect(aParrafos('')).toEqual([]);
    expect(aParrafos('\n\n  \n')).toEqual([]);
  });
});

describe('fechas', () => {
  it('formatea en hora dominicana, no en la del servidor', () => {
    // Bug real de hidratación: 00:13 UTC es del día anterior en RD, así que
    // servidor (UTC) y navegador calculaban días distintos
    expect(fechaLarga('2026-01-27T00:13:36+00:00')).toBe('26 de enero de 2026');
    expect(fechaLarga('2025-04-29T00:12:55+00:00')).toBe('28 de abril de 2025');
  });

  it('da el mismo resultado sin importar la zona del proceso', () => {
    const previa = process.env.TZ;
    const fecha = '2026-01-27T00:13:36+00:00';
    const resultados = new Set<string>();
    for (const tz of ['UTC', 'America/Santo_Domingo', 'Asia/Tokyo']) {
      process.env.TZ = tz;
      resultados.add(fechaLarga(fecha));
    }
    process.env.TZ = previa;
    expect(resultados.size).toBe(1);
  });

  it('no rompe con nulo ni con basura', () => {
    expect(fechaLarga(null)).toBe('');
    expect(fechaLarga('')).toBe('');
    expect(fechaLarga('no es una fecha')).toBe('');
    expect(fechaCorta(null)).toBe('');
  });
});

describe('fecha y hora del formulario', () => {
  it('muestra en el input la hora dominicana, no la UTC', () => {
    // El bug: con toISOString() una noticia de las 20:00 de Santo Domingo se
    // editaba como "00:00 del día siguiente"
    expect(aInputFechaHora('2026-08-15T00:00:00Z')).toBe('2026-08-14T20:00');
    expect(aInputFechaHora('2026-08-14T18:30:00Z')).toBe('2026-08-14T14:30');
  });

  it('interpreta lo escrito como hora dominicana al guardar', () => {
    expect(deInputFechaHora('2026-08-14T20:00')).toBe('2026-08-15T00:00:00.000Z');
    expect(deInputFechaHora('2026-08-14T14:30')).toBe('2026-08-14T18:30:00.000Z');
  });

  it('el ida y vuelta no corre el instante', () => {
    // Es el defecto de fondo: abrir una noticia y guardarla sin tocar la fecha
    // la desplazaba cuatro horas cada vez
    for (const iso of [
      '2026-08-15T00:00:00.000Z',
      '2026-01-27T00:13:00.000Z',
      '2025-12-31T23:59:00.000Z',
      '2026-06-01T12:00:00.000Z',
    ]) {
      expect(deInputFechaHora(aInputFechaHora(iso))).toBe(iso);
    }
  });

  it('da el mismo resultado sin importar la zona del proceso', () => {
    const previa = process.env.TZ;
    const entradas = new Set<string>();
    const salidas = new Set<string | null>();
    for (const tz of ['UTC', 'America/Santo_Domingo', 'Asia/Tokyo']) {
      process.env.TZ = tz;
      entradas.add(aInputFechaHora('2026-08-15T00:00:00Z'));
      salidas.add(deInputFechaHora('2026-08-14T20:00'));
    }
    process.env.TZ = previa;
    expect(entradas.size).toBe(1);
    expect(salidas.size).toBe(1);
  });

  it('la medianoche dominicana no se convierte en "24:00"', () => {
    expect(aInputFechaHora('2026-08-15T04:00:00Z')).toBe('2026-08-15T00:00');
  });

  it('rechaza fechas y horas que no existen en el calendario', () => {
    // `Date.UTC` no rechaza: normaliza. Sin control explícito, estas entraban
    // como otro instante —30 de febrero se guardaba como 2 de marzo— y el
    // formulario mostraba después una fecha que nadie escribió.
    expect(deInputFechaHora('2026-02-30T12:00')).toBeNull();
    expect(deInputFechaHora('2026-13-01T12:00')).toBeNull();
    expect(deInputFechaHora('2026-08-14T24:00')).toBeNull();
    expect(deInputFechaHora('2026-00-10T12:00')).toBeNull();
    expect(deInputFechaHora('2026-08-00T12:00')).toBeNull();
    expect(deInputFechaHora('2026-04-31T12:00')).toBeNull();
    expect(deInputFechaHora('2026-08-14T12:60')).toBeNull();
    expect(deInputFechaHora('2026-08-14T12:00:60')).toBeNull();
    // Año bisiesto: el 29 de febrero existe en 2024 y no en 2026
    expect(deInputFechaHora('2026-02-29T12:00')).toBeNull();
    expect(deInputFechaHora('2024-02-29T12:00')).toBe('2024-02-29T16:00:00.000Z');
  });

  it('sigue aceptando las válidas de los bordes', () => {
    expect(deInputFechaHora('2026-08-14T00:00')).toBe('2026-08-14T04:00:00.000Z');
    expect(deInputFechaHora('2026-12-31T23:59')).toBe('2027-01-01T03:59:00.000Z');
    expect(deInputFechaHora('2026-08-14T12:00:30')).toBe('2026-08-14T16:00:30.000Z');
  });

  it('no rompe con nulo ni con basura', () => {
    expect(aInputFechaHora(null)).toBe('');
    expect(aInputFechaHora('')).toBe('');
    expect(aInputFechaHora('no es una fecha')).toBe('');
    expect(deInputFechaHora(null)).toBeNull();
    expect(deInputFechaHora('')).toBeNull();
    expect(deInputFechaHora('15/08/2026')).toBeNull();
    expect(deInputFechaHora('2026-08-15')).toBeNull();
  });
});
