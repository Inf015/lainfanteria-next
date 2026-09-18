# Reporte QA T-005 — ronda 1

**Veredicto:** FAIL

**Resumen:** CA-6 falla por la coordinación entre foco y puntero y porque pausar no cancela la animación activa. CA-10 tampoco cumple la condición de evitar consultar miembros innecesarios cuando no hay pilotos. El gate corresponde al HEAD revisado, pero sus tests no protegen contra una regresión de D00.

## Alcance cubierto

- **Diff completo:** 11 archivos, 5 commits; `d2d50109a1ad76e6bbbe11cc31754104eeabe77b..8c25e2d99c673087eb531b4297c82653b9f04199`. Rama correcta. Incluye código, estilos, tests y los cinco documentos modificados/agregados.
- **Base de prueba:** contexto, brief, entrega y gate.
- **Técnicas:** particiones de equivalencia, valores límite, transiciones de estado, revisión de ramas/dependencias/limpiezas y error guessing.
- **Ejecutado:** `npx --no-install tsc --noEmit --incremental false` → código 0, sin salida. Se desactivó el incremental para evitar escribir caché.
- **Ejecutado:** funciones reales de `lib/carrusel.ts`, transpիլadas y evaluadas en memoria mediante `node -e`, TypeScript y `vm`; resultados abajo.
- **Evidencia del PM:** `gate-r1.txt:4` registra exactamente el HEAD actual; `:28`, `:34`, `:38` y `:56` registran typegen, tipos, lint y **11 archivos / 221 tests aprobados**.
- **No ejecutado:** Vitest, por la restricción EPERM indicada; typegen/build, porque escriben; navegador de la aplicación, porque no se levantó un entorno aislado de servicios remotos. No se accedió a producción ni Supabase.
- Sin modificaciones. `git status --short` mantuvo únicamente el gate no trackeado que ya existía al comenzar.

## Trazabilidad de criterios

“CUMPLE” indica comprobación estática cuando así se especifica; no sustituye validación visual.

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 | CUMPLE | Orden JSX: servicios en `app/(sitio)/page.tsx:325`, pilotos en `:430`, novedades en `:454`. |
| CA-2 | CUMPLE | Filtro explícito `roles.includes('Piloto')`, `page.tsx:128`. `/equipo` no cambia en el diff. |
| CA-3 | CUMPLE | `page.tsx:137`; filtro nacional/vigente en `lib/records.ts:110`; texto compartido en `app/(sitio)/_componentes/records-texto.ts:12`; ocultación con cero en `CarruselEquipo.tsx:181`. |
| CA-4 | CUMPLE | `lib/palmares.ts:91` usa declarado `??` fichas; `page.tsx:136`; ocultación con cero y singular/plural en `CarruselEquipo.tsx:198`. |
| CA-5 | NO VERIFICABLE | Intervalo de 5000 ms y RAF presentes (`CarruselEquipo.tsx:32`, `:79`, `:132`). Aritmética comprobada; movimiento real con CSS pendiente. |
| CA-6 | NO CUMPLE | D01 y D02: `CarruselEquipo.tsx:145` y `:132`. |
| CA-7 | NO VERIFICABLE | Apertura con reducción y controles instantáneos implementados en `CarruselEquipo.tsx:71`, `:110`, `:133`; falta navegador. El cambio de preferencia durante una animación tiene el problema D02. |
| CA-8 | NO VERIFICABLE | Medición y ocultación en `CarruselEquipo.tsx:124`, `:133`, `:214`; necesita verificar geometría y resize reales. |
| CA-9 | NO VERIFICABLE | Retorno circular comprobado en `lib/carrusel.ts:36`; falta verificar los controles y el destino efectivo en navegador. |
| CA-10 | NO CUMPLE | La sección apagada evita consultar y el conjunto vacío evita renderizar, pero sección activa sin pilotos carga todos los miembros activos: D03. |
| CA-11 | CUMPLE | Proyección explícita en `page.tsx:129`, entregada en `:449`. Solo pasan `id`, `nombre`, `slug`, `numero`, `foto`, `roles`, `trofeos`, `recordsNacionales`; no se pasa el palmarés ni el objeto `Miembro`. Inspección del HTML servido pendiente. |

Las referencias abreviadas a `CarruselEquipo.tsx` corresponden a `app/(sitio)/_componentes/CarruselEquipo.tsx`.

## Diseño y resultados de pruebas

### Caja negra: particiones y límites

Se ejecutó el código existente en memoria, sin modificarlo:

