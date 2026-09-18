# Reporte QA T-006 — ronda 4

**Veredicto:** FAIL

**Resumen:** D07 está corregido para las respuestas HTTP de error. La evidencia histórica de `smooth` corresponde al cuerpo actual de CA-2 y la mutación está revertida. Persiste un falso positivo en el oráculo de pausa de CA-4: una vuelta completa puede pasar como inmovilidad (**D08, S2/P1**). TypeScript pasa; no ejecuté Playwright.

## Alcance cubierto

- **Diff revisado:** 32 archivos, 27 commits; `d2d50109a1ad76e6bbbe11cc31754104eeabe77b..651ed3eef443c1e8f7f479b23e1026ce216071dc`.
- **Rama:** `oliver132123/pruebas-navegador`, coincide.
- **Separación de alcance:** el diff contra la base T-005 para `app`, `lib` y `tests/unidad` está vacío. No quedaron mutaciones de producción.
- **Base de prueba:** contexto, brief, entrega, gate y reportes anteriores de T-006; antecedentes de T-005.
- **Técnicas:** revisión estática, trazabilidad, análisis de mutaciones, particiones por geometría, transiciones de estado y análisis temporal de oráculos.
- **Ejecutado:** `npx --no-install tsc --noEmit --incremental false` → **exit 0**, sin errores. Se desactivó el incremental para evitar escrituras.
- **Ejecutado:** `git diff --check origin/main...HEAD` → sin errores de whitespace.
- **Ejecutado:** comparación histórica del cuerpo de CA-2 y evaluación en memoria de las funciones reales de navegación → resultados detallados abajo.
- **Gate:** `docs/pm/tareas/T-006/gate-r4.txt:4` coincide exactamente con HEAD. Registra typegen, tipos, lint y **230 pruebas unitarias en 11 archivos** (`:45`, `:51`, `:55`, `:73`). **No incluye Playwright.**
- **No ejecutable en sandbox:** instalación, build, typegen, Vitest y Playwright por sus escrituras o necesidad de servidor/navegador. No contacté servicios remotos.
- **Sin modificaciones:** el estado inicial y final conserva únicamente `?? docs/pm/tareas/T-006/gate-r4.txt`.

Referencias abreviadas:

- `spec`: `tests/navegador/carrusel.spec.ts`.
- `componente`: `app/(sitio)/_componentes/CarruselEquipo.tsx`.
- `entrega`: `docs/pm/tareas/T-006/entrega-dev.md`.

## Trazabilidad de criterios

La cobertura estática y la evidencia del dev **no equivalen a ejecución independiente en navegador**.

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | Configuración correcta; ejecución independiente pendiente | Build + start, puerto 3015 y sin reutilización: `playwright.config.ts:44`. La entrega registra ocho aprobadas, pero el gate no contiene navegador. |
| CA-2 | Cobertura presente; evidencia histórica consistente | Exige cambio y destino siguiente: `spec:405`, `:412`, `:413`. El cuerpo coincide exactamente con la versión usada en la demostración de r2. |
| CA-3 | Cobertura presente; ejecución pendiente | Establece y comprueba el máximo antes de exigir retorno a cero: `spec:426`, `:429`, `:433`. |
| CA-4 | **Garantía incompleta: D08** | La comparación tras dos intervalos puede aceptar una vuelta completa: `spec:444`. Existe además una prueba específica de cancelación en `spec:456`. |
| CA-5 | Cobertura presente; reservas temporales | Entrada con Tab y foco interactivo: `spec:498`. Combina foco/puntero y espera dos intervalos: `spec:504`, `:508`. Cancelación dirigida: `spec:513`. |
| CA-6 | Cobertura presente; ejecución pendiente | Flechas, último punto y `aria-current`: `spec:557`, `:563`, `:570`, `:574`. |
| CA-7 | Oráculo corregido; evidencia histórica consistente | Registra recorrido y exige `[antes]`: `spec:601`, `:611`. La demostración de r3 registra movimiento y regreso al origen. |
| CA-8 | Evidencia documental consistente; reproducción independiente pendiente | Entrega del commit `2a4d595`, sección «CA-8 revalidado»: falla la misma aserción que está ahora en `spec:412`. `componente:91` conserva `animarScroll`. |
| CA-9 | Guardas mejoradas; particiones legítimas pendientes de ejecución | HTTP y pie se exigen antes de omitir: `spec:147`, `:156`, `:161`. Ausencia de desborde: `spec:178`. La entrega reconoce que no ejecutó los vacíos legítimos. |
| CA-10 | Cumple por inspección de operaciones | No hay escrituras de DB ni nombres/cantidades de pilotos fijados. La geometría se obtiene del DOM: `spec:278`. El backend depende del entorno: `lib/supabase.ts:3`. |

