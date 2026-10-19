# Entrega T-011 — ronda 1

**Estado:** LISTA PARA QA

La parte de base (CA-1 a CA-7) **no se ejecutó**: el brief y las reglas
prohíben levantar Supabase local y correr SQL. La migración está escrita y
revisada, pero su primera ejecución va a ser la del PM (§9 del brief). La lista
de casos está abajo, en *Pruebas que debe correr el PM*.

## Qué hice

- **RPC `reordenar_fotos(text, bigint, bigint[])`** — `supabase/migrations/0014_reordenar_fotos.sql` (nuevo). Recibe la galería completa en el orden nuevo y deja `orden = posición` (base 0) y `es_principal` solo en la primera, en una transacción.
- **Funciones puras** `moverFoto` y `normalizarGaleria` — `lib/galeria.ts` (nuevo), con 17 pruebas en `tests/unidad/galeria.test.ts` (nuevo).
- **Panel** — `app/(admin)/(panel)/admin/_componentes/SubirFotos.tsx`:
  - `mover()` (`:166`): optimista, llama a `reordenar_fotos` y vuelve a la lista anterior si falla.
  - Arrastrar y soltar con un tipo de dato propio `MIME_FOTO` (`:33`, `:35`, `:195`, `:276-305`); botones ◀ ★ ▶ ✕ (`:312-…`).
  - Bloqueo de operaciones cruzadas: `ocupado` + `ocupadoRef` + `bloqueado` (`:61-87`).
  - `borrarFila()` (`:219`): tras borrar la fila llama a `reordenar_fotos` con las restantes y recién después libera el bucket.
  - Texto de ayuda nuevo (`:397`).
  - La ★ deja de llamar a `marcar_foto_principal`; la función de la 0012 no se tocó.
- **Estilos** — `app/(admin)/admin.module.css`: clases nuevas `.fotoArrastrada`, `.fotoDestino`, cursor `grab`; `.fotoAcciones` visible con `:focus-within` y siempre visible (franja abajo) con `@media (hover: none)`; estilos de botón deshabilitado y foco, acotados a `.fotoAcciones .btnFoto` para no tocar la regla general `.btnFoto`.
- **Seguridad** — `tests/seguridad/rls.test.ts:210`: bloque «reordenar_fotos está cerrada a anon».

## Trazabilidad

