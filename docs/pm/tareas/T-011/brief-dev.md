# T-011 — Reordenar las fotos de una galería

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/fotos-orden` |
| Worktree | `/Users/oliverinfante/Code/lainfanteria-next-fotos-orden` |
| Base | `origin/main` |
| Tipo | feat |
| Migración | **Sí** — `0014_reordenar_fotos.sql` |
| Ronda | 1 |
| Carril | **Estricto** (RPC `security definer` que muta galerías) |

**Antes de empezar leé `docs/pm/contexto.md` entero.** Sus reglas ganan sobre
este brief. Leé también `supabase/migrations/0012_foto_principal_atomica.sql`:
esta tarea copia su patrón.

## 1. Por qué

En `/admin/autos` (y en `/admin/productos`, que usa el mismo componente) las
fotos se pueden subir, borrar y marcar como principal, pero **no se puede
cambiar su orden**. El orden es el de subida, y es el que ve el público en la
galería del detalle.

Además hoy hay **dos conceptos** que confunden: la ★ elige la principal (que
siempre sale primera) y `orden` ordena las demás. Oliver decidió unificarlos:
**la primera foto de la galería es la principal.** Lo que se ve en el panel es
lo que sale en el sitio.

Bug que ya existe y se corrige acá: **borrar la foto principal deja la galería
sin principal** (`SubirFotos.tsx` › `borrar()` no promueve ninguna). Rompe el
invariante «exactamente una principal» de `contexto.md`.

## 2. Alcance

**Dentro:**
- Migración `0014_reordenar_fotos.sql`: RPC `reordenar_fotos` (§4).
- `SubirFotos.tsx`: reordenar arrastrando y con botones ◀ ▶; la ★ pasa a ser
  «mandar al primer lugar»; después de borrar, la galería se renormaliza.
- Función pura de reordenamiento en `lib/` con sus tests de unidad.
- Estilos de los controles nuevos en `admin.module.css`.
- `tests/seguridad/rls.test.ts`: `anon` no puede ejecutar la RPC.

**Fuera (no tocar aunque parezca relacionado):**
- `marcar_foto_principal` (0012): **no se borra ni se modifica**. El panel deja
  de llamarla, nada más. Borrarla es otra migración y otra decisión.
- Borrado atómico (borrar + renormalizar en una sola transacción). Queda como
  follow-up: ver CA-9 sobre el riesgo residual aceptado.
- El sitio público, `lib/datos.ts` y el orden de las consultas
  (`principal primero, después orden`): sigue igual y queda coherente porque la
  RPC mantiene las dos cosas alineadas.
- `AutosAdmin.tsx` y `ProductosAdmin.tsx`: ya reciben la lista nueva por
  `onCambio`. Si creés que hace falta tocarlos, **escalá**: hay otra tarea en
  paralelo (T-012) que modifica `AutosAdmin.tsx`.
- Migrar datos existentes: las galerías viejas se normalizan solas la primera
  vez que alguien reordena. No hace falta un `update` masivo.

## 3. Archivos probables

- `supabase/migrations/0014_reordenar_fotos.sql` (nuevo)
- `app/(admin)/(panel)/admin/_componentes/SubirFotos.tsx`
- `app/(admin)/admin.module.css` (solo clases nuevas o de `.fotoItem`/`.fotoAcciones`)
- `lib/galeria.ts` (nuevo)
- `tests/unidad/galeria.test.ts` (nuevo)
- `tests/seguridad/rls.test.ts`

## 4. La RPC (`0014_reordenar_fotos.sql`)

```sql
reordenar_fotos(p_tabla text, p_padre_id bigint, p_ids bigint[]) returns void
```

`p_ids` es la galería **completa** en el orden nuevo. La función deja
`orden = posición` (base 0, igual que la subida) y `es_principal = (posición 0)`.

Seguí el estilo de 0012: comentarios que explican el **por qué** de cada
decisión.

- **CA-1** — Autorización: `es_admin()` en la primera línea; si no, `42501`.
  `security definer`, `set search_path = public`, `revoke execute ... from public`
  y `grant execute ... to authenticated`, igual que 0012.
- **CA-2** — Allowlist de tablas idéntica a 0012 (`auto_fotos` → `auto_id`,
  `producto_fotos` → `producto_id`); cualquier otra → `22023`, antes de tocar
  nada. El nombre de la columna sale de la allowlist, nunca del parámetro;
  SQL dinámico solo con `format(%I)`.
- **CA-3** — Serialización: `pg_advisory_xact_lock` con **la misma clave** que
  `marcar_foto_principal` (`hashtext(p_tabla || ':' || p_padre_id)`), para que
  un reordenamiento y un marcado de principal sobre la misma galería no se
  crucen.
- **CA-4** — Validación de `p_ids`, con las fotos de la galería bloqueadas
  `FOR UPDATE`. Se rechaza (error, nada cambia) si:
  - `p_ids` es nulo o contiene un `null`;
  - tiene ids repetidos;
  - le falta alguna foto de la galería, o
  - incluye un id que no es de esta galería (de otro padre, de la otra tabla o
    inexistente).
  Es decir: el **conjunto** de `p_ids` tiene que ser exactamente el conjunto de
  fotos del padre. Elegí códigos de error y documentalos en la migración y en
  la entrega.
- **CA-5** — Galería vacía con `p_ids = '{}'`: termina bien sin hacer nada.
- **CA-6** — Resultado: después de una llamada válida, `orden` es `0..n-1` en
  el orden de `p_ids` y **exactamente una** foto tiene `es_principal = true`: la
  de `p_ids[1]`. Ojo con el índice único parcial `<tabla>_una_principal_idx`:
  Postgres lo chequea fila por fila, así que un solo `UPDATE` que mueve la
  principal puede chocar contra él a mitad de camino. Bajá primero la principal
  vieja y después subí la nueva (ver cómo lo resuelve 0012). Si algo falla a
  mitad, la transacción revierte todo.
- **CA-7** — Idempotencia: llamar dos veces con el mismo orden no falla y deja
  el mismo estado.

## 5. Panel (`SubirFotos.tsx`)

- **CA-8** — Reordenar:
  - **Arrastrar y soltar** una miniatura sobre otra la mueve a esa posición
    (escritorio).
  - **Botones ◀ ▶** en cada miniatura la corren un lugar; ◀ deshabilitado en la
    primera, ▶ en la última. Son botones reales: funcionan con teclado y en el
    celular.
  - En pantallas táctiles (`@media (hover: none)`) y con foco por teclado
    (`:focus-within`) los controles se ven **sin hover**; hoy `.fotoAcciones`
    solo aparece con `:hover`, y en el celular no hay hover.
  - La ★ pasa a ser «Mandar al primer lugar» (el `title` cambia) y usa la
    misma RPC. No se muestra en la primera.
  - Se guarda al instante, como la ★ y el borrado de hoy: actualización
    optimista y, si la RPC falla, **la galería vuelve al orden anterior** y se
    muestra el error en el aviso existente.
  - Mientras una operación está en curso, los controles de orden, la ★ y el
    borrado quedan deshabilitados (nada de dos RPC cruzadas por doble clic).
  - Arrastrar una miniatura **no** dispara la subida de archivos ni activa la
    zona de drop. Soltar archivos del sistema sobre la grilla tampoco debe
    reordenar nada.
- **CA-9** — Borrar: después de borrar la fila (y antes de liberar el bucket,
  como hoy), si quedan fotos se llama a `reordenar_fotos` con las restantes en
  su orden. Borrar la primera deja como principal a la que era segunda. Si esa
  RPC falla, se muestra el error y la lista local queda sin la foto borrada (la
  fila ya no existe); el riesgo residual de quedar sin principal en ese caso
  es el follow-up de borrado atómico, documentalo en la entrega.
- **CA-10** — Subir: sin cambios de comportamiento. La primera foto de una
  galería vacía sigue entrando como principal, y las nuevas se agregan al
  final.
- **CA-11** — El texto de ayuda dice que **la primera foto es la principal**, que
  se pueden arrastrar o usar ◀ ▶, y que la ★ la manda al primer lugar.
- **CA-12** — La lista que se muestra y la que se manda a `onCambio` están
  siempre en el orden de la galería, con `orden` y `es_principal` coherentes
  con lo que dejó la RPC.
- **CA-13** — Funciona igual en `/admin/productos` (`producto_fotos`), sin
  cambios en `ProductosAdmin.tsx`.

## 6. Pruebas requeridas

- [ ] **Unidad** `tests/unidad/galeria.test.ts` sobre la función pura de
      `lib/galeria.ts` (mover de una posición a otra, y la normalización
      `orden`/`es_principal` que espera el panel después de la RPC):
      primera ↔ última, mover a la misma posición (no cambia nada), posiciones
      fuera de rango (no cambia nada o lanza; elegí y documentá), galería de 1,
      galería vacía, la entrada no se muta, la principal resultante es siempre
      la primera.
- [ ] **Seguridad** `tests/seguridad/rls.test.ts`: `anon` llamando a
      `rpc/reordenar_fotos` con un payload realista recibe `42501` (no
      «cualquier error»), y después de la llamada el orden de esa galería no
      cambió. ⚠️ Va contra producción, donde la función no existe hasta el
      `db push`: **no la corras vos**, la corre el PM contra Supabase local.
- [ ] **No** escribas pruebas que escriban de verdad en la base: las ejecuta el
      PM contra Supabase local (§9). En la entrega listá los casos que
      deberían cubrir.
- [ ] Sin pruebas de navegador: el panel exige login y no hay fixture para eso.

## 7. Defectos a corregir (solo rondas de fix)

| ID | Sev | Resumen | Esperado |
| -- | --- | ------- | -------- |

## 8. Definición de hecho

- [ ] Todos los CA cumplidos, cada uno con su test o evidencia
- [ ] `npx next typegen && npx tsc --noEmit` limpio
- [ ] `npm run lint` limpio
- [ ] `npm test` verde
- [ ] `npm run build` pasa
- [ ] Commits convencionales, archivos stageados por nombre, en la rama
      correcta. Corte sugerido: `feat(db): reordenar_fotos` ·
      `feat(admin): reordenar fotos de la galería` ·
      `fix(admin): borrar la principal promueve la siguiente` ·
      `test(seguridad): reordenar_fotos cerrada a anon`
- [ ] Working tree limpio (`git status --short` vacío)
- [ ] `entrega-dev.md` commiteada, con *Migraciones* = **REQUIERE db push ANTES
      del merge** y cómo revertir (`drop function reordenar_fotos(text, bigint, bigint[])`)
- [ ] Sin push, sin PR, sin `db push`, sin SQL contra ningún Supabase remoto

## 9. Nota para el PM (no para el dev)

Antes de QA y antes del PR, contra **Supabase local** (`npx supabase start`,
Docker), cada caso dentro de `BEGIN … ROLLBACK`, con un admin y un usuario
autenticado no admin:

- no admin → `42501`; `anon` (REST) → `42501`
- tabla `'autos'` / `'miembros'` → `22023`, sin cambios
- `p_ids` nulo, con `null`, con repetidos, con uno de menos, con uno de más,
  con un id de otro auto, con un id de `producto_fotos` → error, sin cambios
- válido: `orden = 0..n-1`, una sola principal = `p_ids[1]`; mover la principal
  al final; galería de 1; galería vacía con `'{}'`; dos veces seguidas
- dos sesiones: `reordenar_fotos` y `marcar_foto_principal` sobre la misma
  galería se serializan (la segunda espera)
- `npm run test:seguridad` con la URL local
