# Épica — Récords

> Pedido de Oliver (2026-09-15): «añadir en la sección de pilotos un apartado de
> logros/récords, ya que tenemos varios que tienen récords nacionales y logros
> increíbles». Y después: «también hay récords que no tienen que ver con autos».

## Qué ya existe y qué falta

| Ya existe | Falta |
| --------- | ----- |
| Tabla `logros` (0011): **puestos** — campeón, 1.º/2.º/3.º, puntuable/evento/campeonato, con foto del trofeo | Dónde guardar una **marca** (9.874 s en 1/4 de milla) o un **hito** sin cifra («Primer dominicano en…») |
| «Galería de trofeos» en `/equipo/<slug>` y destacados en la tarjeta | Distinguir un récord **vigente** de uno **superado** |
| Panel: modal de palmarés por miembro | Récords **del equipo**, que no son de ninguna persona |

Un récord no es un trofeo con otro nombre: lo que se muestra es la **cifra** o la
**frase**, no el puesto. Meterlo en `logros` obligaría a esconder la cifra dentro
del título.

## Decisiones tomadas (Oliver, 2026-09-15)

1. **Tabla propia `records`**.
2. **Dos tipos:** **marca** (cifra + unidad: tiempo o velocidad) e **hito** (solo
   texto: «primer dominicano en…», «piloto más joven en…»).
3. **Dos dueños:** un miembro, o el equipo (`miembro_id` nulo).
4. **Dónde se ven los de un miembro:** su página (`/equipo/<slug>`) y un
   distintivo en su tarjeta de `/equipo`. No van en la home ni en `/records`.
5. **Orden:** se arranca cuando estén mergeados PR #1, PR #2 (con la 0012
   aplicada) y el kit de PM. La migración nueva es la **0013**.

## Decisiones de PM (cuestionables — decirlo antes de lanzar T-001)

| Decisión | Por qué | Alternativa descartada |
| -------- | ------- | ---------------------- |
| **Los récords del equipo se ven en `/equipo`, en un bloque arriba de la grilla** | Es la «sección de pilotos» del pedido y el único lugar donde el equipo ya se presenta | `/nosotros`, la home o una página `/records` |
| Un solo campo `titulo` para los dos tipos: en una marca es la disciplina, en un hito es la frase | La tarjeta de un hito *es* su frase; dos campos obligarían a partirla | `disciplina` + `descripcion` |
| CHECK en la base: marca ⇒ valor y unidad; hito ⇒ sin valor ni unidad | Un hito con cifra es una marca mal cargada; que lo frene la base, no solo el panel | Validar solo en el panel |
| Un hito nacional vigente **cuenta** como «récord nacional» en la tarjeta y la cifra | Para quien mira, «primer dominicano en…» pesa igual o más que una marca | Contar solo marcas |
| Unidades: `segundos`, `km_h`, `mph` (enum) | Cubre drag, 1/4 de milla, roll race y velocidad punta. Lo que no tiene cifra es un hito | Texto libre: imposible formatear bien |
| Alcance: `nacional`, `pista`, `evento` (enum) | Lo que Oliver describió. Agregar un valor a un enum después es una línea | Incluir `internacional` sin que nadie lo pidiera |
| `auto` y `lugar` como texto libre | `autos` es el inventario **en venta**; el auto del récord casi nunca está ahí | FK a `autos` |
| «Superado» es un booleano, sin enlazar qué récord lo superó | Lo que se muestra es VIGENTE / SUPERADO | `superado_por` con FK a sí misma |
| `fuente_url` opcional (video, acta de la federación) | Un récord nacional sin fuente se discute; con link, no | — |
| Sin foto del récord | Evita tocar Storage y su limpieza | Foto por récord |
| Récords de miembros inactivos no son públicos; los del equipo, siempre | Mismo criterio que `logros` | — |
| Los del equipo se cargan desde el panel de miembros, en el mismo modal | Cero rutas nuevas en el panel | `/admin/records` |

## Tareas

```
                     ┌──────────────────────────────┐
  PR #1 ─► PR #2 ─►  │ T-001  records-schema        │  migración 0013, tipos,
  kit PM ─────────►  │ (sola: lleva migración)      │  lib/records.ts, datos.ts, RLS
                     └──────────────┬───────────────┘
                                    │  apiladas sobre la rama de T-001
                     ┌──────────────┴───────────────┐
                     ▼                              ▼
        ┌────────────────────────┐    ┌────────────────────────────────┐
        │ T-002  records-panel   │    │ T-003  records-sitio           │
        │ panel: CRUD en modal,  │    │ /equipo/<slug>, tarjeta y      │
        │ miembro y equipo       │    │ bloque del equipo en /equipo   │
        └────────────────────────┘    └────────────────────────────────┘
                 EN PARALELO: no comparten archivos
```

| ID | Rama | Base | Migración | Archivos (no se pisan entre T-002 y T-003) |
| -- | ---- | ---- | --------- | ------------------------------------------ |
| T-001 | `oliver132123/records-schema` | `origin/main` | **0013** | `supabase/migrations/0013_records.sql`, `lib/types.ts`, `lib/records.ts`, `lib/palmares.ts` (solo firma de `fechaLogro`), `lib/datos.ts`, `tests/unidad/records.test.ts`, `tests/seguridad/rls.test.ts` |
| T-002 | `oliver132123/records-panel` | `oliver132123/records-schema` | No | `app/(admin)/(panel)/admin/miembros/{page,MiembrosAdmin,RecordsModal}.tsx`, `lib/records-form.ts`, `tests/unidad/records-form.test.ts` |
| T-003 | `oliver132123/records-sitio` | `oliver132123/records-schema` | No | `app/(sitio)/equipo/_componentes/*`, `app/(sitio)/equipo/{page,MiembroCard}.tsx`, `equipo.module.css`, `app/(sitio)/equipo/[slug]/{page.tsx,miembro.module.css}` |

## Arranque (cuando se cumplan las dependencias)

```bash
docs/pm/scripts/nueva-tarea.sh T-001 records-schema --desde docs/pm/backlog/T-001
# ... T-001 aprobada por QA:
docs/pm/scripts/nueva-tarea.sh T-002 records-panel --base oliver132123/records-schema --desde docs/pm/backlog/T-002
docs/pm/scripts/nueva-tarea.sh T-003 records-sitio --base oliver132123/records-schema --desde docs/pm/backlog/T-003
```

## ⚠️ Orden de deploy (NO-GO si se invierte)

`getMiembros()` y `getMiembro()` pasan a pedir `records(*)`. Si ese código llega
a producción **antes** de que exista la tabla, la consulta entera falla,
`consultar()` cae al respaldo `[]` y **`/equipo` sale vacío**, sin error visible.

1. PRs de T-001, T-002 y T-003 aprobados (se pueden mergear juntos o T-001 sola).
2. Oliver: `npx supabase db push` (aplica 0013).
3. `npm run test:seguridad` contra producción — verde.
4. Merge de T-001 → deploy → `npm run test:humo`.
5. Merge de T-002 y T-003 (rebase sobre `main` si T-001 ya entró).
6. Oliver carga los récords reales desde el panel y valida en producción.

## Hallazgos fuera de alcance (anotados, no planificados)

- `tests/seguridad/rls.test.ts` **no incluye la tabla `logros`** en `TABLAS`: nada
  prueba hoy que `anon` no pueda escribir el palmarés. Mismo patrón que T-001
  agrega para `records`; conviene una tarea chica aparte.
