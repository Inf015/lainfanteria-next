import path from 'node:path';
import { config } from 'dotenv';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { nombreAuto } from '@/lib/formato';

/**
 * Pruebas de navegador del detalle de `/autos` (T-012).
 *
 * La tarjeta y el detalle se extrajeron de `AutosGrid` a `TarjetaAuto` y
 * `DetalleAuto` para reusarlos en la vista previa del panel. Esto fija lo que
 * el refactor no podía cambiar (CA-1) y los defectos de la ronda 1: abrir el
 * detalle, cambiar de foto, el bloqueo del scroll, `Escape`, el foco que entra
 * y vuelve (D03), y activar otra tarjeta con un detalle abierto (D01). jsdom
 * no sirve: no hay foco, listeners de `document` ni `overflow` reales.
 *
 * **Qué hay que probar lo dice la base, no la página (T-012-D04).** Si la
 * sección está apagada, si hay autos y cuántas fotos tiene cada uno se lee de
 * la API REST de Supabase con la clave pública —la misma base contra la que se
 * compiló el sitio—, nunca de la UI bajo prueba. Si la base dice que algo
 * tiene que estar (la página, las tarjetas, el contador, la foto) y la UI no
 * lo muestra, la prueba **falla**; solo se salta cuando la base dice que no
 * hay datos para probarlo, y lo dice en el motivo.
 *
 * Las variables salen del entorno o de `.env.local`, como hace Next: lo que ya
 * está en el entorno manda (así se apunta a un Supabase local).
 *
 * Ubica todo por rol, texto y `aria-label`, nunca por clases de CSS Module:
 * cambian en cada build.
 */

config({ path: path.join(process.cwd(), '.env.local'), quiet: true });

/** Título del estado vacío que pinta el servidor en `app/(sitio)/autos/page.tsx`. */
const SIN_AUTOS = 'Sin autos en inventario';

/** Tope de Tab para llegar desde el detalle a otra tarjeta (dando la vuelta a la página). Generoso. */
const MAX_TABS = 80;

interface FotoDato {
  id: number;
  url: string;
  es_principal: boolean;
  orden: number;
}

interface AutoDato {
  id: number;
  marca: string;
  modelo: string;
  version: string | null;
  anio: string | null;
  auto_fotos: FotoDato[];
}

interface Inventario {
  /** `secciones.activa` de `autos`. */
  activa: boolean;
  /** Los autos que muestra `/autos`, en el mismo orden y con las fotos ordenadas como el sitio. */
  autos: AutoDato[];
}

/** GET a la API REST de Supabase con la clave pública (solo lectura, con RLS). */
async function rest<T>(ruta: string): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY: sin la base no se puede saber qué autos hay, y la precondición no se decide mirando la UI',
    );
  }
  const r = await fetch(`${url}/rest/v1/${ruta}`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  if (!r.ok) throw new Error(`La API REST respondió HTTP ${r.status} a ${ruta}`);
  return (await r.json()) as T;
}

/**
 * Lo que `/autos` tiene que mostrar, según la base. Las mismas condiciones que
 * `seccionActiva('autos')` y `getAutos()` de `lib/datos.ts`.
 */
async function inventario(): Promise<Inventario> {
  const secciones = await rest<{ activa: boolean }[]>(
    'secciones?select=activa&clave=eq.autos&limit=1',
  );
  const activa = secciones[0]?.activa ?? false;
  if (!activa) return { activa, autos: [] };

  const autos = await rest<AutoDato[]>(
    'autos?select=id,marca,modelo,version,anio,auto_fotos(id,url,es_principal,orden)' +
      '&activo=eq.true&estado=neq.vendido&order=orden.asc,id.asc',
  );
  return {
    activa,
    autos: autos.map((a) => ({
      ...a,
      auto_fotos: [...a.auto_fotos].sort(
        (x, y) => Number(y.es_principal) - Number(x.es_principal) || x.orden - y.orden,
      ),
    })),
  };
}

/**
 * Va a `/autos` y devuelve el inventario y las tarjetas.
 *
 * - Sección apagada según la base ⇒ `/autos` **tiene** que dar 404, y se salta.
 * - Sin autos según la base ⇒ **tiene** que verse el estado vacío, y se salta.
 * - Con autos ⇒ tiene que haber exactamente una tarjeta por auto, en orden.
 */
