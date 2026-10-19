# Entrega T-011 — ronda 3

**Estado:** LISTA PARA QA

Esta ronda corrige solo **T-011-D01 (r3)**, el caso que quedó PARTIAL en
`reporte-qa-r2.md` y que el PM reprodujo en el navegador (`pruebas-pm-r3.txt`):
con una subida en vuelo, cerrar y reabrir el mismo auto dejaba la ★
habilitada, y al terminar la subida la pantalla mostraba una principal
distinta de la de la base. D02 y D03 ya estaban FIXED y no se tocaron. Tampoco
se tocó la migración 0014.

Referencias: `SubirFotos.tsx` es
`app/(admin)/(panel)/admin/_componentes/SubirFotos.tsx`; `AutosAdmin.tsx` y
`ProductosAdmin.tsx` están en `autos/` y `productos/` del mismo panel.

## Defecto → fix → prueba

| Defecto | Fix | Test / evidencia |
| ------- | --- | ---------------- |
| **D01 (r3), parte (a)**: el candado era de la instancia de `SubirFotos`. Cerrar el modal la desmontaba y al reabrir se montaba otra con el candado libre | **El candado ahora es de la galería.** Hay un registro a nivel de módulo, `candadosDeGaleria` (`lib/galeria.ts:191`), creado por `crearRegistroCandados` (`:151`) e indexado por `claveGaleria(tabla, registroId)` (`:147`). Cada instancia pide su candado con esa clave (`SubirFotos.tsx:91`, `:108`, `:248`) y lee si está ocupado con `useSyncExternalStore` (`:97`). Por eso, una instancia montada al reabrir ve la galería ocupada mientras la operación de la instancia vieja siga en vuelo, y se rehabilita cuando esa operación suelta el candado. Desmontarse solo desuscribe: **no suelta el candado**. Desapareció el `useState(() => crearCandado(setOcupado))` por instancia | `tests/unidad/galeria.test.ts` › `claveGaleria` (1) y `crearRegistroCandados` (8), entre ellos: «dos instancias de la misma galería comparten el candado (cerrar y reabrir el modal)», «galerías distintas no se bloquean entre sí», «una excepción lo libera para todas las instancias», «desuscribirse no lo libera…». **Mutaciones abajo**: las tres hacen fallar al menos un test |
| **D01 (r3), parte (b)**: el padre aplicaba la publicación con una copia vieja de `editando` | **Solo `actualizarFotos`**, en `AutosAdmin.tsx:190` y `ProductosAdmin.tsx:167`. Ahora usa actualizaciones funcionales con el `id` del registro de la galería: `setEditando(prev => prev?.id === id ? { ...prev, auto_fotos } : prev)` y `setAutos(prev => prev.map(a => a.id === id ? { ...a, auto_fotos } : a))`; igual en productos. El `id` sale del `editando` de la clausura que recibió la galería al montarse, o sea, el de su propio registro | Revisión de código. `git diff` de esos dos archivos tiene **un solo hunk cada uno, dentro de `actualizarFotos`** (`@@ -189,9 +189,18 @@` y `@@ -166,9 +166,18 @@`). Sin test de unidad: son estados de React dentro del componente, y montarlo exige jsdom y una librería de render que el repo no tiene. Se verifica a mano (abajo) |

### Por qué hacen falta las dos partes

- **Solo (a):** la secuencia del PM queda cerrada. Con el modal reabierto, la ★
  está deshabilitada hasta que termina la subida, y la subida publica sobre una
  galería que nadie pudo cambiar. Pero si al terminar está abierto **otro**
  auto, el `actualizarFotos` viejo hacía `setEditando({ ...autoViejo, auto_fotos })`
  y metía el auto viejo en el modal del auto nuevo.
- **Solo (b):** la publicación va a la fila correcta, pero al reabrir el mismo
  auto el candado estaría libre otra vez, y la ★ sobre la galería en vuelo
  volvería a producir la principal distinta de la base.

### Recorrido de la secuencia del PM con el fix

Galería `[c*, s]`, con la subida A en vuelo:

1. **Cerrar.** La instancia se desmonta y se desuscribe. El candado de
   `auto_fotos:<id>` sigue tomado.
2. **Reabrir el mismo auto.** `abrirEdicion(a)` toma `a` de `autos`, que
   todavía es `[c*, s]`. La instancia nueva lee `tomado = true`, así que ◀ ★ ▶ ✕
   quedan deshabilitados y el arrastre también.
