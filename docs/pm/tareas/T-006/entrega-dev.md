# Entrega T-006 — ronda 3

**Estado:** LISTA PARA QA

Ronda de corrección de los dos defectos P1 de `reporte-qa-r2.md` (veredicto
FAIL): **T-006-D01** (la omisión dependía del atributo bajo prueba) y
**T-006-D06** (CA-7 miraba solo la posición final). Los dos son la misma clase
de problema —pruebas que no pueden fallar— y los dos se atacan en el mismo
archivo.

El diff de esta ronda es **un solo archivo de código**,
`tests/navegador/carrusel.spec.ts`, más esta entrega. El componente del
carrusel quedó **sin cambios**: las dos mutaciones para demostrar sensibilidad
se revirtieron con `git checkout --` y `git status --short` cierra vacío.

## Defecto → fix → prueba

| Defecto | Fix | Prueba / evidencia |
| ------- | --- | ------------------ |
| **T-006-D01** (S2/P1) — el salto de escape de `irAlCarrusel` usaba `marco.count() === 0` sobre `[aria-roledescription="carrusel"]`, **el mismo atributo que las pruebas verifican**: cambiarlo omitía las ocho atribuyéndolo a falta de datos | La decisión de omitir ya no mira el carrusel. `laPortadaMuestraPilotos()` pregunta por dos señales que el componente no controla —el **encabezado del bloque de equipo** (`/Los que corren por/`, que pinta el servidor en `app/(sitio)/page.tsx:429-445` bajo la misma condición `equipoOn && equipo.length > 0` que trae los pilotos, y **fuera** de `CarruselEquipo`) y los **enlaces a perfiles** `a[href^="/equipo/"]`— y solo se omite si **ninguna** dice que hoy haya pilotos. Si alguna dice que sí, el contenedor pasa a ser obligatorio: `expect(marco).toBeVisible()` con mensaje explícito. El resto del helper (desborde ⇒ controles exigidos) queda como en la ronda 2 — `tests/navegador/carrusel.spec.ts:75-190` | Demostración abajo: con `aria-roledescription` cambiado a otro valor, la suite da **8 failed / 0 skipped**. Los tres motivos legítimos de omisión (sección apagada, cero pilotos, equipo sin desborde) siguen cubiertos, porque las dos señales desaparecen justamente en esos casos |
| **T-006-D06** (S2/P1) — CA-7 comparaba una sola vez, al final de la ventana; con N paradas, N pasos completan una vuelta y devuelven el scroll al origen, así que `despues === antes` pasaba aunque el carrusel hubiera rotado | CA-7 observa **todo el recorrido**. `grabarRecorrido()` instala en la página un registrador por dos vías —el evento `scroll` de la pista (salta con cualquier desplazamiento, del reloj falso o del real) y un `requestAnimationFrame` encadenado que muestrea cuadro a cuadro mientras el reloj falso avanza— y `recorridoGrabado()` lo devuelve. La aserción pasó de `scrollLeft === antes` a `recorrido === [antes]`: un solo elemento, el de partida. Cualquier posición intermedia delata la rotación aunque haya vuelto al origen — `carrusel.spec.ts:186-245`, `:548-583` | Demostración abajo: con `sinMovimiento` fuera de la condición del intervalo, CA-7 falla con `recorrido [0,413,827,1240,1653,2067,0]`. El último valor es `0`, igual que el primero: **el oráculo viejo habría dado verde con ese mismo recorrido** |

Además, CA-7 ahora **se autocomprueba la geometría** antes de medir (ver abajo).

## Sensibilidad de las pruebas nuevas

### D01 — cambiar el atributo del contenedor tiene que fallar, no omitir

Mutación, en `app/(sitio)/_componentes/CarruselEquipo.tsx:165`:

```diff
-      aria-roledescription="carrusel"
+      aria-roledescription="galeria"
```

