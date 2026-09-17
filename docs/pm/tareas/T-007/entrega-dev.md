# Entrega T-007 — ronda 1

**Estado:** LISTA PARA QA

## Qué hice

El carrusel apaga el `scroll-snap` de la pista mientras dura un paso
programático y lo vuelve a encender cuando el scroll ya está **en** la parada.
La aritmética de `lib/carrusel.ts` no se tocó.

- `apagarSnap()` / `encenderSnap()`: escriben `scroll-snap-type` en línea sobre
  la pista, con un `ref` que lleva la cuenta de si está apagado —
  `app/(sitio)/_componentes/CarruselEquipo.tsx:86-106`
- `mover()` apaga el snap antes de animar y lo enciende en el último cuadro,
  reconocido por el mismo reloj que usa `animarScroll` (no hace falta cambiarle
  la firma) — `CarruselEquipo.tsx:121-160`
- Con movimiento reducido, `mover()` enciende el snap antes del salto
  instantáneo — `CarruselEquipo.tsx:128-132`
- El efecto que corta la rotación enciende el snap salvo cuando la pausa dejó la
  pista a mitad de camino — `CarruselEquipo.tsx:172-180`
- El snap que quedó apagado por un paso cortado vuelve en el primer gesto del
  visitante sobre la pista (`pointerdown`, `wheel`) —
  `CarruselEquipo.tsx:190-201`
- Comentario en la hoja de estilos para que nadie "limpie" el estilo en línea
  sin saber por qué existe — `carrusel-equipo.module.css:23-29`
- Pruebas de navegador CA-1 a CA-5, más el caso que cubre el riesgo que
  introduce el arreglo (arrastre después de una pausa a mitad de paso) —
  `tests/navegador/carrusel.spec.ts`

## La trayectoria, antes y después

Registrada **dentro de la página** con `requestAnimationFrame` y leída una sola
vez al final (muestrear `scrollLeft` desde Node no sirve: la animación termina
antes). Un paso completo de la portada compilada, origen `0`, destino `413`:

| | Posiciones distintas que toma `scrollLeft` | Intermedias |
| --- | --- | --- |
| **Antes** (`x mandatory` siempre) | `0, 413` | **0** |
| **Después** (snap apagado durante la animación) | `0, 35, 75, 112, 146, 178, 207, 233, 257, 279, 299, 317, 332, 346, 359, 369, 378, 386, 393, 398, 402, 406, 408, 410, 412, 413` | **24** |

Coincide con lo que midió el PM: el reajuste del snap es por escritura, no por
tiempo. Medido aparte en Chromium, escribiendo a mano las mismas posiciones
sobre una pista igual:

| `scroll-snap-type` | `[pedido, real]` |
| --- | --- |
| `x mandatory` | `[20,0] [60,0] [100,0] [150,0] [200,308] [250,308] [300,308]` |
| `none` | `[20,20] [60,60] [100,100] [150,150] [200,200] [250,250] [300,300]` |

## Trazabilidad

| CA | Cómo se cumple | Test / evidencia |
| -- | -------------- | ---------------- |
| CA-1 | El snap apagado deja pasar las posiciones intermedias: 24 distintas, con al menos una en cada cuarto del recorrido | `CA-1 (T-007): el paso se desliza — la trayectoria pasa por el medio` |
| CA-2 | El snap se enciende en el último cuadro, con el scroll ya en la parada; el reajuste que provoca es un no-op. Se vigila además 300 ms en tiempo real, que es donde corre el snap | `CA-2 (T-007): el paso termina exactamente en la parada, no entre dos tarjetas` |
| CA-3 | El snap sigue puesto en el estado normal, y vuelve en el `pointerdown` si un paso cortado lo había apagado | `CA-3 (T-007)` ×2: arrastre normal y arrastre después de un paso cortado |
| CA-4 | `cortar()` deja el scroll donde está y **no** enciende el snap: a los 300 ms de los 450 el paso queda en el 96 % del recorrido y no se mueve más | `CA-4 (T-007): el puntero detiene el paso aun pasado el punto medio` |
| CA-5 | Igual, con el foco entrando por teclado | `CA-5 (T-007): el foco con Tab detiene el paso aun pasado el punto medio` |
| CA-6 | 230/230 de unidad y 14/14 de navegador, ninguna omitida; las ocho que ya existían siguen verdes (dos con la aserción corregida, ver Decisiones) | Salidas de abajo |
| CA-7 | Revertido el componente, CA-1 falla con `intermedias registradas: []` | Sección siguiente |