| CA | Cómo se cumple | Test / evidencia |
| -- | -------------- | ---------------- |
| CA-1 | `es_admin()` en la primera línea → `42501` (`0014:68`); `security definer`, `set search_path = public`; `revoke … from public` / `grant … to authenticated` (`0014:207-208`) | `tests/seguridad/rls.test.ts` › «reordenar_fotos está cerrada a anon» (anon). No admin autenticado: caso del PM |
| CA-2 | Allowlist `case` idéntica a 0012 → `22023` antes del lock y de cualquier lectura (`0014:73-82`); SQL dinámico solo con `format(%I)` | Revisión de código. Ejecución: caso del PM |
| CA-3 | `pg_advisory_xact_lock(hashtext(p_tabla \|\| ':' \|\| p_padre_id))`, misma expresión que 0012 (`0014:114`) | Revisión de código (comparar con `0012`). Dos sesiones: caso del PM |
| CA-4 | Galería leída con `FOR UPDATE` (`0014:124-127`); nulos → `22004` (`:96`); repetidos → `23505` (`:131`); ajenos → `23503` (`:139`); faltantes → `23514` (`:148`). Además `p_padre_id` nulo → `22004` (`:89`) y arreglo multidimensional → `2202E` (`:104`) | Revisión de código. Ejecución: casos del PM |
| CA-5 | `coalesce(array_agg(id), '{}')` + salida temprana si `cardinality(p_ids) = 0` (`0014:155`) | Caso del PM |
| CA-6 | Primero se baja la principal vieja si no es la nueva primera (`0014:170`), después un UPDATE con `orden = pos - 1` y `es_principal = (pos = 1)` (`:184`); chequeo de `row_count` → `25000` (`:196`). La «primera» se toma por posición con `with ordinality`, no por `p_ids[1]` (ver Decisiones) | `galeria.test.ts` › `normalizarGaleria` (el panel replica el mismo resultado). Base: caso del PM |
| CA-7 | El UPDATE escribe los mismos valores; no hay filtro `and not es_principal` que dé 0 filas en la segunda llamada | Caso del PM |
| CA-8 arrastrar | `draggable` en `.fotoItem`, `dragstart` pone `MIME_FOTO`, `drop` sobre otra miniatura llama a `mover(desde, i)` | Revisión de código. Sin prueba de navegador (el brief la excluye) |
| CA-8 ◀ ▶ | `<button>` reales, ◀ `disabled` en `i === 0`, ▶ en `i === fotos.length - 1` | `galeria.test.ts` › «mueve un lugar a la izquierda y a la derecha (los botones ◀ ▶)» |
| CA-8 sin hover | `@media (hover: none)` y `.fotoItem:focus-within .fotoAcciones` | Revisión del CSS |
| CA-8 ★ | `mover(i, 0)`, `title="Mandar al primer lugar"`, no se renderiza en `i === 0` | `galeria.test.ts` › «lleva la última al principio…» |
| CA-8 optimista | `onCambio(normalizada)` antes de la RPC; `onCambio(anterior)` + `setError` si `error` o excepción | Revisión de código; `galeria.test.ts` › «no muta la entrada: la lista anterior hace falta para volver atrás» |
| CA-8 bloqueo | `bloqueado = ocupado \|\| subiendo > 0` deshabilita ◀ ★ ▶ ✕ y `draggable`; `ocupadoRef` corta el segundo clic antes del render; `soltarSobre` y `subir` también lo respetan | Revisión de código |
| CA-8 drop zone | `onDragOver`/`onDrop` de la zona ignoran los arrastres con `MIME_FOTO` (no se ilumina, no sube). En la grilla, un arrastre sin `MIME_FOTO` (archivo del sistema) recibe `dropEffect = 'none'` y `soltarSobre` sale sin reordenar | Revisión de código |
| CA-9 | `borrarFila`: DELETE → si quedan fotos, `reordenar_fotos` con las restantes en su orden → bucket → `onCambio`. Si la RPC falla: error en el aviso y lista local sin la borrada, con sus valores reales | `galeria.test.ts` › «borrar la principal deja como principal a la que era segunda». Riesgo residual: ver *Decisiones* |
| CA-10 | `subir()` sin cambios salvo el guardia de `ocupadoRef` (ver Decisiones): primera de galería vacía como principal, nuevas al final | `git diff origin/main -- …SubirFotos.tsx`: el cuerpo de la subida no cambió |
| CA-11 | «La primera foto es la principal: es la que aparece en la tarjeta del sitio, y las demás salen en este mismo orden. Arrastralas o usá ◀ ▶ para reordenarlas; la ★ manda una foto al primer lugar.» | `SubirFotos.tsx:397` |
| CA-12 | Todo cambio de orden pasa por `normalizarGaleria`, que deja exactamente lo que escribe la RPC | `galeria.test.ts` › «después de cualquier movimiento hay exactamente una principal y es la primera» (los 16 pares desde/hasta) |
| CA-13 | El componente solo usa `tabla`/`registroId`; la RPC acepta `producto_fotos`. `ProductosAdmin.tsx` y `AutosAdmin.tsx` sin cambios | `git diff --stat origin/main` no los incluye |

## Commits

```
a7ae83e test(seguridad): reordenar_fotos cerrada a anon
f82a264 fix(admin): borrar la principal promueve la siguiente
625c77e feat(admin): reordenar fotos de la galería
7d70f6f feat(db): reordenar_fotos
82f21d5 docs(pm): T-011 y T-012 en el tablero
bae88a4 docs(pm): brief T-011
```

(Más el commit de esta entrega. Los dos `docs(pm)` de abajo son del PM, ya
estaban en la rama.)

## Verificación (salida real, recortada)

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
      Tests  253 passed (253)
$ npm run build
✓ Compiled successfully in 2.6s
  Finished TypeScript in 2.9s
