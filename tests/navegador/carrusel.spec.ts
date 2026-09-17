import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
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
 * Cuánto se deja avanzar el reloj **dentro** de un paso ya disparado, para
 * pausar con la animación en curso (T-006-D03).
 *
 * Tiene que caer después del primer cuadro (~16 ms), para que la animación ya
 * haya escrito posiciones intermedias y el paso esté de verdad en curso, y
 * antes de los `MS_ANIMACION` (450 ms) que dura el paso.
 *
 * Hasta T-007 tenía además un techo: pasado el punto medio del recorrido
 * (~93 ms con el suavizado de `posicionAnimada`), el `scroll-snap-type: x
 * mandatory` de la pista hacía que Chromium completara el salto por su cuenta,
 * en tiempo real y fuera del alcance de `cancelAnimationFrame`. Ya no: el
 * componente apaga el snap mientras anima, y `MS_PASADO_EL_MEDIO` cubre
 * justamente el caso que antes era imposible.
 */
const MS_EN_CURSO = 48;

/**
 * Lo mismo, pero **pasado el punto medio** del recorrido (T-007, CA-4 y CA-5).
 *
 * A los 300 ms de los 450, el suavizado cúbico ya lleva el scroll al 96 % del
 * camino: bien pasada la mitad, que es donde el snap decidía completar el salto
 * solo. Si el paso se corta acá, el carrusel tiene que quedarse donde está.
 */
const MS_PASADO_EL_MEDIO = 300;

/**
 * Cuántas posiciones intermedias distintas exige CA-1 (T-007) para dar el paso
 * por "deslizado" y no por "saltado", y en cuántos tramos del recorrido se pide
 * que estén repartidas. Con el defecto son **cero**: el scroll solo toma el
 * origen y el destino.
 */
const MIN_INTERMEDIAS = 5;
const TRAMOS = 4;

/** Cuánto se arrastra con el dedo, en fracción de la distancia entre dos
 * paradas: lo justo para soltar **entre** dos tarjetas y que el navegador tenga
 * que alinear alguna (CA-3 de T-007). */
const FRACCION_ARRASTRE = 0.4;

/** Velocidad del arrastre sintetizado, en píxeles por segundo. */
const VELOCIDAD_ARRASTRE = 800;

/** Cuánto se espera en **tiempo real** a que el navegador asiente el gesto:
 * el reajuste del snap corre fuera del reloj falso. */
const MS_ASENTARSE = 800;

/** Cuánto se salta el reloj falso al pausarlo, una vez cargada la portada.
 * Menos que `MS_ENTRE_PASOS`, para que el salto no dispare un paso. */
const MS_HASTA_PAUSA = 500;

/** Cuánto se vigila en **tiempo real** que un carrusel pausado no se mueva, y
 * en cuántas muestras. El reloj falso queda pausado, pero el desplazamiento
 * que Chromium se encarga de terminar por el `scroll-snap` corre en tiempo
 * real, fuera de él; y muestrear en vez de mirar solo el final distingue
 * "nunca se movió" de "fue y volvió". */
const MS_VIGILANCIA = 300;
const MUESTRAS_VIGILANCIA = 3;

/** Tope de pulsaciones de Tab para llegar al carrusel desde el principio de la
 * portada. Generoso a propósito: no se fija cuántos elementos tabulables hay
 * antes; lo que se exige es que el teclado **pueda** llegar. */
const MAX_TABS = 40;

/**
 * Va a la portada y devuelve el bloque del carrusel, ya visible.
 *
 * Distingue dos cosas que la ronda 1 confundía (T-006-D01):
 *
 * - **Ausencia legítima de datos** —sección "equipo" apagada, sin pilotos, o
 *   el equipo entra sin desbordar— : no hay carrusel que probar hoy y las
 *   pruebas se saltan con un motivo legible (CA-9, CA-10).
 * - **Fallo de renderizado o de hidratación** —la pista desborda pero los
 *   controles no están, o cambió su `aria-label`— : eso es una regresión, y se
 *   exige con `expect`, para que salga como fallo y no como seis omitidas.
 *
 * El desborde se mide sobre el DOM (`scrollWidth`/`clientWidth`, geometría de
 * CSS que no depende de que React haya hidratado); los controles se esperan
 * con `expect(...).toBeVisible()`, que reintenta mientras el efecto que los
 * monta hace su trabajo.
 */