async function irAAutos(page: Page): Promise<{ autos: AutoDato[]; tarjetas: Locator }> {
  const datos = await inventario();
  const respuesta = await page.goto('/autos');
  if (!respuesta) throw new Error('La navegación a /autos no devolvió ninguna respuesta HTTP');

  if (!datos.activa) {
    expect(
      respuesta.status(),
      'La base dice que la sección "autos" está apagada, pero /autos no da 404',
    ).toBe(404);
    test.skip(true, 'La sección "autos" está apagada en la base (secciones.activa = false)');
  }

  expect(
    respuesta.ok(),
    `La sección está prendida en la base pero /autos respondió HTTP ${respuesta.status()}`,
  ).toBe(true);
  await expect(page.getByRole('contentinfo')).toBeVisible();

  if (datos.autos.length === 0) {
    await expect(
      page.getByRole('heading', { name: SIN_AUTOS }),
      'La base no tiene autos visibles pero /autos no muestra el estado vacío',
    ).toBeVisible();
    test.skip(true, 'La base no tiene autos visibles (activos y no vendidos): no hay detalle que abrir');
  }

  const tarjetas = page.getByRole('button', { name: /Ver detalle/u });
  await expect(
    tarjetas,
    `La base tiene ${datos.autos.length} autos visibles y /autos no muestra la misma cantidad de tarjetas`,
  ).toHaveCount(datos.autos.length);
  for (const [i, a] of datos.autos.entries()) {
    await expect(tarjetas.nth(i).getByRole('heading', { level: 3 })).toHaveText(
      `${a.marca} ${a.modelo}`,
    );
  }
  return { autos: datos.autos, tarjetas };
}

/** Índice del primer auto con 2+ fotos según la base, o salta con el motivo. */
function indiceConVariasFotos(autos: AutoDato[]): number {
  const i = autos.findIndex((a) => a.auto_fotos.length >= 2);
  test.skip(i < 0, `Según la base, ninguno de los ${autos.length} autos visibles tiene dos fotos o más`);
  return i;
}

/** Overflow del `<body>`: el detalle lo pone en `hidden` mientras está abierto. */
function overflowDelBody(page: Page): Promise<string> {
  return page.evaluate(() => document.body.style.overflow);
}

/** Abre con el teclado (foco + Enter) el detalle del auto `i` y lo devuelve. */
async function abrirConTeclado(page: Page, tarjetas: Locator, a: AutoDato, i: number) {
  await tarjetas.nth(i).focus();
  await page.keyboard.press('Enter');
  const detalle = page.getByRole('dialog', { name: nombreAuto(a) });
  await expect(detalle).toBeVisible();
  return detalle;
}

/**
 * Exige que el detalle muestre la foto `k` del auto: contador «k+1 / n» y la
 * imagen grande con esa URL. Sin fotos, el contador no tiene que estar.
 */
async function esperarFoto(detalle: Locator, a: AutoDato, k: number) {
  const n = a.auto_fotos.length;
  const contador = detalle.getByText(/^\d+ \/ \d+$/u);
  if (n === 0) {
    await expect(contador, 'Auto sin fotos: el detalle no tiene que mostrar contador').toHaveCount(0);
    return;
  }
  await expect(
    contador,
    `La base dice que «${nombreAuto(a)}» tiene ${n} foto(s): el detalle tiene que mostrar el contador`,
  ).toHaveText(`${k + 1} / ${n}`);
  await expect(
    detalle.getByRole('img'),
    `El detalle tiene que mostrar la foto ${k + 1} de «${nombreAuto(a)}»`,
  ).toHaveAttribute('src', new RegExp(escaparRegExp(encodeURIComponent(a.auto_fotos[k].url))));
}

