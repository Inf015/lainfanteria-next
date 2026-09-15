# Entrega T-002 — ronda 2 (fix de `reporte-qa-r1.md`)

**Estado:** LISTA PARA QA

Corrige los 5 defectos de `reporte-qa-r1.md` (veredicto FAIL) siguiendo
`brief-dev.md` sección 6. No se tocó nada fuera de eso: `lib/records.ts`,
`lib/types.ts`, `lib/datos.ts`, `app/(sitio)/`, `PalmaresModal.tsx` y
`page.tsx` quedan intactos.

## Defecto → cambio → test

| Defecto | Cambio | Test |
| --- | --- | --- |
| **T-002-D01** (S1/P1) — respuesta tardía de A contamina el modal de B y permite reasignar el récord al editar | (a) `RecordsModal` ya no arma la lista completa ni la manda por `onCambio`: reporta `onGuardado(miembroId, fila)` / `onBorrado(miembroId, id)` con el **dueño real** del récord (`editando.miembro_id` al editar, no `miembro.id` del modal abierto). `MiembrosAdmin.tsx:216-225` aplica el cambio por `miembroId` sobre el estado más reciente (`setMiembros`/`setRecordsDe` funcionales) y solo toca `recordsDe` si `m.id === miembroId`. (b) El `UPDATE`/`DELETE` filtran además por `.eq('miembro_id', …)` con el dueño real (`RecordsModal.tsx:144-150`, `:188-194`, `:210-214`), así que aunque el modal tuviera datos contaminados, la base rechaza reasignar. (c) `borradorRef`/`montadoRef` (`RecordsModal.tsx:75-94`) hacen que una respuesta que llega después de Cancelar, abrir otro borrador o cerrar el modal **no** toque `form`/`error`/`guardando` de la sesión actual — sí sigue actualizando la lista global (correcto: el guardado en base es real). | `tests/unidad/records-form.test.ts` describe `aplicarRecordsDeMiembro — T-002-D01…` (2 tests): actualizar los records de A no toca los de B en la lista de miembros, y el modal abierto de B no cambia cuando llega la respuesta de A. La parte (b) (filtro `.eq('miembro_id', …)` contra la base real) y (c) (no tocar form/error de un borrador viejo) son de integración/UI — no mockeable como función pura; quedan en la lista de verificación del PM (`brief-dev.md` sección 6, prueba 1). |
| **T-002-D02** (S2/P1) — dos acciones rápidas capturan el mismo snapshot y la última respuesta restaura el estado viejo de la otra fila | Se extrajo la lógica de listas a funciones puras en `lib/records-form.ts`: `aplicarGuardado(lista, fila)` (reemplaza por id o inserta, reordena con `ordenarRecords`, `:174-183`) y `aplicarBorrado(lista, id)` (`:186-188`). `RecordsModal` ya no arma el array; solo llama `onGuardado`/`onBorrado`. `MiembrosAdmin.tsx:216-225` las aplica dentro del `setState` funcional, es decir sobre el estado más reciente en el momento en que cada respuesta llega, nunca sobre un snapshot capturado antes del `await`. Errores de acciones rápidas se limpian tras un éxito (`RecordsModal.tsx:200`, `:220`). | `tests/unidad/records-form.test.ts` describe `aplicarGuardado` (3 tests: reemplaza por id, inserta si no existe, reordena), `aplicarBorrado` (2 tests) y `aplicarGuardado / aplicarBorrado — T-002-D02…` (3 tests): dos "marcar superado" en cualquier orden dejan ambas filas aplicadas, borrar una fila y actualizar otra durante la espera (la borrada no reaparece), actualizar y luego borrar la misma fila. |
| **T-002-D03** (S3/P2) — el mensaje de error queda fuera de la vista al enviar desde abajo | El contenedor de error tiene `role="alert"`, `tabIndex={-1}` y un `ref`; un `useEffect` sobre `error` hace `scrollIntoView({ behavior: 'smooth', block: 'center' })` y `focus()` cuando aparece. Vale tanto para el error de `validarRecord` (CA-4) como el de Supabase (CA-9), porque ambos pasan por el mismo `setError`. | `RecordsModal.tsx:84-90`, `:234-238`. Es comportamiento de scroll/foco en el DOM real — no una función pura; queda en la verificación de interfaz del PM (`brief-dev.md` sección 6, prueba 6, a 730×837). |
| **T-002-D04** (S3/P2) — `type="number" min/max` dispara la validación nativa del navegador antes de `validarRecord`, mostrando el mensaje del navegador en vez del contrato en español | `noValidate` en el `<form id="form-record">` (`RecordsModal.tsx:241`). Se mantienen `min`/`max`/`type="number"` en el campo Año como pista visual (spinners, teclado numérico), pero ya no bloquean el submit: `validarRecord` es quien decide y quien manda el mensaje. | Sin test unitario nuevo: `validarRecord` para año 1949/2101/2024.5 ya estaba cubierto (`describe('validarRecord — mes y año')`); lo que cambia es que ahora ese mensaje se ve en el navegador en vez del nativo, que es una verificación de interfaz (`brief-dev.md` sección 6, prueba 6). |
| **T-002-D05** (S4/P3) — un hito (sin cifras) muestra «—» en la columna Marca en vez de nada | Se sacó el `?? '—'`: la celda renderiza directamente `formatearMarca(r)`, que es `null` en un hito y React no imprime nada. | Sin test nuevo: `formatearMarca` ya está probado en `tests/unidad/records.test.ts` (T-001, no tocado) — devuelve `null` sin cifras. El cambio es puramente de JSX (`RecordsModal.tsx:456`), verificable a simple vista por el PM. |