async function irAlCarrusel(page: Page): Promise<Locator> {
  await page.goto('/');

  const marco = page.locator('[aria-roledescription="carrusel"]');
  test.skip(
    (await marco.count()) === 0,
    'La portada no muestra el bloque de equipo hoy (sección "equipo" apagada o sin pilotos cargados)',
  );
  await expect(marco).toBeVisible();

  const pista = marco.getByRole('list');
  await expect(pista).toBeVisible();

  const desborda = await pista.evaluate((el) => el.scrollWidth - el.clientWidth > 1);
  test.skip(
    !desborda,
    'El equipo entra sin desbordar hoy: no hay controles ni rotación automática que probar',
  );

  // Desborda ⇒ los controles son obligatorios. Si faltan, el carrusel está
  // roto: se falla acá, no se salta.
  await expect(
    marco.getByRole('button', { name: 'Miembro anterior' }),
    'La pista desborda pero no aparece el control "Miembro anterior": el carrusel no renderizó sus controles',
  ).toBeVisible();
  await expect(
    marco.getByRole('button', { name: 'Miembro siguiente' }),
    'La pista desborda pero no aparece el control "Miembro siguiente": el carrusel no renderizó sus controles',
  ).toBeVisible();
  await expect(
    marco.getByRole('button', { name: /^Ir a /u }).first(),
    'La pista desborda pero no aparece ningún punto "Ir a <nombre>": el carrusel no renderizó sus controles',
  ).toBeVisible();

  // Recién ahora se **pausa** el reloj falso, con la portada cargada y el
  // carrusel ya hidratado (sus controles están en pantalla), como recomienda
  // Playwright: durante la carga el tiempo tiene que correr o la página se
  // queda esperando un temporizador que nadie dispara.
  //
  // Pausarlo no es un detalle: `install()` deja el reloj **corriendo** en
  // tiempo real, así que entre un `runFor` y la acción siguiente la animación
  // seguía avanzando por su cuenta —los 450 ms de un paso se consumían en los
  // viajes de ida y vuelta de Playwright— y no había forma estable de entrar
  // con el puntero o el foco en medio de un paso. Pausado, el tiempo avanza
  // solo cuando la prueba lo pide.
  const ahora = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(ahora + MS_HASTA_PAUSA);

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

/** Qué fracción del recorrido `desde → hasta` lleva andada `real`. */
function avanceDe(real: number, desde: number, hasta: number): number {
  const recorrido = hasta - desde;
  if (recorrido === 0) return 1;
  return (real - desde) / recorrido;
}

/**
 * El paso quedó **a mitad de camino**: salió del origen y no llegó al destino.
 *
 * Sirve en las dos direcciones (el paso que vuelve al principio va hacia atrás)
 * y es lo que hay que exigirle a un corte: antes de T-007 el scroll se quedaba
 * clavado en el origen —el snap no lo dejaba salir— o completaba el salto
 * entero; las dos cosas se ven acá como "no está en el medio".
 */
function expectAMitadDeCamino(real: number, desde: number, hasta: number, minimo = 0) {
  const recorrido = Math.abs(hasta - desde);
  const avance = avanceDe(real, desde, hasta);
  expect(
    avance * recorrido,
    `el paso no llegó a arrancar: se quedó en ${real} (origen ${desde}, destino ${hasta})`,
  ).toBeGreaterThan(Math.max(MARGEN_PIXELES, minimo * recorrido));
  expect(
    (1 - avance) * recorrido,
    `el paso se completó igual: llegó a ${real} (origen ${desde}, destino ${hasta})`,
  ).toBeGreaterThan(MARGEN_PIXELES);
}

/** Dónde guarda la página la trayectoria que registra cuadro a cuadro. */
interface VentanaConTrayectoria {
  __trayectoriaCarrusel?: number[];
}

/**
 * Empieza a registrar `scrollLeft` cuadro a cuadro **dentro de la página**.
 *
 * Muestrear desde Node no sirve: cada lectura es un viaje de ida y vuelta por
 * el protocolo y la animación de 450 ms termina antes de que se la vea pasar
 * por el medio. El registro se acumula en un array de la página con
 * `requestAnimationFrame` —el mismo reloj que mueve la animación, así que hay
 * una muestra por cuadro escrito— y se lee de una sola vez al final.
 */
async function registrarTrayectoria(pista: Locator) {
  await pista.evaluate((el) => {
    const ventana = window as unknown as VentanaConTrayectoria;
    ventana.__trayectoriaCarrusel = [];
    const cuadro = () => {
      ventana.__trayectoriaCarrusel?.push(el.scrollLeft);
      requestAnimationFrame(cuadro);
    };
    requestAnimationFrame(cuadro);
  });
}

async function leerTrayectoria(page: Page): Promise<number[]> {
  return page.evaluate(
    () => (window as unknown as VentanaConTrayectoria).__trayectoriaCarrusel ?? [],
  );
}

/** ¿El scroll quedó alineado con alguna parada del carrusel? */
function enUnaParada(scroll: number, destinos: number[]): boolean {
  return destinos.some((destino) => Math.abs(destino - scroll) <= MARGEN_PIXELES);
}

/** Dónde guarda la página el `scrollLeft` del instante en que se soltó el dedo. */
interface VentanaConSoltada {
  __alSoltarCarrusel?: number;
}

/**
 * Arrastra la pista con el dedo `pixeles` hacia la izquierda y deja que el
 * gesto se asiente.
 *
 * El gesto lo sintetiza el propio navegador (CDP `Input.synthesizeScrollGesture`
 * con origen `touch`): `page.mouse` no scrollea un contenedor —el ratón no
 * arrastra— y `page.touchscreen` solo toca. Así el arrastre, su inercia y el
 * reajuste del `scroll-snap` son los de verdad.
 *
 * Devuelve el `scrollLeft` de dos momentos: cuando el dedo se levanta, medido
 * dentro de la página en el propio `touchend`, y cuando el navegador terminó de
 * asentar el gesto. Que esos dos números sean distintos **es** lo que prueba
 * que el navegador alineó la tarjeta.
 */
async function arrastrarConElDedo(
  page: Page,
  context: BrowserContext,
  pista: Locator,
  pixeles: number,
): Promise<{ alSoltar: number; alAsentarse: number }> {
  // El carrusel está bien abajo de la portada: sin traerlo a la ventana, el
  // punto de origen del gesto cae fuera y el navegador lo rechaza ("Position
  // out of bounds"). Esto mueve el scroll **vertical de la página**, no el de
  // la pista.
  await pista.scrollIntoViewIfNeeded();
  const caja = await pista.boundingBox();
  if (!caja) throw new Error('No se pudo medir la pista');

  await pista.evaluate((el) => {
    const ventana = window as unknown as VentanaConSoltada;
    ventana.__alSoltarCarrusel = undefined;
    el.addEventListener(
      'touchend',
      () => {
        ventana.__alSoltarCarrusel = el.scrollLeft;
      },
      { once: true, passive: true },
    );
  });

  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.synthesizeScrollGesture', {
    x: Math.round(caja.x + caja.width / 2),
    y: Math.round(caja.y + caja.height / 2),
    xDistance: -pixeles,
    yDistance: 0,
    gestureSourceType: 'touch',
    speed: VELOCIDAD_ARRASTRE,
  });
  await cdp.detach();

  // El reajuste del snap corre en tiempo real, fuera del reloj falso.
  await page.waitForTimeout(MS_ASENTARSE);

  const alSoltar = await page.evaluate(
    () => (window as unknown as VentanaConSoltada).__alSoltarCarrusel,
  );
  if (alSoltar === undefined) {
    throw new Error('El gesto no llegó a la pista: no hubo `touchend`');
  }
  return { alSoltar, alAsentarse: await pista.evaluate((el) => el.scrollLeft) };
}