| Partición / entrada | Resultado |
| -- | -- |
| Cero tarjetas: avance, retroceso, índice | `0, 0, 0` |
| Una tarjeta `[0]`, `max=0`: ambas direcciones; índice con scroll 100 | `0, 0, 0` |
| `max=-1`, ambas direcciones | `0, 0` |
| `[0,320,640]`, `max=300`: avance desde 0; avance/retroceso desde 300 | `300, 0, 0` |
| Avance desde 297.9 y 298 | `300, 0`: frontera de tolerancia de 2 px |
| Retroceso desde 2 y 2.1 | `300, 0`: frontera de tolerancia |
| Scroll pasado del tope: 700, `max=300`, avance/retroceso | `0, 640`; el retroceso no limita su resultado a `max` |
| Índice en empate, scroll 160 sobre `[0,320,640]` | `0`: gana el primero |
| Índice en el tope 300 sobre `[0,320,640]` | `1`, no `2` |
| Animación `0→590`, `t=-0.3,0,0.5,1,1.8` | `0,0,516.25,590,590` |
| Animación `590→0`, `t=0.5,1` | `73.75,0` |

El retroceso fuera de rango se documenta como riesgo: el cálculo está confirmado, pero falta demostrar una condición real del navegador que entregue esa entrada.

### Caja blanca y evaluación del testware

- Los tests importan únicamente las tres funciones puras (`tests/unidad/carrusel.test.ts:2`). No ejercitan efectos, temporizadores, RAF, eventos, `ResizeObserver`, `matchMedia`, desmontaje ni imágenes.
- **Revertir únicamente la integración RAF a `behavior: 'smooth'`, conservando los helpers, no haría fallar ninguno de estos tests. D00 no está cubierto.** Una eliminación del helper podría romper un import, pero eso no demostraría una regresión funcional.
- El caso titulado “en el tope… marca la última” sustituye `[0,320,640]` por `[0,150,300]`, alineando artificialmente el último inicio con `MAX` (`carrusel.test.ts:82`). No comprueba lo que describe.
- Faltan casos permanentes de una tarjeta, `max<0`, empate exacto, las fronteras completas de tolerancia y scroll pasado del tope.
- Las dependencias de `inicios`, `mover` y `paso` son coherentes (`CarruselEquipo.tsx:52`, `:87`, `:97`). Cambiar `indice` no recrea el intervalo.
- Hay limpieza de intervalo, observador, listener y RAF al desmontar (`:102`, `:115`, `:129`, `:135`). La inspección no muestra intervalos duplicados por StrictMode; falta ejecución instrumental.
- `onScroll` lee posiciones y actualiza el índice (`:153`), sin escribir el scroll. No puede atribuirse un render a cada evento: muchos actualizan el mismo valor. El número real requiere medición.

## Defectos

### T-005-D01 — Salir con el puntero reactiva la rotación aunque el foco siga dentro

- **Severidad / Prioridad:** S2 / P1.
- **Área:** funcionalidad / accesibilidad.
- **Ubicación:** `app/(sitio)/_componentes/CarruselEquipo.tsx:145`.
- **Pasos / condición:** enfocar un enlace del carrusel; entrar y salir del bloque con el puntero conservando el foco; esperar cinco segundos.
- **Esperado:** CA-6: permanecer pausado mientras el foco siga dentro.
- **Obtenido:** `onMouseLeave` pone `pausado=false`; el efecto vuelve a crear el intervalo. También ocurre al sacar el foco mientras el puntero permanece dentro.
- **Evidencia:** foco y hover escriben el mismo booleano; ninguna salida consulta la otra condición (`:145` a `:148`, efecto en `:133`).
- **Sugerencia:** representar ambas condiciones independientemente y comprobar si el foco realmente salió del contenedor.
- **Introducido por:** este cambio.

### T-005-D02 — Pausar no cancela el desplazamiento en curso

- **Severidad / Prioridad:** S2 / P1.
- **Área:** ciclo de vida / accesibilidad.
- **Ubicación:** `app/(sitio)/_componentes/CarruselEquipo.tsx:79`, `:102`, `:132`.
- **Pasos / condición:** iniciar un paso automático; antes de completar sus 450 ms, introducir el foco o el puntero.
- **Esperado:** CA-6: detener la rotación al entrar.
- **Obtenido:** se elimina el intervalo, pero el RAF pendiente continúa escribiendo `scrollLeft` hasta terminar.
- **Evidencia:** `cuadro` solo comprueba `t<1`. La limpieza que depende de `pausado` ejecuta exclusivamente `clearInterval`. RAF se cancela al desmontar o al iniciar otro movimiento.
- **Sugerencia:** cancelar explícitamente el movimiento activo al entrar en pausa. Aplicar una política equivalente al cambiar `sinMovimiento` o perder el desborde.
- **Introducido por:** este cambio.

