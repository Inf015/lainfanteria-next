# Entrega T-001 — ronda 1

**Estado:** LISTA PARA QA

## Qué hice

- Revisé línea por línea el commit heredado `2bd856b feat(db): tabla records`
  (`supabase/migrations/0013_records.sql`) contra la sección "Esquema" del
  brief: columnas, tipos, restricciones, nombres de CHECK, comentarios,
  índices, RLS, políticas y grants. **Cumple todo tal cual estaba** — no hizo
  falta ningún commit de corrección. Detalle abajo, en "Decisiones tomadas".
- Revisé el diff sin commitear de `lib/types.ts` (otro dev, incompleto):
  **estaba completo y correcto** contra CA-7 (tipos, nombres, JSDoc,
  no pisar `Record<K,V>`). Lo commiteé tal cual — `lib/types.ts:61-100`.
- `lib/records.ts` (nuevo) — el contrato exacto de la sección 4: constantes,
  formateo, `ordenarRecords`, `recordsVigentes`, `recordsNacionalesVigentes`.
- `lib/palmares.ts:43` — `fechaLogro` pasa a `Pick<Logro,'anio'|'mes'>` para
  que un récord la reutilice sin duplicar `MESES` (CA-9).
- `lib/datos.ts` — `COLUMNAS_MIEMBRO` agrega `records(*)`; `getMiembros()` y
  `getMiembro()` devuelven `records` ordenados con `ordenarRecords` (CA-14).
- `tests/unidad/records.test.ts` (nuevo, 33 casos) y `tests/seguridad/rls.test.ts`
  (`records` en `TABLAS`/`PAYLOAD`/`FILTRO` + chequeo de intrusos).

## Trazabilidad

| CA | Cómo se cumple | Test / evidencia |
| -- | --------------- | ----------------- |
| CA-1 | Esquema revisado línea por línea contra el brief; todos los CHECK, tipos y PK están en la migración | `supabase/migrations/0013_records.sql` (commit `2bd856b`, heredado y verificado); aplicación real la corre el PM (sección 8 del brief) |
| CA-2 | Policy `"lectura pública de records del equipo y de miembros activos"` | Migración; comprobación con datos reales, sección 8 del brief (Supabase local, la corre el PM) |
| CA-3 | Sin GRANT insert/update/delete a `anon` | Migración; `tests/seguridad/rls.test.ts` → `records` en `TABLAS` (lectura 200, insert/update/delete → 42501) — corre el PM contra Supabase local |
| CA-4 | `es_admin()` en `using`/`with check` de `"admin escribe"`, grants copiados de 0011 | Migración |
| CA-5 | `miembro_id ... on delete cascade`; los del equipo (`miembro_id null`) no dependen de ningún FK | Migración; comprobación con datos reales, sección 8 del brief |
| CA-6 | `records_miembro_idx` y `records_equipo_idx` (parcial, `where miembro_id is null`) | Migración |
| CA-7 | `UnidadVelocidad`, `AlcanceRecord`, `RecordDeportivo` en `lib/types.ts`; `Miembro.records` | `npx tsc --noEmit` limpio (tipos consistentes en todo el repo) |
| CA-8 | `formatearTiempo`, `formatearVelocidad`, `formatearMarca` | `tests/unidad/records.test.ts` › `describe('formatearTiempo'/'formatearVelocidad'/'formatearMarca')` (16 casos, límites, string, nulos/inválidos, sin unidad) |
| CA-9 | `fechaLogro(logro: Pick<Logro,'anio'\|'mes'>)` | `tests/unidad/palmares.test.ts` › `describe('fechaLogro')` sigue verde; `records.ts` no duplica `MESES` |
| CA-10 | `tieneCifras` = `formatearMarca(r) !== null` | `tests/unidad/records.test.ts` › `describe('tieneCifras y etiquetaRecord')` |
| CA-11 | `etiquetaRecord`: alcance manda, si no hay cifras deciden "Récord"/"Hito" | mismo describe, 4 casos (incluye hito con alcance nacional) |
| CA-12 | `ordenarRecords`: vigente → alcance → año → mes → id, sin mutar | `tests/unidad/records.test.ts` › `describe('ordenarRecords')` (6 casos, uno por nivel de desempate + no-mutación) |
| CA-13 | `recordsVigentes` / `recordsNacionalesVigentes`, preservan orden | `tests/unidad/records.test.ts` › ambos describe (vacío, superado afuera, pista afuera, hito nacional cuenta, hito sin alcance no cuenta, orden) |
| CA-14 | `COLUMNAS_MIEMBRO` + `records(*)`; `getMiembros`/`getMiembro` pasan por `ordenarRecords`, `[]` si nulo | `lib/datos.ts:59-115`; `npm run build` genera `/equipo` y `/equipo/[slug]` sin error de tipos |