Nada más: la sección `equipo` sigue activa, los pilotos siguen cargados, la
pista sigue desbordando y los controles siguen ahí. Es exactamente el caso que
en la ronda 2 salía como ocho omitidas.

```
$ npm run test:navegador

Running 8 tests using 4 workers
...
  8) [chromium] › tests/navegador/carrusel.spec.ts:548:7 › Carrusel de pilotos de la portada › CA-7: con prefers-reduced-motion no rota sola

    Error: La portada muestra el bloque de pilotos pero no hay ningún elemento con aria-roledescription="carrusel": el carrusel no renderizó, o perdió el atributo que lo identifica

    expect(locator).toBeVisible() failed

    Locator: locator('[aria-roledescription="carrusel"]')
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
      - La portada muestra el bloque de pilotos pero no hay ningún elemento con aria-roledescription="carrusel": el carrusel no renderizó, o perdió el atributo que lo identifica locator('[aria-roledescription="carrusel"]') with timeout 5000ms
      - waiting for locator('[aria-roledescription="carrusel"]')

      142 |     marco,
      143 |     'La portada muestra el bloque de pilotos pero no hay ningún elemento con aria-roledescription="carrusel": el carrusel no renderizó, o perdió el atributo que lo identifica',
    > 144 |   ).toBeVisible();
          |     ^
        at irAlCarrusel (.../tests/navegador/carrusel.spec.ts:144:5)
        at .../tests/navegador/carrusel.spec.ts:552:19

  8 failed
    [chromium] › carrusel.spec.ts:369:7 › CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción
    [chromium] › carrusel.spec.ts:387:7 › CA-3: en la última parada, el intervalo vuelve al principio
    [chromium] › carrusel.spec.ts:407:7 › CA-4: se pausa con el puntero encima y retoma al salir
    [chromium] › carrusel.spec.ts:427:7 › CA-4 (T-005-D02): el puntero corta el paso que ya estaba en curso
    [chromium] › carrusel.spec.ts:458:7 › CA-5: se pausa con el foco del teclado (Tab), aunque el puntero entre y salga
    [chromium] › carrusel.spec.ts:484:7 › CA-5 (T-005-D02): el foco que entra con Tab corta el paso en curso
    [chromium] › carrusel.spec.ts:517:7 › CA-6: los controles respetan los extremos y marcan la parada activa
    [chromium] › carrusel.spec.ts:548:7 › CA-7: con prefers-reduced-motion no rota sola
```

**8 failed, 0 skipped.** Las ocho fallan en el mismo punto —el helper— y con un
mensaje que nombra la causa real. Revertido con
`git checkout -- 'app/(sitio)/_componentes/CarruselEquipo.tsx'`.

### D06 — una vuelta entera con movimiento reducido tiene que fallar

Mutación, en `app/(sitio)/_componentes/CarruselEquipo.tsx:155` — exactamente la
que describe QA, dejando intacta la rama de salto instantáneo de `mover`
(`componente:86-89`):

```diff
   useEffect(() => {
-    if (!desborda || pausado || sinMovimiento) return;
+    if (!desborda || pausado) return;
     const id = setInterval(() => paso(1), MS_ENTRE_PASOS);
     return () => clearInterval(id);
   }, [desborda, pausado, sinMovimiento, paso]);
```

