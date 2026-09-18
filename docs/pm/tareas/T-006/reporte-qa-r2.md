# Reporte QA T-006 — ronda 2

**Veredicto:** FAIL

**Resumen:** CA-8 tiene evidencia consistente con la prueba actual y la mutación está revertida. Sin embargo, todavía se pueden omitir las ocho pruebas ante una regresión del contenedor, y CA-7 puede aprobar una rotación completa con movimiento reducido. El gate coincide con `HEAD`, pero no incluye ejecución de Playwright.

## Alcance cubierto

- **Diff revisado:** 28 archivos, `d2d50109a1ad76e6bbbe11cc31754104eeabe77b..2a4d5955f54290bed307ca41b3e89d1e717978d6`.
- **Separación de alcance:** T-006 modifica 12 archivos respecto de la base T-005. `git diff origin/Inf015/oliver132123-carrusel-equipo...HEAD -- app lib tests/unidad` devuelve vacío: las mutaciones no quedaron en producción.
- **Técnicas:** revisión estática, trazabilidad, análisis de mutaciones, particiones por cantidad de paradas, transiciones de estado, revisión de oráculos y análisis temporal.
- **Ejecutado:** `npx --no-install tsc --noEmit --incremental false` → **exit 0**, sin salida. Incremental desactivado para evitar escrituras.
- **Ejecutado:** `git diff --check origin/main...HEAD` → sin errores de whitespace.
- **Ejecutado:** funciones reales de `lib/carrusel.ts`, transpiladas y evaluadas en memoria mediante `node -e`; resultados utilizados en D06. Esto no constituye ejecución en navegador.
- **Gate:** `docs/pm/tareas/T-006/gate-r2.txt:4` coincide exactamente con `HEAD`. Registra tipos, lint y **230 pruebas unitarias / 11 archivos** (`:40`, `:44`, `:62`). No registra Playwright.
- **No ejecutable en sandbox:** instalación, build, typegen, Vitest y Playwright por sus escrituras o necesidad de servidor/navegador. No contacté servicios remotos.
- **Sin modificaciones:** estado inicial y final: únicamente `?? docs/pm/tareas/T-006/gate-r2.txt`.

Referencias abreviadas:

- `spec`: `tests/navegador/carrusel.spec.ts`.
- `componente`: `app/(sitio)/_componentes/CarruselEquipo.tsx`.
- `entrega`: `docs/pm/tareas/T-006/entrega-dev.md`.

## Trazabilidad de criterios

La evidencia del dev se distingue de una ejecución independiente de QA.

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | Configuración correcta; ejecución independiente pendiente | Build + start y prohibición de reutilización en `playwright.config.ts:44`. Entrega registra ocho aprobadas en `entrega:237`. |
| CA-2 | Cobertura presente; condicionada por D01 | Exige cambio y destino siguiente en `spec:278`, `:283`, `:284`. Oráculo compartido con producción: riesgo indicado abajo. |
| CA-3 | Cobertura presente; ejecución pendiente | Comprueba posición máxima antes del intervalo y cero después: `spec:300`, `:304`. |
| CA-4 | Cobertura mejorada, con limitaciones | Pausa durante dos intervalos y reanudación: `spec:315`, `:320`. Cancelación dirigida: `spec:327`. La comparación final puede ocultar ciclos; ver D06. |
| CA-5 | Tab corregido; cobertura temporal limitada | Tab real y elemento interactivo: `spec:369`. Combinación foco/puntero: `spec:375`. Cancelación dirigida: `spec:384`. |
| CA-6 | Cobertura presente; ejecución pendiente | Extremos, último punto y atributo: `spec:429`, `:432`, `:437`, `:444`, `:445`. |
| CA-7 | **NO CUMPLE como garantía de regresión** | Una sola comparación tras tres intervalos permite una vuelta completa: `spec:456`. D06. |
| CA-8 | Evidencia documental consistente; reproducción independiente pendiente | `entrega:192` identifica el test de `spec:269`; el fallo reproduce exactamente `spec:283`. Producción conserva `animarScroll` en `componente:91`; diff contra T-005 vacío. |
| CA-9 | **PARTIAL** | Saltos legítimos implementados, pero la ausencia del atributo identificador también omite todo sin comprobar la causa: `spec:95`. D01. |
| CA-10 | Sin escrituras ni nombres fijos; sensibilidad dependiente de geometría | Navega a `/` y opera sobre DOM/controles. Cantidad de paradas afecta la detección: D06. Backend elegido por variables en `lib/supabase.ts:3`. |

