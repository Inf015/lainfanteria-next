# Entrega T-002 — ronda 1

**Estado:** LISTA PARA QA

## Qué hice

- `lib/records-form.ts` (nuevo) — contrato exacto del brief: `FormRecord`,
  `formVacio`, `formDesdeRecord`, `validarRecord`, `aFilaRecord`. Parseo de
  número con coma o punto sin separador de miles, límites de tiempo (3
  decimales, ≤ 99999.999) y velocidad (2 decimales, ≤ 9999.99), año
  1950–2100, fuente http(s), y el caso `alcance`: `''` = sin elegir (inválido)
  vs `'ninguno'` = elegido, no suma (→ `null` en `aFilaRecord`).
- `app/(admin)/(panel)/admin/miembros/RecordsModal.tsx` (nuevo) — lista +
  formulario de alta/edición + marcar superado/vigente + borrar, calcado en
  estructura y estilos de `PalmaresModal.tsx` (sin compartir código con él).
- `app/(admin)/(panel)/admin/miembros/page.tsx:17` — el `select` pasa a
  `'*, palmares:logros(*), records(*)'`.
- `app/(admin)/(panel)/admin/miembros/MiembrosAdmin.tsx` — botón «Récords»
  por fila (junto a «Galería de trofeos») y estado del modal
  (`recordsDe`/`onCambio`), mismo patrón que el palmarés.
- `tests/unidad/records-form.test.ts` (nuevo) — 48 tests.

No toqué `lib/records.ts`, `lib/types.ts`, `lib/datos.ts`, `app/(sitio)/` ni
`PalmaresModal.tsx`.

## Trazabilidad

| CA | Cómo se cumple | Test / evidencia |
| -- | --------------- | ----------------- |
| CA-1 | `RecordsModal` título `Récords de {miembro.nombre}`; lista con `ordenarRecords(miembro.records ?? [])` | `RecordsModal.tsx:56` — reutiliza `ordenarRecords` de T-001, ya probado en `tests/unidad/records.test.ts` |
| CA-2 | Fila con `formatearMarca`, título, categoría condicional, `etiquetaRecord`, `fechaLogro`, pill VIGENTE/SUPERADO y pill SUMA si `vigente && alcance === 'nacional'` | `RecordsModal.tsx:305-345`; verificado funcionalmente contra Supabase local (ver abajo) |
| CA-3 | Sin récords: `<p className={s.vacio}>Todavía no tiene récords cargados.</p>` y botón «+ Agregar récord» siempre visible | `RecordsModal.tsx:270-274` |
| CA-4 | `validarRecord` — cada mensaje exacto del brief, en el mismo orden (título, alcance, tiempo, velocidad, mes sin año, año, fuente) | `tests/unidad/records-form.test.ts` describes "validarRecord — …" (37 tests, incluye todos los límites: 1949/1950/2100/2101, tiempo 0/0.001/0.0001/-1/99999.999/100000/'abc', velocidad 0.01/0.001/9999.99/10000, URLs https/HTTP/ftp/javascript/vacía) |
| CA-5 | Tiempo/velocidad vacíos válidos; coma o punto con espacios; sin separador de miles | `tests/unidad/records-form.test.ts` describe "validarRecord — separador decimal" |
| CA-6 | `aFilaRecord` recorta espacios, vacíos → `null`, `anio`/`mes` → `null`/`number`, `alcance: 'ninguno'` → `null`, velocidad vacía → `unidad_velocidad: null` | `tests/unidad/records-form.test.ts` describe "aFilaRecord" (11 tests) |
| CA-7 | Alta hace `insert().select('*').single()` y agrega al estado local; edición hace `update().eq('id', …)` y reemplaza la fila; `formDesdeRecord` mapea `alcance: null → 'ninguno'` | `RecordsModal.tsx:83-119`; ida y vuelta probada en `tests/unidad/records-form.test.ts` describe "formDesdeRecord → aFilaRecord" (4 casos) y describe "alcance nulo muestra 'ninguno'" |
| CA-8 | Botón deshabilitado + «Guardando…» mientras `guardando`; `guardar()` también corta temprano si `guardando` ya es `true` (doble Enter no dispara dos inserts) | `RecordsModal.tsx:76,145` |
| CA-9 | Error de Supabase → `setError(err.message)`, `setGuardando(false)`, el `form` no se limpia (se retorna antes de `setForm(null)`) | `RecordsModal.tsx:97-101,110-114`; CHECK de la base probado contra Supabase local (ver abajo, error `23514`) |
| CA-10 | `alternarVigente` solo cambia `vigente`; en error, `setError` sin tocar la lista | `RecordsModal.tsx:132-144`; verificado contra Supabase local |
| CA-11 | `borrar` usa `confirm(...)`, si se cancela no hace nada; si acepta, `delete().eq('id', …)` y saca la fila del estado | `RecordsModal.tsx:146-155`; verificado contra Supabase local |
| CA-12 | El estado vive en `miembros` de `MiembrosAdmin` (`onCambio` actualiza `prev.map(...)`); cada modal recibe solo `miembro.records` del miembro abierto | `MiembrosAdmin.tsx` bloque `recordsDe && <RecordsModal .../>` |
| CA-13 | No se tocó nada de editar/galería/borrar miembro; `npm test` sigue en 177/177 (incluye los tests previos de miembros/palmarés) | `npm test` |

