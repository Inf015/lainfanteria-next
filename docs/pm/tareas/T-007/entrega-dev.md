# Entrega T-007 — ronda 2

**Estado:** LISTA PARA QA

Ronda 1 quedó en FAIL con dos P1. Esta ronda los cierra: **T-007-D01** era un
defecto de verdad y se arregló donde correspondía; **T-007-D02** era un criterio
mal escrito, el PM lo enmendó y acá está la prueba que el criterio nuevo pide.
Además se rehízo la evidencia de CA-7 sin instrumentar, que QA marcó como
reserva de trazabilidad.

## Qué cambió en esta ronda

- `animarScroll` avisa cuándo terminó, con un `alTerminar` opcional que se llama
  una sola vez, justo después de escribir la última posición, y nunca si la
  animación se cortó antes — `lib/carrusel.ts:154-191`
- El componente ya no deduce el fin releyendo el reloj: pasa `encenderSnap` como
  ese aviso — `app/(sitio)/_componentes/CarruselEquipo.tsx:133-152`
- Tres pruebas de unidad del aviso de fin, una de ellas con el cuadro que llega
  tarde (el caso exacto de QA) — `tests/unidad/carrusel.test.ts:230-293`
- El reloj falso de unidad aprende a correr un cuadro tarde: timestamp de rAF y
  lectura del reloj por separado — `tests/unidad/carrusel.test.ts:155-168`
- CA-5 se reescribió para entrar con `Tab` de frente, que es el caso que la
  ronda 1 esquivaba; la entrada por los controles quedó como caso extra —
  `tests/navegador/carrusel.spec.ts:774-856`

Lo de la ronda 1 no se tocó: apagar el snap mientras dura el paso, encenderlo al
llegar a la parada, y las vueltas por gesto (`pointerdown`, `wheel`).

## T-007-D01 — el snap podía encenderse con un cuadro pendiente

**Causa.** `animarScroll` calcula su avance con el timestamp que le pasa
`requestAnimationFrame` —el instante en que empezó el cuadro—, y el componente
decidía si el paso había terminado leyendo `performance.now()` **otra vez**,
dentro del callback. Si el cuadro se ejecuta con retraso, las dos lecturas no
coinciden: el componente daba el paso por terminado y encendía el snap mientras
el helper todavía iba a escribir posiciones intermedias. Y encender el snap
entre dos tarjetas provoca justo el salto que esta tarea vino a eliminar.

**Arreglo.** El fin lo avisa quien escribe las posiciones, que es el único que
lo sabe. `animarScroll` acepta un `alTerminar` y lo llama después del último
`aplicar`, en el mismo cuadro en que `t` llega a 1. El componente le pasa
`encenderSnap` y deja de mirar el reloj por su cuenta. No cambió nada de la
aritmética (`paginas`, `proximaPosicion`, `indiceActivo`, `posicionAnimada`).

**La prueba falla sin el arreglo.** Revertidos `lib/carrusel.ts` y el componente
al estado de la ronda 1 (`git checkout -- <los dos archivos>`, con HEAD en
`9d61fc6`):

```
$ npm test
     × avisa el fin una sola vez, después de escribir la última posición 4ms
     × no avisa el fin con un cuadro todavía pendiente, aunque el reloj ya haya pasado los MS_ANIMACION 1ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unidad/carrusel.test.ts > animarScroll > avisa el fin una sola vez, después de escribir la última posición
AssertionError: expected [] to have a length of 1 but got +0

 ❯ tests/unidad/carrusel.test.ts:247:48
    246|     avanzarA(MS_ANIMACION);
    247|     expect(eventos.filter((e) => e === 'fin')).toHaveLength(1);
       |                                                ^

 FAIL  tests/unidad/carrusel.test.ts > animarScroll > no avisa el fin con un cuadro todavía pendiente, aunque el reloj ya haya pasado los MS_ANIMACION
AssertionError: expected +0 to be 1 // Object.is equality

 ❯ tests/unidad/carrusel.test.ts:277:19
    275|     falso.correrCuadroTarde(MS_ANIMACION, MS_ANIMACION * 3);
    276|     expect(posiciones.at(-1)).toBe(413);
    277|     expect(fines).toBe(1);
       |                   ^

 Test Files  1 failed | 10 passed (11)
      Tests  2 failed | 231 passed (233)
```

