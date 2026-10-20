# T-010 — Revisar, editar y aprobar los autos de Instagram en el panel

| Campo | Valor |
| ----- | ----- |
| Rama | `oliver132123/instagram-panel` |
| Worktree | `<ruta absoluta>` |
| Base | `origin/main` |
| Tipo | feat |
| Migración | **Sí** — `0015_aprobar_autos_importados.sql` |
| Ronda | 1 |

> Arranca cuando **T-009 esté mergeada** y la 0014 aplicada en staging y en prod.

**Antes de empezar leé `docs/pm/contexto.md` entero** y después
`docs/pm/backlog/EPICA-instagram.md`. Sus reglas ganan sobre este brief.

## 1. Por qué

T-009 deja los posts de @lainfanteria_autosales en `autos_importados` como
`pendiente`, pero nadie los ve. Oliver pidió (2026-10-18) que «le salgan para
aprobar y editar, y le permita editar todo: fotos, etc.». Esta tarea agrega en
el panel de autos:

- la bandeja de pendientes;
- la edición completa;
- aprobar y descartar;
- conectar la cuenta de Instagram;
- un botón «Buscar ahora».

## 2. Alcance

**Dentro:**
- **«Pendientes de Instagram (N)»** en `/admin/autos`, arriba de la lista. Si
  no hay pendientes, solo una línea; nunca un hueco.
- **Editor de un pendiente** (§4).
- **Aprobar** con RPC atómico; **descartar** liberando fotos.
- **Conectar Instagram**: pegar el token, que se valida contra la Graph API,
  y ver el estado.
- **Buscar ahora**: server action que llama al `importar()` de T-009.
- **Migración 0015**: RPCs `aprobar_auto_importado` y
  `guardar_conexion_instagram`, más la política de storage si hiciera falta
  (§5).

**Fuera (no tocar aunque parezca relacionado):**
- El importador, el lector y el cron (T-009). Si hace falta cambiarlos,
  **escalá**.
- Videos y reels: Oliver pidió ignorarlos.
- **Editar un auto ya aprobado:** ya existe (formulario de autos +
  `SubirFotos`). Un aprobado es un auto común; acá solo se agrega el link
  «Ver en Autos».
- El sitio público.

## 3. Archivos probables

- `supabase/migrations/0015_aprobar_autos_importados.sql`
- `app/(admin)/(panel)/admin/autos/page.tsx`: segunda consulta, los
  pendientes y el estado de la conexión, que viene del server action (nunca
  el token).
- `app/(admin)/(panel)/admin/autos/AutosAdmin.tsx`: monta la bandeja.
- `app/(admin)/(panel)/admin/autos/PendientesInstagram.tsx` (nuevo),
  `EditorImportado.tsx` (nuevo), `ConexionInstagram.tsx` (nuevo)
- `app/(admin)/(panel)/admin/autos/acciones.ts` (nuevo, `'use server'`):
  conectar, buscar ahora, descartar.
- `lib/instagram/…`: solo si necesitás la validación del token desde la acción.
- `tests/unidad/…`, `tests/seguridad/rls.test.ts`

## 4. Editor de un pendiente

Tarjeta por pendiente: miniatura, `marca modelo` (o el `titulo` de la
sugerencia), fecha del post y link «Ver en Instagram» (`permalink`, abre en
pestaña nueva con `rel="noopener noreferrer"`). Al abrirla:

| Zona | Qué permite |
| ---- | ----------- |
| **Datos** | Los **mismos campos y validaciones** que el formulario de autos (`marca`, `modelo`, `version`, `anio`, `motor`, `kilometraje`, `precio`, `moneda`, `estado`, `es_del_equipo`, `descripcion`), pre-llenados con `sugerencia`. Reusá la validación existente; no dupliques reglas. Los campos que el lector dejó en `null` se marcan como «completar» |
| **Fotos** | Ver todas; **quitar**; **reordenar**; **elegir la principal**; **agregar fotos propias**, que se suben al bucket en `instagram/<ig_media_id>/extra-<uuid>.<ext>`, con las mismas validaciones de `SubirFotos` (solo `image/*`) |
| **Texto original** | El `caption` completo, de solo lectura, para copiar lo que el lector no tomó |
| **Acciones** | **Guardar** (sin aprobar) · **Aprobar** · **Descartar** · **Cancelar** |

