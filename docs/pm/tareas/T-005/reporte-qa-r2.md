# Reporte QA T-005 — ronda 2

**Veredicto: FAIL**

**Resumen:** D01–D05 tienen correcciones respaldadas por revisión estática y pruebas de lógica; falta confirmar su comportamiento en navegador. D06 sigue abierto como **S3/P1**: volver a `behavior: 'smooth'` en el componente no haría fallar los tests actuales. El gate corresponde al HEAD revisado y TypeScript pasó.

## Alcance cubierto

- **Diff completo:** 14 archivos, 8 commits; `d2d50109a1ad76e6bbbe11cc31754104eeabe77b..410a99d6ff695a6d103e4abdbd4519e84c4d2a4f`.
- **Rama:** `Inf015/oliver132123-carrusel-equipo`, coincide con el objeto de prueba.
- **Base de prueba:** contexto, brief, entrega, gate, reporte anterior y guía de validación.
- **Técnicas:** particiones de equivalencia, valores límite, transiciones de estado, revisión de ramas y dependencias, confirmation testing, regresión y error guessing.
- **Ejecutado:** `npx --no-install tsc --noEmit --incremental false` → código **0**, sin salida. Incremental desactivado para evitar escrituras.
- **Ejecutado:** funciones reales de `lib/carrusel.ts`, transpiladas y evaluadas en memoria con `node -e`, TypeScript y `vm`. Resultados abajo.
- **Gate aportado:** `docs/pm/tareas/T-005/gate-r2.txt:4` coincide exactamente con HEAD; `:37`, `:42`, `:50` y `:62` registran typegen, tipos, lint y **230 tests aprobados en 11 archivos**.
- **No ejecutado:** Vitest por la restricción EPERM indicada; build/typegen porque escriben; navegador porque no se levantó un entorno local aislado. No hubo acceso a servicios remotos.
- **Sin modificaciones:** el estado inicial y final contiene únicamente `?? docs/pm/tareas/T-005/gate-r2.txt`.

Las referencias abreviadas a `CarruselEquipo.tsx` y su CSS corresponden a `app/(sitio)/_componentes/`.

## Trazabilidad de criterios

**CUMPLE** expresa comprobación estática cuando se indica. No implica validación visual ni ejecución de la consulta contra una base.

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | CUMPLE | Orden JSX: servicios, pilotos y novedades en `app/(sitio)/page.tsx:323`, `:428`, `:452`. |
| CA-2 | CUMPLE | Filtro en consulta `.contains('roles', ['Piloto'])`, `lib/datos.ts:117`. `/equipo` no cambia. |
| CA-3 | CUMPLE | `page.tsx:135`; filtro nacional/vigente en `lib/records.ts:110`; texto compartido en `records-texto.ts:12`; ocultación con cero en `CarruselEquipo.tsx:210`. |
| CA-4 | CUMPLE | `page.tsx:134` usa `totalTrofeos`; `lib/palmares.ts:91` aplica declarado `??` fichas. `CarruselEquipo.tsx:228` oculta cero. Mismo cálculo en `app/(sitio)/equipo/MiembroCard.tsx:32`. |
| CA-5 | NO VERIFICABLE | Intervalo de 5000 ms y animación conectados en `CarruselEquipo.tsx:39`, `:91`, `:154`. La entrega aporta observación manual, pero no una prueba reproducible del temporizador sobre el navegador afectado por D00. |
| CA-6 | NO VERIFICABLE | Correcciones estáticas presentes en `CarruselEquipo.tsx:63`, `:119`, `:167`. Falta comprobar eventos reales y cancelación visible durante el movimiento. |
| CA-7 | NO VERIFICABLE | Preferencia y cambios observados en `CarruselEquipo.tsx:128`; desplazamiento instantáneo en `:86`; cancelación en `:119`. Falta navegador. |
| CA-8 | NO VERIFICABLE | Medición del desborde en `CarruselEquipo.tsx:143`, intervalo condicionado en `:155` y controles en `:245`. Requiere geometría real. |
| CA-9 | NO VERIFICABLE | Retorno circular comprobado en memoria, `lib/carrusel.ts:59`; controles conectados en `CarruselEquipo.tsx:250` y `:275`. Falta desplazamiento efectivo en navegador. |
| CA-10 | CUMPLE | Sección apagada evita `getPilotos()` en `page.tsx:117`; vacío evita el bloque en `:429`; consulta restringida a pilotos activos en `lib/datos.ts:116`. |
| CA-11 | CUMPLE | Proyección explícita en `page.tsx:127`, pasada al cliente en `:447`: ocho campos de resumen, sin biografía, palmarés ni objetos de récords. Inspección del HTML/RSC servido pendiente. |