## Sensibilidad de las pruebas

**“Previsto” expresa análisis estático. “Documentado” expresa evidencia del desarrollador, no una mutación ejecutada por QA.**

| Prueba | Mutación que debería hacerla fallar | ¿Falla? | Evidencia |
| ------ | ----------------------------------- | ------- | --------- |
| CA-2 | Sustituir `animarScroll` por `scrollTo({ behavior: 'smooth' })` | Documentado: sí | Comparación ejecutada: `CA-2 cuerpo r2 === HEAD: true`. Fallo histórico en la aserción actualmente ubicada en `spec:412`. |
| CA-3 | No volver al inicio desde el máximo | Previsto: sí | Máximo comprobado antes; cero exigido después: `spec:429`, `:433`. |
| CA-4, pausa/reanudación | Ignorar la pausa por puntero | **No necesariamente: D08** | Con dos paradas y la fase descrita abajo, ambas aserciones aceptan el recorrido defectuoso. |
| CA-4, pausa/reanudación | No reanudar al salir | Previsto: sí | Exige desplazamiento tras 5550 ms: `spec:448`, `:449`. |
| CA-4, paso en curso | Eliminar el efecto cancelador | Documentado: sí | Entrega de `2a4d595`, sección D03; prueba conservada en `spec:456`, comprobación en `spec:484`. |
| CA-5, foco/puntero | Reintroducir el booleano compartido | Previsto, con reserva de fase/geometría | Conserva foco dentro tras salir el puntero, pero observa solo el final: `spec:506`, `:509`. |
| CA-5, navegación | Excluir enlaces y controles del orden de Tab | Documentado: sí | Entrega de `2a4d595`, sección D04; helper actual en `spec:334`. |
| CA-5, paso en curso | Eliminar el efecto cancelador | Documentado: sí | Entrega de `2a4d595`, sección D03; `spec:537`. |
| CA-6 | Desconectar flechas, último punto o actualización del indicador | Previsto: sí | Comprobaciones de extremos y atributo en `spec:561`, `:566`, `:573`, `:574`. |
| CA-7 | Quitar `sinMovimiento` de la condición del intervalo | Documentado: sí, incluso completando una vuelta | Entrega de `62669ed`: recorrido `[0,413,827,1240,1653,2067,0]`; oráculo actual en `spec:611`. |
| Todas | Cambiar `aria-roledescription="carrusel"` | Documentado: sí | Encabezado independiente y contenedor obligatorio: `spec:103`, `:169`. Demostración D01 de r3. |
| Todas | Recibir HTTP 404/500 durante la navegación | Documentado y previsto: sí | El estado HTTP se exige antes de `test.skip`: `spec:147`. Demostraciones D07-a/b de la entrega actual. |

Las pruebas de pausa **sí atraviesan el intervalo de cinco segundos**. El problema pendiente es distinguir inmovilidad de un recorrido circular completo.

## Defectos

### T-006-D08 — CA-4 puede aprobar una vuelta completa bajo el puntero

