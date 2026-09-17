# Entrega T-006 — ronda 5

**Estado:** LISTA PARA QA

Ronda de **T-006-D08** (S2/P1) de `reporte-qa-r4.md`, tratado como lo que es:
no una instancia sino una **familia** de oráculos mentirosos. Se cerró la clase
entera en toda la suite, no solo CA-4.

El diff de esta ronda es un solo archivo de código,
`tests/navegador/carrusel.spec.ts`, más esta entrega. El componente del
carrusel quedó **sin cambios**: las tres mutaciones para demostrar sensibilidad
se revirtieron con `git checkout --` y `git status --short` cierra vacío.

## Nota de proceso — quinta ronda sobre un máximo de tres

La autoriza el PM y el motivo es el que dice el kit: **el brief estaba mal
cortado**. La ronda 3 pidió arreglar CA-7 —una instancia— en vez de la clase, y
la misma falla volvió por CA-4 dos rondas después. Queda como ejemplo de por
qué existe el límite: no fue el trabajo el que se desbordó, fue el recorte del
problema.

## El defecto, y por qué era una familia

Comparar la posición final con la inicial **nunca** puede distinguir «no se
movió» de «dio la vuelta y volvió», porque el carrusel es circular: tantos
pasos como paradas lo dejan exactamente donde empezó. Con dos paradas alcanza
con dos pasos; con seis, con seis. Cualquier prueba que use esa igualdad como
oráculo de inmovilidad es ciega a una rotación completa.

El reverso miente igual: afirmar movimiento con «final distinto del inicial»
acepta que el carrusel haya ido a parar a cualquier lado, incluido un recorrido
que dio una vuelta y media.

## Defecto → fix → prueba

| Defecto | Fix | Prueba / evidencia |
| ------- | --- | ------------------ |
| **T-006-D08** (S2/P1) — CA-4 comparaba solo la posición final tras dos intervalos con el puntero dentro; con dos paradas y la fase adecuada, `0 → 408 → 0` pasaba por inmovilidad | Se extrajo el mecanismo que la ronda 3 había escrito para CA-7 y se aplicó a **toda la familia**: `exigirInmovilidad(pista, ventana, contexto)` graba el recorrido durante la ventana entera y exige que no haya ninguna posición intermedia — `tests/navegador/carrusel.spec.ts:276-303` | Demostración D08-a abajo: con la pausa por puntero anulada, CA-4 falla con recorrido `[0,413,827,1240,1653,2067,1653,1240,827,413,0]` |
| **misma familia, no reportado** — CA-5 (pausa por foco) tenía el oráculo idéntico: `expect(scrollLeft).toBe(antes)` tras dos intervalos | Usa `exigirInmovilidad` con ventana de una vuelta — `spec:633-637` | Demostración D08-b abajo: con la pausa por foco anulada, CA-5 falla con el mismo recorrido circular |
| **misma familia, no reportado** — `noSeMueve`, el helper de las dos pruebas de cancelación a mitad de paso, tomaba tres muestras puntuales en tiempo real (con huecos entre una y otra, riesgo que QA ya había marcado) y después comparaba **solo el final** de dos intervalos de reloj falso | Reescrito sobre `exigirInmovilidad`: el evento `scroll` graba el tramo real sin huecos, y el tramo de reloj falso pasa de dos intervalos a **una vuelta entera** — `spec:467-484` | Demostración D08-b abajo: `CA-5 (T-005-D02)` falla dentro de `noSeMueve` con recorrido circular |
| **misma familia, el reverso, no reportado** — tres aserciones afirmaban movimiento con solo «distinto de antes»: CA-4 al salir el puntero (`spec:449` de r4), CA-4 en curso paso 1, CA-5 en curso al salir el foco | Las tres fijan además la **parada esperada** con `proximaPosicion`, como ya hacía CA-2 — `spec:556`, `:585`, `:684` | Cubierto por el gate: las ocho siguen pasando con el componente intacto, y CA-4 en curso detecta la mutación del puntero justamente por esta vía (`Expected: 413, Received: 827`) |

Y el guardián que hace honesto a todo lo anterior:
`exigirVueltaEntera(desde, destinos, max, contexto)` (`spec:326-341`) simula los
`destinos.length` pasos con `proximaPosicion` —la función pura del componente—
y **exige** que vuelvan al punto de partida. Si no cerrara la vuelta, la ventana
no sería el peor caso y un fallo podría venir de haber quedado lejos del origen
en vez de las posiciones intermedias. Lo llaman CA-4, CA-5, `noSeMueve` y CA-7.