- **Guardar:**
  - `update` de `autos_importados` (permitido a admin por RLS de 0014) con la
    sugerencia editada y el `fotos` actualizado.
  - Cerrar y volver a abrir muestra lo guardado.
  - Una foto propia recién subida se agrega a `fotos` en ese mismo `update`.
    Si el `update` falla, se borra del bucket.
- **Aprobar:**
  - Llama al RPC con los datos del formulario, la lista final de fotos en
    orden y la principal.
  - Si sale bien: el pendiente sale de la bandeja, el auto aparece en la lista
    con su link y se liberan del bucket las fotos que se quitaron.
  - Si el RPC falla: no se libera nada y el error se muestra.
- **Descartar:**
  - Pide confirmación y hace `update estado = 'descartado'`, con
    `revisado_en = now()`.
  - Libera del bucket **todas** sus fotos, con `rutaEnBucket` y
    `borrarDelBucket` de `lib/storage.ts`.
  - El post no vuelve a importarse: lo garantiza el `unique` de T-009.
- **Doble clic:** los botones se deshabilitan mientras corre la operación.
  Aprobar dos veces no crea dos autos (lo garantiza el RPC).

## 5. Base de datos (0015)

**`aprobar_auto_importado(p_id bigint, p_auto jsonb, p_fotos text[], p_principal int) returns bigint`**

- `security definer`, `set search_path = public`.
- Primera línea: `if not es_admin() then raise … errcode '42501'`. Mismo
  patrón y comentario que `marcar_foto_principal` en 0012; leelo.
- Pasos, **todo en la misma transacción**:
  1. `select … for update` del importado. Si no existe o no está en
     `pendiente`, error. Así, aprobar dos veces da error la segunda vez.
  2. Valida:
     - `p_fotos` no vacío;
     - `p_fotos <@ fotos` del importado (no se pueden colar URLs ajenas);
     - sin repetidos;
     - `0 <= p_principal < cardinality(p_fotos)`.
  3. `insert into autos (…)` desde `p_auto`, con `activo = true`. Los campos se
     leen **uno por uno, de una lista fija**, nunca un `jsonb_populate_record`
     abierto que deje setear `id`, `creado_en` u `orden` arbitrarios. Las
     validaciones de `autos` (`precio >= 0`, `not null`) las hace la propia
     tabla.
  4. `insert into auto_fotos` en el orden de `p_fotos`, con **exactamente una**
     `es_principal`.
  5. `update autos_importados set estado = 'aprobado', auto_id = …,
     revisado_en = now()`.
  6. Devuelve el `id` del auto.
- `revoke all … from public, anon`; `grant execute … to authenticated`.

**`guardar_conexion_instagram(p_token text, p_expira_en timestamptz, p_importar_desde timestamptz) returns void`**

- `security definer`, `search_path` fijo y `es_admin()` primero, como el
  anterior.
- Hace upsert de la fila `id = 1` de `instagram_conexion`, con
  `token_renovado_en = now()`.
- Mismos `revoke`/`grant`.

**Storage:** verificá en 0005 que un admin pueda subir a `fotos/instagram/…`.
Si la política lo limita por carpeta, ampliala **solo** para esa carpeta y
**solo** para admin.

## 6. Conectar Instagram

- Bloque plegable «Instagram» arriba de la bandeja.
- **Estado:** «Conectado como @usuario · última búsqueda hace X · próximo
  vencimiento del token».
- **Si falla:** `ultimo_error`, en lenguaje claro.
- **Formulario:**
  - campo para pegar el token, de tipo password;
  - fecha opcional «Importar también posts desde» (por defecto, ahora);
  - botón «Conectar».
- **Server action:**
  1. Verifica que el usuario sea admin (sesión del servidor).
  2. Llama a `GET https://graph.instagram.com/me?fields=user_id,username` con
     el token. Si falla: «El token no es válido», y no se guarda nada.
  3. Llama al RPC con `p_expira_en = now() + 60 días`. Es una estimación; la
     renovación semanal de T-009 lo corrige.
  4. Devuelve `@usuario`. **El token nunca vuelve al navegador ni se loguea.**