El mismo recorrido deja viva la animación si cambia `sinMovimiento` o `desborda`; el callback existente conserva su destino anterior.

### T-005-D03 — Sin pilotos se consultan igualmente todos los miembros activos

- **Severidad / Prioridad:** S2 / P2.
- **Área:** datos / rendimiento.
- **Ubicación:** `app/(sitio)/page.tsx:117`; `lib/datos.ts:81`.
- **Pasos / condición:** sección equipo activa, miembros activos únicamente socios/técnicos.
- **Esperado:** CA-10: omitir el bloque y no consultar miembros de más.
- **Obtenido:** se recuperan todos los miembros activos, incluyendo biografía, palmarés y récords, y recién después se descartan.
- **Evidencia:** consulta sin filtro por rol en `lib/datos.ts:87`; columnas en `:62`; filtro posterior en `page.tsx:128`.
- **Sugerencia:** filtrar pilotos en la consulta destinada a la portada. Comprobar si hay pilotos puede requerir una consulta; no requiere cargar los miembros excluidos y sus relaciones.
- **Introducido por:** este cambio, mediante el nuevo uso de `getMiembros()`.

Esto no invalida CA-11: los datos adicionales llegan al servidor, pero la proyección evita pasarlos al carrusel cliente.

### T-005-D04 — Los últimos puntos no pueden convertirse en el indicador activo en escritorio

- **Severidad / Prioridad:** S3 / P2.
- **Área:** UI / accesibilidad.
- **Ubicación:** `lib/carrusel.ts:77`; `app/(sitio)/_componentes/CarruselEquipo.tsx:230`.
- **Pasos / condición:** ocho tarjetas, tres visibles; pulsar el último punto o retroceder desde el principio.
- **Esperado:** indicador coherente con el destino elegido y con el comportamiento descrito en `docs/pm/tareas/T-005/validar.md:54`.
- **Obtenido:** el último punto solicita un inicio inalcanzable; el índice sigue representando una tarjeta anterior y el último punto nunca obtiene `aria-current=true`.
- **Evidencia:** caso geométrico compatible con el CSS: viewport 1200, tarjetas 384, gap 24; inicios `0,408,…,2856`, máximo 2040. Ejecución real: `indiceActivo(2040,inicios) → 5`, no 7. El punto solicita el inicio sin recortarlo (`CarruselEquipo.tsx:235`).
- **Sugerencia:** definir indicadores por destinos alcanzables o una política explícita para tarjetas que comparten el destino final; alinear cálculo y controles.
- **Introducido por:** este cambio.

### T-005-D05 — Los puntos tienen 24 px de ancho, no un objetivo táctil de 44 px

- **Severidad / Prioridad:** S3 / P2.
- **Área:** accesibilidad.
- **Ubicación:** `app/(sitio)/_componentes/carrusel-equipo.module.css:208`.
- **Pasos / condición:** inspeccionar cualquier botón de punto.
- **Esperado:** objetivo táctil de 44 px indicado en el checklist de QA.
- **Obtenido:** `width:24px; height:44px; padding:0`.
- **Evidencia:** reglas `:210` a `:215`; el comentario afirma 44 px, pero el ancho declarado es 24. La separación entre botones no aumenta el área pulsable.
- **Sugerencia:** asegurar 44×44 px efectivos y adaptar la distribución a pantallas estrechas.
- **Introducido por:** este cambio.

### T-005-D06 — Falta una prueba de regresión funcional para D00

- **Severidad / Prioridad:** S3 / P1.
- **Área:** testware.
- **Ubicación:** `tests/unidad/carrusel.test.ts:2`.
- **Pasos / condición:** conservar los helpers y sustituir la integración RAF por el comportamiento anterior.
- **Esperado:** invariante de `docs/pm/contexto.md`: todo bug arreglado lleva una prueba que falla sin el fix.
- **Obtenido:** los tests siguen comprobando las mismas funciones, sin observar el carrusel.
- **Evidencia:** búsqueda `rg` en `tests` encuentra únicamente las referencias al helper; ninguna prueba monta `CarruselEquipo` ni observa movimiento por temporizador. La entrega también reconoce esta ausencia.
- **Sugerencia:** prueba en navegador local que espere el temporizador y verifique cambio efectivo de `scrollLeft`, avance unitario y vuelta. Demostrar que falla con la implementación anterior.
- **Introducido por:** este cambio.

