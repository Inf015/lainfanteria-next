# Entrega T-006 — ronda 2

**Estado:** LISTA PARA QA

Ronda de corrección de los cinco defectos de `reporte-qa-r1.md` (veredicto
FAIL). No se tocó nada más: el diff son cuatro archivos —el spec, la
configuración de Playwright, `package.json` y `package-lock.json`— más esta
entrega. El código del carrusel quedó **sin cambios** (las mutaciones para
demostrar sensibilidad se revirtieron; ver el final de cada demostración y
`git status --short` al cierre).

## Defecto → fix → evidencia

| Defecto | Fix | Prueba / evidencia |
| ------- | --- | ------------------ |
| **T-006-D01** (S2/P1) — el `test.skip` convertía un carrusel roto en seis omitidas | `irAlCarrusel()` ahora **mide el desborde** de la pista (`scrollWidth - clientWidth > 1`, geometría de CSS que no depende de la hidratación) y separa los dos casos: sin bloque o sin desborde ⇒ `test.skip` con motivo; con desborde ⇒ los tres controles se **exigen** con `expect(...).toBeVisible()` y un mensaje que dice que el carrusel no renderizó sus controles — `tests/navegador/carrusel.spec.ts:92-141` | Demostración abajo: con el `aria-label` del botón siguiente cambiado, la suite da **8 failed / 0 skipped** (antes: 6 omitidas). El `toBeVisible()` con reintento cubre además el riesgo de hidratación que QA marcó en "Riesgos" |
| **T-006-D02** (S2/P1) — podía engancharse a cualquier servidor del 3015 | `reuseExistingServer: false`, también en local — `playwright.config.ts:29-51` | Corrida con el puerto ocupado: falla de entrada con `EADDRINUSE`, sin probar nada (salida abajo). Con el puerto libre, la suite compila y pasa |
| **T-006-D03** (S2/P1) — CA-4/CA-5 pausaban *antes* de que hubiera un paso en curso | Dos pruebas nuevas —`CA-4 (T-005-D02)` con el puntero y `CA-5 (T-005-D02)` con el teclado— que demuestran movimiento, entran **a los 48 ms de los 450 de la animación** y comprueban que el scroll se queda donde estaba, muestreando en tiempo real y avanzando después dos intervalos completos — `carrusel.spec.ts:327-415`. Hizo falta además **pausar el reloj falso** (`page.clock.pauseAt`), ver "Decisiones" | Demostración abajo: quitando el `useEffect` de `CarruselEquipo.tsx:119-122`, las dos pruebas nuevas **fallan** y las seis de la ronda 1 siguen pasando — que era exactamente la queja de QA |
| **T-006-D04** (S2/P2) — CA-5 entraba con `.focus()` | Dos pasos, los dos con `Tab`: `entrarConTab()` pulsa hasta que el foco esté dentro del carrusel (lo usan CA-5 y la prueba nueva de teclado), y `tabularHastaInteractivo()` sigue hasta que el foco quede sobre un **enlace o control** del carrusel — `carrusel.spec.ts:186-219`. El segundo paso hizo falta: Chromium hace tabulable la pista por ser un contenedor con scroll, así que entrar al bloque no prueba que los enlaces sigan alcanzables | Demostración abajo: con `tabIndex={-1}` en los enlaces y los botones, CA-5 **falla**. Medido en esta portada: 13 pulsaciones para entrar al bloque |
| **T-006-D05** (S3/P2) — versión con rango | `"@playwright/test": "1.63.0"` exacta — `package.json:26`, y el `package-lock.json` regenerado con `npm install --package-lock-only` para que la raíz del lock declare el mismo literal | `node -e "…"` sobre el lock: raíz `1.63.0`, paquete instalado `1.63.0`. `npm ci` sigue siendo coherente |

## Sensibilidad de las pruebas nuevas

### D01 — un carrusel roto tiene que fallar, no omitirse

Mutación: en `app/(sitio)/_componentes/CarruselEquipo.tsx`, `aria-label="Miembro
siguiente"` → `aria-label="Siguiente miembro del equipo"` (el botón sigue
existiendo y el carrusel sigue desbordando; solo cambió la etiqueta, como
pedía el reporte).

