# Reporte QA T-006 — ronda 3

**Veredicto: FAIL**

**Resumen:** D01 y D06 están corregidos para las mutaciones solicitadas; la evidencia del dev coincide con el código actual. Sin embargo, una respuesta HTTP de error durante la navegación puede convertirse en ocho omisiones legítimas aparentes: nuevo **D07, S2/P1**. TypeScript pasa; el gate coincide con `HEAD`, pero no contiene ejecución de Playwright.

## Alcance cubierto

- **Diff revisado:** 30 archivos, `d2d50109a1ad76e6bbbe11cc31754104eeabe77b..62669ed099dfcdd5510780c4e9e46ba521f7fc0f`.
- **Separación de alcance:** T-006 comprende 14 archivos respecto de la base T-005. `git diff origin/Inf015/oliver132123-carrusel-equipo...HEAD -- app lib tests/unidad` devuelve vacío: las mutaciones de producción están revertidas.
- **Técnicas:** revisión estática, trazabilidad, análisis de mutaciones, particiones de precondiciones, transiciones de estado, análisis temporal y evaluación de oráculos.
- **Ejecutado:** `npx --no-install tsc --noEmit --incremental false` → **exit 0**, sin salida. Incremental desactivado para evitar escrituras.
- **Ejecutado:** `git diff --check origin/main...HEAD` → sin errores de whitespace.
- **Ejecutado:** helper actual `irAlCarrusel`, transpilado y evaluado en memoria con un doble de `Page` → reproduce la decisión de omitir ante respuestas 404/500. **No constituye ejecución en navegador.**
- **Gate:** `docs/pm/tareas/T-006/gate-r3.txt:4` registra exactamente el `HEAD` actual. Incluye typegen, tipos, lint y **230 unitarias en 11 archivos** (`:40`, `:46`, `:50`, `:68`). No incluye Playwright.
- **No ejecutado:** instalación, typegen, build, Vitest y Playwright por restricciones de escritura, servidor y navegador. No contacté servicios remotos.
- **Sin modificaciones:** estado inicial y final: únicamente `?? docs/pm/tareas/T-006/gate-r3.txt`.

Referencias abreviadas:

- `spec`: `tests/navegador/carrusel.spec.ts`.
- `componente`: `app/(sitio)/_componentes/CarruselEquipo.tsx`.
- `entrega`: `docs/pm/tareas/T-006/entrega-dev.md`.

## Trazabilidad de criterios

La evidencia documental del desarrollador no equivale a ejecución independiente de QA.

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | Configuración correcta; ejecución independiente pendiente | Build + start, puerto 3015 y `reuseExistingServer: false`: `playwright.config.ts:7`, `:44`, `:46`. El dev registra ocho aprobadas en `entrega:205`. |
| CA-2 | Cobertura presente; sensibilidad documental consistente | Exige desplazamiento y destino siguiente: `spec:378`, `:383`, `:384`. Evidencia histórica de CA-8 comprobada contra el código actual. |
| CA-3 | Cobertura presente; ejecución pendiente | Establece y verifica el máximo, avanza el reloj y exige cero: `spec:397`, `:400`, `:402`, `:404`. |
| CA-4 | Cobertura presente, con reservas temporales | Pausa durante dos intervalos y reanudación: `spec:415`, `:420`. Cancelación durante un paso: `spec:449`, `:455`. |
| CA-5 | Cobertura presente, con reservas temporales | Entrada con Tab, foco interactivo y combinación con puntero: `spec:469`, `:470`, `:477`, `:479`. Cancelación: `spec:503`, `:508`. |
| CA-6 | Cobertura presente; ejecución pendiente | Extremos, último punto y `aria-current`: `spec:529`, `:532`, `:537`, `:544`, `:545`. |
| CA-7 | D06 corregido por inspección y evidencia del dev | Registra posiciones durante toda la ventana y exige un único valor: `spec:213`, `:574`, `:582`. El fallo documentado incluye regreso al origen: `entrega:106`. |
| CA-8 | Evidencia histórica consistente; reproducción independiente pendiente | `git show 2a4d595:docs/pm/tareas/T-006/entrega-dev.md`, sección «CA-8 revalidado»: falla `expect(despues).not.toBe(antes)`, actualmente `spec:383`. El cuerpo de CA-2 no cambió en r3. Producción conserva `animarScroll`: `componente:91`. |
| CA-9 | **Parcial: omisión excesiva ante errores de navegación** | Las señales independientes corrigen la mutación del atributo; falta validar la respuesta antes de omitir: `spec:130`, `:132`. **D07.** |
| CA-10 | Cumple por inspección del test; aislamiento del backend pendiente | No hay escrituras de DB ni nombres/cantidades fijos. Navega a `/` y opera sobre DOM. El backend lo seleccionan variables de entorno: `lib/supabase.ts:3`. |

