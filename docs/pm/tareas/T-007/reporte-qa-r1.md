# Reporte QA T-007 — ronda 1

**Veredicto:** FAIL  
**Resumen:** La restauración del snap puede ejecutarse antes de que el helper termine la animación. Además, CA-5 se acredita con una entrada por `Shift+Tab` que evita el caso de `Tab` donde la propia entrega documenta un salto. El gate coincide con HEAD, pero no contiene ejecución de navegador.

## Alcance cubierto

- **Diff revisado:** 31 archivos, `d2d50109a1ad76e6bbbe11cc31754104eeabe77b..9d61fc659d44303e7ef9f021bcf9ddf53039d20a`. Separado del cambio propio de T-007: seis archivos respecto de `d7c71a4`.
- **Técnicas aplicadas:** revisión estática, trazabilidad, transiciones de estado, tablas de decisión, análisis de mutaciones y revisión de oráculos.
- **Ejecutado:** `npx --no-install tsc --noEmit --incremental false` → **exit 0**, sin errores. Incremental desactivado para evitar escrituras.
- **Ejecutado:** `git diff --check origin/main...HEAD` → **exit 0**.
- **Ejecutado:** reproducción lógica en memoria con `animarScroll` del repositorio → restauración anticipada confirmada; detalle en D01. No constituye una reproducción visual.
- **Gate:** `docs/pm/tareas/T-007/gate-r1.txt` registra exactamente el HEAD actual; acredita typegen, tipos, lint y **230/230 unitarias**. No incluye Playwright.
- **No ejecutable aquí:** Playwright, build, typegen y mutaciones sobre archivos requieren escrituras o servidor. No ejecuté pruebas contra servicios remotos.
- **Sin modificaciones:** componente y CSS tienen diff vacío contra HEAD. Estado inicial y final: únicamente `?? docs/pm/tareas/T-007/gate-r1.txt`.

Referencias abreviadas: **componente** = `app/(sitio)/_componentes/CarruselEquipo.tsx`; **CSS** = `app/(sitio)/_componentes/carrusel-equipo.module.css`; **spec** = `tests/navegador/carrusel.spec.ts`; **entrega** = `docs/pm/tareas/T-007/entrega-dev.md`.

## Trazabilidad de criterios

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | Evidencia positiva del dev; reproducción independiente pendiente | `spec:659` exige cinco posiciones y cobertura de cuatro tramos. `entrega:132` registra éxito. D01 deja abierta una terminación con snap anticipado. |
| CA-2 | Acreditado para la corrida documentada; no garantiza el orden de restauración | `spec:720` comprueba destino ±2 px y `spec:727` estabilidad posterior. El componente decide restaurar con otro valor temporal: `componente:146`. |
| CA-3 | Evidencia positiva del dev para dos escenarios | Gesto táctil real sintetizado en `spec:317`; pruebas en `spec:816` y `spec:858`. `entrega:133` registra ambas aprobadas. |
| CA-4 | Evidencia positiva del dev; reproducción pendiente | `spec:749` entra a los 300 ms; exige posición posterior al medio e inmovilidad. |
| CA-5 | **NO CUMPLE completamente** | La prueba entra por `Shift+Tab`, `spec:784`. La entrega documenta que entrar con `Tab` produce `394 → 0`: `entrega:184`. D02. |
| CA-6 | Cumplimiento documental, no reejecutado por QA | Conserva las ocho pruebas anteriores; entrega registra **14 passed**, sin omitidas (`entrega:119`). Gate acredita **230 unitarias**. |
| CA-7 | Evidencia compatible con la aserción actual, con trazabilidad imperfecta | Mensaje, umbral y comparación del fallo coinciden con `spec:689`; difieren las líneas. Componente y CSS están limpios contra HEAD. Véase reserva documental. |

## Caminos de restauración del snap

| Camino | ¿Restaura? | Evidencia |
| ------ | ---------- | --------- |
| Fin normal | Sí, pero puede hacerlo antes de terminar | `componente:146`; D01. |
| Cancelación por puntero | **No inmediatamente**; restauración diferida | `cortar()` solo cancela RAF (`componente:114`). Vuelve con otro paso terminado o `pointerdown`/`wheel` (`:195`). |
| Cancelación por foco | Igual que puntero | `pausado` combina ambas condiciones; `componente:172`. |
| Movimiento reducido sin pausa | Sí | El efecto corta y cumple `!pausado`, `componente:180`. Los controles saltan directamente en `:128`. |
| Movimiento reducido mientras está pausado y desborda | **No en ese cambio de estado** | `!pausado || !desborda` es falso aunque `sinMovimiento=true`, `componente:180`. La tabla de entrega omite esta combinación. |
| Dejar de desbordar | Sí | `!desborda` fuerza restauración, `componente:180`. |
| Desmontaje | Cancela RAF; no limpia explícitamente el estilo | `componente:183`; el nodo se elimina, por lo que no queda una pista visible sin snap. |
| Nuevo paso durante otro | Cancela el anterior y el nuevo asume la restauración | `componente:126`, `:134`, `:146`. Sujeto a D01. |
| Gesto tras pausa | Sí, al iniciar el gesto | `componente:195`. La entrega reconoce un reajuste visible al apoyar el dedo, `entrega:170`. |