```
$ npm run test:navegador

Running 8 tests using 4 workers
...
  8) [chromium] › tests/navegador/carrusel.spec.ts:448:7 › Carrusel de pilotos de la portada › CA-7: con prefers-reduced-motion no rota sola

    Error: La pista desborda pero no aparece el control "Miembro siguiente": el carrusel no renderizó sus controles

    expect(locator).toBeVisible() failed

    Locator: locator('[aria-roledescription="carrusel"]').getByRole('button', { name: 'Miembro siguiente' })
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

      118 |     marco.getByRole('button', { name: 'Miembro siguiente' }),
      119 |     'La pista desborda pero no aparece el control "Miembro siguiente": el carrusel no renderizó sus controles',
    > 120 |   ).toBeVisible();
          |     ^
        at irAlCarrusel (.../tests/navegador/carrusel.spec.ts:120:5)
        at .../tests/navegador/carrusel.spec.ts:452:19

  8 failed
    [chromium] › carrusel.spec.ts:269:7 › CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción
    [chromium] › carrusel.spec.ts:287:7 › CA-3: en la última parada, el intervalo vuelve al principio
    [chromium] › carrusel.spec.ts:307:7 › CA-4: se pausa con el puntero encima y retoma al salir
    [chromium] › carrusel.spec.ts:327:7 › CA-4 (T-005-D02): el puntero corta el paso que ya estaba en curso
    [chromium] › carrusel.spec.ts:358:7 › CA-5: se pausa con el foco del teclado (Tab), aunque el puntero entre y salga
    [chromium] › carrusel.spec.ts:384:7 › CA-5 (T-005-D02): el foco que entra con Tab corta el paso en curso
    [chromium] › carrusel.spec.ts:417:7 › CA-6: los controles respetan los extremos y marcan la parada activa
    [chromium] › carrusel.spec.ts:448:7 › CA-7: con prefers-reduced-motion no rota sola
```

**8 failed, ninguna omitida.** En la ronda 1 la misma mutación daba seis
omitidas y salida 0. Revertido con
`git checkout -- "app/(sitio)/_componentes/CarruselEquipo.tsx"`.

### D03 — la pausa tiene que cortar el paso en curso

Mutación: se borró de `CarruselEquipo.tsx:119-122` **solo** el efecto que corta
la animación al pausar, dejando intacta la limpieza del intervalo:

```diff
-  useEffect(() => {
-    if (!pausado && !sinMovimiento && desborda) return;
-    cortar();
-  }, [pausado, sinMovimiento, desborda, cortar]);
```

```
$ npm run test:navegador -- -g "T-005-D02"

  ✘  2 [chromium] › carrusel.spec.ts:384:7 › CA-5 (T-005-D02): el foco que entra con Tab corta el paso en curso (949ms)
  ✘  1 [chromium] › carrusel.spec.ts:327:7 › CA-4 (T-005-D02): el puntero corta el paso que ya estaba en curso (1.1s)

  1) [chromium] › ... CA-4 (T-005-D02): el puntero corta el paso que ya estaba en curso

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: 413
    Received: 827

      261 |   await page.clock.runFor(MS_ENTRE_PASOS * 2);
    > 262 |   expect(await scrollLeftDe(pista)).toBe(posicion);
          |                                     ^
        at noSeMueve (.../tests/navegador/carrusel.spec.ts:262:37)
        at .../tests/navegador/carrusel.spec.ts:355:5

  2) [chromium] › ... CA-5 (T-005-D02): el foco que entra con Tab corta el paso en curso

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: 0
    Received: 413

        at noSeMueve (.../tests/navegador/carrusel.spec.ts:262:37)
        at .../tests/navegador/carrusel.spec.ts:411:5
  2 failed
```

El carrusel siguió hasta la parada siguiente (413 → 827 con el puntero encima;
0 → 413 con el foco dentro) pese a estar pausado: es el defecto T-005-D02.

Y la suite **entera** con esa misma mutación, que es lo que QA pedía comprobar:

```
$ npm run test:navegador

  ✓ CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción (604ms)
  ✓ CA-3: en la última parada, el intervalo vuelve al principio (616ms)
  ✓ CA-4: se pausa con el puntero encima y retoma al salir (735ms)
  ✓ CA-5: se pausa con el foco del teclado (Tab), aunque el puntero entre y salga (507ms)
  ✘ CA-4 (T-005-D02): el puntero corta el paso que ya estaba en curso (1.3s)
  ✓ CA-7: con prefers-reduced-motion no rota sola (255ms)
  ✘ CA-5 (T-005-D02): el foco que entra con Tab corta el paso en curso (898ms)
  ✓ CA-6: los controles respetan los extremos y marcan la parada activa (840ms)
  2 failed
  6 passed (6.1s)
```

Las seis pruebas de la ronda 1 pasan sin el efecto; solo las dos nuevas lo
detectan. Revertido con
`git checkout -- "app/(sitio)/_componentes/CarruselEquipo.tsx"`.

### D04 — el teclado tiene que llegar de verdad

Mutación: `tabIndex={-1}` en los tres `<Link>` de cada tarjeta y en los tres
`<button>` de los controles, la que proponía el reporte.