## Commits

```
08feb9b feat(admin): conecta el botón Récords en la tabla de miembros
c17ad5a feat(admin): agrega RecordsModal.tsx con la lista y el alta/edición de récords
e3dd454 feat(admin): agrega lib/records-form.ts con la validación y conversión del formulario de récords
```
(`bbbe879` es el commit del brief que el PM ya tenía en la rama antes de empezar; no es mío.)

## Verificación (salida real, recortada)

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
      Tests  177 passed (177)

$ npm run build
✓ Compiled successfully in 2.8s
  Running TypeScript ...
  Finished TypeScript in 2.3s ...
[supabase] "miembros activos" falló: {
  code: 'PGRST200',
  message: "Could not find a relationship between 'miembros' and 'records' in the schema cache"
}
✓ Generating static pages using 7 workers (13/13)
```

El error de `PGRST200` durante el build es **esperado**: el build corre contra
el Supabase de **producción**, donde la migración 0013 (T-001) todavía no está
aplicada. `consultar()` cae a `[]` y la build igual termina en verde (mismo
comportamiento documentado en la sección "Orden de deploy" de la épica). No lo
"arreglé": es la advertencia del NO-GO si T-001 se despliega después que T-002.

## Verificación manual (Supabase local compartido)

**No pude completar el recorrido por clic en el navegador.** El servidor
(`npm run dev -- -p 3002` con `local-dev.env` cargado) sí levantó y respondió
bien — confirmado con `curl http://localhost:3002/admin/login` → `200`. Pero
la herramienta de navegador embebido de este entorno corre en una red aislada
sin ruta a `localhost`/`127.0.0.1` del host; solo pudo llegar por la IP de LAN
(`192.168.0.20`), y ahí la directiva `upgrade-insecure-requests` del CSP del
panel (`lib/csp.ts`, preexistente, no tocado) fuerza a HTTPS todos los
recursos (`_next/static/*.js`, `.css`), que el dev server sirve por HTTP sin
TLS → `ERR_SSL_PROTOCOL_ERROR` en cada chunk, así que React nunca hidrata y no
pude ni loguearme desde ahí. Por `localhost` sí funciona (es un origen seguro
para el navegador y no dispara el upgrade); es la única vía en la que corre
como está pensado, pero mi herramienta de navegador no tiene esa ruta.