## Commits

```
758e3e1 test(seguridad): records cerrada a anon
4d70bbf feat(equipo): los miembros traen sus récords (CA-14)
a74c1a4 feat(records): funciones puras de presentación (CA-8..13)
eb8b0f2 feat(records): tipos del récord deportivo (CA-7)
2bd856b feat(db): tabla records   ← heredado, revisado, sin cambios
```

(`git log --oneline oliver132123/integracion-records..HEAD`, de más nuevo a
más viejo; `2bd856b` y `4124e82` son del estado heredado, no de esta entrega.)

## Verificación (salida real, recortada)

```
$ npx next typegen && npx tsc --noEmit
✓ Types generated successfully
(sin errores)

$ npm run lint
> eslint
(sin salida = sin errores)

$ npm test
 Test Files  7 passed (7)
      Tests  129 passed (129)
   Duration  183ms

$ npm run build
✓ Compiled successfully in 2.7s
  Running TypeScript ...
  Finished TypeScript in 2.5s ...
[supabase] "miembros activos" falló: {
  code: 'PGRST200',
  details: "Searched for a foreign key relationship between 'miembros' and
    'records' in the schema 'public', but no matches were found.",
  message: "Could not find a relationship between 'miembros' and 'records'
    in the schema cache"
}
✓ Generating static pages using 7 workers (13/13) in 994ms
Route (app) ... 13 rutas generadas, exit code 0
```

El warning de `[supabase]` en el build **es esperado**: el build corre contra
el Supabase de **producción**, donde la 0013 todavía no está aplicada.
`consultar()` cae a su respaldo `[]` (mismo mecanismo, ya probado, que usa
para `secciones`/etc.) y el build igual termina en 13/13 páginas, exit 0. Es
exactamente el escenario "NO-GO si se invierte" que describe
`docs/pm/backlog/EPICA-records.md` — no es un bug de esta entrega, es la razón
por la que el orden de deploy de esa sección importa.

## Migraciones

`supabase/migrations/0013_records.sql` — **REQUIERE db push ANTES del merge**
(la aplica Oliver, no yo). Crea:
- tipos `unidad_velocidad`, `alcance_record`
- tabla `records` con sus CHECK, índices, RLS, políticas y grants

**Revertir:**
```sql
drop table if exists records;
drop type if exists alcance_record;
drop type if exists unidad_velocidad;
```

## Decisiones tomadas

- **No reescribí la migración 0013.** El brief pedía revisarla línea por
  línea y corregir lo que no cumpliera; la revisé completa contra la tabla de
  columnas, el CHECK nombrado, el `comment on column` de `alcance` y el
  bloque de permisos — está igual a lo que pide el brief, así que un commit
  "de corrección" solo habría reescrito algo ya correcto. Lo dejo explícito
  acá para que quede trazado que sí se revisó.
- **`lib/types.ts` se commiteó tal cual estaba sin commitear** — mismo
  motivo: cumple CA-7 al detalle (nombres, nulabilidad, JSDoc, el aviso de no
  pisar `Record`). No lo reescribí para no introducir una diferencia sin
  razón.
- **`formatearVelocidad`/`formatearTiempo` pasan por `toFixed` y de vuelta a
  `Number`** para pelar ceros sobrantes (`142.50` → `142.5`) sin reimplementar
  un formateador de decimales — es la misma idea que ya usa el repo para
  round-trips de fecha en `lib/formato.ts`.
- **`ordenarRecords` reusa el patrón de `ordenarPalmares`/`porAnio`** (año/mes
  con `?? -Infinity` para mandar los nulos al final) en vez de inventar otro
  criterio de comparación.

## Fuera de alcance que vi (no tocado)

- `tests/unidad/palmares.test.ts` — el fixture `miembro()` necesitó un campo
  `records: []` nuevo porque `Miembro` ahora lo exige (CA-7). Es una
  consecuencia directa y de una línea del tipo, no un cambio de alcance; lo
  incluí en el mismo commit que agrega el campo a `lib/types.ts`-adjacente
  (`feat(records): funciones puras de presentación`) para que `tsc` quede
  limpio. No toqué ningún caso existente de ese archivo.
- Confirmo lo ya anotado en la épica: `tests/seguridad/rls.test.ts` seguía sin
  cubrir `logros` — no lo agregué, es explícitamente "fuera" en la sección 2
  del brief.
- `PalmaresModal.tsx` (panel, T-002) tiene su propia lista `MESES` duplicada
  de la de `lib/palmares.ts`. No la toqué — está fuera de los archivos de
  T-001 y es del panel, no de esta tarea.

## Preguntas / bloqueos

Ninguna. No usé `ask` — el brief y la épica cubrieron todas las decisiones que
necesité.