```
$ npm run test:navegador -- -g "CA-7"

Running 1 test using 1 worker

  ✘  1 [chromium] › tests/navegador/carrusel.spec.ts:548:7 › Carrusel de pilotos de la portada › CA-7: con prefers-reduced-motion no rota sola (10.0s)

  1) [chromium] › tests/navegador/carrusel.spec.ts:548:7 › Carrusel de pilotos de la portada › CA-7: con prefers-reduced-motion no rota sola

    Error: Con prefers-reduced-motion el carrusel no puede moverse solo, y se movió: recorrido [0,413,827,1240,1653,2067,0] durante 6 intervalos (una vuelta entera, por eso vuelve al origen y mirar solo el final no lo notaría)

    expect(received).toEqual(expected) // deep equality

    - Expected  - 0
    + Received  + 6

      Array [
        0,
    +   413,
    +   827,
    +   1240,
    +   1653,
    +   2067,
    +   0,
      ]

      580 |       recorrido,
      581 |       `Con prefers-reduced-motion el carrusel no puede moverse solo, y se movió: recorrido ${JSON.stringify(recorrido)} durante ${destinos.length} intervalos (una vuelta entera, por eso vuelve al origen y mirar solo el final no lo notaría)`,
    > 582 |     ).toEqual([antes]);
          |       ^
        at .../tests/navegador/carrusel.spec.ts:582:7

  1 failed
    [chromium] › carrusel.spec.ts:548:7 › CA-7: con prefers-reduced-motion no rota sola
```

Revertido con `git checkout -- 'app/(sitio)/_componentes/CarruselEquipo.tsx'`.

#### Cómo se comprobó que falla *por el motivo correcto*

Era el riesgo que marcaba el brief: una ventana corta, o una geometría con más
paradas que pasos, haría fallar la prueba simplemente porque el carrusel quedó
lejos del origen — y eso no demuestra nada, porque el oráculo viejo también
habría fallado. Tres cosas lo descartan:

1. **La ventana es exactamente una vuelta, no un número fijo.** Se calcula como
   `MS_ENTRE_PASOS * destinos.length + MS_ANIMACION + MARGEN`, con
   `destinos.length` medido sobre el DOM real (`carrusel.spec.ts:574`). En esta
   portada dan **6 paradas**, así que la ventana es de 6 intervalos, no de los 3
   fijos de la ronda 2.

2. **La prueba se autocomprueba la geometría antes de medir**
   (`carrusel.spec.ts:558-571`): simula los `destinos.length` pasos con
   `proximaPosicion`, la misma función pura del componente, y **exige** que el
   resultado vuelva a la posición de partida. Si mañana la geometría cambiara y
   la ventana dejara de cerrar la vuelta, la prueba avisa con su propio mensaje
   («la ventana … tendría que completar una vuelta y volver a X, pero termina en
   Y») en vez de fallar disfrazada. En la corrida de la mutación esa aserción
   **pasó**: la vuelta sí cierra.

3. **El propio recorrido de la salida lo demuestra**: `[0,413,827,1240,1653,2067,0]`
   empieza en `0` y termina en `0`. El `scrollLeft` final tras la ventana es
   `0`, idéntico a `antes` — es decir, **la aserción de la ronda 2
   (`expect(despues).toBe(antes)`) habría dado verde con este mismo recorrido**.
   Lo único que separa verde de rojo son las cinco posiciones intermedias, que
   es precisamente lo que el fix agrega. El contraejemplo de QA (3 paradas,
   `[0,408,816,0]`) es el mismo fenómeno con otra geometría; acá se reprodujo
   con 6.

## Commits

```
$ git log --oneline d7c71a4..HEAD
2bbefd2 test(home): apoyar el salto del carrusel en una señal independiente y vigilar el recorrido entero en CA-7
```

(más el commit de esta entrega.)

## Verificación (salida real, recortada)

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
   Duration  276ms

$ npm run test:navegador
Running 8 tests using 4 workers

  ✓  2 › CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción (766ms)
  ✓  4 › CA-3: en la última parada, el intervalo vuelve al principio (766ms)
  ✓  1 › CA-4: se pausa con el puntero encima y retoma al salir (867ms)
  ✓  3 › CA-4 (T-005-D02): el puntero corta el paso que ya estaba en curso (1.3s)
  ✓  5 › CA-5: se pausa con el foco del teclado (Tab), aunque el puntero entre y salga (518ms)
  ✓  6 › CA-5 (T-005-D02): el foco que entra con Tab corta el paso en curso (915ms)
  ✓  7 › CA-6: los controles respetan los extremos y marcan la parada activa (865ms)
  ✓  8 › CA-7: con prefers-reduced-motion no rota sola (9.7s)

  8 passed (17.6s)

