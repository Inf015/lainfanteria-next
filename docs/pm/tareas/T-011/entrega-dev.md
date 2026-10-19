# Entrega T-011 — ronda 2

**Estado:** LISTA PARA QA

En esta ronda se corrigen **T-011-D01**, **T-011-D02** y **T-011-D03** de
`reporte-qa-r1.md`, según la §7 de `brief-dev.md`. De D01 se corrigió la
**clase**, no solo la instancia. No se tocó nada más: ni la migración 0014,
ni `AutosAdmin.tsx`, `ProductosAdmin.tsx`, `lib/datos.ts` o la 0012.

En las referencias, `SubirFotos.tsx` es
`app/(admin)/(panel)/admin/_componentes/SubirFotos.tsx`.

## Defecto → fix → prueba

| Defecto | Fix | Test / evidencia |
| ------- | --- | ---------------- |
| **D01 (S2/P1)**: dos subidas superpuestas liberaban el bloqueo antes de tiempo, y la segunda publicaba una lista vieja | **Una sola guardia síncrona para las cuatro operaciones.** El candado vive en `lib/galeria.ts:74-122` (`crearCandado`, `enExclusiva`) y lo usan subir, mover, ★ y borrar desde `SubirFotos.tsx:93` (`exclusiva`). Mientras hay una operación en vuelo, cualquier otra se rechaza con el aviso de error que ya existía, **otra subida incluida**. Desaparecieron `ocupadoRef`, `empezar/terminar` y `bloqueado = ocupado \|\| subiendo > 0`. `ocupado` (`:80`) es solo el espejo del candado para el render; `subiendo` quedó únicamente para el texto «Subiendo N fotos…» | `tests/unidad/galeria.test.ts` › `crearCandado` (2) y `enExclusiva` (5), entre ellas «dos subidas superpuestas: la segunda se rechaza y no corre (T-011-D01)» y «el candado sigue tomado hasta que la operación TERMINA…». **Mutaciones comprobadas** (abajo): soltar el candado antes de que la operación termine → 5 fallan; candado no exclusivo → 5 fallan. La integración con el componente se verifica a mano: *Reproducción manual de D01* |
| **D02 (S3/P3)**: la prueba de seguridad pasaba en vacío | `leer()` exige `r.ok` (`tests/seguridad/rls.test.ts:220`). Busca un auto con **≥ 2 fotos** visibles para anon; si no hay ninguno, **falla** con «Precondición: hace falta al menos un auto con 2 o más fotos…» (`:246`). Los ids van en el **orden visible invertido**, que con dos o más ids distintos siempre difiere del actual, así que un `200` cambiaría el orden de verdad | No la corrí: va contra producción y ahí la 0014 no existe. La corre el PM contra la base local sembrada |
| **D03 (S3/P2)**: si el bucket lanzaba, la foto borrada seguía en pantalla | En `borrarFila` (`SubirFotos.tsx:257`), después de un DELETE exitoso, `onCambio(quedaron)` va en un `finally` (`:305-306`). La RPC ya tenía su `catch`; el bucket ahora también (`console.error`: un huérfano en Storage es inofensivo). **Elegí `finally` y no publicar antes del bucket** por dos razones: mantiene el orden de CA-9 (DELETE → RPC → bucket) y garantiza que la lista publicada sea la final, normalizada si la RPC salió bien y con los valores reales si falló | Sin prueba de unidad: aislarlo exigiría sustituir el DELETE, la RPC y el bucket por dobles, y eso es mockear la capa de datos. Se verifica a mano: *Reproducción manual de D03* |

## D01: la clase, operación por operación

Todas las operaciones arman la lista que publican a partir del `fotos` que
había al empezar. Eso solo es correcto si nadie cambia la galería mientras la
operación está en vuelo, y eso es justo lo que garantiza el candado. El
comentario de la cabecera del componente (`SubirFotos.tsx:56-63`) lo explica,
y cada operación repite su caso:

| Operación | `onCambio` | Por qué la lista no puede ser vieja |
| --------- | ---------- | ----------------------------------- |
| `subirArchivos` (`:118`) | `:173`, en `finally`: `[...fotos, ...nuevas]` | El candado está tomado desde antes del primer `await` hasta después de publicar. Una segunda subida rebota en `exclusiva` y ni siquiera arranca. Además, la publicación pasó al `finally`: si algo lanza a mitad de camino, las filas que ya se insertaron igual se muestran (antes quedaban en la base, invisibles en el panel) |
| `mover` (`:192`) | `:199` optimista; `:210` y `:214` vuelven a `anterior` | `anterior` es el `fotos` capturado al empezar. La RPC recibe la galería entera y, si falla, no cambia nada, así que `anterior` sigue siendo lo que hay en la base. Nadie más publica en el medio |
| ★ | igual que `mover` | Es `mover(i, 0)` |
| `borrar` / `borrarFila` (`:233`, `:257`) | `:306`, en `finally` | `restantes` sale del `fotos` capturado al empezar, y el candado está tomado hasta después del `finally`. Si ya hay una operación en vuelo antes de preguntar, `borrar` rechaza con el aviso (`:234`). `confirm()` frena el hilo, así que entre la pregunta y `exclusiva` no puede arrancar otra operación |