function escaparRegExp(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

test.describe('/autos — detalle de un auto', () => {
  test('abre en la primera foto, el foco entra, bloquea el scroll, y Escape cierra y devuelve el foco', async ({
    page,
  }) => {
    const { autos, tarjetas } = await irAAutos(page);
    const a = autos[0];
    expect(await overflowDelBody(page)).toBe('');

    const detalle = await abrirConTeclado(page, tarjetas, a, 0);
    await expect(detalle).toHaveAttribute('aria-modal', 'true');
    await esperarFoto(detalle, a, 0);
    await expect(detalle.getByRole('button', { name: 'Cerrar' })).toBeFocused();
    expect(await overflowDelBody(page)).toBe('hidden');

    const wa = detalle.getByRole('link', { name: /Consultar por WhatsApp/u });
    await expect(wa).toHaveAttribute(
      'href',
      `https://wa.me/${await numeroWhatsapp()}?text=${encodeURIComponent(
        `Hola! Me interesa el ${nombreAuto(a)}. ¿Está disponible?`,
      )}`,
    );
    await expect(wa).toHaveAttribute('target', '_blank');

    await page.keyboard.press('Escape');
    await expect(detalle).toBeHidden();
    expect(await overflowDelBody(page)).toBe('');
    await expect(tarjetas.nth(0)).toBeFocused();
  });

  test('→ y ← cambian de foto y dan la vuelta, y Escape cierra', async ({ page }) => {
    const { autos, tarjetas } = await irAAutos(page);
    const i = indiceConVariasFotos(autos);
    const a = autos[i];
    const n = a.auto_fotos.length;

    const detalle = await abrirConTeclado(page, tarjetas, a, i);
    await esperarFoto(detalle, a, 0);

    await page.keyboard.press('ArrowRight');
    await esperarFoto(detalle, a, 1);
    await page.keyboard.press('ArrowLeft');
    await esperarFoto(detalle, a, 0);
    await page.keyboard.press('ArrowLeft');
    await esperarFoto(detalle, a, n - 1);

    await page.keyboard.press('Escape');
    await expect(detalle).toBeHidden();
    expect(await overflowDelBody(page)).toBe('');
  });

  test('las flechas y los puntos cambian de foto; ✕ cierra, devuelve el foco y al reabrir arranca en la primera', async ({
    page,
  }) => {
    const { autos, tarjetas } = await irAAutos(page);
    const i = indiceConVariasFotos(autos);
    const a = autos[i];
    const n = a.auto_fotos.length;

    const detalle = await abrirConTeclado(page, tarjetas, a, i);
    await detalle.getByRole('button', { name: 'Foto siguiente' }).click();
    await esperarFoto(detalle, a, 1);
    await detalle.getByRole('button', { name: 'Foto anterior' }).click();
    await esperarFoto(detalle, a, 0);
    await detalle.getByRole('button', { name: `Foto ${n}`, exact: true }).click();
    await esperarFoto(detalle, a, n - 1);

    await detalle.getByRole('button', { name: 'Cerrar' }).click();
    await expect(detalle).toBeHidden();
    await expect(tarjetas.nth(i)).toBeFocused();

    const reabierto = await abrirConTeclado(page, tarjetas, a, i);
    await esperarFoto(reabierto, a, 0);
  });

  test('D01: activar otra tarjeta con un detalle abierto la abre en su primera foto, sin errores', async ({
    page,
  }) => {
    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(e.message));

    const { autos, tarjetas } = await irAAutos(page);
    const iA = indiceConVariasFotos(autos);
    test.skip(autos.length < 2, 'Según la base hay un solo auto visible: no hay otra tarjeta que activar');
    // B: otro auto, con 2+ fotos si hay (detecta que no se reinicie el índice);
    // si no, cualquiera (detecta el índice fuera de rango).
    const otros = autos.map((_, j) => j).filter((j) => j !== iA);
    const iB = otros.find((j) => autos[j].auto_fotos.length >= 2) ?? otros[0];
    const a = autos[iA];
    const b = autos[iB];

    const detalleA = await abrirConTeclado(page, tarjetas, a, iA);
    // A en su última foto: el índice más alto posible.
    for (let k = 1; k < a.auto_fotos.length; k++) await page.keyboard.press('ArrowRight');
    await esperarFoto(detalleA, a, a.auto_fotos.length - 1);

    // Con el teclado, sin cerrar A, hasta la tarjeta de B (el detalle de
    // /autos no atrapa el foco: las tarjetas siguen alcanzables). Tab hacia
    // adelante da la vuelta a la página y llega a cualquier tarjeta.
    const tarjetaB = tarjetas.nth(iB);
    let llego = false;
    for (let t = 0; t < MAX_TABS && !llego; t++) {
      await page.keyboard.press('Tab');
      llego = await tarjetaB.evaluate((el) => el === document.activeElement);
    }
    expect(llego, `No se llegó con Tab a la tarjeta de «${nombreAuto(b)}»`).toBe(true);
    await page.keyboard.press('Enter');

    const detalleB = page.getByRole('dialog', { name: nombreAuto(b) });
    // Si la página reventó, que el fallo diga por qué.
    await expect(detalleB)
      .toBeVisible()
      .catch((e: Error) => {
        throw new Error(`${e.message}\nErrores de la página: ${JSON.stringify(errores)}`);
      });
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await esperarFoto(detalleB, b, 0);
    expect(errores, 'La página lanzó errores al cambiar de auto').toEqual([]);

    // Y al cerrarlo, el foco vuelve a la tarjeta que lo abrió: la de B.
    await page.keyboard.press('Escape');
    await expect(detalleB).toBeHidden();
    await expect(tarjetaB).toBeFocused();
  });
});

/** Número de WhatsApp de `ajustes`, como lo arma `/autos` (vacío si no hay). */
async function numeroWhatsapp(): Promise<string> {
  const filas = await rest<{ valor: string | null }[]>(
    'ajustes?select=valor&clave=eq.whatsapp_numero&limit=1',
  );
  return filas[0]?.valor ?? '';
}