Repuesto el arreglo, 233/233. La prueba del cuadro tarde reproduce los números
de QA: timestamp de rAF 300 ms, reloj ya en 460, posición **397,7** de 413 — y
exige que ahí **no** se avise el fin y que quede un cuadro pedido.

**Por qué la reproducción es de unidad y no de navegador.** Bajo `page.clock`,
el timestamp del cuadro y `performance.now()` son el mismo reloj falso y avanzan
juntos dentro de un `runFor`: el desfase que provoca el defecto no se puede
fabricar ahí. Por eso la regresión vive donde el reloj se inyecta — que es
justamente para lo que `RelojCuadros` existe.

## T-007-D02 — CA-5, con el criterio enmendado

QA tenía razón en que la prueba esquivaba la entrada con `Tab`. El criterio
enmendado pide lo que de verdad importaba: **que la rotación se detenga**.

**El comportamiento del navegador al enfocar, en una línea:** cuando el `Tab`
lleva el foco a un enlace que el paso dejó fuera de la vista, el navegador
desplaza el scroll para mostrarlo (medido: 394 → 0); eso es accesibilidad
funcionando —lo contrario dejaría el foco en algo que no se ve— y no es el
carrusel moviéndose solo.

La prueba nueva entra con `Tab` de frente y mide, en este orden:

1. que el paso en curso está pasado el punto medio y no llegó a su parada;
2. que después de darle tiempo real al reacomodo del navegador, el scroll **no**
   está en la parada que el paso perseguía;
3. que a partir de ahí no se mueve más mientras el foco siga dentro — ni en
   tiempo real ni avanzando el reloj falso dos intervalos enteros;
4. que la rotación seguía viva: al salir el foco, vuelve a andar.

El componente **no** se tocó para impedir el reposicionamiento.

**La prueba tiene dientes.** Mutación: quitar `cortar()` del efecto de pausa.

```
$ npx playwright test --grep "CA-5 \(T-007\): el foco"
  ✘  CA-5 (T-007): el foco que entra con Tab pasado el punto medio detiene la rotación (1.2s)
    Error: expect(received).toBe(expected) // Object.is equality
    Expected: 0
    Received: 413
      453 |   await page.clock.runFor(MS_ENTRE_PASOS * 2);
    > 454 |   expect(await scrollLeftDe(pista)).toBe(posicion);
```

Es decir: con el foco adentro, el carrusel completaba el paso hasta 413. La
mutación se revirtió.

## La trayectoria, antes y después (sin cambios respecto de la ronda 1)

Registrada dentro de la página con `requestAnimationFrame` y leída una sola vez
al final. Un paso completo de la portada compilada, origen `0`, destino `413`:

| | Posiciones distintas que toma `scrollLeft` | Intermedias |
| --- | --- | --- |
| **Antes** | `0, 413` | **0** |
| **Después** | `0, 35, 75, 112, 146, 178, 207, 233, 257, 279, 299, 317, 332, 346, 359, 369, 378, 386, 393, 398, 402, 406, 408, 410, 412, 413` | **24** |

Medido aparte en Chromium, escribiendo a mano las mismas posiciones sobre una
pista igual:

| `scroll-snap-type` | `[pedido, real]` |
| --- | --- |
| `x mandatory` | `[20,0] [60,0] [100,0] [150,0] [200,308] [250,308] [300,308]` |
| `none` | `[20,20] [60,60] [100,100] [150,150] [200,200] [250,250] [300,300]` |

## Trazabilidad

