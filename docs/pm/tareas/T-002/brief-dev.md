# T-002 — Récords de los miembros en el panel

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/records-panel` |
| Worktree | `/Users/oliverinfante/orca/workspaces/lainfanteria-next/lainfanteria-next-records-panel` |
| Base | `oliver132123/records-schema` |
| Tipo | feat |
| Migración | No |
| Ronda | 3 (última) — ver `pruebas-pm-r2.txt` (ronda 2: `reporte-qa-r1.md`) |

**Antes de empezar leé `docs/pm/contexto.md` entero** y después
`docs/pm/backlog/EPICA-records.md`. Sus reglas ganan sobre este brief.

## 1. Por qué

Con la tabla `records` creada (T-001), Oliver necesita cargar los récords de cada
miembro sin entrar al panel de Supabase. Un récord tiene título y, **opcionales**,
tiempo y velocidad; sin ninguna cifra es un hito. Quien carga decide si **cuenta**
como récord nacional (el alcance): hay hitos que cuentan y otros que no.

## 2. Alcance

**Dentro:**
- Botón **«Récords»** en cada fila de la tabla de miembros del panel
- Modal `RecordsModal.tsx`: lista + formulario de alta/edición + borrar + marcar superado/vigente
- Validación del formulario como funciones puras en `lib/records-form.ts`, con tests
- La consulta del panel trae los récords de cada miembro

**Fuera (no tocar aunque parezca relacionado):**
- Récords **del equipo** en el panel — es T-004
- `lib/records.ts`, `lib/types.ts`, `lib/datos.ts` — son de T-001. Si te falta algo ahí, **escalá**; no lo agregues
- Cualquier archivo de `app/(sitio)/` — es T-003, que corre **en paralelo**
- `PalmaresModal.tsx` (no se refactoriza para compartir código)
- Foto del récord, subida a Storage
- Migraciones

## 3. Archivos probables

- `app/(admin)/(panel)/admin/miembros/page.tsx` — el `select` pasa a `'*, palmares:logros(*), records(*)'`
- `app/(admin)/(panel)/admin/miembros/MiembrosAdmin.tsx` — botón y estado del modal
- `app/(admin)/(panel)/admin/miembros/RecordsModal.tsx` (nuevo)
- `lib/records-form.ts` (nuevo)
- `tests/unidad/records-form.test.ts` (nuevo)

Tomá `PalmaresModal.tsx` como referencia de estructura, estilos (`admin.module.css`)
y manejo de errores: el panel tiene que sentirse igual.

## 4. Criterios de aceptación

### Lista

- **CA-1** — Dado un miembro en la tabla del panel, cuando se hace clic en «Récords», entonces se abre un modal titulado con el nombre del miembro y sus récords en el orden de `ordenarRecords` (T-001).
- **CA-2** — Cada récord de la lista muestra: `formatearMarca` si hay cifras (si no, nada en su lugar), el título, categoría (si hay), `etiquetaRecord`, fecha con `fechaLogro` (si hay) y un indicador **VIGENTE** o **SUPERADO**. Los que **suman** como récord nacional (vigente + alcance nacional) se distinguen a simple vista (p. ej. una píldora «SUMA»).
- **CA-3** — Sin récords, el modal muestra «Todavía no tiene récords cargados.» y el formulario de alta disponible.

### Formulario

| Campo | Obligatorio | Nota |
| ----- | ----------- | ---- |
| Título | ✓ | textarea; ayuda: «La disciplina (1/4 de milla) o el hito completo» |
| Tiempo (s) | — | |
| Velocidad | — | con select de unidad al lado: mph (por defecto) / km/h |
| Alcance | ✓ | select **sin opción preseleccionada**: Nacional / De pista / De evento / Ninguno — no suma. Ayuda: «Solo los nacionales vigentes suman en la tarjeta del piloto» |
| Categoría, auto, lugar, año, mes, vigente (marcado), fuente (URL) | — | |

`lib/records-form.ts` exporta:

```ts
export interface FormRecord { /* todos los campos como string/boolean, tal como salen del form; alcance '' = sin elegir, 'ninguno' = sin alcance */ }
export function formVacio(): FormRecord;
export function formDesdeRecord(r: RecordDeportivo): FormRecord;
export function validarRecord(form: FormRecord): string | null; // null = válido; si no, el mensaje a mostrar
export function aFilaRecord(form: FormRecord, miembroId: number | null): Omit<RecordDeportivo, 'id' | 'creado_en'>;
```

`miembroId` acepta `null` para que T-004 (récords del equipo) no tenga que cambiar la firma; esta tarea siempre pasa un número.

- **CA-4** — `validarRecord` devuelve un mensaje en español, y el panel lo muestra sin llamar a la base, cuando:
  - título vacío o solo espacios → «Escribí el título del récord.»
  - alcance sin elegir → «Elegí el alcance: si no suma como récord nacional, elegí Ninguno.»
  - tiempo **cargado** y no numérico, ≤ 0, mayor que `99999.999` o con más de 3 decimales → «El tiempo tiene que ser un número mayor que cero, con hasta 3 decimales.»
  - velocidad **cargada** y no numérica, ≤ 0, mayor que `9999.99` o con más de 2 decimales → «La velocidad tiene que ser un número mayor que cero, con hasta 2 decimales.»
  - mes sin año → «Si ponés el mes, poné también el año.»
  - año fuera de 1950–2100 o no entero → «El año tiene que estar entre 1950 y 2100.»
  - fuente no vacía que no empieza con `http://` o `https://` → «La fuente tiene que ser un enlace http(s).» — en particular `javascript:alert(1)` es inválida
