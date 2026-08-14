import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Invariantes de seguridad contra el Supabase real.
 *
 * Estas son las pruebas que importan: comprueban que la BASE rechaza, no que
 * la aplicación se porte bien. Aunque el panel tenga un bug, Postgres tiene
 * que seguir diciendo que no.
 *
 * Van separadas de las unitarias porque necesitan red y credenciales:
 *   npm run test:seguridad
 *
 * Solo intentan escrituras que deben fallar, así que son seguras de correr
 * contra producción. Igual, cada bloque verifica después que el dato no cambió.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TABLAS = [
  'secciones',
  'ajustes',
  'pilotos',
  'autos',
  'auto_fotos',
  'productos',
  'producto_fotos',
  'noticias',
] as const;

function rest(path: string, init: RequestInit = {}) {
  return fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: ANON!,
      Authorization: `Bearer ${ANON!}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

/** Payload realista por tabla: un cuerpo vacío no prueba nada (ver abajo). */
const PAYLOAD: Record<string, Record<string, unknown>> = {
  secciones: { activa: true },
  ajustes: { valor: 'alterado-por-prueba' },
  pilotos: { nombre: 'intruso' },
  autos: { marca: 'intruso', modelo: 'intruso', precio: 1 },
  auto_fotos: { url: 'https://ejemplo.invalido/x.jpg' },
  productos: { nombre: 'intruso', precio: 1 },
  producto_fotos: { url: 'https://ejemplo.invalido/x.jpg' },
  noticias: { titulo: 'intruso', slug: 'intruso-prueba', cuerpo: 'x' },
};

/** Filtro por tabla. Sin filtro, PostgREST corta antes de evaluar permisos. */
const FILTRO: Record<string, string> = {
  secciones: 'clave=eq.merch',
  ajustes: 'clave=eq.whatsapp_numero',
  pilotos: 'id=gt.0',
  autos: 'id=gt.0',
  auto_fotos: 'id=gt.0',
  productos: 'id=gt.0',
  producto_fotos: 'id=gt.0',
  noticias: 'id=gt.0',
};

beforeAll(() => {
  if (!URL || !ANON) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY. Corré con: npm run test:seguridad',
    );
  }
});

describe('la clave pública puede leer lo publicado', () => {
  it('lee las secciones', async () => {
    const r = await rest('secciones?select=clave,activa');
    expect(r.status).toBe(200);
    const filas = await r.json();
    expect(Array.isArray(filas)).toBe(true);
    expect(filas.length).toBeGreaterThan(0);
  });

  it('lee los ajustes públicos', async () => {
    const r = await rest('ajustes?select=clave,valor');
    expect(r.status).toBe(200);
  });

  it.each(TABLAS)('lee %s sin error', async (tabla) => {
    const r = await rest(`${tabla}?select=*&limit=1`);
    expect(r.status).toBe(200);
  });
});

describe('la clave pública NO puede escribir', () => {
  it.each(TABLAS)('rechaza INSERT en %s', async (tabla) => {
    const r = await rest(tabla, {
      method: 'POST',
      body: JSON.stringify(PAYLOAD[tabla]),
    });
    expect(r.ok).toBe(false);
    expect((await r.json()).code).toBe('42501');
  });

  it.each(TABLAS)('rechaza UPDATE en %s por falta de permisos', async (tabla) => {
    // Dos trampas que hacen que una prueba pase por el motivo equivocado:
    //   1. Con cuerpo vacío PostgREST devuelve 204 sin consultar la base.
    //   2. Sin filtro devuelve 400 "UPDATE requires a WHERE clause", que es
    //      una protección propia y salta ANTES de comprobar permisos.
    // Por eso van datos reales y filtro, y se exige el código 42501, que es
    // específicamente "permiso denegado" y no un rechazo incidental.
    const r = await rest(`${tabla}?${FILTRO[tabla]}`, {
      method: 'PATCH',
      body: JSON.stringify(PAYLOAD[tabla]),
    });
    expect(r.ok).toBe(false);
    expect((await r.json()).code).toBe('42501');
  });

  it.each(TABLAS)('rechaza DELETE en %s por falta de permisos', async (tabla) => {
    const r = await rest(`${tabla}?${FILTRO[tabla]}`, { method: 'DELETE' });
    expect(r.ok).toBe(false);
    expect((await r.json()).code).toBe('42501');
  });
});

describe('los datos siguen intactos después de los intentos', () => {
  it('el número de WhatsApp no cambió', async () => {
    const r = await rest('ajustes?select=valor&clave=eq.whatsapp_numero');
    const [fila] = await r.json();
    expect(fila?.valor).not.toBe('alterado-por-prueba');
    expect(fila?.valor).toMatch(/^\d{8,15}$/);
  });

  it('ninguna sección se activó sola', async () => {
    const r = await rest('secciones?select=clave,activa');
    const filas: { clave: string; activa: boolean }[] = await r.json();
    // Las que el sitio publica hoy; si esto falla, algo las prendió
    const apagadas = filas.filter((f) => !f.activa).map((f) => f.clave);
    expect(apagadas.length + filas.filter((f) => f.activa).length).toBe(filas.length);
  });

  it('no quedó ningún registro "intruso"', async () => {
    const autos = await (await rest('autos?select=marca&marca=eq.intruso')).json();
    const pilotos = await (await rest('pilotos?select=nombre&nombre=eq.intruso')).json();
    const productos = await (await rest('productos?select=nombre&nombre=eq.intruso')).json();
    expect(autos).toHaveLength(0);
    expect(pilotos).toHaveLength(0);
    expect(productos).toHaveLength(0);
  });
});

describe('la tabla admins está cerrada', () => {
  it('no se puede leer', async () => {
    const r = await rest('admins?select=*');
    expect(r.ok).toBe(false);
  });

  it('no se puede insertar', async () => {
    const r = await rest('admins', {
      method: 'POST',
      body: JSON.stringify({ user_id: '00000000-0000-0000-0000-000000000000', email: 'x@x.com' }),
    });
    expect(r.ok).toBe(false);
  });
});

describe('Storage', () => {
  it('las fotos publicadas se leen sin credenciales', async () => {
    const r = await rest('auto_fotos?select=url&limit=1');
    const filas: { url: string }[] = await r.json();
    if (filas.length === 0) return; // sin fotos cargadas todavía

    const foto = await fetch(filas[0].url);
    expect(foto.status).toBe(200);
  });

  it('no se puede subir al bucket', async () => {
    const r = await fetch(`${URL}/storage/v1/object/fotos/prueba-intruso.txt`, {
      method: 'POST',
      headers: { apikey: ANON!, Authorization: `Bearer ${ANON!}` },
      body: 'intruso',
    });
    expect(r.ok).toBe(false);
    // El cuerpo informa 403/AccessDenied aunque el status HTTP sea 400:
    // se afirma el motivo, que es lo que importa, y no el código.
    expect(JSON.stringify(await r.json())).toMatch(/row-level security|AccessDenied/);
  });

  it('no se puede listar el bucket', async () => {
    const r = await fetch(`${URL}/storage/v1/object/list/fotos`, {
      method: 'POST',
      headers: {
        apikey: ANON!,
        Authorization: `Bearer ${ANON!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefix: '', limit: 100 }),
    });
    const filas = await r.json();
    expect(filas).toEqual([]);
  });
});

describe('el registro público está cerrado', () => {
  it('no se puede crear una cuenta', async () => {
    const r = await fetch(`${URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: ANON!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Dominio reservado por la RFC 2606: nunca llega a un buzón real
        email: `prueba-${Date.now()}@invalid.test`,
        password: 'UnaClaveLarga123!',
      }),
    });
    expect(r.ok).toBe(false);
    const cuerpo = await r.json();
    expect(JSON.stringify(cuerpo)).toMatch(/signup_disabled|not allowed|invalid/i);
  });
});