Complemento necesario: `fijarScroll` (`spec:346-352`) deja la pista en una
parada exacta antes de cada ventana de inmovilidad. Desde una posición
intermedia —tabular mueve el scroll para traer el enlace enfocado a la vista—
una vuelta entera **no** regresa al mismo punto, y `exigirVueltaEntera` no se
cumpliría.

### Inventario: dónde estaba el patrón y cómo quedó

| Prueba | Oráculo en r4 | Oráculo ahora |
| ------ | ------------- | ------------- |
| CA-2 | `not.toBe(antes)` + `expectCerca(esperado)` | Sin cambios: ya fijaba la parada esperada |
| CA-3 | `toBe(0)` exacto tras un paso | Sin cambios: posición exacta, una sola ventana de un paso |
| CA-4, pausa | `toBe(antes)` tras 2 intervalos | `exigirInmovilidad` sobre una vuelta entera |
| CA-4, reanudación | `not.toBe(antes)` | `not.toBe` + `expectCerca(proximaPosicion(...))` |
| CA-4, paso en curso | `not.toBe(inicio)`; `noSeMueve` con 3 muestras + final | `expectCerca` de la parada; `noSeMueve` con recorrido y vuelta entera |
| CA-5, pausa | `toBe(antes)` tras 2 intervalos | `exigirInmovilidad` sobre una vuelta entera |
| CA-5, paso en curso | `noSeMueve`; `not.toBe(quieto)` al final | `noSeMueve` nuevo; `expectCerca` de la parada |
| CA-6 | Posiciones exactas tras clics, sin intervalos | Sin cambios: no hay ventana de espera |
| CA-7 | Recorrido completo (arreglado en r3) | Reescrita sobre los helpers comunes, mismo criterio |

Las únicas que quedaron sin tocar son las que no tienen el patrón: CA-2 y CA-3
observan una ventana de **un solo paso** (5550 ms), donde con dos o más paradas
una vuelta es imposible, y además fijan la posición exacta esperada; CA-6 no
avanza ningún intervalo.

## Sensibilidad de las pruebas nuevas

### D08-a — pausa por puntero anulada

Mutación, en `app/(sitio)/_componentes/CarruselEquipo.tsx:167` (la que describe
QA: quitar la actualización de `onMouseEnter`):

```diff
-      onMouseEnter={() => setPunteroAdentro(true)}
+      onMouseEnter={() => undefined}
```

```
$ npm run test:navegador -- -g "CA-4"

    Error: Con el puntero encima del carrusel la rotación tiene que estar frenada: el carrusel se movió. Recorrido [0,413,827,1240,1653,2067,1653,1240,827,413,0] — empieza en 0 y termina en 0, así que comparar solo la posición final no lo habría notado

    expect(received).toEqual(expected) // deep equality

    - Expected  -  0
    + Received  + 10

      Array [
        0,
    +   413,
    +   827,
    +   1240,
    +   1653,
    +   2067,
    +   1653,
    +   1240,
    +   827,
    +   413,
    +   0,
      ]

        at exigirInmovilidad (.../tests/navegador/carrusel.spec.ts:303:5)
        at .../tests/navegador/carrusel.spec.ts:544:5

    Error: expect(received).toBe(expected) // Object.is equality
    Expected: 413
    Received: 827
        at .../tests/navegador/carrusel.spec.ts:593:22

  2 failed
    [chromium] › carrusel.spec.ts:528:7 › CA-4: se pausa con el puntero encima y retoma al salir
    [chromium] › carrusel.spec.ts:563:7 › CA-4 (T-005-D02): el puntero corta el paso que ya estaba en curso
```

Las **dos** pruebas de CA-4 fallan. La primera por el recorrido; la segunda por
el paso que ya no se corta (esperaba la parada 413 y encontró 827), que es el
reverso del mismo problema.

### D08-b — pausa por foco anulada

Mutación equivalente, en `CarruselEquipo.tsx:169`:

```diff
-      onFocusCapture={() => setFocoAdentro(true)}
+      onFocusCapture={() => undefined}
```

```
$ npm run test:navegador -- -g "CA-5"

    Error: Con el foco del teclado dentro del carrusel la rotación tiene que estar frenada: el carrusel se movió. Recorrido [0,413,827,1240,1653,2067,1653,1240,827,413,0] — empieza en 0 y termina en 0, así que comparar solo la posición final no lo habría notado
    Error: El paso cortado por el foco no puede seguir moviéndose: el carrusel se movió. Recorrido [0,413,827,1240,1653,2067,1653,1240,827,413,0] — empieza en 0 y termina en 0, así que comparar solo la posición final no lo habría notado
  2 failed
```

