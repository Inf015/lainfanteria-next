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
 * Cuánto se deja avanzar el reloj **dentro** de un paso ya disparado, para
 * pausar con la animación en curso (T-006-D03).
 *
 * Tiene que caer en dos ventanas a la vez:
 *
 * - Después del primer cuadro (~16 ms), para que la animación ya haya escrito
 *   posiciones intermedias y el paso esté de verdad en curso.
 * - Antes de que el desplazamiento pase el punto medio hacia la parada
 *   siguiente (~93 ms con el suavizado de `posicionAnimada`): a partir de ahí
 *   el `scroll-snap-type: x mandatory` de la pista hace que **Chromium**
 *   termine el salto por su cuenta, en tiempo real y fuera del alcance de
 *   `cancelAnimationFrame`. Medido: a los 100 ms todavía se corta; a los
 *   200 ms ya no hay nada que cancelar.
 *
 * 48 ms cae cómodo en el medio de las dos, y siempre dentro de los
 * `MS_ANIMACION` (450 ms) que dura el paso.
 */
const MS_EN_CURSO = 48;

/** Cuánto se salta el reloj falso al pausarlo, una vez cargada la portada.
 * Menos que `MS_ENTRE_PASOS`, para que el salto no dispare un paso. */
const MS_HASTA_PAUSA = 500;

/** Cuánto se vigila en **tiempo real** que un carrusel pausado no se mueva.
 * El reloj falso queda pausado, pero el desplazamiento que Chromium se encarga
 * de terminar por el `scroll-snap` corre en tiempo real, fuera de él. Durante
 * esta ventana el recorrido se graba por el evento `scroll`, así que no quedan
 * huecos entre muestras: cualquier desplazamiento queda registrado. */
const MS_VIGILANCIA = 300;

/** Tope de pulsaciones de Tab para llegar al carrusel desde el principio de la
 * portada. Generoso a propósito: no se fija cuántos elementos tabulables hay
 * antes; lo que se exige es que el teclado **pueda** llegar. */
const MAX_TABS = 40;

/**
 * Título del bloque de equipo de la portada (`app/(sitio)/page.tsx`).
 *
 * Lo renderiza el servidor bajo exactamente la misma condición que decide si
 * hay pilotos que mostrar (`equipoOn && equipo.length > 0`), y **fuera** de
 * `CarruselEquipo`: por eso sirve de señal independiente del carrusel y de sus
 * atributos (ver `laPortadaMuestraPilotos`).
 */
const TITULO_BLOQUE_EQUIPO = /Los que corren por/iu;

/**
 * ¿La portada de hoy **debería** estar mostrando pilotos?
 *
 * La pregunta se contesta sin mirar nada de lo que las pruebas verifican
 * (T-006-D01). Dos señales, cualquiera de las dos alcanza:
 *
 * - El **encabezado del bloque de equipo**, que pinta el servidor en
 *   `page.tsx` bajo la misma condición que trae los pilotos y que vive fuera
 *   del componente del carrusel. Sigue ahí aunque `CarruselEquipo` no renderice
 *   absolutamente nada.
 * - Los **enlaces a perfiles** (`/equipo/<slug>`), uno por tarjeta. Los pinta
 *   el servidor dentro de la pista, pero no dependen de ningún atributo,
 *   `aria-label` ni control del carrusel.
 *
 * Ninguna de las dos usa `aria-roledescription`, ni los roles ni las etiquetas
 * que las pruebas afirman. Si alguna dice que sí hay pilotos y el carrusel no
 * está, eso es una regresión y se falla; nunca se omite.
 */
async function laPortadaMuestraPilotos(page: Page): Promise<boolean> {
  const encabezado = page.getByRole('heading', { name: TITULO_BLOQUE_EQUIPO });
  const perfiles = page.locator('a[href^="/equipo/"]');
  return (await encabezado.count()) > 0 || (await perfiles.count()) > 0;
}