```
$ npm run test:navegador -- -g "CA-5"

  1) [chromium] › carrusel.spec.ts:358:7 › CA-5: se pausa con el foco del teclado (Tab), aunque el puntero entre y salga

    Error: Ningún enlace ni control del carrusel recibió el foco en 40 pulsaciones de Tab: quedaron fuera del orden de tabulación

      214 |     await page.keyboard.press('Tab');
      215 |   }
    > 216 |   throw new Error(
          |         ^
        at tabularHastaInteractivo (.../tests/navegador/carrusel.spec.ts:216:9)
        at .../tests/navegador/carrusel.spec.ts:370:5

  1 failed
  1 passed (6.3s)
```

Vale la pena el detalle porque la **primera** versión del fix no lo detectaba:
solo comprobaba que el foco entrara en el bloque, y entraba igual —Chromium
hace tabulable la pista por ser un contenedor con scroll—, así que la prueba
pasaba con los enlaces inalcanzables. De ahí `tabularHastaInteractivo()`.
Revertido.

### D02 — puerto ocupado

```
$ python3 -m http.server 3015 &   # un servidor ajeno cualquiera
$ npm run test:navegador

[WebServer] ⨯ Failed to start server
[WebServer] Error: listen EADDRINUSE: address already in use :::3015
[WebServer]   code: 'EADDRINUSE',
[WebServer]   port: 3015
Error: Process from config.webServer was not able to start. Exit code: 1

$ lsof -nP -iTCP:3015 -sTCP:LISTEN | wc -l   # tras matar el ajeno
       0
```

No reutiliza nada, no da falso verde y no deja procesos propios escuchando.

### CA-8 revalidado (el reloj cambió, la prueba tenía que seguir sirviendo)

Como esta ronda pasa a usar el reloj **pausado**, repetí la mutación de CA-8
—`animarScroll(...)` → `pista.scrollTo({ left: destino, behavior: 'smooth' })`—
para comprobar que CA-2 sigue detectándola:

```
$ npm run test:navegador -- -g "CA-2"

  ✘  1 [chromium] › carrusel.spec.ts:269:7 › CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción (371ms)

    Error: expect(received).not.toBe(expected) // Object.is equality
    Expected: not 0

    > 283 |     expect(despues).not.toBe(antes);
  1 failed
```

Revertido; T-005-D06 sigue cubierto.

## Commits

```
(este commit)  docs(pm): entrega T-006 ronda 2
f646d9d test(navegador): exigir los controles y cubrir la pausa a mitad de paso
0f3927e chore(ci): playwright con versión exacta y sin reutilizar servidores
```

(`git log --oneline 2c23235..HEAD`. Las mutaciones de las demostraciones no
generaron commit: se revirtieron antes de stagear.)

## Verificación (salida real, recortada)

```
$ git status --short          # antes de commitear
 M package-lock.json
 M package.json
 M playwright.config.ts
 M tests/navegador/carrusel.spec.ts

$ npx next typegen && npx tsc --noEmit
Generating route types...
✓ Types generated successfully
tsc exit=0            (sin errores)

$ npm run lint
> eslint
lint exit=0           (sin salida = sin errores)

$ npm test
 Test Files  11 passed (11)
      Tests  230 passed (230)
   Duration  280ms

$ npm run test:navegador
Running 8 tests using 4 workers
  ✓ CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción (618ms)
  ✓ CA-3: en la última parada, el intervalo vuelve al principio (610ms)
  ✓ CA-4: se pausa con el puntero encima y retoma al salir (792ms)
  ✓ CA-4 (T-005-D02): el puntero corta el paso que ya estaba en curso (1.1s)
  ✓ CA-5: se pausa con el foco del teclado (Tab), aunque el puntero entre y salga (484ms)
  ✓ CA-5 (T-005-D02): el foco que entra con Tab corta el paso en curso (852ms)
  ✓ CA-6: los controles respetan los extremos y marcan la parada activa (764ms)
  ✓ CA-7: con prefers-reduced-motion no rota sola (267ms)
  8 passed (7.9s)

$ npm run test:navegador -- --repeat-each=3     # estabilidad
  24 passed (13.0s)
```

`npm test` sigue en **230 pruebas / 11 archivos**: las dos pruebas nuevas son de
Playwright y Vitest no las recoge (`vitest.config.mts` incluye solo
`tests/unidad/**/*.test.ts`, sin tocar).

## Cuánto tarda la suite

**~8 segundos** de punta a punta (compilación incluida, con la caché de
`.next` caliente; en frío manda el `next build`). Las ocho pruebas suman menos
de 6 s de navegador: nada espera intervalos reales de 5 s.

## Migraciones

Ninguna.

## Decisiones tomadas

