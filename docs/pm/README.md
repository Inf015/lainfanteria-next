# Kit de PM — desarrollo con agentes

Proceso para repartir trabajo entre **subagentes de Claude** (implementan) y
**subagentes de Codex** (QA independiente, ISTQB, read-only), coordinados por
un PM (Oliver o una sesión de Claude Code haciendo de PM).

| Archivo | Para quién | Qué es |
| ------- | ---------- | ------ |
| [`contexto.md`](contexto.md) | todos los agentes | Reglas duras e invariantes del proyecto. Todo brief lo referencia |
| [`tablero.md`](tablero.md) | PM | Estado de cada tarea |
| [`plantillas/brief-dev.md`](plantillas/brief-dev.md) | Claude (dev) | Qué construir, criterios de aceptación, formato de entrega |
| [`plantillas/brief-qa.md`](plantillas/brief-qa.md) | Codex (QA) | Qué verificar, técnicas ISTQB, formato del reporte |
| [`plantillas/prompts.md`](plantillas/prompts.md) | PM | Prompts de lanzamiento listos para copiar |
| [`scripts/nueva-tarea.sh`](scripts/nueva-tarea.sh) | PM | Crea worktree + rama + carpeta de la tarea con las plantillas |
| [`scripts/qa-codex.sh`](scripts/qa-codex.sh) | PM | Lanza Codex read-only sobre el worktree y guarda el reporte |

## Roles

| Rol | Quién | Puede | No puede |
| --- | ----- | ----- | -------- |
| **PM** | Oliver / Claude Code principal | Escribir briefs, crear worktrees, correr el gate, push, abrir PR | Implementar la tarea que después va a QA (rompe la independencia) |
| **Dev** | Subagente Claude | Editar código y tests **dentro de su worktree**, commitear en su rama | Push, PR, `supabase db push`, tocar `.env*`, salirse del alcance |
| **QA** | Codex `exec -s read-only` | Leer código, correr lo que el sandbox permita, emitir veredicto y defectos | Modificar archivos, arreglar defectos, ver el razonamiento del dev (solo el diff y la entrega) |
| **Dueño** | Oliver | Aprobar merge, aplicar migraciones, validar en producción | — |

## Flujo por tarea

```
 PM                         Dev (Claude)                QA (Codex)              Oliver
 ──                         ────────────                ──────────              ──────
 1. nueva-tarea.sh ──► worktree + rama + docs/pm/tareas/T-NNN/
 2. completa brief-dev.md
    y brief-qa.md (criterios)
 3. lanza dev ───────────► 4. lee contexto + brief
                              implementa + tests
                              suite verde
                              commits en su rama
                              escribe entrega-dev.md
 5. gate PM ◄─────────────────┘
    (rama correcta, tsc,
     lint, npm test, diff
     solo en alcance)
 6. qa-codex.sh ─────────────────────────────────► 7. QA ISTQB sobre
                                                      git diff base...HEAD
                                                      reporte-qa-rN.md
 8. lee veredicto ◄──────────────────────────────────┘
    (el script commitea gate-rN.txt
     y reporte-qa-rN.md en la rama)
    │
    ├─ FAIL ──► brief de fix (defectos) ──► vuelve a 3  (ronda N+1: confirmation + regression)
    │
    └─ PASS / PASS-WITH-RESERVATIONS
         9. push + PR (plantilla abajo) ─────────────────────────────────► 10. revisa, aplica
                                                                               migraciones, merge
                                                                               (merge = deploy)
                                                                          11. test:humo prod
```

### Estados (columna del tablero)

`BORRADOR` → `LISTA` (brief completo) → `EN DEV` → `EN GATE` → `EN QA` →
`FIX` (vuelve a EN DEV) → `APROBADA` → `PR ABIERTO` → `CERRADA`.
`BLOQUEADA` en cualquier punto, con el motivo.

### Límite de rondas

Máximo **3 rondas** dev↔QA. Si en la tercera sigue en FAIL, la tarea vuelve al
PM: casi siempre el brief estaba mal cortado o el alcance era demasiado grande.

## Reglas de coordinación

1. **Un worktree por agente dev, siempre.** Nunca dos agentes sobre el mismo
   directorio. `scripts/nueva-tarea.sh` lo crea; el dev verifica
   `git branch --show-current` antes de cada commit.
2. **Tareas paralelas solo si no comparten archivos.** Antes de lanzar dos
   devs en paralelo, el PM compara la sección *Archivos probables* de ambos
   briefs. Si se pisan → secuenciales, o la segunda se apila (`--base`).
3. **Tareas con migración van solas.** Dos migraciones en paralelo chocan en
   el número (`00NN_`) y en el orden de aplicación.
4. **QA nunca recibe la conversación del dev**, solo: brief, diff y
   `entrega-dev.md`. Independencia real, no nominal.
5. **El PM no confía en la entrega:** re-ejecuta el gate él mismo y pega
   salida real en el tablero/PR.
6. **Toda duda del dev se escala, no se adivina.** El dev deja la pregunta en
   `entrega-dev.md` con estado `BLOQUEADA` y termina.

## Gate del PM (antes de mandar a QA y antes del PR)

```bash
cd <worktree>
git branch --show-current            # = rama del brief
git status --short                   # limpio (todo commiteado)
git log --oneline <base>..HEAD       # commits convencionales, un tema
git diff --stat <base>...HEAD        # solo archivos dentro del alcance
npx next typegen && npx tsc --noEmit
npm run lint
npm test
```

Antes del PR, además (necesitan `.env.local` y red):

```bash
npm run test:seguridad
SITIO=http://localhost:3000 npm run test:humo   # con `npm run build && npm start` en otra terminal
```

## Plantilla de PR

```markdown
## Resumen
<qué y por qué, 2-3 líneas> — Tarea T-NNN

## Cambios
- ...

## Verificación
- Gate PM: tsc ✅ lint ✅ unidad N/N ✅ seguridad N/N ✅ humo N/N ✅  (salida en docs/pm/tareas/T-NNN/)
- QA Codex: <veredicto> en ronda N — `docs/pm/tareas/T-NNN/reporte-qa-rN.md`

## Migraciones
Ninguna. | ⚠️ `00NN_xxx.sql` — **NO-GO de deploy hasta `npx supabase db push`**. Orden: migración → merge.

## Reservas / follow-ups
- ...
```
