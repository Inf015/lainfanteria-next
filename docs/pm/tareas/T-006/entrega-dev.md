# Entrega T-006 — ronda 1

**Estado:** LISTA PARA QA

## Qué hice

- `@playwright/test` como devDependency y `npm run test:navegador` —
  `package.json:14`. Sin fijar la versión del navegador: `npx playwright
  install chromium` lo baja fuera del repo.
- `playwright.config.ts` — levanta el sitio compilado (`next build && next
  start -p 3015`, puerto propio, ni 3000 ni 3014) y lo apaga solo; un
  proyecto, `chromium`.
- `tests/navegador/carrusel.spec.ts` — CA-2 a CA-7, con `page.clock` (no
  esperas reales) y locators por `aria-roledescription`/`aria-label`, nunca
  por clases de CSS Module.
- `.gitignore` — `test-results/`, `playwright-report/`, `blob-report/`.
- `README.md` y `docs/pm/contexto.md` — la suite de navegador suma a la tabla
  de pruebas, mismo nivel que unidad/seguridad/humo.

## Trazabilidad

| CA | Cómo se cumple | Test / evidencia |
| -- | --------------- | ----------------- |
| CA-1 | `webServer` en `playwright.config.ts` compila y arranca el sitio solo | Corrido de punta a punta con `npm ci && npx playwright install chromium && npm run test:navegador` — ver "Verificación" abajo, sin servidor arrancado a mano en otra terminal |
| CA-2 | El intervalo (reloj falso) avanza `scrollLeft` a `proximaPosicion(...)`, calculada con la misma función pura del componente | `carrusel.spec.ts:99` "CA-2: rota sola..." — y la sección **CA-8** de abajo, que prueba que esta prueba puntual falla sin el fix |
| CA-3 | Arranca en la última parada (`scrollLeft = max` fijado directo) y verifica que el intervalo lo manda a `0` | `carrusel.spec.ts:117` "CA-3: en la última parada..." |
| CA-4 | `marco.hover()` mantiene `scrollLeft` fijo; sacar el puntero lo retoma | `carrusel.spec.ts:137` "CA-4: se pausa con el puntero..." |
| CA-5 | Foco en un enlace de la primera tarjeta mantiene `scrollLeft` fijo aunque el puntero entre y salga en el medio | `carrusel.spec.ts:153` "CA-5: se pausa con el foco..." |
| CA-6 | `‹` en la primera parada → al final; `›` en la última → al principio; el último punto llega al tope con `aria-current="true"` | `carrusel.spec.ts:173` "CA-6: los controles respetan los extremos..." |
| CA-7 | `page.emulateMedia({ reducedMotion: 'reduce' })` antes de navegar; `scrollLeft` no cambia con el reloj avanzado | `carrusel.spec.ts:204` "CA-7: con prefers-reduced-motion..." |
| CA-8 | Ver sección dedicada abajo | — |
| CA-9 | El helper `irAlCarrusel()` (compartido por las seis pruebas) hace `test.skip(...)` con motivo legible si no hay bloque de equipo o si no desborda | `carrusel.spec.ts:41-57` |
| CA-10 | Ninguna prueba escribe; todas miden `scrollLeft`/atributos ARIA de lo que ya está en la portada, sin nombres ni cantidades de miembros hardcodeados (`puntos.last()`, `destinos.length` implícito vía `paginas()`) | Lectura del spec completo |

## CA-8 — la prueba falla sin el fix

Cambié en `app/(sitio)/_componentes/CarruselEquipo.tsx`, dentro de `mover()`,
la llamada a `animarScroll` por la implementación que T-005 tenía antes del
fix:

```diff
-      cortarRef.current = animarScroll(
-        (posicion) => {
-          pista.scrollLeft = posicion;
-        },
-        pista.scrollLeft,
-        destino,
-        RELOJ_NAVEGADOR,
-      );
+      pista.scrollTo({ left: destino, behavior: 'smooth' });
```

Corrí solo esa prueba (`npm run test:navegador -- -g "CA-2"`). Salida real:

```
Running 1 test using 1 worker

  ✘  1 [chromium] › tests/navegador/carrusel.spec.ts:99:7 › Carrusel de pilotos de la portada › CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción (361ms)

  1) [chromium] › tests/navegador/carrusel.spec.ts:99:7 › Carrusel de pilotos de la portada › CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción

    Error: expect(received).not.toBe(expected) // Object.is equality

    Expected: not 0

      111 |
      112 |     const despues = await scrollLeftDe(pista);
    > 113 |     expect(despues).not.toBe(antes);
          |                         ^
      114 |     expectCerca(despues, esperado);
      115 |   });
      116 |
        at .../tests/navegador/carrusel.spec.ts:113:25

  1 failed
    [chromium] › tests/navegador/carrusel.spec.ts:99:7 › ... CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción
```

`scrollLeft` se quedó en `0`: reproduce exactamente el bug original — el
navegador no arranca `scrollTo({ behavior: 'smooth' })` cuando el paso lo
dispara el `setInterval` en vez de un clic. La prueba de CA-2 sí puede fallar,
que era el problema entero de T-005-D06.