## Confirmación de defectos anteriores

| Defecto | Estado | Evidencia |
| -- | -- | -- |
| D01 | **FIXED para la regresión reportada en r2** | El encabezado externo al componente permite exigir el carrusel aunque cambie su atributo: `spec:103`, `:140`; `app/(sitio)/page.tsx:429`. La entrega registra **8 failed / 0 skipped**, con aserción y líneas coincidentes: `entrega:67`, `:78`. |
| D02 | **FIXED por inspección** | No reutiliza servidores: `playwright.config.ts:46`. Verificación operativa pendiente. |
| D03 | **FIXED para la mutación solicitada; cobertura limitada** | Pruebas de cancelación presentes en `spec:427`, `:484`; conservan la lógica de r2. La evidencia histórica de r2 registra fallos al quitar el cancelador. |
| D04 | **FIXED por inspección** | Tab real y exigencia de foco en enlace/botón: `spec:286`, `:305`, `:469`. |
| D05 | **FIXED** | `@playwright/test` está en `devDependencies`, versión exacta `1.63.0`, coherente con el lock: `package.json:26`, `package-lock.json`. |
| D06 | **FIXED para la mutación solicitada** | La salida documentada `[0,413,827,1240,1653,2067,0]` coincide con el nuevo oráculo y termina donde empezó: `entrega:106`, `spec:582`. No falla simplemente por quedar lejos del origen. |

Las mutaciones de D01 y D06 tampoco quedaron aplicadas: `componente:165` conserva `"carrusel"` y `componente:155` conserva `sinMovimiento`.

## Sensibilidad de las pruebas

**“Previsto” indica análisis estático, no una mutación ejecutada por QA.**

| Prueba | Mutación que debería hacerla fallar | ¿Falla? | Evidencia |
| ------ | ----------------------------------- | ------- | --------- |
| CA-2 | Reemplazar `animarScroll` por `scrollTo({ behavior: 'smooth' })` | Sí según evidencia histórica del dev, consistente con el cuerpo actual | Entrega de `2a4d595`, sección CA-8; aserción actual `spec:383`. |
| CA-3 | Permanecer en el máximo cuando toca volver al inicio | Previsto: sí | Máximo verificado antes y cero exigido después: `spec:400`, `:404`. |
| CA-4, pausa/reanudación | No reanudar al salir el puntero | Previsto: sí | Exige cambio tras intervalo más animación: `spec:419`, `:420`. |
| CA-4, pausa/reanudación | Ignorar la pausa por puntero | Detección dependiente del recorrido y fase; reproducción pendiente | Solo compara al terminar dos intervalos: `spec:415`, `:416`. |
| CA-4, paso en curso | Eliminar el efecto cancelador | Sí según evidencia de r2; no reejecutado | Prueba conservada en `spec:427`; vigilancia en `spec:356`. |
| CA-5, foco/puntero | Reintroducir el booleano compartido | Previsto, con reserva sobre observación final | Foco permanece dentro tras salir el puntero, luego espera dos intervalos: `spec:477`, `:479`, `:480`. |
| CA-5, navegación | Excluir todos los enlaces y controles del orden de Tab | Previsto: sí; evidencia histórica de r2 | `tabularHastaInteractivo` falla si ninguno recibe foco: `spec:305`, `:316`. |
| CA-5, paso en curso | Eliminar el efecto cancelador | Sí según evidencia de r2; no reejecutado | `spec:503`, `:508`. |
| CA-6 | Desconectar flechas, último punto o actualización del indicador | Previsto: sí | Aserciones de extremos y atributo: `spec:532`, `:537`, `:544`, `:545`. |
| CA-7 | Quitar `sinMovimiento` de la condición del intervalo | Sí según evidencia actual del dev, incluso completando una vuelta | `entrega:106`; recorrido completo exigido en `spec:582`. |
| Todas | Cambiar `aria-roledescription="carrusel"` | Sí según evidencia actual del dev | `entrega:67`; contenedor obligatorio en `spec:140`. |
| Todas | Recibir una página HTTP de error sin señales de pilotos durante `goto('/')` | **No: el helper omite** | `spec:130`, `:132`; D07. |