- **CA-5** — Tiempo y velocidad vacíos son **válidos** (es un hito). Tiempo y velocidad aceptan **coma o punto** como separador decimal (`'9,874'` y `'9.874'` → `9.874`) y espacios alrededor; no aceptan separador de miles (`'1.234,5'` es inválido).
- **CA-6** — `aFilaRecord` recorta espacios; convierte textos opcionales vacíos a `null`; `anio`/`mes` vacíos a `null`; tiempo y velocidad a `number` o `null`; `alcance: 'ninguno'` → `null`; **velocidad vacía ⇒ `unidad_velocidad: null`** aunque el select tenga mph (si no, el CHECK de la base rechaza la fila).
- **CA-7** — Dado un formulario válido, cuando se guarda un alta, entonces se inserta en `records` y aparece en la lista en su posición ordenada **sin recargar la página**. Al editar, se actualiza esa fila (`.eq('id', …)`) con lo que devuelve la base y la lista refleja el cambio. Editar un récord con alcance nulo muestra «Ninguno» seleccionado, no «sin elegir».
- **CA-8** — Mientras se guarda, el botón Guardar está deshabilitado y dice «Guardando…»: un doble clic (o Enter repetido) **no** crea dos filas.
- **CA-9** — Si Supabase devuelve error (p. ej. un CHECK de la base), el mensaje se muestra en el modal, el formulario conserva lo escrito y el botón vuelve a habilitarse.

### Acciones rápidas

- **CA-10** — Cada récord tiene «Marcar superado» / «Marcar vigente», que cambia solo `vigente` y reordena la lista. Si falla, se muestra el error y el estado visible no cambia.
- **CA-11** — «Borrar» pide confirmación (`confirm`, como el resto del panel), borra la fila y la saca de la lista. Si se cancela, no pasa nada.

### Integración

- **CA-12** — Los cambios del modal quedan en el estado de `MiembrosAdmin`: al cerrarlo y volver a abrirlo, sin recargar, se ven actualizados, y los de un miembro no aparecen en el de otro.
- **CA-13** — El resto del panel de miembros (editar, galería de trofeos, borrar miembro) funciona igual que antes.

## 5. Pruebas requeridas

- [ ] **Unidad** `tests/unidad/records-form.test.ts`:
  - `validarRecord`: particiones válidas e inválidas de cada campo de CA-4; alcance `''` vs `'ninguno'`; límites de año `1949`/`1950`/`2100`/`2101`; tiempo `''`, `0`, `0.001`, `0.0001`, `-1`, `99999.999`, `100000`, `'abc'`; velocidad `''`, `0.01`, `0.001`, `9999.99`, `10000`; URL `https://…`, `HTTP://…`, `ftp://…`, `javascript:…`, vacía
  - separador decimal: `'9,874'`, `'9.874'`, `' 9.874 '`, `'1.234,5'`
  - `aFilaRecord`: vacíos → `null`; recorte de espacios; `'ninguno'` → `null`; velocidad vacía con unidad mph → unidad `null`
  - `formDesdeRecord` → `aFilaRecord` devuelve los mismos datos (ida y vuelta) para: tiempo + velocidad nacional, solo tiempo, hito sin alcance, hito nacional