Las dos pruebas de CA-5. La segunda falla **dentro de `noSeMueve`**
(`spec:476`), que es el helper compartido: queda demostrado también el oráculo
de las pruebas de cancelación a mitad de paso.

### D08-c — CA-7 no perdió sensibilidad al reescribirla sobre los helpers

CA-7 se reescribió para usar los mismos `exigirVueltaEntera` +
`exigirInmovilidad`. Se repitió la mutación de la ronda 3 (quitar `sinMovimiento`
de la condición del intervalo, `componente:155`) para comprobar que el
refactor no aflojó nada:

```
$ npm run test:navegador -- -g "CA-7"

    Error: Con prefers-reduced-motion el carrusel no puede rotar solo: el carrusel se movió. Recorrido [0,413,827,1240,1653,2067,0] — empieza en 0 y termina en 0, así que comparar solo la posición final no lo habría notado
  1 failed
```

Las tres mutaciones se revirtieron con
`git checkout -- 'app/(sitio)/_componentes/CarruselEquipo.tsx'`.

### Fallan por el motivo correcto

Es la comprobación que pidió el PM, y la respuesta está en los propios
recorridos: **los tres empiezan en 0 y terminan en 0**.

| Demostración | Recorrido | ¿La aserción de r4 habría dado verde? |
| ------------ | --------- | ------------------------------------- |
| D08-a, CA-4 pausa | `[0,413,827,1240,1653,2067,1653,1240,827,413,0]` | **Sí**: `expect(despues).toBe(antes)` con `despues = 0 = antes` |
| D08-b, CA-5 pausa | `[0,413,827,1240,1653,2067,1653,1240,827,413,0]` | **Sí**, idéntico |
| D08-b, `noSeMueve` | `[0,413,827,1240,1653,2067,1653,1240,827,413,0]` | **Sí**: la comparación final de `noSeMueve` daba `0 === 0` |
| D08-c, CA-7 | `[0,413,827,1240,1653,2067,0]` | **Sí** |

O sea: en los cuatro casos el carrusel rotó de punta a punta y volvió al
origen, y el oráculo viejo lo habría aceptado como inmovilidad. Lo único que
separa verde de rojo son las posiciones intermedias, que es exactamente lo que
el fix agrega.

Y no es casualidad ni suerte con la geometría de hoy: `exigirVueltaEntera` lo
**exige** antes de medir, en cada una de las cuatro pruebas y con la geometría
medida sobre el DOM real. Si mañana cambia la cantidad de pilotos y la ventana
dejara de cerrar la vuelta, la prueba avisa con su propio mensaje en vez de
fallar disfrazada. En las tres corridas de arriba esa aserción **pasó**: las
vueltas cierran (seis paradas, `[0,413,827,1240,1653,2067]`).

El recorrido de ida y vuelta —sube hasta 2067 y baja— es el paso que vuelve del
tope al origen: la pista tiene `scroll-snap-type: x mandatory`, así que el
navegador reporta las paradas por las que barre la animación de regreso.

## Commits

```
$ git log --oneline d7c71a4..HEAD
2125237 test(home): exigir el recorrido completo en toda prueba que afirme ausencia de movimiento
818b0ab docs(pm): QA T-006 r4 — FAIL
651ed3e docs(home): entrega T-006 ronda 4 — D07 con su sensibilidad demostrada
9ec530f test(home): exigir que la portada haya cargado antes de decidir si se omite
976b5d4 docs(pm): QA T-006 r3 — SIN VEREDICTO
62669ed docs(home): entrega T-006 ronda 3 — D01 y D06 con su sensibilidad demostrada
2bbefd2 test(home): apoyar el salto del carrusel en una señal independiente y vigilar el recorrido entero en CA-7
```

De esta ronda es `2125237` (más el commit de esta entrega).

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
   Duration  360ms

$ npm run test:navegador
Running 8 tests using 4 workers

  ✓  4 › CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción (1.0s)
  ✓  1 › CA-3: en la última parada, el intervalo vuelve al principio (1.1s)
  ✓  3 › CA-4 (T-005-D02): el puntero corta el paso que ya estaba en curso (10.2s)
  ✓  5 › CA-5: se pausa con el foco del teclado (Tab), aunque el puntero entre y salga (9.3s)
  ✓  7 › CA-6: los controles respetan los extremos y marcan la parada activa (768ms)
  ✓  2 › CA-4: se pausa con el puntero encima y retoma al salir (11.5s)
  ✓  6 › CA-5 (T-005-D02): el foco que entra con Tab corta el paso en curso (11.2s)
  ✓  8 › CA-7: con prefers-reduced-motion no rota sola (9.0s)

  8 passed (26.0s)