Reverti el cambio con `git checkout -- "app/(sitio)/_componentes/CarruselEquipo.tsx"`
(no tenía otro diff pendiente en ese archivo) y confirmé que no quedó en el
diff — ver "Commits" y la corrida completa en "Verificación", ambas ya con el
fix real puesto.

## Commits

```
769c7d9 docs: cómo correr las pruebas de navegador
8826773 test(navegador): pruebas de Playwright del carrusel de la portada
3c85a92 chore(ci): playwright como devDependency y script test:navegador
2b4b726 docs(pm): brief T-006 — pruebas de navegador con Playwright   ← ya en la base
```

(`git log --oneline origin/Inf015/oliver132123-carrusel-equipo..HEAD`; el
`CarruselEquipo.tsx` alterado para CA-8 no generó commit — se revirtió antes
de stagear nada.)

## Verificación (salida real, recortada)

```
$ npx next typegen && npx tsc --noEmit
✓ Types generated successfully
(sin errores)

$ npm run lint
> eslint
(sin salida = sin errores)

$ npm test
 Test Files  11 passed (11)
      Tests  230 passed (230)
   Duration  285ms

$ npm ci && npx playwright install chromium && npm run test:navegador
added 397 packages, and audited 398 packages in 6s
...
Running 6 tests using 4 workers
  ✓ CA-5: se pausa con el foco del teclado, aunque el puntero entre y salga (816ms)
  ✓ CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción (822ms)
  ✓ CA-3: en la última parada, el intervalo vuelve al principio (855ms)
  ✓ CA-4: se pausa con el puntero encima y retoma al salir (925ms)
  ✓ CA-7: con prefers-reduced-motion no rota sola (238ms)
  ✓ CA-6: los controles respetan los extremos y marcan la parada activa (747ms)
  6 passed (9.2s)
```

`npm test` sigue en 230 (antes de esta tarea, sin la suite de navegador) y no
recogió ningún `.spec.ts`: confirmado leyendo `vitest.config.mts`
(`include: ['tests/unidad/**/*.test.ts']`, sin tocar) y viendo que
"Test Files 11" no cambia con o sin `tests/navegador/` presente.

## Cuánto tarda la suite

**~9 segundos** de punta a punta (incluido compilar el sitio), con el
servidor arrancado en frío en cada corrida — no hubo que esperar ningún
intervalo real de 5 s gracias a `page.clock`. Sin la instalación de Chromium
(que se hace una sola vez y queda cacheada fuera del repo).

## Migraciones

Ninguna.

## Decisiones tomadas

- **`page.clock.runFor(...)` y no `fastForward(...)`** — `fastForward` "solo
  dispara los timers vencidos una vez" (como cerrar la laptop y abrirla
  después): no re-ejecuta la cadena de `requestAnimationFrame` que
  `animarScroll` reprograma cuadro a cuadro, así que la animación no llegaría
  a completarse dentro del salto. `runFor` sí "dispara todos los callbacks de
  tiempo en orden", incluida esa cadena y el `setInterval` de la rotación.
- **`MS_ENTRE_PASOS` duplicado en el spec, con comentario** — no está
  exportado desde `CarruselEquipo.tsx` (es un detalle del componente) y el
  brief prohíbe tocar ese archivo. Documenté la duplicación explícitamente
  para que quede claro que hay que actualizarla si cambia el intervalo real.
- **`paginas`/`proximaPosicion` de `lib/carrusel` como oráculo**, en vez de
  reinventar la aritmética de píxeles en el spec: son funciones puras, ya
  correctas por sus propios tests de T-005, y usarlas evita hardcodear
  posiciones o depender de cuántos pilotos haya (CA-10).
- **CA-3 arranca en la última parada fijando `scrollLeft` directo** (no a
  fuerza de clics): `paso()` lee `scrollLeft` del DOM, no del estado de
  React, así que no hace falta simular una secuencia de clics — que además
  movería el foco a un botón y podría interferir con lo que se está probando.
- **CA-5 usa `.focus()` sobre el enlace**, no una secuencia real de `Tab`: el
  comportamiento que importa es "¿el carrusel reacciona a que el foco esté
  adentro?", no cuántos `Tab` hacen falta para llegar — eso es un detalle del
  orden de tabulación de la página entera, ajeno a este componente.
- **Margen de 2 px al comparar `scrollLeft` contra un destino calculado**
  (`MARGEN_PIXELES`), igual al `TOLERANCIA` que ya usa `lib/carrusel.ts`: el
  subpíxel del navegador podía hacer fallar una comparación exacta por motivos
  ajenos al fix. Las comparacions de "no cambió" (pausa) sí son exactas: ahí
  no debería moverse ni un subpíxel.
- **Un solo proyecto (`chromium`)**: el brief solo pide instalar y usar
  chromium; no agregué Firefox ni WebKit.

## Fuera de alcance que vi (no tocado)

- Nada nuevo. El carrusel se comportó según el brief y según su propio código
  en las seis pruebas; no encontré ningún defecto adicional al explorarlo
  (más allá del ya conocido T-005-D06, que es justamente lo que esta tarea
  cierra).

## Preguntas / bloqueos

Ninguna.