Como alternativa hice la verificación **funcional contra el Supabase local
compartido**, reproduciendo con `curl` exactamente los payloads que
`RecordsModal.tsx` + `lib/records-form.ts` arman (login real como
`admin2@local.test`, token de sesión real, mismos endpoints REST que usa
`crearClienteNavegador()`). Datos con prefijo `t002-`, dejados sin borrar:

- Creé el miembro `t002-piloto-prueba` (id 4).
- **Alta con tiempo y velocidad** (nacional, vigente): `t002-1/4 de milla`,
  9.874 s @ 142.5 mph, categoría, año/mes, fuente — insertó bien (id 9).
- **Alta de un hito que suma** (alcance nacional, sin cifras, vigente):
  `t002-Primer dominicano en el ROC nacional` — insertó bien (id 10).
- **Alta de un hito que no suma** (`alcance: null`): `t002-Hito sin alcance`
  — insertó bien (id 11).
- **Quitar la velocidad** a un récord que la tenía (id 9): `PATCH` con
  `velocidad: null, unidad_velocidad: null` (igual que arma `aFilaRecord`
  cuando el campo queda vacío) — aceptado, el CHECK de la base no protesta.
- **Marcar superado** (id 10): `PATCH { vigente: false }` — aceptado.
- **Borrar** (id 11): `DELETE` — `200`, fila eliminada.
- **CHECK de la base** (equivalente al error de CA-9): insertar velocidad sin
  unidad → `400`, `code 23514`, `records_velocidad_con_unidad` — confirma que
  cuando el CHECK dispara, el modal recibe un `err.message` para mostrar (la
  ruta de `setError` en sí está cubierta por el código, no por este curl).
- **Consulta del panel**: `GET /miembros?select=id,nombre,palmares:logros(*),records(*)&id=eq.4`
  devolvió el miembro con sus 2 récords restantes anidados — confirma que el
  `select` de `page.tsx` funciona contra el schema local con la 0013 aplicada.

Quedan **sin verificar por UI real**: la interacción del formulario en sí
(clics, disabled del botón Guardar, mensaje de error en pantalla), el
distintivo SUMA renderizado, y el error de validación (`'javascript:...'` u
otro) mostrándose sin llamar a la base. Estos tres los cubre el código
revisado a mano + los 48 tests unitarios de `records-form.ts`, pero no los vi
correr en un navegador real. Recomiendo que QA/PM confirmen el clic-a-clic
desde su propia máquina (`localhost:3002`, sin el problema de red que tuve
yo), sobre todo el punto de "SUMA" visible y el error inline.

## Migraciones

Ninguna.

## Decisiones tomadas

- El pill de "récord/hito" en la lista usa `etiquetaRecord` con `pillGris`
  siempre (no varía color por alcance) — porque el brief solo pide que el
  distintivo **SUMA** se distinga a simple vista, no cada nivel de alcance;
  meter 4 colores más era alcance no pedido.
- Alcance del `<select>`: opción `""` no seleccionable como valor real (queda
  como placeholder si no se elige nada), igual que "— sin especificar —" en
  el `<select>` de mes de `PalmaresModal`, para no inventar un patrón nuevo.
- `parseDecimal` vive privado dentro de `lib/records-form.ts`, no exportado:
  el contrato del brief solo pide las 4 funciones listadas.

## Fuera de alcance que vi (no tocado)

- El mismo hallazgo que ya anota la épica: `tests/seguridad/rls.test.ts` no
  cubre `records` (ni `logros`) en `TABLAS`. No lo toqué — es de T-001 /
  tarea aparte según `EPICA-records.md`.
- `lib/csp.ts` fuerza `upgrade-insecure-requests` incluso en dev, lo que
  rompe cualquier acceso al panel por una IP que no sea `localhost`/loopback.
  No es un bug de esta tarea (preexistente, fuera de mis archivos) pero
  explica por qué mi verificación de navegador no pudo completarse por LAN.

## Preguntas / bloqueos

Ninguno. Entrega no bloqueada; la única reserva es la verificación manual por
UI real, marcada como no hecha arriba en vez de darla por buena.