- **El reloj falso ahora se pausa (`page.clock.pauseAt`) una vez cargada la
  portada** — sin esto, D03 no se podía probar de forma estable, y descubrirlo
  costó la mitad de la tarea. `clock.install()` **no congela el tiempo**: lo
  falsea pero lo deja corriendo en tiempo real. Con el reloj corriendo, entre un
  `runFor` y la acción siguiente la animación de 450 ms avanzaba sola durante
  los viajes de ida y vuelta de Playwright, así que "entrar a mitad del paso"
  era una carrera contra la latencia: el mismo caso daba 413 u 827 según lo que
  hubiera tardado el `hover()`. Pausado, el tiempo avanza solo cuando la prueba
  lo pide y las ocho pruebas son deterministas (40/40 con `--repeat-each=5`, y 24/24 en la corrida final con `--repeat-each=3`).
  Se pausa **después** de cargar e hidratar, como recomienda la documentación
  de Playwright, y saltando 500 ms —menos que un intervalo, así que el salto no
  dispara ningún paso—.
- **Las dos pruebas nuevas fijan el cero del intervalo entrando y saliendo
  (puntero o Tab) antes de medir.** El `setInterval` no cuenta desde donde
  quedó la prueba sino desde que el efecto lo creó; al salir el puntero o el
  foco el efecto lo vuelve a crear, y recién ahí se sabe cuánto falta para el
  próximo disparo. Sin ese cero, "avanzar `MS_ENTRE_PASOS + 48`" caía después
  de terminada la animación y la prueba no probaba lo que decía (me pasó: la
  primera versión fallaba con 827 en vez de 413).
- **Se entra a la animación a los 48 ms de los 450** (`MS_EN_CURSO`), no a los
  8 ni a los 200. Es una ventana con dos bordes medidos: antes de ~16 ms no
  corrió ningún cuadro y todavía no hay animación que cortar; pasados ~93 ms el
  desplazamiento cruza el punto medio hacia la parada siguiente y el
  `scroll-snap-type: x mandatory` hace que Chromium **termine el salto por su
  cuenta**, en tiempo real y fuera del alcance de `cancelAnimationFrame` (a los
  100 ms todavía se corta; a los 200 ya no). 48 ms cae cómodo en el medio.
- **La comprobación de "no se mueve" muestrea en tiempo real y además avanza
  dos intervalos del reloj falso.** Una sola medición al final no distingue
  "nunca se movió" de "fue y volvió" (riesgo que QA marcó), y el
  desplazamiento que Chromium completa por el snap corre fuera del reloj falso.
- **`entrarConTab` tolera cuántos elementos tabulables haya antes** (tope de 40,
  hoy hacen falta 13). Fijar el número exacto ataría la prueba del carrusel a
  la navbar y al resto de la portada, que son de otra tarea.
- **La entrada por teclado se comprueba en dos niveles** (el bloque, y después
  un enlace o control). Chromium hace tabulable la pista por ser un contenedor
  con scroll, así que "el foco entró en el carrusel" se cumple aunque sus
  enlaces estén excluidos del orden de tabulación — comprobado mutando el
  componente, no razonado.
- **El `package-lock.json` se regeneró con `npm install --package-lock-only`**
  (un cambio de una línea, el literal de la raíz) en vez de editarlo a mano: es
  la única forma de que npm lo dé por coherente.
- **La prueba de teclado que corta el paso en curso demuestra el movimiento al
  final, no al principio** (sale el foco → vuelve a rotar). Tabular hasta el
  carrusel mueve el foco a la primera tarjeta, y hacerlo con el scroll ya
  avanzado provocaría un desplazamiento del navegador ajeno a lo que se mide.

## Fuera de alcance que vi (no tocado)

- **La cancelación al pausar llega tarde en Chromium.** `scroll-snap-type: x
  mandatory` (`app/(sitio)/_componentes/carrusel-equipo.module.css:23`) hace que,
  en cuanto la animación pasa el punto medio hacia la parada siguiente (~93 ms
  de los 450), el navegador **complete el salto solo**, y ahí el `cortar()` de
  `CarruselEquipo.tsx:119-122` ya no puede detener nada: si el ratón entra en la
  segunda mitad del paso, la tarjeta se le sigue moviendo debajo hasta la
  parada siguiente. Medido, no deducido (tabla de la sección de decisiones).
  O sea: T-005-D02 está resuelto **a medias** en Chromium. No lo toqué —esta
  tarea prueba, no arregla— y la prueba nueva cubre la mitad que sí depende del
  componente. Si el PM quiere cerrarlo del todo, es una tarea aparte (y
  probablemente pase por el CSS, no por el efecto).
- **`MS_ENTRE_PASOS` sigue duplicado** entre `CarruselEquipo.tsx:39` y
  `carrusel.spec.ts:28`: el componente no lo exporta. Ya reportado en la ronda 1.
- **Aviso de deprecación en cada build**: *"The `middleware` file convention is
  deprecated. Please use `proxy` instead"* (`middleware.ts`). Ajeno a esta
  tarea, pero sale en la salida de toda corrida de navegador.

## Preguntas / bloqueos

Ninguno.