/**
 * Va a la portada y devuelve el bloque del carrusel, ya visible.
 *
 * Distingue **tres** cosas que las rondas anteriores confundían:
 *
 * - **La portada no cargó** —respuesta HTTP de error, o una página que no es la
 *   del sitio público— : eso es el sitio caído, y se falla diciéndolo
 *   (T-006-D07). Es lo primero que se comprueba, antes de mirar contenido.
 * - **Ausencia legítima de datos** —sección "equipo" apagada, sin pilotos, o
 *   el equipo entra sin desbordar— : no hay carrusel que probar hoy y las
 *   pruebas se saltan con un motivo legible (CA-9, CA-10).
 * - **Fallo de renderizado o de hidratación** —la portada trae pilotos pero no
 *   hay contenedor de carrusel, o la pista desborda y los controles no están, o
 *   cambió alguna etiqueta— : eso es una regresión, y se exige con `expect`,
 *   para que salga como fallo y no como ocho omitidas (T-006-D01).
 *
 * La decisión de omitir se apoya **solo** en señales independientes del
 * atributo bajo prueba (`laPortadaMuestraPilotos`), y solo se llega a ella con
 * la portada cargada. El desborde se mide sobre el DOM
 * (`scrollWidth`/`clientWidth`, geometría de CSS que no depende de que React
 * haya hidratado); los controles se esperan con `expect(...).toBeVisible()`,
 * que reintenta mientras el efecto que los monta hace su trabajo.
 */