Las pausas **sí atraviesan el intervalo de rotación**: no pasan simplemente por observar antes de los cinco segundos. La reserva es que varias comprobaciones comparan únicamente posiciones finales.

## Defectos

### T-006-D07 — Una página HTTP de error se clasifica como ausencia legítima de pilotos

- **Severidad / Prioridad:** **S2 / P1**.
- **Área:** testware / validación de precondiciones.
- **Ubicación:** `tests/navegador/carrusel.spec.ts:130`.
- **Pasos / condición:** después de que el servidor supere su comprobación de disponibilidad, hacer que la navegación del navegador a `/` reciba HTTP 500 o 404 con HTML sin el encabezado de equipo ni enlaces `/equipo/<slug>`. Puede reproducirse interceptando únicamente esa navegación en un entorno local.
- **Esperado:** fallar por no haber cargado correctamente la portada. CA-9 autoriza omitir por falta de pilotos o sección apagada, no por una respuesta HTTP de error.
- **Obtenido:** se descarta la respuesta de `page.goto('/')`; ambas señales tienen conteo cero y `test.skip` atribuye el resultado a sección apagada o falta de pilotos. Todas las pruebas usan ese helper.
- **Evidencia:**
  - `spec:130`: `await page.goto('/')`, sin comprobar respuesta ni estado.
  - `spec:106`: ambas señales ausentes producen `false`.
  - `spec:132`: ese resultado activa la omisión antes de cualquier aserción.
  - La documentación instalada confirma que `goto()` no lanza por HTTP 404/500: `node_modules/playwright-core/types/types.d.ts:3497`.
  - Evaluación del **helper actual**, transpilado en memoria, con respuestas y conteos controlados:

    ```text
    HTTP 200, sin señales: SKIP: La portada no muestra el bloque de equipo hoy...
    HTTP 404, sin señales: SKIP: La portada no muestra el bloque de equipo hoy...
    HTTP 500, sin señales: SKIP: La portada no muestra el bloque de equipo hoy...
    ```

  Esta ejecución confirma la decisión del helper; la reproducción integral en navegador queda pendiente. Un servidor que falle desde el arranque puede ser rechazado antes por `webServer`: el caso reportado afecta la navegación posterior.
- **Sugerencia:** exigir respuesta HTTP satisfactoria y una señal estable de portada cargada antes de evaluar omisiones por contenido. Demostrar que una respuesta de error falla y que los vacíos legítimos siguen omitiéndose.
- **Introducido por:** este cambio; el descarte de la respuesta ya existía en rondas anteriores y permanece en r3.

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **Pausa tardía:** se entra a los **48 ms**, seleccionados para evitar que el snap termine el salto por su cuenta (`spec:42`, `:56`). La entrega reconoce movimiento posterior alrededor de 200 ms (`entrega:262`). La cobertura no demuestra cancelación durante toda la animación.
- **Observación de pausas:** CA-4/CA-5 y el tramo de reloj falso de `noSeMueve` conservan comparaciones finales (`spec:361`, `:416`, `:480`). Deben probarse distintas cantidades de paradas y fases; no doy por demostrada una evasión concreta en navegador.
- **Esperas reales:** `noSeMueve` hace tres esperas de 100 ms, documentadas mediante constantes (`spec:67`, `:358`). No son números sin explicación, pero no prueban inmovilidad entre muestras.
- **Carga y rendimiento:** el reloj corre durante la carga y se pausa después (`spec:181`). Además, CA-7 recorre tantos intervalos como paradas (`spec:574`); el costo crece con los datos. La entrega registra 9,7 s para seis paradas (`entrega:218`). Falta repetición bajo carga y con más pilotos.
- **Oráculo compartido:** CA-2 importa las funciones de navegación de producción (`spec:2`, `:378`); una mutación común puede alterar resultado y esperado. Los unitarios proporcionan mitigación parcial.
- **Registrador permisivo:** si desapareciera `window.__recorridoCarrusel`, `recorridoGrabado` sustituiría la evidencia por `[el.scrollLeft]` (`spec:243`). No encontré un camino actual que lo borre; convendría fallar si falta el registro.
- **Backend:** `localhost:3015` garantiza servidor web local, no Supabase local. El build y servidor utilizan las variables de `lib/supabase.ts:3`. No leí archivos de entorno reales.
- **Alcance de CA-8:** la salida negativa demuestra sensibilidad bajo reloj falso; no prueba por sí sola que la animación nativa falle generalmente al originarse en un temporizador. Contrastar con tiempo real.
- **Procesos:** no se comprobó la liberación efectiva del puerto tras éxito, fallo e interrupción. La declaración documental de apagado automático (`README.md:99`) no sustituye esa comprobación.