/** ¿El foco del teclado está dentro del carrusel? */
async function focoAdentro(marco: Locator): Promise<boolean> {
  return marco.evaluate((el) => el.contains(document.activeElement));
}

/**
 * Entra al carrusel **con el teclado**, no con `.focus()` (T-006-D04): así la
 * prueba se entera si sus enlaces y controles quedan fuera del orden de
 * tabulación (`tabIndex={-1}`, un contenedor con `inert`...), que es
 * precisamente lo que rompería la pausa por foco para quien navega con Tab.
 *
 * Devuelve cuántas pulsaciones hicieron falta.
 */
async function entrarConTab(page: Page, marco: Locator): Promise<number> {
  for (let n = 1; n <= MAX_TABS; n += 1) {
    await page.keyboard.press('Tab');
    if (await focoAdentro(marco)) return n;
  }
  throw new Error(
    `El foco del teclado no llegó al carrusel en ${MAX_TABS} pulsaciones de Tab: quedó entero fuera del orden de tabulación`,
  );
}

/**
 * Deja el foco en el primer elemento **después** del carrusel, para que un solo
 * `Shift+Tab` vuelva a entrar por el último control.
 *
 * Entrar hacia adelante no sirve para medir un paso cortado pasado el punto
 * medio: el Tab cae en el enlace de la primera tarjeta y, si el paso ya la dejó
 * fuera de la vista, el navegador la trae de vuelta —un desplazamiento legítimo
 * suyo, no del carrusel— y tapa justo lo que se mide. Medido: con el paso
 * frenado en 394, el Tab lo deja en 0, con arreglo y sin él. A 96 px la tarjeta
 * todavía se asoma y el navegador no la toca, que es por qué la prueba de
 * `MS_EN_CURSO` sí puede entrar de frente.
 *
 * Los controles están fuera de la pista y siempre a la vista: enfocarlos no la
 * desplaza.
 */
