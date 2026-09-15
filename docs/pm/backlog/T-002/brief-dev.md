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
entrar al panel de Supabase: los de cada miembro y los del equipo, tanto
**marcas** (con cifra) como **hitos** (solo texto). Todo el contenido del sitio
se carga desde `/admin`; los récords no pueden ser la excepción.

## 2. Alcance

**Dentro:**
- Botón **«Récords»** en cada fila de la tabla de miembros del panel
- Botón **«Récords del equipo»** en la cabecera de la página de miembros del panel, que abre el mismo modal sin miembro
- Modal `RecordsModal.tsx`: lista + formulario de alta/edición + borrar + marcar superado/vigente
- Validación del formulario como funciones puras en `lib/records-form.ts`, con tests
- Las consultas del panel traen los récords de cada miembro y los del equipo

**Fuera (no tocar aunque parezca relacionado):**
- `lib/records.ts`, `lib/types.ts`, `lib/datos.ts` — son de T-001. Si te falta algo ahí, **escalá**; no lo agregues
- Cualquier archivo de `app/(sitio)/` — es T-003, que corre **en paralelo**
- `PalmaresModal.tsx` (no se refactoriza para compartir código)
- Una ruta nueva en el panel (`/admin/records`): los del equipo van en el modal
- Foto del récord, subida a Storage
- Migraciones

## 3. Archivos probables

- `app/(admin)/(panel)/admin/miembros/page.tsx` — el `select` de miembros pasa a `'*, palmares:logros(*), records(*)'`, y una segunda consulta trae `records` con `miembro_id is null`
- `app/(admin)/(panel)/admin/miembros/MiembrosAdmin.tsx` — botones y estado del modal
- `app/(admin)/(panel)/admin/miembros/RecordsModal.tsx` (nuevo)
- `lib/records-form.ts` (nuevo)
- `tests/unidad/records-form.test.ts` (nuevo)

Tomá `PalmaresModal.tsx` como referencia de estructura, estilos (`admin.module.css`)
y manejo de errores: el panel tiene que sentirse igual.

## 4. Criterios de aceptación

### Lista

- **CA-1** — Dado un miembro en la tabla del panel, cuando se hace clic en «Récords», entonces se abre un modal titulado con el nombre del miembro y sus récords en el orden de `ordenarRecords` (T-001).
- **CA-2** — Cuando se hace clic en «Récords del equipo», entonces se abre el mismo modal titulado «Récords del equipo» con los récords de `miembro_id` nulo, en el mismo orden.
- **CA-3** — Cada récord de la lista muestra: si `esMarca`, la cifra con `formatearMarca` seguida del título; si es hito, solo el título con la etiqueta **HITO**. Además: categoría (si hay), `NOMBRE_ALCANCE`, fecha con `fechaLogro` (si hay) y un indicador **VIGENTE** o **SUPERADO**.
- **CA-4** — Sin récords, el modal muestra «Todavía no hay récords cargados.» y el formulario de alta disponible.

### Formulario

Campos, en este orden:

| Campo | Marca | Hito |
| ----- | ----- | ---- |
| tipo* (radio o select: Marca / Hito, por defecto Marca) | ✓ | ✓ |
| título* — etiqueta «Disciplina» en marca, «Hito» en hito (textarea en hito) | ✓ | ✓ |
| valor* | ✓ | oculto |
| unidad* (Segundos / km/h / mph) | ✓ | oculto |
| auto | ✓ | oculto |
| categoría, alcance* (por defecto Nacional), lugar, año, mes, vigente (marcado), fuente (URL) | ✓ | ✓ |

`lib/records-form.ts` exporta:

```ts
export interface FormRecord { /* todos los campos como string/boolean, tal como salen del form */ }
export function formVacio(): FormRecord;
export function formDesdeRecord(r: RecordDeportivo): FormRecord;
export function validarRecord(form: FormRecord): string | null; // null = válido; si no, el mensaje a mostrar
export function aFilaRecord(form: FormRecord, miembroId: number | null): Omit<RecordDeportivo, 'id' | 'creado_en'>;
```

