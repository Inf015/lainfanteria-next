import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Pruebas de navegador del detalle de `/autos` (T-012, CA-1).
 *
 * La tarjeta y el detalle se extrajeron de `AutosGrid` a `TarjetaAuto` y
 * `DetalleAuto` para reusarlos en la vista previa del panel. Esto fija lo que
 * el refactor no podía cambiar: abrir el detalle, cambiar de foto con el
 * teclado, el bloqueo del scroll del fondo y cerrar con `Escape`. jsdom no
 * sirve: no hay listeners de `document` reales ni foco ni `overflow` aplicado.
 *
 * Corre contra lo que haya en la base: si no hay autos, o ninguno tiene dos
 * fotos, las pruebas que lo necesitan se **saltan con el motivo**, nunca pasan
 * en verde sin haber probado nada.
 *
 * Ubica todo por rol, texto y `aria-label`, nunca por clases de CSS Module:
 * cambian en cada build.
 */

/** Título del estado vacío que pinta el servidor en `app/(sitio)/autos/page.tsx`. */
const SIN_AUTOS = 'Sin autos en inventario';

/** El contador de la galería: «2 / 5». */
const CONTADOR = /^\d+ \/ \d+$/u;

/**
 * Va a `/autos` y devuelve las tarjetas, o salta la prueba si hoy no hay autos.
 *
 * Distingue el sitio caído (se falla) de la ausencia legítima de datos (se
 * salta): sección apagada → 404 a propósito (`seccionActiva('autos')`),
 * confirmado porque la portada tampoco la enlaza; sin
 * autos → el servidor pinta el estado vacío, que vive fuera de `AutosGrid`.
 * Si no está el estado vacío, las tarjetas son obligatorias: que falten es una
 * regresión y se falla.
 */
async function irAAutos(page: Page): Promise<Locator> {
  const respuesta = await page.goto('/autos');
  if (!respuesta) throw new Error('La navegación a /autos no devolvió ninguna respuesta HTTP');

  if (respuesta.status() === 404) {
    // Un 404 es legítimo solo si la sección está apagada. La señal
    // independiente es la portada: con la sección prendida, el navbar y el
    // bloque de autos de la home enlazan a /autos. Si enlazan y /autos da 404,
    // la página está rota: se falla, no se salta.
    await page.goto('/');
    const enlaces = await page.locator('a[href="/autos"]').count();
    expect(
      enlaces,
      '/autos da 404 pero la portada sigue enlazando a /autos: la sección está prendida y la página no carga',
    ).toBe(0);
    test.skip(true, 'La sección "autos" está apagada hoy (/autos da 404 y la portada no la enlaza)');
  }
  expect(
    respuesta.ok(),
    `/autos respondió HTTP ${respuesta.status()}: el sitio no cargó, y eso no es "no hay autos"`,
  ).toBe(true);
  await expect(
    page.getByRole('contentinfo'),
    'La respuesta no trae el pie del sitio público: lo que cargó no es /autos',
  ).toBeVisible();

  test.skip(
    (await page.getByRole('heading', { name: SIN_AUTOS }).count()) > 0,
    'No hay autos en el inventario hoy: no hay detalle que abrir',
  );

  const tarjetas = page.getByRole('button', { name: /Ver detalle/u });
  await expect(
    tarjetas.first(),
    '/autos no muestra el estado vacío pero tampoco ninguna tarjeta: la grilla no renderizó',
  ).toBeVisible();
  return tarjetas;
}

/** Overflow del `<body>`: el detalle lo pone en `hidden` mientras está abierto. */
function overflowDelBody(page: Page): Promise<string> {
  return page.evaluate(() => document.body.style.overflow);
}

/**
 * Abre, una por una, las tarjetas hasta dar con un auto de dos fotos o más, y
 * devuelve su detalle abierto. Salta la prueba si ninguno tiene.
 */
