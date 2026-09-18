# Entrega T-004 — ronda 2

**Estado:** LISTA PARA QA *(con la reserva de D03, que el PM dejó fuera de esta
ronda: la verificación con datos reales la hace Oliver al cargar el primer
récord del equipo)*

Ronda 2 corrige **T-004-D01** y **T-004-D02**. **T-004-D03 no se tocó** por
indicación del PM.

## Defecto → fix → prueba

| Defecto | Fix | Prueba que lo cubre |
| ------- | --- | ------------------- |
| **D01 (P1)** — los tests nuevos sustituían la capa de datos (`createClient`, `from`, `select`, `eq`, `is`) por un doble que devolvía la respuesta prefijada | El cliente de Supabase pasa a ser el real y arma la petición él mismo; lo único sustituido es `fetch`, que el canon sí permite mockear. La prueba mira la URL que salió: `tests/unidad/datos.test.ts:92-140` (helper `conHttp`) y `:142-196` (los tres casos) | `tests/unidad/datos.test.ts:156-158` exige `miembro_id=is.null` y que no aparezca `miembro_id=eq`. **Comprobado que caza**: con `.is` → `.eq` en `lib/datos.ts`, falla con `expected 'eq.null' to be 'is.null'` (salida real abajo) |
| **D02 (P2)** — una lectura fallida se mostraba como «Todavía no hay récords del equipo cargados» | El `error` de la consulta viaja al panel (`page.tsx:18`, `:37`), llega al modal (`MiembrosAdmin.tsx:606-608`) y el modal muestra qué pasó en vez de la lista, **sin** «+ Agregar récord» (`RecordsModal.tsx:454-477`). «Reintentar» vuelve a leer desde el navegador (`MiembrosAdmin.tsx:248-273`) | Sin prueba automatizada: montar el modal exigiría traer jsdom y una librería de render que el repo no tiene, y eso es otra tarea. Verificable en revisión de código y en el paso 4 de «Pruebas a ejecutar por el PM» del reporte de QA |

## D01 — por qué el camino nuevo no es el mismo mock con otra ropa

La diferencia no es de forma. Un doble de `from`/`select`/`is` **no puede
fallar por la razón que importa**: devuelve la misma respuesta cualquiera sea el
filtro, así que `is.null` y `eq.null` le dan igual — y ése es exactamente el
error que se busca, uno que no lanza, no loguea y devuelve cero filas. Lo único
que verificaba era «llamé al método que yo mismo registré».

Dejando actuar al cliente real, lo que se observa es la petición que de verdad
sale, y ahí `eq.null` y `is.null` son dos URLs distintas. Reemplazar `fetch` es
lo que `docs/pm/contexto.md` clasifica como externo y permite mockear («Sí
mockear lo externo: `fetch` a YouTube, HTTP, red»).

Lo que estas pruebas **no** prueban, y queda escrito en el archivo: que Postgres
devuelva las filas correctas. Eso es la base, va contra Postgres real y es
`tests/seguridad` / la verificación local que quedó como D03. La prueba de acá
cubre la mitad que sí es código nuestro: que el pedido que sale sea el correcto.

Detalle de implementación que costó encontrar: las pruebas de `consultar()` que
ya estaban en el archivo registran un doble del SDK con `vi.doMock`, y ese
registro **sobrevive a `vi.resetModules()`**. Sin un `vi.doUnmock` explícito
(`tests/unidad/datos.test.ts:96`) el helper nuevo seguía recibiendo el doble
viejo y fallaba con `db.from(...).select is not a function`.

También se atendieron las dos observaciones de la sección «Evaluación de los
tests del dev» del reporte:

- Las filas de ejemplo ahora traen **todas** las columnas de la 0013, `miembro_id`
  incluido (`tests/unidad/datos.test.ts:121-140`), y se parsean como en
  producción; la ronda 1 las omitía.
- La prueba de error deja de apoyarse en `data: null` —que pasaba igual
  ignorando `error`— y usa un **500 con cuerpo de PostgREST**, exigiendo además
  que el fallo quede registrado (`:192-194`). Eso es lo que distingue haberlo
  atendido de haberlo tragado.

### Salida real de la mutación (sin el fix, la prueba falla)

```
$ perl -0pi -e "s/select\('\*'\)\.is\('miembro_id', null\)/select('*').eq('miembro_id', null)/" lib/datos.ts
$ sed -n '170p' lib/datos.ts
    (db) => db.from('records').select('*').eq('miembro_id', null),

$ npx vitest run tests/unidad/datos.test.ts
 × pide records con miembro_id=is.null (con eq.null no matchearía ninguna fila)
AssertionError: expected 'eq.null' to be 'is.null' // Object.is equality
Expected: "is.null"
Received: "eq.null"
      Tests  1 failed | 9 passed (10)
```

El `'eq.null'` de ese mensaje lo produjo supabase-js armando la URL, no un espía
mío. `lib/datos.ts` quedó restaurado byte a byte (`git diff` vacío para ese
archivo antes de commitear).

## D02 — qué ve ahora el admin

Con la lectura caída, el modal del equipo muestra, en lugar de la lista:

> No se pudieron cargar los récords del equipo: *(mensaje de PostgREST)*
>
> No es que no haya: es que no se pudo leer. Reintentá antes de cargar nada,
> para no duplicar lo que ya esté guardado.
>
> \[ Reintentar \]

Decisiones:

- **No se ofrece «+ Agregar récord» mientras la lectura esté caída.** Cargar a
  ciegas sobre una lista que no se pudo leer es literalmente el mecanismo del
  duplicado que describe el defecto.