3. **Termina A.** El `onCambio` viejo publica `[c*, s, A]`. `actualizarFotos`
   la aplica a la fila `<id>` de `autos` y, como `editando` es el mismo auto,
   también al modal. Al soltarse el candado, la instancia nueva recibe el aviso
   y rehabilita los controles.
4. **★ sobre `s`.** La pantalla y la base quedan las dos en `[s*, c, A]`.

## Mutaciones (salida real)

Cada mutación se aplicó sobre `lib/galeria.ts` y después se restauró el
archivo, comprobado con `cmp` contra una copia. Con el archivo restaurado:
`Tests  33 passed (33)`.

```
# 1. Candado por instancia: cada pedido al registro crea uno nuevo
#    `let c = candados.get(clave);` → `let c: Candado | undefined = undefined;`
$ npx vitest run tests/unidad/galeria.test.ts
     × dos instancias de la misma galería comparten el candado (cerrar y reabrir el modal)
      Tests  1 failed | 32 passed (33)

# 2. La clave ignora registroId
#    return `${tabla}:${registroId}`  →  return `${tabla}`
     × distingue el registro padre y la tabla
     × galerías distintas no se bloquean entre sí
     × avisa a todos los suscriptores de esa galería, y solo de esa
      Tests  3 failed | 30 passed (33)

# 3. (extra) Desuscribirse suelta el candado
#    en el cierre de `suscribir`: + candados.get(clave)?.soltar();
     × desuscribirse no lo libera: el componente se desmonta, la operación sigue
      Tests  1 failed | 32 passed (33)
```

Límite, el mismo de r2: estas pruebas cubren el registro, no que
`SubirFotos.tsx` y los padres lo usen bien. Esa parte se verifica con revisión
del código y con las reproducciones de abajo.

## Reproducción manual para el PM

Local, con la 0014 aplicada y logueado como admin. En DevTools → Network,
throttling lento (o el mismo método de `pruebas-pm-r3.txt` para dejar la
subida pendiente antes del INSERT). Repetir todo en `/admin/productos`.

**R1: cerrar y reabrir el mismo auto** (la secuencia que falló en r2):

1. Auto X con `[c*, s]`. Elegir la imagen A y, mientras sube, apretar **Cerrar**.
2. Reabrir el auto X **antes** de que termine A.
   - Esperado: ◀ ★ ▶ ✕ deshabilitados y las miniaturas no se pueden arrastrar.
   - Soltar o elegir otra imagen muestra el aviso «Hay una operación de la
     galería en curso…».
3. Dejar terminar A.
   - Esperado: la grilla muestra `[c*, s, A]` sin recargar y los controles se
     rehabilitan.
4. ★ sobre `s`.
   - Esperado: pantalla y base `[s*, c, A]`.
   - Consulta: `select id, orden, es_principal from auto_fotos where auto_id = X order by orden`.
5. Recargar. Esperado: lo mismo.

**R2: cerrar y abrir otro auto:**

1. Auto X con `[c*, s]` y auto Y con `[y1*]`. En X, elegir A y apretar Cerrar
   mientras sube.
2. Abrir Y.
   - Esperado: los controles de Y **habilitados**, porque otra galería no
     queda bloqueada.
   - Cambiar algún campo del formulario de Y sin guardar.
3. Dejar terminar A.
   - Esperado: el modal sigue mostrando Y, con su galería `[y1*]` y el
     formulario sin tocar.
   - En la tabla del listado, la columna de cantidad de fotos de X pasa a 3.
4. Cerrar Y y abrir X. Esperado: `[c*, s, A]`, igual que en la base.

Antes del fix, en R1 la ★ estaba habilitada en el paso 2 y el paso 4 dejaba
la pantalla distinta de la base (`pruebas-pm-r3.txt`). En R2, el modal de Y se
reemplazaba por X al terminar la subida.

## Commits

