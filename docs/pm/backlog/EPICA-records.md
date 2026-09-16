# Épica — Récords

> Pedido de Oliver (2026-09-15): «añadir en la sección de pilotos un apartado de
> logros/récords, ya que tenemos varios que tienen récords nacionales y logros
> increíbles». Aclaraciones del mismo día: hay récords que no tienen que ver con
> autos; hay hitos que cuentan y otros que no; el tiempo y las millas, opcionales;
> del equipo todavía no hay, pero irían en «Sobre nosotros».

## Qué ya existe y qué falta

| Ya existe | Falta |
| --------- | ----- |
| Tabla `logros` (0011): **puestos** — campeón, 1.º/2.º/3.º, puntuable/evento/campeonato, con foto del trofeo | Dónde guardar un récord: **9.874 s @ 142.5 mph** en 1/4 de milla, o un hito sin cifras («Primer dominicano en…») |
| «Galería de trofeos» en `/equipo/<slug>` y destacados en la tarjeta | Decidir cuáles **suman** como récord nacional, y cuáles están **superados** |
| Panel: modal de palmarés por miembro | Récords **del equipo**, que no son de ninguna persona |

Un récord no es un trofeo con otro nombre: lo que se muestra es la **cifra** o la
**frase**, no el puesto.

## Modelo

```
records
  titulo            «1/4 de milla»  ó  «Primer dominicano en correr el Race of Champions»
  tiempo_s          9.874      ─┐ opcionales, independientes:
  velocidad         142.5       │ tiempo, velocidad, las dos, o ninguna (= hito)
  unidad_velocidad  mph        ─┘ (velocidad y unidad van juntas)
  alcance           nacional | pista | evento | NULL   ← solo nacional + vigente SUMA
  vigente           true | false
  miembro_id        id del miembro | NULL (= del equipo)
  categoria, auto, lugar, anio, mes, fuente_url
```

| Récord | Cómo se ve | ¿Suma como récord nacional? |
| ------ | ---------- | --------------------------- |
| 9.874 s @ 142.5 mph · alcance nacional · vigente | cifra grande + «RÉCORD NACIONAL» | Sí |
| 198 mph · alcance pista · vigente | cifra grande + «RÉCORD DE PISTA» | No |
| «Piloto más joven en ganar el nacional» · alcance nacional · vigente | frase + «RÉCORD NACIONAL» | Sí |
| «Primer dominicano en correr el ROC» · sin alcance · vigente | frase + «HITO» | No |
| cualquiera · superado | una línea en «Historial» | No |

## Decisiones tomadas (Oliver, 2026-09-15)

1. **Tabla propia `records`**.
2. **Tiempo y velocidad opcionales.** Sin ninguno de los dos, el récord es un hito.
3. **Hay hitos que cuentan y otros que no:** lo decide quien carga, récord por récord.
4. **Dónde se ven los de un miembro:** su página (`/equipo/<slug>`) y un distintivo en su tarjeta de `/equipo`.
5. **Récords del equipo:** todavía no hay; cuando haya, en **«Sobre nosotros»** (`/nosotros`).
6. **Orden:** se arranca cuando estén mergeados PR #1, PR #2 (con la 0012 aplicada) y el kit de PM (#3). La migración nueva es la **0013**.

## Decisiones de PM (cuestionables — decirlo antes de lanzar T-001)

