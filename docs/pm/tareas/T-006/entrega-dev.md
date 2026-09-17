# Entrega T-006 — ronda 4

**Estado:** LISTA PARA QA

Ronda acotada a **un solo defecto**: **T-006-D07** (S2/P1) de
`reporte-qa-r3.md`. D01 a D06 quedaron FIXED en la ronda 3 y **no se tocaron**.

El diff de esta ronda es un solo archivo de código,
`tests/navegador/carrusel.spec.ts` (el helper `irAlCarrusel`), más esta
entrega. El componente del carrusel no se tocó: esta ronda no necesitó mutarlo
—la mutación es del lado de la prueba, interceptando la navegación— y
`git status --short` cierra vacío.

## Nota de proceso — por qué hay una cuarta ronda

El kit fija un máximo de tres rondas y esta es la cuarta. **La autoriza el PM**:
es un P1 de arreglo mínimo, y dejarlo abierto significa que la suite puede
mentir justo cuando el sitio está caído, que es lo contrario de para lo que
existe. No es que el brief estuviera mal cortado: cada ronda encontró una
variante más fina del mismo riesgo —la prueba que no puede fallar— y esta
cierra la última puerta que quedaba abierta, la de la respuesta HTTP.

## Defecto → fix → prueba

| Defecto | Fix | Prueba / evidencia |
| ------- | --- | ------------------ |
| **T-006-D07** (S2/P1) — `page.goto('/')` descartaba la respuesta, y `goto()` **no lanza** ante un 404 ni un 500 (`node_modules/playwright-core/types/types.d.ts:3497`). Una página de error no trae ni el encabezado del bloque de equipo ni enlaces `/equipo/<slug>`: las dos señales de `laPortadaMuestraPilotos` daban cero y `test.skip` lo atribuía a «sección apagada o sin pilotos». Un sitio caído se leía como ausencia legítima de datos y las ocho pruebas se omitían en silencio | `irAlCarrusel` comprueba que **la portada cargó de verdad** antes de decidir nada, en dos pasos y en este orden: (1) se guarda la respuesta de `goto('/')`, se falla si es `null` y se exige `respuesta.ok()` con un mensaje que incluye el código y el texto de estado; (2) se exige el **pie del sitio público** (`getByRole('contentinfo')`), que pinta `app/(sitio)/layout.tsx` pase lo que pase con las secciones, para que un 200 que no sea la portada tampoco pase por «hoy no hay pilotos». Recién después se evalúa la omisión por contenido — `tests/navegador/carrusel.spec.ts:132-160` | Tres demostraciones abajo (**HTTP 500**, **HTTP 404** y **200 con otra página**): las ocho pruebas **fallan** con el motivo real, **0 skipped**, en los tres casos |

Los tres motivos legítimos de omisión no cambiaron y siguen donde estaban:
sección apagada o sin pilotos (`spec:161`) y equipo sin desborde (`spec:179`).
Lo único nuevo es que ahora solo se llega ahí con la portada efectivamente
cargada.

## Sensibilidad de las pruebas nuevas

Mutación, **temporal y del lado de la prueba**: al principio de `irAlCarrusel`
se intercepta con `page.route` **solo la navegación a la portada** (predicado
`url.pathname === '/'` y `resourceType() === 'document'`; el resto de las
peticiones sigue de largo con `ruta.continue()`) y se la contesta con una
respuesta de error. Es el caso que describe QA: un servidor que ya pasó la
comprobación de disponibilidad de `webServer` y falla después, en la
navegación.

```ts
// TEMPORAL — demostración de sensibilidad de T-006-D07.
await page.route(
  (url) => url.pathname === '/',
  async (ruta, peticion) => {
    if (peticion.resourceType() !== 'document') return ruta.continue();
    return ruta.fulfill({
      status: 500,
      contentType: 'text/html',
      body: '<!doctype html><html lang="es"><body><h1>500 — Internal Server Error</h1></body></html>',
    });
  },
);
```

### D07-a — HTTP 500

