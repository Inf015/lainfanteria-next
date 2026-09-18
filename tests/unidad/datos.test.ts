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
  vi.unstubAllGlobals();
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
 * Acá **no se sustituye la capa de datos**: el cliente de Supabase es el real y
 * arma la petición él mismo. Lo único reemplazado es la red (`fetch`), que es
 * lo que `docs/pm/contexto.md` sí permite mockear. La diferencia no es
 * cosmética: un doble de `from`/`select`/`is` devuelve la misma respuesta
 * cualquiera sea el filtro, así que no puede distinguir `is.null` de `eq.null`
 * —que es justamente el error que se busca—; mirando la URL que salió, sí.
 *
 * Lo que esto no prueba, y no pretende: que Postgres devuelva las filas
 * correctas. Eso es la base, y va contra Postgres real (`tests/seguridad`).
 * Lo que sí prueba es que el pedido que sale de acá es el que corresponde.
 */
async function conHttp(responder: (url: URL) => { estado: number; cuerpo: unknown }) {
  // Las pruebas de `consultar()` de más arriba registran un doble del SDK con
  // `vi.doMock`, y ese registro sobrevive a `resetModules`. Acá hace falta el
  // cliente de verdad, así que se da de baja explícitamente.
  vi.doUnmock('@supabase/supabase-js');
  vi.resetModules();

  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://falso.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'clave-falsa');

  const pedidos: { url: URL; metodo: string }[] = [];

  vi.stubGlobal('fetch', async (entrada: unknown, init?: { method?: string }) => {
    const url = new URL(
      typeof entrada === 'string' ? entrada : String((entrada as { url: string }).url),
    );
    pedidos.push({ url, metodo: init?.method ?? 'GET' });
    const { estado, cuerpo } = responder(url);
    return new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  const { getRecordsEquipo } = await import('@/lib/datos');
  return { getRecordsEquipo, pedidos };
}

/** Una fila como la devuelve PostgREST, con todas las columnas de la 0013. */
function filaRecord(over: Record<string, unknown>) {
  return {
    id: 0,
    miembro_id: null,
    titulo: 'récord',
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
    creado_en: '2026-01-01T00:00:00+00:00',
    ...over,
  };
}

describe('getRecordsEquipo()', () => {
  it('pide records con miembro_id=is.null (con eq.null no matchearía ninguna fila)', async () => {
    const { getRecordsEquipo, pedidos } = await conHttp(() => ({
      estado: 200,
      cuerpo: [],
    }));
    await getRecordsEquipo();

    expect(pedidos).toHaveLength(1);
    const [pedido] = pedidos;
    expect(pedido.metodo).toBe('GET');
    expect(pedido.url.pathname).toBe('/rest/v1/records');
    // Lo que importa es el operador, no el valor: `eq.null` compara contra el
    // literal `null` y devuelve cero filas sin dar error.
    expect(pedido.url.searchParams.get('miembro_id')).toBe('is.null');
    expect(pedido.url.search).toContain('miembro_id=is.null');
    expect(pedido.url.search).not.toContain('miembro_id=eq');
  });

  it('devuelve los récords ordenados como los de un miembro', async () => {
    const { getRecordsEquipo } = await conHttp(() => ({
      estado: 200,
      cuerpo: [
        filaRecord({ id: 1, alcance: null, anio: 2024 }),
        filaRecord({ id: 2, alcance: 'nacional', anio: 2025, vigente: false }),
        filaRecord({ id: 3, alcance: 'nacional', anio: 2020 }),
        filaRecord({ id: 4, alcance: 'pista', anio: 2026 }),
      ],
    }));

    // Vigentes primero y, dentro de ellos, por importancia del alcance; el
    // superado al final aunque sea el más reciente.
    expect((await getRecordsEquipo()).map((r) => r.id)).toEqual([3, 4, 1, 2]);
  });

  it('ante un error de PostgREST devuelve [] y lo registra, no lo traga', async () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getRecordsEquipo } = await conHttp(() => ({
      estado: 500,
      cuerpo: {
        code: 'PGRST100',
        message: 'no se pudo leer records',
        details: null,
        hint: null,
      },
    }));

    expect(await getRecordsEquipo()).toEqual([]);
    // El respaldo vacío no alcanza como criterio: sin mirar `error`, una
    // respuesta fallida también terminaría en `[]`. Lo que distingue haberlo
    // atendido de haberlo ignorado es que quede registrado.
    expect(espia).toHaveBeenCalled();
    expect(String(espia.mock.calls[0][0])).toContain('récords del equipo');
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