## Confirmación de defectos de ronda 1

| Defecto | Estado | Evidencia |
| -- | -- | -- |
| D01 | **PARTIAL** | Cambiar la etiqueta del botón ahora falla según `entrega:54`; cambiar la del contenedor todavía omite todo: `spec:95`. |
| D02 | **FIXED por inspección; evidencia del dev** | `reuseExistingServer: false`, `playwright.config.ts:46`; colisión registrada en `entrega:171`. |
| D03 | **FIXED para la mutación solicitada; alcance limitado** | Quitar el efecto cancelador produce dos fallos según `entrega:84`, `:124`. Los tests nuevos existen en `spec:327`, `:384`. No cubren toda la animación. |
| D04 | **FIXED por inspección; evidencia del dev** | Tab real y comprobación de elemento interactivo; mutación `tabIndex={-1}` falla en `entrega:144`. |
| D05 | **FIXED** | Lectura de manifiesto y lock: `manifest=1.63.0`, `lockRoot=1.63.0`, `lockPackage=1.63.0`. Dependencia de desarrollo en `package.json:26`. |

## Sensibilidad de las pruebas

**“Previsto” significa análisis estático, no mutación ejecutada por QA.**

| Prueba | Mutación que debería hacerla fallar | ¿Falla? | Evidencia |
| ------ | ----------------------------------- | ------- | --------- |
| CA-2 | Sustituir `animarScroll` por `scrollTo({ behavior: 'smooth' })` | Sí, según evidencia del dev consistente con el código actual | `entrega:183` a `:201`; fallo de `spec:283`. |
| CA-3 | Mantener el máximo cuando toca volver al inicio | Previsto: sí | Máximo comprobado en `spec:300`; exige cero en `:304`. |
| CA-4, pausa/reanudación | No reanudar al salir | Previsto: sí | `spec:320` exige cambio tras un intervalo más animación. |
| CA-4, pausa/reanudación | Ignorar el puntero | Puede ocultar una vuelta con dos paradas | Solo compara después de dos intervalos: `spec:315`. D06. |
| CA-4, paso en curso | Eliminar el efecto cancelador | Sí, según salida del dev | `entrega:91`: esperado 413, recibido 827; aserción actual en `spec:262`. |
| CA-5, foco y puntero | Reintroducir el booleano compartido | Detección dependiente de cantidad de paradas y fase | Compara únicamente al terminar dos intervalos: `spec:379`. |
| CA-5, foco y puntero | Excluir enlaces y controles del orden de Tab | Sí, según salida del dev | `entrega:146`; helper actual en `spec:205`. |
| CA-5, paso en curso | Eliminar el efecto cancelador | Sí, según salida del dev; referencia de línea parcialmente desactualizada | `entrega:104`: esperado 0, recibido 413. `noSeMueve` coincide; la llamada está actualmente en `spec:408`, no `:411` como indica el stack pegado. |
| CA-6 | Desconectar flechas, último punto o actualización del indicador | Previsto: sí | Aserciones independientes de extremos y atributo en `spec:432`, `:437`, `:444`, `:445`. |
| CA-7 | Quitar `sinMovimiento` de la condición que impide iniciar el intervalo | **No distingue la regresión con tres paradas** | D06: tres saltos instantáneos vuelven al inicio; `spec:457` acepta esa posición. |
| Todas | Cambiar `aria-roledescription="carrusel"` | **No: se omiten** | `spec:95` a `:99`, antes de cualquier aserción funcional. |