async function salirTabulandoPorAbajo(page: Page, marco: Locator) {
  await entrarConTab(page, marco);
  for (let n = 1; n <= MAX_TABS; n += 1) {
    await page.keyboard.press('Tab');
    if (!(await focoAdentro(marco))) return;
  }
  throw new Error(
    `El foco no terminó de salir del carrusel en ${MAX_TABS} pulsaciones de Tab`,
  );
}

/**
 * Sigue tabulando hasta que el foco quede sobre un enlace o un botón **del
 * carrusel**, y devuelve cuál.
 *
 * Entrar al bloque no alcanza para dar por buena la navegación con teclado:
 * Chromium hace tabulable la pista por ser un contenedor con scroll, así que
 * el foco entra en el carrusel aunque sus enlaces y controles estén excluidos
 * con `tabIndex={-1}` — y quien navega con Tab no podría abrir ningún perfil.
 */
async function tabularHastaInteractivo(page: Page, marco: Locator): Promise<string> {
  for (let n = 0; n <= MAX_TABS; n += 1) {
    const foco = await marco.evaluate((el) => {
      const activo = document.activeElement;
      if (!activo || !el.contains(activo)) return null;
      if (activo.tagName !== 'A' && activo.tagName !== 'BUTTON') return null;
      return `${activo.tagName}: ${activo.getAttribute('aria-label') ?? activo.textContent?.trim() ?? ''}`;
    });
    if (foco) return foco;
    await page.keyboard.press('Tab');
  }
  throw new Error(
    `Ningún enlace ni control del carrusel recibió el foco en ${MAX_TABS} pulsaciones de Tab: quedaron fuera del orden de tabulación`,
  );
}