async function irAlCarrusel(page: Page): Promise<Locator> {
  const respuesta = await page.goto('/');

  // `goto()` **no** lanza ante un 404 ni un 500: devuelve la respuesta y la
  // prueba sigue como si nada. Y una página de error no trae el encabezado del
  // bloque de equipo ni enlaces a perfiles, así que las dos señales de
  // `laPortadaMuestraPilotos` dan cero y el sitio caído se leía como "hoy no
  // hay pilotos" — las ocho pruebas omitidas justo cuando más importaban
  // (T-006-D07). CA-9 autoriza omitir por sección apagada o falta de datos, no
  // por una respuesta de error.
  if (!respuesta) {
    throw new Error(
      'La navegación a la portada no devolvió ninguna respuesta HTTP: el sitio no cargó (y eso no es "hoy no hay pilotos")',
    );
  }
  expect(
    respuesta.ok(),
    `La portada respondió HTTP ${respuesta.status()} ${respuesta.statusText()}: el sitio no cargó, y eso no es "hoy no hay pilotos"`,
  ).toBe(true);

  // Un 200 tampoco alcanza: podría ser cualquier otra página. El pie lo pinta
  // el layout del sitio público (`app/(sitio)/layout.tsx`) pase lo que pase con
  // las secciones, así que sirve de señal de "esto sí es la portada", y es
  // independiente del bloque de equipo y del carrusel.
  await expect(
    page.getByRole('contentinfo'),
    'La respuesta no trae el pie del sitio público: lo que cargó no es la portada',
  ).toBeVisible();

  test.skip(
    !(await laPortadaMuestraPilotos(page)),
    'La portada no muestra el bloque de equipo hoy (sección "equipo" apagada o sin pilotos cargados)',
  );

  // Hay pilotos en la portada ⇒ el contenedor del carrusel es obligatorio. Si
  // falta —o si cambió `aria-roledescription`— el carrusel está roto: se falla
  // acá, no se omite.
  const marco = page.locator('[aria-roledescription="carrusel"]');
  await expect(
    marco,
    'La portada muestra el bloque de pilotos pero no hay ningún elemento con aria-roledescription="carrusel": el carrusel no renderizó, o perdió el atributo que lo identifica',
  ).toBeVisible();

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

/** Dónde guarda la página el recorrido que se va grabando. */
const VAR_RECORRIDO = '__recorridoCarrusel';

/** Movimiento mínimo, en píxeles, que cuenta como movimiento de verdad y no
 * como el redondeo a subpíxeles del navegador. */
const MINIMO_MOVIMIENTO = 0.5;

/**
 * Empieza a grabar **todas** las posiciones por las que pasa la pista.
 *
 * Mirar solo el `scrollLeft` final de una ventana de espera no distingue "no se
 * movió" de "se movió y volvió" (T-006-D06): un carrusel da la vuelta, así que
 * tantos pasos como paradas lo dejan otra vez en el origen.
 *
 * Se graba por dos vías, porque ninguna sola las cubre todas:
 *
 * - El evento `scroll` de la pista, que salta ante cualquier desplazamiento,
 *   venga del reloj falso o del tiempo real.
 * - Un `requestAnimationFrame` encadenado, que muestrea cuadro a cuadro
 *   mientras el reloj falso avanza — el mismo reloj que hace correr la
 *   animación del componente.
 */
async function grabarRecorrido(pista: Locator): Promise<void> {
  await pista.evaluate(
    (el, [nombre, minimo]) => {
      const ventana = window as unknown as Record<string, number[] | undefined>;
      const recorrido: number[] = [el.scrollLeft];
      ventana[nombre as string] = recorrido;

      const registrar = () => {
        const ultima = recorrido[recorrido.length - 1];
        if (Math.abs(el.scrollLeft - ultima) > (minimo as number)) {
          recorrido.push(el.scrollLeft);
        }
      };

      el.addEventListener('scroll', registrar);
      const porCuadro = () => {
        registrar();
        requestAnimationFrame(porCuadro);
      };
      requestAnimationFrame(porCuadro);
    },
    [VAR_RECORRIDO, MINIMO_MOVIMIENTO] as [string, number],
  );
}

/** Las posiciones grabadas desde `grabarRecorrido`, en orden. La primera es la
 * posición de partida, así que un carrusel quieto devuelve un solo elemento. */
async function recorridoGrabado(pista: Locator): Promise<number[]> {
  return pista.evaluate((el, nombre) => {
    const ventana = window as unknown as Record<string, number[] | undefined>;
    return ventana[nombre as string] ?? [el.scrollLeft];
  }, VAR_RECORRIDO);
}

/** Graba el recorrido mientras corre `ventana`, y lo devuelve entero. */
async function recorridoDurante(
  pista: Locator,
  ventana: () => Promise<void>,
): Promise<number[]> {
  await grabarRecorrido(pista);
  await ventana();
  return recorridoGrabado(pista);
}

/**
 * Exige que el carrusel **no se haya movido en ningún momento** de `ventana`.
 *
 * Es el oráculo de toda la familia "acá no tiene que pasar nada" (T-006-D06 y
 * T-006-D08). Comparar la posición final con la inicial no sirve: el carrusel
 * da la vuelta, así que un recorrido entero termina donde empezó y la igualdad
 * se cumple aunque haya rotado. Acá se exige el recorrido completo.
 */
async function exigirInmovilidad(
  pista: Locator,
  ventana: () => Promise<void>,
  contexto: string,
) {
  const antes = await scrollLeftDe(pista);
  const recorrido = await recorridoDurante(pista, ventana);
  expect(
    recorrido,
    `${contexto}: el carrusel se movió. Recorrido ${JSON.stringify(recorrido)} — empieza en ${recorrido[0]} y termina en ${recorrido[recorrido.length - 1]}, así que comparar solo la posición final no lo habría notado`,
  ).toEqual([antes]);
}

/** Cuánto hay que esperar para que la rotación automática dé una vuelta
 * entera: un paso por parada, más la animación del último. */
function ventanaDeVuelta(destinos: number[]): number {
  return MS_ENTRE_PASOS * destinos.length + MS_ANIMACION + MARGEN;
}

/**
 * Comprueba que `ventanaDeVuelta` desde `desde` es de verdad **una vuelta
 * entera**: que los `destinos.length` pasos devuelven el scroll a `desde`.
 *
 * Esto es lo que hace honestas a las pruebas de inmovilidad. Si la ventana no
 * cerrara la vuelta, un carrusel que rotara terminaría lejos del origen y la
 * aserción vieja —la que compara solo el final— también habría fallado: la
 * prueba nueva "detectaría" la regresión sin aportar nada. Exigiendo la vuelta
 * se garantiza el peor caso: el recorrido termina donde empezó, el oráculo
 * viejo daría verde, y lo único que separa verde de rojo son las posiciones
 * intermedias.
 *
 * Se simula con `proximaPosicion`, la misma función pura que usa el componente.
 */
function exigirVueltaEntera(
  desde: number,
  destinos: number[],
  max: number,
  contexto: string,
) {
  let simulado = desde;
  for (let i = 0; i < destinos.length; i += 1) {
    simulado = proximaPosicion(simulado, destinos, max, 1);
  }
  expect(
    Math.abs(simulado - desde),
    `${contexto}: la ventana de ${destinos.length} pasos tendría que completar una vuelta y volver a ${desde}, pero termina en ${simulado}. Sin eso la prueba de inmovilidad no está probando el peor caso`,
  ).toBeLessThanOrEqual(MARGEN_PIXELES);
}

/** Deja el scroll en una parada conocida, sin pasar por los controles (que
 * moverían el foco). Las pruebas de inmovilidad necesitan partir de una parada
 * exacta: desde una posición intermedia, una vuelta entera no vuelve al mismo
 * punto y `exigirVueltaEntera` no se cumpliría. */
async function fijarScroll(pista: Locator, destino: number) {
  await pista.evaluate((el, d) => {
    el.scrollLeft = d;
  }, destino);
  expectCerca(await scrollLeftDe(pista), destino);
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
    /** Avanza hasta `MS_EN_CURSO` después del próximo disparo del intervalo. */
    async hastaPasoEnCurso() {
      const proximo = (Math.floor(avanzado / MS_ENTRE_PASOS) + 1) * MS_ENTRE_PASOS;
      await this.avanzar(proximo + MS_EN_CURSO - avanzado);
    },
  };
}

