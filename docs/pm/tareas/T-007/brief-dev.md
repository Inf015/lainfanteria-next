# T-007 — El carrusel salta en vez de deslizarse

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/carrusel-sin-salto` |
| Worktree | `/Users/oliverinfante/orca/workspaces/lainfanteria-next/lainfanteria-next-carrusel-sin-salto` |
| Base | `oliver132123/pruebas-navegador` |
| Tipo | fix |
| Migración | No |
| Ronda | 2 — defectos de `reporte-qa-r1.md` |

**Antes de empezar leé `docs/pm/contexto.md` entero.** Sus reglas ganan sobre
este brief.

## 1. Por qué

El carrusel de pilotos de la portada (T-005) **no se desliza: salta**. La
animación de 450 ms no se ve en absoluto.

Medido por el PM con Playwright, registrando `scrollLeft` cuadro a cuadro
durante un paso completo, en 312 cuadros:

| `scroll-snap-type` de `.pista` | Posiciones que toma `scrollLeft` |
| ------------------------------ | -------------------------------- |
| `x mandatory` (lo que hay hoy) | `0`, `413` — y nada en el medio |
| `x proximity` | `0`, `413` — igual |
| `none` | `0, 43, 84, 122, 157, 189, 218, 245, 268, 290, 310, …` |

Causa: cada vez que `animarScroll` escribe una posición intermedia, el
navegador la reajusta al punto de snap más cercano. El scroll se queda en 0
hasta que la animación pasa el punto medio, y ahí el navegador completa el
salto de golpe.

El mismo mecanismo tiene una segunda consecuencia, ya reportada como
**T-005-D02 resuelto a medias**: si el puntero o el foco entran cuando el paso
ya pasó el punto medio, `cortar()` no puede detener nada, porque el navegador
ya hizo el salto por su cuenta. Las dos cosas se arreglan juntas.

Las 24 pruebas de unidad pasan igual: la aritmética siempre estuvo bien. Lo que
fallaba era lo que el navegador hace con ella.

## 2. Alcance

**Dentro:**
- Que el paso del carrusel se **vea** deslizarse, en vez de saltar.
- Que el `scroll-snap` siga haciendo su trabajo en el **arrastre con el dedo**,
  que es para lo que está: soltar el dedo tiene que dejar la tarjeta alineada.
- Que entrar con el puntero o el foco **a mitad del paso** lo detenga de verdad,
  también pasado el punto medio (cierra T-005-D02 del todo).
- Prueba de navegador que falle sin el arreglo.

**Fuera (no tocar aunque parezca relacionado):**
- La aritmética de `lib/carrusel.ts` (`paginas`, `proximaPosicion`,
  `indiceActivo`, `posicionAnimada`): está bien y tiene 24 pruebas.
- El resto de la suite de navegador.
- La tarjeta de `/equipo` y el resto de la portada.
- Rediseñar el carrusel o cambiar la duración de la animación.

## 3. Archivos probables

- `app/(sitio)/_componentes/CarruselEquipo.tsx`
- `app/(sitio)/_componentes/carrusel-equipo.module.css`
- `tests/navegador/carrusel.spec.ts`

## 4. Criterios de aceptación

- **CA-1** — Dado un paso del carrusel, cuando se registra `scrollLeft` cuadro
  a cuadro durante la animación, entonces se ven **al menos cinco posiciones
  intermedias distintas** entre el origen y el destino, repartidas a lo largo
  del recorrido. (Hoy son cero.)
- **CA-2** — Dado un paso terminado, entonces `scrollLeft` queda **exactamente**
  en la parada de destino, con el mismo margen de 2 px que usa el resto de la
  suite. El arreglo no puede dejar el carrusel a medio camino entre dos
  tarjetas.
- **CA-3** — Dado un arrastre con el dedo que suelta entre dos tarjetas, cuando
  termina el gesto, entonces el navegador alinea la tarjeta: el `scroll-snap`
  sigue funcionando para la interacción del usuario.
- **CA-4** — Dado un paso en curso **pasado el punto medio** (por ejemplo a los
  300 ms de los 450), cuando el puntero entra en el carrusel, entonces el
  scroll **se queda donde está** y no completa el salto.
- **CA-5** — *(enmendado por el PM en la ronda 2, ver más abajo)* Dado un paso
  en curso pasado el punto medio, cuando el foco del teclado entra en el
  carrusel con `Tab`, entonces **la rotación se detiene**: el carrusel no sigue
  avanzando solo mientras el foco esté dentro. El navegador **sí puede** mover
  el scroll para dejar a la vista el elemento que acaba de recibir el foco —eso
  es lo correcto y no cuenta como incumplimiento—, pero después de eso no puede
  haber más movimiento propio del carrusel.
- **CA-6** — Las **ocho pruebas de navegador que ya existen** siguen pasando,
  y las 230 de unidad también.
- **CA-7** — Dado que se revierte el arreglo, entonces la prueba de CA-1 falla.
  Hay que demostrarlo con salida real y dejar el cambio revertido.

## 4.b Defectos a corregir (ronda 2)

De `docs/pm/tareas/T-007/reporte-qa-r1.md` (veredicto **FAIL**).

| ID | Sev / Pri | Resumen | Esperado |
| -- | --------- | ------- | -------- |
| T-007-D01 | S2 / P1 | El snap se puede encender con la animación todavía pendiente. El helper calcula su avance con el timestamp que le pasa `requestAnimationFrame`, pero el componente decide si terminó leyendo `performance.now()` de nuevo: si el cuadro se ejecuta con retraso, las dos lecturas no coinciden, el componente da el paso por terminado y enciende el snap mientras el helper todavía va a escribir posiciones intermedias. QA lo reprodujo en memoria: timestamp de rAF 300 ms, `performance.now()` 460 ms, posición 397,7 de 413, snap encendido y otro cuadro pendiente | Que el snap se encienda cuando la animación **efectivamente terminó de escribir**, no cuando se deduce por una segunda lectura del reloj. Lo natural es que `animarScroll` avise —un callback de fin, o que devuelva esa señal— en vez de que el componente lo adivine |

### CA-5: el criterio estaba mal escrito, y es culpa del PM

QA reporta como **T-007-D02** que la prueba de CA-5 esquiva con `Shift+Tab` el
caso que la entrega documenta: entrar con `Tab` a un enlace que el paso sacó de
vista hace que el navegador traiga la tarjeta de vuelta, y el scroll va a 0.

Tiene razón en que la prueba esquiva el caso. **Pero el criterio original estaba
mal**: pedía que el scroll «se quede donde está», y eso contradice el
comportamiento correcto de un navegador. Cuando un elemento recibe el foco por
teclado, hacerlo visible es lo que corresponde; lo contrario deja a quien navega
con teclado con el foco en algo que no ve. No es un defecto a corregir: es
accesibilidad funcionando.

Lo que sí tiene que garantizar CA-5 es lo que de verdad importaba: **que la
rotación automática se detenga**. Por eso el criterio queda enmendado arriba.

Entonces, para esta ronda:

- **No** cambies el componente para impedir que el navegador reposicione al
  enfocar. Sería empeorar la accesibilidad para satisfacer un criterio mal
  redactado.
- **Sí** reescribí la prueba de CA-5 para que entre con `Tab` de verdad —el caso
  que hoy esquiva— y verifique lo que el criterio enmendado pide: que tras el
  reposicionamiento del navegador, el carrusel **no vuelva a moverse solo**
  mientras el foco siga dentro. Dejá `Shift+Tab` si te sirve como caso extra,
  pero el camino con `Tab` tiene que estar cubierto.
- Documentá en la entrega, en una línea, el comportamiento del navegador al
  enfocar, para que quede claro que es esperado y no un defecto tapado.

### Cómo comprobar que el fix de D01 sirve

Demostrá que la prueba nueva **falla sin el arreglo**, como en la ronda 1:
volvé a la deducción por `performance.now()`, corré, pegá la salida real del
fallo, revertí.

## 5. Pruebas requeridas

- [ ] Navegador: CA-1 a CA-5 en `tests/navegador/carrusel.spec.ts`.
- [ ] Unidad: solo si tocás algo de `lib/`. En principio no hace falta.

## 6. Notas técnicas

- **La dirección más simple** es desactivar el snap mientras dura la animación
  programática y volver a ponerlo al terminar (por ejemplo,
  `pista.style.scrollSnapType = 'none'` antes de animar y restaurarlo en el
  último cuadro y al cancelar). Pero **no te cases con esto**: probá y medí.
  Lo que se evalúa son los CA, no una implementación concreta.
- **Cuidado con el orden**: si restaurás el snap antes de que el scroll llegue
  al destino, el navegador lo va a reajustar y CA-2 falla. Si no lo restaurás
  nunca, falla CA-3.
- **Cuidado con la cancelación**: `cortar()` tiene que dejar el snap como
  estaba, o el carrusel queda sin snap para siempre después de la primera pausa.
- **Cómo medir de verdad.** Muestrear `scrollLeft` desde Node no sirve: cada
  lectura es un viaje de ida y vuelta y la animación termina antes de que la
  veas (le pasó al PM en el primer intento). Registrá la trayectoria **dentro
  de la página** con `requestAnimationFrame` y leela una sola vez al final. Hay
  un ejemplo funcionando de esto en la sección 1: así se sacó la tabla.
- El reloj falso de Playwright (`page.clock`) **no congela el tiempo**, lo
  falsea y lo deja correr; para las pruebas que miden la animación en curso, la
  suite ya usa `pauseAt`. Mirá cómo lo hacen las pruebas
  `CA-4 (T-005-D02)` y `CA-5 (T-005-D02)` que ya están.
- La suite se corre con `npm run test:navegador`. La primera vez necesita
  `npx playwright install chromium`.

## 7. Definición de hecho

- [ ] Todos los CA cumplidos, cada uno con su test o evidencia
- [ ] CA-7 demostrado con salida real del fallo, y el cambio revertido
- [ ] `npx next typegen && npx tsc --noEmit` limpio
- [ ] `npm run lint` limpio
- [ ] `npm test` verde (230/230)
- [ ] `npm run test:navegador` verde
- [ ] Commits convencionales, archivos stageados por nombre, en la rama correcta
- [ ] Working tree limpio (`git status --short` vacío)
- [ ] `entrega-dev.md` escrita en esta carpeta y commiteada
- [ ] Sin push, sin PR, sin `db push`

---

## Formato de `entrega-dev.md`

Escribirla en `docs/pm/tareas/T-007/entrega-dev.md`.

```markdown
# Entrega T-007 — ronda 1

**Estado:** LISTA PARA QA | BLOQUEADA

## Qué hice
- <cambio> — `archivo:línea`

## La trayectoria, antes y después
<la tabla de posiciones medidas cuadro a cuadro, como la de la sección 1 del brief>

## Trazabilidad
| CA | Cómo se cumple | Test / evidencia |
| -- | -------------- | ---------------- |

## CA-7 — la prueba falla sin el fix
<qué revertiste, salida real del fallo, confirmación de que lo dejaste revertido>

## Commits
<salida de `git log --oneline <base>..HEAD`>

## Verificación (salida real, recortada)
<tsc, lint, npm test y npm run test:navegador con los totales>

## Migraciones
Ninguna.

## Decisiones tomadas
- <decisión> — porque <razón>; alternativa descartada: <...>

## Fuera de alcance que vi (no tocado)
- <hallazgo> — `archivo:línea`

## Preguntas / bloqueos
- <si Estado = BLOQUEADA: qué necesitás decidido para seguir>
```
