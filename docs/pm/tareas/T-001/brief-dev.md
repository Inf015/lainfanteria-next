# T-001 — Tabla de récords, tipos y lectura pública

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/records-schema` |
| Worktree | `/Users/oliverinfante/orca/workspaces/lainfanteria-next/lainfanteria-next-records-schema` |
| Base | `oliver132123/integracion-records` |
| Tipo | feat |
| Migración | **Sí** — `0013_records.sql` |
| Ronda | 3 — ver `pruebas-pm-r2.txt` (ronda 2: `reporte-qa-r1.md`) |

**Antes de empezar leé `docs/pm/contexto.md` entero** y después
`docs/pm/backlog/EPICA-records.md`. Sus reglas ganan sobre este brief.

## 1. Por qué

El equipo tiene récords y hoy no hay dónde guardarlos: `logros` guarda puestos,
no récords. Un récord es un **título** con cifras **opcionales**:

| Ejemplo | Tiempo | Velocidad |
| ------- | ------ | --------- |
| 1/4 de milla · Street Modified — **9.874 s @ 142.5 mph** | ✓ | ✓ |
| 1/8 de milla — **6.120 s** | ✓ | — |
| Roll Race 60-200 — **198 mph** | — | ✓ |
| «Primer dominicano en correr el Race of Champions» (un **hito**) | — | — |

Algunos cuentan como **récord nacional** y otros no, también entre los hitos: eso
lo decide el **alcance**, que es opcional. Solo suman los nacionales vigentes.

Un récord es de un **miembro** o **del equipo** (`miembro_id` nulo). Del equipo
todavía no hay ninguno y su presentación es T-004, pero la tabla los admite desde
ahora: agregarlo después costaría otra migración.

Esta tarea crea la base de datos y la capa de lectura. El panel (T-002) y la
presentación (T-003) se apoyan en lo que dejes acá, así que el contrato de tipos
y de `lib/records.ts` tiene que quedar exacto.

## 2. Alcance

**Dentro:**
- Migración `supabase/migrations/0013_records.sql`: tabla, enums, índices, RLS, políticas, grants
- Tipos en `lib/types.ts`
- Funciones puras de presentación en `lib/records.ts`
- `lib/datos.ts`: `getMiembros()` y `getMiembro()` traen los récords del miembro
- Pruebas unitarias y de seguridad

**Fuera (no tocar aunque parezca relacionado):**
- Consulta de récords del equipo (`getRecordsEquipo`) — es T-004
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
escribirla confirmá que `0012_foto_principal_atomica.sql` está en **tu base**
(`git log --oneline -- supabase/migrations/0012_foto_principal_atomica.sql`); si
no está, **pará y escalá** (el número 0013 depende de eso). La base puede ser una
rama de integración que apila PRs todavía abiertos: es esperado, no lo corrijas.

| Columna | Tipo | Restricción |
| ------- | ---- | ----------- |
| `id` | `bigint generated always as identity` | PK |
| `miembro_id` | `bigint` | **nula** = récord del equipo; FK `miembros(id) on delete cascade` |
| `titulo` | `text` | `not null`, no vacío ni solo espacios. Con cifras: la disciplina («1/4 de milla»). Sin cifras: el hito completo |
| `categoria` | `text` | nula — «Street Modified», «Pro» |
| `tiempo_s` | `numeric(8,3)` | nula; si no es nula, `> 0` |
| `velocidad` | `numeric(6,2)` | nula; si no es nula, `> 0` |
| `unidad_velocidad` | enum `unidad_velocidad` (`'mph'`, `'km_h'`) | nula |
| `alcance` | enum `alcance_record` (`'nacional'`, `'pista'`, `'evento'`) | **nula, sin default** = no suma como récord nacional ni de pista ni de evento |
| `auto` | `text` | nula — texto libre, **no** FK a `autos` (inventario en venta) |
| `lugar` | `text` | nula |
| `anio` | `integer` | nula, mismos CHECK que `logros` (1950–2100) |
| `mes` | `smallint` | nula, 1–12, y **mes sin año prohibido** (igual que `logros`) |
| `vigente` | `boolean` | `not null default true` |
| `fuente_url` | `text` | nula, o empieza con `http://` / `https://` (CHECK, sin distinguir mayúsculas) |
| `creado_en` | `timestamptz` | `not null default now()` |

