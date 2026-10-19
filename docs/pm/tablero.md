# Tablero

Estados: `BORRADOR` · `LISTA` · `EN DEV` · `EN GATE` · `EN QA` · `FIX` ·
`APROBADA` · `PR ABIERTO` · `CERRADA` · `BLOQUEADA`

Lo actualiza solo el PM. Una fila por tarea; el detalle vive en
`docs/pm/tareas/T-NNN/` de la rama de cada tarea.

| ID | Título | Rama | Estado | Ronda | Veredicto QA | Migración | Depende de | PR | Notas |
| -- | ------ | ---- | ------ | ----- | ------------ | --------- | ---------- | -- | ----- |
| T-001 | Tabla de récords, tipos y lectura pública | `oliver132123/records-schema` | CERRADA | 3 | PASS-WITH-RESERVATIONS | **0013** (aplicada en producción) | — | #6 | Follow-up: T-001-D04 (documental, P3) |
| T-002 | Récords de los miembros en el panel | `oliver132123/records-panel` | CERRADA | 3 | FAIL en r1 → corregido y verificado por el PM | No | T-001 | #7 | Falta la confirmación final de QA (cuota de Codex) |
| T-003 | Récords en la página del piloto y la tarjeta | `oliver132123/records-sitio` | CERRADA | 1 | FAIL por criterio; CA-1 enmendado por Oliver | No | T-001 | #8 | Falta la confirmación de QA sobre el criterio enmendado |
| T-004 | Récords del equipo: panel y «Sobre nosotros» | `oliver132123/records-equipo` | CERRADA | 2 | r1 FAIL (3 S3) → r2: D01 y D02 corregidos; D03 cerrado por la validación manual de Oliver | No | T-001, T-002, T-003 (mergeadas) | #14 | Cierra la épica de récords. D03 era evidencia faltante, no un fallo: CA-2, CA-3 y CA-8 sin probar con datos. Oliver los probó a mano. D02 sigue sin prueba automatizada (el repo no monta componentes de React) |
| T-005 | Carrusel de pilotos en la portada | `Inf015/oliver132123-carrusel-equipo` | CERRADA | 2 | r1 FAIL (6) → r2: D01–D05 FIXED, D06 abierto | No | T-003 | #10 | La implementó el PM, sin dev independiente — y se entregó una vez sin rotar. D06 lo cierra T-006; el salto que descubrieron sus pruebas lo corrige T-007 |
| T-006 | Pruebas de navegador con Playwright | `oliver132123/pruebas-navegador` | CERRADA | 5 | r1 FAIL (5) → r2 FAIL (2) → r3 FAIL (1) → r4 FAIL (1) → r5 sin correr (cuota de Codex) | No | T-005 | #11 | Todos los defectos de QA fueron de la misma clase: pruebas que no podían fallar. La r5 cerró la familia entera, no la instancia. Cinco rondas sobre un máximo de tres: dos son del PM, por cortar el brief por instancia |
| T-007 | El carrusel salta en vez de deslizarse | `oliver132123/carrusel-sin-salto` | CERRADA | 2 | r1 FAIL (2 P1) → r2 PASS-WITH-RESERVATIONS | No | T-006 (la incluye por merge) | — | `scroll-snap-type` reajustaba cada posición intermedia: la animación no se veía. Medido por el PM cuadro a cuadro, antes y después. CA-5 se enmendó: el criterio original contradecía la accesibilidad |
| T-011 | Reordenar las fotos de una galería | `oliver132123/fotos-orden` | EN DEV | 1 | — | **0014** (`reordenar_fotos`) | — | — | Carril estricto. La primera foto es la principal; corrige que borrar la principal dejara la galería sin principal. ⚠️ La épica de Instagram (PR #16) también reservó 0014: Oliver pidió dejarla de lado por ahora, se renumera cuando se retome |
| T-012 | Vista previa del auto en el panel | `oliver132123/autos-vista-previa` | EN DEV | 1 | — | No | — (en paralelo con T-011, sin archivos compartidos) | — | Carril normal. Extrae tarjeta y detalle de `AutosGrid` para reusarlos en el panel |
