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
| T-004 | Récords del equipo: panel y «Sobre nosotros» | `oliver132123/records-equipo` | LISTA | — | — | No | T-001, T-002, T-003 (mergeadas) | — | Prioridad baja: cuando exista el primer récord del equipo |
| T-005 | Carrusel del equipo en la portada | `Inf015/oliver132123-carrusel-equipo` | PR ABIERTO | — | Sin QA: la implementó el PM | No | T-003 (mergeada) | — | La rotación y los controles los valida Oliver: el navegador del PM no anima el desplazamiento suave sin foco (`docs/pm/tareas/T-005/validar.md`) |