**CHECK nombrado** `records_velocidad_con_unidad`: `velocidad` y `unidad_velocidad`
son las dos nulas o las dos no nulas (una velocidad sin unidad no se puede mostrar).

`alcance` va **sin default** a propósito: si la base pusiera `'nacional'` por
defecto, un hito cargado sin pensar sumaría como récord nacional. Documentalo en
el `comment on column`.

- **CA-1** — Dado el esquema anterior, cuando se aplica la migración en una base con 0001–0012, entonces se crea sin error y todos los CHECK existen **en la base** (no solo en el panel).
- **CA-2** — Dado `anon`, cuando lee `records`, entonces obtiene los récords **del equipo** (`miembro_id is null`) y los de miembros con `activo = true`; **nunca** los de un miembro inactivo.
- **CA-3** — Dado `anon`, cuando intenta `insert`, `update` (con payload real y filtro) o `delete` (con filtro) sobre `records`, entonces la base responde **`42501`**.
- **CA-4** — Dado un usuario autenticado que está en `admins`, entonces puede leer todo y escribir (`es_admin()` en `using` y `with check`); sin `GRANT` las políticas no llegan a evaluarse — copiá el bloque de grants de 0011.
- **CA-5** — Dado un miembro borrado, entonces sus récords se borran en cascada; los del equipo no se tocan.
- **CA-6** — Índices: por `miembro_id`, y uno parcial `where miembro_id is null` (lo usará T-004).

### Tipos (`lib/types.ts`)

- **CA-7** — Existen `UnidadVelocidad`, `AlcanceRecord` y la interfaz **`RecordDeportivo`** con las columnas de la tabla (`miembro_id: number | null`, `tiempo_s: number | null`, `velocidad: number | null`, `unidad_velocidad: UnidadVelocidad | null`, `alcance: AlcanceRecord | null`). ⚠️ **No la llames `Record`**: pisa el tipo global `Record<K, V>` de TypeScript, que ya se usa en el repo. `Miembro` gana `records: RecordDeportivo[]` con un JSDoc como el de `palmares`.

### Presentación (`lib/records.ts`, funciones puras)

Contrato exacto — T-002, T-003 y T-004 lo consumen:

```ts
export const NOMBRE_ALCANCE: Record<AlcanceRecord, string>;
// { nacional: 'Récord nacional', pista: 'Récord de pista', evento: 'Récord de evento' }

export const SIMBOLO_VELOCIDAD: Record<UnidadVelocidad, string>;
// { mph: 'mph', km_h: 'km/h' }

type Cifras = Pick<RecordDeportivo, 'tiempo_s' | 'velocidad' | 'unidad_velocidad'>;

export function formatearTiempo(valor: number | string | null): string | null;
export function formatearVelocidad(valor: number | string | null, unidad: UnidadVelocidad | null): string | null;
export function formatearMarca(r: Cifras): string | null;
export function tieneCifras(r: Cifras): boolean;
export function etiquetaRecord(r: Cifras & Pick<RecordDeportivo, 'alcance'>): string;
export function ordenarRecords(records: RecordDeportivo[]): RecordDeportivo[];
export function recordsVigentes(records: RecordDeportivo[]): RecordDeportivo[];
export function recordsNacionalesVigentes(records: RecordDeportivo[]): RecordDeportivo[];
```

- **CA-8** — Formateo:
  - `formatearTiempo` → siempre 3 decimales: `9.874` → `'9.874 s'`; `10` → `'10.000 s'`
  - `formatearVelocidad` → hasta 2 decimales, sin ceros sobrantes: `(142.5,'mph')` → `'142.5 mph'`; `(238,'km_h')` → `'238 km/h'`; `(199.999,'mph')` → `'200 mph'`
  - Separador decimal **punto**, sin separador de miles (así se leen las marcas en el automovilismo local)
  - Aceptan el valor como string (`'9.874'`), porque PostgREST puede serializar `numeric` como texto
  - Valor nulo, no numérico o ≤ 0 → `null`. Velocidad sin unidad → `null`.
  - `formatearMarca` → las dos: `'9.874 s @ 142.5 mph'`; una sola: esa; ninguna válida: `null`