La guardia es **síncrona**. `tomar()` marca el candado en el mismo tick del
clic o del drop; no espera al render como un estado de React (lo prueba «toma
el candado en el acto, sin esperar un tick (doble clic)»). Mover sobre un
destino no válido, o al mismo lugar, sale antes de tomar el candado (`:195`) y
no muestra aviso.

**Residuo que dejo anotado:** entre que una operación suelta el candado y React
vuelve a renderizar con el `fotos` nuevo pasan unos milisegundos. En ese
intervalo, los manejadores del DOM son los del render anterior. Los botones y
el arrastre de miniaturas están deshabilitados en ese render (`ocupado` era
`true`: `:327`, `:360-392`), así que solo quedaría expuesto un archivo soltado
en la zona de subida justo en esos milisegundos. No lo cubrí: hacerlo exigiría
otra fuente de verdad para la lista, y eso es lo que la §7 pide evitar. Si QA
lo considera defecto, lo charlamos.

## Mutaciones (salida real)

Se aplicaron sobre `lib/galeria.ts` y después se restauró el archivo,
comprobado con `cmp` contra una copia.

```
# 1. Soltar el candado sin esperar la operación (la clase de D01):
#    `await operacion();` → `void operacion();`
$ npx vitest run tests/unidad/galeria.test.ts
     × toma el candado en el acto, sin esperar un tick (doble clic)
     × dos subidas superpuestas: la segunda se rechaza y no corre (T-011-D01)
     × el candado sigue tomado hasta que la operación TERMINA, no cuando arranca otra
     × una operación que lanza suelta el candado y propaga el error
     × un rechazo no suelta el candado de la operación que sí está en vuelo
      Tests  5 failed | 19 passed (24)

# 2. Candado no exclusivo: se borra `if (tomado) return false;`
     × se toma una sola vez hasta que se suelta
     × avisa cada transición, y soltar dos veces no avisa dos veces
     × dos subidas superpuestas: la segunda se rechaza y no corre (T-011-D01)
     × el candado sigue tomado hasta que la operación TERMINA, no cuando arranca otra
     × un rechazo no suelta el candado de la operación que sí está en vuelo
      Tests  5 failed | 19 passed (24)

restaurado → Tests  24 passed (24)
```

Límite honesto, el mismo que señaló QA en r1: estas pruebas cubren la guardia,
no que el componente la use. Si se revierte `SubirFotos.tsx` y se deja
`lib/galeria.ts`, siguen verdes. Esa parte se cubre con revisión del código y
con las dos reproducciones manuales de abajo.

## Reproducción manual de D01 (para el PM)

Local, con la 0014 aplicada, logueado como admin, en `/admin/autos` editando
un auto con dos fotos `[a, b]`. En DevTools → Network, perfil «Slow 3G» o
throttling personalizado. Hacen falta dos imágenes grandes, A y B.

1. Elegir la imagen A con «Arrastrá fotos acá o hacé clic».
   - Esperado: «Subiendo 1 foto…», y ◀ ★ ▶ ✕ deshabilitados.
2. Mientras A sigue subiendo, soltar la imagen B sobre la zona de subida (o
   volver a hacer clic y elegirla).
   - Esperado: aparece el aviso «Hay una operación de la galería en curso.
     Esperá a que termine y volvé a intentar.».
   - En Network **no** sale ningún `POST …/storage/v1/object/fotos/…` para B.
3. Mientras A sigue subiendo, intentar arrastrar `b` sobre `a`.
   - Esperado: no se puede arrastrar (`draggable=false`) y no sale ningún
     `rpc/reordenar_fotos`.
4. Dejar terminar A.
   - Esperado: la grilla queda `[a, b, A]` y los controles se rehabilitan.
5. Reordenar a `[b, a, A]` con ◀ sobre `b`, y esperar el `200` de
   `rpc/reordenar_fotos`.
6. Subir B.
   - Esperado: la grilla queda `[b, a, A, B]`, con `b` como PRINCIPAL.
7. Recargar la página.
   - Esperado: el mismo `[b, a, A, B]`, con `b` como principal y
     `orden` = 0, 1, 2, 3 (`select id, orden, es_principal from auto_fotos where auto_id = … order by orden`).

Antes del fix, en el paso 2 B arrancaba igual, y en el paso 6 la grilla volvía
a `[a, b, B]`: se perdía A y se deshacía el reordenamiento.

Variantes con el mismo resultado esperado (una sola operación por vez):

- doble clic rápido en ◀: un solo `rpc/reordenar_fotos`;
- ✕ mientras corre una RPC de orden (con «Slow 3G»): aviso de operación en
  curso, sin `confirm`.

## Reproducción manual de D03 (para el PM)

Hace falta que el bucket **lance**; un error devuelto por la API no alcanza,
porque `borrarDelBucket` ya lo registraba sin lanzar. La forma más simple es
bloquear el pedido:

1. Local, admin, auto con fotos `[a, b, c]`. En DevTools → Network → clic
   derecho sobre cualquier pedido → «Block request URL», con el patrón
   `*/storage/v1/object/fotos*` (que bloquee el `DELETE` del bucket, no el
   REST de la tabla).