/**
 * Un reloj falso que además lleva la cuenta de cuánto se avanzó desde que la
 * rotación arrancó.
 *
 * Hace falta para poder pausar **durante** un paso: el `setInterval` no cuenta
 * desde donde quedó la prueba, sino desde que el efecto lo creó, así que sus
 * disparos caen en múltiplos de `MS_ENTRE_PASOS` desde ese instante. Sumar otro
 * `MS_ENTRE_PASOS` a ojo cae *después* de la animación, y la prueba deja de
 * probar lo que dice.
 *
 * Se construye justo después de que el carrusel reanude la rotación —cuando
 * sale el puntero o el foco, el efecto vuelve a crear el intervalo— para que el
 * cero del contador y el del intervalo sean el mismo. Vale mientras no se
 * vuelva a pausar.
 */
function relojDe(page: Page) {
  let avanzado = 0;
  return {
    async avanzar(ms: number) {
      await page.clock.runFor(ms);
      avanzado += ms;
    },
    /** Avanza hasta `dentroDelPaso` ms después del próximo disparo del intervalo. */
    async hastaPasoEnCurso(dentroDelPaso: number = MS_EN_CURSO) {
      const proximo = (Math.floor(avanzado / MS_ENTRE_PASOS) + 1) * MS_ENTRE_PASOS;
      await this.avanzar(proximo + dentroDelPaso - avanzado);
    },
  };
}

/**
 * Comprueba que el carrusel **no se mueve**: ni con el reloj de verdad —donde
 * corre lo que deja pendiente un paso a medias— ni avanzando el falso dos
 * intervalos enteros, por si alguno de los dos relojes lo despertara.
 */
