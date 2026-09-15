# T-002 — Récords en el panel: alta, edición y baja

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/records-panel` |
| Worktree | `<ruta absoluta>` |
| Base | `oliver132123/records-schema` |
| Tipo | feat |
| Migración | No |
| Ronda | 1 |

**Antes de empezar leé `docs/pm/contexto.md` entero** y después
`docs/pm/backlog/EPICA-records.md`. Sus reglas ganan sobre este brief.

## 1. Por qué

Con la tabla `records` creada (T-001), Oliver necesita cargar los récords sin
entrar al panel de Supabase. Todo el contenido del sitio se carga desde `/admin`;
los récords no pueden ser la excepción.

## 2. Alcance

**Dentro:**
- Botón **«Récords»** en cada fila de la tabla de miembros del panel
- Modal `RecordsModal.tsx`: lista de récords del miembro + formulario de alta/edición + borrar + marcar superado/vigente
- Validación del formulario como funciones puras en `lib/records-form.ts`, con tests
- La consulta del panel trae los récords

**Fuera (no tocar aunque parezca relacionado):**
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

- **CA-1** — Dado un miembro en la tabla del panel, cuando se hace clic en «Récords», entonces se abre un modal con el nombre del miembro y sus récords en el orden de `ordenarRecords` (T-001).
- **CA-2** — Cada récord de la lista muestra: la marca con `formatearMarca`, disciplina, categoría (si hay), `NOMBRE_ALCANCE`, fecha con `fechaLogro` (si hay) y un indicador **VIGENTE** o **SUPERADO**.
- **CA-3** — Dado un miembro sin récords, entonces el modal muestra un estado vacío con el texto «Todavía no tiene récords cargados.» y el formulario de alta disponible.

### Formulario

Campos: disciplina*, categoría, valor*, unidad* (select: Segundos / km/h / mph), alcance* (select, por defecto Nacional), auto, lugar, año, mes (select), vigente (checkbox, por defecto marcado), fuente (URL).

`lib/records-form.ts` exporta:

```ts
export interface FormRecord { /* todos los campos como string/boolean, tal como salen del form */ }
export function formVacio(): FormRecord;
export function formDesdeRecord(r: RecordDeportivo): FormRecord;
export function validarRecord(form: FormRecord): string | null; // null = válido; si no, el mensaje a mostrar
export function aFilaRecord(form: FormRecord, miembroId: number): Omit<RecordDeportivo, 'id' | 'creado_en'>;
```

- **CA-4** — `validarRecord` devuelve un mensaje en español, y el panel lo muestra sin llamar a la base, cuando:
  - disciplina vacía o solo espacios → «Escribí la disciplina del récord.»
  - valor vacío, no numérico, ≤ 0, mayor que `99999.999` (límite de `numeric(8,3)`) o con más de 3 decimales → «El valor tiene que ser un número mayor que cero, con hasta 3 decimales.»
  - mes sin año → «Si ponés el mes, poné también el año.»
  - año fuera de 1950–2100 o no entero → «El año tiene que estar entre 1950 y 2100.»
  - fuente no vacía que no empieza con `http://` o `https://` → «La fuente tiene que ser un enlace http(s).» — en particular `javascript:alert(1)` es inválida
- **CA-5** — El valor acepta **coma o punto** como separador decimal (`'9,874'` y `'9.874'` → `9.874`) y espacios alrededor. No acepta separador de miles (`'1.234,5'` es inválido).
- **CA-6** — `aFilaRecord` recorta espacios; convierte textos opcionales vacíos a `null`; `anio`/`mes` vacíos a `null`; `valor` a `number`.
- **CA-7** — Dado un formulario válido, cuando se guarda un alta, entonces se inserta en `records` y el récord aparece en la lista en su posición ordenada **sin recargar la página**. Al editar, se actualiza esa fila (`.eq('id', …)`) y la lista refleja el cambio.
- **CA-8** — Mientras se guarda, el botón Guardar está deshabilitado y dice «Guardando…»: un doble clic **no** crea dos filas.
- **CA-9** — Si Supabase devuelve error (p. ej. un CHECK de la base), el mensaje se muestra en el modal, el formulario conserva lo escrito y el botón vuelve a habilitarse.

### Acciones rápidas

- **CA-10** — Cada récord tiene «Marcar superado» / «Marcar vigente», que cambia solo `vigente` y reordena la lista. Si falla, se muestra el error y el estado visible no cambia.
- **CA-11** — «Borrar» pide confirmación (`confirm`, como el resto del panel), borra la fila y la saca de la lista. Si se cancela, no pasa nada.

### Integración

- **CA-12** — Los cambios del modal quedan en el estado de `MiembrosAdmin`: al cerrarlo y volver a abrirlo, sin recargar, se ven los récords actualizados.
- **CA-13** — El resto del panel de miembros (editar, galería de trofeos, borrar miembro) funciona igual que antes.

## 5. Pruebas requeridas

- [ ] **Unidad** `tests/unidad/records-form.test.ts`:
  - `validarRecord`: particiones válidas e inválidas de cada campo de CA-4; límites de año `1949`/`1950`/`2100`/`2101`; valor `0`, `0.001`, `0.0001`, `-1`, `99999.999`, `100000`, `''`, `'abc'`; URL `https://…`, `HTTP://…`, `ftp://…`, `javascript:…`, vacía
  - separador decimal: `'9,874'`, `'9.874'`, `' 9.874 '`, `'1.234,5'`
  - `aFilaRecord`: vacíos → `null`, recorte de espacios
  - `formDesdeRecord` → `aFilaRecord` devuelve los mismos datos (ida y vuelta)
- [ ] Seguridad: nada nuevo (la RLS de `records` la prueba T-001).
- [ ] Humo: nada nuevo (`/admin/miembros` ya se prueba sin sesión).
- [ ] **Verificación manual** (evidencia en la entrega): con `npx supabase start` en tu worktree (aplica las migraciones en local, requiere Docker), `npm run dev` apuntando a la base local, un usuario admin local y un miembro: alta, edición, superado, borrado y un error de validación. Describí lo que viste; si no pudiste levantarlo, decilo y **no** lo marques como hecho.

## 6. Defectos a corregir (solo rondas de fix)

No aplica en ronda 1.

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