## Confirmation testing de la ronda anterior

| Defecto | Estado | Evidencia y alcance |
| -- | -- | -- |
| D00 | PARTIAL | Existe escritura por cuadro, `lib/carrusel.ts:157`, y observación manual declarada en la entrega. No queda demostrado mediante regresión del componente. |
| D01 | FIXED — estático | Estados independientes y unión en `CarruselEquipo.tsx:56`, `:63`; salir con el puntero conserva la pausa por foco. `relatedTarget` evita reanudar al cambiar de enlace interno, `:175`. |
| D02 | FIXED — estático y unidad | El efecto cancela al pausar, reducir movimiento o perder desborde, `CarruselEquipo.tsx:119`; desmontaje en `:124`. Cancelación real del helper comprobada en memoria. Falta interacción en navegador. |
| D03 | FIXED — estático | El filtro se aplica en la consulta, `lib/datos.ts:117`, antes de recuperar los miembros excluidos. |
| D04 | FIXED — lógica | `paginas()` produce destinos alcanzables, `lib/carrusel.ts:41`; los puntos utilizan esos destinos, `CarruselEquipo.tsx:260`. Caso de ocho tarjetas ejecutado abajo. |
| D05 | FIXED — CSS | Botones de 44×44 y contenedor con wrap, `carrusel-equipo.module.css:196`, `:206`. Falta medición efectiva en móvil. |
| D06 | NOT FIXED | Los tests importan el helper, no el componente, `tests/unidad/carrusel.test.ts:2`. La extracción amplía cobertura, pero no detecta la reversión de su integración. |

## Diseño y ejecución de pruebas

### Caja negra: particiones y límites

Se ejecutaron las funciones existentes en memoria, sin modificar archivos. Para las pruebas normales, `paginas([0,320,640],300)` produjo destinos `[0,300]`.

| Entrada / partición | Resultado observado |
| -- | -- |
| Cero tarjetas: avance, retroceso, índice | `0, 0, 0` |
| Una tarjeta `[0]`, `max=0`: ambas direcciones; índice con scroll 100 | `0, 0, 0` |
| `max=-1`, ambas direcciones | `0, 0` |
| Scroll 0: avance / retroceso | `300 / 300` |
| Scroll 2 y 2.1: retroceso | `300 / 0` |
| Scroll 297.9 y 298: avance | `300 / 0` |
| Scroll 300: avance / retroceso / índice | `0 / 0 / 1` |
| Scroll 700, pasado del tope: avance / retroceso / índice | `0 / 300 / 1` |
| Empate exacto, scroll 150 | Índice `0` |
| Animación `0→590`, `t=-0.3,0,0.5,1,1.8` | `0,0,516.25,590,590` |
| Animación `590→0`, mismos tiempos | `590,590,73.75,0,0` |
| Ocho tarjetas; inicios cada 408; máximo 2040 | Seis destinos: `0,408,816,1224,1632,2040`; último asociado a tarjeta 7 |
| Cancelar a los 150 ms; cancelar otra vez; intentar cuadro a 450 ms | Posiciones `[0,415.1851851851851]`; **0 cuadros pendientes** |