**Checklist verificado por inspección:**

| Punto | Resultado y evidencia |
| -- | -- |
| Separación de suites | Vitest incluye `tests/unidad/**/*.test.ts`: `vitest.config.mts:14`. Playwright limita descubrimiento a `tests/navegador`: `playwright.config.ts:11`. La separación actual es por directorio, no exclusivamente por extensión. |
| Build de producción y colisiones | `npm run build && npx next start -p 3015`, sin reutilización: `playwright.config.ts:44`. |
| Selectores | Roles, etiquetas, atributo accesible y enlaces; sin clases CSS Modules: `spec:104`, `:140`, `:158`. |
| Resultados ignorados | `.gitignore:17`; búsqueda de resultados versionados sin coincidencias. |
| Dependencia fijada | `package.json:26` y lock: `1.63.0`. |
| Entorno y secretos | No se agregan `.env*` ni secretos visibles en la configuración. `git ls-files '.env*'` devuelve únicamente `.env.example`, preexistente. |
| Documentación | Instalación de Chromium y ejecución en `README.md:95` y `docs/pm/contexto.md:74`. |
| Paralelismo | `fullyParallel: true`, con fixture `page` por prueba y sin escrituras de datos observadas: `playwright.config.ts:12`, `spec:369`. Dos invocaciones independientes comparten puerto/build. |
| Limpieza de procesos | Pendiente de ejecución. |

## Pruebas a ejecutar por el PM

Todas con **servicios locales y datos sintéticos**, sin producción. No pude realizarlas porque requieren escritura, compilación o navegador.

- `npm ci && npx playwright install chromium && npm run test:navegador` — registrar `HEAD`, build y ocho pruebas ejecutadas sin omisiones con datos suficientes; incorporar la salida al gate.
- `npm run test:navegador` con la navegación a `/` interceptada para devolver HTTP 500 y luego 404 — **debe fallar, no omitir**. Mantener aparte los casos legítimos de sección apagada, cero pilotos y ausencia de desborde.
- `npm run test:navegador` cambiando únicamente `aria-roledescription` — confirmar ocho fallos y ninguna omisión; restaurar después.
- `npm run test:navegador -- -g "CA-7"` quitando únicamente `sinMovimiento` de la condición del intervalo — confirmar fallo con recorrido que vuelve al origen; restaurar.
- `npm run test:navegador -- -g "CA-2"` sustituyendo `animarScroll` por `smooth` — renovar evidencia contra `HEAD` y contrastar con tiempo real; restaurar.
- `npm run test:navegador -- -g "CA-4|CA-5"` — repetir mutaciones de pausa y cancelación con distintas geometrías y entradas durante los 450 ms, incluida la fase tardía.
- `npm run test:navegador -- --repeat-each=20 --workers=1`, luego con varios workers — comprobar estabilidad, carga lenta y cantidades mayores de pilotos.
- Ejecutar con 3015 ocupado; comprobar `lsof -nP -iTCP:3015 -sTCP:LISTEN` tras éxito, fallo e interrupción — no reutilizar otro servidor ni dejar procesos propios.
- `npx next typegen && npx tsc --noEmit && npm run lint && npm test` — renovar el gate después de corregir, manteniendo separadas las suites.