**CSS e hidratación:** solo se sobrescribe `scrollSnapType`; asignar `''` devuelve el control a la regla del CSS Module (`componente:104`, `CSS:29`). No se elimina expresamente el atributo `style`, por lo que puede quedar vacío; no demuestra un defecto funcional. `scroll-snap-align: start` permanece en `CSS:40`. Las mediciones y `matchMedia` están en efectos/callbacks, con estados iniciales constantes: no identifiqué dependencia del ancho en el render inicial (`componente:59`, `:205`, `:219`).

## Sensibilidad de las pruebas

Evaluación estática salvo la salida negativa documentada por el dev; **no ejecuté mutaciones**.

| Prueba nueva | Mutación que debería hacerla fallar | Evaluación |
| -- | -- | -- |
| CA-1 | Mantener el snap activo durante el paso | El fallo documentado muestra cero intermedias frente a cinco requeridas. Aserción actual equivalente, `spec:680`. |
| CA-2 | Terminar desplazado más de 2 px, manteniendo snap apagado | Falla la comparación de destino, `spec:722`. Restaurar temprano y acabar alineado puede pasar. |
| CA-3, paso completo | Eliminar la restauración final **y** la restauración al gesto | Debería faltar alineación, `spec:845`. Eliminar solo la restauración final puede quedar oculto por `pointerdown`. |
| CA-3, paso cancelado | Eliminar restauración en `pointerdown` y `wheel` | Debería quedar fuera de parada, `spec:888`; falta demostrarlo con mutación real. |
| CA-4 | No cancelar el RAF al entrar el puntero | Al avanzar el reloj, cambia la posición y falla `noSeMueve`, `spec:754`. |
| CA-5 | No cancelar el RAF al entrar el foco | Mismo mecanismo, `spec:789`, pero solo para la entrada inversa seleccionada. |

La trayectoria de CA-1 **no la provoca la propia prueba**: el registrador solo lee `scrollLeft` dentro de la página y programa otro RAF (`spec:248`). La prueba espera autoplay, usa valores distintos y exige representación en los cuatro cuartos (`spec:695`); duplicar muestras idénticas no basta.

Sus límites son relevantes: registra RAF bajo reloj falso, no cuadros efectivamente pintados; no guarda timestamps; y filtra distancia respecto de los extremos sin exigir explícitamente que todas las intermedias estén dentro del recorrido (`spec:682`). No es una prueba incapaz de fallar, pero tampoco garantiza ausencia de cualquier salto final.

Las dos pruebas antiguas modificadas conservan su propósito de cancelación: ahora exigen una posición intermedia en lugar del origen (`spec:552`, `:610`). Los ocho nombres siguen presentes. Persisten skips condicionados a ausencia de carrusel/desborde (`spec:129`, `:139`); la salida del dev declara cero omitidas, pero el gate no lo verifica.

## Defectos

### T-007-D01 — El snap puede restaurarse con la animación todavía pendiente

- **Severidad / Prioridad:** **S2 / P1**.
- **Área:** UI / sincronización.
- **Ubicación:** `app/(sitio)/_componentes/CarruselEquipo.tsx:146`; `lib/carrusel.ts:155`.
- **Pasos / condición:** ejecutar un cuadro cuyo timestamp corresponde a 300 ms del paso, pero cuyo callback llega a la comprobación cuando `performance.now()` ya marca 460 ms. Puede prepararse retrasando el hilo dentro de otro callback del mismo cuadro.
- **Esperado:** restaurar únicamente después de escribir la parada final, conforme a la nota técnica del brief.
- **Obtenido:** el componente restaura mientras el helper todavía escribe una posición intermedia y programa otro cuadro.
- **Evidencia:** el helper calcula `t` usando el argumento de RAF; el componente compara una lectura nueva de `performance.now()` contra un arranque tomado por separado. La reproducción en memoria, usando el helper real y la condición del componente, devolvió:

  ```json
  {
    "timestampRAF": 300,
    "performanceNow": 460,
    "posicion": 397.7037037037037,
    "destino": 413,
    "snap": "restaurado",
    "otroCuadroPendiente": true
  }
  ```

  Esto confirma el orden incorrecto, no una observación visual. El reajuste del navegador al reactivar snap entre paradas está documentado en `entrega:144`.