```
$ npm run test:navegador

Running 8 tests using 4 workers
...
  8) [chromium] › tests/navegador/carrusel.spec.ts:592:7 › Carrusel de pilotos de la portada › CA-7: con prefers-reduced-motion no rota sola

    Error: La portada respondió HTTP 500 Internal Server Error: el sitio no cargó, y eso no es "hoy no hay pilotos"

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      163 |     respuesta.ok(),
      164 |     `La portada respondió HTTP ${respuesta.status()} ${respuesta.statusText()}: el sitio no cargó, y eso no es "hoy no hay pilotos"`,
    > 165 |   ).toBe(true);
          |     ^
        at irAlCarrusel (.../tests/navegador/carrusel.spec.ts:165:5)
        at .../tests/navegador/carrusel.spec.ts:596:19

  8 failed
    [chromium] › carrusel.spec.ts:413:7 › CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción
    [chromium] › carrusel.spec.ts:431:7 › CA-3: en la última parada, el intervalo vuelve al principio
    [chromium] › carrusel.spec.ts:451:7 › CA-4: se pausa con el puntero encima y retoma al salir
    [chromium] › carrusel.spec.ts:471:7 › CA-4 (T-005-D02): el puntero corta el paso que ya estaba en curso
    [chromium] › carrusel.spec.ts:502:7 › CA-5: se pausa con el foco del teclado (Tab), aunque el puntero entre y salga
    [chromium] › carrusel.spec.ts:528:7 › CA-5 (T-005-D02): el foco que entra con Tab corta el paso en curso
    [chromium] › carrusel.spec.ts:561:7 › CA-6: los controles respetan los extremos y marcan la parada activa
    [chromium] › carrusel.spec.ts:592:7 › CA-7: con prefers-reduced-motion no rota sola
```

**8 failed, 0 skipped.** (Los números de línea de esta salida son los del
archivo *con* la intercepción temporal, catorce líneas más arriba que en el
archivo entregado.)

### D07-b — HTTP 404

Misma intercepción, `status: 404`:

```
$ npm run test:navegador

    Error: La portada respondió HTTP 404 Not Found: el sitio no cargó, y eso no es "hoy no hay pilotos"
    Error: La portada respondió HTTP 404 Not Found: el sitio no cargó, y eso no es "hoy no hay pilotos"
    Error: La portada respondió HTTP 404 Not Found: el sitio no cargó, y eso no es "hoy no hay pilotos"
    Error: La portada respondió HTTP 404 Not Found: el sitio no cargó, y eso no es "hoy no hay pilotos"
    Error: La portada respondió HTTP 404 Not Found: el sitio no cargó, y eso no es "hoy no hay pilotos"
    Error: La portada respondió HTTP 404 Not Found: el sitio no cargó, y eso no es "hoy no hay pilotos"
    Error: La portada respondió HTTP 404 Not Found: el sitio no cargó, y eso no es "hoy no hay pilotos"
    Error: La portada respondió HTTP 404 Not Found: el sitio no cargó, y eso no es "hoy no hay pilotos"
  8 failed
```

**8 failed, 0 skipped**, un fallo por prueba y el código de estado en el
mensaje.

### D07-c — HTTP 200 que no es la portada

El estado por sí solo no alcanza: un servidor puede contestar 200 con una
página de mantenimiento, y esa página tampoco trae las señales de pilotos. Con
`status: 200` y un cuerpo cualquiera, quien ataja es el segundo guardián:

```
$ npm run test:navegador

    Error: La respuesta no trae el pie del sitio público: lo que cargó no es la portada
    expect(locator).toBeVisible() failed
    Error: element(s) not found
    ... (idéntico en las ocho)
```

**8 failed, 0 skipped.** Esto justifica que el chequeo sean dos pasos y no solo
el código HTTP.

Las tres mutaciones son del archivo de pruebas y se revirtieron con
`git checkout -- tests/navegador/carrusel.spec.ts`. Comprobado después:
`grep -n "TEMPORAL\|page.route" tests/navegador/carrusel.spec.ts` no devuelve
nada, y `git status --short` está vacío.

**Lo que no se pudo demostrar ejecutando:** que los tres motivos legítimos
—sección `equipo` apagada, cero pilotos, equipo sin desborde— sigan omitiendo.
Requieren cambiar datos en Supabase, que está prohibido en esta tarea. El
código de esos tres caminos no se tocó en esta ronda (`spec:161`, `:179`) y
sigue siendo el que QA validó en r3; queda en la lista del PM, como ya estaba.

## Commits

```
$ git log --oneline d7c71a4..HEAD
9ec530f test(home): exigir que la portada haya cargado antes de decidir si se omite
976b5d4 docs(pm): QA T-006 r3 — SIN VEREDICTO
62669ed docs(home): entrega T-006 ronda 3 — D01 y D06 con su sensibilidad demostrada
2bbefd2 test(home): apoyar el salto del carrusel en una señal independiente y vigilar el recorrido entero en CA-7
```

De esta ronda es `9ec530f` (más el commit de esta entrega); `2bbefd2` y
`62669ed` son la ronda 3 y `976b5d4` es el reporte de QA.

## Verificación (salida real, recortada)

Todo esto **después** de revertir las mutaciones.