/**
 * Comprueba que el carrusel **no se mueve**: ni con el reloj de verdad —donde
 * corre lo que deja pendiente un paso a medias— ni avanzando el falso una
 * vuelta entera, por si alguno de los dos relojes lo despertara.
 *
 * Graba el recorrido de las dos ventanas en vez de comparar posiciones
 * puntuales (T-006-D08): así no quedan huecos entre muestras en el tramo real,
 * y en el tramo del reloj falso una vuelta completa no puede hacerse pasar por
 * inmovilidad.
 */
async function noSeMueve(
  page: Page,
  pista: Locator,
  posicion: number,
  destinos: number[],
  max: number,
  contexto: string,
) {
  exigirVueltaEntera(posicion, destinos, max, contexto);
  await exigirInmovilidad(
    pista,
    async () => {
      await page.waitForTimeout(MS_VIGILANCIA);
      await page.clock.runFor(ventanaDeVuelta(destinos));
    },
    contexto,
  );
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
    const { destinos, max } = await medirParadas(marco);

    await marco.hover();
    await fijarScroll(pista, destinos[0]);
    const antes = await scrollLeftDe(pista);

    // Con el puntero adentro no se mueve **en ningún momento** de una vuelta
    // entera (T-006-D08). La ventana es una vuelta a propósito: es el peor caso
    // del oráculo viejo —el recorrido termina donde empezó— así que si esta
    // prueba falla, falla por las posiciones intermedias y no por haber quedado
    // lejos del origen.
    exigirVueltaEntera(antes, destinos, max, 'CA-4, pausa por puntero');
    await exigirInmovilidad(
      pista,
      () => page.clock.runFor(ventanaDeVuelta(destinos)),
      'Con el puntero encima del carrusel la rotación tiene que estar frenada',
    );

    // Y al salir vuelve a rotar: no "a cualquier lado" —eso también lo cumpliría
    // un recorrido que dio la vuelta— sino a la parada siguiente.
    await sacarPuntero(page, marco);
    await page.clock.runFor(MS_ENTRE_PASOS + MS_ANIMACION + MARGEN);
    const alSalir = await scrollLeftDe(pista);
    expect(alSalir).not.toBe(antes);
    expectCerca(alSalir, proximaPosicion(antes, destinos, max, 1));
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
    const { destinos, max } = await medirParadas(marco);

    // El puntero entra y sale: al salir, el efecto vuelve a crear el intervalo
    // y su próximo disparo queda a `MS_ENTRE_PASOS` exactos de este instante.
    // Sin ese cero conocido no se puede entrar a mitad de un paso: cuánto falta
    // para el siguiente dependería de lo que tardó en cargar la portada.
    await marco.hover();
    await sacarPuntero(page, marco);
    const reloj = relojDe(page);

    // 1. El carrusel se mueve de verdad, y **a la parada siguiente**: "distinto
    //    de donde estaba" lo cumpliría también un recorrido que dio la vuelta.
    const inicio = await scrollLeftDe(pista);
    await reloj.avanzar(MS_ENTRE_PASOS + MS_ANIMACION + MARGEN);
    const trasUnPaso = await scrollLeftDe(pista);
    expect(trasUnPaso).not.toBe(inicio);
    expectCerca(trasUnPaso, proximaPosicion(inicio, destinos, max, 1));

    // 2. Arranca el paso siguiente y el puntero entra mientras se anima.
    await reloj.hastaPasoEnCurso();
    await marco.hover();

    // 3. El paso se cortó donde estaba: no llega a la parada que perseguía.
    const alPausar = await scrollLeftDe(pista);
    expect(alPausar).toBe(trasUnPaso);
    await noSeMueve(
      page,
      pista,
      alPausar,
      destinos,
      max,
      'El paso cortado por el puntero no puede seguir moviéndose',
    );
  });

  test('CA-5: se pausa con el foco del teclado (Tab), aunque el puntero entre y salga', async ({
    page,
  }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');
    const { destinos, max } = await medirParadas(marco);

    // El foco entra tabulando desde el principio de la portada, como quien
    // navega con teclado — no con `.focus()`, que también funciona sobre algo
    // que el Tab nunca alcanzaría (T-006-D04) — y tiene que llegar a un enlace
    // o control del carrusel, no solo al bloque.
    await entrarConTab(page, marco);
    await tabularHastaInteractivo(page, marco);

    // Tabular puede haber corrido la pista para traer el enlace enfocado a la
    // vista, y eso deja el scroll entre dos paradas. Se lo lleva a una parada
    // exacta para que la ventana de abajo sea de verdad una vuelta entera.
    await fijarScroll(pista, destinos[0]);
    const antes = await scrollLeftDe(pista);

    // El puntero entra y sale mientras el foco sigue adentro: no tiene que
    // reanudar la rotación (T-005-D01: un solo booleano confundía las dos cosas).
    await marco.hover();
    await sacarPuntero(page, marco);
    expect(await focoAdentro(marco)).toBe(true);

    // Igual que CA-4: recorrido entero durante una vuelta completa, no la
    // posición final (T-006-D08).
    exigirVueltaEntera(antes, destinos, max, 'CA-5, pausa por foco');
    await exigirInmovilidad(
      pista,
      () => page.clock.runFor(ventanaDeVuelta(destinos)),
      'Con el foco del teclado dentro del carrusel la rotación tiene que estar frenada',
    );
  });

  // La misma mitad que faltaba de CA-4, pero por teclado (T-006-D03).
  test('CA-5 (T-005-D02): el foco que entra con Tab corta el paso en curso', async ({
    page,
  }) => {
    await page.clock.install();
    const marco = await irAlCarrusel(page);
    const pista = marco.getByRole('list');
    const { destinos, max } = await medirParadas(marco);

    // Deja el foco en el elemento justo anterior al carrusel: así, más
    // adelante, **un solo** Tab entra. Y al salir el foco, el intervalo se
    // vuelve a crear, con lo que el próximo disparo queda a `MS_ENTRE_PASOS`
    // exactos de acá.
    await entrarConTab(page, marco);
    await page.keyboard.press('Shift+Tab');
    expect(await focoAdentro(marco)).toBe(false);
    await fijarScroll(pista, destinos[0]);
    const reloj = relojDe(page);

    const quieto = await scrollLeftDe(pista);

    // El intervalo dispara un paso y el foco entra con la animación en curso.
    await reloj.hastaPasoEnCurso();
    await page.keyboard.press('Tab');
    expect(await focoAdentro(marco)).toBe(true);

    // El paso se cortó: el carrusel se queda donde estaba, durante toda la
    // ventana y no solo al final (T-006-D08).
    await noSeMueve(
      page,
      pista,
      quieto,
      destinos,
      max,
      'El paso cortado por el foco no puede seguir moviéndose',
    );

    // Y seguía vivo: al salir el foco vuelve a rotar, a la parada siguiente.
    await page.keyboard.press('Shift+Tab');
    expect(await focoAdentro(marco)).toBe(false);
    await page.clock.runFor(MS_ENTRE_PASOS + MS_ANIMACION + MARGEN);
    const alSalir = await scrollLeftDe(pista);
    expect(alSalir).not.toBe(quieto);
    expectCerca(alSalir, proximaPosicion(quieto, destinos, max, 1));
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

    const { destinos, max } = await medirParadas(marco);
    await fijarScroll(pista, destinos[0]);
    const antes = await scrollLeftDe(pista);

    // Mismo oráculo que CA-4 y CA-5: recorrido entero durante una vuelta
    // completa (T-006-D06, la primera instancia de la familia).
    exigirVueltaEntera(antes, destinos, max, 'CA-7, movimiento reducido');
    await exigirInmovilidad(
      pista,
      () => page.clock.runFor(ventanaDeVuelta(destinos)),
      'Con prefers-reduced-motion el carrusel no puede rotar solo',
    );
  });
});