async function abrirAutoConVariasFotos(page: Page, tarjetas: Locator): Promise<Locator> {
  const total = await tarjetas.count();
  for (let i = 0; i < total; i++) {
    await tarjetas.nth(i).click();
    const detalle = page.getByRole('dialog');
    await expect(detalle).toBeVisible();
    const contador = detalle.getByText(CONTADOR);
    if ((await contador.count()) > 0 && !(await contador.textContent())?.endsWith(' / 1')) {
      return detalle;
    }
    await page.keyboard.press('Escape');
    await expect(detalle).toBeHidden();
  }
  test.skip(true, `Ninguno de los ${total} autos tiene dos fotos o más: no hay foto a la que cambiar`);
  throw new Error('inalcanzable');
}

/** `src` de la foto grande del detalle (la de `next/image`, sin el srcset). */
function srcFotoGrande(detalle: Locator): Promise<string | null> {
  return detalle.locator('img').first().getAttribute('src');
}

test.describe('/autos — detalle de un auto', () => {
  test('abre el detalle, bloquea el scroll del fondo y Escape lo cierra', async ({ page }) => {
    const tarjetas = await irAAutos(page);
    expect(await overflowDelBody(page)).toBe('');

    await tarjetas.first().click();
    const detalle = page.getByRole('dialog');
    await expect(detalle).toBeVisible();
    await expect(detalle).toHaveAttribute('aria-modal', 'true');
    await expect(detalle.getByRole('heading', { level: 2 })).toBeVisible();
    expect(await overflowDelBody(page)).toBe('hidden');

    const wa = detalle.getByRole('link', { name: /Consultar por WhatsApp/u });
    await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/\d*\?text=Hola!%20Me%20interesa%20el%20/u);
    await expect(wa).toHaveAttribute('target', '_blank');

    await page.keyboard.press('Escape');
    await expect(detalle).toBeHidden();
    expect(await overflowDelBody(page)).toBe('');
  });

  test('→ y ← cambian de foto, dan la vuelta, y Escape cierra', async ({ page }) => {
    const tarjetas = await irAAutos(page);
    const detalle = await abrirAutoConVariasFotos(page, tarjetas);

    const contador = detalle.getByText(CONTADOR);
    const total = Number((await contador.textContent())!.split(' / ')[1]);
    await expect(contador).toHaveText(`1 / ${total}`);
    const primera = await srcFotoGrande(detalle);

    await page.keyboard.press('ArrowRight');
    await expect(contador).toHaveText(`2 / ${total}`);
    expect(await srcFotoGrande(detalle)).not.toBe(primera);

    await page.keyboard.press('ArrowLeft');
    await expect(contador).toHaveText(`1 / ${total}`);
    expect(await srcFotoGrande(detalle)).toBe(primera);

    await page.keyboard.press('ArrowLeft');
    await expect(contador).toHaveText(`${total} / ${total}`);

    await page.keyboard.press('Escape');
    await expect(detalle).toBeHidden();
    expect(await overflowDelBody(page)).toBe('');
  });

  test('las flechas y los puntos cambian de foto, y al reabrir arranca en la primera', async ({
    page,
  }) => {
    const tarjetas = await irAAutos(page);
    const detalle = await abrirAutoConVariasFotos(page, tarjetas);
    const contador = detalle.getByText(CONTADOR);
    const total = Number((await contador.textContent())!.split(' / ')[1]);

    await detalle.getByRole('button', { name: 'Foto siguiente' }).click();
    await expect(contador).toHaveText(`2 / ${total}`);
    await detalle.getByRole('button', { name: 'Foto anterior' }).click();
    await expect(contador).toHaveText(`1 / ${total}`);
    await detalle.getByRole('button', { name: `Foto ${total}`, exact: true }).click();
    await expect(contador).toHaveText(`${total} / ${total}`);

    await detalle.getByRole('button', { name: 'Cerrar' }).click();
    await expect(detalle).toBeHidden();

    // Reabrir el mismo auto: la galería vuelve a la primera foto.
    const reabierto = await abrirAutoConVariasFotos(page, tarjetas);
    await expect(reabierto.getByText(CONTADOR)).toHaveText(`1 / ${total}`);
  });
});
