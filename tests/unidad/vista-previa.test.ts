import { describe, expect, it } from 'vitest';
import type { Auto, EstadoAuto } from '@/lib/types';
import {
  armarVistaPrevia,
  precioDeFormulario,
  TEXTO_AVISO,
  type AvisoVistaPrevia,
  type FormAuto,
  type FotoVistaPrevia,
} from '@/lib/vista-previa';

/** Un auto guardado en la base, con todos los campos cargados. */
const GUARDADO: Auto = {
  id: 7,
  marca: 'Ford',
  modelo: 'Mustang GT',
  version: 'GT500',
  anio: '2020',
  motor: '5.0L V8',
  descripcion: 'Con turbo',
  kilometraje: '45,000 km',
  precio: 45000,
  moneda: 'USD',
  estado: 'disponible',
  es_del_equipo: false,
  orden: 2,
  activo: true,
  creado_en: '2026-01-01T00:00:00Z',
};

/** El formulario recién abierto sobre `GUARDADO` (como lo arma `aForm`). */
const FORM: FormAuto = {
  marca: 'Ford',
  modelo: 'Mustang GT',
  version: 'GT500',
  anio: '2020',
  motor: '5.0L V8',
  descripcion: 'Con turbo',
  kilometraje: '45,000 km',
  precio: '45000',
  moneda: 'USD',
  estado: 'disponible',
  es_del_equipo: false,
  orden: '2',
  activo: true,
};

const foto = (id: number, es_principal = false, orden = id): FotoVistaPrevia => ({
  id,
  url: `https://res.cloudinary.com/x/${id}.jpg`,
  es_principal,
  orden,
});

const FOTOS = [foto(1, true), foto(2), foto(3)];

describe('precioDeFormulario', () => {
  it.each([
    ['', null],
    ['   ', null],
    ['abc', null],
    ['-1', null],
    ['-0.01', null],
    ['Infinity', null],
    ['0', 0],
    ['45000', 45000],
    ['1e3', 1000],
    ['99.5', 99.5],
    [' 45000 ', 45000],
  ])('%j → %j', (entrada, esperado) => {
    expect(precioDeFormulario(entrada)).toBe(esperado);
  });
});

describe('armarVistaPrevia — el auto', () => {
  it('recorta los textos con espacios, igual que al guardar', () => {
    const { auto } = armarVistaPrevia(
      {
        ...FORM,
        marca: '  Ford ',
        modelo: ' Mustang GT  ',
        version: ' GT500 ',
        anio: ' 2020',
        motor: '5.0L V8 ',
        descripcion: '\n Con turbo \n',
        kilometraje: ' 45,000 km ',
      },
      FOTOS,
      GUARDADO,
    );
    expect(auto).toMatchObject({
      marca: 'Ford',
      modelo: 'Mustang GT',
      version: 'GT500',
      anio: '2020',
      motor: '5.0L V8',
      descripcion: 'Con turbo',
      kilometraje: '45,000 km',
    });
  });

  it('los opcionales vacíos o solo con espacios quedan sin dato (null)', () => {
    const { auto } = armarVistaPrevia(
      { ...FORM, version: '', anio: '   ', motor: '', descripcion: ' \n ', kilometraje: '' },
      FOTOS,
      GUARDADO,
    );
    expect(auto.version).toBeNull();
    expect(auto.anio).toBeNull();
    expect(auto.motor).toBeNull();
    expect(auto.descripcion).toBeNull();
    expect(auto.kilometraje).toBeNull();
  });

  it('marca y modelo vacíos quedan como texto vacío, no como null', () => {
    const { auto } = armarVistaPrevia({ ...FORM, marca: '  ', modelo: '' }, FOTOS, GUARDADO);
    expect(auto.marca).toBe('');
    expect(auto.modelo).toBe('');
  });

  it('copia precio, moneda y estado del formulario', () => {
    const { auto } = armarVistaPrevia(
      { ...FORM, precio: '1e3', moneda: 'DOP', estado: 'reservado' },
      FOTOS,
      GUARDADO,
    );
    expect(auto.precio).toBe(1000);
    expect(auto.moneda).toBe('DOP');
    expect(auto.estado).toBe('reservado');
  });

  it.each(['', 'abc', '-1'])('con precio %j no inventa un precio: queda null', (precio) => {
    const { auto, avisos } = armarVistaPrevia({ ...FORM, precio }, FOTOS, GUARDADO);
    expect(auto.precio).toBeNull();
    expect(avisos).toContain('precio-invalido');
  });

  it('precio 0 es válido: se muestra, sin aviso', () => {
    const { auto, avisos } = armarVistaPrevia({ ...FORM, precio: '0' }, FOTOS, GUARDADO);
    expect(auto.precio).toBe(0);
    expect(avisos).not.toContain('precio-invalido');
  });

  it('respeta el orden de la galería', () => {
    const fotos = [foto(1, true), foto(3), foto(2)];
    const { auto } = armarVistaPrevia(FORM, fotos, GUARDADO);
    expect(auto.auto_fotos.map((f) => f.id)).toEqual([1, 3, 2]);
  });

  it('pone la principal primero, como el sitio, sin reordenar el resto', () => {
    // Pasa al marcar otra principal: SubirFotos cambia la bandera sin mover la foto.
    const fotos = [foto(1), foto(2), foto(3, true), foto(4)];
    const { auto } = armarVistaPrevia(FORM, fotos, GUARDADO);
    expect(auto.auto_fotos.map((f) => f.id)).toEqual([3, 1, 2, 4]);
  });

  it('no muta las entradas', () => {
    const form = { ...FORM, marca: '  Ford ', precio: 'abc' };
    const fotos = [foto(1), foto(2, true)];
    const guardado = { ...GUARDADO };
    const copias = structuredClone({ form, fotos, guardado });

    const { auto } = armarVistaPrevia(form, fotos, guardado);

    expect({ form, fotos, guardado }).toEqual(copias);
    expect(auto.auto_fotos).not.toBe(fotos);
    expect(fotos.map((f) => f.id)).toEqual([1, 2]);
  });
});