- **CA-5** — `validarRecord` devuelve un mensaje en español, y el panel lo muestra sin llamar a la base, cuando:
  - título vacío o solo espacios → «Escribí el título del récord.»
  - **solo en marca:** valor vacío, no numérico, ≤ 0, mayor que `99999.999` (límite de `numeric(8,3)`) o con más de 3 decimales → «El valor tiene que ser un número mayor que cero, con hasta 3 decimales.»
  - **solo en marca:** unidad vacía → «Elegí la unidad de la marca.»
  - mes sin año → «Si ponés el mes, poné también el año.»
  - año fuera de 1950–2100 o no entero → «El año tiene que estar entre 1950 y 2100.»
  - fuente no vacía que no empieza con `http://` o `https://` → «La fuente tiene que ser un enlace http(s).» — en particular `javascript:alert(1)` es inválida
- **CA-6** — En un hito, el valor y la unidad **no se validan** aunque tengan basura: un valor `'abc'` que quedó de cuando el form era marca no bloquea guardar un hito.
- **CA-7** — El valor acepta **coma o punto** como separador decimal (`'9,874'` y `'9.874'` → `9.874`) y espacios alrededor. No acepta separador de miles (`'1.234,5'` es inválido).
- **CA-8** — `aFilaRecord` recorta espacios; convierte textos opcionales vacíos a `null`; `anio`/`mes` vacíos a `null`; `valor` a `number`; `miembro_id` = el recibido (`null` para el equipo). **Si el tipo es hito, `valor`, `unidad` y `auto` salen `null` siempre**, aunque el formulario los tenga cargados (si no, el CHECK de coherencia de la base rechaza la fila).
- **CA-9** — Dado un formulario válido, cuando se guarda un alta, entonces se inserta en `records` y aparece en la lista en su posición ordenada **sin recargar la página**. Al editar, se actualiza esa fila (`.eq('id', …)`) con lo que devuelve la base y la lista refleja el cambio. Editar permite cambiar marca ↔ hito.
- **CA-10** — Mientras se guarda, el botón Guardar está deshabilitado y dice «Guardando…»: un doble clic (o Enter repetido) **no** crea dos filas.
- **CA-11** — Si Supabase devuelve error (p. ej. un CHECK de la base), el mensaje se muestra en el modal, el formulario conserva lo escrito y el botón vuelve a habilitarse.

### Acciones rápidas

- **CA-12** — Cada récord tiene «Marcar superado» / «Marcar vigente», que cambia solo `vigente` y reordena la lista. Si falla, se muestra el error y el estado visible no cambia.
- **CA-13** — «Borrar» pide confirmación (`confirm`, como el resto del panel), borra la fila y la saca de la lista. Si se cancela, no pasa nada.

### Integración

- **CA-14** — Los cambios del modal quedan en el estado de `MiembrosAdmin` (los de cada miembro y los del equipo por separado): al cerrarlo y volver a abrirlo, sin recargar, se ven actualizados. Un récord cargado en el modal del equipo **no** aparece en el de ningún miembro, y viceversa.
- **CA-15** — El resto del panel de miembros (editar, galería de trofeos, borrar miembro) funciona igual que antes.

## 5. Pruebas requeridas

- [ ] **Unidad** `tests/unidad/records-form.test.ts`:
  - `validarRecord` en marca: particiones válidas e inválidas de cada campo de CA-5; límites de año `1949`/`1950`/`2100`/`2101`; valor `0`, `0.001`, `0.0001`, `-1`, `99999.999`, `100000`, `''`, `'abc'`; unidad vacía; URL `https://…`, `HTTP://…`, `ftp://…`, `javascript:…`, vacía
  - `validarRecord` en hito: título solo; valor `'abc'` y unidad vacía no invalidan (CA-6)
  - separador decimal: `'9,874'`, `'9.874'`, `' 9.874 '`, `'1.234,5'`
  - `aFilaRecord`: vacíos → `null`, recorte de espacios; hito con valor/unidad/auto cargados → los tres `null`; `miembroId` `null` se respeta
  - `formDesdeRecord` → `aFilaRecord` devuelve los mismos datos (ida y vuelta), para una marca, un hito y un récord del equipo
- [ ] Seguridad: nada nuevo (la RLS de `records` la prueba T-001).
- [ ] Humo: nada nuevo (`/admin/miembros` ya se prueba sin sesión).
- [ ] **Verificación manual** (evidencia en la entrega): con `npx supabase start` en tu worktree (aplica las migraciones en local, requiere Docker), `npm run dev` apuntando a la base local, un usuario admin local y un miembro. Recorré: alta de marca, alta de hito, pasar una marca a hito editando, un récord del equipo, marcar superado, borrar y un error de validación. Describí lo que viste; si no pudiste levantarlo, decilo y **no** lo marques como hecho.

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