El recorte del retroceso pasado del máximo corrige el riesgo aritmético de r1. Estos resultados no prueban scroll-snap ni overscroll del navegador.

### Caja blanca: efectos y ramas no cubiertas

- **Dependencias:** `medirParadas` y `cortar` son estables; `mover` depende de `sinMovimiento`; `paso` depende de ambos. Actualizar `indice`, `fallidas` o `paradas` no recrea por sí mismo el intervalo. Evidencia: `CarruselEquipo.tsx:67`, `:72`, `:100`, `:111`, `:158`.
- **Limpiezas:** existen para intervalo, listener de preferencia, observador y animación al desmontar. Los cambios de pausa, reducción o desborde cancelan el movimiento cuando corresponde: `CarruselEquipo.tsx:119`, `:124`, `:133`, `:151`, `:157`.
- **StrictMode:** la inspección no revela intervalos o RAF duplicados por falta de limpieza. Esto requiere confirmación instrumental; los tests actuales no montan el componente.
- **`onScroll`:** calcula el índice y solicita actualizarlo; no escribe `scrollLeft`, por lo que no hay un bucle directo entre ese handler y la animación (`CarruselEquipo.tsx:182`). No equivale necesariamente a un render por cuadro: muchas actualizaciones conservan el mismo índice. La cantidad efectiva no está medida.
- **Cobertura ausente:** eventos combinados de foco/puntero, `matchMedia`, `ResizeObserver`, montaje/desmontaje, controles, imágenes y temporizador conectado al DOM. La búsqueda `rg` en `tests` encontró referencias al carrusel únicamente mediante `lib/carrusel`.

## Defectos

### T-005-D06 — La regresión de D00 sigue sin una prueba que falle al revertir la integración

- **Severidad / Prioridad:** **S3 / P1**, conservadas de r1.
- **Área:** testware.
- **Ubicación:** `tests/unidad/carrusel.test.ts:2`, `:162`; `CarruselEquipo.tsx:91`.
- **Pasos / condición:** conservar `lib/carrusel.ts` y sustituir la llamada a `animarScroll` del componente por `pista.scrollTo({ left: destino, behavior: 'smooth' })`.
- **Esperado:** una prueba falla al reintroducir D00, conforme al invariante «Todo bug arreglado lleva su test que falla sin el fix» de `docs/pm/contexto.md`.
- **Obtenido:** las pruebas siguen ejercitando exactamente los mismos helpers; ninguna importa o monta el componente modificado.
- **Evidencia:** imports en `carrusel.test.ts:2`; el test de `:170` llama directamente a `animarScroll` con un array como receptor. La búsqueda en `tests` no encontró integración con `CarruselEquipo`. La propia entrega reconoce esa limitación.
- **Sugerencia:** incorporar una prueba del carrusel en navegador local que espere el temporizador y observe cambio efectivo de `scrollLeft`, avance y vuelta. Demostrar que falla con la implementación anterior.
- **Introducido por:** este cambio; persiste desde r1.