$ git status --short
                (vacío)
```

**230/230 unitarias** (sin crecer: la suite de navegador no corre en Vitest) y
**8 de navegador pasadas, 0 omitidas**.

## Cuánto tarda la suite

17,6 s de ejecución de las ocho pruebas (18,0 s de reloj para todo el comando,
con el build de Next ya cacheado; en frío manda el `next build`, no las
pruebas). CA-7 pasó de ~1 s a **9,7 s**: ahora recorre seis intervalos de reloj
falso cuadro a cuadro en vez de tres de un salto. Es el costo de mirar el
recorrido entero y sigue siendo el único test que pesa.

## Migraciones

Ninguna.

## Decisiones tomadas

- **La señal independiente es el encabezado del bloque, no una consulta a la
  base** — porque la suite no puede depender de credenciales ni de datos
  concretos (CA-10), y porque el encabezado lo renderiza el servidor bajo
  *exactamente* la misma condición que decide si hay pilotos
  (`equipoOn && equipo.length > 0`, `page.tsx:429`). Alternativa descartada:
  leer Supabase desde la prueba — agrega red, credenciales y un segundo oráculo
  que puede desincronizarse.
- **Dos señales en OR, no una** — el encabezado detecta incluso que
  `CarruselEquipo` no renderice nada en absoluto; los enlaces a perfiles
  (`a[href^="/equipo/"]`) cubren el caso de que alguien reacomode el encabezado.
  Ninguna de las dos toca roles, `aria-label` ni `aria-roledescription`, que es
  lo que las pruebas afirman. Comprobado que `a[href^="/equipo/"]` solo aparece
  dentro del carrusel: el navbar y el bloque enlazan a `/equipo` sin barra
  final, y nada más en la portada apunta a un perfil.
- **El recorrido se graba por dos vías (evento `scroll` + `requestAnimationFrame`)**
  — porque ninguna sola alcanza: el evento `scroll` no depende del reloj falso y
  atrapa lo que Chromium termina en tiempo real (el `scroll-snap`), y el
  muestreo por cuadro atrapa movimiento mientras `clock.runFor` avanza. Se
  ignoran diferencias de menos de 0,5 px para no confundir el redondeo a
  subpíxeles con movimiento.
- **La ventana de CA-7 se deriva de la geometría medida, no de un número fijo** —
  y la prueba exige que esa ventana cierre una vuelta. Así el peor caso del
  oráculo viejo es el caso que se prueba siempre, en cualquier portada, sin que
  nadie tenga que acordarse de recalcularlo si cambia la cantidad de pilotos.
- **Las aserciones llevan mensaje** — el reporte de QA leyó la salida de fallo
  como evidencia; que el recorrido y el motivo salgan en el mensaje ahorra la
  ronda siguiente.

## Fuera de alcance que vi (no tocado)

- El recorrido grabado queda en `window.__recorridoCarrusel` de la página, y el
  bucle de `requestAnimationFrame` no se detiene. Es inocuo (la página muere con
  el test, y solo lo usa CA-7), pero si mañana otra prueba quiere grabar dos
  tramos en la misma página va a necesitar poder cortarlo —
  `tests/navegador/carrusel.spec.ts:213`.
- Sigue en pie el riesgo que QA marcó sobre la pausa tardía: entrar a los 48 ms
  corta el paso, pero pasados ~200 ms Chromium termina el desplazamiento por el
  `scroll-snap`, fuera del alcance de `cancelAnimationFrame`. Eso es un límite
  del componente, no del testware — `app/(sitio)/_componentes/CarruselEquipo.tsx:119-122`.
- `next build` avisa que el convenio `middleware` está deprecado en favor de
  `proxy`. Nada que ver con esta tarea — `middleware.ts`.

## Preguntas / bloqueos

Ninguno.
