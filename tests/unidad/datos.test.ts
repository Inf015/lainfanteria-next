import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Comportamiento de la capa de datos ante fallos.
 *
 * El sitio es de contenido: si Supabase no responde, se prefiere una sección
 * vacía antes que un 500. Estas pruebas fijan ese contrato, que es fácil de
 * romper sin darse cuenta al refactorizar.
 */

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

/** Carga lib/supabase con un cliente falso que responde lo que se le indique. */
async function conRespuesta(respuesta: { data: unknown; error: unknown }) {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://falso.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'clave-falsa');

  vi.doMock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: () => respuesta }),
  }));

  return import('@/lib/supabase');
}

describe('consultar()', () => {
  it('devuelve los datos cuando la consulta funciona', async () => {
    const { consultar } = await conRespuesta({ data: [{ id: 1 }], error: null });
    const r = await consultar('prueba', (db) => db.from('x') as never, []);
    expect(r).toEqual([{ id: 1 }]);
  });

  it('usa el respaldo si la consulta devuelve error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { consultar } = await conRespuesta({ data: null, error: { message: 'caída' } });
    const respaldo = [{ id: 99 }];
    const r = await consultar('prueba', (db) => db.from('x') as never, respaldo);
    expect(r).toBe(respaldo);
  });

  it('usa el respaldo si la consulta lanza una excepción', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://falso.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'clave-falsa');
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({
        from: () => {
          throw new Error('red caída');
        },
      }),
    }));
    const { consultar } = await import('@/lib/supabase');
    const respaldo: unknown[] = [];
    const r = await consultar('prueba', (db) => db.from('x') as never, respaldo);
    expect(r).toBe(respaldo);
  });

  it('registra el fallo en vez de tragárselo en silencio', async () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { consultar } = await conRespuesta({ data: null, error: { message: 'ups' } });
    await consultar('secciones activas', (db) => db.from('x') as never, []);
    expect(espia).toHaveBeenCalled();
    expect(String(espia.mock.calls[0][0])).toContain('secciones activas');
  });

  it('trata data null como respaldo, no como lista vacía silenciosa', async () => {
    const { consultar } = await conRespuesta({ data: null, error: null });
    const respaldo = [{ id: 7 }];
    const r = await consultar('prueba', (db) => db.from('x') as never, respaldo);
    expect(r).toBe(respaldo);
  });
});

/**
 * `getRecordsEquipo()` — los récords que no son de ningún miembro.
 *
 * No se prueba la base (eso es `tests/seguridad` contra Postgres real): lo que
 * se fija acá es cómo se arma la consulta, porque el error más caro es mudo.
 * Con `eq('miembro_id', null)` PostgREST compara contra el literal `null`, no
 * matchea ninguna fila y «Sobre nosotros» sale vacía sin ningún error visible.
 */
async function conRecords(respuesta: { data: unknown; error: unknown }) {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://falso.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'clave-falsa');

  const tablas: string[] = [];
  const filtros: { metodo: string; columna: string; valor: unknown }[] = [];

  const consulta = {
    select: () => consulta,
    eq: (columna: string, valor: unknown) => {
      filtros.push({ metodo: 'eq', columna, valor });
      return consulta;
    },
    is: (columna: string, valor: unknown) => {
      filtros.push({ metodo: 'is', columna, valor });
      return consulta;
    },
    then: (resolver: (r: typeof respuesta) => unknown) => resolver(respuesta),
  };

  vi.doMock('@supabase/supabase-js', () => ({
    createClient: () => ({
      from: (tabla: string) => {
        tablas.push(tabla);
        return consulta;
      },
    }),
  }));

  const { getRecordsEquipo } = await import('@/lib/datos');
  return { getRecordsEquipo, tablas, filtros };
}

function filaRecord(over: Record<string, unknown>) {
  return { vigente: true, alcance: null, anio: null, mes: null, ...over };
}

describe('getRecordsEquipo()', () => {
  it('pide la tabla records filtrando con is(miembro_id, null), no con eq', async () => {
    const { getRecordsEquipo, tablas, filtros } = await conRecords({
      data: [],
      error: null,
    });
    await getRecordsEquipo();

    expect(tablas).toEqual(['records']);
    expect(filtros).toEqual([{ metodo: 'is', columna: 'miembro_id', valor: null }]);
  });

  it('devuelve los récords ordenados como los de un miembro', async () => {
    const { getRecordsEquipo } = await conRecords({
      data: [
        filaRecord({ id: 1, alcance: null, anio: 2024 }),
        filaRecord({ id: 2, alcance: 'nacional', anio: 2025, vigente: false }),
        filaRecord({ id: 3, alcance: 'nacional', anio: 2020 }),
        filaRecord({ id: 4, alcance: 'pista', anio: 2026 }),
      ],
      error: null,
    });

    // Vigentes primero y, dentro de ellos, por importancia del alcance; el
    // superado al final aunque sea el más reciente.
    expect((await getRecordsEquipo()).map((r) => r.id)).toEqual([3, 4, 1, 2]);
  });

  it('si la consulta falla, devuelve lista vacía en vez de voltear la página', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getRecordsEquipo } = await conRecords({
      data: null,
      error: { message: 'caída' },
    });
    expect(await getRecordsEquipo()).toEqual([]);
  });
});

describe('cliente sin credenciales', () => {
  it('en desarrollo no rompe: el cliente queda en null', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const mod = await import('@/lib/supabase');
    expect(mod.supabase).toBeNull();
    expect(mod.supabaseConfigurado).toBe(false);
  });

  it('sin cliente, consultar() devuelve el respaldo y avisa', async () => {
    const espia = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const { consultar } = await import('@/lib/supabase');
    const respaldo = [{ id: 1 }];
    const r = await consultar('prueba', (db) => db.from('x') as never, respaldo);
    expect(r).toBe(respaldo);
    expect(espia).toHaveBeenCalled();
  });
});
