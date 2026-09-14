# Tareas

Una carpeta por tarea, creada por `docs/pm/scripts/nueva-tarea.sh` **en la rama
de la tarea** (no acá). Se mergea junto con el código para dejar trazabilidad.

```
T-NNN/
├── brief-dev.md          PM → dev
├── brief-qa.md           PM → QA
├── entrega-dev.md        dev (se reescribe en cada ronda)
├── gate-r1.txt           qa-codex.sh
├── reporte-qa-r1.md      Codex
├── gate-r2.txt ...       rondas de fix
└── reporte-qa-r2.md
```

IDs correlativos: el siguiente es el mayor `T-NNN` del tablero + 1.