## CA-7 — la prueba falla sin el fix

Revertido el arreglo entero (`git checkout -- app/(sitio)/_componentes/CarruselEquipo.tsx`,
que deja el componente exactamente como está en `main`) y corrida solo la prueba
de CA-1:

```
$ npx playwright test --grep "CA-1 \(T-007\)"
Running 1 test using 1 worker
TRAYECTORIA [0,413]
  ✘  1 [chromium] › tests/navegador/carrusel.spec.ts:659:7 › CA-1 (T-007): el paso se desliza — la trayectoria pasa por el medio (2.3s)

  1) [chromium] › CA-1 (T-007): el paso se desliza — la trayectoria pasa por el medio

    Error: el paso saltó en vez de deslizarse (origen 0, destino 413; intermedias registradas: [])

    expect(received).toBeGreaterThanOrEqual(expected)

    Expected: >= 5
    Received:    0

      699 |       intermedias.length,
      700 |       `el paso saltó en vez de deslizarse (${registro})`,
    > 701 |     ).toBeGreaterThanOrEqual(MIN_INTERMEDIAS);
  1 failed
```

(La línea `TRAYECTORIA` es una traza temporal que se usó para sacar la tabla de
arriba; no quedó en la suite.)

El arreglo se volvió a poner enseguida y la suite entera quedó en 14/14.
`git status --short` no muestra nada pendiente.

## Commits

```
$ git log --oneline ef63353..HEAD
<este commit> docs(pm): entrega T-007 ronda 1
6e08fdb test(navegador): el paso se desliza y se puede cortar pasado el medio
192d6cb fix(home): el carrusel se desliza en vez de saltar
```

## Verificación (salida real, recortada)

```
$ npx next typegen && npx tsc --noEmit
✓ Types generated successfully
tsc: 0 errores

$ npm run lint
> eslint
lint: 0 problemas

$ npm test
 Test Files  11 passed (11)
      Tests  230 passed (230)

$ npm run test:navegador
Running 14 tests using 4 workers
  ✓ CA-2: rota sola y avanza a la parada siguiente, sin ninguna interacción (698ms)
  ✓ CA-3: en la última parada, el intervalo vuelve al principio (704ms)
  ✓ CA-4: se pausa con el puntero encima y retoma al salir (844ms)
  ✓ CA-5: se pausa con el foco del teclado (Tab), aunque el puntero entre y salga (535ms)
  ✓ CA-4 (T-005-D02): el puntero corta el paso que ya estaba en curso (1.3s)
  ✓ CA-5 (T-005-D02): el foco que entra con Tab corta el paso en curso (921ms)
  ✓ CA-6: los controles respetan los extremos y marcan la parada activa (808ms)
  ✓ CA-2 (T-007): el paso termina exactamente en la parada, no entre dos tarjetas (666ms)
  ✓ CA-7: con prefers-reduced-motion no rota sola (225ms)
  ✓ CA-4 (T-007): el puntero detiene el paso aun pasado el punto medio (768ms)
  ✓ CA-5 (T-007): el foco con Tab detiene el paso aun pasado el punto medio (884ms)
  ✓ CA-1 (T-007): el paso se desliza — la trayectoria pasa por el medio (2.1s)
  ✓ CA-3 (T-007): soltar el dedo entre dos tarjetas deja una alineada (1.5s)
  ✓ CA-3 (T-007): después de un paso cortado a mitad, el arrastre sigue alineando (1.7s)
  14 passed (9.7s)
```

## Migraciones

Ninguna.

## Decisiones tomadas

- **`cortar()` NO enciende el snap**, contra lo que sugiere la nota 6 del brief
  ("`cortar()` tiene que dejar el snap como estaba"). Porque encenderlo es una
  acción, no una restauración: Chromium reajusta el scroll a la parada más
  cercana en la misma línea que cambia el estilo (medido: 40→0, 200→308,
  300→308, 380→308). Hacerlo al cortar completaría exactamente el salto que
  CA-4 y CA-5 mandan frenar. Lo que sí se respeta es el *motivo* de la nota —
  que el snap no quede apagado para siempre — con dos vueltas garantizadas: el
  próximo paso que termine, y el primer gesto del visitante sobre la pista.
  Alternativa descartada: encender en `scrollend`, que dispara también al frenar
  un paso (medido) y habría vuelto a completar el salto.