describe('armarVistaPrevia — cambios sin guardar', () => {
  it('auto nuevo (todavía no creado): siempre hay cambios sin guardar', () => {
    const { avisos } = armarVistaPrevia(FORM, [], null);
    expect(avisos).toContain('sin-guardar');
  });

  it('auto existente sin tocar: no hay cambios sin guardar', () => {
    const { avisos } = armarVistaPrevia(FORM, FOTOS, GUARDADO);
    expect(avisos).toEqual([]);
  });

  it('espacios de más que el guardado descartaría no cuentan como cambio', () => {
    const { avisos } = armarVistaPrevia(
      { ...FORM, marca: ' Ford ', motor: '5.0L V8  ', precio: '45000.0', orden: '02' },
      FOTOS,
      GUARDADO,
    );
    expect(avisos).not.toContain('sin-guardar');
  });

  it('un opcional guardado en null y vacío en el formulario no es un cambio', () => {
    const guardado = { ...GUARDADO, version: null, descripcion: null };
    const { avisos } = armarVistaPrevia(
      { ...FORM, version: '', descripcion: '  ' },
      FOTOS,
      guardado,
    );
    expect(avisos).not.toContain('sin-guardar');
  });

  it.each<[string, Partial<FormAuto>]>([
    ['marca', { marca: 'Chevrolet' }],
    ['modelo', { modelo: 'Camaro' }],
    ['versión', { version: '' }],
    ['año', { anio: '2021' }],
    ['motor', { motor: 'V6' }],
    ['descripción', { descripcion: 'Otra' }],
    ['kilometraje', { kilometraje: '50,000 km' }],
    ['precio', { precio: '46000' }],
    ['precio inválido', { precio: 'abc' }],
    ['moneda', { moneda: 'DOP' }],
    ['estado', { estado: 'reservado' }],
    ['del equipo', { es_del_equipo: true }],
    ['orden', { orden: '3' }],
    ['visible', { activo: false }],
  ])('cambiar %s es un cambio sin guardar', (_campo, cambio) => {
    const { avisos } = armarVistaPrevia({ ...FORM, ...cambio }, FOTOS, GUARDADO);
    expect(avisos).toContain('sin-guardar');
  });

  it('las fotos no cuentan: SubirFotos las guarda en el momento', () => {
    const { avisos } = armarVistaPrevia(FORM, [foto(9, true)], GUARDADO);
    expect(avisos).not.toContain('sin-guardar');
  });
});

describe('armarVistaPrevia — tabla de decisión de los avisos', () => {
  // visible × estado × fotos × cambios sin guardar → avisos, en el orden en
  // que se muestran. El precio es válido en todas las filas.
  const filas: [boolean, EstadoAuto, boolean, boolean, AvisoVistaPrevia[]][] = [];
  for (const visible of [true, false])
    for (const estado of ['disponible', 'reservado', 'vendido'] as EstadoAuto[])
      for (const conFotos of [true, false])
        for (const sinGuardar of [false, true]) {
          const esperado: AvisoVistaPrevia[] = [];
          if (sinGuardar) esperado.push('sin-guardar');
          if (!visible) esperado.push('oculto');
          if (estado === 'vendido') esperado.push('vendido');
          if (!conFotos) esperado.push('sin-fotos');
          filas.push([visible, estado, conFotos, sinGuardar, esperado]);
        }

  it('cubre las 24 combinaciones', () => {
    expect(filas).toHaveLength(24);
  });

  it.each(filas)(
    'visible=%s, estado=%s, con fotos=%s, sin guardar=%s → %j',
    (visible, estado, conFotos, sinGuardar, esperado) => {
      const form = { ...FORM, activo: visible, estado };
      // Guardado igual al formulario, salvo cuando la fila pide cambios sin guardar.
      const guardado = {
        ...GUARDADO,
        activo: visible,
        estado,
        marca: sinGuardar ? 'Otra' : GUARDADO.marca,
      };
      const { avisos } = armarVistaPrevia(form, conFotos ? FOTOS : [], guardado);
      expect(avisos).toEqual(esperado);
    },
  );

  it('el precio inválido se suma a los demás avisos, al final', () => {
    const { avisos } = armarVistaPrevia(
      { ...FORM, activo: false, estado: 'vendido', precio: '' },
      [],
      null,
    );
    expect(avisos).toEqual(['sin-guardar', 'oculto', 'vendido', 'sin-fotos', 'precio-invalido']);
  });
});

describe('TEXTO_AVISO', () => {
  it('tiene los textos que pide el brief', () => {
    expect(TEXTO_AVISO).toEqual({
      'sin-guardar': 'Cambios sin guardar',
      oculto: 'No visible en el sitio',
      vendido: 'Vendido: no aparece en el sitio',
      'sin-fotos': 'Sin fotos',
      'precio-invalido': 'Precio inválido',
    });
  });
});