```
$ npx next typegen
✓ Types generated successfully

$ npx tsc --noEmit
TSC=0          (sin salida)

$ npm run lint
> eslint
LINT=0         (sin salida)

$ npm test
 Test Files  11 passed (11)
      Tests  230 passed (230)
   Duration  298ms

$ npm run test:navegador
Running 8 tests using 4 workers

  ✓  1 › CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción
  ✓  4 › CA-3: en la última parada, el intervalo vuelve al principio (811ms)
  ✓  2 › CA-4: se pausa con el puntero encima y retoma al salir (921ms)
  ✓  3 › CA-4 (T-005-D02): el puntero corta el paso que ya estaba en curso (1.4s)
  ✓  5 › CA-5: se pausa con el foco del teclado (Tab), aunque el puntero entre y salga (559ms)
  ✓  6 › CA-5 (T-005-D02): el foco que entra con Tab corta el paso en curso (920ms)
  ✓  7 › CA-6: los controles respetan los extremos y marcan la parada activa (877ms)
  ✓  8 › CA-7: con prefers-reduced-motion no rota sola (9.0s)

  8 passed (16.0s)

$ git status --short
                (vacío)
```

**230/230 unitarias** (sin crecer: la suite de navegador no corre en Vitest) y
**8 de navegador pasadas, 0 omitidas**.

## Cuánto tarda la suite

16,0 s de ejecución de las ocho pruebas (16,4 s de reloj para todo el comando,
con el build de Next ya cacheado; en frío manda el `next build`). El chequeo
nuevo no agrega tiempo medible: es una comparación sobre la respuesta que
`goto` ya devolvía, más un localizador que resuelve de inmediato. CA-7 sigue
siendo el único test que pesa (9,0 s).

## Migraciones

Ninguna.

## Decisiones tomadas

- **Se exige `respuesta.ok()`, no `status() !== 500`** — porque el problema no
  es un código en particular sino cualquier respuesta que no sea satisfactoria
  (404, 500, 502, 503…). `ok()` cubre 200-299; las redirecciones ya vienen
  seguidas por `goto`. Alternativa descartada: una lista de códigos malos, que
  siempre queda corta.
- **Se falla con `throw` cuando la respuesta es `null`, y con `expect` cuando
  el estado es de error** — `null` no es un fallo de aserción sino una
  navegación que no pasó (misma página, `about:blank`); un `throw` con mensaje
  lo dice mejor y además le da a TypeScript el estrechamiento de tipo sin
  recurrir a `!`.
- **El segundo guardián es el pie (`contentinfo`), no el navbar ni el `<main>`**
  — el pie lo pinta el layout del sitio público sin condiciones, es un único
  landmark (no hay ambigüedad de modo estricto, a diferencia de los varios
  `<nav>` del navbar) y no depende de qué secciones estén activas. Demostrado
  en D07-c que ataja el 200 decorativo.
- **El chequeo va antes de `test.skip`, no después** — el orden es el fix: todo
  lo que decide omitir tiene que evaluarse sobre una portada que se sabe
  cargada. Si se invirtiera, el defecto volvería igual.
- **La demostración intercepta con `page.route` y no apaga el servidor** — así
  se reproduce exactamente el caso del reporte (el servidor pasa la
  comprobación de disponibilidad de `webServer` y falla *después*, en la
  navegación) sin tocar la configuración ni dejar procesos colgados.

## Fuera de alcance que vi (no tocado)

- QA marcó en «Riesgos» que `recorridoGrabado` sustituye la evidencia por
  `[el.scrollLeft]` si `window.__recorridoCarrusel` no existiera, y que
  convendría fallar en ese caso. No hay hoy ningún camino que lo borre y esta
  ronda está acotada a D07, así que no se tocó —
  `tests/navegador/carrusel.spec.ts:269`.
- En una de las corridas verdes el servidor de Next registró
  `⨯ Error: The destination stream closed early` (digest `3701124482`) mientras
  las pruebas pasaban. Es el streaming del RSC cortado cuando Playwright cierra
  la página al terminar un test; no afectó ningún resultado ni se repitió en las
  demás corridas. Lo anoto por si aparece en el gate del PM.
- Sigue en pie el límite de la pausa tardía: entrar a los 48 ms corta el paso,
  pero pasados ~200 ms Chromium termina el desplazamiento por el `scroll-snap`,
  fuera del alcance de `cancelAnimationFrame`. Es un límite del componente, no
  del testware — `app/(sitio)/_componentes/CarruselEquipo.tsx:119-122`.
- `next build` avisa que el convenio `middleware` está deprecado en favor de
  `proxy`. Nada que ver con esta tarea — `middleware.ts`.

## Preguntas / bloqueos

Ninguno.