| Decisión | Por qué | Alternativa descartada |
| -------- | ------- | ---------------------- |
| **«Cuenta» = `alcance` nacional**, y el alcance es opcional | Una sola fuente de verdad: la misma regla para récords con y sin cifras | Un booleano `cuenta` aparte, que podría contradecir al alcance |
| `alcance` **sin default** en la base, y el panel **obliga a elegirlo** (con opción «Ninguno — no suma») | Con default `nacional`, un hito cargado sin pensar inflaría el contador | Default `nacional` o `null` silencioso |
| Tiempo con 3 decimales y velocidad con hasta 2, en columnas separadas | Así se publican las marcas de drag (ET @ velocidad de trampa) | Un único `valor` + unidad, que no permite las dos a la vez |
| Velocidad en `mph` (por defecto) o `km_h` | Oliver habló de millas; km/h cuesta nada ahora y una migración después | Solo mph |
| **Récords del equipo: la base los admite ya (T-001), pantalla y panel después (T-004)** | Agregar `miembro_id` nulo después es otra migración; construir pantallas para datos que no existen, no | Todo ahora, o nada del equipo hasta que haya |
| Un solo campo `titulo`: disciplina si hay cifras, la frase si es hito | La ficha de un hito *es* su frase | `disciplina` + `descripcion` |
| `auto` y `lugar` como texto libre | `autos` es el inventario **en venta**; el auto del récord casi nunca está ahí | FK a `autos` |
| «Superado» es un booleano, sin enlazar qué récord lo superó | Lo que se muestra es VIGENTE / SUPERADO | `superado_por` con FK a sí misma |
| `fuente_url` opcional (video, acta de la federación) | Un récord nacional sin fuente se discute; con link, no | — |
| Sin foto del récord | Evita tocar Storage y su limpieza | Foto por récord |
| Récords de miembros inactivos no son públicos; los del equipo, siempre | Mismo criterio que `logros` | — |

## Tareas

```
                     ┌──────────────────────────────┐
  PR #1 ─► PR #2 ─►  │ T-001  records-schema        │  migración 0013, tipos,
  PR #3 (kit) ────►  │ (sola: lleva migración)      │  lib/records.ts, datos.ts, RLS
                     └──────────────┬───────────────┘
                                    │  apiladas sobre la rama de T-001
                     ┌──────────────┴───────────────┐
                     ▼                              ▼
        ┌────────────────────────┐    ┌────────────────────────────────┐
        │ T-002  records-panel   │    │ T-003  records-sitio           │
        │ panel: récords de cada │    │ /equipo/<slug> y distintivo    │
        │ miembro                │    │ en la tarjeta                  │
        └───────────┬────────────┘    └───────────────┬────────────────┘
                    │  EN PARALELO: no comparten archivos
                    └───────────────┬─────────────────┘
                                    ▼
                     ┌──────────────────────────────┐
                     │ T-004  records-equipo        │  PRIORIDAD BAJA: cuando exista
                     │ panel + /nosotros            │  el primer récord del equipo
                     └──────────────────────────────┘
```

| ID | Rama | Base | Migración | Archivos |
| -- | ---- | ---- | --------- | -------- |
| T-001 | `oliver132123/records-schema` | `origin/main` | **0013** | `supabase/migrations/0013_records.sql`, `lib/types.ts`, `lib/records.ts`, `lib/palmares.ts` (solo firma de `fechaLogro`), `lib/datos.ts`, `tests/unidad/records.test.ts`, `tests/seguridad/rls.test.ts` |
| T-002 | `oliver132123/records-panel` | `oliver132123/records-schema` | No | `app/(admin)/(panel)/admin/miembros/{page,MiembrosAdmin,RecordsModal}.tsx`, `lib/records-form.ts`, `tests/unidad/records-form.test.ts` |
| T-003 | `oliver132123/records-sitio` | `oliver132123/records-schema` | No | `app/(sitio)/_componentes/{Records.tsx,records.module.css}`, `app/(sitio)/equipo/{MiembroCard.tsx,equipo.module.css}`, `app/(sitio)/equipo/[slug]/{page.tsx,miembro.module.css}` |
| T-004 | `oliver132123/records-equipo` | `origin/main` (con T-001..T-003 mergeadas) | No | `lib/datos.ts`, `app/(admin)/(panel)/admin/miembros/{page,MiembrosAdmin,RecordsModal}.tsx`, `app/(sitio)/nosotros/{page.tsx,nosotros.module.css}` |

## Arranque (cuando se cumplan las dependencias)

```bash
docs/pm/scripts/nueva-tarea.sh T-001 records-schema --desde docs/pm/backlog/T-001
# ... T-001 aprobada por QA:
docs/pm/scripts/nueva-tarea.sh T-002 records-panel --base oliver132123/records-schema --desde docs/pm/backlog/T-002
docs/pm/scripts/nueva-tarea.sh T-003 records-sitio --base oliver132123/records-schema --desde docs/pm/backlog/T-003
# ... cuando haya récords del equipo, con T-001..T-003 en main:
docs/pm/scripts/nueva-tarea.sh T-004 records-equipo --desde docs/pm/backlog/T-004
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
