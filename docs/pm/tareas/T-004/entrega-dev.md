# Entrega T-004 — ronda 1

**Estado:** LISTA PARA QA *(con una reserva: la verificación manual del panel
cargando récords quedó sin hacer — ver «Preguntas / bloqueos»)*

## Qué hice

- `getRecordsEquipo()` en `lib/datos.ts:155-174`: `records` con
  `.is('miembro_id', null)`, dentro de `consultar()` con respaldo `[]`, y el
  resultado por `ordenarRecords`.
- Panel, botón «Récords del equipo» en la cabecera de miembros:
  `app/(admin)/(panel)/admin/miembros/MiembrosAdmin.tsx:250-262`.
- Panel, segunda consulta en paralelo:
  `app/(admin)/(panel)/admin/miembros/page.tsx:17-34`.
- `RecordsModal` acepta `miembro: Miembro | null` y recibe la lista por
  `records`: `RecordsModal.tsx:74-93`. Con `miembro` nulo cambian el título, el
  texto de la lista vacía y la ayuda del alcance; el formulario y la validación
  son los mismos.
- `update`/`delete` acotados al dueño real, que ahora puede ser el equipo:
  `RecordsModal.tsx:170-176` (guardar), `:215-220` (alternar vigente),
  `:235-238` (borrar).
- `/nosotros`: bloque «Récords del equipo» entre números y valores,
  `app/(sitio)/nosotros/page.tsx:68,136-144`, con `.nosotrosRecords` en
  `nosotros.module.css:188-196` (solo fondo y aire de sección).
- Pruebas de `getRecordsEquipo()`: `tests/unidad/datos.test.ts:78-181`.

**No tocado:** `lib/records.ts`, `lib/records-form.ts` (aceptaban
`miembroId: null` desde T-001/T-002, no hizo falta escalar),
`app/(sitio)/_componentes/Records.tsx` y su CSS, la migración 0013, `/equipo`,
la home, `PalmaresModal.tsx`.

## Trazabilidad

| CA | Cómo se cumple | Test / evidencia |
| -- | -------------- | ---------------- |
| CA-1 | `getRecordsEquipo()` con `.is('miembro_id', null)`, `consultar()` y respaldo `[]`, pasado por `ordenarRecords` | `tests/unidad/datos.test.ts` › `getRecordsEquipo()` (3 casos: que el filtro sea `is` y no `eq`, el orden, y el respaldo ante error) + corrida real contra producción durante `npm run build`: 0 líneas `[supabase]` en el log, o sea que la consulta salió bien y devolvió cero filas |
| CA-2 | Botón en la cabecera → `setRecordsDelEquipoAbierto(true)` → `<RecordsModal miembro={null} records={recordsEquipo}>`; título «Récords del equipo»; alta con `aFilaRecord(form, dueñoDelModal)` y `dueñoDelModal = miembro?.id ?? null` | Revisión de código + URLs que arma supabase-js (abajo). **Sin verificación manual con datos** — ver «Preguntas / bloqueos» |
| CA-3 | Los récords del equipo viven en su propio estado (`recordsEquipo`), nunca dentro de `miembros`; el embebido `records(*)` de la consulta de miembros solo trae los que tienen esa FK, así que un récord del equipo no puede aparecer en ningún miembro. `key` distinto por dueño en el modal (`miembro-<id>` / `equipo`) para que React lo remonte y no quede un borrador apuntando a otro dueño | Revisión de código (`MiembrosAdmin.tsx:226-243,553-583`); el aislamiento por FK lo garantiza PostgREST, no el cliente. **Sin verificación manual** |
| CA-4 | `<section className={s.nosotrosRecords}>` insertada entre `nosotrosNumeros` y `nosotrosValores` en `page.tsx:140` | HTML prerenderizado (con la lista vacía, ver CA-5); el orden en el JSX es directo |
| CA-5 | La sección entera está bajo `recordsEquipo.length > 0` | HTML real de `.next/server/app/nosotros.html` tras `npm run build` contra producción: `grep -c "Récords del equipo"` → **0**, y entre las dos secciones no queda nada (ver «Verificación» abajo) |
| CA-6 | `Promise.all([getAjustes(), getRecordsEquipo()])`; `consultar()` no propaga el fallo: registra y devuelve el respaldo `[]`, con lo que la página se arma igual sin el bloque | `tests/unidad/datos.test.ts` › «si la consulta falla, devuelve lista vacía…» + las pruebas ya existentes de `consultar()` (error, excepción y `data: null`) |
| CA-7 | No se tocó `if (!(await seccionActiva('nosotros'))) notFound();` — sigue siendo lo primero de la página, antes de cualquier consulta | `git diff` de `page.tsx`: la línea del `notFound()` no aparece entre los cambios |
| CA-8 | No se agregó ni una regla de layout nueva: la grilla y el `overflow-wrap` son los de `records.module.css` (T-003, ya probado), y el contenedor es el `.sectionContainer` que la página ya usaba en todas sus secciones. El bloque es Server Component, sin estado de cliente | Revisión de código. Con cero récords no hay nada que medir a 400 px; **cuando haya datos, QA tiene que mirarlo** |

