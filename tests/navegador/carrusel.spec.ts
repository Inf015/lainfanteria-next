import { expect, test, type Locator, type Page } from '@playwright/test';
import { MS_ANIMACION, paginas, proximaPosicion } from '@/lib/carrusel';

/**
 * Pruebas de navegador del carrusel de pilotos de la portada (T-005/T-005-D06).
 *
 * Vitest con jsdom no sirve para esto: jsdom no implementa scroll ni layout
 * (`scrollLeft` sería siempre 0), así que no distingue una animación real de
 * una que nunca arrancó — que es exactamente el bug que se busca cubrir. Hace
 * falta un navegador de verdad.
 *
 * Usa el reloj falso de Playwright (`page.clock`) en vez de esperar los 5 s
 * reales de cada paso: `runFor` hace correr los `requestAnimationFrame`
 * encadenados de `animarScroll` y los `setInterval` como si el tiempo hubiera
 * pasado de verdad, sin que la prueba tarde minutos.
 *
 * Ubica el carrusel y sus controles por rol y por `aria-label`
 * (`aria-roledescription="carrusel"`, "Miembro anterior/siguiente",
 * "Ir a <nombre>"), nunca por clases de CSS Module: cambian en cada build.
 */

/**
 * Intervalo de rotación automática (`MS_ENTRE_PASOS` en CarruselEquipo.tsx).
 * No está exportado — es un detalle del componente, no del contrato de
 * `lib/carrusel` — así que se documenta acá. Si cambia el intervalo del
 * componente, hay que actualizar este número.
 */
const MS_ENTRE_PASOS = 5000;

/** Margen sobre la duración real de una animación o intervalo, para que el
 * reloj falso alcance a disparar el último cuadro antes de medir. */
const MARGEN = 100;

/** Margen en píxeles al comparar `scrollLeft`, igual a `TOLERANCIA` en
 * `lib/carrusel.ts`: el navegador redondea a subpíxeles. */
const MARGEN_PIXELES = 2;

/**
 * Va a la portada y devuelve el bloque del carrusel, ya visible.
 *
 * Si la portada no muestra el bloque de equipo (sección apagada o sin
 * pilotos) o si el equipo entra sin desbordar (no hay nada que rotar hoy),
 * salta las pruebas con un motivo legible en vez de fallarlas: no pueden
 * depender de cuántos pilotos haya cargados en este momento (CA-9, CA-10).
 */
async function irAlCarrusel(page: Page): Promise<Locator> {
  await page.goto('/');

  const marco = page.locator('[aria-roledescription="carrusel"]');
  test.skip(
    (await marco.count()) === 0,
    'La portada no muestra el bloque de equipo hoy (sección "equipo" apagada o sin pilotos cargados)',
  );
  await expect(marco).toBeVisible();

  const siguiente = marco.getByRole('button', { name: 'Miembro siguiente' });
  test.skip(
    (await siguiente.count()) === 0,
    'El equipo entra sin desbordar hoy: no hay controles ni rotación automática que probar',
  );

  return marco;
}

async function scrollLeftDe(pista: Locator): Promise<number> {
  return pista.evaluate((el) => el.scrollLeft);
}

/** Las paradas alcanzables y el tope, medidos sobre el DOM real con la misma
 * función pura que usa el componente — no se reinventa la aritmética acá. */
async function medirParadas(marco: Locator): Promise<{ destinos: number[]; max: number }> {
  const pista = marco.getByRole('list');
  const { inicios, ancho, visible } = await pista.evaluate((el) => ({
    inicios: [...el.children].map((hijo) => (hijo as HTMLElement).offsetLeft),
    ancho: el.scrollWidth,
    visible: el.clientWidth,
  }));
  const max = ancho - visible;
  return { destinos: paginas(inicios, max).map((p) => p.destino), max };
}

/** Saca el puntero del carrusel a un punto que nunca se superpone con él. */
async function sacarPuntero(page: Page, marco: Locator) {
  const caja = await marco.boundingBox();
  if (!caja) throw new Error('No se pudo medir el carrusel');
  const x = caja.x + caja.width / 2;
  const y = caja.y > 60 ? caja.y - 40 : caja.y + caja.height + 40;
  await page.mouse.move(x, y);
}

function expectCerca(real: number, esperado: number) {
  expect(Math.abs(real - esperado)).toBeLessThanOrEqual(MARGEN_PIXELES);
}