| CA | Cómo se cumple | Test / evidencia |
| -- | -------------- | ---------------- |
| CA-1 | 24 posiciones intermedias distintas, con al menos una en cada cuarto del recorrido | `CA-1 (T-007)` |
| CA-2 | El snap se enciende con el aviso de fin de `animarScroll`, cuando el scroll ya está en la parada; con un cuadro pendiente ya no puede encenderse (D01) | `CA-2 (T-007)` + las tres de unidad de `animarScroll` |
| CA-3 | El snap sigue puesto en el estado normal y vuelve en el `pointerdown` si un paso cortado lo había apagado | `CA-3 (T-007)` ×2 |
| CA-4 | El corte deja el scroll donde está y no enciende el snap | `CA-4 (T-007)` |
| CA-5 (enmendado) | Entrando con `Tab` de frente: el paso no llega a su parada y, tras el reacomodo del navegador, el carrusel no se mueve más con el foco adentro | `CA-5 (T-007)` y `CA-5 (T-007, extra)` |
| CA-6 | 233/233 de unidad (230 previas + 3 nuevas de D01, ninguna quitada) y 15/15 de navegador, cero omitidas; las ocho originales siguen verdes | Salidas de abajo |
| CA-7 | Componente revertido a `ef63353`, CA-1 falla con `intermedias registradas: []` | Sección siguiente |

## CA-7 — rehecha sin instrumentar

QA observó, con razón, que la salida de la ronda 1 citaba líneas que no eran las
del spec entregado: venía de una corrida con una traza temporal. Esta vez se
revirtió **solo el componente**, al commit anterior a T-007, y se corrió el spec
tal cual está entregado:

```
$ git checkout ef63353 -- "app/(sitio)/_componentes/CarruselEquipo.tsx"
$ git diff --stat ef63353 -- "app/(sitio)/_componentes/CarruselEquipo.tsx"   # vacío: revertido
$ npx playwright test --grep "CA-1 \(T-007\)"
Running 1 test using 1 worker
  ✘  1 [chromium] › tests/navegador/carrusel.spec.ts:659:7 › CA-1 (T-007): el paso se desliza — la trayectoria pasa por el medio (2.2s)

    Error: el paso saltó en vez de deslizarse (origen 0, destino 413; intermedias registradas: [])

    expect(received).toBeGreaterThanOrEqual(expected)

    Expected: >= 5
    Received:    0

      691 |       intermedias.length,
      692 |       `el paso saltó en vez de deslizarse (${registro})`,
    > 693 |     ).toBeGreaterThanOrEqual(MIN_INTERMEDIAS);
          |       ^
  1 failed
```

Las líneas 691-693 son las del spec entregado. Componente repuesto enseguida;
`git status --short` limpio al cerrar.

## Commits

```
$ git log --oneline ef63353..HEAD
<este commit> docs(pm): entrega T-007 ronda 2
180ba5e       test(navegador): CA-5 entra con Tab de verdad
6270d8d       test(home): el aviso de fin de animarScroll y el cuadro que llega tarde
2b52099       fix(home): el snap vuelve cuando la animación avisa, no cuando se deduce
07413ea       docs(pm): T-007 ronda 2 — D01, y CA-5 enmendado por estar mal escrito
fc72315       docs(pm): QA T-007 r1 — FAIL
9d61fc6       docs(pm): entrega T-007 ronda 1
6e08fdb       test(navegador): el paso se desliza y se puede cortar pasado el medio
192d6cb       fix(home): el carrusel se desliza en vez de saltar
```

## Verificación (salida real, recortada)

```
$ npx next typegen && npx tsc --noEmit
tsc: 0 errores

$ npm run lint
> eslint
lint: 0 problemas

$ npm test
 Test Files  11 passed (11)
      Tests  233 passed (233)

$ npm run test:navegador
Running 15 tests using 4 workers
  ✓ CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción (739ms)
  ✓ CA-3: en la última parada, el intervalo vuelve al principio (751ms)
  ✓ CA-4: se pausa con el puntero encima y retoma al salir (876ms)
  ✓ CA-5: se pausa con el foco del teclado (Tab), aunque el puntero entre y salga (511ms)
  ✓ CA-4 (T-005-D02): el puntero corta el paso que ya estaba en curso (1.3s)
  ✓ CA-5 (T-005-D02): el foco que entra con Tab corta el paso en curso (912ms)
  ✓ CA-6: los controles respetan los extremos y marcan la parada activa (839ms)
  ✓ CA-2 (T-007): el paso termina exactamente en la parada, no entre dos tarjetas (674ms)
  ✓ CA-4 (T-007): el puntero detiene el paso aun pasado el punto medio (752ms)
  ✓ CA-7: con prefers-reduced-motion no rota sola (214ms)
  ✓ CA-5 (T-007, extra): entrando por los controles, el scroll ni se mueve (852ms)
  ✓ CA-5 (T-007): el foco que entra con Tab pasado el punto medio detiene la rotación (1.2s)
  ✓ CA-1 (T-007): el paso se desliza — la trayectoria pasa por el medio (2.1s)
  ✓ CA-3 (T-007): soltar el dedo entre dos tarjetas deja una alineada (1.6s)
  ✓ CA-3 (T-007): después de un paso cortado a mitad, el arrastre sigue alineando (1.7s)
  15 passed (11.1s)
```