## Refactor de soporte (no es un defecto propio, pero lo pide la sección 6)

`RecordsModal` cambió su contrato con el padre: antes mandaba la lista
completa reconstruida (`onCambio: (records) => void`, la causa raíz de D01 y
D02); ahora manda solo el delta con el dueño (`onGuardado(miembroId, fila)` /
`onBorrado(miembroId, id)`, `RecordsModal.tsx:56-62`) y es
`MiembrosAdmin`/`lib/records-form.ts` quien decide, por id y sobre el estado
más reciente, a qué miembro y a qué modal abierto aplicarlo
(`aplicarRecordsDeMiembro`, `lib/records-form.ts:195-199`;
`MiembrosAdmin.tsx:216-225`).

## Archivos tocados

- `lib/records-form.ts` — agrega `aplicarGuardado`, `aplicarBorrado`,
  `aplicarRecordsDeMiembro` (funciones puras, importan `ordenarRecords` de
  `lib/records.ts` para reordenar — no se modificó ese archivo, solo se
  importa lo que ya exportaba).
- `app/(admin)/(panel)/admin/miembros/RecordsModal.tsx` — contrato
  `onGuardado`/`onBorrado` con dueño explícito, filtro `.eq('miembro_id', …)`
  en update/delete, `borradorRef`/`montadoRef`, error con `role="alert"` +
  scroll/foco, `noValidate`, celda Marca sin `'—'`.
- `app/(admin)/(panel)/admin/miembros/MiembrosAdmin.tsx` — reemplaza
  `onCambio` por `onGuardado`/`onBorrado` conectados a
  `actualizarRecordsDeMiembro`, que aplica por id sobre el estado más
  reciente.
- `tests/unidad/records-form.test.ts` — 10 tests nuevos (helper `miembro()` +
  los 4 `describe` de arriba).

No se tocó `page.tsx`: su `select` ya traía `records(*)` desde la ronda 1 y
ningún defecto de esta ronda lo requería.

## Commits de esta ronda

Ver `git log` en la rama — un commit por defecto/grupo relacionado más el de
tests, conventional commits en español, cada uno con los archivos stageados
por nombre.

## Verificación (salida real)

```
$ npx next typegen && npx tsc --noEmit
Generating route types...
✓ Types generated successfully
(tsc sin salida = sin errores)

$ npm run lint
> eslint
(sin salida = sin errores)

$ npm test
 Test Files  8 passed (8)
      Tests  187 passed (187)

$ npm run build
✓ Compiled successfully in 639ms
  Running TypeScript ...
  Finished TypeScript in 1424ms ...
[supabase] "miembros activos" falló: { code: 'PGRST200', ... }
✓ Generating static pages using 7 workers (13/13)
```

El `PGRST200` es el mismo esperado de ronda 1 (build corre contra Supabase de
**producción**, sin la migración 0013 aplicada todavía; no es de esta
tarea).

## Qué verifiqué en local y qué no

**Verificado esta ronda:** los 5 checks de arriba (typegen, tsc, lint,
187/187 tests, build), incluidos los 10 tests nuevos que cubren exactamente
los escenarios D01 (respuesta de A no contamina el modal/lista de B) y D02
(dos respuestas en ambos órdenes, y borrado + actualización concurrente de
otra fila) sobre las funciones puras `aplicarGuardado`/`aplicarBorrado`/
`aplicarRecordsDeMiembro`.

**No verificado por mí esta ronda:** no levanté `npm run dev` ni toqué el
Supabase local compartido. `brief-dev.md` sección 6 es explícito en que la
verificación de interfaz (D01-b/c, D03, D04, CA-8/9/12 con carreras reales)
la hace el PM con las 10 pruebas listadas en `reporte-qa-r1.md` sección
"Pruebas a ejecutar por el PM", y que la lógica de listas debe probarse con
funciones puras sin mockear la base — que es lo que entrego. No repetí la
verificación manual con `curl` de ronda 1 porque ningún defecto de esta ronda
toca el `insert`/`select` básico ya confirmado entonces.

## Migraciones

Ninguna.

## Preguntas / bloqueos

Ninguno.