- **Severidad / Prioridad:** **S2 / P1**.
- **Área:** testware / oráculo temporal.
- **Ubicación:** `tests/navegador/carrusel.spec.ts:444`.
- **Pasos / condición:**
  1. Usar una geometría con dos paradas alcanzables: `[0,408]`.
  2. Ignorar la pausa por puntero, por ejemplo eliminando la actualización de `onMouseEnter` en `componente:167`.
  3. Tomar la posición inicial 500 ms después del origen del intervalo, antes del primer paso. Es una fase compatible con el desplazamiento de reloj de `spec:211`.
  4. Aplicar las ventanas actuales: 10000 ms con puntero dentro y 5550 ms después de salir.
- **Esperado:** CA-4 debe rechazar cualquier rotación mientras el puntero permanece dentro.
- **Obtenido:** durante la primera ventana ocurre `0 → 408 → 0`. La comparación final acepta que estuvo pausado. Después ocurre otro avance y también pasa la aserción de reanudación.
- **Evidencia:**
  - `spec:445` compara únicamente el resultado final con `antes`.
  - `spec:449` exige únicamente que el resultado posterior sea diferente.
  - El intervalo es 5000 ms (`componente:39`); la animación dura 450 ms (`lib/carrusel.ts:79`).
  - Evaluación en memoria con `paginas` y `proximaPosicion` reales:

    ```text
    paradas:             [0,408]
    instantes:           [500,10500,16050]
    posiciones:          [0,0,408]
    pausaIgnorada:       true
    asercionPausa:       true
    asercionReanudacion: true
    ```

  A los 10500 ms ya pudieron terminar ambos desplazamientos, incluidos sus 450 ms de animación. No se trata de observar antes del primer intervalo.

  **Límite de la evidencia:** queda confirmado el contraejemplo del oráculo; no ejecuté esa mutación en Chromium. Tampoco afirmo que toda la suite quede verde: la prueba separada de cancelación podría detectar la mutación por otro recorrido.

- **Sugerencia:** registrar el recorrido durante toda la pausa y exigir ausencia de desplazamientos, como ya hace CA-7. Demostrar sensibilidad con dos paradas y varias fases del intervalo.
- **Introducido por:** este cambio; el patrón estaba señalado como riesgo en rondas anteriores y permanece en r4.

### Confirmación de defectos anteriores

| Defecto | Estado | Evidencia |
| -- | -- | -- |
| D01 | Corregido para las mutaciones solicitadas | Señal externa al carrusel, contenedor y controles obligatorios: `spec:103`, `:169`, `:186`. |
| D02 | Corregido por inspección | `reuseExistingServer: false`: `playwright.config.ts:46`. |
| D03 | Corregido para quitar el cancelador; cobertura temporal limitada | Dos pruebas dirigidas y evidencia histórica de fallo: `spec:456`, `:513`. |
| D04 | Corregido | Tab real y exigencia de foco interactivo: `spec:315`, `:334`. |
| D05 | Corregido | Versión exacta `1.63.0` en manifiesto y lock: `package.json:26`. |
| D06 | Corregido para movimiento reducido | Recorrido completo, incluida vuelta al origen: `spec:601`, `:611`. |
| D07 | Corregido para HTTP 404/500 | Aserción previa a omisiones: `spec:147`; salida negativa en la entrega actual. |

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **Pausa tardía:** las pruebas entran a los 48 ms, elegidos para evitar la fase en que el snap termina el salto. No verifican cancelación durante toda la animación (`spec:42`, `:56`). La entrega sigue reconociendo esa limitación.
- **CA-5 y `noSeMueve`:** mantienen comparaciones finales tras dos intervalos (`spec:390`, `:509`). Requieren mutaciones con distintas geometrías; no extiendo automáticamente el contraejemplo de D08 a esos recorridos.
- **Esperas reales:** `noSeMueve` toma tres muestras separadas por 100 ms (`spec:67`, `:386`). Están documentadas, pero no observan lo ocurrido entre muestras.
- **Carga lenta:** el reloj se pausa después de encontrar controles (`spec:210`). No se comprueba cuántos intervalos transcurrieron durante la carga.
- **Oráculo compartido:** CA-2 calcula el esperado con las funciones de producción (`spec:2`, `:407`). Los unitarios mitigan parcialmente una mutación compartida.
- **Identidad de portada:** `contentinfo` confirma un pie visible, no identifica exclusivamente `/`; el layout público comparte ese pie (`app/(sitio)/layout.tsx:16`). La demostración de HTTP 200 solo cubre una página sin pie.
- **Errores del backend:** `consultar()` devuelve fallback ante errores (`lib/supabase.ts:50`). Un fallo de datos puede verse como ausencia de pilotos; el spec no distingue esa causa.
- **Registrador permisivo:** si falta el registro, `recorridoGrabado` devuelve `[el.scrollLeft]` (`spec:272`). No encontré un camino actual que lo borre.
- **Reloj y `smooth`:** la evidencia acredita sensibilidad bajo reloj falso, no la explicación general sobre temporizadores reales.