- [ ] Seguridad: nada nuevo (la RLS de `records` la prueba T-001).
- [ ] Humo: nada nuevo (`/admin/miembros` ya se prueba sin sesión).
- [ ] **Verificación manual** (evidencia en la entrega): con el **Supabase local compartido** de la sección 8 y `npm run dev -- -p 3002`, un usuario admin local y un miembro. Recorré: alta con tiempo y velocidad, alta de un hito que suma, alta de un hito que no suma, quitar la velocidad a uno que la tenía, marcar superado, borrar y un error de validación. Describí lo que viste; si no pudiste levantarlo, decilo y **no** lo marques como hecho.

## 6. Defectos a corregir (solo rondas de fix)

**Ronda 2** — de `reporte-qa-r1.md` (veredicto FAIL). Leé cada defecto completo en el reporte (pasos, evidencia y sugerencia).

| ID | Sev | Resumen | Esperado |
| -- | --- | ------- | -------- |
| T-002-D01 | S1/P1 | Una respuesta tardía de A, llegada con el modal de B abierto, reemplaza la lista de B; al editar ahí, `aFilaRecord(form, miembro.id)` reasigna el récord de A a B | (a) Toda actualización de estado se aplica **por id de miembro** sobre el estado más reciente: `setMiembros(ms => ms.map(m => m.id === miembroId ? … : m))` y el modal abierto solo se toca si `recordsDe?.id === miembroId`. (b) **Editar nunca cambia el dueño**: el UPDATE usa el `miembro_id` del récord editado (no el del modal) y filtra `.eq('id', …).eq('miembro_id', …)`. (c) Una respuesta que llega después de cerrar el modal o de cambiar de borrador **no toca** el formulario ni el error del modal actual (riesgo `setForm(null)` tras Cancelar, sección Riesgos del reporte). |
| T-002-D02 | S2/P1 | Dos acciones rápidas capturan el mismo array `records` y la última respuesta restaura el estado viejo de la otra fila | Cada respuesta se aplica **por id de récord** sobre el estado más reciente (setState funcional), nunca reconstruyendo la lista desde un snapshot capturado. Alta, edición, superado/vigente y borrado. Tras una acción exitosa se limpia el error anterior de acciones rápidas. |
| T-002-D03 | S3/P2 | El mensaje de validación/error queda fuera de la vista al enviar desde abajo | Al fallar la validación o la base, el mensaje queda visible sin desplazarse a mano: p. ej. `role="alert"` + `scrollIntoView` del mensaje (o mostrarlo junto a los botones). Vale para CA-4 y CA-9. |
| T-002-D04 | S3/P2 | `type="number" min/max` dispara la validación nativa del navegador antes de `validarRecord` | `noValidate` en el formulario (o equivalente) para que **siempre** se vean los mensajes en español del contrato. No pierdas `required` visual si lo usás como pista, pero la validación la hace `validarRecord`. |
| T-002-D05 | S4/P3 | Un hito muestra «—» en la columna Marca | Celda vacía cuando `formatearMarca` es null, como dice CA-2. |

**Pruebas nuevas obligatorias (regresión):** extraé la lógica de actualización de listas a funciones puras en `lib/records-form.ts` (p. ej. `aplicarGuardado(lista, fila)` que reemplaza o inserta por id y reordena con `ordenarRecords`, `aplicarBorrado(lista, id)`, y la de actualizar un miembro por id dentro de la lista de miembros) y probalas en `tests/unidad/records-form.test.ts` con los escenarios de D01 (respuesta de A aplicada con B abierto: B no cambia) y D02 (dos respuestas en ambos órdenes sobre el mismo estado inicial: ambas quedan; borrado + actualización concurrente: la fila borrada no reaparece). Sin mocks de base: son funciones puras sobre arrays.