**Nota sobre el total de unidad:** el brief pedía 230/230. Son **233**: las 230
de siempre, ninguna quitada ni cambiada, más las tres del aviso de fin, que son
la regresión de D01. Tocar `lib/` obliga a pruebas de unidad (sección 5 del
brief).

## Migraciones

Ninguna.

## Los caminos de restauración del snap, precisados

La tabla de la ronda 1 afirmaba de más en una fila y QA lo marcó. Corregida:

| Camino | Qué pasa con el snap |
| --- | --- |
| Fin normal del paso | Se enciende con el aviso de `animarScroll`, con el scroll ya en la parada |
| Pausa por puntero o por foco | Queda apagado **a propósito** (CA-4 y CA-5); vuelve en el próximo paso que termine o en el primer gesto sobre la pista |
| Movimiento reducido, sin pausa | Se enciende en el efecto de corte |
| Movimiento reducido **estando pausado y desbordando** | No vuelve en ese cambio de estado. No es un agujero: con movimiento reducido no hay rotación automática, así que el snap vuelve por el primer gesto (`pointerdown`/`wheel`) o por el primer control que se toque, que con `sinMovimiento` enciende el snap antes del salto instantáneo |
| Dejar de desbordar | Se enciende: sin scroll no hay nada que reajustar |
| Desmontaje | El nodo se va con su estilo en línea; no queda ninguna pista visible sin snap |
| Paso encima de otro | El nuevo paso sigue con el snap apagado y lo enciende al llegar a su parada |

El único estado en que el snap queda apagado es "paso cortado a mitad de
camino", y tiene prueba propia de que el arrastre con el dedo sigue alineando
ahí — el PM verificó su sensibilidad dejando el snap sin volver nunca.

## Decisiones tomadas

- **El aviso de fin va en `animarScroll`, no en el componente** — porque el
  timestamp del cuadro solo lo ve la animación. Alternativa descartada: darle al
  componente el `arranque` de la animación para que compare contra el timestamp;
  seguiría siendo una deducción, con dos sitios que tienen que estar de acuerdo.
- **`alTerminar` es opcional** — así los llamados que no lo necesitan no cambian
  y el helper sigue sirviendo para animar cualquier cosa.
- **No se tocó el componente por T-007-D02** — el reposicionamiento al enfocar
  es correcto; impedirlo empeoraría la accesibilidad.
- Se mantienen las decisiones de la ronda 1: el corte no enciende el snap
  (encenderlo entre paradas reajusta el scroll en el acto: 40→0, 200→308,
  300→308, 380→308), y la vuelta por gesto ocurre en `pointerdown`, no en
  `touchend`, para no matar la inercia del arrastre.

## Fuera de alcance que vi (no tocado)

- Un arrastre con el dedo **durante** un paso programático pelea con la
  animación: los dos escriben `scrollLeft`, y ahora además el gesto enciende el
  snap sin cortar el paso. Es anterior a T-007 y QA también lo anotó. Lo natural
  sería que un `pointerdown` sobre la pista cortara el paso en curso; es un
  cambio de comportamiento que no estaba pedido.
- Con el paso deslizándose, el `onScroll` de la pista dispara ~25 veces por paso
  en vez de 2 — `CarruselEquipo.tsx:258`. Hoy es inofensivo porque `indiceActivo`
  devuelve casi siempre el mismo número y React descarta el re-render.
- El aviso de `next build`: el convenio `middleware` está deprecado a favor de
  `proxy`.

## Preguntas / bloqueos

Ninguno.
