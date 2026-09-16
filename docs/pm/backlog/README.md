# Backlog

Tareas con brief escrito que todavía no se pueden arrancar (dependen de un merge,
de una decisión o de otra tarea). Una carpeta `T-NNN/` con `brief-dev.md` y
`brief-qa.md`; las épicas, en `EPICA-<tema>.md`.

Para arrancar una:

```bash
docs/pm/scripts/nueva-tarea.sh T-NNN <slug> [--base <ref>] --desde docs/pm/backlog/T-NNN
```

El script copia los briefs a `docs/pm/tareas/T-NNN/` en la rama nueva y rellena
worktree y base. Después, en la rama de la tarea, borrar `docs/pm/backlog/T-NNN/`
en el primer commit (`git rm -r`) para que no queden dos copias.
