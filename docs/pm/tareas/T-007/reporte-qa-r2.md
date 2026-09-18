# Reporte QA T-007 — ronda 2

**Veredicto:** PASS-WITH-RESERVATIONS

**Resumen:** D01 está corregido por inspección y reproducción del helper en memoria. D02 se cierra por la enmienda de CA-5 y la incorporación del camino con `Tab`. Los CA tienen evidencia favorable, pero la ejecución de navegador procede de la entrega del dev: el gate del PM no incluye Playwright. Persisten reservas sobre interacción durante la animación y sensibilidad de la regresión de D01.

## Alcance cubierto

- **Diff revisado:** 33 archivos, `d2d50109a1ad76e6bbbe11cc31754104eeabe77b..6b23178d12769da36c6febc954044b5febd68f81`. El cambio propio de T-007 comprende 10 archivos respecto de `d7c71a4`.
- **Técnicas:** revisión estática, trazabilidad, transiciones de estado, tablas de decisión, análisis de mutaciones, revisión de oráculos y confirmation testing.
- **Ejecutado:** `npx --no-install tsc --noEmit --incremental false` → **exit 0**, sin errores. Incremental desactivado para evitar escrituras.
- **Ejecutado:** helper real transpilado y evaluado en memoria con `node -e`, TypeScript y `vm` → finalización y cancelación correctas ante un cuadro retrasado.
- **Ejecutado:** `git diff --check origin/main...HEAD` → **exit 2**, por dos espacios finales en `docs/pm/tareas/T-007/reporte-qa-r1.md:3`, compatibles con un salto de línea Markdown; sin impacto funcional.
- **Gate:** `docs/pm/tareas/T-007/gate-r2.txt:4` coincide exactamente con HEAD. Acredita typegen, tipos, lint y **233/233 unitarias** (`:61`). Termina sin ejecución de navegador.
- **No ejecutado:** Playwright, Vitest, build, typegen y mutaciones de archivos por las restricciones de escritura/servidor. No accedí a servicios remotos.
- **Sin modificaciones:** componente y CSS tienen diff vacío contra HEAD. Estado inicial y final: únicamente `?? docs/pm/tareas/T-007/gate-r2.txt`.

Referencias abreviadas: **componente** = `app/(sitio)/_componentes/CarruselEquipo.tsx`; **CSS** = `app/(sitio)/_componentes/carrusel-equipo.module.css`; **spec** = `tests/navegador/carrusel.spec.ts`; **entrega** = `docs/pm/tareas/T-007/entrega-dev.md`.

## Trazabilidad de criterios

“Cumple según evidencia del dev” distingue la corrida documentada de una ejecución independiente de QA.

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | Cumple según evidencia del dev | `spec:659` exige cinco posiciones distintas y representación en cuatro cuartos del recorrido; ejecución positiva en `entrega:228`. |
| CA-2 | Cumple según evidencia del dev; orden de finalización confirmado | `spec:720` comprueba destino ±2 px y estabilidad posterior. `lib/carrusel.ts:166` escribe antes de avisar el fin en `:174`; el componente conecta ese aviso en `componente:151`. |
| CA-3 | Cumple según evidencia del dev | Gesto táctil sintetizado mediante CDP, `spec:317`; escenarios después de completar y cancelar un paso, `spec:881` y `:923`. Ambos aprobados en `entrega:229`. |
| CA-4 | Cumple según evidencia del dev | Entrada a los 300 ms y comprobación de posición posterior al medio e inmovilidad, `spec:749`; resultado en `entrega:224`. |
| CA-5 enmendado | Cumple según evidencia del dev | Comprueba paso posterior al medio **antes** del foco, entra mediante `Tab`, permite asentamiento nativo y exige pausa/reanudación: `spec:795`, `:799`, `:805`, `:811`, `:816`. |
| CA-6 | Cumple documentalmente | Las ocho pruebas anteriores permanecen; dos ajustan la posición esperada al desplazamiento ahora efectivo. `entrega:215` registra **15 ejecutadas y aprobadas**, sin omitidas. Gate: **233 unitarias**, las 230 anteriores más tres nuevas. |
| CA-7 | Cumple documentalmente; trazabilidad corregida | `entrega:159` identifica reversión del componente a `ef63353`. El fallo cita exactamente `spec:691–693`: cero intermedias frente a cinco. Componente y CSS limpios contra HEAD. |

## Caminos de restauración del snap