**Evaluación explícita:** los tests nuevos cubren más que aritmética: verifican programación, escritura de cuadros, finalización y cancelación del helper. Fallarían ante ciertas roturas de ese helper. **No fallarían al volver a `behavior: 'smooth'` únicamente en el componente.** La mutación no se ejecutó porque exigiría modificar archivos; la independencia de los imports permite establecer esta conclusión estáticamente.

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **Resize durante una animación:** la medición actualiza paradas, pero no recalcula `indice` ni cancela por cambios de geometría si `desborda` sigue siendo `true` (`CarruselEquipo.tsx:143`). El RAF conserva el destino anterior. Verificar indicadores y posición final; el navegador puede corregirlos mediante scroll/snap.
- **Foco de ventana:** `relatedTarget=null` libera la pausa (`CarruselEquipo.tsx:176`). El comentario presupone que al regresar llegará otro evento de foco. Falta comprobar cambio de ventana y regreso; no hay evidencia para afirmar pausa permanente.
- **Interacción táctil:** no hay cancelación explícita mediante `touchstart`/`pointerdown`; el RAF sigue escribiendo posiciones (`CarruselEquipo.tsx:91`). Probar arrastre durante autoplay para determinar si compiten.
- **Accesibilidad:** hay etiquetas y `aria-current`, pero `aria-roledescription` está en un `div` sin rol explícito (`CarruselEquipo.tsx:163`). Revisar árbol accesible. Medir también flechas: declaran 44 px, pero son elementos flex sin protección explícita contra encogimiento (`carrusel-equipo.module.css:167`, `:176`).
- **`offsetParent`:** actualmente lo garantiza `.pista { position: relative }`, CSS `:15`. Quitar esa regla puede cambiar las coordenadas de `offsetLeft`; no hay prueba de integración que proteja esa dependencia.
- **Imágenes:** `fill` tiene padre posicionado y `sizes` por breakpoint, conforme a la guía local `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md:115`. El tamaño descargado requiere medición. `fallidas` agrega IDs sin deduplicar (`CarruselEquipo.tsx:199`), pero después desmonta la imagen: no se demuestra crecimiento ilimitado con miembros estables. Probar eventos repetidos y cambio de URL manteniendo ID.
- **HTML y datos:** el servidor aún recupera relaciones completas (`lib/datos.ts:115`), pero la proyección evita pasarlas al cliente. No confundir costo de consulta con incumplimiento de CA-11.
- **Hidratación:** estados iniciales constantes y APIs del navegador dentro de efectos/callbacks; no se identificó dependencia inicial de ancho, hora o fecha (`CarruselEquipo.tsx:49`, `:128`).
- **Checklist del proyecto:** no hay rutas, hosts, schema o políticas nuevas en el diff. Se conserva revalidación de 60 s (`app/(sitio)/layout.tsx:9`). Los errores de consulta se registran y devuelven fallback (`lib/supabase.ts:40`); su visibilidad es operativa, no un mensaje al visitante.
- **Trazabilidad documental:** `docs/pm/tablero.md:15` todavía dice «Sin QA», pese al reporte r1 versionado. `validar.md:86` declara build y seguridad verdes, pero `gate-r2.txt` solo aporta typegen, tipos, lint y unidad. Esas verificaciones adicionales no se consideran acreditadas por este gate.

## Pruebas a ejecutar por el PM

Todas en **entorno local aislado, con datos sintéticos y sin servicios remotos**. No pude ejecutarlas porque requieren navegador/servidor o escritura:

- **D00/D06:** esperar 5 segundos sin interacción, verificar avance unitario y ciclo completo; repetir con la implementación anterior y demostrar fallo.
- **D01/D02:** combinar las cuatro situaciones de foco/puntero; entrar durante los 450 ms de animación. Debe detenerse y reanudar solo al desaparecer ambas condiciones.
- Activar movimiento reducido antes de cargar y durante un paso; verificar ausencia de autoplay y controles instantáneos.
- Instrumentar intervalos/RAF bajo StrictMode, desmontar durante un paso y redimensionar conservando o eliminando el desborde; no deben quedar callbacks residuales.
- Probar 0, 1, 2 y 8 tarjetas alrededor de 768 y 1024 px; comprobar controles, extremos, indicadores y puntos de 44×44 efectivos.
- Arrastrar durante autoplay, usar rueda y pulsar controles rápidamente; comprobar que el movimiento programado no interfiere con el gesto.
- Cambiar de ventana con foco interno y regresar; inspeccionar árbol accesible y mantener visible el enlace enfocado.
- Simular imagen ausente, error y sustitución de URL; verificar fallback y recuperación.
- Comprobar consultas con sección apagada/sin pilotos e inspeccionar HTML/RSC para confirmar ausencia de palmarés.
- Tras corregir D06: `npx next typegen && npx tsc --noEmit && npm run lint && npm test`, más la nueva prueba de integración.