## Cómo verifiqué el filtro sin escribir en la base

El riesgo de esta tarea es mudo: un filtro mal escrito no falla, devuelve cero
filas. Le pedí a supabase-js que armara las mismas consultas que usa el código y
miré la URL resultante:

```
$ node -e '...createClient("http://127.0.0.1:1","clave-falsa")...'
update equipo : /rest/v1/records?id=eq.7&miembro_id=is.null
update miembro: /rest/v1/records?id=eq.7&miembro_id=eq.3
eq(null) MAL  : /rest/v1/records?select=*&miembro_id=eq.null
is(null) BIEN : /rest/v1/records?select=*&miembro_id=is.null
delete equipo : /rest/v1/records?id=eq.7&miembro_id=is.null
```

`miembro_id=eq.null` es exactamente la trampa que advierte CA-1: PostgREST lo
compara contra el literal `null` y no matchea ninguna fila.

Y la 0013 respalda las dos mitades: la política de lectura pública es
`miembro_id is null or exists (… m.activo)` —los del equipo son públicos
siempre— y la de escritura es `for all to authenticated using (es_admin())`, sin
condición sobre `miembro_id`, así que un `insert` con `miembro_id: null` desde el
panel está permitido. Hasta hay un índice parcial hecho para esta consulta:
`records_equipo_idx on records (id) where miembro_id is null`.

## Commits

```
8748b29 feat(equipo): bloque de récords del equipo en «Sobre nosotros»
f1d4984 feat(admin): cargar los récords del equipo desde el panel
29921a3 feat(equipo): getRecordsEquipo() — los récords que no son de nadie
```

(`git log --oneline c025b2b..HEAD`; `c025b2b` es el brief, que ya estaba en la
rama.)

## Verificación (salida real)

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
✓ Compiled successfully in 492ms
  Finished TypeScript in 1027ms
✓ Generating static pages using 7 workers (24/24) in 270ms
exit code: 0
$ grep -c '\[supabase\]' build.log
0
```

Cero líneas `[supabase]` es un dato, no un adorno: el build prerenderiza
`/nosotros` contra la base real, así que `getRecordsEquipo()` corrió de verdad
contra PostgREST con `is.null` y con RLS de `anon`, sin error. (En la entrega de
T-003 esa misma línea sí aparecía, porque la 0013 todavía no estaba aplicada;
ahora sí lo está.)

`npm run test:navegador` no se corrió: no se tocó la portada ni el carrusel.

### CA-5, en el HTML prerenderizado

```
$ grep -c "Récords del equipo" .next/server/app/nosotros.html
0

$ node -e 'imprimir lo que hay entre «Compromiso con el cliente» y «LO QUE NOS MUEVE»'
"Compromiso con el cliente</span></div></div></div></section>
 <section class=\"nosotros-module__97DlLq__nosotrosValores\">…"
