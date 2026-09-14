# Prompts de lanzamiento

Reemplazar `<...>`. El brief es la fuente de verdad; el prompt solo apunta a él
y repite las reglas que más se rompen.

## Dev — subagente Claude (herramienta Agent, `subagent_type: general-purpose`)

No usar `isolation: "worktree"`: el worktree ya lo creó `nueva-tarea.sh` y
tiene la carpeta de la tarea. Dos worktrees para la misma tarea = trabajo perdido.

```text
Sos el desarrollador de la tarea T-NNN del proyecto La Infantería Motorsport.

Worktree asignado (trabajás SOLO acá, con rutas absolutas): <WT>
Rama: oliver132123/<slug>

1. Leé enteros, en este orden:
   <WT>/docs/pm/contexto.md
   <WT>/docs/pm/tareas/T-NNN/brief-dev.md
2. Verificá `git -C <WT> branch --show-current` = oliver132123/<slug>. Si no coincide, pará y reportalo.
3. Implementá solo lo del brief, con sus tests. Commits convencionales, archivos stageados por nombre.
4. Corré en <WT>: npx next typegen && npx tsc --noEmit && npm run lint && npm test. Todo verde.
5. Escribí <WT>/docs/pm/tareas/T-NNN/entrega-dev.md con el formato del brief y commiteala.

Prohibido: git push, gh pr, supabase db push, tocar .env*, git add -A, git stash, salir del worktree.
Si el brief es ambiguo o contradice contexto.md: no adivines. Entrega con Estado BLOQUEADA y la pregunta.

Tu respuesta final: el Estado, los commits (git log --oneline) y los totales reales de tsc/lint/test.
```

### Ronda de fix

Mismo prompt, cambiando el paso 3 por:

```text
3. Esta es la ronda N. Leé <WT>/docs/pm/tareas/T-NNN/reporte-qa-r<N-1>.md.
   Corregí SOLO los defectos de la sección 6 del brief. Cada fix lleva un test que falla sin él.
   Reescribí entrega-dev.md como "ronda N" con una tabla defecto → fix → test.
```

## QA — Codex

Siempre por el script: corre el gate, lanza Codex con sandbox read-only y
commitea `gate-rN.txt` + `reporte-qa-rN.md` en la rama de la tarea (así el dev
de la ronda siguiente los tiene y el worktree queda limpio). Si el gate falla,
commitea solo el gate y no lanza Codex.

```bash
docs/pm/scripts/qa-codex.sh <WT> T-NNN <N>
```

Si Codex corta (cuota de uso, red, Ctrl+C) el script sale con error y apunta al
log; se reintenta **la misma ronda** con el mismo comando — el gate a medio
escribir de esa ronda no bloquea.

Equivalente manual, si hiciera falta:

```bash
codex exec -C <WT> -s read-only \
  -o <WT>/docs/pm/tareas/T-NNN/reporte-qa-r<N>.md \
  - < <WT>/docs/pm/tareas/T-NNN/brief-qa.md
# el prompt SIEMPRE por stdin: con stdin abierto y el prompt como argumento, codex se cuelga
```

## PM — sesión de Claude Code haciendo de PM

```text
Hacé de PM siguiendo docs/pm/README.md. Tarea: <descripción en una línea>.
1. Proponeme el corte (una o varias tareas, dependencias, qué va en paralelo) antes de crear nada.
2. Con mi OK: nueva-tarea.sh, completá brief-dev y brief-qa, actualizá tablero.md.
3. Lanzá el dev, corré el gate, lanzá QA, iterá hasta PASS o 3 rondas.
4. No hagas push ni PR sin mostrarme el reporte final de QA.
```