- **Los caminos de cancelación, uno por uno** (lo que pidió revisar el
  coordinador):

  | Camino | Qué pasa con el snap |
  | --- | --- |
  | Fin normal del paso | Se enciende en el último cuadro, con el scroll ya en la parada |
  | Pausa por puntero | Queda apagado a propósito (CA-4); vuelve en el próximo paso o en el primer gesto |
  | Pausa por foco | Igual que el puntero (CA-5) |
  | Movimiento reducido | Se enciende: `mover()` lo enciende antes del salto instantáneo, y el efecto de corte también |
  | Dejar de desbordar | Se enciende (`!desborda` en el efecto de corte): sin scroll no hay reajuste que temer |
  | Desmontaje | El nodo se va con su estilo en línea; no hay nada que restaurar |
  | Paso encima de otro | El nuevo `mover()` sigue con el snap apagado y lo enciende al llegar a su parada |

  El único estado en que el snap queda apagado es "paso cortado a mitad de
  camino", y tiene prueba propia de que el arrastre con el dedo sigue alineando
  ahí (`CA-3 (T-007): después de un paso cortado a mitad…`).
- **El snap vuelve en `pointerdown`, no en `touchend`** — porque así el arrastre
  entero (gesto, inercia y elección de la parada) es el nativo. Cuesta un
  reacomodo visible al apoyar el dedo si el carrusel estaba parado entre dos
  tarjetas; encenderlo al soltar habría matado la inercia del gesto, que se ve
  peor. Medido: parado en 271, el `pointerdown` alinea en 308, el dedo arrastra,
  suelta en 460 y el navegador alinea en 308.
- **Dos aserciones de la suite existente cambiaron** (`CA-4 (T-005-D02)` y
  `CA-5 (T-005-D02)`). Exigían que el paso cortado dejara el scroll **en la
  parada anterior** (`expect(alPausar).toBe(trasUnPaso)`), que no era la
  animación funcionando sino el defecto tapándola: el snap no dejaba salir de la
  parada. Con el paso deslizándose de verdad, cortarlo deja el scroll **a mitad
  de camino**, que es lo que ahora exigen (`expectAMitadDeCamino`): salió del
  origen y no llegó al destino. La intención de las dos pruebas —el paso en
  curso tiene que detenerse— quedó intacta, y ninguna se borró ni se saltó.
- **CA-5 entra al carrusel con `Shift+Tab` por los controles**, no con `Tab` por
  la primera tarjeta. Porque tabular hacia adelante cae en el enlace de la
  primera tarjeta y, si el paso ya la sacó de la vista, el navegador la trae de
  vuelta — un desplazamiento legítimo suyo que deja el scroll en 0 **con
  arreglo y sin él**, así que la prueba no distinguiría nada (medido: 394 → 0).
  Los controles están fuera de la pista y siempre a la vista. La prueba de 48 ms
  que ya existía sí puede entrar de frente, porque a 96 px la tarjeta todavía se
  asoma y el navegador no la toca.
- **CA-3 usa un gesto táctil sintetizado por el navegador**
  (CDP `Input.synthesizeScrollGesture`, origen `touch`, en un contexto con
  `hasTouch`), no `page.mouse`: el ratón no arrastra un contenedor y
  `page.touchscreen` solo toca. Así el arrastre, la inercia y el reajuste del
  snap son los de verdad.

## Fuera de alcance que vi (no tocado)

- Con el paso deslizándose, el `onScroll` de la pista dispara ~25 veces por paso
  en vez de 2 — `CarruselEquipo.tsx:258`. No se nota porque `indiceActivo`
  devuelve el mismo número casi siempre y React descarta el re-render, pero si
  algún día ese handler hace algo más caro, acá está el multiplicador.
- Un arrastre con el dedo **durante** un paso programático pelea con la
  animación: los dos escriben `scrollLeft`. Es anterior a T-007 y no lo toqué.
  Lo natural sería que un `pointerdown` sobre la pista también cortara el paso.
- El aviso de `next build`: el convenio `middleware` está deprecado a favor de
  `proxy` (`middleware.ts`). Aparece en cada corrida de la suite.

## Preguntas / bloqueos

Ninguno.