2. Clic en ✕ sobre `a` y aceptar el `confirm`.
3. Esperado:
   - `DELETE …/rest/v1/auto_fotos?id=eq.<a>` → `204`;
   - `rpc/reordenar_fotos` → `200`;
   - el pedido al bucket aparece como bloqueado;
   - la grilla queda `[b, c]`, con `b` como PRINCIPAL;
   - en la consola: «No se pudo liberar … del bucket: …» (o el
     `console.error` de `borrarDelBucket`, según cómo falle el cliente);
   - sin aviso rojo, y los controles se rehabilitan.
4. Recargar: `[b, c]`, con `b` principal. El objeto de `a` queda huérfano en
   el bucket, como está documentado.

Variante RPC: bloquear `*/rest/v1/rpc/reordenar_fotos*` y borrar `a`.
Esperado: aviso «La foto se borró, pero no se pudo reordenar la galería: …»,
`a` desaparece de la grilla y `b`/`c` quedan con sus valores reales (sin
principal si `a` lo era: es el riesgo aceptado de borrado no atómico).

Antes del fix, con el bucket bloqueado, la excepción cortaba antes de
`onCambio` y `a` seguía en pantalla aunque la fila ya no existiera.

## Commits

```
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

Los tres primeros son de esta ronda. Falta el de esta entrega, que va arriba de
todo.

**Pre-commit:** `fd568ba` se hizo con `ALLOW_COMMIT=1`, autorizado por el PM
para este caso. El hook marcó la clave ficticia preexistente del test de
registro cerrado en `tests/seguridad/rls.test.ts` (ahora en la línea 295; está
en `origin/main` desde `9f08002`). Comprobé que el diff stageado no la
contenía: `git diff --cached | grep -c` dio `0`. Ningún otro commit de esta
ronda disparó el hook.

## Verificación (salida real, ronda 2)

```
$ npx next typegen
✓ Types generated successfully          (exit 0)
$ npx tsc --noEmit
(sin salida — exit 0)
$ npm run lint
> eslint
(sin salida — exit 0)
$ npm test
 Test Files  12 passed (12)
      Tests  260 passed (260)           (exit 0)
$ npm run build
✓ Compiled successfully in 558ms
  Finished TypeScript in 1517ms
✓ Generating static pages using 7 workers (24/24) in 983ms
exit 0
$ grep -c '\[supabase\]' build.log
0
```

En r1 había 253 pruebas y ahora hay 260: se sumaron las 7 nuevas de
`crearCandado` y `enExclusiva`. No se corrieron `test:seguridad` (va contra
producción, sin la 0014) ni `test:navegador` (el brief lo excluye).

## Migraciones

Sin cambios en esta ronda. Sigue valiendo lo de r1:
`0014_reordenar_fotos.sql` — **REQUIERE db push ANTES del merge**. Para
revertir: `drop function reordenar_fotos(text, bigint, bigint[])`.

## Decisiones tomadas

- **El candado es un objeto creado una sola vez con `useState(() => crearCandado(setOcupado))`**, no un `useRef`. Así no se lee ni se escribe un ref durante el render, y `setOcupado` es estable.
- **Un solo aviso para cualquier rechazo por operación en curso**, el mismo para las cuatro operaciones. Al rechazar una subida, además, se vacía el `<input type="file">`, para que elegir el mismo archivo otra vez vuelva a disparar `onChange`.
- **`subirArchivos` ahora atrapa una excepción a mitad de camino** («Se cortó la subida: …») y publica las filas ya insertadas en el `finally`. Antes, la excepción subía sin manejar y esas filas quedaban en la base, invisibles en el panel. Es la misma familia que D01/D03 (la lista local deja de reflejar la base); lo menciono porque cambia el texto de error en ese caso.
- **No toqué el DELETE que lanza** (en lugar de devolver `error`). Ahí no se sabe si la fila se borró; la lista no se publica y la excepción sigue sin manejarse, como antes de T-011. D03 se limita a «después de un DELETE exitoso».

## Fuera de alcance que vi (no tocado)

Lo mismo que en r1: galerías viejas sin principal, `orden` repetidos en
galerías viejas, CSS compartido con `SubirFotoUnica`, INSERT concurrente
desde otra pestaña, y `marcar_foto_principal` sin uso. Además:

- **Riesgo (no verificado en ejecución):** si se cambia de auto en el modal
  mientras hay una operación en vuelo, `SubirFotos` no se remonta (no tiene
  `key`). La operación termina publicando con el `onCambio` que capturó al
  empezar, y `AutosAdmin.actualizarFotos` arma `{ ...editando, auto_fotos }`
  con el `editando` de esa clausura: es decir, podría volver a poner el auto
  anterior en el modal. Con las subidas ya pasaba antes de T-011. La solución
  natural es `key={editando.id}` sobre `<SubirFotos>` en `AutosAdmin.tsx` y
  `ProductosAdmin.tsx`, archivos que esta tarea no puede tocar.

## Preguntas / bloqueos

Ninguno.
