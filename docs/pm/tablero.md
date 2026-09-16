# Tablero

Estados: `BORRADOR` · `LISTA` · `EN DEV` · `EN GATE` · `EN QA` · `FIX` ·
`APROBADA` · `PR ABIERTO` · `CERRADA` · `BLOQUEADA`

Lo actualiza solo el PM. Una fila por tarea; el detalle vive en
`docs/pm/tareas/T-NNN/` de la rama de cada tarea.

| ID | Título | Rama | Estado | Ronda | Veredicto QA | Migración | Depende de | PR | Notas |
| -- | ------ | ---- | ------ | ----- | ------------ | --------- | ---------- | -- | ----- |
| T-001 | Tabla de récords, tipos y lectura pública | `oliver132123/records-schema` | EN DEV | 1 | — | **0013** | Base local `oliver132123/integracion-records` (#2 + #3 + #4); rebase al entrar a main | — | Épica récords. NO-GO de deploy hasta `db push` de 0012 y 0013 |
| T-002 | Récords de los miembros en el panel | `oliver132123/records-panel` | BLOQUEADA | — | — | No | T-001 | — | Paralela a T-003 |
| T-003 | Récords en la página del piloto y la tarjeta | `oliver132123/records-sitio` | BLOQUEADA | — | — | No | T-001 | — | Paralela a T-002 |
| T-004 | Récords del equipo: panel y «Sobre nosotros» | `oliver132123/records-equipo` | BLOQUEADA | — | — | No | T-001, T-002, T-003 | — | Prioridad baja: cuando exista el primer récord del equipo |