Las pausas **sí atraviesan el intervalo**: no pasan simplemente por observar demasiado pronto. El problema restante es observar únicamente el resultado final de un movimiento circular.

## Defectos

### T-006-D01 — La ausencia del identificador del contenedor todavía omite toda la suite

- **Severidad / Prioridad:** **S2 / P1**.
- **Área:** testware.
- **Ubicación:** `tests/navegador/carrusel.spec.ts:95`.
- **Pasos / condición:** con pilotos y sección activa, cambiar únicamente `aria-roledescription="carrusel"` por otro valor en `componente:165`.
- **Esperado:** detectar la regresión; CA-9 permite omitir por ausencia legítima de datos o sección apagada.
- **Obtenido:** `marco.count()` devuelve cero y las ocho pruebas se omiten, atribuyéndolo a sección apagada o falta de pilotos.
- **Evidencia:** `test.skip((await marco.count()) === 0, ...)`, `spec:96`. Todas las pruebas llaman a ese helper. No se consulta ninguna señal independiente que confirme la causa del vacío.
- **Sugerencia:** distinguir ausencia legítima mediante una precondición independiente del mismo atributo que se está probando; exigir el contenedor cuando corresponda mostrar pilotos.
- **Introducido por:** este cambio; persiste parcialmente desde ronda 1.

La corrección de los controles sí sirve: `spec:113` exige su presencia cuando existe desborde. No resuelve esta salida anterior del helper.

### T-006-D06 — CA-7 puede aprobar una vuelta completa con movimiento reducido

- **Severidad / Prioridad:** **S2 / P1**.
- **Área:** testware / oráculo temporal.
- **Ubicación:** `tests/navegador/carrusel.spec.ts:456`.
- **Pasos / condición:**
  1. Usar una geometría con tres paradas alcanzables.
  2. Quitar únicamente `sinMovimiento` de la condición del intervalo en `componente:155`.
  3. Conservar la rama de movimiento instantáneo de `componente:86`.
  4. Ejecutar CA-7.
- **Esperado:** fallar ante cualquier rotación automática con movimiento reducido.
- **Obtenido:** el test observa únicamente la posición tras 15 segundos. Tres pasos pueden completar una vuelta y satisfacer `despues === antes`, aunque el carrusel rotó.
- **Evidencia:** evaluación en memoria de las funciones reales de producción:

  ```text
  destinos: [0,408,816]
  pasos: 3
  recorrido: [0,408,816,0]
  igualdadFinal: true
  ```

  Geometría utilizada: cinco tarjetas con inicios `[0,408,816,1224,1632]`, máximo 816. Con la mutación indicada, `sinMovimiento` sigue haciendo cada salto instantáneo; únicamente deja de impedir el temporizador. La aserción de `spec:457` no distingue ambos recorridos.

- **Sugerencia:** observar después de cada paso posible o registrar movimientos durante toda la ventana; demostrar sensibilidad con distintas cantidades de paradas.
- **Introducido por:** este cambio; el riesgo de comparación final ya estaba señalado en ronda 1.