✓ Generating static pages using 7 workers (24/24) in 1090ms
exit 0
$ grep -c '\[supabase\]' build.log
0
```

`npm test` pasó de 236 a 253: las 17 de `galeria.test.ts`.

No corrí `npm run test:seguridad` (va contra producción, donde la 0014 todavía
no existe: la prueba nueva daría 404 `PGRST202`, no `42501`), ni
`test:navegador` (el panel exige login).

## Migraciones

`0014_reordenar_fotos.sql` — **REQUIERE db push ANTES del merge.** Sin la
función, el panel nuevo no puede reordenar, la ★ falla, y **borrar** muestra
«La foto se borró, pero no se pudo reordenar la galería» en cada borrado.

Crea `reordenar_fotos(p_tabla text, p_padre_id bigint, p_ids bigint[])`,
`security definer`, ejecutable solo por `authenticated` y con `es_admin()` como
barrera real. No modifica tablas ni datos, ni toca `marcar_foto_principal`.

Revertir:

```sql
drop function reordenar_fotos(text, bigint, bigint[]);
```

(Y revertir el panel, que sin la función queda sin poder reordenar ni marcar
principal.)

### Códigos de error de la RPC

| Código | Cuándo |
| ------ | ------ |
| `42501` | quien llama no es admin |
| `22023` | tabla fuera de la allowlist |
| `22004` | `p_padre_id` nulo, `p_ids` nulo, o `p_ids` con un `null` |
| `2202E` | `p_ids` multidimensional |
| `23505` | `p_ids` con ids repetidos |
| `23503` | un id de `p_ids` no es de esta galería (otro padre, la otra tabla, inexistente) — mismo código que usa 0012 para «no pertenece» |
| `23514` | a `p_ids` le falta alguna foto de la galería |
| `25000` | el UPDATE no afectó todas las filas (red de seguridad, no debería pasar) |

Orden de chequeo: admin → tabla → padre nulo → nulos → dimensiones → lock →
lectura `FOR UPDATE` → repetidos → ajenos → faltantes. Un `p_ids` con un
repetido **y** un ajeno da `23505`.

## Pruebas que debe correr el PM (Supabase local)

Cada caso en `BEGIN … ROLLBACK`, como admin salvo que se diga otra cosa:

1. No admin autenticado → `42501`. `anon` por REST → `42501` (`npm run test:seguridad` con la URL local).
2. `p_tabla = 'autos'` y `'miembros'` → `22023`, sin cambios.
3. `p_padre_id = null` → `22004`.
4. `p_ids = null` → `22004`; `'{1,null}'` → `22004`.
5. `'{{a,b},{c,d}}'` → `2202E`.
6. Repetido (`{a,a,b}` con galería `{a,b}`) → `23505`.
7. Uno de menos → `23514`; uno de más (de otro auto) → `23503`; un id de `producto_fotos` contra `auto_fotos` → `23503`; id inexistente → `23503`.
8. Válido: `orden = 0..n-1` en el orden de `p_ids`, una sola principal = la primera.
9. Mover la principal al final (exige la bajada previa; sin ella choca contra `auto_fotos_una_principal_idx`).
10. Galería de 1 foto; galería vacía con `'{}'` (termina bien); galería vacía con `'{1}'` → `23503`.
11. Dos veces seguidas el mismo orden → sin error, mismo estado.
12. Galería vieja sin principal y con `orden` repetidos → queda normalizada.
13. `p_ids` con límite inferior distinto de 1 (`'[0:2]={c,a,b}'::bigint[]`) → la principal es `c`.
14. Dos sesiones: `reordenar_fotos` y `marcar_foto_principal` sobre la misma galería → la segunda espera a que la primera haga commit.
15. Mismos casos 8-11 sobre `producto_fotos`.

## Decisiones tomadas

- **Posición fuera de rango en `moverFoto` → copia sin cambios, no lanza.** Viene de un gesto (un drop fuera de lugar, un índice viejo); no tiene que romper el panel. Probado en «con una posición fuera de rango devuelve la misma galería, sin lanzar» (incluye negativos, `n`, `0.5` y `NaN`).
- **La «primera» se toma por posición con `with ordinality`, no con `p_ids[1]`.** Un arreglo de Postgres puede empezar en otro índice y entonces `p_ids[1]` sería otra foto. Por el mismo motivo se rechazan los arreglos multidimensionales (`unnest` los aplanaría en silencio).
- **`p_padre_id` nulo se rechaza** aunque el brief no lo pide: con null el advisory lock no bloquea nada (`hashtext(null)` es null) y `p_ids = '{}'` terminaría bien sin validar contra ninguna galería.
- **Una sola bajada + un solo UPDATE de orden y principal.** Después de bajar la principal vieja, la única fila que queda en true es la nueva primera, así que el UPDATE combinado no puede chocar contra el índice parcial.
- **Una subida en curso también bloquea el orden, y un reordenamiento en curso rechaza una subida** (con aviso y vaciando el input). Motivo: `subir()` termina con `onCambio([...fotos, ...nuevas])` sobre la lista que tenía al empezar y pisaría el orden nuevo, y al revés. No deshabilité el `<input type="file">`: un input deshabilitado puede no recibir el drop y el navegador abriría el archivo en la pestaña.
- **Soltar un archivo del sistema sobre la grilla: no reordena ni sube.** Se cancela el default para que el navegador no abra el archivo, y se ignora. Subir sigue siendo solo en la zona de abajo, como hoy.
- **El badge PRINCIPAL sigue saliendo de `es_principal`** (el dato de la base), no de la posición. Después de cualquier operación del panel son lo mismo; en una galería vieja sin principal no se muestra un badge que la base no respalda.
- **Borrado (CA-9) llama a la RPC aunque el orden ya esté normalizado** (p. ej. al borrar la última). Es idempotente y el brief pide llamarla siempre que queden fotos.
- **Riesgo residual aceptado (follow-up de borrado atómico):** si el DELETE pasa y `reordenar_fotos` falla (red, sesión vencida, pestaña cerrada entre las dos llamadas), la galería queda sin principal si la borrada lo era. El panel lo muestra («La foto se borró, pero no se pudo reordenar la galería…») y se arregla con el próximo reordenamiento. Cerrarlo del todo exige borrar y renormalizar en una sola función.
- **Pre-commit global:** el commit `a7ae83e` se hizo con `ALLOW_COMMIT=1`. El hook marcó la clave ficticia del campo `password` en `tests/seguridad/rls.test.ts` (línea ~274), que es preexistente en `origin/main` (commit `9f08002`, la prueba de que el registro público está cerrado, contra un dominio `.invalid`) y no forma parte de este diff. El hook revisa el archivo entero, no solo las líneas cambiadas.

## Fuera de alcance que vi (no tocado)

- **Galerías viejas sin principal** (las que dejó el bug de borrado): la primera no tiene ★ (el brief pide no mostrarla en la primera) ni badge. Se normalizan con cualquier reordenamiento (p. ej. ▶ y ◀ sobre la primera). Si hay muchas, un `update` de normalización sería otra migración.
- **`subir()` calcula `orden` como `fotos.length + nuevas.length`**: en galerías viejas con `orden` no consecutivo puede repetir un valor. Inofensivo (no hay índice sobre `orden` y el siguiente reordenamiento lo corrige), y el brief pide no cambiar la subida.
- **`SubirFotoUnica.tsx` comparte `.fotoItem`/`.fotoAcciones`**: con este cambio, en pantallas táctiles su botón ✕ también se ve siempre en la franja de abajo (antes no había forma de verlo en el celular). Es un efecto del CSS pedido, no un cambio en ese componente.
- **Concurrencia con una subida desde otra pestaña:** el `FOR UPDATE` bloquea las filas existentes pero no impide un INSERT concurrente; esa foto entra con su `orden` de subida y sin ser principal. Deja la galería en un estado válido.
- **`marcar_foto_principal` queda sin uso desde el panel**, como dice el brief. Borrarla es otra decisión.

## Preguntas / bloqueos

Ninguno.