**No se restaura inmediatamente en todos los caminos.** La pausa conserva deliberadamente la posición intermedia; la restauración queda diferida.

| Camino | ¿Restaura? | Evidencia |
| ------ | ---------- | --------- |
| Fin normal | Sí, después de escribir el destino | `lib/carrusel.ts:166`, `:174`; `componente:151`. |
| Cancelación por puntero | No inmediatamente; vuelve con un gesto o un paso posterior terminado | `componente:117`, `:172`, `:195`. |
| Cancelación por foco | Igual que puntero | `pausado` combina ambos estados; `componente:68`, `:180`. |
| Movimiento reducido, sin pausa | Sí, tras cancelar | `componente:172–181`. |
| Movimiento reducido, pausado y desbordando | No en esa transición; vuelve mediante gesto o control | La condición de `componente:180` es falsa. Recuperación en `:128` y `:195`. |
| Dejar de desbordar | Sí | `!desborda` fuerza restauración, `componente:180`. |
| Desmontaje | Cancela RAF; no restaura explícitamente el estilo del nodo retirado | `componente:183`. No queda una pista visible que necesite snap. |
| Paso nuevo sobre uno anterior | Cancela el anterior; el nuevo conserva la responsabilidad de restaurar | `componente:126`, `:134`, `:151`; cancelación en `lib/carrusel.ts:179`. |
| Primer gesto después de pausa | Sí, al `pointerdown` o `wheel` | `componente:195–197`. |

**Estilos e hidratación:** únicamente se sobrescribe `scrollSnapType`; asignar `''` devuelve el control al CSS Module (`componente:88`, `:104`; `CSS:29`). Puede quedar `style=""`, sin declaración activa ni defecto funcional demostrado. Se conserva `scroll-snap-align: start` (`CSS:40`). Los estados iniciales son constantes y las mediciones y `matchMedia` están en efectos/callbacks (`componente:59`, `:205`, `:219`). `sinMovimiento` evita `animarScroll` y asigna directamente el destino (`componente:128–131`).

## Sensibilidad de las pruebas

Las mutaciones siguientes son análisis estático, salvo las salidas negativas documentadas por el dev.

| Prueba nueva | Mutación que la haría fallar | Evaluación |
| -- | -- | -- |
| CA-1 | Mantener snap activo durante la animación | Fallo documentado coherente con el spec actual: cero intermedias, `entrega:165`. |
| CA-2 | Terminar a más de 2 px del destino y dejar snap apagado | Detectable por `spec:722`. No detecta necesariamente un salto previo que termine bien alineado. |
| CA-3 tras paso completo | Suprimir restauración final **y** restauración al gesto | Debe fallar la alineación, `spec:910`. Quitar solo la restauración final puede quedar oculto por `pointerdown`. |
| CA-3 tras cancelación | Suprimir restauración al gesto | Debe fallar `spec:953`; falta reproducción independiente de esa mutación. |
| CA-4 | No cancelar RAF al entrar el puntero | `noSeMueve` avanza el reloj y detectaría la continuación, `spec:754`. |
| CA-5 con Tab | No cancelar RAF al entrar el foco | Fallo documentado `0 → 413`, coherente con `spec:453–454` y `:811`. |
| CA-5 por controles | No cancelar RAF al entrar el foco | Detectable por `spec:854`. |
| Unidad: aviso único y ordenado | Omitir, duplicar o adelantar el aviso | Aserciones de cantidad y orden, `tests/unidad/carrusel.test.ts:244–249`. |
| Unidad: cuadro retrasado | Decidir el fin mediante una nueva lectura del reloj dentro del helper | Detectable por `tests/unidad/carrusel.test.ts:268–277`. Reserva sobre integración indicada abajo. |
| Unidad: cancelación sin aviso | Avisar al cancelar o conservar el cuadro pendiente | Detectable por `tests/unidad/carrusel.test.ts:290–293`. |

### Qué mide la trayectoria

El registrador **solo lee** `scrollLeft` desde RAF dentro de la página (`spec:248`). CA-1 no mueve la pista ni pulsa controles durante la captura: espera la rotación automática (`spec:669–671`). `Set` evita que repetir una posición cuente varias veces, y los cuatro tramos impiden concentrar todas las muestras en un extremo (`spec:680`, `:696`).

Sus límites:

- Usa RAF bajo reloj falso: demuestra posiciones observables, no cuadros efectivamente pintados.
- No guarda timestamps ni delimita explícitamente inicio y fin del paso.
- Excluye posiciones cercanas a los extremos, pero no exige que **todas** las contadas estén dentro del intervalo. Una posición exterior podría aportar la quinta muestra.
- No limita el salto entre muestras; una trayectoria con suficientes intermedias todavía puede contener un salto final.

Estos límites no vuelven tautológica la prueba: la reversión documentada efectivamente la hace fallar.

## Defectos

### T-007-D01 — Restauración anticipada del snap

**Estado: FIXED por inspección y reproducción lógica; confirmación visual independiente pendiente.** Severidad/prioridad histórica: **S2/P1**.

El componente dejó de comparar otra lectura temporal. El helper escribe la posición final antes de invocar `encenderSnap` (`componente:143–152`; `lib/carrusel.ts:164–174`).

Reproducción en memoria con el helper real:

```text
RAF=300, reloj=460:
posición=397.7037037037037, avisos=0, cuadros pendientes=1

RAF=450, reloj=1350:
posición=413, avisos=1, cuadros pendientes=0
orden final: escribir 413 → avisar fin

Cancelando después del primer cuadro retrasado:
posición=397.7037037037037, avisos=0, cuadros pendientes=0
```

Esto confirma el orden y la cancelación del helper; no constituye observación del navegador.

### T-007-D02 — La prueba evitaba la entrada frontal con Tab

**Estado: CERRADO POR ENMIENDA DEL CRITERIO y actualización de cobertura.** Severidad/prioridad histórica: **S2/P1**.

La prueba ahora entra con `Tab` durante un paso posterior al medio (`spec:795–800`). Permite el reposicionamiento nativo, comprueba inmovilidad posterior y reanudación al salir (`spec:805–817`). No atribuyo el cierre a un cambio del componente.

**No confirmé defectos nuevos de producto.**

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **Regresión de D01 en la integración:** la demostración revierte helper y componente juntos (`entrega:45`). Los fallos ocurren porque falta el aviso final, no porque se observe snap anticipado. Conservar el helper actual y devolver únicamente al componente la deducción por `performance.now()` no altera estos unitarios: no importan el componente (`tests/unidad/carrusel.test.ts:2`). Falta una prueba dirigida a ese cableado.
- **Gesto durante una animación:** `alGesto` enciende snap sin cancelar RAF (`componente:195`). La competencia con el arrastre era preexistente, pero encender snap durante el paso es parte de T-007. Falta medir si introduce saltos o impide el gesto.
- **Restauración tras pausa:** al apoyar el dedo puede reajustarse una posición intermedia antes del arrastre. La entrega reconoce el mecanismo (`entrega:272`); CA-3 comprueba alineación final, no ausencia de ese reajuste inicial.
- **Cambio de ancho manteniendo desborde:** las paradas se recalculan, pero una animación activa conserva su destino anterior (`componente:219–232`). Falta observar si restaurar snap desde ese destino provoca salto.
- **Cobertura independiente:** los skips por ausencia de carrusel/desborde siguen presentes (`spec:129`, `:139`). La entrega acredita cero omitidas; el gate no contiene navegador. Tampoco hay cobertura configurada fuera de Chromium (`playwright.config.ts:23`).

## Pruebas a ejecutar por el PM

En entorno local aislado, con datos suficientes y sin servicios remotos. No pude ejecutarlas porque requieren navegador, servidor o escrituras.

- `npm run test:navegador` — adjuntar HEAD, build y **15 aprobadas, cero skipped**, incluyendo las ocho anteriores.
- **D01, mutación de integración:** conservar el helper actual, restaurar solo la deducción temporal del componente e introducir un cuadro con timestamp 300/reloj 460. La prueba debe detectar snap activo con RAF pendiente. Restaurar y registrar el diff limpio.
- **Trayectoria en tiempo real:** sin `page.clock`, registrar timestamps, posiciones y snap hasta después del fin. Repetir avance, último destino y retorno al principio; no debe aparecer un reajuste visible al restaurar.
- **Transiciones:** cancelar por puntero, foco, reducción de movimiento con/sin pausa, pérdida de desborde y desmontaje; superponer pasos. Comprobar recuperación de snap y ausencia de escrituras residuales.
- **Gestos:** arrastrar tras completar, tras cancelar y durante un paso; incluir rueda. Verificar alineación al soltar y ausencia de competencia visible con RAF.
- **Movimiento reducido y resize:** comprobar controles instantáneos y cambios de ancho durante animación, tanto conservando como eliminando el desborde.