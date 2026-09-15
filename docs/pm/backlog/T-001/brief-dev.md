# T-001 — Tabla de récords, tipos y lectura pública

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/records-schema` |
| Worktree | `<ruta absoluta>` |
| Base | `origin/main` |
| Tipo | feat |
| Migración | **Sí** — `0013_records.sql` |
| Ronda | 1 |

**Antes de empezar leé `docs/pm/contexto.md` entero** y después
`docs/pm/backlog/EPICA-records.md`. Sus reglas ganan sobre este brief.

## 1. Por qué

El equipo tiene récords y hoy no hay dónde guardarlos: `logros` guarda puestos,
no récords. Hay dos tipos:

- **Marca**: una cifra — 9.874 s en 1/4 de milla, 238 km/h en un roll race.
- **Hito**: sin cifra — «Primer dominicano en correr el Race of Champions»,
  «Piloto más joven en ganar el campeonato nacional».

Y dos dueños: un **miembro** del equipo, o **el equipo/taller** como tal.

Esta tarea crea la base de datos y la capa de lectura. El panel (T-002) y la
presentación (T-003) se apoyan en lo que dejes acá, así que el contrato de tipos
y de `lib/records.ts` tiene que quedar exacto.

## 2. Alcance

**Dentro:**
- Migración `supabase/migrations/0013_records.sql`: tabla, enums, índices, RLS, políticas, grants
- Tipos en `lib/types.ts`
- Funciones puras de presentación en `lib/records.ts`
- `lib/datos.ts`: `getMiembros()` y `getMiembro()` traen los récords del miembro; `getRecordsEquipo()` nueva
- Pruebas unitarias y de seguridad

**Fuera (no tocar aunque parezca relacionado):**
- Panel de administración (es T-002) — incluida la consulta de `app/(admin)/(panel)/admin/miembros/page.tsx`
- Cualquier componente o CSS del sitio (es T-003)
- Agregar `logros` a las pruebas de seguridad (hallazgo anotado en la épica)
- La columna obsoleta `miembros.logros`
- Aplicar la migración (`supabase db push`) — la aplica Oliver

## 3. Archivos probables

- `supabase/migrations/0013_records.sql` (nuevo)
- `lib/types.ts`
- `lib/records.ts` (nuevo)
- `lib/palmares.ts` (solo la firma de `fechaLogro`, ver CA-9)
- `lib/datos.ts`
- `tests/unidad/records.test.ts` (nuevo)
- `tests/seguridad/rls.test.ts`

## 4. Criterios de aceptación

### Esquema (`0013_records.sql`)

Seguí el estilo de `0011_logros_estructurados.sql`: comentarios que explican el
**por qué** de cada decisión y `comment on column` en lo no obvio. Antes de
escribirla confirmá que `0012_foto_principal_atomica.sql` ya está en `main`; si
no está, **pará y escalá** (el número 0013 depende de eso).

| Columna | Tipo | Restricción |
| ------- | ---- | ----------- |
| `id` | `bigint generated always as identity` | PK |
| `miembro_id` | `bigint` | **nula** = récord del equipo; FK `miembros(id) on delete cascade` |
| `tipo` | enum `tipo_record` (`'marca'`, `'hito'`) | `not null default 'marca'` |
| `titulo` | `text` | `not null`, no vacío ni solo espacios. Marca: la disciplina («1/4 de milla»). Hito: el texto completo («Primer dominicano en correr el Race of Champions») |
| `categoria` | `text` | nula — «Street Modified», «Pro» |
| `valor` | `numeric(8,3)` | nula; si no es nula, `> 0` |
| `unidad` | enum `unidad_record` (`'segundos'`, `'km_h'`, `'mph'`) | nula |
| `alcance` | enum `alcance_record` (`'nacional'`, `'pista'`, `'evento'`) | `not null default 'nacional'` |
| `auto` | `text` | nula — texto libre, **no** FK a `autos` (inventario en venta) |
| `lugar` | `text` | nula |
| `anio` | `integer` | nula, mismos CHECK que `logros` (1950–2100) |
| `mes` | `smallint` | nula, 1–12, y **mes sin año prohibido** (igual que `logros`) |
| `vigente` | `boolean` | `not null default true` |
| `fuente_url` | `text` | nula, o empieza con `http://` / `https://` (CHECK, sin distinguir mayúsculas) |
| `creado_en` | `timestamptz` | `not null default now()` |

**CHECK de coherencia por tipo** (nombrado, p. ej. `records_coherencia_tipo`):
- `marca` ⇒ `valor` **y** `unidad` no nulos
- `hito` ⇒ `valor` **y** `unidad` nulos (un hito con cifra es una marca mal cargada)