test.describe('Carrusel de pilotos de la portada', () => {
  // CA-2 es la prueba que cierra T-005-D06: si alguien vuelve a pedir el
  // desplazamiento con `scrollTo({ behavior: 'smooth' })` en vez de
  // `animarScroll`, esta prueba falla (demostrado en la entrega, CA-8).
  test('CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción', async ({
    page,
  }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');

    const antes = await scrollLeftDe(pista);
    const { destinos, max } = await medirParadas(marco);
    const esperado = proximaPosicion(antes, destinos, max, 1);

    await page.clock.runFor(MS_ENTRE_PASOS + MS_ANIMACION + MARGEN);

    const despues = await scrollLeftDe(pista);
    expect(despues).not.toBe(antes);
    expectCerca(despues, esperado);
  });

  test('CA-3: en la última parada, el intervalo vuelve al principio', async ({ page }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');
    const { max } = await medirParadas(marco);

    // Arranca en la última parada a mano (no es lo que se mide) fijando
    // `scrollLeft` directamente: `paso()` lo lee del DOM, no del estado de
    // React, así que no hace falta pasar por los controles ni por el foco
    // que eso movería.
    await pista.evaluate((el, m) => {
      el.scrollLeft = m;
    }, max);
    expect(await scrollLeftDe(pista)).toBe(max);

    await page.clock.runFor(MS_ENTRE_PASOS + MS_ANIMACION + MARGEN);

    expect(await scrollLeftDe(pista)).toBe(0);
  });

  test('CA-4: se pausa con el puntero encima y retoma al salir', async ({ page }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');

    await marco.hover();
    const antes = await scrollLeftDe(pista);

    await page.clock.runFor(MS_ENTRE_PASOS * 2);
    expect(await scrollLeftDe(pista)).toBe(antes); // no cambia con el puntero adentro

    await sacarPuntero(page, marco);
    await page.clock.runFor(MS_ENTRE_PASOS + MS_ANIMACION + MARGEN);
    expect(await scrollLeftDe(pista)).not.toBe(antes); // vuelve a rotar al salir
  });

  test('CA-5: se pausa con el foco del teclado, aunque el puntero entre y salga', async ({
    page,
  }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');

    // El foco entra en un enlace de la primera tarjeta, como con Tab.
    await marco.getByRole('link').first().focus();
    const antes = await scrollLeftDe(pista);

    // El puntero entra y sale mientras el foco sigue adentro: no tiene que
    // reanudar la rotación (T-005-D01: un solo booleano confundía las dos cosas).
    await marco.hover();
    await sacarPuntero(page, marco);

    await page.clock.runFor(MS_ENTRE_PASOS * 2);
    expect(await scrollLeftDe(pista)).toBe(antes);
  });

  test('CA-6: los controles respetan los extremos y marcan la parada activa', async ({
    page,
  }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');
    const { max } = await medirParadas(marco);

    const anterior = marco.getByRole('button', { name: 'Miembro anterior' });
    const siguiente = marco.getByRole('button', { name: 'Miembro siguiente' });

    // '‹' en la primera parada → va al final.
    expect(await scrollLeftDe(pista)).toBe(0);
    await anterior.click();
    await page.clock.runFor(MS_ANIMACION + MARGEN);
    expectCerca(await scrollLeftDe(pista), max);

    // '›' en la última parada → vuelve al principio.
    await siguiente.click();
    await page.clock.runFor(MS_ANIMACION + MARGEN);
    expect(await scrollLeftDe(pista)).toBe(0);

    // El último punto lleva al tope y queda marcado como la parada activa.
    const puntos = marco.getByRole('button', { name: /^Ir a /u });
    const ultimoPunto = puntos.last();
    await ultimoPunto.click();
    await page.clock.runFor(MS_ANIMACION + MARGEN);
    expectCerca(await scrollLeftDe(pista), max);
    await expect(ultimoPunto).toHaveAttribute('aria-current', 'true');
  });

  test('CA-7: con prefers-reduced-motion no rota sola', async ({ page }) => {
    // Antes de navegar: el componente lee la preferencia en un efecto al montar.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');

    const antes = await scrollLeftDe(pista);
    await page.clock.runFor(MS_ENTRE_PASOS * 3);
    expect(await scrollLeftDe(pista)).toBe(antes);
  });
});