- **«Reintentar» vuelve a consultar desde el navegador, no `router.refresh()`.**
  El estado del panel se inicializa una sola vez con las props, así que un
  refresh del servidor no cambiaría lo que el modal muestra: el botón sería
  mentira. Es la misma consulta, con el mismo `.is('miembro_id', null)`.
- **El modal de un miembro queda igual.** Recibe `errorCarga` opcional y hoy
  nadie se lo pasa (ver «Fuera de alcance»).

## Commits de esta ronda

```
d035990 fix(admin): distinguir «no hay récords» de «no se pudieron cargar»
7b2e339 test(equipo): probar getRecordsEquipo() con el cliente real, mockeando solo la red
```

Ronda 1 (sin cambios):

```
778068a docs(pm): entrega de dev de T-004 ronda 1
8748b29 feat(equipo): bloque de récords del equipo en «Sobre nosotros»
f1d4984 feat(admin): cargar los récords del equipo desde el panel
29921a3 feat(equipo): getRecordsEquipo() — los récords que no son de nadie
```

## Verificación (salida real, ronda 2)

```
$ npx next typegen
Generating route types...
✓ Types generated successfully

$ npx tsc --noEmit
(sin salida — limpio)

$ npm run lint
> eslint
(sin salida — limpio)

$ npm test
 Test Files  11 passed (11)
      Tests  236 passed (236)

$ npm run build
✓ Compiled successfully in 537ms
  Finished TypeScript in 1619ms
✓ Generating static pages using 7 workers (24/24) in 1023ms
exit code: 0
$ grep -c '\[supabase\]' build-r2.log
0
$ grep -c "Récords del equipo" .next/server/app/nosotros.html
0
```

El total de pruebas no cambió (236): las tres de la ronda 1 se reemplazaron por
tres, no se sumaron.

`npm run test:navegador` no se corrió: no se tocó la portada ni el carrusel.

## Trazabilidad de los CA (sin cambios respecto de la ronda 1)

| CA | Cómo se cumple | Test / evidencia |
| -- | -------------- | ---------------- |
| CA-1 | `getRecordsEquipo()` con `.is('miembro_id', null)`, `consultar()` y respaldo `[]`, pasado por `ordenarRecords` (`lib/datos.ts:155-174`) | `tests/unidad/datos.test.ts` › `getRecordsEquipo()` (3 casos, ahora con el cliente real) + corrida contra producción durante `npm run build`, sin líneas `[supabase]` |
| CA-2 | Botón en la cabecera → `<RecordsModal miembro={null} records={recordsEquipo}>`; alta con `aFilaRecord(form, dueñoDelModal)`, `dueñoDelModal = miembro?.id ?? null` | Revisión de código + las URLs que arma supabase-js. **Sin verificación con datos** (D03) |
| CA-3 | Estados separados (`recordsEquipo` fuera de `miembros`), aislamiento por FK en el embebido, `key` por dueño en el modal | Revisión de código (`MiembrosAdmin.tsx:231-250`, `:586-600` y `:601-617`). **Sin verificación con datos** (D03) |
| CA-4 | Sección entre `nosotrosNumeros` y `nosotrosValores` (`app/(sitio)/nosotros/page.tsx:140`) | HTML prerenderizado |
| CA-5 | Toda la sección bajo `recordsEquipo.length > 0` | `grep -c "Récords del equipo" .next/server/app/nosotros.html` → **0**, y entre números y valores no queda nada (ronda 1, revalidado en este build) |
| CA-6 | `Promise.all([getAjustes(), getRecordsEquipo()])`; `consultar()` registra y devuelve `[]` | `tests/unidad/datos.test.ts` › «ante un error de PostgREST devuelve [] y lo registra» (ahora con un 500 real) |
| CA-7 | `seccionActiva('nosotros')` intacto, antes de cualquier consulta | El `git diff` no toca esa línea |
| CA-8 | Sin reglas de layout nuevas: grilla y `overflow-wrap` son los de `records.module.css` (T-003) | Revisión de código. **Sin verificación con datos a 400 px** (D03) |

## Migraciones

Ninguna.

## Fuera de alcance que vi (no tocado)

- **La consulta de miembros del panel pierde su `error` igual que antes**
  (`page.tsx:21-25`). Es el mismo patrón que D02 señaló para el equipo, pero es
  anterior a T-004 y arreglarlo toca la carga de toda la pantalla: merece su
  propia tarea. El modal ya está preparado —`errorCarga` es opcional y hoy nadie
  se lo pasa para un miembro—, así que cuando se haga es cablear una prop.
- **`alternarVigente` y `borrar` no usan el candado de doble envío de `guardar`**
  (riesgo que anota QA). Es de T-002, no de este diff; no lo toqué.
- Lo ya anotado en `EPICA-records.md`: `tests/seguridad/rls.test.ts` no incluye
  `logros` en `TABLAS`.

## Preguntas / bloqueos

- **D03 sigue abierto y no lo trabajé, por indicación del PM.** CA-2, CA-3 y
  CA-8 siguen sin evidencia de ejecución con datos: los valida Oliver cuando
  cargue el primer récord del equipo, que es la condición con la que esta tarea
  estaba en espera.
- **D02 quedó sin prueba automatizada** y prefiero decirlo antes que maquillarlo:
  el repo no tiene hoy con qué montar un componente de React en las pruebas
  (no hay jsdom ni librería de render en `tests/unidad`), y traerlo para esto
  sería una tarea aparte, no un renglón de una ronda de fix. Si el PM quiere esa
  cobertura, es un brief propio — y entonces conviene que cubra también el
  aislamiento del modal (CA-3), que hoy tampoco tiene prueba.