```
80eebe4 fix(admin): actualizarFotos aplica cada publicación a su registro
38cecfb fix(admin): el candado es de la galería y sobrevive al remontaje
3348a93 docs(pm): brief de fix T-011 r3
cac4d12 docs(pm): QA T-011 r2 — FAIL
160eab5 docs(pm): verificación del panel — T-011 r2
7c44922 docs(pm): entrega de dev de T-011 ronda 2
fd568ba test(seguridad): reordenar_fotos exige una galería real de 2+ fotos
2ddcc32 fix(admin): después de un DELETE exitoso la lista siempre refleja el borrado
eb2fa3b fix(admin): una sola guardia síncrona para toda operación de la galería
5b1ddaa docs(pm): brief de fix T-011 r2
9884ec0 docs(pm): QA T-011 r1 — FAIL
4538880 docs(pm): pruebas del PM contra Supabase local — T-011 r1
36c63cb docs(pm): entrega de dev de T-011 ronda 1
a7ae83e test(seguridad): reordenar_fotos cerrada a anon
f82a264 fix(admin): borrar la principal promueve la siguiente
625c77e feat(admin): reordenar fotos de la galería
7d70f6f feat(db): reordenar_fotos
82f21d5 docs(pm): T-011 y T-012 en el tablero
bae88a4 docs(pm): brief T-011
```

Los dos primeros son de esta ronda. Falta el de esta entrega, que va arriba de
todo. Ningún commit de esta ronda disparó el pre-commit, así que no hizo falta
`ALLOW_COMMIT=1`. Su único uso sigue siendo `a7ae83e` y `fd568ba`, por la
clave ficticia preexistente de `rls.test.ts`, documentado en r1 y r2.

## Verificación (salida real, ronda 3)

```
$ npx next typegen
✓ Types generated successfully
$ npx tsc --noEmit
(sin salida — exit 0)
$ npm run lint
> eslint
(sin salida — exit 0)
$ npm test
 Test Files  12 passed (12)
      Tests  269 passed (269)           (exit 0)
$ npm run build
✓ Compiled successfully in 683ms
  Finished TypeScript in 1384ms
✓ Generating static pages using 7 workers (24/24) in 796ms
exit 0
$ grep -c '\[supabase\]' build.log
0
```

En r2 había 260 pruebas y ahora hay 269: se sumaron las 9 nuevas, 1 de
`claveGaleria` y 8 de `crearRegistroCandados`. No se corrieron
`test:seguridad` (la corre el PM contra la base local) ni `test:navegador`
(el brief lo excluye).

## Migraciones

Sin cambios. Sigue valiendo lo de r1: `0014_reordenar_fotos.sql` —
**REQUIERE db push ANTES del merge**. Para revertir:
`drop function reordenar_fotos(text, bigint, bigint[])`.

## Decisiones tomadas

- **El registro es un objeto de módulo y no un Context de React.** Un Provider
  habría que ponerlo en los padres o en el layout, y esos archivos no se pueden
  tocar fuera de `actualizarFotos`. Un módulo vive mientras viva la pestaña, que
  es justamente la vida de una operación en vuelo.
- **`useSyncExternalStore` con `getServerSnapshot = () => false`.** En el
  servidor no hay operaciones en vuelo. `subscribe` va envuelto en
  `useCallback([clave])`, así se vuelve a suscribir solo si cambia la galería.
- **El `id` de `actualizarFotos` sale de la clausura del render en el que se
  montó la galería.** La firma `onCambio(fotos)` y el JSX que pasa la prop
  quedan como estaban; cambiarlos habría tocado los padres fuera de esa
  función.
- **No se borran las entradas del registro.** Queda una por galería que se
  tocó en la sesión: un booleano y un `Set` vacío. Borrarlas agregaba casos
  borde (una vista vieja de un candado ya eliminado) a cambio de nada que se
  note.
- **El texto de la zona de subida de la instancia reabierta no dice «Subiendo…»**:
  ese contador es de la instancia que empezó la subida. Los controles sí se ven
  deshabilitados, y un intento de subir muestra el aviso de operación en curso.

## Fuera de alcance que vi (no tocado)

Lo mismo que en r1 y r2: galerías viejas sin principal, `orden` repetido en
galerías viejas, CSS compartido con `SubirFotoUnica`, INSERT concurrente
desde **otra pestaña** (el registro es por pestaña, así que no la cubre; la
base sigue serializando con `FOR UPDATE` y el advisory lock), y
`marcar_foto_principal` sin uso.

Sigue en pie el residuo anotado en r2: entre que se suelta el candado y React
vuelve a renderizar pasan unos milisegundos. Los botones y el arrastre están
deshabilitados en ese render, pero la zona de subida no.

## Preguntas / bloqueos

Ninguno.