El mismo patrón afecta las comprobaciones originales de pausa: dos paradas permiten `0 → 408 → 0` mientras `spec:315` y `:379` esperan dos intervalos. La reproducción integral en navegador queda pendiente; el contraejemplo del oráculo de CA-7 queda establecido por el recorrido anterior.

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **Pausa tardía conocida y excluida:** los tests nuevos entran a los 48 ms (`spec:56`). La entrega reconoce que más avanzado el paso Chromium continúa moviendo el carrusel pese a cancelar (`entrega:317`). No reproduje ese comportamiento; requiere validar el defecto de producción y ampliar cobertura antes de afirmar que toda la pausa está protegida.
- **Oráculo compartido:** CA-2 calcula el destino mediante `paginas` y `proximaPosicion`, las mismas funciones de producción (`spec:2`, `:157`, `:278`). Una mutación compartida puede alterar también el esperado. Los unitarios mitigan parcialmente esta dependencia.
- **Reloj y `smooth`:** el fallo documentado acredita sensibilidad bajo el reloj falso. No demuestra por sí solo que `smooth` falle generalmente desde temporizadores reales. Repetir con tiempo real para separar ambas causas.
- **Flakiness:** hay tres `waitForTimeout(100)` documentados en `spec:257`; no son esperas arbitrarias sin explicación. Sin embargo, observar 300 ms reales no prueba inmovilidad continua, y la ventana de 48 ms depende del comportamiento de snap descrito en `spec:42`.
- **Carga lenta:** el reloj corre hasta terminar de cargar y encontrar controles, luego se pausa (`spec:126`). Una carga suficientemente larga puede haber consumido intervalos antes de preparar el escenario; repetir bajo carga.
- **Backend:** el navegador apunta a `localhost:3015`, pero el build y servidor usan el Supabase seleccionado por variables (`lib/supabase.ts:3`). No inspeccioné `.env` reales; no queda garantizado aislamiento local del backend.
- **Procesos:** Playwright dispone de teardown que llama al cierre del proceso (`node_modules/playwright/lib/runner/index.js:850`). La entrega comprueba puerto libre después de una colisión (`entrega:177`), no todos los caminos de éxito, fallo e interrupción.

**Checklist restante:**

- Suites separadas por directorio: Vitest incluye `tests/unidad/**/*.test.ts` (`vitest.config.mts:14`); Playwright limita su búsqueda a `tests/navegador` (`playwright.config.ts:11`).
- Build de producción, sin reutilización de servidor: `playwright.config.ts:44`.
- Selectores por roles y atributos accesibles, sin CSS Modules: `spec:95`, `:102`, `:114`.
- Resultados ignorados: `.gitignore:17`; no aparecen archivos de resultados versionados.
- `git ls-files '.env*'` devuelve únicamente `.env.example`, preexistente. No hay secretos visibles en la configuración revisada.
- README y contexto documentan instalación de Chromium y ejecución: `README.md:94`, `docs/pm/contexto.md:74`.
- Paralelismo habilitado con fixtures `page` separados y sin escrituras de datos observadas (`playwright.config.ts:12`, `spec:269`). Invocaciones independientes comparten puerto y directorio de build.

## Pruebas a ejecutar por el PM

Todas las pruebas funcionales deben usar **servicios locales y datos sintéticos**. No pude ejecutarlas porque requieren escrituras, compilación o navegador.

- `npm ci && npx playwright install chromium && npm run test:navegador` — registrar `HEAD`, build y ocho pruebas ejecutadas sin skips con datos suficientes.
- `npm run test:navegador` con la mutación del atributo del contenedor — debe fallar, no producir ocho omitidas.
- `npm run test:navegador -- -g "CA-7"` con tres paradas y la mutación de D06 — debe detectar la rotación; registrar también posiciones intermedias.
- `npm run test:navegador -- -g "CA-4|CA-5"` con dos paradas y pausa desactivada — detectar movimiento aunque complete una vuelta.
- `npm run test:navegador -- -g "T-005-D02"` — repetir la eliminación del cancelador y ampliar las entradas a distintos momentos de los 450 ms, incluyendo la zona tardía reconocida por el dev.
- `npm run test:navegador -- -g "CA-2"` — repetir `smooth`, conservar salida y restaurar; contrastar con una ejecución equivalente sin reloj falso.
- `npm run test:navegador -- --repeat-each=20 --workers=1` y después con varios workers — comprobar estabilidad y ausencia de omisiones inesperadas.
- Repetir con sección apagada, cero pilotos y sin desborde — verificar motivos legítimos de omisión por separado.
- Ejecutar con 3015 ocupado y comprobar `lsof -nP -iTCP:3015 -sTCP:LISTEN` tras éxito, error e interrupción — no debe quedar un servidor propio.
- `npx next typegen && npx tsc --noEmit && npm run lint && npm test` — renovar el gate después de corregir, conservando la separación de suites.