La prioridad bloqueante responde al invariante incumplido y a la regresión ya entregada; la severidad sigue siendo S3 por tratarse de testware.

## Riesgos y preguntas (sin evidencia suficiente para defecto)

- **RAF frente a `scroll-snap`:** hay asignaciones de `scrollLeft` por cuadro y `scroll-snap-type:x mandatory` (`CarruselEquipo.tsx:81`; CSS `:22`). Falta comprobar avance real, suavidad y gesto táctil durante la animación. No doy D00 por corregido mediante tests aritméticos.
- **Scroll pasado del máximo:** `proximaPosicion(700,[0,320,640],300,-1)` devuelve 640. Falta comprobar si overscroll o resize producen una entrada equivalente en los navegadores soportados.
- **Foco de ventana:** `onBlurCapture` no distingue destino ni consulta `relatedTarget` (`CarruselEquipo.tsx:148`). No hay evidencia de pausa permanente; probar cambio de ventana y regreso con foco interno.
- **Semántica accesible:** el contenedor tiene `aria-roledescription` y etiqueta, pero no un rol explícito (`:141`). Verificar exposición en el árbol accesible. Los botones sí tienen etiquetas; D04 afecta `aria-current`.
- **Imágenes fallidas:** `onError` agrega IDs sin deduplicar (`:170`), pero el siguiente render sustituye la imagen (`:157`). No hay evidencia de crecimiento ilimitado con miembros estables. Probar eventos repetidos y reemplazar una URL fallida manteniendo el mismo ID.
- **`offsetParent`:** la pista tiene `position:relative`, que sustenta el uso actual de `offsetLeft` (CSS `:11`). Eliminarlo puede cambiar el sistema de coordenadas; falta una prueba que proteja esa dependencia.
- **Imágenes y Next 16:** `fill` tiene padre posicionado y `sizes` por breakpoint; coincide con la guía local `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md:115`. La selección óptima de resolución requiere medir el ancho real.
- **Hidratación:** estados iniciales constantes; `window`, medición y `performance.now()` quedan fuera del render inicial (`CarruselEquipo.tsx:45`, `:77`, `:110`). No se identificó divergencia estática.
- **Checklist del proyecto:** no hay rutas ni hosts nuevos; no cambia RLS ni schema. Se conserva `revalidate=60` en `app/(sitio)/layout.tsx:9`. Los errores de consulta se registran y retornan fallback en `lib/supabase.ts:48`; no hay evidencia de errores tragados sin registro.
- **Documentación:** `docs/pm/tablero.md:15` indica ronda 2/PR abierto, mientras brief y entrega indican ronda 1/lista para QA. Aclarar la distinción entre iteración de implementación y ronda de QA.

## Pruebas a ejecutar por el PM

Todas sobre **entorno local aislado, datos sintéticos y sin conexiones a producción**:

- `npx next typegen && npx tsc --noEmit && npm run lint && npm test` tras corregir. No repetí herramientas que requieren escritura.
- En navegador, esperar 5 segundos sin interacción: avanzar exactamente una tarjeta y completar un ciclo hasta volver al principio. Repetir con la implementación anterior para demostrar sensibilidad a D00.
- Combinar foco dentro/fuera y puntero dentro/fuera; entrar durante los 450 ms de animación. Solo reanudar cuando desaparezcan ambas condiciones.
- Abrir con movimiento reducido y activarlo durante un paso; comprobar ausencia de autoplay y controles instantáneos.
- Montar/desmontar bajo StrictMode y redimensionar durante un paso; instrumentar intervalos y RAF para detectar callbacks residuales.
- Probar 0, 1, 2 y 8 tarjetas a ambos lados de 768 y 1024 px; verificar desborde, controles, extremos e indicadores.
- Arrastrar durante una animación, usar rueda y pulsar controles rápidamente; comprobar que el movimiento programado no lucha con la interacción.
- Medir puntos y flechas en móvil; inspeccionar árbol accesible y cambios de foco entre ventanas.
- Con sección apagada y con sección activa sin pilotos, observar consultas locales; inspeccionar HTML/RSC para confirmar que no incluye palmarés.
- Simular foto ausente, error de carga y cambio de URL conservando ID; comprobar fallback y recuperación.