**Ronda 3 (la última permitida)** — hallazgos del PM en `pruebas-pm-r2.txt`. D01–D05 quedaron confirmados como corregidos en interfaz; no los toques salvo que el fix de N1/N2 lo exija.

| ID | Sev | Resumen | Esperado |
| -- | --- | ------- | -------- |
| T-002-D06 (N1) | S2/P1 | El alta deja el modal en «Guardando…» para siempre aunque la fila se guarda; reproducible en `next dev` | Tras un alta o edición exitosa el formulario se cierra y la fila aparece en la lista; tras un error se ve el mensaje y el botón se rehabilita. Hipótesis del PM (verificala antes de corregir): `montadoRef` nunca vuelve a `true` después del doble montaje de React StrictMode (`RecordsModal.tsx:76-81`). El fix tiene que funcionar **con StrictMode** (no lo desactives) y no reabrir D01. |
| T-002-D07 (N2) | S3/P2 | Dos envíos antes del re-render insertan dos filas: la guardia usa el estado `guardando` (`RecordsModal.tsx:118`) | Guardia síncrona (p. ej. `useRef`) que impide un segundo envío mientras hay uno en curso, incluido el mismo tick; el botón sigue mostrándose deshabilitado con «Guardando…». |

**Cómo verificar vos (sin navegador):** reproducí N1 con un test que monte el ciclo de vida del efecto: extraé la lógica de «¿esta respuesta todavía debe aplicarse?» a una función o hook pequeño y probá que después de *montar → desmontar → montar* (lo que hace StrictMode) una respuesta del borrador vigente **sí** se aplica, y que tras desmontar de verdad **no**. Para N2, una función pura o un test del guard que demuestre que dos llamadas seguidas antes de resolver la primera solo disparan una escritura. La verificación en interfaz la repite el PM.

Fuera de esta ronda: O-2 (scroll horizontal de tablas) queda como riesgo a verificar por el PM; la gramática `.5`/`5.` y URL sin host no se cambian.

## 7. Definición de hecho

- [ ] Todos los CA cumplidos, cada uno con su test o evidencia
- [ ] `npx next typegen && npx tsc --noEmit` limpio
- [ ] `npm run lint` limpio
- [ ] `npm test` verde
- [ ] `npm run build` pasa
- [ ] Commits convencionales (`feat(admin): …`, `test(admin): …`), archivos stageados por nombre, en la rama correcta
- [ ] Working tree limpio
- [ ] `entrega-dev.md` escrita en esta carpeta y commiteada
- [ ] Sin push, sin PR, sin `db push`, sin tocar `app/(sitio)/` ni `lib/records.ts`

## 8. Entorno local compartido (lo provee el PM — gana sobre cualquier otra instrucción de entorno)

T-002 y T-003 corren **en paralelo** contra **una sola** instancia de Supabase
local, que ya está levantada con las migraciones 0001–0013 de esta épica.

- **Prohibido** `npx supabase start`, `stop`, `db reset`, `db push` o cualquier `drop`/`truncate`: reiniciarla borra el trabajo del otro dev.
- Variables y usuarios de prueba: `/private/tmp/claude-501/-Users-oliverinfante-orca-workspaces-lainfanteria-next-hippocamp/c344ea39-f52e-43cc-9a51-5bd9d8bac39a/scratchpad/sb-gate/local-dev.env` (no lo copies al repo ni lo commitees). Levantá el sitio así:
  ```bash
  set -a; source /private/tmp/claude-501/-Users-oliverinfante-orca-workspaces-lainfanteria-next-hippocamp/c344ea39-f52e-43cc-9a51-5bd9d8bac39a/scratchpad/sb-gate/local-dev.env; set +a
  npm run dev -- -p 3002      # el 3000 lo ocupa otro proyecto
  ```
  Las variables del shell ganan sobre `.env.local`, que apunta a producción: **nunca** corras `npm run dev` sin cargar ese archivo antes.
- Datos de prueba: todo lo que crees (miembros, slugs, récords) con el prefijo **`t002-`** en `slug` y `titulo`, para no chocar con el otro dev. Si cargás por SQL: `docker exec -i supabase_db_lainfanteria-next psql -U postgres -d postgres` y **solo `insert`/`update`/`delete` de filas con tu prefijo**.
- Al terminar no borres tus datos: el PM y QA los usan para verificar.