- **Sugerencia:** asociar la restauración a la finalización efectiva de la animación o a la escritura final, sin deducirla con una segunda lectura temporal. Añadir una prueba con retraso entre timestamp RAF y ejecución.
- **Introducido por:** este cambio.

### T-007-D02 — CA-5 evita el caso de Tab que la entrega reconoce que salta

- **Severidad / Prioridad:** **S2 / P1**.
- **Área:** testware / trazabilidad de aceptación.
- **Ubicación:** `tests/navegador/carrusel.spec.ts:765`; `docs/pm/tareas/T-007/entrega-dev.md:184`.
- **Pasos / condición:** situar el foco antes del carrusel; dejar avanzar un paso hasta después del punto medio; entrar mediante `Tab`.
- **Esperado:** CA-5 exige que el scroll se quede donde está cuando entra el foco con Tab.
- **Obtenido:** la entrega documenta un desplazamiento `394 → 0`. La prueba evita esa entrada, estaciona el foco después del carrusel y vuelve por un control mediante `Shift+Tab`.
- **Evidencia:** `entrega:184` reconoce expresamente el comportamiento y la sustitución. `spec:775` restablece además el scroll antes del paso; `spec:784` ejecuta la entrada inversa. El test antiguo con Tab entra a los 48 ms, por lo que no cubre la condición tardía.
- **Sugerencia:** probar la entrada frontal después del punto medio. Si el desplazamiento necesario para mostrar el enlace enfocado debe permitirse por accesibilidad, acordar esa excepción en el criterio antes de declarar CA-5 cumplido.
- **Introducido por:** este cambio en la cobertura y declaración de cumplimiento; el desplazamiento nativo está documentado como preexistente.

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **CA-7 no es una reproducción exactamente identificada.** La salida cita líneas 699–701; la aserción actual ocupa 691–693. La traza temporal explica que hubo una versión instrumentada, pero no se conserva su diff. Además, `entrega:64` describe `git checkout -- <componente>` como restauración a `main`: ese comando restaura desde el índice y `origin/main` ni siquiera contiene este componente. La evidencia es compatible con la prueba actual, pero necesita un registro preciso del estado mutado.
- **Pausa más reducción de movimiento:** la restauración no ocurre en esa combinación, contra la afirmación general de `entrega:162`. Los gestos o controles posteriores sí tienen caminos de restauración; no confirmé un arrastre que quede permanentemente desalineado.
- **Arrastre durante animación:** `alGesto` restaura snap sin cancelar RAF (`componente:195`). La entrega reconoce competencia entre ambos movimientos (`entrega:204`); falta medir cuánto agrava el nuevo encendido del snap.
- **Salto al apoyar el dedo tras pausa:** está reconocido en `entrega:170`, pero CA-3 solo exige alineación al terminar. Hace falta decidir si ese reajuste inicial es aceptable.
- **Cobertura de finalización:** CA-2 observa después de 5550 ms y nuevamente 300 ms después (`spec:720`); puede perder un salto ocurrido al restaurar. CA-1 tampoco impone un límite al desplazamiento entre muestras.
- **Datos y navegador:** la configuración solo declara Chromium (`playwright.config.ts:23`) y el servidor local no garantiza por sí mismo un backend local. No inspeccioné secretos ni ejecuté ese servidor.

## Pruebas a ejecutar por el PM

Todas en entorno local aislado, sin producción ni Supabase remoto. Requieren navegador, servidor o escrituras que este sandbox no permite.

- `npm run test:navegador` — adjuntar HEAD y salida completa con **14 ejecutadas, cero skipped**.
- **D01:** instrumentar un retraso antes del callback del carrusel, conservando el timestamp RAF; registrar timestamp, `performance.now()`, posición y snap. El snap debe seguir apagado hasta escribir el destino.
- **D02:** entrar con `Tab` después de 300 ms; registrar posición inmediatamente antes, después del foco y durante la pausa. Resolver explícitamente la excepción de accesibilidad si se mantiene.
- `npx playwright test --grep 'CA-1 \(T-007\)'` — repetir CA-7 con el componente de `d7c71a4`, conservando exactamente el spec actual; adjuntar diff de la mutación, fallo y restauración posterior.
- **Restauración:** combinar pausa, cambio de movimiento reducido, pérdida de desborde, desmontaje y pasos superpuestos; inspeccionar estilo computado y ausencia de RAF residual.
- **Gestos:** arrastrar después de terminar, después de cancelar y durante un paso; verificar alineación y posibles saltos al tocar.
- **Tiempo real:** registrar un paso completo sin `page.clock`, incluyendo la restauración y cuadros posteriores; repetir avance, retorno al inicio y último punto, con distintas anchuras.