- **CA-1** — Dado el esquema anterior, cuando se aplica la migración en una base con 0001–0012, entonces se crea sin error y todos los CHECK existen **en la base** (no solo en el panel), incluido el de coherencia.
- **CA-2** — Dado `anon`, cuando lee `records`, entonces obtiene los récords **del equipo** (`miembro_id is null`) y los de miembros con `activo = true`; **nunca** los de un miembro inactivo.
- **CA-3** — Dado `anon`, cuando intenta `insert`, `update` (con payload real y filtro) o `delete` (con filtro) sobre `records`, entonces la base responde **`42501`**.
- **CA-4** — Dado un usuario autenticado que está en `admins`, entonces puede leer todo y escribir (`es_admin()` en `using` y `with check`); sin `GRANT` las políticas no llegan a evaluarse — copiá el bloque de grants de 0011.
- **CA-5** — Dado un miembro borrado, entonces sus récords se borran en cascada; los del equipo no se tocan.
- **CA-6** — Índices: por `miembro_id`, y uno parcial `where miembro_id is null` para la consulta del equipo.

### Tipos (`lib/types.ts`)

- **CA-7** — Existen `TipoRecord`, `UnidadRecord`, `AlcanceRecord` y la interfaz **`RecordDeportivo`** con las columnas de la tabla (`miembro_id: number | null`, `valor: number | null`, `unidad: UnidadRecord | null`). ⚠️ **No la llames `Record`**: pisa el tipo global `Record<K, V>` de TypeScript, que ya se usa en el repo. `Miembro` gana `records: RecordDeportivo[]` con un JSDoc como el de `palmares`.

### Presentación (`lib/records.ts`, funciones puras)

Contrato exacto — T-002 y T-003 lo consumen:

```ts
export const NOMBRE_ALCANCE: Record<AlcanceRecord, string>;
// { nacional: 'Récord nacional', pista: 'Récord de pista', evento: 'Récord de evento' }

export const SIMBOLO_UNIDAD: Record<UnidadRecord, string>;
// { segundos: 's', km_h: 'km/h', mph: 'mph' }

export type MarcaDeportiva = RecordDeportivo & { tipo: 'marca'; valor: number; unidad: UnidadRecord };
export function esMarca(r: RecordDeportivo): r is MarcaDeportiva;

export function formatearMarca(valor: number | string, unidad: UnidadRecord): string;
export function ordenarRecords(records: RecordDeportivo[]): RecordDeportivo[];
export function recordsVigentes(records: RecordDeportivo[]): RecordDeportivo[];
export function recordsNacionalesVigentes(records: RecordDeportivo[]): RecordDeportivo[];
```

- **CA-8** — `formatearMarca`:
  - `segundos` → siempre 3 decimales: `(9.874,'segundos')` → `'9.874 s'`; `(10,'segundos')` → `'10.000 s'`
  - `km_h` / `mph` → hasta 2 decimales, sin ceros sobrantes: `(238,'km_h')` → `'238 km/h'`; `(241.5,'mph')` → `'241.5 mph'`; `(199.999,'km_h')` → `'200 km/h'`
  - Separador decimal **punto**, sin separador de miles (así se leen las marcas en el automovilismo local)
  - Acepta el valor como string (`'9.874'`), porque PostgREST puede serializar `numeric` como texto
  - Valor no numérico o ≤ 0 → `'—'` (no revienta el render)
- **CA-9** — La fecha del récord reutiliza `fechaLogro` de `lib/palmares.ts`: cambiá su parámetro a `Pick<Logro, 'anio' | 'mes'>` (compatible con todos los usos actuales). No dupliques la lista de meses.
- **CA-10** — `esMarca` es `true` solo si `tipo === 'marca'` **y** `valor` y `unidad` no son nulos (defensa ante datos inconsistentes: con `tipo: 'marca'` y `valor: null` devuelve `false`).
- **CA-11** — `ordenarRecords` no muta la entrada y ordena por, en este orden: vigentes antes que superados → alcance `nacional` > `pista` > `evento` → `anio` desc (sin año al final) → `mes` desc (sin mes al final) → `id` desc. El `tipo` **no** influye: marcas e hitos se mezclan.
- **CA-12** — `recordsVigentes` devuelve solo `vigente = true`; `recordsNacionalesVigentes`, solo `vigente = true` **y** `alcance = 'nacional'`, marcas **e** hitos. Ambas conservan el orden recibido.

### Lectura (`lib/datos.ts`)

- **CA-13** — `COLUMNAS_MIEMBRO` agrega `records(*)`, y `getMiembros()`/`getMiembro()` devuelven `records` pasados por `ordenarRecords` (`[]` si viene nulo), igual que hoy con `palmares`. `palmares` sigue exactamente igual.
- **CA-14** — `getRecordsEquipo(): Promise<RecordDeportivo[]>` devuelve los récords con `miembro_id is null`, pasados por `ordenarRecords`, con `consultar()` y respaldo `[]`.