$ git status --short
                (vacío)
```

**230/230 unitarias** y **8 de navegador pasadas, 0 omitidas**.

## Cuánto tarda la suite

26,0 s de ejecución de las ocho pruebas (26,4 s de reloj para todo el comando,
con el build de Next ya cacheado). Venía de 16,0 s en la ronda 4: las cuatro
pruebas que ahora observan una vuelta entera pasaron de ~1 s a 9-11,5 s cada
una.

El costo es real y conviene que el PM lo sepa: grabar cuadro a cuadro obliga al
reloj falso a **simular cada cuadro** de la ventana en vez de saltar de
temporizador en temporizador, y la ventana además se alargó de dos intervalos a
una vuelta entera (seis, con los pilotos de hoy). Crece con la cantidad de
pilotos. Sigue muy lejos de «minutos» y corre en cuatro workers en paralelo,
pero si algún día hay veinte pilotos habrá que revisarlo.

## Migraciones

Ninguna.

## Decisiones tomadas

- **Se cerró la clase, no la instancia** — se revisaron los nueve oráculos de la
  suite (tabla «Inventario» arriba) y se corrigieron los seis que tenían la
  forma, no solo el que QA reportó. Dos de esos seis nadie los había reportado:
  CA-5 pausa y `noSeMueve`.
- **El mismo helper para las cuatro pruebas de inmovilidad** — `exigirInmovilidad`
  toma la ventana como función, así sirve igual para «avanzá el reloj falso» y
  para «esperá en tiempo real y después avanzá el falso». Alternativa descartada:
  copiar el bloque de CA-7 en cada prueba, que es exactamente cómo esta familia
  se escapó dos rondas.
- **La ventana de inmovilidad es una vuelta entera, derivada de la geometría
  medida** — no un número fijo de intervalos. Así el peor caso del oráculo viejo
  es el caso que se prueba siempre, en cualquier portada, sin que nadie tenga
  que recalcular nada cuando cambie la cantidad de pilotos.
- **`noSeMueve` deja de muestrear tres veces** — el evento `scroll` no tiene
  huecos: registra cualquier desplazamiento en cuanto ocurre. Tres muestras
  separadas por 100 ms no prueban nada de lo que pasa entre ellas, riesgo que QA
  ya había señalado dos rondas seguidas. La ventana real sigue siendo de 300 ms,
  que es lo que necesita el `scroll-snap` de Chromium para terminar lo que deja
  pendiente un paso cancelado.
- **`fijarScroll` antes de las ventanas de inmovilidad** — tabular puede correr
  la pista para traer a la vista el enlace enfocado, y desde una posición que no
  es parada una vuelta entera no vuelve al mismo punto. Es preparación, no lo
  que se mide; mismo patrón que ya usaba CA-3.
- **El reverso también se ajustó** — «distinto de antes» acepta cualquier
  destino. Las tres aserciones de movimiento fijan ahora la parada esperada con
  `proximaPosicion`, igual que CA-2.
- **Los mensajes de fallo incluyen el recorrido y los extremos** — para que la
  próxima lectura de QA no necesite una ronda más para saber si el fallo fue por
  el motivo correcto.

## Fuera de alcance que vi (no tocado)

- La suite pasó de 16 s a 26 s. Si crece la cantidad de pilotos crecerá más
  (la ventana es un intervalo por parada). Una salida sería exponer
  `MS_ENTRE_PASOS` desde el componente y bajarlo bajo un flag de prueba, pero
  eso toca producción y esta tarea prueba, no arregla —
  `app/(sitio)/_componentes/CarruselEquipo.tsx:39`.
- Sigue sin cerrarse el riesgo que QA marcó sobre `recorridoGrabado`: si
  faltara `window.__recorridoCarrusel` devolvería `[el.scrollLeft]` en vez de
  fallar. No hay hoy ningún camino que lo borre —
  `tests/navegador/carrusel.spec.ts:269`.
- Sigue en pie el límite de la pausa tardía: entrar a los 48 ms corta el paso,
  pero pasados ~200 ms Chromium termina el desplazamiento por el `scroll-snap`,
  fuera del alcance de `cancelAnimationFrame`. Es un límite del componente —
  `app/(sitio)/_componentes/CarruselEquipo.tsx:119-122`.
- `next build` avisa que el convenio `middleware` está deprecado en favor de
  `proxy`. Nada que ver con esta tarea — `middleware.ts`.

## Preguntas / bloqueos

Ninguno.
