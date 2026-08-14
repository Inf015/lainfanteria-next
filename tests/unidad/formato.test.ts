import { describe, expect, it } from 'vitest';
import {
  aLista,
  aParrafos,
  aSlug,
  formatPrecio,
  nombreAuto,
  ordenarFotos,
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