- **Buscar ahora:**
  - Server action: verifica admin y llama a `importar()` con el cliente de
    servicio.
  - Muestra el resumen («2 nuevos, 1 falló: …») y refresca la bandeja.
  - Deshabilitado mientras corre.

## 7. Criterios de aceptación

- **CA-1 — Bandeja.** Muestra solo los `pendiente`, del post más nuevo al más
  viejo, con contador. Sin pendientes, una línea. `anon` y no-admin no ven
  nada (RLS de 0014).
- **CA-2 — Pre-llenado.** El editor abre con los valores de `sugerencia`, y
  marca los `null` como «completar».
- **CA-3 — Editar todo.** Cada campo de datos se puede cambiar. Las fotos se
  pueden quitar, reordenar, elegir como principal y agregar. **Guardar**
  persiste, y al reabrir se ve lo guardado.
- **CA-4 — Aprobar.** Con datos válidos:
  - crea **un** auto `activo` con exactamente esos datos;
  - crea sus fotos en ese orden, con **exactamente una** principal;
  - deja el importado en `aprobado` con `auto_id`;
  - libera del bucket solo las fotos quitadas.

  El auto se ve en el sitio público como cualquier otro.
- **CA-5 — Aprobar es atómico e idempotente.** Si falla cualquier paso del RPC
  (p. ej. `precio` negativo), no queda ni auto ni fotos y el importado sigue
  `pendiente`. Aprobar dos veces el mismo id da error la segunda vez y no crea
  un segundo auto.
- **CA-6 — RPC blindado.** El RPC rechaza con `42501` a `anon` y a
  `authenticated` no-admin. Con admin, rechaza:
  - `p_fotos` con una URL que no está en `fotos` del importado;
  - `p_fotos` vacío;
  - una principal fuera de rango;
  - un `p_auto` que intente setear `id`, `creado_en` u `orden` (se ignoran).
- **CA-7 — Descartar.** Deja el importado en `descartado`, libera todas sus
  fotos del bucket y el post no reaparece en la próxima búsqueda.
- **CA-8 — Conectar.**
  - Un token inválido no guarda nada y lo dice.
  - Uno válido muestra `@usuario`.
  - El token no aparece en el HTML, en las props de ningún Client Component,
    en logs ni en respuestas.
  - `guardar_conexion_instagram` rechaza `anon` y no-admin con `42501`.
- **CA-9 — Buscar ahora.** Importa igual que el cron (T-009), muestra el
  resumen y refresca la bandeja. Un no-admin que llame a la server action no
  ejecuta nada.
- **CA-10 — Sin regresión** en el CRUD de autos existente: alta, edición,
  fotos, principal y borrado.
- **CA-11 — 400 px:** sin scroll horizontal en la bandeja ni en el editor, y
  sin errores de hidratación.

## 8. Pruebas requeridas

- [ ] **Unidad:** mapeo sugerencia → formulario, operaciones puras sobre la
  lista de fotos (quitar, mover, principal) y armado de los parámetros del RPC.
- [ ] **Contra staging** (escrituras reales, nunca prod): CA-4, CA-5, CA-6 y
  CA-7. Dejá los comandos o el script en la entrega; los corre el PM.
- [ ] **Seguridad:** `anon` y no-admin → `42501` en los dos RPC, en
  `tests/seguridad/rls.test.ts`.
- [ ] **Verificación visual** en staging: el flujo completo de un pendiente
  real (editar, quitar una foto, agregar una, aprobar) y un descarte. Con
  capturas.

## 9. Defectos a corregir (solo rondas de fix)

No aplica en ronda 1.

## 10. Definición de hecho

- [ ] Todos los CA cumplidos, cada uno con su test o evidencia
- [ ] `npx next typegen && npx tsc --noEmit` limpio
- [ ] `npm run lint` limpio
- [ ] `npm test` verde
- [ ] `npm run build` pasa
- [ ] Commits convencionales, archivos stageados por nombre, en la rama correcta
- [ ] Working tree limpio
- [ ] `entrega-dev.md` escrita y commiteada, con **`REQUIERE db push` (0015)**
- [ ] Sin push, sin PR, sin `db push`