```

La sección de números cierra e inmediatamente abre la de valores: con cero
récords no se monta ni el `<section>` ni su padding. La página queda como estaba.

## Migraciones

Ninguna. La 0013 ya trae la tabla, el `miembro_id` nulable, las políticas y el
índice parcial.

## Decisiones tomadas

- **`RecordsModal` recibe `records` además de `miembro`.** El brief pedía
  aceptar `miembro: Miembro | null`, pero la lista salía de `miembro.records`, y
  los del equipo no cuelgan de ningún miembro. Pasarla aparte es una prop más y
  deja el modal indiferente a de dónde salió la lista; la alternativa —inventar
  un `Miembro` falso para el equipo— hubiera metido un objeto mentiroso en el
  estado del panel.
- **`onGuardado`/`onBorrado` pasan a `number | null`.** Es el dueño real de la
  fila, que ahora puede ser el equipo. Sin eso, `MiembrosAdmin` no puede saber a
  qué estado aplicar la respuesta.
- **Se quitaron los tres `if (miembroIdDueño === null) return;` del modal.** Eran
  el candado de T-002 para un caso que entonces no existía. Ahora ese caso es el
  normal y el filtro pasa a `.is(…)`; dejarlos habría hecho que los botones
  «Marcar superado» y «Borrar» no hicieran nada en el modal del equipo.
- **`key` por dueño en el modal** en vez de limpiar el estado a mano: es lo que
  garantiza CA-3 sin agregar un `useEffect` que haya que mantener sincronizado.
- **El bloque de `/nosotros` va envuelto en `recordsEquipo.length > 0`** aunque
  `Records` ya devuelve `null` con la lista vacía: el `<section>` con el fondo y
  el padding es de la página, no del componente, y sin el guardado quedaría un
  hueco visible (CA-5).
- **La ayuda del alcance cambia de texto con el equipo.** «suman en la tarjeta
  del piloto» es falso cuando no hay piloto. Es una línea de copy, no un
  rediseño.
- **Segunda consulta en el panel, no un embebido.** `records(*)` cuelga de la FK:
  no hay forma de traer por ahí las filas que la tienen nula.

## Fuera de alcance que vi (no tocado)

- Lo ya anotado en `EPICA-records.md`: `tests/seguridad/rls.test.ts` no incluye
  `logros` en `TABLAS`. Sigue sin cubrirse; no es de esta tarea.
- El panel muestra los récords del equipo solo detrás de un botón en la página
  de miembros. Si más adelante hay muchos, merece su propia entrada de menú —
  hoy sería construir de más.

## Preguntas / bloqueos

- **La verificación manual de la sección 5 del brief (cargar desde el panel un
  récord del equipo con cifras y un hito, verlos en `/nosotros`, confirmar que
  no aparecen en ningún miembro) no se hizo.** La instrucción con la que arranqué
  esta tarea es explícita: hoy no hay ningún récord del equipo cargado, la
  pantalla tiene que verse bien vacía, y **no inventar datos de ejemplo ni
  escribir en la base**. Eso choca de frente con esa verificación, que consiste
  justamente en cargar datos. Elegí respetar la instrucción y decirlo acá en vez
  de decidirlo por mi cuenta.

  Lo que quedó cubierto sin datos: CA-1 (prueba unitaria + corrida real contra
  producción), CA-4 a CA-7 (HTML prerenderizado real y pruebas), y las URLs que
  arma supabase-js para el `update`/`delete` del equipo.

  Lo que **no** está verificado en pantalla y QA debería mirar con datos:
  **CA-2** (alta, edición, superado y borrado desde el modal del equipo),
  **CA-3** (aislamiento entre el modal del equipo y el de un miembro, en los dos
  sentidos) y **CA-8** (400 px con fichas reales, sobre todo una cifra larga y un
  hito largo).

  Si el PM quiere esa evidencia en esta ronda, hace falta que me habilite a
  escribir en un Supabase local (`npx supabase start` + un usuario admin), o que
  Oliver cargue el primer récord real del equipo y se valide sobre eso — que es,
  después de todo, la condición con la que la épica dejó esta tarea en prioridad
  baja.
