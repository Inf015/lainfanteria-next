# T-NNN — <título corto>

<!-- PM: completar todo lo que está entre <>. Borrar los comentarios antes de lanzar. -->

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/<slug>` |
| Worktree | `<ruta absoluta>` |
| Base | `origin/main` <!-- o la rama sobre la que se apila --> |
| Tipo | feat / fix / test / refactor / docs / chore |
| Migración | No / **Sí** — `00NN_<nombre>.sql` |
| Ronda | 1 <!-- en rondas de fix: N y link al reporte-qa-r(N-1).md --> |

**Antes de empezar leé `docs/pm/contexto.md` entero.** Sus reglas ganan sobre
este brief.

## 1. Por qué

<El problema o la necesidad, en 2-5 líneas. Qué pasa hoy, qué debería pasar,
a quién le importa.>

## 2. Alcance

**Dentro:**
- <cambio concreto>

**Fuera (no tocar aunque parezca relacionado):**
- <cosa tentadora que NO es parte de esta tarea>

## 3. Archivos probables

<!-- El PM los usa para decidir paralelismo. El dev puede tocar otros si hace
falta, pero lo justifica en la entrega. -->
- `app/...`
- `lib/...`
- `tests/unidad/...`

## 4. Criterios de aceptación

<!-- Verificables, uno por comportamiento. QA traza cada uno. Incluir los
casos borde y los de error, no solo el camino feliz. -->

- **CA-1** — Dado <estado>, cuando <acción>, entonces <resultado observable>.
- **CA-2** — Dado <...>, cuando <entrada inválida>, entonces <rechazo concreto>.
- **CA-3** — <invariante que no se puede romper, p. ej. anon sigue sin poder escribir>.

## 5. Pruebas requeridas

- [ ] Unidad: <qué función / qué casos>
- [ ] Seguridad: <si toca RLS/tablas/RPC — qué debe rechazar con 42501>
- [ ] Humo: <si agrega ruta o cambia cabeceras>
- [ ] Contra Supabase local: <solo si hay escrituras reales que probar; si no, borrar>

## 6. Defectos a corregir (solo rondas de fix)

<!-- Copiar de reporte-qa-r(N-1).md los defectos a arreglar en esta ronda. -->

| ID | Sev | Resumen | Esperado |
| -- | --- | ------- | -------- |

## 7. Definición de hecho

- [ ] Todos los CA cumplidos, cada uno con su test o evidencia
- [ ] `npx next typegen && npx tsc --noEmit` limpio
- [ ] `npm run lint` limpio
- [ ] `npm test` verde
- [ ] Commits convencionales, archivos stageados por nombre, en la rama correcta
- [ ] Working tree limpio (`git status --short` vacío)
- [ ] `entrega-dev.md` escrita en esta carpeta y commiteada
- [ ] Sin push, sin PR, sin `db push`

---

## Formato de `entrega-dev.md`

Escribirla en `docs/pm/tareas/T-NNN/entrega-dev.md`. Es lo único que el PM y
QA van a leer de tu trabajo además del diff: sé preciso, sin marketing.

```markdown
# Entrega T-NNN — ronda N

**Estado:** LISTA PARA QA | BLOQUEADA

## Qué hice
- <cambio> — `archivo:línea`

## Trazabilidad
| CA | Cómo se cumple | Test / evidencia |
| -- | -------------- | ---------------- |
| CA-1 | ... | `tests/unidad/x.test.ts` › "describe › it" |

## Commits
<salida de `git log --oneline <base>..HEAD`>

## Verificación (salida real, recortada)
<salida de tsc, lint y npm test — las últimas líneas con los totales>

## Migraciones
Ninguna | `00NN_x.sql` — REQUIERE db push antes de desplegar. Qué hace y cómo revertir.

## Decisiones tomadas
- <decisión> — porque <razón>; alternativa descartada: <...>

## Fuera de alcance que vi (no tocado)
- <hallazgo> — `archivo:línea`

## Preguntas / bloqueos
- <si Estado = BLOQUEADA: qué necesitás decidido para seguir>
```