**Checklist de tooling:**

| Punto | Resultado y evidencia |
| -- | -- |
| Separación de suites | Vitest incluye `tests/unidad/**/*.test.ts` (`vitest.config.mts:14`); Playwright busca en `tests/navegador` (`playwright.config.ts:11`). La separación actual es por directorios. |
| Build y colisiones | Build + start y sin reutilización: `playwright.config.ts:44`. Comprobación operativa pendiente. |
| Selectores | Roles, etiquetas y enlaces; sin clases CSS Modules: `spec:104`, `:169`, `:187`. |
| Resultados ignorados | `.gitignore:17`; no aparecen resultados versionados. |
| Dependencia | `devDependency` exacta, coherente con el lock: `package.json:26`. |
| Entorno | No se agregan secretos visibles ni archivos de entorno. `git ls-files '.env*'` devuelve únicamente `.env.example`, preexistente. |
| Documentación | Instalación de Chromium y ejecución: `README.md:95`, `docs/pm/contexto.md:74`. |
| Paralelismo | `fullyParallel: true`, páginas por prueba y sin escrituras de datos observadas. Invocaciones independientes comparten puerto/build: `playwright.config.ts:12`, `:44`. |
| Backend y procesos | Servidor web local no garantiza Supabase local (`lib/supabase.ts:3`). Liberación efectiva del puerto tras terminar: pendiente. |

## Pruebas a ejecutar por el PM

Todas en **entorno local con datos sintéticos**. No pude ejecutarlas porque requieren escritura, compilación o navegador.

- `npm ci && npx playwright install chromium && npm run test:navegador` — registrar HEAD, build y ocho pruebas ejecutadas; incorporar navegador al gate.
- `npm run test:navegador -- -g "CA-4: se pausa"` — con dos paradas, pausa por puntero anulada y fase inicial controlada; debe detectar movimiento aunque complete una vuelta. Registrar posiciones intermedias.
- `npm run test:navegador -- -g "CA-2"` — repetir la mutación `smooth`, restaurarla y contrastar además con tiempo real.
- `npm run test:navegador -- -g "CA-4|CA-5"` — eliminar el cancelador y variar entradas durante los 450 ms, incluida la fase tardía.
- `npm run test:navegador -- -g "CA-7"` — quitar únicamente `sinMovimiento` de la condición del intervalo; exigir fallo por recorrido, aun regresando al origen.
- `npm run test:navegador` — interceptar la navegación con HTTP 404/500; debe fallar sin omisiones. Ejecutar aparte sección apagada, cero pilotos y ausencia de desborde; deben omitir con motivos correctos.
- `npm run test:navegador -- --repeat-each=20 --workers=1` y después con varios workers — comprobar estabilidad, carga lenta y distintas cantidades de pilotos.
- Ejecutar con 3015 ocupado y comprobar `lsof -nP -iTCP:3015 -sTCP:LISTEN` tras éxito, fallo e interrupción — no reutilizar servidores ni dejar procesos propios.
- `npx next typegen && npx tsc --noEmit && npm run lint && npm test` — renovar el gate después de corregir el testware.