- **CA-9** — La fecha del récord reutiliza `fechaLogro` de `lib/palmares.ts`: cambiá su parámetro a `Pick<Logro, 'anio' | 'mes'>` (compatible con todos los usos actuales). No dupliques la lista de meses.
- **CA-10** — `tieneCifras` es `true` si `formatearMarca` no es `null` (es decir, si hay al menos una cifra **mostrable**; un tiempo `0` o una velocidad sin unidad no cuentan). Un récord sin cifras es un **hito**.
- **CA-11** — `etiquetaRecord`: con alcance → `NOMBRE_ALCANCE[alcance]`; sin alcance y con cifras → `'Récord'`; sin alcance y sin cifras → `'Hito'`.
- **CA-12** — `ordenarRecords` no muta la entrada y ordena por, en este orden: vigentes antes que superados → alcance `nacional` > `pista` > `evento` > sin alcance → `anio` desc (sin año al final) → `mes` desc (sin mes al final) → `id` desc.
- **CA-13** — `recordsVigentes` devuelve solo `vigente = true`; `recordsNacionalesVigentes`, solo `vigente = true` **y** `alcance = 'nacional'`, tengan cifras o no. Ambas conservan el orden recibido.

### Lectura (`lib/datos.ts`)

- **CA-14** — `COLUMNAS_MIEMBRO` agrega `records(*)`, y `getMiembros()`/`getMiembro()` devuelven `records` pasados por `ordenarRecords` (`[]` si viene nulo), igual que hoy con `palmares`. `palmares` sigue exactamente igual.

## 5. Pruebas requeridas

- [ ] **Unidad** `tests/unidad/records.test.ts` (estilo de `formato.test.ts`):
  - `formatearTiempo` / `formatearVelocidad`: cada unidad; límites `0.001`, `10`, `99999.999`, `199.999`; string; `null`, `0`, negativo, `NaN`, `'abc'` → `null`; velocidad sin unidad → `null`
  - `formatearMarca`: tabla de decisión tiempo {válido, nulo, inválido} × velocidad {válida, nula, inválida, sin unidad}
  - `tieneCifras` y `etiquetaRecord`: las tres ramas de CA-11, más un hito con alcance nacional (→ `'Récord nacional'`)
  - `ordenarRecords`: tabla de decisión vigente × alcance (incluido sin alcance) × fecha, con al menos un caso por nivel de desempate; sin año al final; la entrada no se muta
  - `recordsVigentes` / `recordsNacionalesVigentes`: vacío; nacional superado queda afuera; pista vigente queda afuera; **hito nacional vigente cuenta**; **hito sin alcance no cuenta**
  - `fechaLogro` sigue pasando sus tests existentes
- [ ] **Seguridad** `tests/seguridad/rls.test.ts`: agregá `records` a `TABLAS`, con un `PAYLOAD` realista (`titulo`; sin cuerpo vacío) y su `FILTRO` (`id=gt.0`). Tiene que quedar cubierto: lectura 200, insert/update/delete → `42501`, y el chequeo de «no quedó ningún intruso».
  - ⚠️ Estas pruebas van contra **producción**, donde la tabla no existe hasta el `db push`. **No las corras vos.** Las corre el PM contra Supabase local (ver sección 8).
- [ ] Nada de humo: no hay rutas nuevas.

## 6. Defectos a corregir (solo rondas de fix)

**Ronda 2** — de `reporte-qa-r1.md` (veredicto PASS-WITH-RESERVATIONS). Solo esto; nada más del reporte.

