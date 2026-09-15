# Tablero

Estados: `BORRADOR` · `LISTA` · `EN DEV` · `EN GATE` · `EN QA` · `FIX` ·
`APROBADA` · `PR ABIERTO` · `CERRADA` · `BLOQUEADA`

Lo actualiza solo el PM. Una fila por tarea; el detalle vive en
`docs/pm/tareas/T-NNN/` de la rama de cada tarea.

| ID | Título | Rama | Estado | Ronda | Veredicto QA | Migración | Depende de | PR | Notas |
| -- | ------ | ---- | ------ | ----- | ------------ | --------- | ---------- | -- | ----- |
| T-001 | Tabla de récords, tipos y lectura pública | `oliver132123/records-schema` | BLOQUEADA | — | — | **0013** | PR #1, PR #2 (+0012 aplicada), kit PM | — | Épica récords. NO-GO de deploy hasta `db push` |
| T-002 | Récords en el panel | `oliver132123/records-panel` | BLOQUEADA | — | — | No | T-001 | — | Paralela a T-003 |
| T-003 | Récords en la página del piloto y la tarjeta | `oliver132123/records-sitio` | BLOQUEADA | — | — | No | T-001 | — | Paralela a T-002 |