async function noSeMueve(page: Page, pista: Locator, posicion: number) {
  for (let i = 0; i < MUESTRAS_VIGILANCIA; i += 1) {
    await page.waitForTimeout(MS_VIGILANCIA / MUESTRAS_VIGILANCIA);
    expect(await scrollLeftDe(pista)).toBe(posicion);
  }
  await page.clock.runFor(MS_ENTRE_PASOS * 2);
  expect(await scrollLeftDe(pista)).toBe(posicion);
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

  // La prueba de arriba cubre "con el puntero adentro no **empieza** otro
  // paso". Esta cubre la otra mitad, que era el defecto T-005-D02 y que en la
  // ronda 1 no tenía cobertura (T-006-D03): el paso que **ya está en curso**
  // tiene que detenerse, o la tarjeta se sigue moviendo bajo el ratón.
  test('CA-4 (T-005-D02): el puntero corta el paso que ya estaba en curso', async ({
    page,
  }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');

    // El puntero entra y sale: al salir, el efecto vuelve a crear el intervalo
    // y su próximo disparo queda a `MS_ENTRE_PASOS` exactos de este instante.
    // Sin ese cero conocido no se puede entrar a mitad de un paso: cuánto falta
    // para el siguiente dependería de lo que tardó en cargar la portada.
    await marco.hover();
    await sacarPuntero(page, marco);
    const reloj = relojDe(page);
    const { destinos, max } = await medirParadas(marco);

    // 1. El carrusel se mueve de verdad: un ciclo completo lo demuestra.
    const inicio = await scrollLeftDe(pista);
    await reloj.avanzar(MS_ENTRE_PASOS + MS_ANIMACION + MARGEN);
    const trasUnPaso = await scrollLeftDe(pista);
    expect(trasUnPaso).not.toBe(inicio);

    // 2. Arranca el paso siguiente y el puntero entra mientras se anima.
    const objetivo = proximaPosicion(trasUnPaso, destinos, max, 1);
    await reloj.hastaPasoEnCurso();
    await marco.hover();

    // 3. El paso se cortó **donde estaba**: ya había salido de la parada
    //    anterior y no llega a la que perseguía. Hasta T-007 esta prueba exigía
    //    que siguiera clavado en la parada anterior, que no era la animación
    //    funcionando sino el `scroll-snap` tapándola: el scroll no se movía de
    //    la parada hasta que el salto se completaba entero.
    const alPausar = await scrollLeftDe(pista);
    expectAMitadDeCamino(alPausar, trasUnPaso, objetivo);
    await noSeMueve(page, pista, alPausar);
  });

  test('CA-5: se pausa con el foco del teclado (Tab), aunque el puntero entre y salga', async ({
    page,
  }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');

    // El foco entra tabulando desde el principio de la portada, como quien
    // navega con teclado — no con `.focus()`, que también funciona sobre algo
    // que el Tab nunca alcanzaría (T-006-D04) — y tiene que llegar a un enlace
    // o control del carrusel, no solo al bloque.
    await entrarConTab(page, marco);
    await tabularHastaInteractivo(page, marco);
    const antes = await scrollLeftDe(pista);

    // El puntero entra y sale mientras el foco sigue adentro: no tiene que
    // reanudar la rotación (T-005-D01: un solo booleano confundía las dos cosas).
    await marco.hover();
    await sacarPuntero(page, marco);
    expect(await focoAdentro(marco)).toBe(true);

    await page.clock.runFor(MS_ENTRE_PASOS * 2);
    expect(await scrollLeftDe(pista)).toBe(antes);
  });

  // La misma mitad que faltaba de CA-4, pero por teclado (T-006-D03).
  test('CA-5 (T-005-D02): el foco que entra con Tab corta el paso en curso', async ({
    page,
  }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');

    // Deja el foco en el elemento justo anterior al carrusel: así, más
    // adelante, **un solo** Tab entra. Y al salir el foco, el intervalo se
    // vuelve a crear, con lo que el próximo disparo queda a `MS_ENTRE_PASOS`
    // exactos de acá.
    await entrarConTab(page, marco);
    await page.keyboard.press('Shift+Tab');
    expect(await focoAdentro(marco)).toBe(false);
    const reloj = relojDe(page);
    const { destinos, max } = await medirParadas(marco);

    const quieto = await scrollLeftDe(pista);
    const objetivo = proximaPosicion(quieto, destinos, max, 1);

    // El intervalo dispara un paso y el foco entra con la animación en curso.
    await reloj.hastaPasoEnCurso();
    await page.keyboard.press('Tab');
    expect(await focoAdentro(marco)).toBe(true);

    // El paso se cortó: el carrusel se queda donde lo agarró el foco, a mitad
    // de camino (antes de T-007 el snap no lo dejaba salir de la parada).
    const alPausar = await scrollLeftDe(pista);
    expectAMitadDeCamino(alPausar, quieto, objetivo);
    await noSeMueve(page, pista, alPausar);

    // Y seguía vivo: al salir el foco, vuelve a rotar.
    await page.keyboard.press('Shift+Tab');
    expect(await focoAdentro(marco)).toBe(false);
    await page.clock.runFor(MS_ENTRE_PASOS + MS_ANIMACION + MARGEN);
    expect(await scrollLeftDe(pista)).not.toBe(alPausar);
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

  // ─── T-007: el paso se desliza, no salta ───
  //
  // Las cinco pruebas que siguen cubren CA-1 a CA-5 de T-007. El defecto no
  // estaba en la aritmética —sus 24 pruebas de unidad siempre pasaron— sino en
  // lo que el navegador hacía con ella: el `scroll-snap-type: x mandatory` de
  // la pista reajustaba cada posición intermedia a la parada más cercana, así
  // que la animación de 450 ms existía pero no se veía.

  test('CA-1 (T-007): el paso se desliza — la trayectoria pasa por el medio', async ({
    page,
  }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');

    const desde = await scrollLeftDe(pista);
    const { destinos, max } = await medirParadas(marco);
    const hasta = proximaPosicion(desde, destinos, max, 1);

    await registrarTrayectoria(pista);
    await page.clock.runFor(MS_ENTRE_PASOS + MS_ANIMACION + MARGEN);
    const trayectoria = await leerTrayectoria(page);

    // El paso ocurrió y terminó donde debía.
    expect(trayectoria.length).toBeGreaterThan(0);
    expectCerca(trayectoria[trayectoria.length - 1], hasta);

    // Las posiciones que no son ni el origen ni el destino: con el defecto son
    // exactamente cero, porque el scroll solo toma esos dos valores.
    const intermedias = [
      ...new Set(
        trayectoria.filter(
          (p) =>
            Math.abs(p - desde) > MARGEN_PIXELES && Math.abs(p - hasta) > MARGEN_PIXELES,
        ),
      ),
    ].sort((a, b) => a - b);

    const registro = `origen ${desde}, destino ${hasta}; intermedias registradas: [${intermedias.join(', ')}]`;
    expect(
      intermedias.length,
      `el paso saltó en vez de deslizarse (${registro})`,
    ).toBeGreaterThanOrEqual(MIN_INTERMEDIAS);

    // Y repartidas a lo largo del recorrido, no amontonadas en una punta.
    const tramosVacios = [...Array(TRAMOS).keys()].filter(
      (i) =>
        !intermedias.some((p) => {
          const avance = avanceDe(p, desde, hasta);
          return avance >= i / TRAMOS && avance < (i + 1) / TRAMOS;
        }),
    );
    expect(
      tramosVacios,
      `el recorrido tiene tramos sin ninguna posición registrada (${registro})`,
    ).toEqual([]);
  });

  test('CA-2 (T-007): el paso termina exactamente en la parada, no entre dos tarjetas', async ({
    page,
  }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');

    const desde = await scrollLeftDe(pista);
    const { destinos, max } = await medirParadas(marco);
    const esperado = proximaPosicion(desde, destinos, max, 1);

    await page.clock.runFor(MS_ENTRE_PASOS + MS_ANIMACION + MARGEN);
    const alTerminar = await scrollLeftDe(pista);
    expectCerca(alTerminar, esperado);

    // Y se queda ahí: al volver el snap, el navegador no lo corre a otra
    // parada. Se vigila en **tiempo real**, que es donde corre el reajuste del
    // snap, fuera del reloj falso.
    await page.waitForTimeout(MS_VIGILANCIA);
    expect(await scrollLeftDe(pista)).toBe(alTerminar);
  });

  test('CA-4 (T-007): el puntero detiene el paso aun pasado el punto medio', async ({
    page,
  }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');
    const { destinos, max } = await medirParadas(marco);

    // Puntero adentro y afuera: el intervalo se vuelve a crear acá, así que su
    // próximo disparo queda a `MS_ENTRE_PASOS` exactos de este instante.
    await marco.hover();
    await sacarPuntero(page, marco);
    const reloj = relojDe(page);

    const desde = await scrollLeftDe(pista);
    const objetivo = proximaPosicion(desde, destinos, max, 1);

    // El paso arranca y el puntero entra con el recorrido ya pasado el medio.
    await reloj.hastaPasoEnCurso(MS_PASADO_EL_MEDIO);
    await marco.hover();

    const alPausar = await scrollLeftDe(pista);
    expectAMitadDeCamino(alPausar, desde, objetivo, 0.5);
    await noSeMueve(page, pista, alPausar);
  });

  test('CA-5 (T-007): el foco con Tab detiene el paso aun pasado el punto medio', async ({
    page,
  }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');
    const { destinos, max } = await medirParadas(marco);

    // El foco se estaciona **después** del carrusel: al volver con un solo
    // `Shift+Tab` entra por el último control, que está fuera de la pista y no
    // la desplaza (ver `salirTabulandoPorAbajo`). Y al salir, el intervalo se
    // vuelve a crear, con lo que su próximo disparo queda a `MS_ENTRE_PASOS`
    // exactos de acá.
    await salirTabulandoPorAbajo(page, marco);

    // Tabular por las tarjetas arrastró la pista hasta el final; se la devuelve
    // al principio para medir un paso entero hacia adelante. Se fija a mano
    // porque `paso()` lee el DOM, no el estado de React.
    await pista.evaluate((el) => {
      el.scrollLeft = 0;
    });
    const reloj = relojDe(page);

    const desde = await scrollLeftDe(pista);
    const objetivo = proximaPosicion(desde, destinos, max, 1);

    await reloj.hastaPasoEnCurso(MS_PASADO_EL_MEDIO);
    await page.keyboard.press('Shift+Tab');
    expect(await focoAdentro(marco)).toBe(true);

    const alPausar = await scrollLeftDe(pista);
    expectAMitadDeCamino(alPausar, desde, objetivo, 0.5);
    await noSeMueve(page, pista, alPausar);
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

/**
 * El arrastre con el dedo, que es para lo que está el `scroll-snap` (CA-3 de
 * T-007).
 *
 * Va en su propio bloque porque necesita un contexto **con tacto**: el proyecto
 * de la suite es `Desktop Chrome`, sin pantalla táctil, y sin ella el navegador
 * ni siquiera despacha el gesto.
 */
test.describe('Carrusel de pilotos — arrastre con el dedo', () => {
  test.use({ hasTouch: true });

  test('CA-3 (T-007): soltar el dedo entre dos tarjetas deja una alineada', async ({
    page,
    context,
  }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');
    const { destinos } = await medirParadas(marco);
    test.skip(
      destinos.length < 2,
      'Con una sola parada no hay dos tarjetas entre las que soltar el dedo',
    );

    // Un paso completo primero: el arrastre tiene que seguir alineando
    // **después** de que el componente apagó y volvió a encender el snap, que
    // es justo donde estaría el defecto de dejarlo apagado.
    await page.clock.runFor(MS_ENTRE_PASOS + MS_ANIMACION + MARGEN);
    const antes = await scrollLeftDe(pista);
    expect(enUnaParada(antes, destinos), `el paso no terminó en una parada: ${antes}`).toBe(
      true,
    );

    const arrastre = Math.round((destinos[1] - destinos[0]) * FRACCION_ARRASTRE);
    const { alSoltar, alAsentarse } = await arrastrarConElDedo(page, context, pista, arrastre);

    expect(
      enUnaParada(alSoltar, destinos),
      `el dedo no soltó entre dos tarjetas: ${alSoltar} (paradas: [${destinos.join(', ')}])`,
    ).toBe(false);
    expect(
      enUnaParada(alAsentarse, destinos),
      `el navegador no alineó ninguna tarjeta al soltar: quedó en ${alAsentarse} (paradas: [${destinos.join(', ')}])`,
    ).toBe(true);
  });

  // El caso que hace de CA-3 una prueba y no un trámite: un paso cortado a
  // mitad de camino deja el snap apagado **a propósito** —encenderlo ahí
  // completaría el salto que CA-4 y CA-5 exigen frenar—, así que es el único
  // estado en el que el arrastre podría quedarse sin alineación. No se queda:
  // el snap vuelve en el primer gesto, antes de que el dedo empiece a mover
  // nada. Si alguien "simplifica" el arreglo dejando el snap apagado para
  // siempre después de la primera pausa, esta prueba es la que lo caza.
  test('CA-3 (T-007): después de un paso cortado a mitad, el arrastre sigue alineando', async ({
    page,
    context,
  }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');
    const { destinos } = await medirParadas(marco);
    test.skip(
      destinos.length < 2,
      'Con una sola parada no hay dos tarjetas entre las que soltar el dedo',
    );

    // Puntero adentro y afuera para conocer el cero del intervalo, y después
    // adentro otra vez con el paso a mitad de camino: ahí queda parado.
    await marco.hover();
    await sacarPuntero(page, marco);
    const reloj = relojDe(page);
    await reloj.hastaPasoEnCurso(MS_PASADO_EL_MEDIO);
    await marco.hover();

    const alCortar = await scrollLeftDe(pista);
    expect(
      enUnaParada(alCortar, destinos),
      `el paso no quedó entre dos tarjetas: ${alCortar} (paradas: [${destinos.join(', ')}])`,
    ).toBe(false);

    const arrastre = Math.round((destinos[1] - destinos[0]) * FRACCION_ARRASTRE);
    const { alAsentarse } = await arrastrarConElDedo(page, context, pista, arrastre);

    expect(
      enUnaParada(alAsentarse, destinos),
      `el arrastre quedó sin alinear después de una pausa a mitad de paso: ${alAsentarse} (paradas: [${destinos.join(', ')}])`,
    ).toBe(true);
  });
});