## 5. Pruebas requeridas

- [ ] **Unidad** `tests/unidad/records.test.ts` (estilo de `formato.test.ts`):
  - `formatearMarca`: cada unidad; límites `0.001`, `10`, `99999.999`, `199.999` (→ `'200 km/h'`); string; `0`, negativo, `NaN`, `'abc'` → `'—'`
  - `esMarca`: marca completa, hito, marca con `valor` nulo, marca con `unidad` nula
  - `ordenarRecords`: tabla de decisión vigente × alcance × fecha, con al menos un caso por nivel de desempate; marcas e hitos mezclados; sin año al final; la entrada no se muta
  - `recordsVigentes` / `recordsNacionalesVigentes`: vacío; nacional superado queda afuera; pista vigente queda afuera de la nacional; **un hito nacional vigente cuenta**
  - `fechaLogro` sigue pasando sus tests existentes
- [ ] **Seguridad** `tests/seguridad/rls.test.ts`: agregá `records` a `TABLAS`, con un `PAYLOAD` realista (`tipo: 'hito'`, `titulo`; sin cuerpo vacío) y su `FILTRO` (`id=gt.0`). Tiene que quedar cubierto: lectura 200, insert/update/delete → `42501`, y el chequeo de «no quedó ningún intruso».
  - ⚠️ Estas pruebas van contra **producción**, donde la tabla no existe hasta el `db push`. **No las corras vos.** Las corre el PM contra Supabase local (ver sección 8).
- [ ] Nada de humo: no hay rutas nuevas.

## 6. Defectos a corregir (solo rondas de fix)

No aplica en ronda 1.

## 7. Definición de hecho

- [ ] Todos los CA cumplidos, cada uno con su test o evidencia
- [ ] `npx next typegen && npx tsc --noEmit` limpio
- [ ] `npm run lint` limpio
- [ ] `npm test` verde
- [ ] `npm run build` pasa (verifica que el cambio de tipos no rompió ninguna página)
- [ ] Commits convencionales, archivos stageados por nombre, en la rama correcta. Sugerencia de corte: `feat(db): tabla records` · `feat(records): tipos y presentación` · `feat(equipo): los miembros y el equipo traen sus récords` · `test(seguridad): records cerrada a anon`
- [ ] Working tree limpio (`git status --short` vacío)
- [ ] `entrega-dev.md` escrita en esta carpeta y commiteada, con la sección *Migraciones* diciendo **REQUIERE db push ANTES del merge** y cómo revertir (`drop table records; drop type ...`)
- [ ] Sin push, sin PR, sin `db push`, sin SQL contra el Supabase remoto

## 8. Nota para el PM (no para el dev)

Gate extra de esta tarea, antes del PR (requiere Docker):

```bash
cd <worktree>
npx supabase start                      # aplica 0001..0013 en local
npx supabase status                     # copiar API URL, anon key y DB URL
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon local> \
  npm run test:seguridad
```

`dotenv` no pisa variables ya definidas, así que las de la línea de comando ganan
sobre `.env.local`. Si alguna prueba preexistente falla en local por falta de
datos (la base local no tiene seed), anotarlo en el gate y confirmar que las de
`records` pasan; no se tocan las otras.

CA-1, CA-2 y CA-5 necesitan datos y escrituras reales, así que se comprueban
**solo en local**:

```bash
psql "<DB URL local>" <<'SQL'
insert into miembros (nombre, slug, activo) values ('Activo', 'activo', true), ('Inactivo', 'inactivo', false);
insert into records (miembro_id, tipo, titulo, valor, unidad)
  select id, 'marca', '1/4 de milla', 9.874, 'segundos' from miembros where slug in ('activo', 'inactivo');
insert into records (tipo, titulo) values ('hito', 'Récord del equipo');
-- Deben fallar por CHECK:
insert into records (tipo, titulo) values ('marca', 'marca sin cifra');
insert into records (tipo, titulo, valor, unidad) values ('hito', 'hito con cifra', 1, 'segundos');
insert into records (tipo, titulo) values ('hito', '   ');
insert into records (tipo, titulo, fuente_url) values ('hito', 'x', 'javascript:alert(1)');
SQL
curl -s "http://127.0.0.1:54321/rest/v1/records?select=titulo,miembro_id" \
  -H "apikey: <anon local>"               # espera: el del Activo y el del equipo, NO el del Inactivo
psql "<DB URL local>" -c "delete from miembros where slug = 'activo'; select count(*) from records;"  # espera 2
npx supabase stop
```