| ID | Sev | Resumen | Esperado |
| -- | --- | ------- | -------- |
| T-001-D01 | S3/P3 | `tests/unidad/records.test.ts:86-126` no persiste la tabla de decisión completa de `formatearMarca` que pide la sección 5 | Test parametrizado (`it.each`) con las **12 celdas** tiempo {válido `9.874`, nulo, inválido `0`} × velocidad {válida `142.5` mph, nula, inválida `-1` con unidad `mph`, sin unidad `142.5`/`null`}, con el string o `null` esperado **literal** en cada fila, y en la misma fila la aserción de `tieneCifras` coherente. Incluye explícitamente velocidad negativa **con** unidad válida. |

**Ronda 3** — hallazgos del PM en `pruebas-pm-r2.txt` (exploración SQL de bordes que pidió QA). La 0013 todavía no está aplicada en producción: se corrige en el mismo archivo, sin migración nueva.

| ID | Sev | Resumen | Esperado |
| -- | --- | ------- | -------- |
| T-001-D02 | S3/P2 | `records_titulo_no_vacio` usa `btrim(titulo)`, que solo recorta espacios: la base acepta un título que es solo `\t`, `\n`, `\r` o espacio duro (U+00A0) | El CHECK exige al menos un carácter no blanco: `titulo ~ '[^[:space:]]'` (en esta base `[:space:]` incluye tab, salto de línea, CR y U+00A0; verificado por el PM). Mismo nombre de constraint. Actualizá el comentario explicando por qué no alcanza `btrim`. |
| T-001-D03 | S3/P2 | `records_tiempo_positivo` y `records_velocidad_positiva` aceptan `'NaN'`: en Postgres `NaN` es mayor que cualquier número, así que `> 0` pasa | Ambos CHECK excluyen NaN explícitamente: `… is null or (… > 0 and … <> 'NaN')`. Mismos nombres de constraint. Comentario con el porqué. (`Infinity` ya lo rechaza la precisión de la columna: no hace falta tocarlo.) |

Pruebas: son invariantes de base; no hay forma de probarlas en `tests/unidad` ni con `anon` en `tests/seguridad`. **No agregues tests para esto**: el PM las ejecuta contra Supabase local (ya tiene los casos de `pruebas-pm-r2.txt`). En la entrega describí el cambio exacto de cada CHECK.

Fuera de esta ronda (anotado por QA como pregunta, no defecto): redondeo de empates decimales y valores submínimos (`0.001 mph`). No los cambies ni les agregues tests: el PM los define antes de T-002.

## 7. Definición de hecho

- [ ] Todos los CA cumplidos, cada uno con su test o evidencia
- [ ] `npx next typegen && npx tsc --noEmit` limpio
- [ ] `npm run lint` limpio
- [ ] `npm test` verde
- [ ] `npm run build` pasa (verifica que el cambio de tipos no rompió ninguna página)
- [ ] Commits convencionales, archivos stageados por nombre, en la rama correcta. Sugerencia de corte: `feat(db): tabla records` · `feat(records): tipos y presentación` · `feat(equipo): los miembros traen sus récords` · `test(seguridad): records cerrada a anon`
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
insert into records (miembro_id, titulo, tiempo_s, velocidad, unidad_velocidad, alcance)
  select id, '1/4 de milla', 9.874, 142.5, 'mph', 'nacional' from miembros where slug in ('activo', 'inactivo');
insert into records (titulo) values ('Hito del equipo');          -- sin alcance: válido
-- Deben fallar por CHECK:
insert into records (titulo, velocidad) values ('velocidad sin unidad', 142.5);
insert into records (titulo, unidad_velocidad) values ('unidad sin velocidad', 'mph');
insert into records (titulo, tiempo_s) values ('tiempo cero', 0);
insert into records (titulo) values ('   ');
insert into records (titulo, fuente_url) values ('x', 'javascript:alert(1)');
SQL
psql "<DB URL local>" -c "select alcance from records where titulo = 'Hito del equipo';"   # espera NULL, no 'nacional'
curl -s "http://127.0.0.1:54321/rest/v1/records?select=titulo,miembro_id" \
  -H "apikey: <anon local>"               # espera: el del Activo y el del equipo, NO el del Inactivo
psql "<DB URL local>" -c "delete from miembros where slug = 'activo'; select count(*) from records;"  # espera 2
npx supabase stop
```
